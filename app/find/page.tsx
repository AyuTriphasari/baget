"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatUnits } from "viem";

export default function FindPage() {
    const router = useRouter();
    const [giveaways, setGiveaways] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [nextCursor, setNextCursor] = useState<string | null>(null);
    const [tab, setTab] = useState<"active" | "ended">("active");

    const fetchGiveaways = useCallback(async (showLoading = true, cursor?: string) => {
        if (showLoading) setIsLoading(true);
        else if (!cursor) setIsRefreshing(true);
        else setIsLoadingMore(true);
        try {
            const params = new URLSearchParams({ tab, limit: "15" });
            if (cursor) params.set("cursor", cursor);
            const res = await fetch(`/api/giveaways?${params}`);
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            if (cursor) {
                setGiveaways(prev => [...prev, ...data.items]);
            } else {
                setGiveaways(data.items);
            }
            setNextCursor(data.nextCursor);
        } catch (e) {
            console.error("Error fetching giveaways:", e);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            setIsLoadingMore(false);
        }
    }, [tab]);

    // Fetch on mount and tab change
    useEffect(() => {
        setGiveaways([]);
        setNextCursor(null);
        fetchGiveaways();
    }, [fetchGiveaways]);

    // Auto-refresh when tab becomes visible again
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                fetchGiveaways(false);
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [fetchGiveaways]);

    return (
        <div className="w-full space-y-5 pt-4 animate-fade-up">
            {/* Header */}
            <div className="text-center space-y-1">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                    Find <span className="text-gradient-blue">Giveaways</span>
                </h1>
                <p className="text-gray-500 text-sm">Discover and claim active rewards</p>
            </div>

            {/* Tabs + Refresh */}
            <div className="flex items-center justify-between">
                <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
                    <button
                        onClick={() => setTab("active")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === "active" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "text-gray-500 hover:text-gray-300"}`}
                    >
                        Active
                    </button>
                    <button
                        onClick={() => setTab("ended")}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${tab === "ended" ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}
                    >
                        Ended
                    </button>
                </div>
                <button onClick={() => fetchGiveaways(false)} disabled={isRefreshing} className="p-2 rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-colors disabled:opacity-50">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                </button>
            </div>

            {/* List */}
            <div className="space-y-3">
                {isLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="skeleton h-28 w-full"></div>
                    ))
                ) : giveaways.length === 0 ? (
                    <div className="glass-card p-10 text-center space-y-3">
                        <div className="text-4xl">{tab === "active" ? "🔍" : "📭"}</div>
                        <p className="text-gray-500 text-sm">
                            {tab === "active" ? "No active giveaways right now" : "No ended giveaways yet"}
                        </p>
                    </div>
                ) : (
                    <>
                        {giveaways.map((g) => {
                            const now = Date.now() / 1000;
                            const isExpired = Number(g.expiresAt) > 0 && now > Number(g.expiresAt);
                            const isFullyClaimed = Number(g.claimedCount) >= Number(g.maxClaims);
                            const isEnded = !g.isActive || isExpired || isFullyClaimed;
                            const claimPct = Number(g.maxClaims) > 0 ? (Number(g.claimedCount) / Number(g.maxClaims)) * 100 : 0;

                            // Time remaining
                            let timeLeft = "";
                            if (!isEnded && Number(g.expiresAt) > 0) {
                                const secs = Number(g.expiresAt) - now;
                                if (secs > 3600) timeLeft = `${Math.floor(secs / 3600)}h left`;
                                else if (secs > 60) timeLeft = `${Math.floor(secs / 60)}m left`;
                                else timeLeft = `${Math.floor(secs)}s left`;
                            }

                            return (
                                <div
                                    key={g.id}
                                    onClick={() => router.push(`/baget/${g.id}`)}
                                    className="glass-card p-4 hover:border-blue-500/20 transition-all cursor-pointer group space-y-3"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-bold text-white">{formatUnits(BigInt(g.rewardPerClaim || 0), g.tokenDecimals ?? 18)}</span>
                                                <span className="text-xs font-bold text-gray-500">{g.tokenSymbol ?? "ETH"}</span>
                                                <span className="text-gray-600 text-xs">/ person</span>
                                            </div>
                                            <p className="text-gray-600 text-xs font-mono">
                                                by {g.creator?.slice(0, 6)}…{g.creator?.slice(-4)}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            <span className={`px-2.5 py-1 text-[10px] rounded-lg font-bold uppercase tracking-wider ${isEnded ? "badge-ended" : "badge-active"}`}>
                                                {isFullyClaimed ? "Full" : isExpired ? "Expired" : isEnded ? "Ended" : "Live"}
                                            </span>
                                            {timeLeft && (
                                                <span className="text-[10px] text-gray-600 font-mono">{timeLeft}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="space-y-1.5">
                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${isEnded ? "bg-gray-600" : claimPct > 80 ? "bg-orange-500" : "bg-blue-500"}`}
                                                style={{ width: `${Math.min(claimPct, 100)}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] text-gray-600">
                                            <span>{g.claimedCount}/{g.maxClaims} claimed</span>
                                            <span className="text-gray-500 group-hover:text-blue-400 transition-colors flex items-center gap-1">
                                                View →
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {nextCursor && (
                            <button
                                onClick={() => fetchGiveaways(false, nextCursor)}
                                disabled={isLoadingMore}
                                className="w-full py-3 glass-card text-center text-sm font-bold text-gray-400 hover:text-white transition-colors"
                            >
                                {isLoadingMore ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
                                        Loading...
                                    </span>
                                ) : "Load More"}
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
