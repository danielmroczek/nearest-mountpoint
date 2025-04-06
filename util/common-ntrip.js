import { fetchUrl } from './network.js';

/**
 * Get location data from OpenStreetMap Nominatim for given coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} delay - Delay in ms to respect Nominatim usage policy
 * @returns {Promise<Object>} Location data
 */
export async function getLocationFromNominatim(lat, lon, delay = 1000) {
  // Add delay to respect Nominatim usage policy
  await new Promise(resolve => setTimeout(resolve, delay));
  
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
  
  try {
    const { data } = await fetchUrl(url, { 
      'User-Agent': 'NearestMountpoint/1.0',
      'Accept': 'application/json'
    });
    
    // Parse the JSON response
    const locationData = JSON.parse(data);
    return {
      country: locationData.address?.country || '',
      state: locationData.address?.state || '',
      county: locationData.address?.county || '',
      city: locationData.address?.city || locationData.address?.town || locationData.address?.village || '',
      place: determinePlace(locationData),
      nominatimResponse: locationData // Store the complete Nominatim response
    };
  } catch (error) {
    console.warn(`Failed to get location data for ${lat},${lon}: ${error.message}`);
    return { 
      country: '', 
      state: '', 
      county: '', 
      city: '', 
      place: '',
      nominatimResponse: null 
    };
  }
}

/**
 * Determine a meaningful place name from Nominatim data
 * @param {Object} data - Parsed Nominatim response
 * @returns {string} The place name
 */
function determinePlace(data) {
  if (!data.address) return 'Unknown';
  
  // Try to find the place in order of preference
  if (data.address.city) {
    const place = data.address.city;
    // If it's a city, check for additional details
    const detail = data.address.neighbourhood || data.address.suburb || data.address.quarter;
    return detail ? `${place} (${detail})` : place;
  } else if (data.address.town) {
    return data.address.town;
  } else if (data.address.village) {
    const place = data.address.village;
    // For villages, add municipality (gmina) if available and different from village name
    const municipality = data.address.municipality;
    return (municipality && !municipality.includes(place)) ? `${place} (${municipality})` : place;
  }
  
  return data.name || 'Unknown';
}

/**
 * Process command-line arguments for NTRIP client applications
 * @param {Array} argv - Command line arguments
 * @returns {Object} Parsed options
 */
export function parseCommandLineArgs(argv) {
  const options = {
    skipPlaces: false,
    saveCsv: false,
    nominatimDelay: 1000,
    test: false
  };

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--save-csv') {
      options.saveCsv = true;
    } else if (argv[i] === '--skip-places') {
      options.skipPlaces = true;
    } else if (argv[i] === '--nominatim-delay' && i + 1 < argv.length) {
      options.nominatimDelay = parseInt(argv[i + 1], 10);
      i++;
    } else if (argv[i] === '--test') {
      options.test = true;
    }
  }

  return options;
}

/**
 * Enrich mount points with location data
 * @param {Array} mounts - Array of mount objects
 * @param {number} delay - Delay in ms between Nominatim requests
 * @returns {Promise<Array>} Enriched mount points
 */
export async function enrichMountsWithLocationData(mounts, delay = 1000) {
  console.log(`Fetching location data from OpenStreetMap (delay: ${delay}ms)...`);
  
  for (let i = 0; i < mounts.length; i++) {
    const mount = mounts[i];
    
    // Get location data
    const locationData = await getLocationFromNominatim(mount.latitude, mount.longitude, delay);
    
    // Update the country if it's empty
    if (!mount.country && locationData.country) {
      mount.country = locationData.country;
    }
    
    // Set the place field using display_name directly from Nominatim
    mount.place = locationData.nominatimResponse?.display_name || 
                  `${mount.location || 'Unknown'} (${mount.country || 'Unknown'})`;
    
    // Store the complete Nominatim response
    mount.nominatim = locationData.nominatimResponse;
    
    // Progress indicator
    if (i % 10 === 0 || i === mounts.length - 1) {
      console.log(`Processed ${i + 1}/${mounts.length} mount points`);
    }
  }
  
  console.log(`Completed processing ${mounts.length} mount points`);
  return mounts;
}
