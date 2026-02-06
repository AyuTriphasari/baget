"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { parseEther, decodeEventLog } from "viem";
import { BaseKagetABI } from "./abi/BaseKaget";
import sdk from "@farcaster/miniapp-sdk";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  // Form State
  const [amount, setAmount] = useState("");
  const [maxClaims, setMaxClaims] = useState("");
  const [duration, setDuration] = useState("24");
  const [giveawayId, setGiveawayId] = useState<string | null>(null);
  const [context, setContext] = useState<any>(null);
  const [showProfile, setShowProfile] = useState(false);

  // Auto-connect wallet in Farcaster miniapp
  useEffect(() => {
    const load = async () => {
      try {
        const ctx = await sdk.context;
        setContext(ctx);

        // Auto-connect: the miniapp connector handles this automatically
        // but we trigger connect if not yet connected
        if (!isConnected && connectors.length > 0) {
          connect({ connector: connectors[0] });
        }
      } catch (e) {
        console.error("Failed to load context", e);
        // Fallback: still try to connect even without SDK context
        if (!isConnected && connectors.length > 0) {
          connect({ connector: connectors[0] });
        }
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Contract Write
  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const { isLoading: isConfirmingTx, isSuccess: isConfirmedTx } = useWaitForTransactionReceipt({ hash: txHash });

  const { switchChain } = useSwitchChain();
  const { chainId } = useAccount();

  const handleCreate = async () => {
    if (!amount || !maxClaims) {
      alert("Please enter amount and max claims");
      return;
    }

    if (Number(amount) <= 0 || Number(maxClaims) <= 0 || Number(duration) <= 0) {
      alert("Values must be positive numbers");
      return;
    }

    // Check Chain ID
    if (chainId !== 8453) {
      try {
        switchChain({ chainId: 8453 });
        return;
      } catch (e) {
        console.error("Failed to switch chain", e);
        alert("Please switch to Base");
        return;
      }
    }

    setGiveawayId(null);
    setTxHash(undefined); // Reset hash

    try {
      // Generate UUID and convert to BigInt
      const uuid = crypto.randomUUID();
      const idBigInt = BigInt("0x" + uuid.replace(/-/g, ""));

      const totalCost = parseEther(amount) * BigInt(maxClaims);

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: BaseKagetABI,
        functionName: "createGiveaway",
        args: [idBigInt, BigInt(maxClaims), parseEther(amount), BigInt(Math.floor(Number(duration) * 3600))],
        value: totalCost,
        chainId: 8453,
      });

      console.log("Transaction sent:", hash);
      setTxHash(hash);
      // Set ID immediately so UI can show the link once confirmed (or even before, but better wait?)
      // We'll set it here to show "pending" or just wait for receipt? 
      // The current UI logic shows success when `isSuccess` (from receipt). 
      // Let's store the ID so we can show it.
      setGiveawayId(uuid);
      setTxHash(hash);
    } catch (e: any) {
      console.error("Create Error:", e);
      alert(`Error creating giveaway: ${e.message || "Unknown error"}`);
    }
  };

  // Save to DB on success
  useEffect(() => {
    if (isConfirmedTx && giveawayId && txHash && address) {
      const saveToDb = async () => {
        try {
          const totalAmount = parseEther(amount) * BigInt(maxClaims);
          // Calculate expiration
          const expiresAt = Math.floor(Date.now() / 1000) + Math.floor(Number(duration) * 3600);

          await fetch("/api/giveaways", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: giveawayId, // UUID string
              creator: address,
              token: "0x0000000000000000000000000000000000000000",
              amount: totalAmount.toString(),
              rewardPerClaim: parseEther(amount).toString(),
              maxClaims: maxClaims,
              expiresAt: expiresAt,
              txHash: txHash
            })
          });
          console.log("Giveaway saved to DB");
        } catch (e) {
          console.error("Failed to save to DB", e);
        }
      };
      saveToDb();
    }
  }, [isConfirmedTx, giveawayId, txHash, address, amount, maxClaims, duration]);

  return (
    <div className="w-full max-w-md mx-auto space-y-8 pt-8 px-4">
      {/* Brand Header */}
      {/* Top Navbar */}
      <div className="flex items-center justify-between glass-card p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-900 p-[1px] shadow-lg shadow-blue-900/20">
            <div className="w-full h-full bg-[#0B0C10] rounded-xl flex items-center justify-center">
              <div className="w-5 h-5 bg-blue-500 rounded-full" />
            </div>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">
              Base <span className="text-blue-500">Kaget</span>
            </h1>
            <p className="text-[10px] text-gray-400 font-medium">Instant Giveaways</p>
          </div>
        </div>

        {isConnected && (
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-3 hover:bg-white/5 p-2 rounded-xl transition-colors"
            >
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Connected</span>
                <span className="text-xs font-bold font-mono text-white">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>

              {context?.user?.pfpUrl ? (
                <img
                  src={context.user.pfpUrl}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border border-white/10"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                  {address?.slice(2, 4)}
                </div>
              )}
            </button>

            {showProfile && (
              <div className="absolute right-0 top-12 w-48 glass-card p-2 z-50 animate-fade-in shadow-xl space-y-1">
                <button
                  onClick={() => window.location.href = "/dashboard"}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 text-gray-200 text-xs rounded-lg transition-colors font-medium text-left"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                  </svg>
                  My Dashboard
                </button>
                <div className="h-[1px] bg-white/10 mx-1 my-1"></div>
                <button
                  onClick={() => disconnect()}
                  className="w-full flex items-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition-colors font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  Disconnect
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {!isConnected ? (
        <div className="glass-card p-8 text-center animate-fade-up" style={{ animationDelay: '0.1s' }}>
          <div className="space-y-6">
            <div className="w-16 h-16 mx-auto bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400 mb-4 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <p className="text-gray-300 font-medium">Connecting wallet...</p>
            <p className="text-gray-500 text-sm">Please wait while we connect to your Farcaster wallet.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          {/* Wallet Bar Removed (integrated into navbar) */}

          <div className="glass-card p-6 space-y-6">
            <h2 className="text-xl font-bold text-white mb-6">Create Base Kaget</h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Reward per Person</label>
                <div className="relative group">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.001"
                    min="0"
                    step="0.0001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="glass-input w-full p-4 pl-4 pr-16 text-lg font-mono placeholder:text-gray-600 focus:outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2 py-1 bg-white/5 rounded text-xs font-bold text-gray-400 group-focus-within:text-blue-400 transition-colors">
                    ETH
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Number of Claims</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  placeholder="e.g. 10 People"
                  value={maxClaims}
                  onChange={(e) => setMaxClaims(e.target.value)}
                  className="glass-input w-full p-4 text-lg font-mono placeholder:text-gray-600 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400 ml-1">Duration (Hours)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.1"
                  step="0.1"
                  placeholder="1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="glass-input w-full p-4 text-lg font-mono placeholder:text-gray-600 focus:outline-none"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCreate}
                  disabled={isPending || isConfirmingTx}
                  className="btn-primary w-full py-4 text-lg shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                >
                  {isPending ? "Confirming in Wallet..." : isConfirmingTx ? "Transaction Pending..." : "Launch Base Kaget 🚀"}
                </button>
              </div>
            </div>
          </div>

          {isConfirmedTx && giveawayId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-[#1A1A1A] border border-white/10 rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl animate-fade-up relative">

                {/* Close Button (Optional, or just click outside? safe to have one) */}
                {/* <button onClick={() => setGiveawayId(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white">✕</button> */}

                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-10 h-10">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>

                <div className="text-center space-y-2">
                  <h3 className="font-bold text-white text-2xl">Giveaway Live!</h3>
                  <p className="text-sm text-gray-400">Your funds are secure on Base.</p>
                </div>

                <div className="bg-black/50 p-1.5 rounded-xl border border-white/10 flex items-center gap-2 pr-1.5">
                  <code className="flex-1 text-xs text-blue-300 font-mono truncate px-3">
                    {`${process.env.NEXT_PUBLIC_URL}/baget/${giveawayId}`}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_URL}/baget/${giveawayId}`);
                      alert("Copied!");
                    }}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition-colors"
                  >
                    COPY
                  </button>
                </div>

                <button
                  onClick={() => {
                    sdk.actions.composeCast({
                      text: "Fastest finger first! 💰 Claim this Base Kaget giveaway now! 👇",
                      embeds: [`${process.env.NEXT_PUBLIC_URL}/baget/${giveawayId}`],
                    });
                  }}
                  className="btn-primary w-full py-3.5 text-base flex items-center justify-center gap-2"
                >
                  <span>Share on Farcaster</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M13.5 3a.5.5 0 0 1 .5.5V11H2V3.5a.5.5 0 0 1 .5-.5h11zm-11-1A1.5 1.5 0 0 0 1 3.5V12h14V3.5A1.5 1.5 0 0 0 13.5 2h-11zM0 12.5h16a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 0 12.5z" />
                  </svg>
                </button>

                <button
                  onClick={() => {
                    setGiveawayId(null);
                    setTxHash(undefined);
                    setAmount("");
                    setMaxClaims("");
                  }}
                  className="w-full py-2 text-sm text-gray-500 hover:text-white transition-colors"
                >
                  Create Another
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
