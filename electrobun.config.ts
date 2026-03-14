import type { ElectrobunConfig } from 'electrobun';

export default {
  app: {
    name: 'mDNS Viewer',
    identifier: 'dev.guillaumechx.mdns-viewer',
    version: process.env.npm_package_version || '0.0.0',
  },
  build: {
    // Vite builds to dist/, we copy from there
    copy: {
      'dist/src/mainview/index.html': 'views/mainview/index.html',
      'dist/assets': 'views/mainview/assets',
    },
    // Ignore Vite output in watch mode — HMR handles view rebuilds separately
    // @ts-expect-error
    watchIgnore: ['dist/**'],
    mac: {
      bundleCEF: false,
      icons: 'resources/icons/icon.iconset',
    },
    linux: {
      bundleCEF: false,
      icon: 'resources/icons/linux.png',
    },
    win: {
      bundleCEF: false,
    },
  },
} satisfies ElectrobunConfig;
