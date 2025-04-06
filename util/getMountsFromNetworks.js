import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCommandLineArgs } from './common-ntrip.js';
import { processMountPoints } from './common-ntrip-fetcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    // Parse command-line arguments
    const options = parseCommandLineArgs(process.argv);
    
    // Read networks configuration
    const networksPath = path.join(__dirname, '..', 'networks.json');
    const networksConfig = JSON.parse(
      await fs.readFile(networksPath, 'utf8')
    );
    
    // Check if we're processing a specific network or all
    const targetNetwork = process.argv.find(arg => arg.startsWith('--network='))?.split('=')[1];
    
    console.log('Loading mount points from networks...');
    
    // Process each network or just the requested one
    for (const network of networksConfig.networks) {
      if (targetNetwork && network.id !== targetNetwork) {
        continue; // Skip networks that don't match the requested one
      }
      
      console.log(`Processing network: ${network.name} (${network.id})`);
      await processMountPoints(
        network.name, 
        network.url, 
        options,
        undefined, // Default headers
        `mounts-${network.name}.json` // Output file name
      );
      console.log(`Completed network: ${network.name}\n`);
    }
    
    console.log('All networks processed successfully!');
    
  } catch (error) {
    console.error('Error processing networks:', error);
    process.exit(1);
  }
}

main();
