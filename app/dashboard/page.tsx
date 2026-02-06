"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { BaseKagetABI } from "../abi/BaseKaget";
import { useRouter } from "next/navigation";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export default function DashboardPage() {
    const { address, isConnected } = useAccount();
    const router = useRouter();
    const [giveaways, setGiveaways] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    // Track which giveaway is being processed (by id)
    const [processingId, setProcessingId] = useState<string | null>(null);

    // Contract Write for Withdraw
    const { writeContractAsync } = useWriteContract();
    const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

    const fetchMyGiveaways = useCallback(async () => {
        if (!address) return;
        setIsLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/giveaways?creator=${address}`);
            if (!res.ok) throw new Error("Failed to fetch giveaways");
            const data = await res.json();
            setGiveaways(data);
        } catch (e: any) {
            console.error("Error fetching dashboard:", e);
            setError(e.message || "Failed to load giveaways. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, [address]);

    // Fetch on mount and when connected
    useEffect(() => {
        if (isConnected) {
            fetchMyGiveaways();
        }
    }, [isConnected, fetchMyGiveaways]);

    // Refetch after successful withdraw/cancel
    useEffect(() => {
        if (isSuccess) {
            setProcessingId(null);
            // Small delay to let blockchain state propagate
            const timer = setTimeout(() => fetchMyGiveaways(), 2000);
            return () => clearTimeout(timer);
        }
    }, [isSuccess, txHash, fetchMyGiveaways]);

    // Auto-refresh when tab becomes visible
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === "visible" && isConnected) {
                fetchMyGiveaways();
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [isConnected, fetchMyGiveaways]);

    const handleWithdraw = async (uuid: string, isExpired: boolean) => {
        try {
            setProcessingId(uuid);
            let idBigInt: bigint;
            if (uuid.includes("-")) {
                idBigInt = BigInt("0x" + uuid.replace(/-/g, ""));
            } else {
                idBigInt = BigInt(uuid);
            }

            // Use withdrawExpired for expired, cancelGiveaway for active
            const functionName = isExpired ? "withdrawExpired" : "cancelGiveaway";

            const hash = await writeContractAsync({
                address: CONTRACT_ADDRESS,
                abi: BaseKagetABI,
                functionName,
                args: [idBigInt],
            });
            setTxHash(hash);
        } catch (e: any) {
            console.error(e);
            setProcessingId(null);
            const action = isExpired ? "Withdraw" : "Cancel";
            alert(`${action} failed: ` + (e.message || "Unknown error"));
        }
    };

    if (!isConnected) {
        return (
            <div className="w-full pt-20 text-center space-y-4 animate-fade-up">
                <div className="w-16 h-16 mx-auto bg-white/5 rounded-2xl flex items-center justify-center">
                    <span className="text-3xl">🔒</span>
                </div>
                <p className="text-gray-500 text-sm">Connect your wallet to view your dashboard</p>
            </div>
        );
    }

    // Stats
    const totalDistributed = giveaways.reduce((sum, g) => {
        return sum + Number(formatEther(BigInt(g.rewardPerClaim))) * Number(g.claimedCount);
    }, 0);
    const totalActive = giveaways.filter(g => {
        const now = Date.now() / 1000;
        return g.isActive && !(Number(g.expiresAt) > 0 && now > Number(g.expiresAt));
    }).length;

    return (
        <div className="w-full space-y-5 pt-4 animate-fade-up">
            <div className="text-center space-y-1">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                    My <span className="text-gradient-blue">Dashboard</span>
                </h1>
                <p className="text-gray-500 text-sm">Manage your giveaways and funds</p>
            </div>

            {/* Summary Stats */}
            {!isLoading && giveaways.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                    <div className="glass-card p-3 text-center">
                        <p className="text-xl font-bold text-white">{giveaways.length}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Total</p>
                    </div>
                    <div className="glass-card p-3 text-center">
                        <p className="text-xl font-bold text-green-400">{totalActive}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Active</p>
                    </div>
                    <div className="glass-card p-3 text-center">
                        <p className="text-xl font-bold text-blue-400">{totalDistributed.toFixed(4)}</p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">ETH Sent</p>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {error && (
                    <div className="glass-card p-4 bg-red-500/10 border-red-500/20 text-center space-y-2">
                        <p className="text-red-300 text-sm">{error}</p>
                        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-xs text-red-200 transition-colors">Retry</button>
                    </div>
                )}

                {isLoading ? (
                    [1, 2, 3].map(i => (
                        <div key={i} className="skeleton h-36 w-full"></div>
                    ))
                ) : giveaways.length === 0 ? (
                    <div className="glass-card p-10 text-center space-y-4">
                        <div className="text-4xl">📭</div>
                        <p className="text-gray-500 text-sm">You haven't created any giveaways yet</p>
                        <button onClick={() => router.push("/")} className="btn-primary px-6 py-2.5 text-sm">
                            Create First Giveaway
                        </button>
                    </div>
                ) : (
                    giveaways.map((g) => {
                        const now = Date.now() / 1000;
                        const isExpired = Number(g.expiresAt) > 0 && now > Number(g.expiresAt);
                        const isFullyClaimed = Number(g.claimedCount) >= Number(g.maxClaims);
                        const remaining = Number(g.maxClaims) - Number(g.claimedCount);
                        const isActiveG = g.isActive;
                        const canWithdraw = isExpired && remaining > 0 && isActiveG;
                        const canCancel = isActiveG && !isExpired && !isFullyClaimed;
                        const claimPct = Number(g.maxClaims) > 0 ? (Number(g.claimedCount) / Number(g.maxClaims)) * 100 : 0;

                        let statusLabel = "Active";
                        let badgeClass = "badge-active";
                        if (!isActiveG) {
                            statusLabel = "Ended";
                            badgeClass = "badge-ended";
                        } else if (isFullyClaimed) {
                            statusLabel = "Fully Claimed";
                            badgeClass = "badge-info";
                        } else if (isExpired) {
                            statusLabel = "Expired";
                            badgeClass = "badge-ended";
                        }

                        return (
                            <div key={g.id} className="glass-card p-5 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-2">
                                        <span className={`px-2.5 py-1 text-[10px] rounded-lg font-bold uppercase tracking-wider ${badgeClass}`}>
                                            {statusLabel}
                                        </span>
                                        <h3 className="text-white font-bold text-lg">{formatEther(BigInt(g.rewardPerClaim))} ETH <span className="text-gray-600 text-sm font-normal">/ person</span></h3>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-[10px] text-gray-600 font-mono">#{g.id.slice(0, 8)}</p>
                                        <p className="text-sm text-white font-bold font-mono">
                                            {g.claimedCount}/{g.maxClaims}
                                        </p>
                                    </div>
                                </div>

                                {/* Progress */}
                                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${!isActiveG ? "bg-gray-600" : isFullyClaimed ? "bg-blue-500" : "bg-green-500"}`}
                                        style={{ width: `${Math.min(claimPct, 100)}%` }}
                                    />
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-1">
                                    <button
                                        onClick={() => router.push(`/baget/${g.id}`)}
                                        className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-medium text-gray-400 hover:text-white transition-all"
                                    >
                                        View
                                    </button>

                                    {canCancel && (
                                        <button
                                            onClick={() => handleWithdraw(g.id, false)}
                                            disabled={processingId !== null}
                                            className="flex-1 py-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                        >
                                            {processingId === g.id ? (isConfirming ? "Confirming..." : "Check Wallet...") : "Cancel & Refund"}
                                        </button>
                                    )}

                                    {canWithdraw && (
                                        <button
                                            onClick={() => handleWithdraw(g.id, true)}
                                            disabled={processingId !== null}
                                            className="flex-1 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                                        >
                                            {processingId === g.id ? (isConfirming ? "Confirming..." : "Check Wallet...") : "Withdraw"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
