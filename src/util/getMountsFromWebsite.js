/**
 * Helper Script: EUPOS Mount Points Downloader
 * 
 * This script fetches the current list of EUPOS mount points from the official system website
 * and saves the data to a local JSON file for manual comparison purposes.
 * 
 * Usage: Run this script when you need to check for any changes or updates to the official
 * mount points configuration without modifying the main application.
 */
import { writeFile } from 'fs/promises';

try {
  // Fetch mount points data from the official EUPOS system website
  const response = await fetch("https://system.asgeupos.pl/Map/SensorMap.aspx/GetSensorListWithConfiguration", {
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });
  
  // Parse the JSON response
  const data = await response.json();
  
  // Save the full response to a local file for analysis
  await writeFile('mountsWebsite.json', JSON.stringify(data, null, 2));
  console.log('Response saved to mountsWebsite.json');
} catch (error) {
  console.error('Error:', error);
}
