/**
 * build-vocabulary.mjs
 * ---------------------------------------------------------------------------
 * 构建脚本：把《沪教版（上教版）上海小学1-3年级英语核心词汇&句型汇总表.md》
 * 解析为题库数据，并用 sql.js 生成初始 SQLite 数据库文件 data/vocabulary.sqlite。
 *
 * 同时把 sql.js 的浏览器运行时（sql-wasm-browser.js / .wasm）本地化复制到
 * vendor/ 目录，供前端离线加载，避免依赖 CDN。
 *
 * 用法：node scripts/build-vocabulary.mjs
 */
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const mdPath = join(root, '沪教版（上教版）上海小学1-3年级英语核心词汇&句型汇总表.md');
const dataDir = join(root, 'data');
const vendorDir = join(root, 'vendor');
const sqljsDist = join(root, 'node_modules', 'sql.js', 'dist');
const xlsxDist = join(root, 'node_modules', 'xlsx', 'dist');

/**
 * 解析 markdown 表格，返回 [{ content, translation, grade, unit }]。
 * 表格列为「原文 | 翻译 | 年级 | 所属单元」，跳过表头行、分隔行与分组标题行。
 */
function parseMarkdown(text) {
  const rows = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line.startsWith('|')) continue;            // 跳过非表格行
    if (line.includes('---')) continue;             // 跳过分隔行
    if (line.includes('原文')) continue;            // 跳过表头行
    const cells = line.split('|').map((s) => s.trim());
    // cells 形如 ['', 原文, 翻译, 年级, 所属单元, '']，取中间四列
    const content = cells[1];
    const translation = cells[2];
    const grade = cells[3];
    const unit = cells[4] || '';
    if (!content || content.startsWith('**')) continue; // 跳过分组标题行（如「**一年级上册**」）
    if (!translation || !grade) continue;
    rows.push({ content, translation, grade, unit });
  }
  return rows;
}

/**
 * 用 sql.js 生成数据库字节流，建表 vocabulary / scores 并写入题库。
 */
async function buildDatabase(rows) {
  const SQL = await initSqlJs({
    locateFile: (file) => join(sqljsDist, file),
  });
  const db = new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS vocabulary (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      content     TEXT NOT NULL,
      translation TEXT NOT NULL,
      grade       TEXT NOT NULL DEFAULT '',
      unit        TEXT NOT NULL DEFAULT '',
      extra       TEXT NOT NULL DEFAULT '{}'
    );
    CREATE TABLE IF NOT EXISTS scores (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT NOT NULL DEFAULT '匿名',
      mode       TEXT NOT NULL,
      grades     TEXT NOT NULL,
      total      INTEGER NOT NULL,
      score      INTEGER NOT NULL,
      duration   INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  const insert = db.prepare(
    'INSERT INTO vocabulary (content, translation, grade, unit, extra) VALUES (?, ?, ?, ?, ?)'
  );
  for (const r of rows) {
    insert.run([r.content, r.translation, r.grade, r.unit, '{}']);
  }
  insert.free();

  const bytes = db.export();
  db.close();
  return bytes;
}

async function main() {
  const md = await readFile(mdPath, 'utf8');
  const rows = parseMarkdown(md);

  // 统计各年级数量，便于核对
  const counter = {};
  for (const r of rows) counter[r.grade] = (counter[r.grade] || 0) + 1;

  await mkdir(dataDir, { recursive: true });
  await mkdir(vendorDir, { recursive: true });

  const bytes = await buildDatabase(rows);
  await writeFile(join(dataDir, 'vocabulary.sqlite'), Buffer.from(bytes));

  // 本地化浏览器端运行时（保留原名，sql.js 内部按原文件名定位 wasm）
  await copyFile(join(sqljsDist, 'sql-wasm-browser.js'), join(vendorDir, 'sql-wasm-browser.js'));
  await copyFile(join(sqljsDist, 'sql-wasm-browser.wasm'), join(vendorDir, 'sql-wasm-browser.wasm'));

  // 本地化 SheetJS（xlsx）运行时，供数据维护页离线解析/生成 Excel
  await copyFile(join(xlsxDist, 'xlsx.full.min.js'), join(vendorDir, 'xlsx.full.min.js'));

  console.log('题库生成完成：');
  console.log(`  总计 ${rows.length} 条`);
  for (const grade of Object.keys(counter)) {
    console.log(`  - ${grade}：${counter[grade]} 条`);
  }
  console.log('  - data/vocabulary.sqlite');
  console.log('  - vendor/sql-wasm-browser.js');
  console.log('  - vendor/sql-wasm-browser.wasm');
  console.log('  - vendor/xlsx.full.min.js');
}

main().catch((err) => {
  console.error('构建题库失败：', err);
  process.exit(1);
});