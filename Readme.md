# 🛰️ NTRIP Mount Point Finder

A web-based tool to find the nearest NTRIP mount point based on your current location, supporting multiple NTRIP networks.

## 🔗 Live Demo

Try it now: [NTRIP Mount Point Finder](https://danielmroczek.github.io/nearest-mountpoint/)

## 🎯 Features

- 📍 Automatic geolocation detection with fallback to GeoIP
- 🌐 Support for multiple NTRIP networks:
  - ASG-EUPOS (Poland)
  - RTK2Go (Global)
  - Easily extendable to other networks
- 🗺️ Finds the closest RTCM 3.2 mount point from selected network
- 📋 One-click copy for mount point names
- 📊 Table view of all available mount points sorted by distance
- 🔍 Distance calculation for each mount point
- 🌍 Automatic language selection based on location
- 🌓 Dark/Light theme support
- 📱 Responsive design
- 🔄 Retry functionality for failed location attempts
- 📍 Location method indicator (GPS/GeoIP)

## 🛠️ Tech Stack

- Pure JavaScript
- HTML5 Geolocation API
- CSS3 with CSS Variables
- Modular code structure with separate components
- Multi-language support with automatic region detection

## 🚀 Getting Started

1. Clone the repository
2. Run `make install` to update mount point data
3. Open `index.html` in your browser
4. Allow location access when prompted
5. Select your preferred NTRIP network from the dropdown menu

## 🛠️ Development Requirements

- Node.js
- Make
- No additional npm dependencies required

## 📝 Note

This tool works with multiple NTRIP Caster networks including Polish ASG-EUPOS and global RTK2Go. Mount point data is stored locally in JSON format.

The application can be easily extended to work with different Caster networks by adding a new network configuration and corresponding mount point data file.

## 📄 License

MIT License
