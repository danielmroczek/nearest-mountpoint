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

  // Add these new functions and variables
  let allMountPoints = [];
  let tableVisible = false;

  function toggleMountPoints() {
    const button = document.querySelector('.show-details-button');
    const table = document.querySelector('.mount-points-table');
    tableVisible = !tableVisible;
    
    if (tableVisible) {
      button.textContent = 'Hide mount points';
      table.classList.add('visible');
    } else {
      button.textContent = 'Show all mount points';
      table.classList.remove('visible');
    }
  }

  function displayMountPointsTable(mountPoints, userLat, userLon) {
    const tableTemplate = document.getElementById('mount-points-table-template');
    const rowTemplate = document.getElementById('mount-point-row-template');
    const table = tableTemplate.content.cloneNode(true);
    const tbody = table.querySelector('tbody');

    // Sort mount points by distance
    mountPoints.sort((a, b) => {
      const distA = getDistance(userLat, userLon, a.latitude, a.longitude);
      const distB = getDistance(userLat, userLon, b.latitude, b.longitude);
      return distA - distB;
    });

    mountPoints.forEach(point => {
      const distance = getDistance(userLat, userLon, point.latitude, point.longitude);
      const row = rowTemplate.content.cloneNode(true);
      
      row.querySelector('.point-name').textContent = point.identifier;
      row.querySelector('.point-location').textContent = 
        `${point.latitude.toFixed(2)}°, ${point.longitude.toFixed(2)}°`;
      row.querySelector('.point-place').textContent = point.place || 'Unknown';
      row.querySelector('.point-distance').textContent = `${distance.toFixed(1)} km`;
      
      const nameCell = row.querySelector('.point-name');
      nameCell.addEventListener('click', (e) => {
        copyToClipboard(point.name, e.target);
      });

      tbody.appendChild(row);
    });

    // Remove existing table if present
    const existingTable = document.querySelector('.mount-points-table');
    if (existingTable) {
      existingTable.remove();
    }

    // Add new table to the card
    document.querySelector('.card').appendChild(table);
  }

  async function fetchMountPoints(lat, lon) {
    try {
      const response = await fetch('mounts.json');
      if (!response.ok) {
        throw new Error(`Failed to load mounts.json: ${response.status}`);
      }

      const {streams: mountPoints} = await response.json();
      console.log('Loaded mount points data:', mountPoints);
      const nearestMountPoint = findNearestMountPoint(mountPoints, lat, lon);
      console.log('Nearest mount point:', nearestMountPoint);

      displayMountPoint(nearestMountPoint);
      displayMountPointsTable(mountPoints, lat, lon);
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

    content.querySelector('.mount-point-name').textContent = mountPoint.identifier;
    content.querySelector('.mount-location').textContent = 
        `${mountPoint.latitude.toFixed(2)}°, ${mountPoint.longitude.toFixed(2)}°`;
    content.querySelector('.user-location').textContent = 
        `${window.userLat.toFixed(2)}°, ${window.userLon.toFixed(2)}°`;
    content.querySelector('.location-method').textContent = window.locationMethod || 'Unknown';
    // Add place information
    content.querySelector('.mount-place').textContent = mountPoint.place || 'Unknown location';

    if (content) {
      const nameElement = content.querySelector('.mount-point-name');
      nameElement.addEventListener('click', (e) => {
        copyToClipboard(mountPoint.identifier, e.target);
      });
    }

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

  function findNearestMountPoint(mountPoints, userLat, userLon) {
    let nearest = null;
    let minDistance = Infinity;

    mountPoints.forEach(point => {
      const distance = getDistance(userLat, userLon, point.latitude, point.longitude);
      console.log(`Distance to ${point.identifier}: ${distance} km`);
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

  function copyToClipboard(text, element) {
    navigator.clipboard.writeText(text).then(() => {
      const feedback = document.createElement('span');
      feedback.textContent = 'Copied!';
      feedback.className = 'copied-feedback';
      
      // Position the feedback relative to viewport
      const rect = element.getBoundingClientRect();
      feedback.style.position = 'fixed';
      feedback.style.left = `${rect.left}px`;
      feedback.style.top = `${rect.bottom + 5}px`;
      
      document.body.appendChild(feedback);
      
      // Remove the feedback element after animation
      setTimeout(() => feedback.remove(), 1000);
    }).catch(err => console.error('Failed to copy:', err));
  }

  // Make toggleMountPoints available globally
  window.toggleMountPoints = toggleMountPoints;
});