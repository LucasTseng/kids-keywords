/**
 * db.js
 * 数据库封装模块：基于 sql.js 在浏览器内运行 SQLite。
 * 首次启动从 data/vocabulary.sqlite 加载初始题库；之后优先恢复 IndexedDB 中的快照，
 * 这样成绩写入、题库导入后也能持久保留。对外暴露题库查询、动态筛选字段、导库与成绩读写接口。
 */
import { saveSnapshot, loadSnapshot } from './store.js';

/** 年级展示顺序（中文年级按教学顺序，而非字典序） */
export const GRADE_ORDER = ['一年级', '二年级', '三年级'];

/** 固定筛选字段（列存储），其余字段视为动态字段从 extra JSON 聚合 */
export const FIXED_FIELDS = ['grade', 'unit'];

let db = null;

/** 安全解析 extra JSON，失败时返回空对象；已解析对象则原样返回 */
function parseExtra(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    const obj = JSON.parse(raw);
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

/** 获取（惰性初始化）共享的 sql.js 数据库实例 */
async function getDb() {
  if (db) return db;

  // sql.js 浏览器版将初始化函数挂载到 window.Module（或兼容的 window.initSqlJs）
  const initSqlJs = window.Module || window.initSqlJs;
  if (typeof initSqlJs !== 'function') {
    throw new Error('sql.js 运行时未加载，请检查 vendor/sql-wasm-browser.js 是否已引入');
  }

  const SQL = await initSqlJs({ locateFile: (file) => `vendor/${file}` });

  // 优先恢复本地快照；无快照则加载部署的初始题库文件
  const snapshot = await loadSnapshot();
  if (snapshot) {
    db = new SQL.Database(snapshot);
  } else {
    const res = await fetch('data/vocabulary.sqlite');
    if (!res.ok) throw new Error('题库文件加载失败');
    const bytes = new Uint8Array(await res.arrayBuffer());
    db = new SQL.Database(bytes);
  }
  migrate(db);
  return db;
}

/** 结构迁移：确保 vocabulary 表存在 extra（动态字段）列，兼容旧版基线文件 */
function migrate(d) {
  const res = d.exec('PRAGMA table_info(vocabulary)');
  const cols = (res[0] && res[0].values.map((r) => r[1])) || [];
  if (!cols.includes('extra')) {
    d.run("ALTER TABLE vocabulary ADD COLUMN extra TEXT NOT NULL DEFAULT '{}'");
  }
}

/** 把当前内存中的数据库整体导出，写回 IndexedDB */
async function persist() {
  const d = await getDb();
  await saveSnapshot(d.export());
}

/** 年级去重列表，按 GRADE_ORDER 排序 */
export async function listGrades() {
  const d = await getDb();
  const res = d.exec('SELECT DISTINCT grade FROM vocabulary');
  const grades = res[0] ? res[0].values.map((row) => row[0]) : [];
  return GRADE_ORDER.filter((g) => grades.includes(g));
}

/**
 * 构造 SQL 过滤条件。
 * filters 形如 { grade: [...], unit: [...], 动态字段名: [...] }，
 * 固定字段（grade/unit）走列值 SQL 过滤，动态字段在 JS 层匹配。
 */
function buildWhere(filters) {
  const conditions = [];
  const params = [];
  if (filters.grade && filters.grade.length > 0) {
    conditions.push(`grade IN (${filters.grade.map(() => '?').join(',')})`);
    params.push(...filters.grade);
  }
  if (filters.unit && filters.unit.length > 0) {
    conditions.push(`unit IN (${filters.unit.map(() => '?').join(',')})`);
    params.push(...filters.unit);
  }
  return {
    where: conditions.length ? 'WHERE ' + conditions.join(' AND ') : '',
    params,
  };
}

/** 判断一条记录是否命中全部动态字段筛选条件 */
function matchDynamic(item, filters) {
  const extra = parseExtra(item.extra);
  for (const key of Object.keys(filters)) {
    if (FIXED_FIELDS.includes(key)) continue;
    const wanted = filters[key];
    if (!wanted || wanted.length === 0) continue;
    if (!wanted.includes(String(extra[key] ?? ''))) return false;
  }
  return true;
}

/** 将一行查询结果补充解析好的 extra 字段 */
function rowWithExtra(obj) {
  obj.extra = parseExtra(obj.extra);
  return obj;
}

/** 所选年级下的单元去重列表，按教材出现顺序（MIN(id)）排序 */
export async function listUnits(grades) {
  if (!grades || grades.length === 0) return [];
  const d = await getDb();
  const placeholders = grades.map(() => '?').join(',');
  const stmt = d.prepare(
    `SELECT unit FROM vocabulary WHERE grade IN (${placeholders}) AND unit != '' GROUP BY unit ORDER BY MIN(id)`
  );
  stmt.bind(grades);
  const units = [];
  while (stmt.step()) units.push(stmt.getAsObject().unit);
  stmt.free();
  return units;
}

/**
 * 汇总全部筛选字段（固定字段 grade/unit + 动态字段），供首页动态渲染筛选器。
 * 返回 [{ key, label, values }]，动态字段 label 即 Excel 列名。
 */
export async function listFilterFields() {
  const d = await getDb();

  const gradeRes = d.exec('SELECT DISTINCT grade FROM vocabulary WHERE grade != ""');
  const grades = GRADE_ORDER.filter((g) =>
    gradeRes[0] ? gradeRes[0].values.map((r) => r[0]).includes(g) : false
  );

  const unitRes = d.exec('SELECT unit FROM vocabulary WHERE unit != "" GROUP BY unit ORDER BY MIN(id)');
  const units = unitRes[0] ? unitRes[0].values.map((r) => r[0]) : [];

  // 聚合动态字段：遍历所有记录的 extra JSON，收集字段名与去重值
  const dynamicMap = new Map();
  const stmt = d.prepare('SELECT extra FROM vocabulary');
  while (stmt.step()) {
    const extra = parseExtra(stmt.getAsObject().extra);
    for (const [k, v] of Object.entries(extra)) {
      if (v == null || v === '') continue;
      if (!dynamicMap.has(k)) dynamicMap.set(k, new Set());
      dynamicMap.get(k).add(String(v));
    }
  }
  stmt.free();

  const fields = [];
  if (grades.length) fields.push({ key: 'grade', label: '年级', values: grades });
  if (units.length) fields.push({ key: 'unit', label: '所属单元', values: units });
  for (const [k, set] of dynamicMap) {
    fields.push({ key: k, label: k, values: [...set] });
  }
  return fields;
}

/** 按通用筛选条件取题，按 id 升序返回（grade 为空时返回空数组） */
export async function listItems(filters = {}) {
  if (!filters.grade || filters.grade.length === 0) return [];
  const d = await getDb();
  const { where, params } = buildWhere(filters);
  const stmt = d.prepare(
    `SELECT id, content, translation, grade, unit, extra FROM vocabulary ${where} ORDER BY id`
  );
  stmt.bind(params);
  const items = [];
  while (stmt.step()) {
    const obj = rowWithExtra(stmt.getAsObject());
    if (matchDynamic(obj, filters)) items.push(obj);
  }
  stmt.free();
  return items;
}

/** 从通用筛选范围内随机抽取；n 为空则随机取全部（否则不足 n 全取） */
export async function randomPick(filters = {}, n = null) {
  if (!filters.grade || filters.grade.length === 0) return [];
  const d = await getDb();
  const { where, params } = buildWhere(filters);
  const hasLimit = n != null;
  // 动态字段需在 JS 层过滤，故先取出候选，再打乱/截取
  const sql =
    `SELECT id, content, translation, grade, unit, extra FROM vocabulary ${where} ORDER BY RANDOM()`;
  const stmt = d.prepare(sql);
  stmt.bind(params);
  const all = [];
  while (stmt.step()) {
    const obj = rowWithExtra(stmt.getAsObject());
    if (matchDynamic(obj, filters)) all.push(obj);
  }
  stmt.free();
  return hasLimit ? all.slice(0, n) : all;
}

/**
 * 全量替换题库（保留成绩表）。
 * rows 形如 [{ content, translation, grade, unit, extra }]，
 * extra 为动态字段键值对象，写入后立即持久化到 IndexedDB。
 */
export async function replaceVocabulary(rows) {
  const d = await getDb();
  d.run('BEGIN');
  try {
    d.run('DELETE FROM vocabulary');
    const insert = d.prepare(
      'INSERT INTO vocabulary (content, translation, grade, unit, extra) VALUES (?, ?, ?, ?, ?)'
    );
    for (const r of rows) {
      insert.run([
        r.content,
        r.translation,
        r.grade || '',
        r.unit || '',
        JSON.stringify(r.extra || {}),
      ]);
    }
    insert.free();
    d.run('COMMIT');
  } catch (err) {
    d.run('ROLLBACK');
    throw err;
  }
  await persist();
}

/** 导出全部词汇（含解析后的 extra），按 id 升序 */
export async function exportVocabulary() {
  const d = await getDb();
  const stmt = d.prepare('SELECT id, content, translation, grade, unit, extra FROM vocabulary ORDER BY id');
  const rows = [];
  while (stmt.step()) rows.push(rowWithExtra(stmt.getAsObject()));
  stmt.free();
  return rows;
}

/** 统计题库：总数与各年级数量 */
export async function countVocabulary() {
  const d = await getDb();
  const total = d.exec('SELECT COUNT(*) FROM vocabulary')[0].values[0][0];
  const byGrade = {};
  const res = d.exec('SELECT grade, COUNT(*) FROM vocabulary GROUP BY grade');
  if (res[0]) {
    for (const [grade, count] of res[0].values) byGrade[grade] = count;
  }
  return { total, byGrade };
}

/** 新增一条成绩记录并持久化 */
export async function addScore(record) {
  const d = await getDb();
  d.run(
    'INSERT INTO scores (username, mode, grades, total, score, duration, created_at) VALUES (?,?,?,?,?,?,?)',
    [record.username, record.mode, record.grades, record.total, record.score, record.duration, record.created_at]
  );
  await persist();
}

/** 按时间倒序读取全部成绩记录 */
export async function listScores() {
  const d = await getDb();
  const stmt = d.prepare('SELECT * FROM scores ORDER BY id DESC');
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

/** 清空全部成绩记录并持久化 */
export async function clearScores() {
  const d = await getDb();
  d.run('DELETE FROM scores');
  await persist();
}