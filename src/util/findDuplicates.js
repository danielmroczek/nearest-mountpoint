/**
 * NTRIP Mount Points Duplicate Finder
 * 
 * This utility analyzes a JSON file containing NTRIP mount points data to identify
 * multiple streams that appear to be in the same location. This can help network
 * administrators identify redundant mount points or potential configuration issues.
 * 
 * The script:
 * 1. Loads mount point data from a specified JSON file
 * 2. Groups mount points by location/place
 * 3. Identifies locations with multiple mount points
 * 4. Provides detailed information about each duplicate set
 * 
 * Usage: node findDuplicates.js <path-to-mountpoints-json>
 */

import { promises as fs } from 'fs';
import { fetchUrl } from '../lib/net.js';

/**
 * Adds a delay to respect rate limits when making API calls
 * 
 * @param {number} ms - Milliseconds to delay
 * @returns {Promise<void>} Promise that resolves after specified delay
 */
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetches location data from OpenStreetMap Nominatim API
 * 
 * @param {number} lat - Latitude coordinate
 * @param {number} lon - Longitude coordinate
 * @returns {Promise<Object>} JSON response from Nominatim API
 * @throws {Error} If the API request fails
 */
async function fetchLocationData(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
  const headers = {
    'User-Agent': 'NTRIP-Duplicate-Finder/1.0',
    'Accept-Language': 'en'
  };
  
  try {
    const { data } = await fetchUrl(url, headers);
    return JSON.parse(data);
  } catch (e) {
    throw new Error(`Failed to fetch location data: ${e.message}`);
  }
}

/**
 * Analyzes mount points to find locations with multiple streams
 * 
 * @param {Array<Object>} allMountPoints - Array of mount point objects
 * @returns {Array<Object>} Array of duplicate locations with mount point details
 */
export function findDuplicatePlaces(allMountPoints) {
  const placeCount = {};
  const placeGroups = {};
  
  // Group mount points by place
  allMountPoints.forEach(point => {
    if (point.place) {
      if (!placeGroups[point.place]) {
        placeGroups[point.place] = [];
        placeCount[point.place] = 0;
      }
      placeGroups[point.place].push(point.name);
      placeCount[point.place]++;
    }
  });

  // Filter only places with multiple streams
  const duplicates = Object.entries(placeGroups)
    .filter(([place, _]) => placeCount[place] > 1)
    .map(([place, mountPoints]) => ({
      place,
      count: placeCount[place],
      mountPoints
    }));

  return duplicates;
}

/**
 * Main execution function that processes command line arguments,
 * loads the data file, and calls the duplicate finder
 */
async function main() {
  console.log('=================================');
  console.log('NTRIP Mount Points Duplicate Finder');
  console.log('=================================\n');

  // Get filename from command line arguments
  const filename = process.argv[2];
  if (!filename) {
    console.error('Please provide a filename as an argument');
    process.exit(1);
  }

  try {
    console.log(`Reading file: ${filename}...`);
    
    // Read and parse the JSON file
    const data = JSON.parse(await fs.readFile(filename, 'utf8'));
    console.log('File loaded successfully');
    console.log('Found properties:', Object.keys(data));
    
    // Check if the file has the expected structure
    if (!data.streams || !Array.isArray(data.streams)) {
      console.error('Invalid file format: missing streams array');
      process.exit(1);
    }

    console.log(`Analyzing ${data.streams.length} mount points...\n`);

    // Run the function and log results
    const duplicates = findDuplicatePlaces(data.streams);
    
    console.log('Places with multiple streams:');
    console.log('============================');
    
    for (const {place, count, mountPoints} of duplicates) {
      console.log(`\n${place} (${count} streams):`);
      
      for (const mountPoint of mountPoints) {
        const stream = data.streams.find(s => s.name === mountPoint);
        console.log(`\n  - ${stream.name}:`);
        console.log(`    Coordinates: ${stream.latitude}, ${stream.longitude}`);
        
        // try {
        //   // Respect Nominatim usage policy with 1 second delay
        //   await delay(1000);
          
        //   console.log('    Fetching location data...');
        //   const locationData = await fetchLocationData(stream.latitude, stream.longitude);
        //   console.log('    Location data:');
        //   console.log(JSON.stringify(locationData, null, 2).split('\n').map(line => '      ' + line).join('\n'));
        // } catch (error) {
        //   console.log(`    Failed to fetch location data: ${error.message}`);
        // }
      }
    }
    
    console.log('\nTotal duplicate places:', duplicates.length);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();