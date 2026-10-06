/**
 * practice.js —— 练习页脚本
 * 根据 URL 参数（grades / mode / count）加载题目，集成 vkeyboardhand 键盘组件，
 * 驱动打字练习与背默练习两种引擎，并完成背默的提交评分与成绩写入。
 */
import { listItems, randomPick, addScore } from './db.js';
import { TypingEngine } from './typing.js';
import { DictationEngine } from './dictation.js';

const params = new URLSearchParams(location.search);

// 首页通过 sessionStorage 传参（URL 带 query 时优先用 query，支持直接访问）
let cfg = null;
try {
  cfg = JSON.parse(sessionStorage.getItem('practice-config') || 'null');
} catch (e) {
  cfg = null;
}
const fromUrl = params.has('grades') || params.has('units') || params.has('filters');

const mode = fromUrl
  ? (params.get('mode') || 'typing')
  : ((cfg && cfg.mode) || 'typing');
const count = parseInt(fromUrl ? (params.get('count') || '20') : ((cfg && cfg.count) || '20'), 10);
const order = fromUrl
  ? (params.get('order') || 'sequential')
  : ((cfg && cfg.order) || 'sequential');

// 通用筛选 filters：{ grade: [], unit: [], 动态字段名: [] }
let filters = {};
if (fromUrl) {
  if (params.has('filters')) {
    try {
      filters = JSON.parse(params.get('filters')) || {};
    } catch (e) {
      filters = {};
    }
  } else {
    const grades = (params.get('grades') || '').split(',').filter(Boolean);
    const units = (params.get('units') || '').split(',').filter(Boolean);
    if (grades.length) filters.grade = grades;
    if (units.length) filters.unit = units;
  }
} else if (cfg && cfg.filters && typeof cfg.filters === 'object') {
  filters = cfg.filters;
} else if (cfg && Array.isArray(cfg.grades)) {
  // 兼容旧版 sessionStorage（grades/units 数组）
  if (cfg.grades.length) filters.grade = cfg.grades;
  if (Array.isArray(cfg.units) && cfg.units.length) filters.unit = cfg.units;
}

const stage = document.getElementById('stage');
const keyboardEl = document.getElementById('keyboard');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
// 提交按钮与计时器改为动态渲染进 stage，由下方 renderBar 统一管理
let btnSubmit = null;
let timerEl = null;

let items = [];
let index = 0;          // 打字模式当前题下标
let typing = null;
let dictation = null;
let timerInterval = null;
let errorFlash = -1;    // 打字模式短暂标红的字符下标

init();

async function init() {
  try {
    items = mode === 'typing'
      ? (order === 'random' ? await randomPick(filters) : await listItems(filters))
      : await randomPick(filters, count);
  } catch (err) {
    stage.innerHTML = `<div class="empty-tip">题库加载失败：${escapeHtml(err.message)}</div>`;
    return;
  }
  if (items.length === 0) {
    stage.innerHTML = '<div class="empty-tip">该年级暂无题目</div>';
    return;
  }

  initKeyboard();

  if (mode === 'typing') {
    typing = new TypingEngine(items[0].content);
    renderTyping();
  } else {
    dictation = new DictationEngine(items);
    dictation.startTimer();
    renderDictation();
    startTimerDisplay();
  }

  window.addEventListener('keydown', onKeyDown);
  btnPrev.addEventListener('click', () => prev());
  btnNext.addEventListener('click', () => next());
  window.addEventListener('resize', fitDisplay);
}

/** 初始化 vkeyboardhand 键盘组件 */
function initKeyboard() {
  if (typeof VKeyboardHand === 'undefined') {
    keyboardEl.innerHTML = '<div class="empty-tip">键盘组件加载失败</div>';
    return;
  }
  // 清空"加载中"提示，避免与渲染出的键盘叠加
  keyboardEl.innerHTML = '';
  VKeyboardHand.create('#keyboard', {
    keyboard: 'svg/keyboard.svg',
    hand: 'svg/hand.svg',
    theme: 'colorful',
    listenKeyboard: true,
    enableClick: false,
    preventScroll: true,
    showHandBoth: true,
    showBanner: false,
  });
}

