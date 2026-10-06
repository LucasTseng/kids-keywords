/**
 * xlsx-io.js —— Excel 导入导出封装模块
 *
 * 依赖浏览器全局的 SheetJS（window.XLSX，由 vendor/xlsx.full.min.js 提供），
 * 不依赖任何后端。提供三类能力：
 *   1. 下载导入模板（固定列 + 示例行，动态列由用户自行增补）
 *   2. 导出当前题库为 Excel（动态字段会自动展开成额外列，形成可编辑闭环）
 *   3. 解析用户上传的 Excel，支持中文/英文列名识别，其余列作为动态字段存入 extra
 *
 * 固定列（对应数据库 vocabulary 表的列）：
 *   原文(content) / 翻译(translation) / 年级(grade) / 所属单元(unit)
 * 除此以外的任意列，都会作为「动态筛选字段」存入 extra JSON。
 */

/** 固定列 -> 数据库字段名 的映射（含中英文别名，容错识别） */
const COLUMN_ALIASES = [
  { field: 'content', labels: ['原文', '内容', '英文', '单词', '短句', 'content', 'word'] },
  { field: 'translation', labels: ['翻译', '译文', '中文', '释义', 'translation', 'meaning'] },
  { field: 'grade', labels: ['年级', 'grade'] },
  { field: 'unit', labels: ['所属单元', '单元', 'unit'] },
];

/** 固定列的规范中文表头（用于模板与导出） */
const FIXED_HEADERS = ['原文', '翻译', '年级', '所属单元'];

/** 模板示例行，帮助用户理解填写格式 */
const TEMPLATE_ROW = ['hello', '你好', '一年级', '上册Unit 1 Greetings'];

/** 获取 SheetJS 实例，未加载时抛出可读错误 */
function getXLSX() {
  if (typeof window.XLSX === 'undefined') {
    throw new Error('Excel 组件未加载，请检查 vendor/xlsx.full.min.js 是否已引入');
  }
  return window.XLSX;
}

/** 将列名归一化后匹配固定字段，返回字段名；未命中返回 null（视为动态字段） */
function resolveField(header) {
  const h = String(header ?? '').trim().toLowerCase();
  for (const alias of COLUMN_ALIASES) {
    if (alias.labels.some((l) => l.toLowerCase() === h)) return alias.field;
  }
  return null;
}

/** 触发浏览器下载一个 Blob */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** 由「表头 + 数据行」构建 xlsx 的 ArrayBuffer */
function buildWorkbook(headers, rows) {
  const XLSX = getXLSX();
  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '词汇');
  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}

/**
 * 下载 Excel 导入模板（固定列 + 一行示例）。
 */
export function downloadTemplate() {
  const bytes = buildWorkbook(FIXED_HEADERS, [TEMPLATE_ROW]);
  downloadBlob(new Blob([bytes], { type: 'application/octet-stream' }), '词汇导入模板.xlsx');
}

/**
 * 导出当前题库为 Excel。
 * rows 形如 [{ content, translation, grade, unit, extra }]；
 * 动态字段（所有记录 extra 的键并集）会展开为额外列。
 */
export function exportToExcel(rows) {
  // 汇总动态字段键（保持首次出现顺序，保证列稳定）
  const dynamicKeys = [];
  const seen = new Set();
  for (const r of rows) {
    for (const k of Object.keys(r.extra || {})) {
      if (!seen.has(k)) {
        seen.add(k);
        dynamicKeys.push(k);
      }
    }
  }

  const headers = [...FIXED_HEADERS, ...dynamicKeys];
  const data = rows.map((r) => [
    r.content ?? '',
    r.translation ?? '',
    r.grade ?? '',
    r.unit ?? '',
    ...dynamicKeys.map((k) => (r.extra || {})[k] ?? ''),
  ]);

  const bytes = buildWorkbook(headers, data);
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(new Blob([bytes], { type: 'application/octet-stream' }), `词汇数据-${stamp}.xlsx`);
}

/**
 * 解析用户上传的 Excel 文件。
 * 返回 { rows, dynamicFields, errors }：
 *   - rows          ：[{ content, translation, grade, unit, extra }]
 *   - dynamicFields ：识别到的动态字段名列表（Excel 表头中除固定列以外的列）
 *   - errors        ：校验错误信息数组（未识别到必填列 / 空行等）
 */
export async function parseWorkbook(file) {
  const XLSX = getXLSX();

  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  if (!firstSheet) throw new Error('未在文件中找到工作表');

  const aoa = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' });
  if (aoa.length === 0) throw new Error('工作表为空');

  // 第一行为表头
  const headers = aoa[0].map((h) => String(h ?? '').trim());

  // 建立列索引：固定字段与动态字段
  const colMap = {}; // field -> 列下标
  const dynamicCols = []; // { header, index }
  headers.forEach((h, idx) => {
    const field = h ? resolveField(h) : null;
    if (field) colMap[field] = idx;
    else if (h) dynamicCols.push({ header: h, index: idx });
  });

  const errors = [];
  if (colMap.content == null) errors.push('缺少「原文」列（可写作：原文 / 内容 / content）');
  if (colMap.translation == null) errors.push('缺少「翻译」列（可写作：翻译 / 译文 / translation）');
  if (errors.length) {
    return { rows: [], dynamicFields: [], errors };
  }

  const rows = [];
  for (let i = 1; i < aoa.length; i++) {
    const line = aoa[i].map((c) => String(c ?? '').trim());
    const content = line[colMap.content];
    const translation = line[colMap.translation];
    if (!content && !translation) continue; // 跳过完全空行

    if (!content || !translation) {
      errors.push(`第 ${i + 1} 行：原文与翻译不能为空，已跳过`);
      continue;
    }

    const extra = {};
    for (const d of dynamicCols) {
      const v = line[d.index];
      if (v !== '') extra[d.header] = v;
    }

    rows.push({
      content,
      translation,
      grade: colMap.grade != null ? line[colMap.grade] : '',
      unit: colMap.unit != null ? line[colMap.unit] : '',
      extra,
    });
  }

  return {
    rows,
    dynamicFields: dynamicCols.map((d) => d.header),
    errors,
  };
}