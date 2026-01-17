import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

async function resolveFilmBoom(targetUrl: string) {
    try {
        const urlObj = new URL(targetUrl);
        const params = urlObj.searchParams;
        const subjectId = params.get('id');

        // Extract detail_path from URL path if possible, or construct it?
        // The API needs 'detail_path'. In the user URL 'stranger-things-...' is part of the path.
        // URL: /spa/videoPlayPage/movies/stranger-things-hindi-Aw3jeTNwZX3
        const pathParts = urlObj.pathname.split('/');
        // pathParts[0] = '', [1] = 'spa', [2] = 'videoPlayPage', [3] = 'movies', [4] = 'slug'
        const detailPath = pathParts[4] || '';

        // Default defaults
        let se = params.get('detailSe') || '1';
        let ep = params.get('detailEp') || '1';

        // If empty, force 1 (common default for movies/first ep)
        if (!se) se = '1';
        if (!ep) ep = '1';

        // 1. Fetch Main Page to get Cookies
        const mainPageRes = await axios.get(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            }
        });

        const cookies = mainPageRes.headers['set-cookie'];
        let cookieHeader = '';
        if (cookies) {
            if (Array.isArray(cookies)) {
                cookieHeader = cookies.map(c => c.split(';')[0]).join('; ');
            } else {
                cookieHeader = cookies;
            }
        }

        const apiUrl = `https://filmboom.top/wefeed-h5-bff/web/subject/play?subjectId=${subjectId}&se=${se}&ep=${ep}&detail_path=${detailPath}`;

        const apiRes = await axios.get(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Origin': 'https://filmboom.top',
                'Referer': targetUrl, // Use the full target URL as referer
                'Cookie': cookieHeader
            }
        });

        if (apiRes.data && apiRes.data.data && apiRes.data.data.streams && apiRes.data.data.streams.length > 0) {
            // Return the first available stream (usually best quality/highest res first?)
            return {
                streamUrl: apiRes.data.data.streams[0].url,
                referer: 'https://filmboom.top/'
            };
        }
        return null;

    } catch (e: any) {
        console.error('FilmBoom resolve error:', e.message);
        return null;
    }
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        // Special Handling for FilmBoom
        if (url.includes('filmboom.top')) {
            const fbResult = await resolveFilmBoom(url);
            if (fbResult) {
                return res.status(200).json({
                    ...fbResult,
                    originalUrl: url
                });
            }
            // Fallback to scraping if API fails
        }

        // 1. Fetch the page content
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            timeout: 10000 // 10s timeout
        });

        const headers = response.headers;
        const contentType = headers['content-type'] || '';

        // If it's already a video, return it directly
        if (contentType.includes('video') || url.match(/\.(mp4|m3u8|mpd)($|\?)/)) {
            return res.status(200).json({ streamUrl: url, originalUrl: url });
        }

        const html = response.data;

        if (typeof html !== 'string') {
            return res.status(422).json({ error: 'Target is not a text/html page' });
        }

        // 2. Look for .mp4 URLs
        // Captures http/https urls ending in .mp4 (ignoring quotes)
        const mp4Regex = /https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/g;
        const mp4Matches = html.match(mp4Regex);

        // 3. Look for .m3u8 URLs
        const m3u8Regex = /https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/g;
        const m3u8Matches = html.match(m3u8Regex);

        let streamUrl = null;

        if (mp4Matches && mp4Matches.length > 0) {
            streamUrl = mp4Matches[0];
        } else if (m3u8Matches && m3u8Matches.length > 0) {
            streamUrl = m3u8Matches[0];
        }

        if (streamUrl) {
            // Decode if it looks encoded (common in JSON blobs)
            streamUrl = streamUrl.replace(/\\u0026/g, '&').replace(/\\/g, '');

            return res.status(200).json({
                streamUrl,
                originalUrl: url,
                referer: url // Suggest using the page URL as referer
            });
        } else {
            return res.status(404).json({ error: 'No video stream found on this page' });
        }

    } catch (error: any) {
        console.error('Resolve error:', error.message);
        return res.status(500).json({ error: 'Failed to resolve URL' });
    }
}
