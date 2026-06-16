import fetch from 'node-fetch';

export default async function handler(req, res) {
    const { photoreference } = req.query;

    if (!photoreference) {
        return res.status(400).json({ error: 'Photo reference is required.' });
    }

    const apiKey = process.env.API_KEY;
    
    if (!apiKey) {
        console.error('API_KEY environment variable is not set');
        return res.status(500).json({ error: 'Server configuration error. API key not found.' });
    }

    // The new Places API photo URL format
    // The photoreference should be the full "name" from the API response
    // Format: places/PLACE_ID/photos/PHOTO_RESOURCE/media
    const endpoint = `https://places.googleapis.com/v1/${photoreference}/media?maxHeightPx=400&maxWidthPx=400&key=${apiKey}`;

    try {
        console.log('Fetching photo from:', endpoint);
        
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'X-Goog-Api-Key': apiKey
            }
        });

        console.log('Photo API response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Photo API error:', response.status, errorText);
            return res.status(500).json({ 
                error: `Failed to fetch photo: ${response.status}`,
                details: errorText
            });
        }

        // For the new Places API, the response should be the image directly
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.buffer();
        
        console.log('Photo fetched successfully, size:', buffer.length, 'bytes');
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        res.send(buffer);
        
    } catch (e) {
        console.error("Error fetching photo:", e);
        res.status(500).json({ 
            error: "Error fetching photo.",
            details: e.message
        });
    }
}