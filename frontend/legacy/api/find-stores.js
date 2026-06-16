import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { lat, lng, radius } = req.query; 

    if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude are required.' });
    }

    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        console.error('API_KEY environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error. API key not found.' });
    }

    // Try multiple search strategies since comic_book_store isn't a valid type in the new API
    const searchStrategies = [
        {
            name: 'Text Search for Comic Book Stores',
            method: 'textSearch',
            endpoint: 'https://places.googleapis.com/v1/places:searchText',
            body: {
                textQuery: 'comic book store',
                locationBias: {
                    circle: {
                        center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
                        radius: parseFloat(radius) || 10000
                    }
                },
                languageCode: 'en',
                maxResultCount: 20
            }
        },
        {
            name: 'Nearby Search for Book Stores',
            method: 'nearbySearch',
            endpoint: 'https://places.googleapis.com/v1/places:searchNearby',
            body: {
                includedTypes: ['book_store'], // Use book_store instead of comic_book_store
                locationRestriction: {
                    circle: {
                        center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
                        radius: parseFloat(radius) || 10000
                    }
                },
                languageCode: 'en',
                maxResultCount: 20
            }
        },
        {
            name: 'Text Search for Comics',
            method: 'textSearch',
            endpoint: 'https://places.googleapis.com/v1/places:searchText',
            body: {
                textQuery: 'comics',
                locationBias: {
                    circle: {
                        center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
                        radius: parseFloat(radius) || 10000
                    }
                },
                languageCode: 'en',
                maxResultCount: 20
            }
        }
    ];

    console.log(`Searching near coordinates: ${lat}, ${lng} with radius ${radius || 10000}m`);

    for (const strategy of searchStrategies) {
        try {
            console.log(`\n=== Trying ${strategy.name} ===`);
            console.log('Request URL:', strategy.endpoint);
            console.log('Request Body:', JSON.stringify(strategy.body, null, 2));

            const response = await fetch(strategy.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'places.displayName,places.id,places.rating,places.photos,places.name,places.formattedAddress, places.websiteUri'
                },
                body: JSON.stringify(strategy.body),
            });

            console.log(`Response status: ${response.status}`);
            
            const data = await response.json();
            console.log('Response data:', JSON.stringify(data, null, 2));

            if (!response.ok) {
                console.error(`${strategy.name} failed:`, data);
                continue; // Try next strategy
            }

            // Check if we got results
            if (data.places && data.places.length > 0) {
                console.log(`✓ SUCCESS: Found ${data.places.length} places with ${strategy.name}`);
                
                // Filter results to only include places that might be comic book stores
                const filteredPlaces = data.places.filter(place => {
                    const name = place.displayName?.text?.toLowerCase() || place.name?.toLowerCase() || '';
                    const address = place.formattedAddress?.toLowerCase() || '';
                    const searchText = `${name} ${address}`;
                    
                    return searchText.includes('comic') || 
                           searchText.includes('manga') || 
                           searchText.includes('graphic') ||
                           searchText.includes('collectible') ||
                           searchText.includes('game') ||
                           searchText.includes('hobby');
                });

                console.log(`Filtered to ${filteredPlaces.length} potentially relevant places`);
                
                if (filteredPlaces.length > 0) {
                    return res.status(200).json({ 
                        places: filteredPlaces,
                        strategy: strategy.name,
                        totalFound: data.places.length,
                        filteredCount: filteredPlaces.length
                    });
                }
            } else {
                console.log(`No results from ${strategy.name}`);
            }

        } catch (e) {
            console.error(`Error with ${strategy.name}:`, e);
            continue; // Try next strategy
        }
    }

    // If we get here, none of the strategies worked
    console.log('All search strategies failed');
    return res.status(200).json({ 
        places: [], 
        message: 'No comic book stores found using any search method',
        searchedStrategies: searchStrategies.map(s => s.name)
    });
}