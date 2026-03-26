import { Updater } from 'electrobun';

const DEV_SERVER_PORT = 5173;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}/src/mainview/`;

export async function getMainViewUrl(): Promise<string> {
  const channel = await Updater.localInfo.channel();

  if (channel === 'dev') {
    try {
      await fetch(DEV_SERVER_URL, { method: 'HEAD' });
      console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
      return DEV_SERVER_URL;
    }
    catch {
      console.log('Vite dev server not running. Run \'bun run dev:hmr\' for HMR support.');
    }
  }

  return 'views://mainview/index.html';
}
