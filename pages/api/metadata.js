import axios from 'axios';
import path from 'path';

export default async function handler(req, res) {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    try {
        const decodedUrl = decodeURIComponent(url);

        // Attempt to get basic info via HEAD request
        const response = await axios.head(decodedUrl, {
            validateStatus: () => true,
        });

        const contentType = response.headers['content-type'];
        const contentLength = response.headers['content-length'];

        // Guess title from URL
        const pathname = new URL(decodedUrl).pathname;
        const filename = path.basename(pathname) || 'Unknown Video';
        const title = decodeURIComponent(filename);

        res.status(200).json({
            title,
            contentType,
            size: contentLength,
            valid: response.status >= 200 && response.status < 400
        });

    } catch (error) {
        console.error('Metadata error:', error.message);
        res.status(500).json({ error: 'Failed to fetch metadata', details: error.message });
    }
}
