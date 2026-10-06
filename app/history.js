/**
 * history.js —— 历史成绩页脚本
 * 从本地数据库读取成绩记录按时间倒序展示，支持清空全部记录。
 */
import { listScores, clearScores } from './db.js';

const listEl = document.getElementById('score-list');
const btnClear = document.getElementById('btn-clear');

async function render() {
  let rows;
  try {
    rows = await listScores();
  } catch (err) {
    listEl.innerHTML = `<div class="empty-tip">成绩加载失败：${escapeHtml(err.message)}</div>`;
    return;
  }
  if (rows.length === 0) {
    listEl.innerHTML = '<div class="empty-tip">暂无成绩记录，快去练习吧</div>';
    return;
  }

  listEl.innerHTML = rows
    .map((r) => {
      const cls = r.score >= 90 ? 'high' : r.score >= 60 ? 'mid' : 'low';
      const modeName = r.mode === 'dictation' ? '背默' : '打字';
      return `
        <div class="score-row">
          <span class="s-name">${escapeHtml(r.username)}</span>
          <span class="s-meta">${modeName} · ${escapeHtml(r.grades)} · ${r.total} 题 · ${r.duration} 秒</span>
          <span class="s-score ${cls}">${r.score}%</span>
          <span class="s-time">${formatDate(r.created_at)}</span>
        </div>`;
    })
    .join('');
}

function formatDate(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

btnClear.addEventListener('click', async () => {
  if (!confirm('确定清空全部成绩记录？此操作不可恢复。')) return;
  await clearScores();
  render();
});

render();