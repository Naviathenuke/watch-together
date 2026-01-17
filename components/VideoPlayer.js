import { useRef, useState, useEffect, useMemo } from 'react';
import { usePlyr } from 'plyr-react';
import 'plyr-react/plyr.css';
import Hls from 'hls.js';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/router';

export default function VideoPlayer({ src, type }) {
    const router = useRouter();
    const apiRef = useRef(null);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeout = useRef(null);

    const isHLS = useMemo(() => {
        return type === 'application/x-mpegURL' || (src && src.includes('.m3u8'));
    }, [src, type]);

    const plyrOptions = useMemo(() => ({
        controls: [
            'play-large', 'play', 'progress', 'current-time', 'duration',
            'mute', 'volume', 'captions', 'settings', 'pip', 'airplay', 'fullscreen',
        ],
        autoplay: true,
        keyboard: { focused: true, global: true },
    }), []);

    const plyrSource = useMemo(() => {
        if (isHLS) return null;
        return {
            type: 'video',
            sources: [{ src, type: type || 'video/mp4' }],
        };
    }, [src, type, isHLS]);

    // usePlyr returns a ref that should be attached to the video element
    const videoRef = usePlyr(apiRef, { source: plyrSource, options: plyrOptions });

    useEffect(() => {
        if (!isHLS || !src || !videoRef.current) return;

        const video = videoRef.current;

        if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(src);
            hls.attachMedia(video);
            return () => {
                hls.destroy();
            };
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS (Safari)
            video.src = src;
        }
    }, [isHLS, src, videoRef]);

    // Custom Controls Logic (Overlay)
    const handleScreenClick = () => {
        setShowControls(true);
        if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
        controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    };

    return (
        <div className="relative w-full h-full bg-black group" onClick={handleScreenClick}>
            {/* Back Button */}
            <div className={`absolute top-4 left-4 z-50 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                <button
                    onClick={() => router.back()}
                    className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-white/20"
                >
                    <ArrowLeft size={24} />
                </button>
            </div>

            {/* Plyr Instance */}
            <div className="w-full h-full flex items-center justify-center">
                {/* We use a raw video tag with the hook instead of the Plyr component for HLS compatibility */}
                <video ref={videoRef} className="plyr-react plyr" />
            </div>
        </div>
    );
}
