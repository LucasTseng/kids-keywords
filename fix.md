# Bug 修复记录

## 2026-10-02

### 问题描述

Windows 打包版（`打字背默练习-便携版-1.0.6-x64.exe`）中背默模式存在两个问题：
1. **提交无反应**：点击「提交」按钮后无任何反馈，不跳转到结果页
2. **计时器不走动**：右上角计时始终显示 `00:00`，不随时间递增

### 根因分析

1. **提交无反应**：`submit()` 中通过 `window.prompt('请输入用户名...')` 获取用户名。Electron 渲染进程中 `window.prompt` 默认被禁用，返回 `null` 且不弹出对话框；用户看不到输入框，误以为提交没反应（实际后续逻辑可能执行，但缺少可见反馈）。
2. **计时器不走动**：`init()` 中调用顺序为 `dictation.startTimer()` → `startTimerDisplay()` → `renderDictation()`。`startTimerDisplay()` 内部判断 `if (!timerEl) return;`，但此时 `renderDictation()` 尚未执行，`#timer` 元素还不存在，`timerEl` 为 `null`，`setInterval` 从未启动，计时器自然不会更新。

### 修复方法

1. **提交功能**：新增 `askUsername()` 函数，用自定义 HTML 模态框（输入框 + 确认/取消按钮，支持回车确认、Esc 取消）替代 `window.prompt`，返回 Promise。浏览器与 Electron 行为一致。
2. **计时器**：调整 `init()` 中背默模式的调用顺序为 `renderDictation()` → `startTimerDisplay()`，确保 `#timer` 元素已渲染后再启动 `setInterval`。

### 验证结果

- 浏览器实测（强制刷新清缓存）：计时器从 `00:00` 正常递增；点击「提交」弹出自定义模态框；输入用户名确认后跳转结果页并显示分数
- Electron 开发态 `pnpm app` 启动无报错
- 重新打包 `v1.0.7`：安装包与便携版均生成成功

### 修改文件

| 作用描述 | 文件名 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| 修复计时器启动顺序 | `app/practice.js` | `startTimerDisplay()` 在 `renderDictation()` 之前调用 | 先 `renderDictation()` 再 `startTimerDisplay()` |
| 替换原生 prompt | `app/practice.js` | `const username = prompt(...)` | `const username = await askUsername()`，新增模态框函数 |
| 模态框样式 | `app/style.css` | 无 | 新增 `.modal-overlay`、`.modal-box`、`.modal-input`、`.modal-actions` 样式 |

## 2026-10-02

### 问题描述

多平台打包联调时发现 `help.html` 文件在「重置」按钮事件回调处被截断（止于 `instance`，缺少 `.reset();`、回调闭合与 `</script></body></html>`）。浏览器解析时整段内联脚本抛出 `Uncaught SyntaxError: Unexpected end of input`，导致帮助页 3 个键盘演示实例（`#vk-demo`、`#vk-demo-2`、`#vk-demo-3`）全部不渲染（预期 6 个 SVG，实际 0 个）；同时截断版被打入了第一桌面包的 asar 归档。

### 修复方法

1. 补全「重置」按钮回调（`instance.reset();` 与闭合括号）及 `</script></body></html>` 文件结尾标签
2. 重新执行 `pnpm app:win` 打包，确保安装包内为修复后的完整文件

### 验证结果

- 浏览器访问帮助页：3 个演示实例各渲染 2 个 SVG（键盘 + 手势），共 6 个，无语法错误
- 重新打包成功，asar 内 `help.html` 完整

### 修改文件

| 作用描述 | 文件名 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| 补全被截断的脚本与页面结尾 | `help.html` | 文件止于第 182 行 `instance`，内联脚本整体失效 | 补全 `instance.reset()` 回调与 `script/body/html` 闭合标签 |

## 2026-10-02

### 问题描述

背默结束后的核对页面（结果页）存在布局问题：内容垂直居中显示导致顶部留白浪费，且"返回首页"按钮位于页面底部，错题较多时需要滚动到底部才能返回，操作不便。

### 修复方法

