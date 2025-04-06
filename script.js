import translations from './translations.js';
import GeoRegions from './geoRegions.js';
import { getDistance } from './util/geo.js';

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
  // Fetch and parse networks data
  try {
    const networksResponse = await fetch('networks.json');
    if (!networksResponse.ok) {
      throw new Error('Failed to load networks configuration');
    }
    
    const networksData = await networksResponse.json();
    
    // Setup networks
    setupNetworks(networksData.networks);
    
    // Start location search
    initializeLocationSearch();
  } catch (error) {
    console.error('Failed to initialize app:', error);
    showError('Error loading configuration');
  }
}

function setupNetworks(networksData) {
  // Create networks object
  networks = {};
  
  // Populate the select element with options
  const networkSelect = document.getElementById('network-select');
  networkSelect.innerHTML = '';
  
  let defaultNetwork = null;
  
  networksData.forEach(network => {
    // Add to networks object
    networks[network.id] = {
      name: network.name,
      id: network.id,
      country: network.country
    };
    
    // Create option element
    const option = document.createElement('option');
    option.value = network.id;
    option.textContent = network.name;
    option.setAttribute('data-i18n', `network${network.id.charAt(0).toUpperCase() + network.id.slice(1)}`);
    
    // Set default if specified
    if (network.default) {
      option.selected = true;
      defaultNetwork = network.id;
    }
    
    networkSelect.appendChild(option);
  });
  
  // Set current network
  currentNetwork = defaultNetwork || Object.keys(networks)[0];
}

let networks = {};
let currentNetwork = '';

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

  // Check if all mount points have the same country
  let allSameCountry = true;
  const firstCountry = mountPoints.length > 0 ? (mountPoints[0].country || '') : '';
  
  for (let i = 1; i < mountPoints.length; i++) {
    if ((mountPoints[i].country || '') !== firstCountry) {
      allSameCountry = false;
      break;
    }
  }

  // Hide country column if all mount points are from the same country
  if (allSameCountry) {
    const countryColumns = table.querySelectorAll('.country-column');
    countryColumns.forEach(el => {
      el.style.display = 'none';
    });
  }

  mountPoints.forEach(point => {
    const distance = getDistance(userLat, userLon, point.latitude, point.longitude);
    const row = rowTemplate.content.cloneNode(true);
    
    const location = `${point.latitude.toFixed(2)}°, ${point.longitude.toFixed(2)}°`;
    const place = point.place || 'Unknown';
    const country = point.country || 'Unknown';
    
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
    
    // Add country data
    const countryCell = row.querySelector('.point-country');
    countryCell.textContent = country;
    countryCell.title = country;
    
    // If all countries are same, hide this row's country cell
    if (allSameCountry) {
      countryCell.style.display = 'none';
    }
    
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
    // Get network file based on selection
    const networkFile = `mounts-${networks[currentNetwork].name}.json`;
    
    const response = await fetch(networkFile);
    if (!response.ok) {
      throw new Error(`Failed to load ${networkFile}: ${response.status}`);
    }

    const data = await response.json();
    const mountPoints = data.streams;
    
    // Display update date
    if (data.timestamp) {
      const date = new Date(data.timestamp);
      const updateDate = document.getElementById('update-date');
      updateDate.textContent = new Intl.DateTimeFormat(document.documentElement.lang, {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    }

    console.log(`Loaded ${currentNetwork} mount points data:`, mountPoints);
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
  const locationIndicator = document.querySelector('.location-indicator');
  if (locationIndicator) {
    locationIndicator.textContent = '📍 ' + (translations[document.documentElement.lang] || translations.en).findingLocation;
  }
  
  const mountPointDetails = document.getElementById('mount-point-details');
  mountPointDetails.innerHTML = '';
  
  const loadingMessage = document.createElement('p');
  loadingMessage.classList.add('loading-message');
  loadingMessage.textContent = (translations[document.documentElement.lang] || translations.en).findingLocation;
  mountPointDetails.appendChild(loadingMessage);
  
  const mountPointsList = document.getElementById('mount-points-list');
  if (mountPointsList) {
    mountPointsList.innerHTML = '';
  }
  
  // Reset currentNetwork to selected value in case this is a manual retry
  currentNetwork = networkSelect.value;
  
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

  // Calculate and display distance to the nearest mountpoint
  const distance = getDistance(window.userLat, window.userLon, mountPoint.latitude, mountPoint.longitude);
  content.querySelector('.mount-distance').textContent = `${distance.toFixed(1)} km`;

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