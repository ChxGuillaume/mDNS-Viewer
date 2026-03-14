<p align="center">
  <img src="/resources/icons/icon.iconset/icon-128.png" width="128" alt="mDNS Viewer Logo"></img>
</p>

<p align="center">
  A network visualization tool for discovering and monitoring mDNS (Multicast DNS) services on your local network.
</p>

## Overview

mDNS Viewer provides a real-time, visual interface for exploring mDNS services broadcasting on your network. Discover printers, smart home devices, media servers, and other network services using Bonjour/Zeroconf protocols.

## Features

- 🔍 **Real-time Discovery** - Automatically detect mDNS services as they appear on your network
- 📊 **Visual Interface** - Clean, intuitive UI for browsing discovered services
- 🔄 **Live Updates** - Monitor services as they come online and offline
- 📱 **Service Details** - View comprehensive information about each discovered service

## What is mDNS?

mDNS (Multicast DNS) is a protocol that allows devices to advertise and discover services on a local network without requiring a centralized DNS server. It's commonly used by:

- Printers and scanners
- Smart home devices (lights, thermostats, cameras)
- Media streaming devices (Apple TV, Chromecast, AirPlay)
- Network-attached storage (NAS)
- Development servers and APIs

## Getting Started

```bash
# Install dependencies
bun install

# Run the application
bun start

# Development mode
bun dev:hmr
```

## Tech Stack

Built with modern web technologies for optimal performance and developer experience.

## License
[![https://img.shields.io/github/license/ChxGuillaume/mDNS-Viewer?color=green&label=License](https://img.shields.io/github/license/ChxGuillaume/mDNS-Viewer?color=green&label=License)](https://www.tldrlegal.com/license/gnu-general-public-license-v3-gpl-3)

[GPL-3.0 License](LICENSE)
