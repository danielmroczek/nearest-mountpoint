import { writeFile } from 'fs/promises';

try {
  const response = await fetch("https://system.asgeupos.pl/Map/SensorMap.aspx/GetSensorListWithConfiguration", {
    headers: {
      "content-type": "application/json"
    },
    method: "POST"
  });
  const data = await response.json();
  await writeFile('mountsWebsite.json', JSON.stringify(data, null, 2));
  console.log('Response saved to mountsWebsite.json');
} catch (error) {
  console.error('Error:', error);
}
