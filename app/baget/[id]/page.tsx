"use client";

import { useEffect, useState, use, useCallback } from "react";
import sdk from "@farcaster/miniapp-sdk";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { formatEther } from "viem";
import { BaseKagetABI } from "../../abi/BaseKaget";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export default function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { address, isConnected } = useAccount();
    const { connect } = useConnect();

    const [context, setContext] = useState<any>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [isClaimingAPI, setIsClaimingAPI] = useState(false);

    // Data State
    const [giveaway, setGiveaway] = useState<any>(null);
    const [winnersList, setWinnersList] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [dataError, setDataError] = useState("");

    // Initialize Frame SDK
    useEffect(() => {
        const load = async () => {
            try {
                const context = await sdk.context;
                setContext(context);
                sdk.actions.ready();
            } catch (err) {
                console.error("SDK Init Error:", err);
                sdk.actions.ready();
            }
        };
        load();
    }, []);

    // Fetch API Data
    const fetchGiveawayData = useCallback(async () => {
        if (!id) return;
        try {
            const res = await fetch(`/api/giveaways?id=${id}`);
            if (!res.ok) throw new Error("Giveaway not found");
            const data = await res.json();
            setGiveaway(data);
            setWinnersList(data.winners || []);
        } catch (e: any) {
            console.error("Fetch Error:", e);
            setDataError(e.message);
        } finally {
            setLoadingData(false);
        }
    }, [id]);

    useEffect(() => {
        fetchGiveawayData();
    }, [fetchGiveawayData]);

    // Check if already claimed (Client side check from winners list)
    // We assume the DB is up to date. If not, contract will revert anyway (safe).
    const fid = context?.user?.fid;
    const hasClaimed = winnersList.some(w => w.fid === fid?.toString());

    // Contract Write to Claim
    const { data: hash, writeContract, isPending: isTxPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Handle Success
    useEffect(() => {
        if (isSuccess && giveaway && address && fid && !hasClaimed) {
            const recordClaim = async () => {
                try {
                    await fetch("/api/claim/record", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            giveawayId: giveaway.id,
                            fid: fid.toString(),
                            txHash: hash!,
                            amount: giveaway.rewardPerClaim
                        })
                    });
                    // Refetch data to update UI
                    fetchGiveawayData();
                } catch (e) {
                    console.error("Failed to record claim", e);
                }
            };
            recordClaim();
        }
    }, [isSuccess]);

    const handleClaim = async () => {
        if (!context || !address || !giveaway) return;
        setIsClaimingAPI(true);
        setError("");

        try {
            // 1. Get signature from backend
            const res = await fetch("/api/claim", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    giveawayId: giveaway.id,
                    fid: context.user.fid,
                    address: address
                }),
            });

            if (!res.ok) throw new Error(await res.text());
            const { signature } = await res.json();
            setSignature(signature);

            // 2. Call Contract
            // We need BigInt ID for contract
            // If ID in DB is string "123..." we need to parse it. 
            // The ID stored in DB is the UUID string from creation (which is what we put in URL).
            // Wait, we store the UUID string in DB as `id`.
            // But the contract expects `uint256` ID.
            // In creation, we did: `idBigInt = BigInt("0x" + uuid.replace(/-/g, ""))`
            // So we need to reconstruct that BigInt from the UUID string `giveaway.id`.

            let idBigInt: bigint;
            if (giveaway.id.includes("-")) {
                idBigInt = BigInt("0x" + giveaway.id.replace(/-/g, ""));
            } else {
                idBigInt = BigInt(giveaway.id);
            }

            writeContract({
                address: CONTRACT_ADDRESS,
                abi: BaseKagetABI,
                functionName: "claim",
                args: [idBigInt, BigInt(context.user.fid), signature],
            });

        } catch (e: any) {
            setError(e.message || "Failed to claim");
        } finally {
            setIsClaimingAPI(false);
        }
    };


    if (dataError) {
        return (
            <div className="w-full max-w-md mx-auto pt-8 px-4 text-center animate-fade-up">
                <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl space-y-4">
                    <h3 className="text-white font-bold">Error Loading Giveaway</h3>
                    <p className="text-red-300 text-xs mt-2 font-mono">{dataError}</p>
                    <button onClick={() => window.location.reload()} className="btn-primary w-full py-2 text-sm">Try Again</button>
                </div>
            </div>
        );
    }

    // Loading State
    if (loadingData || !giveaway) {
        return (
            <div className="w-full max-w-md mx-auto pt-8 px-4 animate-pulse space-y-6">
                <div className="h-8 bg-blue-500/20 rounded-xl w-48 mx-auto"></div>
                <div className="glass-card p-6 h-64"></div>
            </div>
        );
    }

    const { creator, token, rewardPerClaim, maxClaims, expiresAt, isActive, claimedCount } = giveaway;
    const isExpired = expiresAt > 0 && Date.now() / 1000 > Number(expiresAt);
    const isFull = Number(claimedCount) >= Number(maxClaims);
    const isClaimable = isActive && !isExpired && !isFull && !hasClaimed;

    return (
        <div className="w-full max-w-md mx-auto space-y-6 pt-8 px-4 pb-12">
            {/* Header */}
            <div className="text-center space-y-1 animate-fade-up">
                <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
                    Base <span className="text-blue-500">Kaget</span>
                </h1>
                <p className="text-xs text-blue-300 font-mono tracking-widest uppercase">Fastest Finger First</p>
            </div>

            <div className="glass-card p-6 space-y-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
                {/* Status Banner */}
                <div className={`text-center p-3 rounded-xl border flex items-center justify-center gap-2 ${isClaimable ? "bg-blue-500/10 border-blue-500/30 text-blue-200" :
                    isActive ? "bg-white/5 border-white/10 text-gray-400" :
                        "bg-red-500/10 border-red-500/30 text-red-300"
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${isClaimable ? "bg-blue-400 animate-pulse" : isActive ? "bg-gray-500" : "bg-red-500"}`} />
                    <span className="font-bold text-sm tracking-wide uppercase">
                        {isActive ? (isFull ? "Max Claimed" : "Active Giveaway") : "Ended"}
                    </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/40 p-4 rounded-xl text-center border border-white/5">
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Reward</p>
                        <div className="flex items-end justify-center gap-1">
                            <p className="text-xl font-bold text-white leading-none">{formatEther(BigInt(rewardPerClaim))}</p>
                            <span className="text-xs text-gray-500 font-bold mb-[2px]">ETH</span>
                        </div>
                    </div>
                    <div className="bg-black/40 p-4 rounded-xl text-center border border-white/5">
                        <p className="text-gray-500 text-[10px] uppercase font-bold mb-1 tracking-wider">Claimed</p>
                        <div className="flex items-end justify-center gap-1">
                            <p className="text-xl font-bold text-white leading-none">{Number(claimedCount)}</p>
                            <span className="text-gray-500 text-sm mb-[2px]">/</span>
                            <span className="text-gray-500 text-sm mb-[2px]">{Number(maxClaims)}</span>
                        </div>
                    </div>
                </div>

                {hasClaimed && (
                    <div className="flex flex-col items-center justify-center p-6 bg-green-500/10 rounded-xl border border-green-500/20">
                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="#4ade80" className="w-6 h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                        </div>
                        <p className="text-white font-bold text-lg">Claim Successful!</p>
                        <p className="text-green-200/60 text-xs">Reward sent to your wallet.</p>
                    </div>
                )}

                {!context ? (
                    <div className="text-center p-8 bg-black/20 rounded-xl border border-dashed border-white/10 space-y-4">
                        <div className="w-12 h-12 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto text-yellow-500">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                        </div>
                        <p className="text-white font-medium">Context Not Found</p>
                    </div>
                ) : !isConnected ? (
                    <button onClick={() => connect({ connector: injected() })} className="btn-primary w-full py-3 bg-white/5 hover:bg-white/10 border-white/10">
                        Connect Wallet to Claim
                    </button>
                ) : (
                    <button
                        onClick={handleClaim}
                        disabled={!isClaimable || isClaimingAPI || isTxPending || isConfirming}
                        className={`btn-primary w-full py-4 text-lg shadow-lg ${!isClaimable ? "opacity-50 grayscale cursor-not-allowed shadow-none" : "shadow-blue-500/20 hover:shadow-blue-500/40"}`}
                    >
                        {isConfirming ? "Confirming..."
                            : isTxPending ? "Check Wallet..."
                                : isClaimingAPI ? "Checking Eligibility..."
                                    : isFull ? "Sold Out"
                                        : isExpired ? "Expired"
                                            : hasClaimed ? "Already Claimed"
                                                : "Claim Reward 💰"}
                    </button>
                )}

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3">
                        <div className="text-xs text-red-200 leading-relaxed">{error}</div>
                    </div>
                )}

                {isSuccess && !hasClaimed && (
                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl text-center">
                        <p className="text-blue-400 font-bold text-sm">Transaction Confirmed!</p>
                        <p className="text-blue-300/60 text-xs mt-1">Recording status...</p>
                    </div>
                )}
            </div>

            {/* Winners List */}
            <WinnersList winners={winnersList} />
        </div>
    );
}

