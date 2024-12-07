# 🛰️ NTRIP Mount Point Finder

A web-based tool to find the nearest NTRIP mount point in the ASG-EUPOS network based on your current location.

## 🔗 Live Demo

Try it now: [NTRIP Mount Point Finder](https://danielmroczek.github.io/ntrip-nearest/)

## 🎯 Features

- 📍 Automatic geolocation detection with fallback to GeoIP
- 🗺️ Finds the closest RTCM 3.2 mount point from the ASG-EUPOS network
- 📋 One-click copy for mount point names
- 📊 Table view of all available mount points sorted by distance
- 🔍 Distance calculation for each mount point
- 🌓 Dark/Light theme support
- 📱 Responsive design
- 🔄 Retry functionality for failed location attempts
- 📍 Location method indicator (GPS/GeoIP)

## 🛠️ Tech Stack

- Pure JavaScript
- HTML5 Geolocation API
- CSS3 with CSS Variables
- Node.js for data conversion

## 🚀 Getting Started

1. Clone the repository
2. *(Optional)* Run the update script: `node util/getMounts.js`
3. Open `index.html` in your browser
4. Allow location access when prompted

## 📝 Note

This tool works with the Polish ASG-EUPOS NTRIP Caster network. Mount point data is stored locally in JSON format.

The script can be easily modified to work with different Caster networks.

## 📄 License

MIT License
