<p align="center">
  <img src="/resources/icons/logo.svg" width="128" alt="mDNS Viewer Logo"></img>
</p>

<p align="center">
  A desktop app for discovering and inspecting mDNS / DNS-SD (Bonjour, Zeroconf) services on your local network.
</p>

## Features

- **Live discovery**: service types come from the DNS-SD meta query (`_services._dns-sd._udp`), plus a built-in list of common types for devices that don't answer it
- **Online / offline tracking**: TTL expiry and goodbye packets mark services offline instead of silently dropping them
- **Group by device or by service type**, in a grid or a dense list view
- **Full-text search** across names, hosts, IP addresses, ports and TXT records
- **Inspector panel**: addresses (IPv4/IPv6, interface, link-local), decoded TXT records, activity timestamps and the other services on the same device
- **Quick actions**: open web UIs (by hostname or IP), copy URLs, `ssh`/`sftp` commands and TXT records as JSON
- Light and dark themes, keyboard shortcuts (`⌘K` search, `⌘R` rescan, `⌘1`/`⌘2` switch views, `Esc` close/clear)

## Getting started

Prerequisites: [Bun](https://bun.sh), Rust ≥ 1.90, and the [Tauri system dependencies](https://tauri.app/start/prerequisites/) for your OS.

```bash
bun install

# Run the desktop app with hot reload
bun app:dev

# Build installers for the current platform
bun app:build
```

`bun dev` runs only the frontend in a browser, using mock data, which is handy for UI work.

## Tech stack

- [Tauri 2](https://tauri.app) desktop shell
- Rust discovery engine built on [`mdns-sd`](https://crates.io/crates/mdns-sd)
- Vue 3, [Nuxt UI 4](https://ui.nuxt.com) and Tailwind CSS 4, built with Vite

## License

[![https://img.shields.io/github/license/ChxGuillaume/mDNS-Viewer?color=green&label=License](https://img.shields.io/github/license/ChxGuillaume/mDNS-Viewer?color=green&label=License)](https://www.tldrlegal.com/license/gnu-general-public-license-v3-gpl-3)

[GPL-3.0 License](LICENSE)
