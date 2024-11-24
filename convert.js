const fs = require('fs');

function convertSourceTableToJson(sourceTable) {
  const result = {
    streams: [],
    caster: null,
    network: null
  };

  const lines = sourceTable.split('\n');

  lines.forEach(line => {
    if (line.startsWith('STR;')) {
      const fields = line.split(';');
      result.streams.push({
        mountPoint: fields[1],
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

fs.readFile('mount_points.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  const jsonResult = convertSourceTableToJson(data);

  fs.writeFile('mounts.json', JSON.stringify(jsonResult, null, 2), 'utf8', (err) => {
    if (err) {
      console.error('Error writing file:', err);
      return;
    }

    console.log('File has been saved as mounts.json');
  });
});