1. 给 `#stage` 添加 `.result-stage` 类，覆盖 `justify-content` 为 `flex-start`，使内容从顶部开始排列
2. 将"返回首页"按钮从底部移至顶部，包裹在 `.result-top-bar` 中，使用 `position: sticky; top: 0` 固定，滚动时始终可见
3. 修正结果页样式选择器：`.result .score-card` 等改为 `.result-inner .score-card`，匹配实际 DOM 结构

### 验证结果

- 结果页内容从顶部对齐，顶部留有操作栏空间
- 滚动 500px 后返回按钮仍固定在顶部（`getBoundingClientRect().top` 保持 32px）
- 错题列表正常滚动显示

### 修改文件

| 作用描述 | 文件名 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| 结果页顶部对齐 | `app/style.css` | `#stage` 垂直居中 | `#stage.result-stage { justify-content: flex-start }` |
| 返回按钮固定顶部 | `app/style.css` / `app/practice.js` | 返回按钮在 `.result-actions` 底部 | 移至 `.result-top-bar`，`position: sticky; top: 0` |
| 结果页选择器修正 | `app/style.css` | `.result .score-card` 等不匹配 | 改为 `.result-inner .score-card` |

## 2026-10-02

### 问题描述

练习页中英文内容区域显示不完整：顶部 toolbar 占用空间导致内容区被挤压；`fitDisplay` 只测量单个文字元素（打字模式测 `.word-content`、背默模式测空的 `.quiz-slots`），未考虑背默模式的题目编号导航和输入提示等固定元素的高度，导致计算的可用高度偏大、文字溢出出现滚动条；打字模式 `.word-display` 未设置 `height:100%`，容器高度仅由内容撑开，字号无法撑满区域。

### 修复方法

1. 移除顶部 toolbar，操作栏（首页 / 练习信息 / 提交 / 计时器）改为绝对定位浮于题目区顶部，释放垂直空间
2. 题目区固定占 40%、键盘区固定占 60%，明确高度分配
3. 背默模式改为 flex 纵向布局：`.quiz-nav` 固定上方（`flex-shrink:0`）、`.quiz-hint` 固定下方、`.quiz-item` 自适应（`flex:1; min-height:0`）
4. `fitDisplay` 改为测量内容容器内所有子元素的整体外接宽高（而非单个元素），以容器 `clientHeight * 0.8` 为上限
5. 打字模式 `.word-display` 设置 `height:100%` 撑满 stage
6. 全链路 `min-height:0` 确保 flex 子项可收缩，避免溢出裁切

### 验证结果

- 打字模式：`morning` 字号从 38px 提升至 150px，中英文完整居中显示，无滚动条
- 背默模式：题目编号固定上方、输入提示固定下方，中间中文内容自适应填满区域 80%
- 结果页：键盘隐藏后题目区占满整屏并允许滚动
- 窗口 resize 时字号自动重新计算

### 修改文件

| 作用描述 | 文件名 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| 移除顶部 toolbar | `practice.html` | 含 `.practice-top` | 移除，操作栏改由 JS 动态渲染 |
| 布局比例 + 背默上下固定 + min-height 链路 | `app/style.css` | 题目区 `flex:1`，无固定定位 | 题目区 40% / 键盘区 60%；`.quiz-nav`/`.quiz-hint` 固定；`.word-display` 设 `height:100%` |
| `fitDisplay` 测量整体尺寸 | `app/practice.js` | 测单个 `.word-content` / `.quiz-slots` | 测容器内所有子元素整体外接宽高 |
| 操作栏动态渲染 | `app/practice.js` | toolbar 在 HTML 固定 | `renderBar()` 动态生成，提交/计时器每次渲染重新绑定 |

## 2026-10-02

### 问题描述

`pnpm preview`（`npx serve`）会把 `practice.html?grades=…&units=…` 重定向为 `/practice` 并丢弃 query 参数，导致练习页读不到年级/单元筛选条件，`items` 为空，始终显示「该年级暂无题目」（打字、背默均受影响）。此前本地开发用 `python -m http.server` 无此重定向，未暴露该问题。

### 修复方法

筛选参数改由 `sessionStorage` 传递：首页点击开始时写入 `practice-config`（含 grades / mode / count / order / units 数组），练习页优先读 sessionStorage；当 URL 自带 query（直接访问）时仍优先用 query，保证两种访问方式都正确。

### 验证结果

