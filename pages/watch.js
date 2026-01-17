import { useRouter } from 'next/router';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
const VideoPlayer = dynamic(() => import('../components/VideoPlayer'), { ssr: false });
import axios from 'axios';

export default function Watch() {
    const router = useRouter();
    const { v } = router.query;
    const [streamUrl, setStreamUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    const [metadata, setMetadata] = useState(null);

    useEffect(() => {
        if (!v) return;

        async function resolveAndFetch() {
            setLoading(true);
            try {
                // Check if it's already a video file
                const isDirectFile = v.match(/\.(mp4|m3u8|mpd)($|\?)/);

                let startUrl = v;
                let referer = null;

                if (!isDirectFile) {
                    // Start resolution
                    try {
                        const resolveRes = await axios.get(`/api/resolve?url=${encodeURIComponent(v)}`);
                        if (resolveRes.data.streamUrl) {
                            startUrl = resolveRes.data.streamUrl;
                            referer = resolveRes.data.referer;
                        }
                    } catch (resolveErr) {
                        console.warn('Resolution failed, trying direct:', resolveErr);
                    }
                }

                // Construct Proxy URL
                let finalProxyUrl = `/api/proxy?url=${encodeURIComponent(startUrl)}`;
                if (referer) {
                    finalProxyUrl += `&referer=${encodeURIComponent(referer)}`;
                }
                setStreamUrl(finalProxyUrl);

                // Fetch metadata (optional)
                const metaRes = await axios.get(`/api/metadata?url=${encodeURIComponent(v)}`);
                setMetadata(metaRes.data);

            } catch (err) {
                console.error("Failed to load stream", err);
            } finally {
                setLoading(false);
            }
        }

        resolveAndFetch();
    }, [v]);

    if (!v || loading) {
        return (
            <div className="w-full h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="w-full h-screen bg-black overflow-hidden flex flex-col">
            <Head>
                <title>{metadata?.title || 'Watching Stream'}</title>
            </Head>

            <div className="flex-1 relative">
                {/* Pass proxyUrl to player */}
                <VideoPlayer src={streamUrl} type={metadata?.contentType} />
            </div>

            {/* Info Panel (Optional, visible if controls are shown or below player) */}
            {/* For mobile-first immersive, usually we just want the player. */}
        </div>
    );
}
