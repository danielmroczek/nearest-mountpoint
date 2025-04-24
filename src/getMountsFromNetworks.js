import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseCommandLineArgs, generateSafeFilename } from './lib/cli.js';
import { processMountPoints } from './lib/mounts.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    // Parse command-line arguments
    const options = parseCommandLineArgs(process.argv);
    
    // Read networks configuration
    const configPath = path.join(__dirname, '..', 'config.json');
    const configData = JSON.parse(
      await fs.readFile(configPath, 'utf8')
    );
    
    // Create mounts directory if it doesn't exist
    options.mountsDir = path.join(__dirname, '../public/mounts');
    try {
      await fs.mkdir(options.mountsDir, { recursive: true });
      console.log(`Created or verified mounts directory at: ${options.mountsDir}`);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        console.error('Error creating mounts directory:', err);
      }
    }
    
    // Check if we're processing a specific network or all
    const targetNetwork = process.argv.find(arg => arg.startsWith('--network='))?.split('=')[1];
    
    console.log('Loading mount points from networks...');
    
    // Track successfully processed networks
    const successfulNetworks = [];
    
    // Process each network or just the requested one
    for (const network of configData.networks) {
      if (targetNetwork && network.name !== targetNetwork) {
        continue; // Skip networks that don't match the requested one
      }
      
      console.log(`Processing network: ${network.name}`);
      try {
        // Generate safe filename for this network
        const safeFilename = generateSafeFilename(network.name);
        
        // Process mount points and save to file with safe name
        await processMountPoints(
          network.name, 
          network.url, 
          {...options, safeFilename},
        );
        
        // Add safe filename to network object before storing
        const networkCopy = {...network, safeFilename};
        successfulNetworks.push(networkCopy);
        console.log(`Completed network: ${network.name}\n`);
      } catch (err) {
        console.error(`Failed to process network: ${network.name}`, err);
      }
    }
    
    // Write successful networks to public/networks.json
    const publicDir = path.join(__dirname, '../public');
    const publicNetworksPath = path.join(publicDir, 'networks.json');
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(
      publicNetworksPath,
      JSON.stringify(successfulNetworks, null, 2),
      'utf8'
    );
    console.log(`Wrote successfully processed networks to: ${publicNetworksPath}`);
    
    console.log('All networks processed successfully!');
    
  } catch (error) {
    console.error('Error processing networks:', error);
    process.exit(1);
  }
}

main();
