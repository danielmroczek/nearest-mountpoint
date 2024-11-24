document.addEventListener('DOMContentLoaded', () => {
  console.log('Script initialized');

  const mountPointDetails = document.getElementById('mount-point-details');
  const retryButton = document.querySelector('.retry-button');
  
  if (!mountPointDetails) {
    console.error('Mount point details element not found');
    return;
  }

  const getGeoIPLocation = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) {
        throw new Error(`GeoIP request failed: ${response.status}`);
      }
      const data = await response.json();
      window.locationMethod = 'GeoIP';  // Set location method
      return {
        coords: {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude)
        }
      };
    } catch (error) {
      console.error('GeoIP error:', error);
      throw new Error('Failed to get location from GeoIP');
    }
  };

  const getPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        console.log('Geolocation not supported, falling back to GeoIP');
        getGeoIPLocation().then(resolve).catch(reject);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          window.locationMethod = 'GPS';  // Set location method
          resolve(position);
        },
        (error) => {
          console.log('Geolocation error, falling back to GeoIP:', error);
          getGeoIPLocation().then(resolve).catch(reject);
        },
        { timeout: 5000 }
      );
    });
  };

  async function fetchMountPoints(lat, lon) {
    try {
      const response = await fetch('mounts.json');
      if (!response.ok) {
        throw new Error(`Failed to load mounts.json: ${response.status}`);
      }

      const data = await response.json();
      console.log('Loaded mount points data:', data);

      const mountPoints = data.streams.map(stream => ({
        name: stream.mountPoint,
        latitude: stream.latitude,
        longitude: stream.longitude
      }));

      console.log('Processed mount points:', mountPoints);

      const nearestMountPoint = findNearestMountPoint(mountPoints, lat, lon);
      console.log('Nearest mount point:', nearestMountPoint);

      displayMountPoint(nearestMountPoint);
    } catch (error) {
      console.error('Error loading mount points:', error);
      mountPointDetails.textContent = 'Error loading mount points data: ' + error.message;
    }
  }

  function showError(message) {
    mountPointDetails.textContent = message;
    retryButton.style.display = 'inline-block';
  }

  function hideError() {
    retryButton.style.display = 'none';
    const loadingTemplate = document.getElementById('loading-template');
    mountPointDetails.innerHTML = '';
    mountPointDetails.appendChild(loadingTemplate.content.cloneNode(true));
  }

  function retryLocation() {
    hideError();
    initializeLocationSearch();
  }

  function displayMountPoint(mountPoint) {
    if (!mountPoint) {
        showError('No mount points found.');
        return;
    }

    const template = document.getElementById('mount-point-template');
    const content = template.content.cloneNode(true);

    content.querySelector('.mount-point-name').textContent = mountPoint.name;
    content.querySelector('.mount-location').textContent = 
        `${mountPoint.latitude.toFixed(2)}°, ${mountPoint.longitude.toFixed(2)}°`;
    content.querySelector('.user-location').textContent = 
        `${window.userLat.toFixed(2)}°, ${window.userLon.toFixed(2)}°`;
    content.querySelector('.location-method').textContent = window.locationMethod || 'Unknown';

    mountPointDetails.innerHTML = '';
    mountPointDetails.appendChild(content);
  }

  async function initializeLocationSearch() {
    try {
      const position = await getPosition();
      const { latitude: userLat, longitude: userLon } = position.coords;
      console.log(`Location obtained - Latitude: ${userLat}, Longitude: ${userLon}`);
      window.userLat = userLat;  // Store for use in displayMountPoint
      window.userLon = userLon;  // Store for use in displayMountPoint
      await fetchMountPoints(userLat, userLon);
    } catch (error) {
      console.error('Main flow error:', error);
      showError('Unable to retrieve your location.');
    }
  }

  // Replace the existing IIFE with a call to initialize
  initializeLocationSearch();

  // Make retryLocation available globally
  window.retryLocation = retryLocation;

  function parseSourceTable(sourceTable) {
    const mountPoints = [];
    const lines = sourceTable.split('\n');
    console.log(`Parsing ${lines.length} lines from sourcetable`);

    lines.forEach((line, index) => {
      if (line.startsWith('STR;')) {
        const fields = line.split(';');
        if (fields.length >= 12) {
          const point = {
            name: fields[1],
            latitude: parseFloat(fields[9]),
            longitude: parseFloat(fields[10])
          };
          console.log(`Found mount point at line ${index}:`, point);
          mountPoints.push(point);
        } else {
          console.warn(`Invalid STR line ${index}, fields: ${fields.length}`);
        }
      }
    });

    return mountPoints;
  }

  function findNearestMountPoint(mountPoints, userLat, userLon) {
    let nearest = null;
    let minDistance = Infinity;

    mountPoints.forEach(point => {
      const distance = getDistance(userLat, userLon, point.latitude, point.longitude);
      console.log(`Distance to ${point.name}: ${distance} km`);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = point;
      }
    });

    return nearest;
  }

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
});