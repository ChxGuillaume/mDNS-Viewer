import type { MyWebviewRPCType } from '../shared/types';
import { Bonjour } from 'bonjour-service';
import { ApplicationMenu, BrowserView, BrowserWindow, Updater } from 'electrobun/bun';

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

ApplicationMenu.setApplicationMenu([
  {
    submenu: [{ role: 'quit', accelerator: 'q' }],
  },
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'pasteAndMatchStyle' },
      { role: 'delete' },
      { role: 'selectAll' },
    ],
  },
]);

async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel();
  if (channel === 'dev') {
    try {
      await fetch(DEV_SERVER_URL, { method: 'HEAD' });
      console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
      return DEV_SERVER_URL;
    }
    catch {
      console.log(
        'Vite dev server not running. Run \'bun run dev:hmr\' for HMR support.',
      );
    }
  }
  return 'views://mainview/index.html';
}

const url = await getMainViewUrl();

const myWebviewRPC = BrowserView.defineRPC<MyWebviewRPCType>({
  maxRequestTime: 5000,
  handlers: {},
});

const mainWindow = new BrowserWindow({
  title: 'mDNS Viewer',
  url,
  frame: {
    width: 900,
    height: 700,
    x: 200,
    y: 200,
  },
  rpc: myWebviewRPC,
});

mainWindow.on('close', () => {
  console.log('close');
  process.exit(0);
});

const instance = new Bonjour();

mainWindow.webview.openDevTools();

mainWindow.on('dom-ready', () => {
  instance.find(null, async (service) => {
    void mainWindow.webview.rpc?.send('service', { service });
  });
});

console.log('Vue app started!');
