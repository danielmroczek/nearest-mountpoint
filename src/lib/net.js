import http from 'http';
import https from 'https';
import net from 'net';

/**
 * Fetches a URL using HTTP/HTTPS with headers.
 * @param {string} url - The URL to fetch.
 * @param {Object} [headers={}] - Optional headers to include in the request.
 * @returns {Promise<{data: string, timestamp: string}>}
 */
async function fetchHttp(url, headers = {}) {
  return await new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const request = lib.get(url, { headers }, (response) => {
      let responseDate;
      try {
        responseDate = new Date(response.headers.date).toISOString();
      } catch {
        responseDate = new Date().toISOString();
      }
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

/**
 * Fetches a URL using NTRIP v1 protocol (HTTP/1.0 request, parses NTRIP headers).
 * Only supports HTTP (not HTTPS).
 * @param {string} url - The URL to fetch.
 * @param {Object} [headers={}] - Optional headers to include in the request.
 * @param {Object} [options={}] - Options object, e.g. {timeoutMs: number}
 * @returns {Promise<{data: string, timestamp: string, headers: Object}>}
 */
async function fetchNtripV1(url, headers = {}, options = {}) {
  return await new Promise((resolve, reject) => {
    let settled = false;
    let rawData = '';
    let client;
    try {
      const { hostname, port, pathname, search, protocol } = new URL(url);

      if (protocol === 'https:') {
        return reject(new Error('HTTPS protocol is not supported in NTRIP v1 mode'));
      }

      const targetPort = port || 80;
      const path = `${pathname || '/'}${search || ''}`;

      client = net.createConnection({
        host: hostname,
        port: targetPort
      }, () => {
        // Send HTTP/1.0 request as per NTRIP v1
        client.write(`GET ${path} HTTP/1.0\r\n`);
        client.write(`Host: ${hostname}\r\n`);
        // Write custom headers
        for (const [key, value] of Object.entries(headers)) {
          client.write(`${key}: ${value}\r\n`);
        }
        // Only add User-Agent if not present in headers (case-insensitive)
        if (!Object.keys(headers).some(h => h.toLowerCase() === 'user-agent')) {
          client.write('User-Agent: NTRIP client\r\n');
        }
        client.write('Accept: */*\r\n');
        client.write('\r\n');
      });

      // Set a timeout to avoid hanging forever
      const timeoutMs = options.timeoutMs || 5000;
      client.setTimeout(timeoutMs, () => {
        if (!settled) {
          settled = true;
          client.destroy();
          reject(new Error('NTRIP fetch timed out'));
        }
      });

      client.on('data', chunk => {
        rawData += chunk.toString('binary');
      });

      client.on('end', () => {
        if (!settled) {
          settled = true;
          client.end();

          // Split headers and body (NTRIP v1: headers end with \r\n\r\n)
          const headerEnd = rawData.indexOf('\r\n\r\n');
          let headersObj = {};
          let body = rawData;
          if (headerEnd !== -1) {
            const headerStr = rawData.slice(0, headerEnd);
            body = rawData.slice(headerEnd + 4);
            // Parse headers
            const headerLines = headerStr.split('\r\n');
            for (const line of headerLines) {
              const idx = line.indexOf(':');
              if (idx !== -1) {
                const key = line.slice(0, idx).trim();
                const value = line.slice(idx + 1).trim();
                headersObj[key] = value;
              }
            }
          }
          let timestamp;
          try {
            timestamp = new Date(headersObj.Date).toISOString();
          } catch {
            timestamp = new Date().toISOString();
          }
          resolve({
            data: body,
            timestamp,
            headers: headersObj
          });
        }
      });

      client.on('error', err => {
        if (!settled) {
          settled = true;
          client.destroy();
          reject(err);
        }
      });
    } catch (err) {
      if (!settled) {
        settled = true;
        if (client) client.destroy();
        reject(err);
      }
    }
  });
}

/**
 * Fetches a URL using HTTP/HTTPS, falling back to NTRIP v1 if needed.
 * @param {string} url - The URL to fetch.
 * @param {Object} [headers={}] - Optional headers to include in the request.
 * @param {Object} [options={}] - Options object, e.g. {http09TimeoutMs: number}
 * @returns {Promise<{data: string, timestamp: string, headers?: Object}>}
 */
export async function fetchUrl(url, headers = {}, options = {}) {
  try {
    console.log(`Fetching URL: ${url}`);
    return await fetchHttp(url, headers);
  } catch (err) {
    const timeoutMs = options.http09TimeoutMs || 5000;
    console.warn(`HTTP/1.1 fetch failed, trying NTRIP v1: ${err.message}`);
    return await fetchNtripV1(url, headers, { timeoutMs });
  }
}
/**
 * Get location data from OpenStreetMap Nominatim for given coordinates
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {number} delay - Delay in ms to respect Nominatim usage policy
 * @param {string} streamName - The name of the stream being processed
 * @returns {Promise<Object>} Location data
 */

export async function getLocationFromNominatim(lat, lon, delay = 1000, streamName = 'Unknown') {
  // Add delay to respect Nominatim usage policy
  await new Promise(resolve => setTimeout(resolve, delay));

  console.log(`Requesting Nominatim data for: ${streamName} at coordinates [${lat}, ${lon}]`);

  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;

  try {
    const { data } = await fetchUrl(url, {
      'User-Agent': 'NearestMountpoint/1.0',
      'Accept': 'application/json'
    });

    // Parse the JSON response and return it directly
    const locationData = JSON.parse(data);
    return locationData;
  } catch (error) {
    console.warn(`Failed to get location data for ${streamName} [${lat},${lon}]: ${error.message}`);
    return null;
  }
}