/**
 * data-maintain.js —— 数据维护页脚本
 * 提供题库的 Excel 批量增删改能力：下载模板、导出数据、导入（全量替换），
 * 并展示当前题库统计与数据预览。所有变更通过 db.js 持久化到本地 IndexedDB。
 */
import { countVocabulary, exportVocabulary, replaceVocabulary, GRADE_ORDER } from './db.js';
import { downloadTemplate, exportToExcel, parseWorkbook } from './xlsx-io.js';

const btnTemplate = document.getElementById('btn-template');
const btnExport = document.getElementById('btn-export');
const fileInput = document.getElementById('file-import');
const statEl = document.getElementById('maintain-stat');
const previewEl = document.getElementById('preview');
const previewCount = document.getElementById('preview-count');
const toast = document.getElementById('toast');

const PREVIEW_LIMIT = 50;

init();

function init() {
  btnTemplate.addEventListener('click', () => {
    try {
      downloadTemplate();
      showToast('模板已下载');
    } catch (err) {
      showToast('下载失败：' + err.message, true);
    }
  });

  btnExport.addEventListener('click', async () => {
    try {
      const rows = await exportVocabulary();
      if (rows.length === 0) {
        showToast('题库为空，无可导出数据', true);
        return;
      }
      exportToExcel(rows);
      showToast('已导出 ' + rows.length + ' 条数据');
    } catch (err) {
      showToast('导出失败：' + err.message, true);
    }
  });

  fileInput.addEventListener('change', onImport);

  refresh();
}

/** 读取并导入用户选择的 Excel */
async function onImport(e) {
  const file = e.target.files && e.target.files[0];
  e.target.value = ''; // 复位，允许重复选择同一文件
  if (!file) return;

  let parsed;
  try {
    parsed = await parseWorkbook(file);
  } catch (err) {
    showToast('解析失败：' + err.message, true);
    return;
  }

  if (parsed.errors.length) {
    showToast('解析出错：' + parsed.errors.join('；'), true);
    return;
  }
  if (parsed.rows.length === 0) {
    showToast('文件中没有有效数据', true);
    return;
  }

  const ok = window.confirm(
    `即将用新数据整体替换当前题库（${parsed.rows.length} 条）。\n` +
    `本次识别到动态字段：${parsed.dynamicFields.length ? parsed.dynamicFields.join('、') : '（无）'}\n\n` +
    '确定继续吗？（原数据将被覆盖，成绩不受影响）'
  );
  if (!ok) return;

  try {
    await replaceVocabulary(parsed.rows);
    showToast(`导入成功：共 ${parsed.rows.length} 条` + (parsed.dynamicFields.length ? `，动态字段 ${parsed.dynamicFields.join('、')}` : ''));
    await refresh();
  } catch (err) {
    showToast('导入失败：' + err.message, true);
  }
}

/** 刷新统计与预览 */
async function refresh() {
  try {
    const { total, byGrade } = await countVocabulary();
    renderStat(total, byGrade);

    const rows = await exportVocabulary();
    renderPreview(rows);
  } catch (err) {
    statEl.innerHTML = '<div class="empty-tip">统计加载失败：' + escapeHtml(err.message) + '</div>';
  }
}

/** 渲染统计卡片（总数 + 各年级数量，含占比） */
function renderStat(total, byGrade) {
  if (!total) {
    statEl.innerHTML = '<div class="empty-tip">题库为空，请先导入 Excel</div>';
    return;
  }
  const ordered = GRADE_ORDER.filter((g) => byGrade[g]);
  const html = [
    `<div class="stat-total"><span class="stat-num">${total}</span> 条词汇 / 短句</div>`,
  ];
  if (ordered.length) {
    html.push('<div class="stat-grades">');
    for (const g of ordered) {
      const n = byGrade[g];
      html.push(
        `<div class="stat-grade"><span class="sg-name">${escapeHtml(g)}</span><span class="sg-count">${n} 条</span></div>`
      );
    }
    html.push('</div>');
  }
  statEl.innerHTML = html.join('');
}

/** 渲染数据预览表格（前 PREVIEW_LIMIT 条，动态字段展开为列） */
function renderPreview(rows) {
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

  previewCount.textContent = rows.length ? `（共 ${rows.length} 条，显示前 ${Math.min(PREVIEW_LIMIT, rows.length)} 条）` : '';

  if (rows.length === 0) {
    previewEl.innerHTML = '<div class="empty-tip">暂无数据</div>';
    return;
  }

  const headers = ['#', '原文', '翻译', '年级', '所属单元', ...dynamicKeys];
  const slice = rows.slice(0, PREVIEW_LIMIT);

  const thead = '<tr>' + headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('') + '</tr>';
  const tbody = slice
    .map((r, i) => {
      const cells = [
        i + 1,
        r.content ?? '',
        r.translation ?? '',
        r.grade ?? '',
        r.unit ?? '',
        ...dynamicKeys.map((k) => (r.extra || {})[k] ?? ''),
      ];
      return '<tr>' + cells.map((c) => `<td>${escapeHtml(c)}</td>`).join('') + '</tr>';
    })
    .join('');

  previewEl.innerHTML = `<table class="maintain-table"><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
}

/** 弹出顶部提示条 */
let toastTimer = null;
function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.classList.toggle('error', isError);
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 3600);
}

/** 简易 HTML 转义，防止题面/表头特殊字符破坏结构 */
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}