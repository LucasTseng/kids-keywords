# ⌨️ kids-keywords · 小朋友英语词汇打字背默

面向小朋友（沪教版上海小学 1–3 年级）的英语词汇与句型学习应用：**看英文打字、看中文背默**，实时指法联动，全程离线可用、无需登录、无需后端。

<p align="center">
  <img src="./assets/vkeyboardhand.gif" alt="指法联动演示" />
</p>

[English](README.md) | [简体中文](README_zh.md)

## 功能特性

- 📖 **打字练习**：看英文打英文，逐字符校验——正确变绿并前进、错误标红且不前进，全对自动跳下一题，训练十指指法与拼写熟练度
- ✍️ **背默练习**：只看中文，英文用等长下划线占位提示字符数（含空格与标点），逐字符输入，进入即计时、提交即停表，逐题评分
- 🖐 **实时指法联动**：基于开源组件 vkeyboardhand，按下真实键盘时对应键位高亮、手势图同步切换，实时提示「哪个手指按哪个键」
- 📊 **成绩与历史**：背默提交后展示错题对照（正确原文与用户输入上下对齐、差异字符标红）、百分比得分与用时；历史成绩页按时间倒序回看、支持清空
- 📂 **题库维护**：Excel 批量导入 / 导出（下载模板、上传全量替换），不写代码也能增删改题库
- 🎯 **动态筛选**：年级 / 单元 / 自定义字段（如词性、主题）多维度过滤出题，筛选器由题库实际字段自动生成
- 📱 **离线 PWA**：安装到主屏幕即可像原生 App 使用（Android / iPad 平板），完全离线可用
- 💻 **桌面版**：Windows 安装包 / 便携版，macOS（GitHub Actions 构建 DMG）
- 🔒 **数据本地化**：题库与成绩落在浏览器本地（sql.js + IndexedDB），无账号、无后端、免登录

## 页面与用法

| 页面 | 说明 |
| --- | --- |
| 首页 `index.html` | 选择年级（多选）、学习方式（打字 / 背默）、背默挑战数量（20 / 30 / 50），可按单元及动态字段（词性、主题等）筛选，并有「历史成绩」「数据维护」入口 |
| 练习页 `practice.html` | 打字 / 背默两种模式；顶部返回、底部虚拟键盘（实时指法联动）、左右按钮与键盘方向键切换题目 |
| 结果页（练习页内） | 背默提交后展示百分比得分、用时与错题逐字符对照 |
| 历史成绩 `history.html` | 按时间倒序回看成绩（用户名、模式、年级、题量、得分、用时、时间），支持清空 |
| 数据维护 `data.html` | 下载 Excel 模板、导出当前题库、导入 Excel 全量替换题库（含统计与预览） |
| 帮助页 `help.html` | vkeyboardhand 组件演示与用法说明 |

## 技术栈

- **vkeyboardhand**（MIT License）：虚拟键盘 + 手势联动的指法可视化组件，练习页复用它做按键高亮与指法提示
- **sql.js + IndexedDB**：在浏览器内运行 SQLite，题库与成绩本地持久化、跨会话保留
- **SheetJS (xlsx)**：Excel 模板下载、题库导入导出
- **Service Worker**：PWA 离线缓存，安装后断网可用
- **Electron**：Windows / macOS 桌面封装（自定义 `app://` 协议加载静态站点）

## 本地开发

```bash
pnpm install      # 安装依赖
pnpm build        # 构建题库 + sql.js 运行时（生成 data/vocabulary.sqlite 与 vendor/）
pnpm icons        # 由 SVG 源图生成应用图标
pnpm preview      # 本地预览 http://localhost:8011
pnpm app          # 以 Electron 桌面方式运行
pnpm app:win      # 打包 Windows（NSIS 安装包 + 便携版）
pnpm app:mac      # 打包 macOS（需在 mac 上执行）
```

> 本地预览端口固定为 **8011**；本项目为纯前端项目，无后端端口。

## 跨平台安装

| 平台 | 方式 |
| --- | --- |
| Windows | `release/` 下的安装包 / 便携版 exe |
| macOS | GitHub Actions 在 mac 云端构建 DMG |
| Android 平板 | Chrome / Edge 访问部署地址 → 「添加到主屏幕」 |
| iPad | Safari 访问部署地址 → 「分享」→「添加到主屏幕」 |

详见 [docs/INSTALL.md](./docs/INSTALL.md)。

## 目录结构

```text
├── app/                      # 应用脚本与样式
│   ├── home.js / practice.js # 首页 / 练习页逻辑
│   ├── typing.js / dictation.js # 打字 / 背默两个练习引擎
│   ├── db.js / store.js      # sql.js 封装 + IndexedDB 持久化
│   ├── data-maintain.js / xlsx-io.js # 数据维护页 + Excel 导入导出
│   └── pwa.js                # 注册 Service Worker（离线缓存）
├── src/ + dist/              # vkeyboardhand 指法组件源码与构建产物
├── svg/                      # 键盘 / 手势矢量素材
├── electron/main.cjs         # Electron 桌面主进程（app:// 协议）
├── scripts/                  # 构建组件、构建题库、生成图标
├── docs/                     # PRD / SDD / INSTALL（跨平台安装手册）
├── icons/                    # PWA / iOS / Electron 应用图标
├── index.html / practice.html / help.html / history.html / data.html
├── manifest.webmanifest      # PWA 应用清单
├── sw.js                     # Service Worker 离线缓存
└── package.json
```

## 鸣谢

- [vkeyboardhand](https://github.com/ayuday/vkeyboardhand)（MIT License）：交互式虚拟键盘指法教学组件，本项目集成用于练习页的键盘与手势联动展示
- [SVG 键盘图](https://commons.wikimedia.org/wiki/File:Keyboard_US.svg)（Wikimedia Commons，CC BY-SA 4.0）

## License

[MIT](./LICENSE)