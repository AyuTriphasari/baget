"use client";

import { useState, useEffect } from "react";
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

    // Contract Write for Withdraw
    const { writeContractAsync, isPending: isTxPending } = useWriteContract();
    const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

    useEffect(() => {
        const fetchMyGiveaways = async () => {
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
        };

        if (isConnected) {
            fetchMyGiveaways();
        }
    }, [address, isConnected, isSuccess]);

    const handleWithdraw = async (uuid: string, isExpired: boolean) => {
        try {
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
            const action = isExpired ? "Withdraw" : "Cancel";
            alert(`${action} failed: ` + (e.message || "Unknown error"));
        }
    };

    if (!isConnected) {
        return (
            <div className="w-full max-w-md mx-auto pt-20 px-4 text-center">
                <p className="text-gray-400">Please connect your wallet to view your dashboard.</p>
            </div>
        )
    }

    return (
        <div className="w-full max-w-md mx-auto space-y-8 pt-8 px-4 animate-fade-up">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
                    Creator <span className="text-blue-500">Dashboard</span>
                </h1>
                <p className="text-gray-400 font-medium text-sm">Manage your giveaways and funds.</p>
            </div>

            <div className="space-y-4">
                {error && (
                    <div className="glass-card p-4 bg-red-500/10 border border-red-500/20 text-center">
                        <p className="text-red-300 text-sm">{error}</p>
                        <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-xs text-red-200 transition-colors">Retry</button>
                    </div>
                )}
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="glass-card p-4 h-32 animate-pulse bg-white/5"></div>
                        ))}
                    </div>
                ) : giveaways.length === 0 ? (
                    <div className="text-center p-8 text-gray-500 glass-card">You haven't created any giveaways yet.</div>
                ) : (
                    giveaways.map((g) => {
                        const now = Date.now() / 1000;
                        const isExpired = Number(g.expiresAt) > 0 && now > Number(g.expiresAt);
                        const isFullyClaimed = Number(g.claimedCount) >= Number(g.maxClaims);
                        const remaining = Number(g.maxClaims) - Number(g.claimedCount);
                        const isActive = g.isActive; // From API (checked from contract)
                        const canWithdraw = isExpired && remaining > 0 && isActive;
                        const canCancel = isActive && !isExpired && !isFullyClaimed;

                        // Status Label
                        let statusLabel = "Active";
                        let statusColor = "text-green-400";
                        if (!isActive) {
                            statusLabel = "Ended";
                            statusColor = "text-gray-400";
                        } else if (isFullyClaimed) {
                            statusLabel = "Fully Claimed";
                            statusColor = "text-blue-400";
                        } else if (isExpired) {
                            statusLabel = "Expired";
                            statusColor = "text-red-400";
                        }

                        return (
                            <div key={g.id} className="glass-card p-5 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className={`text-xs font-bold uppercase tracking-wider ${statusColor} bg-white/5 px-2 py-1 rounded`}>
                                            {statusLabel}
                                        </span>
                                        <h3 className="text-white font-bold text-lg mt-2">{formatEther(BigInt(g.rewardPerClaim))} ETH / person</h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-gray-500 font-mono">ID: {g.id.slice(0, 8)}...</p>
                                        <p className="text-sm text-gray-300 font-bold mt-1">
                                            {g.claimedCount.toString()} / {g.maxClaims.toString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2 border-t border-white/5">
                                    <button
                                        onClick={() => router.push(`/baget/${g.id}`)}
                                        className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm text-gray-300 transition-colors"
                                    >
                                        View
                                    </button>

                                    {canCancel && (
                                        <button
                                            onClick={() => handleWithdraw(g.id, false)}
                                            disabled={isTxPending || isConfirming}
                                            className="flex-1 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                                        >
                                            {isTxPending || isConfirming ? "Processing..." : "Cancel & Refund"}
                                        </button>
                                    )}

                                    {canWithdraw && (
                                        <button
                                            onClick={() => handleWithdraw(g.id, true)}
                                            disabled={isTxPending || isConfirming}
                                            className="flex-1 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                                        >
                                            {isTxPending || isConfirming ? "Processing..." : "Withdraw Funds"}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div >
    );
}
