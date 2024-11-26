const fs = require('fs/promises');
const https = require('https');

// Add delay helper
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// Add Nominatim fetcher
async function fetchLocationData(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
  
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'NTRIP-Duplicate-Finder/1.0',
        'Accept-Language': 'en'
      }
    };

    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

function findDuplicatePlaces(allMountPoints) {
  // First pass - count places
  const placeCount = {};
  const placeGroups = {};
  
  // Group mount points by place
  allMountPoints.forEach(point => {
    if (point.place) {
      if (!placeGroups[point.place]) {
        placeGroups[point.place] = [];
        placeCount[point.place] = 0;
      }
      placeGroups[point.place].push(point.mountPoint);
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
        const stream = data.streams.find(s => s.mountPoint === mountPoint);
        console.log(`\n  - ${mountPoint}:`);
        console.log(`    Coordinates: ${stream.latitude}, ${stream.longitude}`);
        
        try {
          // Respect Nominatim usage policy with 1 second delay
          await delay(1000);
          
          console.log('    Fetching location data...');
          const locationData = await fetchLocationData(stream.latitude, stream.longitude);
          console.log('    Location data:');
          console.log(JSON.stringify(locationData, null, 2).split('\n').map(line => '      ' + line).join('\n'));
        } catch (error) {
          console.log(`    Failed to fetch location data: ${error.message}`);
        }
      }
    }
    
    console.log('\nTotal duplicate places:', duplicates.length);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();