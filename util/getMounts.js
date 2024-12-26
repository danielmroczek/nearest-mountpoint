const fs = require('fs');
const http = require('http');
const https = require('https');

function convertSourceTableToJson(sourceTable, timestamp = new Date().toISOString()) {
  const result = {
    timestamp,
    streams: [],
    caster: null,
    network: null
  };

  const lines = sourceTable.split('\n');

  lines.forEach(line => {
    if (line.startsWith('STR;')) {
      const fields = line.split(';');
      result.streams.push({
        name: fields[1],      
        identifier: fields[2],
        format: fields[3],
        formatDetails: fields[4],
        carrier: parseInt(fields[5]),
        navSystem: fields[6],
        network: fields[7],
        country: fields[8],
        latitude: parseFloat(fields[9]),
        longitude: parseFloat(fields[10]),
        nmea: parseInt(fields[11]),
        solution: parseInt(fields[12]),
        generator: fields[13],
        encryption: fields[14],
        network_transport: fields[15],
        hasFeesApplied: fields[16] === 'Y',
        bitrate: parseInt(fields[17]),
        miscInfo: fields[18]
      });
    } else if (line.startsWith('CAS;')) {
      const fields = line.split(';');
      result.caster = {
        host: fields[1],
        port: parseInt(fields[2]),
        identifier: fields[3],
        operator: fields[4],
        nmea: parseInt(fields[5]),
        country: fields[6],
        latitude: parseFloat(fields[7]),
        longitude: parseFloat(fields[8]),
        fallbackHost: fields[9],
        fallbackPort: parseInt(fields[10]),
        miscInfo: fields[11]
      };
    } else if (line.startsWith('NET;')) {
      const fields = line.split(';');
      result.network = {
        identifier: fields[1],
        operator: fields[2],
        authentication: fields[3],
        hasFeesApplied: fields[4] === 'Y',
        websiteUrl: fields[5],
        streamUrl: fields[6],
        registrationUrl: fields[7],
        miscInfo: fields[8]
      };
    }
  });

  return result;
}

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const request = lib.get(url, { headers }, (response) => {
      const responseDate = new Date(response.headers.date).toISOString();
      console.log(`Response received at: ${responseDate}`);
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return reject(new Error('statusCode=' + response.statusCode));
      }
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => resolve({ data, timestamp: responseDate }));
    });
    request.on('error', reject);
  });
}

async function getPlace(latitude, longitude) {
  // Add delay to respect Nominatim usage policy
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
  console.log(`Url: ${url}`); 
  const response = await fetchUrl(url, { 'User-Agent': 'NtripCaster/1.0' });
  const data = JSON.parse(response.data);
  
  // Try to find the place in order of preference
  let place = data.name;
  
  if (data.address?.city) {
    place = data.address.city;
    // If it's a city, check for additional details
    const detail = data.address?.neighbourhood || data.address?.suburb || data.address?.quarter;
    return detail ? `${place} (${detail})` : place;
  } else if (data.address?.town) {
    return data.address.town;
  } else if (data.address?.village) {
    place = data.address.village;
    // For villages, add municipality (gmina) if available and different from village name
    const municipality = data.address?.municipality;
    return (municipality && !municipality.includes(place)) ? `${place} (${municipality})` : place;
  }
  
  return place;
}

async function addPlacesToStreams(streams) {
  for (const stream of streams) {
    try {
      stream.place = await getPlace(stream.latitude, stream.longitude);
      console.log(`Place for ${stream.name}: ${stream.place}`); 
    } catch (error) {
      console.error(`Error fetching place for ${stream.name}:`, error);
      stream.place = null;
    }
  }
  return streams;
}

async function main() {
  try {
    const { data, timestamp } = await fetchUrl('http://system.asgeupos.pl:8086', { 'Ntrip-Version': 'Ntrip/2.0' });
    const result = convertSourceTableToJson(data, timestamp);
    
    console.log('Fetching place data for streams...');
    result.streams = await addPlacesToStreams(result.streams);

    fs.writeFile('mounts.json', JSON.stringify(result, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Error writing file:', err);
        return;
      }
      console.log('File has been saved as mounts.json');
    });
  } catch (error) {
    console.error('Error fetching data:', error);
  }
}

main();