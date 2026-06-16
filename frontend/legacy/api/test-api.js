import fetch from 'node-fetch';

export default async function handler(req, res) {
    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        return res.status(500).json({ error: 'API_KEY not found' });
    }

    // Simple test to verify the new Places API is working
    const endpoint = 'https://places.googleapis.com/v1/places:searchText';
    
    const requestBody = {
        textQuery: 'restaurants in New York',
        languageCode: 'en',
        maxResultCount: 5
    };

    try {
        console.log('Testing basic Places API (New) functionality...');
        console.log('Request:', JSON.stringify(requestBody, null, 2));
        
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': 'places.displayName,places.id'
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();
        
        console.log('Response status:', response.status);
        console.log('Response:', JSON.stringify(data, null, 2));

        return res.status(response.status).json({
            success: response.ok,
            status: response.status,
            data: data,
            message: response.ok ? 'Places API (New) is working correctly!' : 'Places API (New) returned an error'
        });

    } catch (e) {
        console.error('Error testing API:', e);
        return res.status(500).json({ 
            error: 'Test failed', 
            details: e.message 
        });
    }
}