- 修复前：`npx serve` 环境下，选年级/单元后进入练习页始终显示「该年级暂无题目」
- 修复后：同环境打字不复选单元 178 题、勾选「上册Unit 1 Greetings」13 题、背默正常进入并计时

### 修改文件

| 作用描述 | 文件名 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| 筛选参数改 sessionStorage 传递 | `app/home.js` | 用 URL query 传 grades/units 等参数 | 点击开始写入 sessionStorage，跳转不带 query |
| 练习页兼容两路读取 | `app/practice.js` | 仅读 URL query | 优先读 sessionStorage，URL query 直访时优先 query |

## 2026-10-01

### 问题描述

`scripts/build.mjs` 在 Windows（CRLF 换行）环境下构建失败：脚本用 `\n` 硬编码搜索 UMD 工厂函数结束标记 `'\n  return VKeyboardHand;\n});'`，而该机器上 `src/vkeyboardhand.js` 为 CRLF 换行，`indexOf` 无法匹配，抛出「无法定位 UMD 工厂函数结束位置」。

### 修复方法

读取源文件后先将换行统一规范化为 LF（`.replace(/\r\n/g, '\n')`），再进行索引标记搜索，使脚本在 LF / CRLF 环境下均可正常构建。

### 验证结果

- 修复前：`pnpm build` 在 Windows 环境报「无法定位 UMD 工厂函数结束位置」并中断，后续题库构建脚本无法执行
- 修复后：`pnpm build` 完整跑通（生成 dist 组件产物 + data/vocabulary.sqlite + vendor 运行时）

### 修改文件

| 作用描述 | 文件名 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| 构建脚本兼容 CRLF 换行 | `scripts/build.mjs` | 读取后直接用 `\n` 索引搜索结束标记 | 读取后先规范化换行为 LF，再搜索 |

## 2026-08-05

### 问题描述

`play()` 连续演示（以及所有按键演示）时，按键手势与双手自然状态重叠：`showHandBoth: false` 会隐藏双手自然状态导致未按键一侧空白；`showHandBoth: true` 则双手自然状态全部保留、与按键手势叠在一起。期望行为：左手键按下时 `#hand-neutral-left`（左手自然状态）隐藏、右手自然状态保留；右手键按下时反之；按键复原后双手自然状态恢复。

### 修复方法

修改 `_renderHand()` 手势渲染逻辑：`showHandBoth: false` 时不再整体隐藏双手自然状态，而是按当前按住的键计算被占用的手侧（通过 `fingerMap` 的手指 id 首字母 `l` / `r` 判断），隐藏**同侧**自然状态（被按键手势替代），保留**对侧**自然状态；无键按住时仍恢复双手自然状态。`showHandBoth: true` 行为保持不变（双手自然状态作为背景常显）。

### 验证结果

- 无头 Chrome + CDP 实测 `kb.play('hello', { pressTime: 450, gap: 120 })`（`showHandBoth: false`）：h 按住阶段 `#hand-h` 显示、`#hand-neutral-right` 隐藏、`#hand-neutral-left` 保留；e 按住阶段 `#hand-e` 显示、`#hand-neutral-left` 隐藏、`#hand-neutral-right` 保留；播放结束双手自然状态恢复
- 实例 2 固定演示 Y（`showHandBoth: false`）：`#hand-y` 显示、`#hand-neutral-right` 隐藏、`#hand-neutral-left` 保留
- `npm test` 5 项全部通过

### 修改文件

| 作用描述 | 文件名 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| 修复同侧自然状态与按键手势重叠/空白 | `src/vkeyboardhand.js` | `showHandBoth: false` 时隐藏双手自然状态，仅显示按键手势 | 按手侧隐藏同侧自然状态、保留对侧自然状态，复原后恢复双手 |
| 演示页切换新语义并更新注释 | `index.html` | 实例 3 使用 `showHandBoth: true`（双手常显导致重叠）；实例 2 注释为“隐藏左手” | 实例 3 改为 `showHandBoth: false`；实例 2 注释同步为“右手手势替代右手自然状态、左手保留” |
| 文档同步语义 | `README.md` / `README_zh.md` | `showHandBoth: false` 描述为“按下左手键隐藏右手” | 明确为“同侧自然状态被按键手势替代、对侧保留” |
| 变更记录 | `CHANGELOG.md` | 无本次修复记录 | 新增修复条目 |
