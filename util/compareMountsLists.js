import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchUrl } from './network.js';
import { getDistance } from './geo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DISTANCE_THRESHOLD_KM = 2;  // Easy to change threshold

// Load JSON files
const mountsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'mounts.json')));
const mountsWebsiteData = JSON.parse(fs.readFileSync(path.join(__dirname, 'mountsWebsite.json')));

// Extract relevant data
const streams = mountsData.streams;
const stations = mountsWebsiteData.d.StationMarkerList;

// Create a map for quick lookup
const stationMap = new Map();
stations.forEach(station => {
    stationMap.set(station.ID, station);
});

// Compare distances
const distances = [];
streams.forEach(stream => {
    const id = stream.identifier.replace('_RTCM_3_2', '');
    if (stationMap.has(id)) {
        const station = stationMap.get(id);
        const distance = getDistance(stream.latitude, stream.longitude, station.Latitude, station.Longitude);
        distances.push({
            id,
            distance,
            streamLat: stream.latitude,
            streamLng: stream.longitude,
            stationLat: station.Latitude,
            stationLng: station.Longitude
        });
    }
});

// Sort by distance
distances.sort((a, b) => b.distance - a.distance);

async function getReverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const { data } = await fetchUrl(url, { 'User-Agent': 'NearestMountpoint/1.0' });
    const jsonData = JSON.parse(data);
    const address = jsonData.address || {};
    return {
        country: address.country || 'N/A',
        state: address.state || 'N/A',
        county: address.county || 'N/A',
        municipality: address.municipality || 'N/A',
        city: address.city || address.town || address.village || 'N/A'
    };
}

function getStreamCoordinates(id) {
    const stream = streams.find(s => s.identifier.replace('_RTCM_3_2', '') === id);
    return stream ? { lat: stream.latitude, lon: stream.longitude } : null;
}

function getStationCoordinates(id) {
    const station = stations.find(s => s.ID === id);
    return station ? { lat: station.Latitude, lon: station.Longitude } : null;
}

// Modify the main function to be async
async function main() {
    console.log('Distances over ' + DISTANCE_THRESHOLD_KM + 'km between points with the same ID:');
    for (const item of distances) {
        if (item.distance > DISTANCE_THRESHOLD_KM) {
            console.log(`\nID: ${item.id}`);
            console.log(`Distance: ${item.distance.toFixed(2)} km`);
            
            const streamGeo = await getReverseGeocode(item.streamLat, item.streamLng);
            const stationGeo = await getReverseGeocode(item.stationLat, item.stationLng);
            
            console.log('\nStream Location:');
            console.log(`  Coordinates: ${item.streamLat.toFixed(5)}, ${item.streamLng.toFixed(5)}`);
            console.log(`  OSM: https://www.openstreetmap.org/?mlat=${item.streamLat}&mlon=${item.streamLng}`);
            console.log(`  State: ${streamGeo.state}`);
            console.log(`  County: ${streamGeo.county}`);
            console.log(`  Municipality: ${streamGeo.municipality}`);
            console.log(`  City/Town: ${streamGeo.city}`);
            
            console.log('\nStation Location:');
            console.log(`  Coordinates: ${item.stationLat.toFixed(5)}, ${item.stationLng.toFixed(5)}`);
            console.log(`  OSM: https://www.openstreetmap.org/?mlat=${item.stationLat}&mlon=${item.stationLng}`);
            console.log(`  State: ${stationGeo.state}`);
            console.log(`  County: ${stationGeo.county}`);
            console.log(`  Municipality: ${stationGeo.municipality}`);
            console.log(`  City/Town: ${stationGeo.city}`);
        }
    }

    // Find points that exist in one list but not the other
    const streamIds = new Set(streams.map(stream => stream.identifier.replace('_RTCM_3_2', '')));
    const stationIds = new Set(stations.map(station => station.ID));

    const onlyInStreams = [...streamIds].filter(id => !stationIds.has(id));
    const onlyInStations = [...stationIds].filter(id => !streamIds.has(id));

    console.log('\nPoints that exist only in mounts.json:');
    for (const id of onlyInStreams) {
        const coords = getStreamCoordinates(id);
        if (coords) {
            const geo = await getReverseGeocode(coords.lat, coords.lon);
            console.log(`${id} (${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}) - ${geo.country}`);
        } else {
            console.log(`${id} (no coordinates available)`);
        }
    }

    console.log('\nPoints that exist only in mountsWebsite.json:');
    for (const id of onlyInStations) {
        const coords = getStationCoordinates(id);
        if (coords) {
            const geo = await getReverseGeocode(coords.lat, coords.lon);
            console.log(`${id} (${coords.lat.toFixed(5)}, ${coords.lon.toFixed(5)}) - ${geo.country}`);
        } else {
            console.log(`${id} (no coordinates available)`);
        }
    }
}

// Call the main function
main().catch(console.error);
