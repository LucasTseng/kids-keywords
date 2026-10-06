# Changelog

本项目所有重要变更均记录在此文件中。
格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [Semantic Versioning](https://semver.org/lang/zh-CN/)。

> 本项目为「kids-keywords」—— 面向小朋友的英语词汇·短句打字与背默学习应用，基于开源组件 [vkeyboardhand](https://github.com/ayuday/vkeyboardhand)（MIT License）二次开发，练习页的虚拟键盘与指法手势联动由该组件提供。下文 2026-08 及 `[1.0.x]` 条目为上游 vkeyboardhand 组件的历史记录。

## 2026-10-06

### 变更（项目更名：kids-keywords）

- 项目正式更名为 **kids-keywords**（原“打字 · 背默练习”应用 / vkeyboardhand 组件仓库），定位聚焦「小朋友入门英语词汇打字背默学习」
- 同步更新项目标识：`package.json` 的 `name` / `description` / `productName` / `appId`、README 标题、首页标题、PWA 清单名称、Service Worker 缓存版本名
- 底层 `vkeyboardhand` 组件技术名（`src/`、`dist/`、`vendor/`、组件 API 与示例）保持不变

### 修改文件

| 作用描述 | 文件名 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| 项目名 | `package.json` | `name: vkeyboardhand` | `name: kids-keywords` |
| 应用描述 | `package.json` | 组件介绍 | 学习应用介绍 |
| 桌面应用名 | `package.json` | `productName: 打字背默练习` | `productName: Kids Keywords` |
| 应用标识 | `package.json` | `appId: com.ayuday.vkeyboardhand` | `appId: com.lucastseng.kids-keywords` |
| GitHub 地址 | `package.json` | `github.com/ayuday/vkeyboardhand` | `github.com/LucasTseng/kids-keywords` |
| 作者 | `package.json` / `LICENSE` | `ayuday` | `LucasTseng` |
| README 标题 | `README.md` / `README_zh.md` | vkeyboardhand 组件 | kids-keywords 学习应用 |
| 首页标题 | `index.html` | `打字 · 背默练习` | `kids-keywords` |
| PWA 名称 | `manifest.webmanifest` | `打字 · 背默练习` | `kids-keywords 英语打字背默` |
| 缓存版本名 | `sw.js` | `vkeyboardhand-v1.0.7` | `kids-keywords-v1.0.7` |

## 2026-10-03

### 功能新增（Excel 批量维护题库 + 动态筛选字段）

- **数据维护页**：新增 `data.html` + `app/data-maintain.js`，首页「帮助」链接右侧新增「📂 数据维护」入口。支持下载 Excel 模板、导出当前题库、导入 Excel 全量替换（含使用说明提示）
- **Excel 导入导出**：新增 `app/xlsx-io.js`，基于 SheetJS（`vendor/xlsx.full.min.js`）纯浏览器端解析/生成 xlsx，无后端依赖。固定列「原文 / 翻译 / 年级 / 所属单元」支持中英文列名容错识别（content / translation / grade / unit）
- **动态筛选字段**：词汇表新增 `extra`（JSON）列，Excel 中除固定列以外的任意列自动识别为「动态筛选字段」；首页依据题库实际字段动态渲染筛选器（年级 / 所属单元 / 动态字段），开始练习时按所选动态参数过滤出题
- **全量替换语义**：导入用新数据整体覆盖 vocabulary 表（增、删、改均通过编辑 Excel 后重新导入实现），成绩表不受影响始终保留
- **数据持久化**：运行时数据变更沿用 IndexedDB 快照机制（`store.js` 键升级为 `main-v3`，使旧快照失效并重新加载含 `extra` 列的新基线）；SQLite 仅作为出厂基线，`data/vocabulary.sqlite` 由 `scripts/build-vocabulary.mjs` 构建生成
- **背默空格可视化标记**：背默模式下空格槽位用「浅蓝背景 + 蓝色虚线下划线 + 居中点」标注，与普通字符的灰色下划线明显区分，便于识别「I am / I'm」这类含空格的书写差异；提示文案同步说明「蓝色虚线下划线为空格」

### 数据层改造

- `app/db.js` 新增：`listFilterFields`（聚合全部筛选字段与去重值）、`replaceVocabulary`（全量替换）、`exportVocabulary`、`countVocabulary`；`listItems` / `randomPick` 改为通用 `filters` 对象（固定字段 SQL 过滤 + 动态字段 JS 层匹配）
- `scripts/build-vocabulary.mjs`：`vocabulary` 表新增 `extra` 列，构建时本地化 SheetJS 运行时到 `vendor/`
- `package.json`：新增 `xlsx` 开发依赖；electron-builder `files` 与 `sw.js` 缓存清单纳入 `data.html` / `app/data-maintain.js` / `app/xlsx-io.js` / `vendor/xlsx.full.min.js`

### 修复

- 修复动态字段筛选失效：`parseExtra` 对已解析对象二次 `JSON.parse` 抛错，增加 `typeof raw === 'object'` 短路分支
- 修复 SQL `DISTINCT unit ... ORDER BY MIN(id)` 聚合误用报错，改为 `GROUP BY unit ORDER BY MIN(id)`

### 精简

- **移除多国语言 README**：删除 `README_ja.md` / `README_ko.md` / `README_ru.md` / `README_pt.md` / `README_es.md`，仅保留英文 `README.md` 与中文 `README_zh.md`；同步简化两个 README 顶部的语言切换链接，仅保留中英入口

### 验证结果

- 本地实测（localhost 8022，清缓存）：首页正确渲染年级 / 单元 / 动态字段（词性、主题）筛选器
- 导入含「词性」「主题」动态列的 Excel 后，首页自动生成对应筛选器；「词性=名词」筛选出 apple/banana、「词性=动词」筛选出 run、「主题=水果」筛选出 apple/banana，出题正确
- 数据维护页统计（404 条）与预览表格（前 50 条）正常，动态字段展开为额外列
- Windows 重新打包（含数据维护页 + 修复）：`release/打字背默练习-安装包-1.0.7-x64.exe`（91.9MB）、`release/打字背默练习-便携版-1.0.7-x64.exe`（91.7MB）

### 修改文件

| 作用描述 | 文件名 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| 数据维护页 | `data.html` / `app/data-maintain.js` | 无 | 新增 |
| Excel 导入导出封装 | `app/xlsx-io.js` | 无 | 新增 |
| 动态字段列 | `app/db.js` | 仅 grade/unit 固定筛选 | 新增 extra 列 + `listFilterFields` / `replaceVocabulary` / `exportVocabulary` / `countVocabulary` |
| 快照版本 | `app/store.js` | `main-v2` | `main-v3` |
| 构建脚本 extra 列 | `scripts/build-vocabulary.mjs` | 无 extra 列 | 新增 extra 列 + 本地化 xlsx 运行时 |
| 首页动态筛选 | `index.html` / `app/home.js` | 固定年级/单元筛选 | 依据 `listFilterFields` 动态渲染筛选器 |
| 练习页通用过滤 | `app/practice.js` | grades/units 参数 | 通用 `filters` 对象 |
| 依赖与构建 | `package.json` | 无 xlsx | 新增 `xlsx` 依赖，`files` 纳入新资源 |
| 离线缓存清单 | `sw.js` | 无数据维护资源 | 纳入 data.html / 新脚本 / xlsx 运行时 |
| 部署清单 | `.github/workflows/deploy-gh-pages.yml` | 无 data.html | 站点产物加入 data.html |
| 背默空格标记 | `app/practice.js` / `app/style.css` | 空格与字符同用灰色下划线 | 空格加 `slot-space` 类，浅蓝背景 + 蓝色虚线下划线 + 居中点 |
| 精简多国语言文档 | `README_ja/ko/ru/pt/es.md` | 5 个语言版本 README | 删除，仅保留 `README.md` / `README_zh.md` |
| 语言切换链接 | `README.md` / `README_zh.md` | 7 语言切换链接 | 仅保留中英切换 |

## 2026-10-02（v1.0.7）

### Bug 修复（背默模式计时器与提交功能）

- **背默计时器不走动**：`init()` 中 `startTimerDisplay()` 在 `renderDictation()` 之前调用，此时 `#timer` 元素尚未渲染，`timerEl` 为 `null`，导致 `setInterval` 从未启动。修复：调整调用顺序，先渲染 DOM 再启动计时
- **背默提交无反应**：`submit()` 中使用 `window.prompt()` 获取用户名，Electron 中 `prompt` 默认返回 `null` 且不弹出对话框，用户看不到任何反馈。修复：用自定义 HTML 模态框（带输入框 + 确认/取消按钮，支持回车确认 / Esc 取消）替代原生 `prompt`，浏览器与 Electron 行为一致

### 文档

- 新增 `docs/INSTALL.md`：跨平台安装部署手册，覆盖 Windows（安装版/便携版）、macOS（DMG）、Android 平板（PWA）、iPadOS 平板（PWA）的安装步骤与常见问题

### 验证结果

- 浏览器实测（localhost，强制刷新清缓存）：计时器从 00:00 正常走动；点击「提交」弹出自定义模态框而非原生 prompt；输入用户名确认后跳转结果页
- Electron 开发态 `pnpm app` 启动无报错
- Windows 重新打包：`release/打字背默练习-安装包-1.0.7-x64.exe`（91.7MB）、`release/打字背默练习-便携版-1.0.7-x64.exe`（91.5MB）

### 修改文件

| 作用描述 | 文件名 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| 修复计时器启动顺序 | `app/practice.js` | `startTimerDisplay()` 在 `renderDictation()` 前调用 | 先 `renderDictation()` 再 `startTimerDisplay()` |
| 替换原生 prompt 为模态框 | `app/practice.js` | `const username = prompt(...)` | 新增 `askUsername()` 返回 Promise，渲染自定义模态框 |
| 模态框样式 | `app/style.css` | 无 | 新增 `.modal-overlay` / `.modal-box` / `.modal-input` / `.modal-actions` 等样式 |
| 版本号 | `package.json` | `1.0.6` | `1.0.7` |
| 跨平台安装手册 | `docs/INSTALL.md` | 无 | 新增：Windows / macOS / Android 平板 / iPadOS 安装说明 |

## 2026-10-02

### 功能新增（V1 多平台打包：PWA + Electron 桌面版）

- **PWA 全平台支持**：新增 `manifest.webmanifest` 与 `sw.js`，安装后预缓存全部静态资源（页面、脚本、sql.js 运行时、题库、图标），完全离线可用；Android Chrome 与 iPhone Safari「添加到主屏幕」即可像原生应用一样全屏运行
- **Electron 桌面版**：新增 `electron/main.cjs`，注册 `app://` 安全自定义协议加载站内静态资源，规避 `file://` 下 ES Module / fetch / WebAssembly 的同源限制；配置 electron-builder，Windows 产出 NSIS 安装包与便携版 exe（约 92MB），macOS 产出 dmg（x64 / arm64 双架构，由云端 CI 构建）
- **应用图标体系**：新增 `icons/` 下 1024 方形 SVG 源图（蓝色键盘 + 指尖点按高亮键）与 `scripts/generate-icons.mjs`（基于 sharp 栅格化），一次生成 PWA 192/512、Android maskable、iOS apple-touch-icon、electron-builder 1024 源图标
- **云端发布流水线**：新增 `.github/workflows/release-desktop.yml`，推送 `v*` 标签时在 Windows / macOS 虚拟机构建桌面包并自动附加到 GitHub Release；同步更新 GitHub Pages 部署清单，把 `icons/`、`manifest.webmanifest`、`sw.js` 纳入站点

### 实现说明（关键权衡）

- Electron 44/42 的安装链与 electron-builder 26 已全面 ESM 化，在本机 Node 20 下无法执行（`ERR_REQUIRE_ESM`）；锁定 **electron 38.8 + electron-builder 25.1** 的 CJS 工具链，兼容 `engines: >=20`，CI 的 Node 24 同样可用
- `package.json` 的 `main` 是 npm 包 UMD 入口不能改动；桌面入口通过 electron-builder 的 `extraMetadata.main` 在打包时改写，开发态用 `pnpm app` 显式指定 `electron electron/main.cjs`
- Chromium 不允许 `app://` 这类自定义协议注册 Service Worker；桌面端资源本就在本地，`app/pwa.js` 已对注册失败静默兜底
- Windows 本机打包时 winCodeSign 解压需要创建 macOS 符号链接特权；仅解压其 `windows-10`/`windows-6` 工具到 electron-builder 缓存即可绕过（CI 虚拟机自带权限，无此问题）

### 验证结果

- 开发态冒烟：首页三个年级正常加载（ESM + WASM + SQLite + IndexedDB 全链路）、单元联动 17 项、开始练习后题目舞台与键盘/手势双 SVG 渲染成功
- 浏览器实测（localhost）：Service Worker 已 activated 并控制页面、30 个资源预缓存成功、manifest 返回 200、帮助页 3 个演示实例共 6 个 SVG
- Windows 成品：`pnpm app:win` 产出安装包与便携版，打包后程序启动稳定，asar 内 32 个文件完整（含 658KB wasm 与 45KB 题库）

### 修改文件

| 作用描述 | 文件名 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| PWA 应用清单 | `manifest.webmanifest` | 无 | 新增：名称、图标、主题色、standalone、maskable 图标 |
| 离线缓存层 | `sw.js` | 无 | 预缓存 30 个核心资源；导航网络优先、静态资源缓存优先并后台更新 |
| SW 注册模块 | `app/pwa.js` | 无 | 安全上下文注册根级 SW，失败静默不阻断页面 |
| 4 个页面接入 PWA | `index.html` `practice.html` `history.html` `help.html` | 无清单/图标声明 | 增加 manifest、theme-color、favicon、apple-touch-icon、iOS 主屏 meta 与 pwa.js 引用 |
| Electron 主进程 | `electron/main.cjs` | 无 | app:// 协议（MIME 映射 + 路径穿越校验）、中文菜单、1180×800 主窗口 |
| 桌面包构建配置 | `package.json` | 无桌面打包能力 | 新增 build（nsis + portable + dmg）、app/app:win/app:mac 脚本、extraMetadata 入口、sharp 等开发依赖 |
| 图标源图 | `icons/icon.svg` `icons/icon-maskable.svg` | 无 | 1024 方形圆角版与满幅 maskable 版 |
| 图标产物 | `icons/*.png` `build/icon.png` | 无 | 192/512/maskable-512 PNG、180 apple-touch-icon、1024 安装包源图标 |
| 图标栅格化脚本 | `scripts/generate-icons.mjs` | 无 | 用 sharp 由 SVG 生成全部尺寸 PNG |
| 桌面包发布流水线 | `.github/workflows/release-desktop.yml` | 无 | tag 触发 Win/Mac 双平台构建并附加到 GitHub Release |
| Pages 部署清单 | `.github/workflows/deploy-gh-pages.yml` | 未复制 PWA 资源 | 复制列表补充 `icons/`、`manifest.webmanifest`、`sw.js` |
| 构建产物忽略 | `.gitignore` | 未忽略 release | 新增 `/release/` |
| 7 语文档目录结构 | `README.md` `README_zh/ja/ko/ru/pt/es.md` | 未含新文件 | 目录树追加 electron、icons、build、manifest、sw.js、pwa.js、generate-icons.mjs 说明 |

## 2026-10-02

### 变更

- 本地预览端口对齐 AI Studio `PROJECTS.md` 的统一分配：`preview` 脚本固定为 **8011**（`npx serve . -l 8011`），此前为 serve 默认端口 3000，与总表登记不一致
- 在 7 个语言版本的 README「开发与构建」章节补充「端口要求」说明：本地预览端口 8011；本项目为纯前端，无后端端口（跳过 3011）

### 修改文件

| 作用描述 | 文件名 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| 预览脚本端口 | `package.json` | `npx serve .`（默认 3000） | `npx serve . -l 8011` |
| 端口说明（英文） | `README.md` | 未标注端口 | 标注本地预览端口 8011 |
| 端口说明（中文） | `README_zh.md` | 未标注端口 | 同上 |
| 端口说明（日语） | `README_ja.md` | 未标注端口 | 同上 |
| 端口说明（韩语） | `README_ko.md` | 未标注端口 | 同上 |
| 端口说明（俄语） | `README_ru.md` | 未标注端口 | 同上 |
| 端口说明（葡萄牙语） | `README_pt.md` | 未标注端口 | 同上 |
| 端口说明（西班牙语） | `README_es.md` | 未标注端口 | 同上 |

### 功能优化

- 练习页布局重构：移除顶部 toolbar，操作栏（首页 / 练习信息 / 提交 / 计时器）改为绝对定位浮于题目区顶部；题目区固定占 40%，键盘区固定占 60%
- 背默模式结构调整：题目编号导航（`.quiz-nav`）固定上方、输入提示（`.quiz-hint`）固定下方、中间中英文内容区自适应填满
- 自适应缩放修正：`fitDisplay` 改为测量内容容器（`.word-display` / `.quiz-item`）内所有子元素的整体外接宽高，确保中英文文本尽量撑满区域但不超过 80%
- 结果页模式：提交后键盘隐藏，题目区自动占满整屏并允许纵向滚动
- 结果页布局优化：内容改为垂直顶部对齐（`justify-content: flex-start`），返回按钮移至顶部并 `sticky` 固定，滚动时始终可见

### 修改文件

| 作用描述 | 文件名 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| 移除顶部 toolbar | `practice.html` | 含 `.practice-top`（首页 / 信息 / 提交 / 计时） | 移除，操作栏改由 JS 动态渲染进 stage |
| 布局比例与内部结构 | `app/style.css` | 题目区 `flex:1` 自适应，背默元素无固定定位 | 题目区 40% / 键盘区 60%；背默上下固定、中间自适应；`min-height:0` 链路 |
| 操作栏动态渲染 + 缩放修正 | `app/practice.js` | 操作栏在 HTML 中固定；`fitDisplay` 只测单个文字元素 | `renderBar()` 动态渲染；`fitDisplay` 测容器内所有子元素整体尺寸 |
| 清除键盘加载残留提示 | `app/practice.js` | `initKeyboard` 未清空容器 | 创建前 `keyboardEl.innerHTML = ''` |
| 结果页顶部对齐 + 返回按钮固定 | `app/style.css` / `app/practice.js` | stage 垂直居中，返回按钮在底部 | `#stage.result-stage` 顶部对齐；`.result-top-bar` 用 `position:sticky;top:0` 固定 |

## 2026-10-01

### 功能新增

- 基于现有 vkeyboardhand 组件新增「打字 + 背默练习」学习应用，包含首页、练习页（打字 / 背默两种模式）、结果页、帮助页、历史成绩页
- 题库入库：新增 `scripts/build-vocabulary.mjs`，解析《沪教版（上教版）上海小学1-3年级英语核心词汇&句型汇总表.md》为 325 条（一年级 139 / 二年级 97 / 三年级 89），用 sql.js 生成 `data/vocabulary.sqlite`，并把 sql.js 浏览器运行时本地化到 `vendor/`
- 数据层：新增 `app/db.js`（sql.js 封装：题库查询、成绩读写）与 `app/store.js`（IndexedDB 持久化整库快照，实现成绩跨会话保留）
- 练习引擎：新增 `app/typing.js`（逐字符校验：正确前进、错误不前进）与 `app/dictation.js`（下划线占位、逐字输入、计时、题目级评分）
- 打字练习模式：看英文打英文，正确字符变绿、错误标红且不前进，全部打对自动进入下一题，左右按钮与方向键切换
- 背默练习模式：只显示中文与等长下划线占位（含空格与标点），逐字输入、回车 / 方向键 / 鼠标跳转；导航按作答状态灰 / 橙 / 绿配色；提交后仅展示做错的题（正确与错误上下对齐），按百分比评分并记录用时
- 成绩记录：提交前输入用户名（可留空记为「匿名」），写入本地 sqlite；历史成绩页按时间倒序回看、支持清空
- 帮助页：原组件演示页 `index.html` 内容迁入 `help.html`，`index.html` 重写为应用首页
- 打字练习新增「出题顺序」选项：默认顺序（按数据库 id 升序）或随机顺序（随机打乱全部题目）；背默模式仍固定随机抽取
- 题库新增「所属单元」字段：`vocabulary` 表增加 `unit` 列，构建脚本解析第 4 列并跳过分组标题行；首页「所属单元」随年级联动
- 新增单元多选下拉组件 `app/multiselect.js`：勾选多选、已选标签、输入框模糊搜索、下拉可滚动，年级变化自动刷新可选单元
- 练习 / 背默中英文按浏览器窗口自适应缩放：字号等比拟合，内容宽高不超过题目区 80%（80% 为上限）

### 变更

- `package.json` 新增 `sql.js` 开发依赖，`build` 脚本串联题库构建
- GitHub Actions（`ci.yml` / `deploy-gh-pages.yml`）改用 pnpm 安装依赖并构建，部署产物加入新增页面与 `app/` `data/` `vendor/`
- `.gitignore` 忽略构建产物 `data/vocabulary.sqlite` 与 `vendor/`

### 修改文件

| 作用描述 | 文件名 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| 应用首页 | `index.html` / `app/home.js` | 组件演示页 | 重写为应用首页（年级多选 / 方式 / 挑战数量 / 入口） |
| 练习页 | `practice.html` / `app/practice.js` | 不存在 | 新增（两种模式 + 键盘组件 + 提交结果） |
| 帮助页 | `help.html` | 不存在 | 新增（承接原组件演示内容） |
| 历史成绩页 | `history.html` / `app/history.js` | 不存在 | 新增 |
| 题库构建脚本 | `scripts/build-vocabulary.mjs` | 不存在 | 新增 |
| 数据库封装 | `app/db.js` | 不存在 | 新增 |
| 本地持久化 | `app/store.js` | 不存在 | 新增 |
| 打字引擎 | `app/typing.js` | 不存在 | 新增 |
| 背默引擎 | `app/dictation.js` | 不存在 | 新增 |
| 应用样式 | `app/style.css` | 不存在 | 新增 |
| 依赖与构建 | `package.json` | devDependencies 为空 | 新增 sql.js，build 串联题库构建 |
| 文档 | `docs/PRD.md` / `docs/SDD.md` | 不存在 | 新增 |
| 目录结构说明 | `README*.md`（7 语言） | 无应用文件 | 追加 app/scripts/docs/pages 说明 |
| CI / 部署 | `.github/workflows/ci.yml` / `deploy-gh-pages.yml` | npm 零依赖构建 | pnpm 安装 + 构建，部署新增文件 |
| 出题顺序选项 | `index.html` / `app/home.js` / `app/practice.js` / `app/db.js` | 打字固定数据库顺序 | 打字可选择默认 / 随机顺序；`randomPick` 支持全量随机 |
| 题库单元字段 | `scripts/build-vocabulary.mjs` / `app/db.js` / `app/store.js` | vocabulary 无 unit 列 | 表加 unit 列、解析第 4 列、跳过分组标题、快照版本升级 |
| 单元多选联动 | `index.html` / `app/home.js` / `app/multiselect.js` / `app/practice.js` | 仅年级筛选 | 年级联动单元多选 + 模糊搜索 + 练习页单元过滤 |
| 中英文自适应缩放 | `app/style.css` / `app/practice.js` | 固定字号 | 按窗口等比缩放字号（80% 上限） |

## 2026-08-05

### 功能新增

- 演示页 `index.html` 新增 `#vk-demo-2` 实例：关闭键盘监听（`listenKeyboard: false`），渲染后固定演示按键 Y 的键盘高亮与正确手势（右手食指），并显式指定 `showHandBoth: false`（按键手势替代同侧自然状态、对侧自然状态保留）
- `#vk-demo` 与 `#vk-demo-2` 下方均增加“代码用法（Code Usage）”代码块，展示组件初始化用法
- 组件新增 `play(keys, options?)` 实例方法：连续演示一串按键（打字序列），支持字符串（自动转小写、空格映射为 `space`）或键名数组，可配置每键按住时长 `pressTime` 与松开间隔 `gap`，提供 `onStep` 每步回调并返回 Promise
- `play(keys, options?)` 新增 `loop` 配置（默认 `false`）：设为 `true` 时自动循环播放序列，直到组件销毁（`destroy()`）停止
- 演示页 `index.html` 实例 3 改为连续演示 hello：使用 `kb.play('hello', { pressTime: 450, gap: 120 })`，并清理手工测试遗留的重复 `#vk-demo-3` id、无效 `#vk-demo-4` 容器引用与临时 `playKeys` 函数

### 修复

- `play()` 连续演示及按键演示时手势重叠：`showHandBoth: false` 由“隐藏双手自然状态、仅显示按键手势”修正为“同侧自然状态被按键手势替代（隐藏）、对侧自然状态保留”，按键复原后恢复双手自然状态（详见 `fix.md`）

### 变更

- GitHub Actions 工作流统一 Node.js 版本与 action 版本：`ci.yml` / `deploy-gh-pages.yml` / `release.yml` 中全部 4 处 `node-version` 由 `20` 改为 `24`；`deploy-gh-pages.yml` 的 `actions/setup-node` 由 `@v5` 统一为 `@v6`（与其余 workflow 一致）

### 验证结果

- 无头 Chrome 实测：`#vk-demo-2` 内 `letter-bg-y` 高亮、`hand-y` 显示、`hand-neutral-right` 隐藏、`hand-neutral-left` 保留、指法标签显示“右手食指 按 Y”
- 模拟真实键盘 `KeyA`：`#vk-demo-2` 不响应（关闭键盘监听生效），Y 演示保持
- 两个代码用法块渲染正常
- `npm run build` 构建成功，`dist/vkeyboardhand.umd.js` 与 `dist/vkeyboardhand.esm.mjs` 均包含 `play()` 方法
- `npm test` 全部 5 项通过；`index.html` 不再因重复 / 无效容器 id 抛异常
- 无头 Chrome + CDP 实测 `kb.play('hello', { pressTime: 450, gap: 120 })`：h 按住阶段仅 `letter-bg-h` 高亮、`hand-h` 显示、指法标签“右手食指 按 H”；e 按住阶段 h 已复原、仅 `letter-bg-e` 高亮、`hand-e` 显示、指法标签“左手中指 按 E”；播放结束后全部键复原、双手自然状态恢复
- 修复后无头 Chrome + CDP 复测：h 按住阶段 `#hand-h` 显示、`#hand-neutral-right` 隐藏、`#hand-neutral-left` 保留；e 按住阶段 `#hand-e` 显示、`#hand-neutral-left` 隐藏、`#hand-neutral-right` 保留；播放结束双手自然状态恢复
- 无头 Chrome + CDP 实测 `play('ab', { loop: true })`：第一轮 a → b 依次高亮，随后第二轮 a 再次高亮（循环生效）；调用 `destroy()` 后返回的 Promise resolve（循环停止）

### 修改文件

| 作用描述 | 文件名 | 修复前 | 修复后 |
| --- | --- | --- | --- |
| 新增固定演示实例与代码用法 | `index.html` | 仅 `#vk-demo` 一个实例，无代码用法展示 | 新增 `#vk-demo-2`（关闭键盘监听 + 固定演示 Y + `showHandBoth: false`）及两个代码用法块 |
| 新增连续演示 API `play()` | `src/vkeyboardhand.js` | 仅 `press` / `release` / `reset` 单键状态 API | 新增 `play(keys, options?)` 打字序列播放（含方法头注释） |
| 演示页改用 `play()` 并修复遗留问题 | `index.html` | 手工测试遗留：重复 `#vk-demo-3` id、无效 `#vk-demo-4`、临时 `playKeys` 函数 | 实例 3 使用 `kb.play('hello', ...)`，移除重复卡片与临时函数 |
| API 文档补充 `play()` | `README.md` / `README_zh.md` | 实例方法列表与完整 API 概述无 `play` | 实例方法表格与完整 API 概述新增 `play(keys, options?)` |
| 构建产物同步 | `dist/vkeyboardhand.umd.js` / `dist/vkeyboardhand.esm.mjs` | 无 `play` 方法 | 同步包含 `play(keys, options?)` |
| 修复同侧自然状态与按键手势重叠 | `src/vkeyboardhand.js` | `showHandBoth: false` 时隐藏双手自然状态、仅显示按键手势 | 按手侧隐藏同侧自然状态、保留对侧自然状态，复原后恢复双手 |
| 演示页切换新语义并更新注释 | `index.html` | 实例 3 使用 `showHandBoth: true`（双手常显导致重叠） | 实例 3 改为 `showHandBoth: false`，实例 2 注释同步 |
| 文档同步语义 | `README.md` / `README_zh.md` | `showHandBoth: false` 描述为“按下左手键隐藏右手” | 明确为“同侧自然状态被按键手势替代、对侧保留” |
| 新增 bug 修复记录 | `fix.md` | 不存在 | 按规范记录问题描述、修复方法、验证结果与修改文件表格 |
| 统一工作流 Node 与 action 版本 | `.github/workflows/ci.yml` / `deploy-gh-pages.yml` / `release.yml` | `node-version: 20`（共 4 处）；`deploy-gh-pages.yml` 的 `setup-node@v5` | `node-version: 24`（共 4 处）；`setup-node@v6` 全部一致 |

## [1.0.2] - 2026-08-04

### 变更

- LICENSE 版权持有人与 `package.json` 的 `author` 统一为 `ayuday`
- 验证 npm 自动发布全流程（`NPM_TOKEN` 使用仓库级 Repository Secret）

## [1.0.1] - 2026-08-04

### 新增

- 配置项 `showHandBoth`：按键按下时可选择同时显示双手自然状态，并提供 `setShowHandBoth` 动态开关
- GitHub Actions 工作流：`ci.yml`（push/PR 构建测试）+ `release.yml`（`v*` tag 触发 npm 发布与 GitHub Release）+ `deploy-gh-pages.yml`（Pages 部署）
- 发布护栏：`prepublishOnly`（发布前自动构建+测试）与 `publishConfig.access = public`

### 变更

- 文档补充 npm 自动发布流程与 GitHub Pages 环境配置说明

## [1.0.0] - 2026-08-03

### 新增

- 交互式指法教学组件：SVG 键盘图 + SVG 手势图 + JavaScript 事件驱动联动
- 彩虹主题 `colorful` 并设为默认主题：按键按手指区域着色（左冷右暖形成彩虹渐变），配色约定见 `colorful.md`
- 手势图配色随主题联动（dark / robot / kingfish / milk / colorful）
- 键位 → 手指 → SVG id 三层映射表（可自定义覆盖），指法提示条、手指配色、多套主题
- 三种引入方式：本地引入 / CDN（jsDelivr、unpkg）/ npm + ESM，兼容 Vue / React / Angular
- 完整 API：`press / release / reset / setTheme / setClickEnabled / getState / getFinger / destroy` 及事件回调
- 控制台横幅：初始化时输出版本与仓库信息（可用 `showBanner: false` 关闭）

### 修复

- hand.svg 内嵌样式泄漏导致键盘键帽 `display:none` 的问题（SVG 内嵌样式作用域化）
- 组合键手势按标准指法显示（左手键配右手 Shift，右手键配左手 Shift）
- 骨白主题样式与 keyboard+hand.html 渲染保持一致（键帽描边、字母可见性、手势层定位）

### 变更

- SVG 素材移入 `svg/` 目录，组件默认路径与文档同步更新
- 开源仓库：https://github.com/ayuday/vkeyboardhand

[1.0.2]: https://github.com/ayuday/vkeyboardhand/releases/tag/v1.0.2
[1.0.1]: https://github.com/ayuday/vkeyboardhand/releases/tag/v1.0.1
[1.0.0]: https://github.com/ayuday/vkeyboardhand/releases/tag/v1.0.0
