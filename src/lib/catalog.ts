import type { ServiceRecord } from './types';

export type CategoryId = 'web' | 'media' | 'control' | 'printing' | 'files' | 'remote' | 'home' | 'apple' | 'system' | 'other';

export interface Category {
  id: CategoryId;
  label: string;
  icon: string;
  tile: string;
  dot: string;
}

export const categories: Record<CategoryId, Category> = {
  web: { id: 'web', label: 'Web', icon: 'i-lucide-globe', tile: 'bg-sky-500/12 text-sky-600 dark:text-sky-300 ring-sky-500/25', dot: 'bg-sky-500' },
  media: { id: 'media', label: 'Media & casting', icon: 'i-lucide-cast', tile: 'bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-300 ring-fuchsia-500/25', dot: 'bg-fuchsia-500' },
  control: { id: 'control', label: 'Audio & control', icon: 'i-lucide-audio-lines', tile: 'bg-cyan-500/12 text-cyan-600 dark:text-cyan-300 ring-cyan-500/25', dot: 'bg-cyan-500' },
  printing: { id: 'printing', label: 'Printers & scanners', icon: 'i-lucide-printer', tile: 'bg-amber-500/12 text-amber-600 dark:text-amber-300 ring-amber-500/25', dot: 'bg-amber-500' },
  files: { id: 'files', label: 'File sharing', icon: 'i-lucide-folder-tree', tile: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-300 ring-emerald-500/25', dot: 'bg-emerald-500' },
  remote: { id: 'remote', label: 'Remote access', icon: 'i-lucide-terminal', tile: 'bg-violet-500/12 text-violet-600 dark:text-violet-300 ring-violet-500/25', dot: 'bg-violet-500' },
  home: { id: 'home', label: 'Smart home', icon: 'i-lucide-house-wifi', tile: 'bg-orange-500/12 text-orange-600 dark:text-orange-300 ring-orange-500/25', dot: 'bg-orange-500' },
  apple: { id: 'apple', label: 'Apple ecosystem', icon: 'i-lucide-laptop', tile: 'bg-slate-500/12 text-slate-600 dark:text-slate-300 ring-slate-500/25', dot: 'bg-slate-500' },
  system: { id: 'system', label: 'System & network', icon: 'i-lucide-network', tile: 'bg-teal-500/12 text-teal-600 dark:text-teal-300 ring-teal-500/25', dot: 'bg-teal-500' },
  other: { id: 'other', label: 'Other', icon: 'i-lucide-radio-tower', tile: 'bg-zinc-500/12 text-zinc-600 dark:text-zinc-300 ring-zinc-500/25', dot: 'bg-zinc-400' },
};

interface KnownType {
  label: string;
  category: CategoryId;
  icon?: string;
  scheme?: string;
}

const knownTypes: Record<string, KnownType> = {
  'http': { label: 'Web server', category: 'web', scheme: 'http' },
  'https': { label: 'Secure web server', category: 'web', icon: 'i-lucide-lock-keyhole', scheme: 'https' },
  'http-alt': { label: 'Web server (alt)', category: 'web', scheme: 'http' },
  'webdav': { label: 'WebDAV', category: 'files', scheme: 'http' },
  'webdavs': { label: 'WebDAV (secure)', category: 'files', scheme: 'https' },
  'fbx-api': { label: 'Freebox API', category: 'system', icon: 'i-lucide-router' },
  'glances': { label: 'Glances', category: 'system', icon: 'i-lucide-activity', scheme: 'http' },

  'airplay': { label: 'AirPlay', category: 'media', icon: 'i-lucide-airplay' },
  'raop': { label: 'AirPlay audio', category: 'media', icon: 'i-lucide-speaker' },
  'googlecast': { label: 'Chromecast', category: 'media', icon: 'i-lucide-cast' },
  'spotify-connect': { label: 'Spotify Connect', category: 'media', icon: 'i-lucide-music' },
  'daap': { label: 'iTunes sharing', category: 'media', icon: 'i-lucide-library' },
  'dacp': { label: 'Remote audio control', category: 'media', icon: 'i-lucide-sliders-horizontal' },
  'sonos': { label: 'Sonos', category: 'media', icon: 'i-lucide-speaker' },
  'mediaremotetv': { label: 'Apple TV remote', category: 'media', icon: 'i-lucide-tv' },
  'touch-able': { label: 'Apple TV remote', category: 'media', icon: 'i-lucide-tv' },
  'plexmediasvr': { label: 'Plex', category: 'media', icon: 'i-lucide-clapperboard' },
  'amzn-wplay': { label: 'Amazon Fire TV', category: 'media', icon: 'i-lucide-tv' },

  'osc': { label: 'Open Sound Control', category: 'control', icon: 'i-lucide-audio-lines' },
  'oscjson': { label: 'OSC Query', category: 'control', icon: 'i-lucide-audio-lines', scheme: 'http' },

  'ipp': { label: 'Printer (IPP)', category: 'printing', icon: 'i-lucide-printer', scheme: 'http' },
  'ipps': { label: 'Printer (IPPS)', category: 'printing', icon: 'i-lucide-printer', scheme: 'https' },
  'printer': { label: 'Printer (LPD)', category: 'printing', icon: 'i-lucide-printer' },
  'pdl-datastream': { label: 'Printer (raw)', category: 'printing', icon: 'i-lucide-printer' },
  'scanner': { label: 'Scanner', category: 'printing', icon: 'i-lucide-scan-line' },
  'uscan': { label: 'Scanner (eSCL)', category: 'printing', icon: 'i-lucide-scan-line' },
  'uscans': { label: 'Scanner (eSCL, secure)', category: 'printing', icon: 'i-lucide-scan-line' },
  'privet': { label: 'Cloud print', category: 'printing', icon: 'i-lucide-printer' },

  'smb': { label: 'SMB file share', category: 'files', icon: 'i-lucide-hard-drive', scheme: 'smb' },
  'afpovertcp': { label: 'AFP file share', category: 'files', icon: 'i-lucide-hard-drive', scheme: 'afp' },
  'nfs': { label: 'NFS export', category: 'files', icon: 'i-lucide-hard-drive', scheme: 'nfs' },
  'ftp': { label: 'FTP', category: 'files', icon: 'i-lucide-folder-up', scheme: 'ftp' },
  'adisk': { label: 'Time Machine', category: 'files', icon: 'i-lucide-history' },

  'ssh': { label: 'SSH', category: 'remote', icon: 'i-lucide-square-terminal', scheme: 'ssh' },
  'sftp-ssh': { label: 'SFTP', category: 'remote', icon: 'i-lucide-folder-lock', scheme: 'sftp' },
  'rfb': { label: 'Screen sharing (VNC)', category: 'remote', icon: 'i-lucide-monitor-up', scheme: 'vnc' },
  'rdlink': { label: 'Remote desktop', category: 'remote', icon: 'i-lucide-monitor-smartphone' },
  'teamviewer': { label: 'TeamViewer', category: 'remote', icon: 'i-lucide-monitor-smartphone' },

  'hap': { label: 'HomeKit accessory', category: 'home', icon: 'i-lucide-house-plug' },
  'homekit': { label: 'HomeKit', category: 'home', icon: 'i-lucide-house' },
  'matter': { label: 'Matter node', category: 'home', icon: 'i-lucide-hexagon' },
  'matterc': { label: 'Matter commissioning', category: 'home', icon: 'i-lucide-hexagon' },
  'matterd': { label: 'Matter commissioner', category: 'home', icon: 'i-lucide-hexagon' },
  'home-assistant': { label: 'Home Assistant', category: 'home', icon: 'i-lucide-house-wifi', scheme: 'http' },
  'esphomelib': { label: 'ESPHome', category: 'home', icon: 'i-lucide-cpu' },
  'hue': { label: 'Philips Hue', category: 'home', icon: 'i-lucide-lightbulb' },
  'mqtt': { label: 'MQTT broker', category: 'home', icon: 'i-lucide-messages-square' },
  'meshcop': { label: 'Thread border router', category: 'home', icon: 'i-lucide-waypoints' },
  'trel': { label: 'Thread radio link', category: 'home', icon: 'i-lucide-waypoints' },
  'elg': { label: 'Elgato light', category: 'home', icon: 'i-lucide-lamp' },
  'shelly': { label: 'Shelly', category: 'home', icon: 'i-lucide-toggle-right', scheme: 'http' },

  'companion-link': { label: 'Apple Companion Link', category: 'apple', icon: 'i-lucide-link' },
  'sleep-proxy': { label: 'Bonjour Sleep Proxy', category: 'apple', icon: 'i-lucide-moon' },
  'remotepairing': { label: 'Remote pairing', category: 'apple', icon: 'i-lucide-smartphone' },
  'airdrop': { label: 'AirDrop', category: 'apple', icon: 'i-lucide-send' },
  'apple-midi': { label: 'Network MIDI', category: 'apple', icon: 'i-lucide-piano' },
  'apple-mobdev2': { label: 'Apple device services', category: 'apple', icon: 'i-lucide-smartphone' },
  'asquic': { label: 'Apple QUIC service', category: 'apple', icon: 'i-lucide-network' },

  'device-info': { label: 'Device info', category: 'system', icon: 'i-lucide-info' },
  'workstation': { label: 'Workstation', category: 'system', icon: 'i-lucide-computer' },
  'services': { label: 'Service registry', category: 'system', icon: 'i-lucide-list-tree' },
  'dns-sd': { label: 'DNS-SD', category: 'system', icon: 'i-lucide-list-tree' },
  'srpl-tls': { label: 'SRP replication', category: 'system', icon: 'i-lucide-network' },
  'ntp': { label: 'Time server', category: 'system', icon: 'i-lucide-clock' },
  'syncthing': { label: 'Syncthing', category: 'files', icon: 'i-lucide-refresh-cw' },
};

export interface TypeInfo {
  type: string;
  label: string;
  icon: string;
  category: Category;
  scheme?: string;
}

export function describeType(type: string): TypeInfo {
  const known = knownTypes[type.toLowerCase()];
  const category = categories[known?.category ?? 'other'];
  return {
    type,
    label: known?.label ?? prettify(type),
    icon: known?.icon ?? category.icon,
    category,
    scheme: known?.scheme,
  };
}

function prettify(type: string) {
  return type
    .split(/[-_]/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function hostForUrl(host: string) {
  return host.includes(':') ? `[${host}]` : host;
}

function txtValue(service: ServiceRecord, key: string) {
  return service.txt.find(entry => entry.key.toLowerCase() === key)?.value ?? undefined;
}

export function serviceUrl(service: ServiceRecord, host = service.host): string | undefined {
  const { scheme } = describeType(service.type);
  if (!scheme || !host)
    return undefined;

  const target = hostForUrl(host);

  switch (scheme) {
    case 'http':
    case 'https': {
      const defaultPort = scheme === 'http' ? 80 : 443;
      const port = service.port === defaultPort ? '' : `:${service.port}`;
      const rawPath = txtValue(service, 'path') ?? txtValue(service, 'adminurl') ?? '/';
      if (/^https?:\/\//.test(rawPath))
        return rawPath;
      const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
      return `${scheme}://${target}${port}${path}`;
    }
    case 'ssh':
      return `ssh://${target}:${service.port}`;
    case 'sftp':
      return `sftp://${target}:${service.port}`;
    case 'vnc':
      return `vnc://${target}:${service.port}`;
    default:
      return `${scheme}://${target}`;
  }
}

export function isBrowserUrl(url: string | undefined) {
  return !!url && /^https?:\/\//.test(url);
}

export function sshCommand(service: ServiceRecord): string | undefined {
  if (service.type !== 'ssh' && service.type !== 'sftp-ssh')
    return undefined;
  const cmd = service.type === 'ssh' ? 'ssh' : 'sftp';
  const flag = service.type === 'ssh' ? '-p' : '-P';
  return service.port === 22 ? `${cmd} ${service.host}` : `${cmd} ${flag} ${service.port} ${service.host}`;
}
