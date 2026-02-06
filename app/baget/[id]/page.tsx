"use client";

import { useEffect, useState, use, useCallback, useRef } from "react";
import sdk from "@farcaster/miniapp-sdk";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConnect } from "wagmi";
import { formatUnits } from "viem";
import { BaseKagetABI } from "../../abi/BaseKaget";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export default function ClaimPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { address, isConnected } = useAccount();
    const { connect, connectors } = useConnect();

    const [context, setContext] = useState<any>(null);
    const [signature, setSignature] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [isClaimingAPI, setIsClaimingAPI] = useState(false);

    // Data State
    const [giveaway, setGiveaway] = useState<any>(null);
    const [winnersList, setWinnersList] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [dataError, setDataError] = useState("");

    // Initialize Frame SDK and auto-connect
    useEffect(() => {
        const load = async () => {
            try {
                const context = await sdk.context;
                setContext(context);
                sdk.actions.ready();

                // Auto-connect wallet via miniapp connector
                if (!isConnected && connectors.length > 0) {
                    connect({ connector: connectors[0] });
                }
            } catch (err) {
                console.error("SDK Init Error:", err);
                sdk.actions.ready();
                // Still try to connect even without SDK context
                if (!isConnected && connectors.length > 0) {
                    connect({ connector: connectors[0] });
                }
            }
        };
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch API Data
    const fetchGiveawayData = useCallback(async (fresh = false) => {
        if (!id) return;
        try {
            const url = fresh
                ? `/api/giveaways?id=${id}&fresh=1`
                : `/api/giveaways?id=${id}`;
            const res = await fetch(url);
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

    // Auto-refresh when tab becomes visible
    useEffect(() => {
        const handleVisibility = () => {
            if (document.visibilityState === "visible") {
                fetchGiveawayData(true);
            }
        };
        document.addEventListener("visibilitychange", handleVisibility);
        return () => document.removeEventListener("visibilitychange", handleVisibility);
    }, [fetchGiveawayData]);

    // Check if already claimed (Client side check from winners list)
    // We assume the DB is up to date. If not, contract will revert anyway (safe).
    const fid = context?.user?.fid;
    const hasClaimed = winnersList.some(w => w.fid === fid?.toString());

    // Contract Write to Claim
    const { data: hash, writeContract, isPending: isTxPending } = useWriteContract();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

    // Ref to prevent double-firing of record call
    const recordedRef = useRef(false);

    // Handle Success - record claim with retry logic
    useEffect(() => {
        if (isSuccess && giveaway && address && fid && !hasClaimed && !recordedRef.current) {
            recordedRef.current = true;
            const recordClaim = async (attempt = 1): Promise<void> => {
                const MAX_RETRIES = 3;
                const RETRY_DELAY = 2000; // 2s between retries

                try {
                    const res = await fetch("/api/claim/record", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            giveawayId: giveaway.id,
                            fid: fid.toString(),
                            txHash: hash!,
                            amount: giveaway.rewardPerClaim
                        })
                    });

                    if (!res.ok && attempt < MAX_RETRIES) {
                        console.warn(`Record attempt ${attempt} failed (${res.status}), retrying...`);
                        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
                        return recordClaim(attempt + 1);
                    }

                    // Refetch data with fresh contract data (bypass cache)
                    fetchGiveawayData(true);
                } catch (e) {
                    console.error(`Record attempt ${attempt} error:`, e);
                    if (attempt < MAX_RETRIES) {
                        await new Promise(r => setTimeout(r, RETRY_DELAY * attempt));
                        return recordClaim(attempt + 1);
                    }
                    // After all retries fail, still refetch - the auto-sync on the API
                    // will pick up the missing record from on-chain events
                    console.error("All record retries failed. Auto-sync will backfill.");
                    fetchGiveawayData(true);
                }
            };
            recordClaim();
        }
    }, [isSuccess, giveaway, address, fid, hasClaimed, hash, fetchGiveawayData]);

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
            <div className="w-full pt-8 text-center animate-fade-up">
                <div className="glass-card p-8 space-y-4">
                    <div className="w-14 h-14 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
                        <span className="text-2xl">❌</span>
                    </div>
                    <h3 className="text-white font-bold">Error Loading Giveaway</h3>
                    <p className="text-red-400/80 text-xs font-mono">{dataError}</p>
                    <button onClick={() => window.location.reload()} className="btn-primary px-6 py-2.5 text-sm">Try Again</button>
                </div>
            </div>
        );
    }

    if (loadingData || !giveaway) {
        return (
            <div className="w-full pt-8 space-y-4">
                <div className="skeleton h-8 w-40 mx-auto"></div>
                <div className="skeleton h-72 w-full"></div>
                <div className="skeleton h-24 w-full"></div>
            </div>
        );
    }

    const { creator, token, rewardPerClaim, maxClaims, expiresAt, isActive, claimedCount } = giveaway;
    const isExpired = expiresAt > 0 && Date.now() / 1000 > Number(expiresAt);
    const isFull = Number(claimedCount) >= Number(maxClaims);
    const isClaimable = isActive && !isExpired && !isFull && !hasClaimed;
    const claimPct = Number(maxClaims) > 0 ? (Number(claimedCount) / Number(maxClaims)) * 100 : 0;

    // Time remaining
    let timeLeft = "";
    if (isActive && !isExpired && Number(expiresAt) > 0) {
        const secs = Number(expiresAt) - Date.now() / 1000;
        if (secs > 3600) timeLeft = `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m left`;
        else if (secs > 60) timeLeft = `${Math.floor(secs / 60)}m left`;
        else timeLeft = `${Math.floor(secs)}s left`;
    }

    return (
        <div className="w-full space-y-5 pt-4 pb-8 animate-fade-up">
            {/* Header */}
            <div className="text-center space-y-1">
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em]">Fastest Finger First</p>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                    Claim <span className="text-gradient-blue">Reward</span>
                </h1>
            </div>

            <div className="glass-card overflow-hidden">
                {/* Status Banner */}
                <div className={`px-5 py-3 flex items-center justify-between ${isClaimable ? "bg-blue-500/10" :
                    hasClaimed ? "bg-green-500/10" :
                        "bg-subtle"
                    }`}>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isClaimable ? "bg-blue-400 animate-pulse" : hasClaimed ? "bg-green-400" : "bg-gray-500"}`} />
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-300">
                            {!isActive ? "Ended" : isFull ? "Sold Out" : isExpired ? "Expired" : hasClaimed ? "Claimed ✓" : "Live"}
                        </span>
                    </div>
                    {timeLeft && (
                        <span className="text-[10px] text-gray-500 font-mono">{timeLeft}</span>
                    )}
                </div>

                <div className="p-5 space-y-5">
                    {/* Reward Amount - Big */}
                    <div className="text-center py-4">
                        <p className="text-4xl font-extrabold text-white tracking-tight">{formatUnits(BigInt(rewardPerClaim), giveaway.tokenDecimals ?? 18)}</p>
                        <p className="text-sm text-gray-500 font-bold mt-1">{giveaway.tokenSymbol ?? "ETH"} per person</p>
                    </div>

                    {/* Progress */}
                    <div className="space-y-2">
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ${isFull ? "bg-blue-500" : claimPct > 80 ? "bg-orange-500" : "bg-blue-500"}`}
                                style={{ width: `${Math.min(claimPct, 100)}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500">{Number(claimedCount)} / {Number(maxClaims)} claimed</span>
                            <span className="text-gray-600">{Math.round(claimPct)}%</span>
                        </div>
                    </div>

                    {/* Creator Info */}
                    <div className="bg-black/30 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] text-white font-bold flex-shrink-0">
                            {creator?.slice(2, 4)}
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] text-gray-500 font-medium">Created by</p>
                            <p className="text-xs text-white font-mono truncate">{creator}</p>
                        </div>
                    </div>

                    {/* Claimed success */}
                    {hasClaimed && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 text-center space-y-2">
                            <div className="w-14 h-14 bg-green-500/15 rounded-2xl flex items-center justify-center mx-auto">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#4ade80" className="w-7 h-7">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                            </div>
                            <p className="text-white font-bold text-lg">Claimed!</p>
                            <p className="text-green-300/60 text-xs">Reward sent to your wallet</p>
                        </div>
                    )}

                    {/* Claim Button */}
                    {!hasClaimed && (
                        <>
                            {!context ? (
                                <div className="bg-black/20 rounded-xl border border-dashed border-white/10 p-6 text-center space-y-2">
                                    <span className="text-2xl">⚠️</span>
                                    <p className="text-gray-400 text-sm font-medium">Open in Farcaster to claim</p>
                                </div>
                            ) : !isConnected ? (
                                <button onClick={() => connect({ connector: connectors[0] })} className="btn-primary w-full py-4 text-sm">
                                    Connect Wallet to Claim
                                </button>
                            ) : (
                                <button
                                    onClick={handleClaim}
                                    disabled={!isClaimable || isClaimingAPI || isTxPending || isConfirming}
                                    className="btn-primary w-full py-4 text-base disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    {isConfirming ? "Confirming..."
                                        : isTxPending ? "Check Wallet..."
                                            : isClaimingAPI ? "Checking Eligibility..."
                                                : isFull ? "Sold Out"
                                                    : isExpired ? "Expired"
                                                        : "Claim Reward 💰"}
                                </button>
                            )}
                        </>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                            <p className="text-xs text-red-300 leading-relaxed">{error}</p>
                        </div>
                    )}

                    {isSuccess && !hasClaimed && (
                        <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl text-center">
                            <p className="text-blue-400 font-bold text-sm">Transaction Confirmed!</p>
                            <p className="text-blue-300/60 text-xs mt-0.5">Recording status...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Winners */}
            <WinnersList winners={winnersList} tokenSymbol={giveaway.tokenSymbol ?? "ETH"} tokenDecimals={giveaway.tokenDecimals ?? 18} />
        </div>
    );
}

function WinnersList({ winners, tokenSymbol, tokenDecimals }: { winners: any[]; tokenSymbol: string; tokenDecimals: number }) {
    if (!winners || winners.length === 0) {
        return (
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-gray-500 ml-1 flex items-center gap-2">
                    Winners <span className="badge-info px-2 py-0.5 rounded-lg text-[10px] font-bold">0</span>
                </h3>
                <div className="glass-card p-8 text-center space-y-2">
                    <span className="text-2xl">🏆</span>
                    <p className="text-gray-500 text-sm">No one has claimed yet. Be the first!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-500 ml-1 flex items-center gap-2">
                Winners <span className="badge-info px-2 py-0.5 rounded-lg text-[10px] font-bold">{winners.length}</span>
            </h3>
            <div className="space-y-2">
                {winners.map((w, idx) => (
                    <div key={`${w.txHash}-${idx}`} className="glass-card p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="relative flex-shrink-0">
                                {w.avatarUrl ? (
                                    <img src={w.avatarUrl} alt={w.username} className="w-9 h-9 rounded-full border border-white/10 object-cover" />
                                ) : (
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-[10px] text-white font-bold">
                                        {w.fid}
                                    </div>
                                )}
                                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#14161F] rounded-full flex items-center justify-center">
                                    <span className="text-[8px]">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}</span>
                                </div>
                            </div>
                            <div className="min-w-0">
                                <p className="text-white text-sm font-bold truncate">{w.username || `FID ${w.fid}`}</p>
                                <a
                                    href={`${process.env.NEXT_PUBLIC_BASESCAN_URL || "https://basescan.org"}/tx/${w.txHash}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] text-gray-600 hover:text-blue-400 transition-colors font-mono"
                                >
                                    {w.txHash?.slice(0, 10)}…
                                </a>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="text-green-400 font-bold text-sm font-mono">+{formatUnits(BigInt(w.amount || 0), tokenDecimals)}</p>
                            <p className="text-[10px] text-gray-600">{tokenSymbol}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
