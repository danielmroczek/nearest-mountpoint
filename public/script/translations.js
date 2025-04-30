const translations = {
    en: {
        // Default language - must always exist
        title: "NTRIP Mount Point Finder",
        subtitle: "ASG-EUPOS Network", // Kept for backward compatibility
        nearestPoint: "Nearest Mount Point",
        fetchingLocation: "Fetching your location...",
        tryAgain: "Try Again",
        showAll: "Show all mount points",
        hideAll: "Hide mount points",
        mountPointLocation: "Mount point location",
        mountPointPlace: "Mount point place",
        yourLocation: "Your location",
        locationMethod: "Location method",
        unknown: "Unknown location",
        copied: "Copied!",
        distance: "Distance",
        errorLocation: "Unable to retrieve your location.",
        errorLoading: "Error loading mount points data",
        mountPointName: "Mount Point",
        lastUpdate: "Last update of mount points database",
        selectNetwork: "Select Network",
        networkEupos: "ASG-EUPOS",
        networkRtk2go: "RTK2Go",
        country: "Country",
        freeNetworks: "Free",
        paidNetworks: "Paid"
    },
    pl: {
        title: "Wyszukiwarka najbliższego punktu NTRIP",
        subtitle: "Sieć ASG-EUPOS", // Kept for backward compatibility
        nearestPoint: "Najbliższy punkt montowania",
        fetchingLocation: "Pobieranie lokalizacji...",
        tryAgain: "Spróbuj ponownie",
        showAll: "Pokaż wszystkie punkty",
        hideAll: "Ukryj punkty",
        mountPointLocation: "Lokalizacja",
        mountPointPlace: "Miejscowość",
        yourLocation: "Twoja lokalizacja",
        locationMethod: "Metoda lokalizacji",
        unknown: "Nieznana lokalizacja",
        copied: "Skopiowano!",
        distance: "Odległość",
        errorLocation: "Nie można pobrać lokalizacji.",
        errorLoading: "Błąd ładowania danych punktów",
        mountPointName: "Nazwa",
        lastUpdate: "Ostatnia aktualizacja bazy punktów",
        selectNetwork: "Wybierz sieć",
        networkEupos: "ASG-EUPOS",
        networkRtk2go: "RTK2Go",
        country: "Kraj",
        freeNetworks: "Darmowe",
        paidNetworks: "Płatne"
    },
    // Template for adding new languages
    /*
    de: {
        title: "NTRIP Mount Point Finder",
        subtitle: "ASG-EUPOS Netzwerk", // Kept for backward compatibility
        selectNetwork: "Netzwerk auswählen",
        networkEupos: "ASG-EUPOS",
        networkRtk2go: "RTK2Go",
        freeNetworks: "Kostenlos",
        paidNetworks: "Kostenpflichtig"
        // ... add all required translations
    },
    */
};

// Verify all languages have all required keys (using English as reference)
Object.keys(translations).forEach(lang => {
    if (lang === 'en') return;
    Object.keys(translations.en).forEach(key => {
        if (!translations[lang][key]) {
            console.warn(`Missing translation for key "${key}" in language "${lang}"`);
            translations[lang][key] = translations.en[key]; // Fallback to English
        }
    });
});

// Function to dynamically load network translations
export function addNetworkTranslations(networksData) {
    networksData.forEach(network => {
        // Create standardized key from network name
        const key = `network${network.name.charAt(0).toUpperCase() + network.name.slice(1).replace(/[^a-zA-Z0-9]/g, '')}`;
        
        // Add to each language if not present
        Object.keys(translations).forEach(lang => {
            if (!translations[lang][key]) {
                translations[lang][key] = network.name;
            }
        });
    });
    
    return translations;
}

export default translations;
