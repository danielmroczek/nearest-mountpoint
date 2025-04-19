import fs from 'fs/promises';
import path from 'path';
import { fetchUrl, getLocationFromNominatim } from './net.js';
import { parseNtripSourceTable } from './ntrip.js';

/**
 * Process and save mount points data from an NTRIP source
 * @param {string} name - The name of the NTRIP source
 * @param {string} url - The URL of the NTRIP source
 * @param {Function} parseFunction - Function to parse the source data
 * @param {Object} options - Command line options
 * @param {Object} headers - Additional headers for the request
 * @returns {Promise<void>}
 */

export async function processMountPoints(name, url, options) {
  const outputPath = path.join(options.mountsDir, `${name}.json`);

  try {
    // Add common headers for NTRIP requests
    const requestHeaders = {
      'Ntrip-Version': 'Ntrip/2.0',
      'User-Agent': 'NtripCaster/1.0',
    };

    const { data, timestamp } = await fetchUrl(url, requestHeaders);

    // Save the raw data file if the flag is set
    if (options.saveCsv) {
      const rawDataPath = path.join(options.mountsDir, `${name}.csv`);
      await fs.writeFile(rawDataPath, data, 'utf8');
      console.log(`Raw data file has been saved as ${rawDataPath}`);
    }

    // Parse the raw data
    const { streams, caster, network } = parseNtripSourceTable(data);

    if (options.test) {
      console.log('Running in test mode, limiting to 10 random streams.');
      // Limit streams to 10 random elements using splice
      if (streams.length > 10) {
        streams.sort(() => 0.5 - Math.random()).splice(10);;
      }
    }

    // If not skipping places, enrich with location data from OSM
    if (!options.skipPlaces) {
      await enrichMountsWithLocationData(streams, options.nominatimDelay);
    } else {
      console.log('Skipping place data fetch (--skip-places flag detected)');
      // If skipping OSM lookup, just use the available data
      for (const stream of streams) {
        stream.place = `${stream.location || 'Unknown'} (${stream.country || 'Unknown'})`;
      }
    }

    // Create the output structure
    const output = {
      source: name,
      sourceUrl: url,
      timestamp: timestamp || new Date().toISOString(),
      streams,
      caster,
      network
    };

    // Save the JSON file
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`Parsed ${streams.length} mount points saved to ${outputPath}`);

  } catch (error) {
    console.error('Error:', error);
  }
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
    
    // Get location data with stream name for logging
    const locationData = await getLocationFromNominatim(
      mount.latitude, 
      mount.longitude, 
      delay, 
      mount.name
    );
    
    // Update the country if it's empty
    if (locationData && !mount.country && locationData.address?.country) {
      mount.country = locationData.address.country;
    }
    
    // Set the place field using display_name directly from Nominatim
    mount.place = locationData?.display_name || 
                  `${mount.location || 'Unknown'} (${mount.country || 'Unknown'})`;
    
    // Store the complete Nominatim response
    mount.nominatim = locationData;
    
    // Progress indicator
    if (i % 10 === 0 || i === mounts.length - 1) {
      console.log(`Processed ${i + 1}/${mounts.length} mount points`);
    }
  }
  
  console.log(`Completed processing ${mounts.length} mount points`);
  return mounts;
}