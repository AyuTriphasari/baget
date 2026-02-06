"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { parseEther, decodeEventLog } from "viem";
import { BaseKagetABI } from "./abi/BaseKaget";
import sdk from "@farcaster/miniapp-sdk";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  // Form State
  const [amount, setAmount] = useState("");
  const [maxClaims, setMaxClaims] = useState("");
  const [duration, setDuration] = useState("24");
  const [giveawayId, setGiveawayId] = useState<string | null>(null);

  // Auto-connect wallet in Farcaster miniapp
  useEffect(() => {
    const load = async () => {
      try {
        await sdk.context;
        if (!isConnected && connectors.length > 0) {
          connect({ connector: connectors[0] });
        }
      } catch (e) {
        console.error("Failed to load context", e);
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
    <div className="w-full space-y-6 pt-4 animate-fade-up">
      {!isConnected ? (
        <div className="glass-card p-10 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-blue-500/10 flex items-center justify-center animate-pulse-glow">
            <span className="text-4xl">🎁</span>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Welcome to Base Kaget</h2>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">Connecting to your Farcaster wallet...</p>
          </div>
          <div className="flex justify-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0s' }} />
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Hero */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Create <span className="text-gradient-blue">Giveaway</span>
            </h1>
            <p className="text-gray-500 text-sm">Drop ETH rewards for your community</p>
          </div>

          {/* Form */}
          <div className="glass-card p-6 space-y-5">
            <div className="space-y-4">
              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Reward per Person</label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.001"
                    min="0"
                    step="0.0001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="glass-input w-full p-4 pr-16 text-lg font-mono placeholder:text-gray-600 focus:outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                    ETH
                  </div>
                </div>
              </div>

              {/* Claims */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Number of Claims</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  placeholder="e.g. 10"
                  value={maxClaims}
                  onChange={(e) => setMaxClaims(e.target.value)}
                  className="glass-input w-full p-4 text-lg font-mono placeholder:text-gray-600 focus:outline-none"
                />
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Duration (Hours)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.1"
                  step="0.1"
                  placeholder="24"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="glass-input w-full p-4 text-lg font-mono placeholder:text-gray-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Summary */}
            {amount && maxClaims && (
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total Cost</span>
                  <span className="text-white font-bold font-mono">
                    {(Number(amount) * Number(maxClaims)).toFixed(6)} ETH
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Per Person</span>
                  <span className="text-blue-400 font-mono">{amount} ETH</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Slots</span>
                  <span className="text-gray-300">{maxClaims} people</span>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleCreate}
              disabled={isPending || isConfirmingTx}
              className="btn-primary w-full py-4 text-base"
            >
              {isPending ? "Confirming in Wallet..." : isConfirmingTx ? "Transaction Pending..." : "Launch Giveaway 🚀"}
            </button>
          </div>

          {isConfirmedTx && giveawayId && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
              <div className="bg-[#14161F] border border-white/10 rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl animate-fade-up">
                <div className="w-20 h-20 bg-green-500/15 rounded-2xl flex items-center justify-center mx-auto">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="#4ade80" className="w-10 h-10">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>

                <div className="text-center space-y-1">
                  <h3 className="font-bold text-white text-2xl">Giveaway Live! 🎉</h3>
                  <p className="text-sm text-gray-500">Share the link to start distributing rewards</p>
                </div>

                <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex items-center gap-2">
                  <code className="flex-1 text-xs text-blue-300 font-mono truncate">
                    {`${process.env.NEXT_PUBLIC_URL}/baget/${giveawayId}`}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_URL}/baget/${giveawayId}`);
                      alert("Copied!");
                    }}
                    className="px-3 py-2 bg-white/10 hover:bg-white/15 rounded-lg text-xs font-bold text-white transition-colors"
                  >
                    Copy
                  </button>
                </div>

                <button
                  onClick={() => {
                    sdk.actions.composeCast({
                      text: "Fastest finger first! 💰 Claim this Base Kaget giveaway now! 👇",
                      embeds: [`${process.env.NEXT_PUBLIC_URL}/baget/${giveawayId}`],
                    });
                  }}
                  className="btn-primary w-full py-3.5 text-sm flex items-center justify-center gap-2"
                >
                  <span>Share on Farcaster</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
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
