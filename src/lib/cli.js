/**
 * Process command-line arguments for NTRIP client applications
 * @param {Array} argv - Command line arguments
 * @returns {Object} Parsed options
 */

export function parseCommandLineArgs(argv) {
  const options = {
    skipPlaces: false,
    saveCsv: false,
    nominatimDelay: 1000,
    test: false
  };

  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--save-csv') {
      options.saveCsv = true;
    } else if (argv[i] === '--skip-places') {
      options.skipPlaces = true;
    } else if (argv[i] === '--nominatim-delay' && i + 1 < argv.length) {
      options.nominatimDelay = parseInt(argv[i + 1], 10);
      i++;
    } else if (argv[i] === '--test') {
      options.test = true;
    }
  }

  return options;
}
