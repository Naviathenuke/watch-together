import Head from 'next/head';
import { useState, useEffect } from 'react';
import { Play, Clock, Link as LinkIcon } from 'lucide-react';
import axios from 'axios';
import { useRouter } from 'next/router';

export default function Home() {
    const [url, setUrl] = useState('');
    const [history, setHistory] = useState([]);
    const router = useRouter();

    useEffect(() => {
        const saved = localStorage.getItem('stream_history');
        if (saved) {
            setHistory(JSON.parse(saved));
        }
    }, []);

    const handlePlay = (e) => {
        e.preventDefault();
        if (!url) return;

        // Add to history
        const newHistory = [url, ...history.filter(h => h !== url)].slice(0, 5);
        setHistory(newHistory);
        localStorage.setItem('stream_history', JSON.stringify(newHistory));

        // Navigate to player (to be created)
        // We'll pass the URL as a query param to a player page or render it conditionally.
        // Let's use a dynamic route /watch?v=...
        router.push(`/watch?v=${encodeURIComponent(url)}`);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            <Head>
                <title>Universal Streamer</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
            </Head>

            {/* Background Ambience */}
            <div className="absolute top-0 left-0 w-full h-full z-[-1] opacity-20 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600 rounded-full blur-[100px]" />
            </div>

            <div className="w-full max-w-md space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        Stream Anywhere
                    </h1>
                    <p className="text-gray-400">Low-latency proxy player for any direct link.</p>
                </div>

                <div className="glass-panel p-6 rounded-2xl space-y-6">
                    <form onSubmit={handlePlay} className="space-y-4">
                        <div className="relative">
                            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="url"
                                placeholder="Paste MP4, HLS, or DASH link..."
                                className="input-premium w-full pl-10 pr-4 py-3 rounded-xl bg-black/20"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="btn-premium w-full py-3 rounded-xl flex items-center justify-center gap-2">
                            <Play size={20} fill="currentColor" />
                            Start Watching
                        </button>
                    </form>
                </div>

                {history.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={14} /> Recent Streams
                        </h3>
                        <div className="space-y-2">
                            {history.map((link, i) => (
                                <div
                                    key={i}
                                    onClick={() => { setUrl(link); }}
                                    className="glass-panel p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-white/5 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <Play size={12} fill="currentColor" />
                                    </div>
                                    <div className="flex-1 truncate text-sm text-gray-300 font-mono">
                                        {link}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
