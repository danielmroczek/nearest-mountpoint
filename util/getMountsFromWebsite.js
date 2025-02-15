const fs = require('fs');

fetch("https://system.asgeupos.pl/Map/SensorMap.aspx/GetSensorListWithConfiguration", {
  headers: {
    "content-type": "application/json"
  },
  method: "POST"
})
  .then(response => response.json())
  .then(data => {
    fs.writeFileSync('mountsWebsite.json', JSON.stringify(data, null, 2));
    console.log('Response saved to mountsWebsite.json');
  })
  .catch(error => console.error('Error:', error));