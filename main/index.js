const { app, BrowserWindow, dialog, shell } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const net = require('node:net');
const { initializeStorage, selectDataDirectory } = require('./storage.cjs');

app.setName('Paper Manager');

let mainWindow;
let serverProcess;
let serverUrl;
let quitting = false;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function availablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (serverProcess && serverProcess.exitCode !== null) throw new Error('アプリサーバーが終了しました');
    try {
      const response = await fetch(`${url}/api/papers`, { signal: AbortSignal.timeout(1000) });
      if (response.ok && Array.isArray(await response.json())) return;
    } catch { /* Wait for Next.js and the database, not just an open port. */ }
    await delay(500);
  }
  throw new Error('アプリサーバーの起動確認がタイムアウトしました');
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const target = new URL(url);
    if (target.origin === serverUrl && target.pathname.startsWith('/uploads/pdfs/')) {
      // Keep local PDF viewing in a sandboxed Electron window.
      return { action: 'allow', overrideBrowserWindowOptions: {
        webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
      } };
    }
    if (['https:', 'http:'].includes(target.protocol)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== serverUrl) event.preventDefault();
  });
  await mainWindow.loadURL(serverUrl);
  mainWindow.on('closed', () => { mainWindow = null; });
}

async function start() {
  if (!app.isPackaged) {
    serverUrl = 'http://127.0.0.1:3000';
  } else {
    const storage = initializeStorage(selectDataDirectory(app.getPath('appData')), path.join(process.resourcesPath, 'prisma'));
    app.setPath('userData', storage.dataDir);
    const serverDir = path.join(process.resourcesPath, 'standalone');
    const port = await availablePort();
    serverUrl = `http://127.0.0.1:${port}`;
    // Use Electron's embedded Node; end users do not need a system Node install.
    serverProcess = spawn(process.execPath, [path.join(serverDir, 'server.js')], {
      cwd: serverDir,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'production',
        PORT: String(port), HOSTNAME: '127.0.0.1',
        DATABASE_URL: storage.databaseUrl, PAPER_MANAGER_DATA_DIR: storage.dataDir },
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
    serverProcess.stdout.on('data', (data) => console.log(String(data)));
    serverProcess.stderr.on('data', (data) => console.error(String(data)));
    serverProcess.on('error', (error) => {
      dialog.showErrorBox('起動エラー', error.message); app.quit();
    });
    serverProcess.on('exit', () => {
      if (!quitting) { dialog.showErrorBox('サーバーエラー', 'アプリサーバーが終了しました。再起動してください。'); app.quit(); }
    });
  }
  await waitForServer(serverUrl);
  await createWindow();
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (mainWindow) { mainWindow.restore(); mainWindow.focus(); } });
  app.whenReady().then(start).catch((error) => {
    dialog.showErrorBox('Paper Manager を起動できません', error.message); app.quit();
  });
  app.on('activate', () => { if (!mainWindow && serverUrl) void createWindow(); });
}
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { quitting = true; if (serverProcess) serverProcess.kill(); });
