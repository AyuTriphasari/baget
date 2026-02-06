"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatEther } from "viem";

export default function FindPage() {
    const router = useRouter();
    const [giveaways, setGiveaways] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchGiveaways = async () => {
            try {
                const res = await fetch("/api/giveaways");
                if (!res.ok) throw new Error("Failed to fetch");
                const data = await res.json();
                setGiveaways(data);
            } catch (e) {
                console.error("Error fetching giveaways:", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchGiveaways();
    }, []);

    return (
        <div className="w-full max-w-md mx-auto space-y-8 pt-8 px-4 pb-24">
            <div className="text-center space-y-2 animate-fade-up">
                <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
                    Find <span className="text-blue-500">Giveaways</span>
                </h1>
                <p className="text-gray-400 font-medium text-sm">Discover and claim active rewards.</p>
            </div>

            {/* Search Bar (Placeholder for now) */}
            <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
                <div className="relative group">
                    <input
                        type="text"
                        placeholder="Search by Creator Address or ID..."
                        className="glass-input w-full p-4 pl-12 text-sm font-mono placeholder:text-gray-600 focus:outline-none rounded-xl"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                    </div>
                </div>
            </div>

            <div className="space-y-4 animate-fade-up" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center justify-between px-2">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Latest Drops</h2>
                    <button onClick={() => window.location.reload()} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Refresh
                    </button>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="glass-card p-4 h-24 animate-pulse bg-white/5"></div>
                        ))}
                    </div>
                ) : giveaways.length === 0 ? (
                    <div className="glass-card p-8 text-center text-gray-500">
                        No active giveaways found.
                    </div>
                ) : (
                    giveaways.map((g) => {
                        const now = Date.now() / 1000;
                        const isExpired = Number(g.expiresAt) > 0 && now > Number(g.expiresAt);
                        const isFullyClaimed = Number(g.claimedCount) >= Number(g.maxClaims);
                        const isEnded = isExpired || isFullyClaimed; // We assume active if in DB for now

                        return (
                            <div
                                key={g.id}
                                onClick={() => router.push(`/baget/${g.id}`)}
                                className="glass-card p-4 hover:bg-white/10 transition-colors cursor-pointer group flex justify-between items-center"
                            >
                                <div>
                                    <p className="text-white font-bold text-lg">{formatEther(BigInt(g.rewardPerClaim || 0))} ETH</p>
                                    <p className="text-gray-500 text-xs font-mono">
                                        by {g.creator?.slice(0, 6)}...{g.creator?.slice(-4)}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className={`px-2 py-1 text-xs rounded font-bold uppercase ${isEnded ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                                        {isEnded ? "Ended" : "Available"}
                                    </span>
                                    <p className="text-xs text-gray-500 mt-1 font-mono">
                                        {g.claimedCount}/{g.maxClaims}
                                    </p>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
}
