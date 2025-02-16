import http from 'http';
import https from 'https';

export function fetchUrl(url, headers = {}) {
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