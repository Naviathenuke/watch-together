import axios from 'axios';

export default async function handler(req, res) {
    const { url, referer } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        // 1. Prepare headers to send to the source
        const headers = {};
        if (req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        // Some servers require User-Agent to look like a browser
        headers['User-Agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

        // Inject Custom Referer if provided
        if (referer && typeof referer === 'string') {
            headers['Referer'] = referer;
        }

        // 2. Request the source stream
        const response = await axios({
            method: 'get',
            url: decodeURIComponent(url),
            responseType: 'stream',
            headers: headers,
            validateStatus: () => true, // Don't throw on error status
        });

        // 3. Set response headers
        // Forward relevant headers like Content-Range, Content-Length, Content-Type
        const allowHeaders = ['content-range', 'content-length', 'content-type', 'accept-ranges', 'date'];

        Object.keys(response.headers).forEach(key => {
            if (allowHeaders.includes(key.toLowerCase())) {
                res.setHeader(key, response.headers[key]);
            }
        });

        // Handle CORS for the player (if playing directly via proxy URL in a player)
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range');

        // 4. Send status code (e.g., 206 for partial content)
        res.status(response.status);

        // 5. Pipe data
        response.data.pipe(res);

        // Handle cleanup
        response.data.on('error', (err) => {
            console.error('Stream error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Stream error' });
            }
            res.end();
        });

    } catch (error) {
        console.error('Proxy error:', error.message);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}

export const config = {
    api: {
        responseLimit: false, // Enable streaming larger responses
    },
};
