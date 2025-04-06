import fs from 'fs/promises';
import path from 'path';
import { fetchUrl } from './network.js';
import { parseCommandLineArgs, enrichMountsWithLocationData } from './common-ntrip.js';
import { parseNtripSourceTable } from './ntrip-source-table-parser.js';

/**
 * Process and save mount points data from an NTRIP source
 * @param {string} name - The name of the NTRIP source
 * @param {string} url - The URL of the NTRIP source
 * @param {Object} options - Command line options
 * @param {Object} headers - Additional headers for the request
 * @param {string} outputFile - Custom output file name (optional)
 * @returns {Promise<void>}
 */
export async function processMountPoints(name, url, options, headers = {}, outputFile) {
  const outputPath = path.resolve(outputFile || `mounts-${name}.json`);
  
  try {
    // Add common headers for NTRIP requests
    const requestHeaders = {
      'Ntrip-Version': 'Ntrip/2.0',
      'User-Agent': 'NtripCaster/1.0',
      ...headers
    };
    
    const { data, timestamp } = await fetchUrl(url, requestHeaders);
    
    // Save the raw data file if the flag is set
    if (options.saveCsv) {
      const rawDataPath = path.resolve(`${name}.csv`);
      await fs.writeFile(rawDataPath, data, 'utf8');
      console.log(`Raw data file has been saved as ${rawDataPath}`);
    }

    // Parse the raw data using the common parser
    const { streams, caster, network } = parseNtripSourceTable(data, name);
    
    // If test mode is enabled, limit to only the first 10 streams
    const processedStreams = options.test ? streams.slice(0, 10) : streams;
    
    if (options.test) {
      console.log(`Test mode: Processing only first 10 streams (${processedStreams.length}/${streams.length} total)`);
    }
    
    // If not skipping places, enrich with location data from OSM
    if (!options.skipPlaces) {
      await enrichMountsWithLocationData(processedStreams, options.nominatimDelay);
    } else {
      console.log('Skipping place data fetch (--skip-places flag detected)');
      // If skipping OSM lookup, just use the available data
      for (const stream of processedStreams) {
        stream.place = `${stream.location || 'Unknown'} (${stream.country || 'Unknown'})`;
      }
    }
    
    // Create the output structure
    const output = {
      source: name,
      sourceUrl: url,
      timestamp: timestamp || new Date().toISOString(),
      streams: processedStreams,
      caster,
      network,
      testMode: options.test
    };
    
    // Save the JSON file
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2), 'utf8');
    console.log(`Parsed ${processedStreams.length} mount points saved to ${outputPath}`);

  } catch (error) {
    console.error('Error:', error);
  }
}