/* ---------------- 切换与导航 ---------------- */

function prev() {
  if (mode === 'typing') {
    if (index > 0) goTypingItem(index - 1);
  } else {
    dictation.goto(dictation.current - 1);
    renderDictation();
  }
}

function next() {
  if (mode === 'typing') {
    if (index < items.length - 1) goTypingItem(index + 1);
  } else {
    dictation.goto(dictation.current + 1);
    renderDictation();
  }
}

function goTypingItem(i) {
  index = i;
  typing = new TypingEngine(items[i].content);
  errorFlash = -1;
  renderTyping();
}

function updateNavButtons() {
  if (mode === 'typing') {
    btnPrev.disabled = index <= 0;
    btnNext.disabled = index >= items.length - 1;
  } else {
    btnPrev.disabled = dictation.current <= 0;
    btnNext.disabled = dictation.current >= items.length - 1;
  }
}

/* ---------------- 键盘事件 ---------------- */

function onKeyDown(e) {
  if (e.isComposing) return;
  if (mode === 'typing') handleTypingKey(e);
  else handleDictationKey(e);
}

function handleTypingKey(e) {
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prev();
    return;
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    next();
    return;
  }
  if (e.key.length !== 1) return; // 忽略功能键与组合键

  const result = typing.input(e.key);
  if (result === 'mismatched') {
    errorFlash = typing.pos;
    renderTyping();
    setTimeout(() => {
      errorFlash = -1;
      renderTyping();
    }, 300);
  } else if (result === 'done') {
    renderTyping();
    setTimeout(() => {
      if (index < items.length - 1) next();
    }, 350);
  } else {
    renderTyping();
  }
}

function handleDictationKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    next();
    return;
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prev();
    return;
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    next();
    return;
  }
  if (e.key === 'Backspace') {
    e.preventDefault();
    dictation.backspace();
    renderDictation();
    return;
  }
  if (e.key.length !== 1) return;

  dictation.input(e.key);
  renderDictation();
}

/* ---------------- 渲染 ---------------- */

/** 顶部操作栏：首页链接 / 练习信息 / 提交按钮 / 计时器 */
function renderBar(infoText, showSubmit) {
  return `
    <div class="practice-bar">
      <div class="bar-left">
        <a class="btn btn-ghost" href="index.html">← 首页</a>
        <span class="info">${infoText}</span>
      </div>
      <div class="bar-right">
        ${showSubmit ? '<button class="btn btn-primary" id="btn-submit">提交</button>' : ''}
        ${showSubmit ? '<span class="timer" id="timer">00:00</span>' : ''}
      </div>
    </div>`;
}

function renderTyping() {
  const item = items[index];
  const cells = typing.getState();
  const charsHtml = cells
    .map((s, i) => {
      const cls = 'char ' + s.state + (i === errorFlash ? ' error' : '');
      const disp = s.char === ' ' ? '&nbsp;' : escapeHtml(s.char);
      return `<span class="${cls}">${disp}</span>`;
    })
    .join('');
  stage.innerHTML =
    renderBar(`打字练习 · 共 ${items.length} 题`, false) +
    `<div class="word-display">
      <div class="word-content">${charsHtml}</div>
      <div class="word-translation">${escapeHtml(item.translation)}</div>
    </div>`;
  updateNavButtons();
  fitDisplay();
}

