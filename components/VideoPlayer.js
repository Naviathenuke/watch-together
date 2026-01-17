import { useLayoutEffect, useRef, useState, useEffect } from 'react';
import { Plyr } from 'plyr-react';
import 'plyr-react/plyr.css';
import { ArrowLeft, Maximize, Minimize, Settings, SkipForward, SkipBack } from 'lucide-react';
import { useRouter } from 'next/router';

// Custom Hook for double tap
function useDoubleIcon(callback, delay = 300) {
    const lastTap = useRef(0);
    return () => {
        const now = Date.now();
        if (now - lastTap.current < delay) {
            callback();
        }
        lastTap.current = now;
    };
}

export default function VideoPlayer({ src, type }) {
    const router = useRouter();
    const ref = useRef(null);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeout = useRef(null);

    // Determine source type for Plyr
    // If specific extension is known, use it. Otherwise guess based on content-type or URL.
    // We'll use the proxy URL.

    const plyrSource = {
        type: 'video',
        sources: [
            {
                src: src, // This should be the /api/proxy?url=... link
                type: type || 'video/mp4', // Default to mp4 if unknown, or rely on browser
            },
        ],
    };

    const plyrOptions = {
        controls: [
            'play-large',
            'play',
            'progress',
            'current-time',
            'duration',
            'mute',
            'volume',
            'captions',
            'settings',
            'pip',
            'airplay',
            'fullscreen',
        ],
        autoplay: true,
        keyboard: { focused: true, global: true },
    };

    // Custom Controls Logic (Overlay)
    const handleScreenClick = () => {
        setShowControls(true);
        if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
        controlsTimeout.current = setTimeout(() => setShowControls(false), 3000);
    };

    const handleSeekForward = () => {
        if (ref.current && ref.current.plyr) {
            ref.current.plyr.forward(10);
        }
    };

    const handleSeekBack = () => {
        if (ref.current && ref.current.plyr) {
            ref.current.plyr.rewind(10);
        }
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
                <Plyr ref={ref} source={plyrSource} options={plyrOptions} />
            </div>

            {/* Mobile/Touch Overlays for Seeking */}
            {/* These could be invisible overlays on left/right 25% of screen for double-tap */}
        </div>
    );
}
