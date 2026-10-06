/**
 * typing.js —— 打字练习引擎
 * 逐字符校验输入：匹配则前进、不匹配则不前进，全部完成判定 done。
 * 纯逻辑模块，不依赖 DOM。
 */
export class TypingEngine {
  constructor(target) {
    this.target = target;
    this.chars = Array.from(target);
    this.pos = 0;
  }

  /**
   * 处理一个可见字符输入。
   * 返回 'matched'（前进）/ 'mismatched'（不前进）/ 'done'（本条完成）。
   */
  input(ch) {
    if (this.isDone()) return 'done';
    if (ch !== this.target[this.pos]) return 'mismatched';
    this.pos += 1;
    return this.isDone() ? 'done' : 'matched';
  }

  /** 本条是否已完成 */
  isDone() {
    return this.pos >= this.target.length;
  }

  /** 返回每个字符单元的显示状态（done / current / todo） */
  getState() {
    return this.chars.map((char, i) => ({
      char,
      state: i < this.pos ? 'done' : i === this.pos ? 'current' : 'todo',
    }));
  }
}