function renderDictation() {
  const cur = dictation.current;
  const item = items[cur];
  const target = item.content;
  const filled = dictation.answers[cur];

  let slots = '';
  for (let i = 0; i < target.length; i++) {
    const ch = filled[i];
    const isSpace = target[i] === ' ';
    const spaceCls = isSpace ? ' slot-space' : '';
    if (ch != null) {
      const disp = ch === ' ' ? '&nbsp;' : escapeHtml(ch);
      slots += `<span class="slot filled${spaceCls}">${disp}</span>`;
    } else {
      // 空格位置显示居中的点标记，与普通字符的下划线区区分开
      const disp = isSpace ? '·' : '&nbsp;';
      slots += `<span class="slot empty${spaceCls}">${disp}</span>`;
    }
  }

  const nav = dictation
    .getNavState()
    .map((st, i) => {
      const active = i === dictation.current ? ' active' : '';
      return `<button class="nav-btn ${st}${active}" data-i="${i}">${i + 1}</button>`;
    })
    .join('');

  stage.innerHTML =
    renderBar('背默练习', true) +
    `<div class="quiz-wrap">
      <div class="quiz-nav">${nav}</div>
      <div class="quiz-item">
        <div class="quiz-zh">${escapeHtml(item.translation)}</div>
        <div class="quiz-slots">${slots}</div>
      </div>
      <div class="quiz-hint">共 ${target.length} 个字符 · 蓝色虚线下划线为空格 · Enter 下一题 · ← → 切换</div>
    </div>`;

  btnSubmit = document.getElementById('btn-submit');
  timerEl = document.getElementById('timer');
  if (btnSubmit) btnSubmit.addEventListener('click', submit);

  stage.querySelectorAll('.nav-btn').forEach((b) => {
    b.addEventListener('click', () => {
      dictation.goto(parseInt(b.dataset.i, 10));
      renderDictation();
    });
  });
  updateNavButtons();
  fitDisplay();
}

/* ---------------- 计时 ---------------- */

function startTimerDisplay() {
  if (!timerEl) return;
  timerInterval = setInterval(() => {
    if (timerEl) timerEl.textContent = formatTime(dictation.stopTimer());
  }, 500);
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
}

/* ---------------- 自适应缩放 ---------------- */

/**
 * 按窗口大小等比放缩中英文字号。
 * 以"内容承载容器"（.word-display / .quiz-item）的实际可用宽高为上限，
 * 让文字尽量撑满但不超过其 80%（80% 为上限，留少量边距）。
 * 操作栏、题目编号、输入提示等固定元素已由 flex 布局扣减，无需在此计算。
 * 测量时取容器内所有文字元素的整体外接尺寸，避免背默模式下输入框为空导致误判。
 */
function fitDisplay() {
  // 内容承载容器：打字模式是 .word-display，背默模式是 .quiz-item
  const hostEl = document.querySelector('.word-display, .quiz-item');
  if (!hostEl) return;

  const maxW = Math.max(120, hostEl.clientWidth);
  const maxH = Math.max(60, hostEl.clientHeight * 0.8);

  let lo = 16, hi = 320;
  for (let i = 0; i < 26; i++) {
    const mid = (lo + hi) / 2;
    document.documentElement.style.setProperty('--display-size', mid + 'px');
    // 取容器内所有子元素的外接宽高
    let sw = 0, sh = 0;
    hostEl.querySelectorAll(':scope > *').forEach((el) => {
      sw = Math.max(sw, el.scrollWidth);
      sh += el.scrollHeight;
    });
    if (sw > maxW || sh > maxH) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  document.documentElement.style.setProperty('--display-size', Math.floor(lo) + 'px');
}

/* ---------------- 提交与结果 ---------------- */

async function submit() {
  const duration = dictation.stopTimer();
  clearInterval(timerInterval);
  if (timerEl) timerEl.classList.add('hidden');

  const graded = dictation.grade();
  const correctCount = graded.filter((g) => g.correct).length;
  const score = Math.round((correctCount / graded.length) * 100);

  // 用自定义模态框替代 window.prompt（Electron 中 prompt 不显示对话框）
  const username = (await askUsername()) || '匿名';

  try {
    await addScore({
      username,
      mode: 'dictation',
      grades: (filters.grade || []).join(',') || '全部',
      total: graded.length,
      score,
      duration,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('成绩保存失败：', err);
  }

  renderResult(graded, score, duration);
}

/** 显示用户名输入模态框，返回用户输入的字符串（取消则返回空字符串） */
function askUsername() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <h3 class="modal-title">保存成绩</h3>
        <p class="modal-desc">请输入用户名（可留空，默认"匿名"）</p>
        <input type="text" class="modal-input" id="modal-name-input" maxlength="20" placeholder="匿名" autocomplete="off">
        <div class="modal-actions">
          <button class="btn btn-ghost" id="modal-cancel">取消</button>
          <button class="btn btn-primary" id="modal-confirm">确认</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#modal-name-input');
    const btnCancel = overlay.querySelector('#modal-cancel');
    const btnConfirm = overlay.querySelector('#modal-confirm');

    const close = (val) => {
      overlay.remove();
      resolve(val);
    };

    input.focus();
    // 回车确认，Esc 取消
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') close(input.value.trim());
      else if (e.key === 'Escape') close('');
    });
    btnCancel.addEventListener('click', () => close(''));
    btnConfirm.addEventListener('click', () => close(input.value.trim()));
  });
}

