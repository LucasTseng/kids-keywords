/**
 * multiselect.js —— 多选下拉组件
 * 支持：下拉面板、可滚动选项列表、模糊搜索、已选标签展示与移除。
 * 用于首页「所属单元」联动筛选，选项由外部 setOptions 按年级动态传入。
 */

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

export function createMultiSelect(container, options = {}) {
  const {
    placeholder = '全部单元',
    searchPlaceholder = '搜索…',
    onChange = () => {},
  } = options;

  let items = [];               // 当前可选单元列表
  const selected = new Set();   // 已选单元

  const root = document.createElement('div');
  root.className = 'ms';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'ms-trigger';
  root.appendChild(trigger);

  const panel = document.createElement('div');
  panel.className = 'ms-panel hidden';

  const search = document.createElement('input');
  search.type = 'text';
  search.className = 'ms-search';
  search.placeholder = searchPlaceholder;

  const list = document.createElement('div');
  list.className = 'ms-list';

  panel.appendChild(search);
  panel.appendChild(list);
  root.appendChild(panel);
  container.appendChild(root);

  function renderTrigger() {
    if (selected.size === 0) {
      trigger.innerHTML = `<span class="ms-placeholder">${escapeHtml(placeholder)}</span><span class="ms-arrow">▾</span>`;
    } else {
      trigger.innerHTML = selected.size <= 5
        ? [...selected].map((v) => `<span class="ms-chip">${escapeHtml(v)}<i class="ms-x" data-value="${escapeHtml(v)}">×</i></span>`).join('')
        : `<span class="ms-chip">已选 ${selected.size} 个单元</span>`;
      trigger.innerHTML += '<span class="ms-arrow">▾</span>';
    }
  }

  function renderList() {
    const kw = search.value.trim().toLowerCase();
    const filtered = items.filter((v) => !kw || v.toLowerCase().includes(kw));
    list.innerHTML = filtered
      .map(
        (v) => `<label class="ms-opt${selected.has(v) ? ' checked' : ''}">
          <input type="checkbox" value="${escapeHtml(v)}" ${selected.has(v) ? 'checked' : ''}>
          <span>${escapeHtml(v)}</span>
        </label>`
      )
      .join('');
  }

  function emit() {
    renderTrigger();
    renderList();
    onChange([...selected]);
  }

  function togglePanel(open) {
    panel.classList.toggle('hidden', !open);
    if (open) {
      renderList();
      search.focus();
    }
  }

  trigger.addEventListener('click', (e) => {
    const x = e.target.closest('.ms-x');
    if (x) {
      e.stopPropagation();
      selected.delete(x.dataset.value);
      emit();
      return;
    }
    togglePanel(panel.classList.contains('hidden'));
  });

  search.addEventListener('input', renderList);
  search.addEventListener('click', (e) => e.stopPropagation());

  list.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
      if (e.target.checked) selected.add(e.target.value);
      else selected.delete(e.target.value);
      emit();
    }
  });

  document.addEventListener('click', (e) => {
    if (!root.contains(e.target)) togglePanel(false);
  });

  return {
    /** 更新可选单元，清除已失效的勾选项 */
    setOptions(next) {
      items = [...next];
      const valid = new Set(items);
      [...selected].forEach((v) => {
        if (!valid.has(v)) selected.delete(v);
      });
      emit();
    },
    getSelected() {
      return [...selected];
    },
    clear() {
      selected.clear();
      emit();
    },
  };
}