import { isTauri } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

const CLASS_NAME = 'titlebar-inset';

// The window uses an overlay title bar on macOS, so the native traffic lights sit on top
// of the sidebar; they disappear in fullscreen, where the reserved space isn't needed.
export async function useTitlebarInset() {
  if (!isTauri() || !/Mac/.test(navigator.userAgent))
    return;

  const root = document.documentElement;
  const appWindow = getCurrentWindow();
  const sync = async () => root.classList.toggle(CLASS_NAME, !(await appWindow.isFullscreen()));

  await sync();
  await appWindow.onResized(() => void sync());
}