function renderResult(graded, score, duration) {
  keyboardEl.classList.add('hidden');
  btnPrev.classList.add('hidden');
  btnNext.classList.add('hidden');
  if (btnSubmit) btnSubmit.classList.add('hidden');
  // 结果页：题目区占满整屏并允许滚动
  document.querySelector('.practice-body').classList.add('result-mode');
  // stage 改为顶部对齐
  stage.classList.add('result-stage');

  const wrong = graded.filter((g) => !g.correct);
  const wrongHtml = wrong.length === 0
    ? '<div class="empty-tip">🎉 全部正确！</div>'
    : wrong
        .map(
          (g) => `
          <div class="wrong-item">
            <div class="wrong-zh">${escapeHtml(g.item.translation)}</div>
            <div class="wrong-line correct">${buildCorrectLine(g.item.content, g.userInput)}</div>
            <div class="wrong-line user">${buildUserLine(g.item.content, g.userInput)}</div>
          </div>`
        )
        .join('');

  stage.innerHTML = `
    <div class="result-inner">
      <div class="result-top-bar">
        <a class="btn btn-ghost" href="index.html">← 返回首页</a>
      </div>
      <div class="score-card">
        <div class="score-num ${score === 100 ? 'perfect' : ''}">${score} 分</div>
        <div class="score-meta">答对 ${graded.length - wrong.length} / ${graded.length} 题 · 用时 ${duration} 秒</div>
      </div>
      <div class="wrong-list">${wrongHtml}</div>
    </div>`;
}

/** 正确答案行（按最大长度逐位输出，差异位标红） */
function buildCorrectLine(content, userInput) {
  const maxLen = Math.max(content.length, userInput.length);
  let html = '';
  for (let p = 0; p < maxLen; p++) {
    const e = content[p] ?? '';
    const a = userInput[p] ?? '';
    const isDiff = e !== a;
    const disp = e === ' ' ? '&nbsp;' : escapeHtml(e) || '&nbsp;';
    html += `<span class="${isDiff ? 'diff-char to' : ''}">${disp}</span>`;
  }
  return html;
}

/** 用户答案行（与正确行同一位置上下对齐） */
function buildUserLine(content, userInput) {
  const maxLen = Math.max(content.length, userInput.length);
  let html = '';
  for (let p = 0; p < maxLen; p++) {
    const e = content[p] ?? '';
    const a = userInput[p] ?? '';
    const isDiff = e !== a;
    const disp = a === ' ' ? '&nbsp;' : escapeHtml(a) || '&nbsp;';
    html += `<span class="${isDiff ? 'diff-char to' : ''}">${disp}</span>`;
  }
  return html;
}

/** HTML 转义，防止题面特殊字符破坏结构 */
function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}