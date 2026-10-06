/**
 * dictation.js —— 背默练习引擎
 * 逐题作答：每题用等长下划线占位提示字符数，用户逐字符输入（含空格、标点）。
 * 负责随机抽题、逐题作答状态、计时与提交评分。纯逻辑模块，不依赖 DOM。
 */
export class DictationEngine {
  constructor(items) {
    this.items = items;
    this.answers = items.map(() => '');   // 每题已填字符串
    this.current = 0;                     // 当前聚焦题下标
    this.timerStart = null;
  }

  /** 启动计时 */
  startTimer() {
    this.timerStart = Date.now();
  }

  /** 停止计时并返回用时（秒） */
  stopTimer() {
    if (this.timerStart == null) return 0;
    return Math.round((Date.now() - this.timerStart) / 1000);
  }

  /** 向当前题填充一个字符，返回是否成功（题目已填满时忽略） */
  input(ch) {
    const target = this.items[this.current].content;
    if (this.answers[this.current].length < target.length) {
      this.answers[this.current] += ch;
      return true;
    }
    return false;
  }

  /** 回退当前题最后一个已填字符 */
  backspace() {
    const a = this.answers[this.current];
    if (a.length > 0) {
      this.answers[this.current] = a.slice(0, -1);
    }
  }

  /** 跳转到指定题下标 */
  goto(i) {
    if (i >= 0 && i < this.items.length) this.current = i;
  }

  /** 每题作答状态，供导航配色：empty（灰）/ partial（橙）/ done（绿） */
  getNavState() {
    return this.items.map((it, i) => {
      const n = this.answers[i].length;
      if (n === 0) return 'empty';
      if (n < it.content.length) return 'partial';
      return 'done';
    });
  }

  get total() {
    return this.items.length;
  }

  /** 逐题评分：整题完全一致才算正确，同时给出逐字符差异供结果页展示 */
  grade() {
    return this.items.map((item, i) => {
      const userInput = this.answers[i];
      const correct = userInput === item.content;
      const diff = [];
      const maxLen = Math.max(userInput.length, item.content.length);
      for (let p = 0; p < maxLen; p++) {
        const expected = item.content[p] ?? '';
        const actual = userInput[p] ?? '';
        if (expected !== actual) diff.push({ pos: p, expected, actual });
      }
      return { item, userInput, correct, diff };
    });
  }
}