function WinnersList({ winners }: { winners: any[] }) {
    if (!winners || winners.length === 0) {
        return (
            <div className="space-y-4 animate-fade-up" style={{ animationDelay: '0.2s' }}>
                <h3 className="text-white font-bold ml-1 flex items-center gap-2">
                    Winner History <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-full">0</span>
                </h3>
                <div className="glass-card p-6 text-center text-gray-500 text-sm">
                    No one has claimed this yet. Be the first!
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4 animate-fade-up" style={{ animationDelay: '0.2s' }}>
            <h3 className="text-white font-bold ml-1 flex items-center gap-2">
                Winner History <span className="bg-blue-500/20 text-blue-300 text-[10px] px-2 py-0.5 rounded-full">{winners.length}</span>
            </h3>
            <div className="space-y-2">
                {winners.map((w, idx) => (
                    <div key={`${w.txHash}-${idx}`} className="glass-card p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {w.avatarUrl ? (
                                <img src={w.avatarUrl} alt={w.username} className="w-8 h-8 rounded-full border border-white/10" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-700 to-gray-600 flex items-center justify-center text-[10px] text-white">
                                    {w.fid}
                                </div>
                            )}
                            <div>
                                <p className="text-white text-sm font-bold">{w.username}</p>
                                <p className="text-gray-500 text-[10px] font-mono">{w.fid}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-green-400 font-bold text-sm">+{formatEther(BigInt(w.amount || 0))} ETH</p>
                            <a
                                href={`${process.env.NEXT_PUBLIC_BASESCAN_URL || "https://basescan.org"}/tx/${w.txHash}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-blue-500/60 hover:text-blue-400"
                            >
                                View Tx
                            </a>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
