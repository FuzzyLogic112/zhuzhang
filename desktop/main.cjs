const { app, BrowserWindow, protocol, session, Menu, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');

app.setName('筑账');
protocol.registerSchemesAsPrivileged([{ scheme: 'zhuzhang', privileges: { standard: true, secure: true, supportFetchAPI: true } }]);
if (!app.requestSingleInstanceLock()) app.quit();
let mainWindow;
app.on('second-instance', () => { if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); } });

function openWindow() {
  mainWindow = new BrowserWindow({ width: 1320, height: 900, minWidth: 390, minHeight: 640,
    title: '筑账', backgroundColor: '#f5f7f8', icon: path.join(__dirname, 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, devTools: !app.isPackaged } });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => { if (url !== 'zhuzhang://app/index.html') event.preventDefault(); });
  mainWindow.webContents.on('will-attach-webview', event => event.preventDefault());
  mainWindow.loadURL('zhuzhang://app/index.html');
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  protocol.handle('zhuzhang', async request => {
    const url = new URL(request.url);
    if(url.host!=='app'||!(url.pathname==='/index.html'||url.pathname.startsWith('/pdf/')))return new Response('Not found',{status:404});
    const root=path.join(__dirname,'web'),file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(!file.startsWith(root+path.sep))return new Response('Not found',{status:404});
    const mime=file.endsWith('.mjs')?'text/javascript':file.endsWith('.wasm')?'application/wasm':file.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream';
    try{return new Response(await fs.readFile(file),{headers:{'content-type':mime}})}catch{return new Response('Not found',{status:404})}
  });
  session.defaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  session.defaultSession.setPermissionCheckHandler(() => false);
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !/^(zhuzhang:|blob:|data:)/.test(details.url) }));
  session.defaultSession.on('will-download', (_event, item) => {
    item.setSaveDialogOptions({ title: '保存筑账文件', defaultPath: path.join(app.getPath('downloads'), path.basename(item.getFilename())) });
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ label: '筑账', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] }] : []),
    { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: '显示', submenu: [{ role: 'reload' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] }
  ]));
  ipcMain.handle('invoice:recognize',async(event,bytes)=>{
    if(event.senderFrame?.url!=='zhuzhang://app/index.html')throw Error('来源无效');
    return require('./recognize.cjs').recognize(bytes,app.isPackaged?path.join(process.resourcesPath,'ocr'):path.join(__dirname,'ocr'));
  });
  openWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) openWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
