import type { MyWebviewRPCType } from '../shared/types';
import { Bonjour } from 'bonjour-service';
import { ApplicationMenu, BrowserView, BrowserWindow } from 'electrobun/bun';
import { getMainViewUrl } from './getMainViewUrl';

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

const myWebviewRPC = BrowserView.defineRPC<MyWebviewRPCType>({
  maxRequestTime: 5000,
  handlers: {},
});

const mainWindow = new BrowserWindow({
  title: 'mDNS Viewer',
  url: await getMainViewUrl(),
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
