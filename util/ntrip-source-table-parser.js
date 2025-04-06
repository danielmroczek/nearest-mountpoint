/**
 * NTRIP Source Table Parser Module
 * Implements parsing according to the official NTRIP specification (RTCM Paper 111-2004/SC104-STD)
 */

/**
 * Parse the NTRIP source table data
 * @param {string} sourceTable - Raw source table data
 * @param {string} provider - Provider name to add to each stream
 * @returns {Object} Object containing streams, network, and caster information
 */
export function parseNtripSourceTable(sourceTable, provider) {
  const streams = [];
  let caster = null;
  let network = null;

  const lines = sourceTable.split('\n');

  for (const line of lines) {
    if (line.startsWith('STR;')) {
      const fields = line.split(';');
      if (fields.length < 11) continue; // Must have at least mountpoint and coordinates
      
      // Skip entries with invalid coordinates
      const lat = parseFloat(fields[9]);
      const lon = parseFloat(fields[10]);
      if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) continue;
      
      streams.push({
        name: fields[1],      
        identifier: fields[2],
        format: fields[3],
        formatDetails: fields[4],
        carrier: parseInt(fields[5]) || 0,
        navSystem: fields[6],
        network: fields[7],
        country: fields[8],
        latitude: lat,
        longitude: lon,
        nmea: parseInt(fields[11]) || 0,
        solution: parseInt(fields[12]) || 0,
        generator: fields[13] || '',
        encryption: fields[14] || '',
        network_transport: fields[15] || '',
        hasFeesApplied: fields[16] === 'Y',
        bitrate: parseInt(fields[17]) || 0,
        miscInfo: fields[18] || '',
        provider: provider,
        location: fields[7] || '' // Network name as fallback for location
      });
    } else if (line.startsWith('CAS;')) {
      const fields = line.split(';');
      if (fields.length < 9) continue;
      
      caster = {
        host: fields[1],
        port: parseInt(fields[2]) || 0,
        identifier: fields[3],
        operator: fields[4],
        nmea: parseInt(fields[5]) || 0,
        country: fields[6],
        latitude: parseFloat(fields[7]) || 0,
        longitude: parseFloat(fields[8]) || 0,
        fallbackHost: fields[9] || '',
        fallbackPort: parseInt(fields[10]) || 0,
        miscInfo: fields[11] || ''
      };
    } else if (line.startsWith('NET;')) {
      const fields = line.split(';');
      if (fields.length < 8) continue;
      
      network = {
        identifier: fields[1],
        operator: fields[2],
        authentication: fields[3],
        hasFeesApplied: fields[4] === 'Y',
        websiteUrl: fields[5],
        streamUrl: fields[6],
        registrationUrl: fields[7] || '',
        miscInfo: fields[8] || ''
      };
    }
  }

  return { streams, caster, network };
}