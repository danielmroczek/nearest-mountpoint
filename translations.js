const translations = {
    en: {
        // Default language - must always exist
        title: "NTRIP Mount Point Finder",
        subtitle: "ASG-EUPOS Network",
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
    },
    pl: {
        title: "Wyszukiwarka najbliższego punktu NTRIP",
        subtitle: "Sieć ASG-EUPOS",
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
    },
    // Template for adding new languages
    /*
    de: {
        title: "NTRIP Mount Point Finder",
        subtitle: "ASG-EUPOS Netzwerk",
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

export default translations;
