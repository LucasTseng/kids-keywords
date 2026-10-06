/**
 * main.cjs —— Electron 桌面版主进程
 * ---------------------------------------------------------------------------
 * 纯静态站点无法直接跑在 file:// 下（ES Module 与 fetch 会被同源策略拦截），
 * 因此注册 app:// 自定义协议，把打包在应用内的静态文件以「标准、安全、
 * 支持 fetch / 流式读取」的源提供给渲染进程，使 ES Module、WASM（sql.js）、
 * fetch 题库文件等能力全部按浏览器原样工作。
 */
const { app, BrowserWindow, Menu, protocol } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

/** 静态站点根目录（electron/ 的上一级；打包后位于 app.asar 根） */
const ROOT = path.join(__dirname, '..');

// 必须在 app ready 之前注册，自定义协议才会被视为安全标准源
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      corsEnabled: true,
    },
  },
]);

/** 静态文件扩展名到 MIME 类型的映射（未命中时按二进制返回） */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.cjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
  '.sqlite': 'application/octet-stream',
};

/**
 * 注册 app:// 协议：app://app/<相对路径> → 应用目录内文件。
 * 带路径穿越校验，越界请求一律 403。
 */
function registerAppProtocol() {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/' || pathname === '') pathname = '/index.html';

    const filePath = path.normalize(path.join(ROOT, pathname));
    const insideRoot = filePath === ROOT || filePath.startsWith(ROOT + path.sep);
    if (!insideRoot) return new Response('Forbidden', { status: 403 });

    try {
      const body = await fs.readFile(filePath);
      return new Response(body, {
        status: 200,
        headers: {
          'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
        },
      });
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  });
}

/** 创建主窗口并加载首页 */
function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 800,
    minWidth: 860,
    minHeight: 600,
    title: '打字 · 背默练习',
    backgroundColor: '#f1f5f9',
    icon: path.join(ROOT, 'icons', 'icon-512.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL('app://app/index.html');
}

/** 配置中文应用菜单（保留刷新 / 缩放 / 复制粘贴等常用能力） */
function setupMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [{ role: 'appMenu' }]
      : [{
          label: '文件',
          submenu: [{ role: 'quit', label: '退出' }],
        }]),
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'zoom', label: '缩放' },
        { role: 'close', label: '关闭窗口' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  registerAppProtocol();
  setupMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
