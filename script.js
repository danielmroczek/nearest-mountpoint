import translations from './translations.js';
import GeoRegions from './geoRegions.js';

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

  let tableVisible = false;

  function toggleMountPoints() {
    const button = document.querySelector('.show-details-button');
    const table = document.querySelector('.mount-points-table');
    tableVisible = !tableVisible;
    
    const currentLang = document.documentElement.lang || 'en';
    button.textContent = translations[currentLang][tableVisible ? 'hideAll' : 'showAll'];
    table.classList.toggle('visible');
  }

  function displayMountPointsTable(mountPoints, userLat, userLon) {
    const tableTemplate = document.getElementById('mount-points-table-template');
    applyTranslations(tableTemplate.content);
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
      
      const location = `${point.latitude.toFixed(2)}°, ${point.longitude.toFixed(2)}°`;
      const place = point.place || 'Unknown';
      
      // Add content and tooltips
      const nameCell = row.querySelector('.point-name');
      nameCell.textContent = point.name;
      nameCell.title = point.name;
      
      const locationCell = row.querySelector('.point-location');
      locationCell.textContent = location;
      locationCell.title = location;
      locationCell.addEventListener('click', () => {
        const url = `https://www.openstreetmap.org/?mlat=${point.latitude}&mlon=${point.longitude}#map=15/${point.latitude}/${point.longitude}`;
        window.open(url, '_blank');
      });
      
      const placeCell = row.querySelector('.point-place');
      placeCell.textContent = place;
      placeCell.title = place;
      
      row.querySelector('.point-distance').textContent = `${distance.toFixed(1)} km`;
      
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
    const lang = document.documentElement.lang || 'en';
    mountPointDetails.textContent = translations[lang][message] || message;
    retryButton.classList.add('visible');
  }

  function hideError() {
    retryButton.classList.remove('visible');
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
    applyTranslations(content);
    const mountLocation = content.querySelector('.mount-location');

    content.querySelector('.mount-point-name').textContent = mountPoint.name;
    mountLocation.textContent = 
        `${mountPoint.latitude.toFixed(2)}°, ${mountPoint.longitude.toFixed(2)}°`;

    // Add event listener to the mount location element within the content
    
    mountLocation.addEventListener('click', () => {
        const url = `https://www.openstreetmap.org/?mlat=${mountPoint.latitude}&mlon=${mountPoint.longitude}#map=15/${mountPoint.latitude}/${mountPoint.longitude}`;
        window.open(url, '_blank');
    });

    const userLocation = content.querySelector('.user-location')
    userLocation.textContent = 
        `${window.userLat.toFixed(2)}°, ${window.userLon.toFixed(2)}°`;

    userLocation.addEventListener('click', () => {
        const url = `https://www.openstreetmap.org/?mlat=${window.userLat}&mlon=${window.userLon}#map=15/${window.userLat}/${window.userLon}`;
        window.open(url, '_blank');
    });

    content.querySelector('.location-method').textContent = window.locationMethod || 'Unknown';
    content.querySelector('.mount-place').textContent = mountPoint.place || 'Unknown location';

    if (content) {
        const nameElement = content.querySelector('.mount-point-name');
        nameElement.addEventListener('click', (e) => {
            copyToClipboard(mountPoint.name, e.target);
        });
    }

    mountPointDetails.innerHTML = '';
    mountPointDetails.appendChild(content);
  }

  async function initializeLocationSearch() {
    try {
      const position = await getPosition();
      const { latitude: userLat, longitude: userLon } = position.coords;
      window.userLat = userLat;  // Store for use in displayMountPoint
      window.userLon = userLon;  // Store for use in displayMountPoint
      
      // Set language based on location
      setLanguage(userLat, userLon);
      applyTranslations(document);
      
      await fetchMountPoints(userLat, userLon);
    } catch (error) {
      console.error('Main flow error:', error);
      showError(translations[lang || 'en'].errorLocation);
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

  function copyToClipboard(text, element) {
    navigator.clipboard.writeText(text).then(() => {
      const lang = document.documentElement.lang || 'en';
      const feedback = document.createElement('span');
      feedback.textContent = translations[lang].copied;
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

  function setLanguage(lat, lon) {
    const { lang } = GeoRegions.detectRegion(lat, lon);
    
    // Verify language is supported, fallback to English if not
    if (!translations[lang]) {
      console.warn(`Language ${lang} not supported, falling back to English`);
      return 'en';
    }

    document.documentElement.setAttribute('lang', lang);
    return lang;
  }

  // Remove old country detection functions as they're now in GeoRegions class

  function translateElement(element, lang) {
    const key = element.getAttribute('data-i18n');
    if (!translations[lang][key]) return;

    if (element.classList.contains('show-details-button')) {
      element.textContent = translations[lang][tableVisible ? 'hideAll' : 'showAll'];
    } else {
      element.textContent = translations[lang][key] || element.textContent;
    }
  }

  function applyTranslations(node) {
    const currentLang = document.documentElement.lang || 'en';
    node.querySelectorAll('[data-i18n]').forEach(element => {
      translateElement(element, currentLang);
    });
  }
});