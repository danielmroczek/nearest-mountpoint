class GeoRegions {
    static #regions = {
        POLAND: {
            bounds: { 
                minLat: 49, 
                maxLat: 54.5, 
                minLon: 14, 
                maxLon: 24 
            },
            lang: 'pl'
        },
        // Template for adding new regions
        /*
        GERMANY: {
            bounds: {
                minLat: 47.3,
                maxLat: 55.1,
                minLon: 5.9,
                maxLon: 15.0
            },
            lang: 'de'
        }
        */
    };

    static detectRegion(lat, lon) {
        for (const [region, data] of Object.entries(this.#regions)) {
            if (this.#isInBounds(lat, lon, data.bounds)) {
                return {
                    region,
                    lang: data.lang
                };
            }
        }
        return {
            region: 'UNKNOWN',
            lang: 'en'  // Default language
        };
    }

    static #isInBounds(lat, lon, bounds) {
        return lat >= bounds.minLat && 
               lat <= bounds.maxLat && 
               lon >= bounds.minLon && 
               lon <= bounds.maxLon;
    }

    // Method to add new regions at runtime
    static addRegion(name, bounds, lang) {
        this.#regions[name.toUpperCase()] = { bounds, lang };
    }
}

export default GeoRegions;
