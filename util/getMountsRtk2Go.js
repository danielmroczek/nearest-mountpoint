import fs from 'fs/promises';
import { fetchUrl } from './network.js';
import path from 'path';

// Function to parse the CSV data into an array of mount objects
function parseRtk2goCsv(csvData) {
  const lines = csvData.split('\n');
  const mounts = [];
  
  for (const line of lines) {
    if (!line.startsWith('STR;')) continue;
    
    const parts = line.split(';');
    if (parts.length < 11) continue;
    
    // RTK2Go CSV format:
    // STR;mountpoint;location;format;formatDetails;carrierPhase;navSystem;network;country;latitude;longitude;...
    const [, mountpoint, location, format, , , navSystem, , country, latitude, longitude] = parts;
    
    // Skip entries with invalid coordinates
    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) continue;
    
    mounts.push({
      name: mountpoint,
      identifier: mountpoint,
      latitude: lat,
      longitude: lon,
      country: country,
      location: location || '',
      networkProtocol: format || '',
      navigationType: navSystem || '',
      provider: 'RTK2go',
    });
  }
  
  return mounts;
}

// Function to get location data from OpenStreetMap
async function getLocationFromOSM(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;
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
      city: locationData.address?.city || locationData.address?.town || locationData.address?.village || ''
    };
  } catch (error) {
    console.warn(`Failed to get location data for ${lat},${lon}: ${error.message}`);
    return { country: '', state: '', county: '', city: '' };
  }
}

async function main() {
  const skipPlaces = process.argv.includes('--skip-places');
  const saveCsv = process.argv.includes('--save-csv');
  const outputPath = path.resolve('mountsRtk2Go.json');
  
  try {
    const { data, timestamp } = await fetchUrl('http://www.rtk2go.com:2101', { 'Ntrip-Version': 'Ntrip/2.0', 'User-Agent': 'NtripCaster/1.0' });
    
    // Only save the CSV file if the flag is set
    if (saveCsv) {
      await fs.writeFile('rtk2go.csv', data, 'utf8');
      console.log('CSV file has been saved as rtk2go.csv');
    }

    // Parse the CSV data
    const mounts = parseRtk2goCsv(data);
    
    // If not skipping places, enrich with location data from OSM
    if (!skipPlaces) {
      console.log('Fetching location data from OpenStreetMap...');
      for (let i = 0; i < mounts.length; i++) {
        const mount = mounts[i];
        // Add a delay to avoid overwhelming the OSM API
        if (i > 0 && i % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Get location data
        const locationData = await getLocationFromOSM(mount.latitude, mount.longitude);
        
        // Update the country if it's empty in the CSV
        if (!mount.country && locationData.country) {
          mount.country = locationData.country;
        }
        
        // Set the place field
        mount.place = `${mount.location || locationData.city || 'Unknown'} (${mount.country || locationData.country || 'Unknown'})`;
        
        // Progress indicator
        if (i % 10 === 0) {
          console.log(`Processed ${i}/${mounts.length} mount points`);
        }
      }
      console.log(`Completed processing ${mounts.length} mount points`);
    } else {
      // If skipping OSM lookup, just use the available data
      for (const mount of mounts) {
        mount.place = `${mount.location || 'Unknown'} (${mount.country || 'Unknown'})`;
      }
    }
    
    // Create the output structure
    const output = {
      source: 'RTK2go',
      timestamp: timestamp || new Date().toISOString(),
      count: mounts.length,
      mounts: mounts
    };
    
    // Save the JSON file
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`Parsed ${mounts.length} mount points saved to ${outputPath}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

main();