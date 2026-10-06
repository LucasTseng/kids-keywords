/**
 * home.js —— 首页脚本
 * 依据题库实际字段动态渲染筛选器（年级 / 所属单元 / Excel 中新增的动态字段），
 * 收集用户勾选形成通用 filters，连同学习方式、挑战数量写入 sessionStorage 跳转练习页。
 */
import { listFilterFields, listUnits } from './db.js';
import { createMultiSelect } from './multiselect.js';

const filterFieldsEl = document.getElementById('filter-fields');
const btnStart = document.getElementById('btn-start');
const modeInputs = document.querySelectorAll('input[name="mode"]');
const countLabel = document.getElementById('count-label');
const countGroup = document.getElementById('count-group');
const orderLabel = document.getElementById('order-label');
const orderGroup = document.getElementById('order-group');

const selects = new Map(); // 字段 key -> 多选组件实例
let fields = [];           // [{ key, label, values }]

/** 初始化：加载字段并渲染筛选器，绑定事件 */
async function init() {
  try {
    fields = await listFilterFields();
  } catch (err) {
    filterFieldsEl.innerHTML = `<div class="empty-tip">题库加载失败：${escapeHtml(err.message)}</div>`;
    return;
  }
  if (!fields.some((f) => f.key === 'grade')) {
    filterFieldsEl.innerHTML = '<div class="empty-tip">题库为空，请先在「数据维护」页导入 Excel 或构建题库</div>';
    return;
  }

  renderFields();
  modeInputs.forEach((inp) => inp.addEventListener('change', updateConditionalFields));
  updateConditionalFields();
}

/** 为每个字段渲染「标签 + 多选组件」 */
function renderFields() {
  filterFieldsEl.innerHTML = '';
  selects.clear();

  for (const f of fields) {
    const label = document.createElement('span');
    label.className = 'field-label';
    label.textContent = fieldLabelText(f);
    filterFieldsEl.appendChild(label);

    const container = document.createElement('div');
    container.className = 'filter-select';
    filterFieldsEl.appendChild(container);

    const ms = createMultiSelect(container, {
      placeholder: '全部' + (f.key === 'grade' || f.key === 'unit' ? f.label : ''),
      searchPlaceholder: '搜索…',
      onChange: (vals) => onFieldChange(f.key, vals),
    });
    ms.setOptions(f.values);
    selects.set(f.key, ms);
  }
}

/** 字段标签文本（含用途提示后缀） */
function fieldLabelText(f) {
  if (f.key === 'grade') return '年级（可多选，必选）';
  if (f.key === 'unit') return '所属单元（可多选，随年级联动）';
  return f.label + '（可多选）';
}

/** 某字段勾选值变化时的回调 */
function onFieldChange(key) {
  if (key === 'grade') refreshUnits(); // 年级联动单元选项
  btnStart.disabled = selectedValues('grade').length === 0;
}

/** 根据当前年级刷新单元可选列表 */
async function refreshUnits() {
  const unitMs = selects.get('unit');
  if (!unitMs) return;
  const grades = selectedValues('grade');
  if (grades.length === 0) {
    unitMs.setOptions([]);
    return;
  }
  try {
    unitMs.setOptions(await listUnits(grades));
  } catch {
    unitMs.setOptions([]);
  }
}

/** 当前某字段的已选值列表 */
function selectedValues(key) {
  const ms = selects.get(key);
  return ms ? ms.getSelected() : [];
}

/** 汇总所有字段已选值，形成通用 filters（未选字段不写入） */
function buildFilters() {
  const filters = {};
  for (const f of fields) {
    const vals = selectedValues(f.key);
    if (vals.length) filters[f.key] = vals;
  }
  return filters;
}

/** 当前选择的学习方式 */
function selectedMode() {
  return document.querySelector('input[name="mode"]:checked').value;
}

/** 当前选择的挑战数量 */
function selectedCount() {
  const c = document.querySelector('input[name="count"]:checked');
  return c ? c.value : '20';
}

/** 当前选择的出题顺序 */
function selectedOrder() {
  const o = document.querySelector('input[name="order"]:checked');
  return o ? o.value : 'sequential';
}

/** 根据学习方式切换「出题顺序 / 挑战数量」两组条件的显隐 */
function updateConditionalFields() {
  const isDictation = selectedMode() === 'dictation';
  countLabel.classList.toggle('hidden', !isDictation);
  countGroup.classList.toggle('hidden', !isDictation);
  orderLabel.classList.toggle('hidden', isDictation);
  orderGroup.classList.toggle('hidden', isDictation);
}

btnStart.addEventListener('click', () => {
  if (selectedValues('grade').length === 0) return;
  const mode = selectedMode();
  const cfg = {
    filters: buildFilters(),
    mode,
  };
  if (mode === 'dictation') {
    cfg.count = selectedCount();
  } else {
    cfg.order = selectedOrder();
  }
  // 用 sessionStorage 传参，避免 npx serve 等静态服务器把 .html?query 重定向时丢失参数
  sessionStorage.setItem('practice-config', JSON.stringify(cfg));
  location.href = 'practice.html';
});

/** 简易 HTML 转义 */
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

init();