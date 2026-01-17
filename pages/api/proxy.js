import axios from 'axios';

export default async function handler(req, res) {
    const { url, referer } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    // 1. Determine Range
    // Default to 0- if no range header
    const range = req.headers.range || 'bytes=0-';

    // Parse start and end
    const matches = range.match(/bytes=(\d+)-(\d*)/);
    const start = parseInt(matches[1], 10);
    let end = matches[2] ? parseInt(matches[2], 10) : undefined;

    // 2. Enforce Max Chunk Size (Vercel Limit Avoidance)
    // 5MB per chunk is safe for 10s timeout
    const CHUNK_SIZE = 5 * 1024 * 1024;
    if (!end || (end - start > CHUNK_SIZE)) {
        end = start + CHUNK_SIZE;
    }

    try {
        // 3. Request ONLY the specific chunk from the source
        const targetHeaders = {
            'Range': `bytes=${start}-${end}`,
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        };

        if (referer) {
            targetHeaders['Referer'] = referer;
        }

        const response = await axios({
            method: 'get',
            url: decodeURIComponent(url),
            responseType: 'stream',
            headers: targetHeaders,
            validateStatus: () => true,
        });

        // 4. Handle Errors from Source
        if (response.status >= 400) {
            // Forward error if possible, or fail
            console.error('Source error:', response.status);
            return res.status(response.status).send(response.statusText);
        }

        // 5. Forward Headers properly
        // crucial: Content-Range, Content-Length, Content-Type
        const allowHeaders = ['content-range', 'content-type', 'accept-ranges', 'content-length'];

        Object.keys(response.headers).forEach(key => {
            if (allowHeaders.includes(key.toLowerCase())) {
                res.setHeader(key, response.headers[key]);
            }
        });

        // Always 206 for partial content
        res.status(206);

        // 6. Pipe the chunk
        response.data.pipe(res);

        response.data.on('error', (err) => {
            console.error('Stream error:', err);
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
        responseLimit: false,
    },
};
