import { useToast } from '@nuxt/ui/composables';
import { isTauri } from '@tauri-apps/api/core';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { openUrl } from '@tauri-apps/plugin-opener';

export function useActions() {
  const toast = useToast();

  async function copy(text: string, label = 'Value') {
    try {
      if (isTauri())
        await writeText(text);
      else
        await navigator.clipboard.writeText(text);
      toast.add({ title: `${label} copied`, description: text, icon: 'i-lucide-clipboard-check', color: 'success', duration: 1800 });
    }
    catch (e) {
      toast.add({ title: 'Copy failed', description: String(e), icon: 'i-lucide-circle-alert', color: 'error' });
    }
  }

  async function open(url: string) {
    try {
      if (isTauri())
        await openUrl(url);
      else
        window.open(url, '_blank', 'noopener');
    }
    catch (e) {
      toast.add({ title: 'Could not open link', description: String(e), icon: 'i-lucide-circle-alert', color: 'error' });
    }
  }

  return { copy, open };
}
