"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useConnect, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from "wagmi";
import { parseUnits, formatUnits, erc20Abi, createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { BaseKagetABI } from "./abi/BaseKaget";
import { useToast } from "./components/Toast";
import sdk from "@farcaster/miniapp-sdk";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.base.org"),
});

// Popular Base tokens for quick selection
const POPULAR_TOKENS = [
  { symbol: "USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as `0x${string}`, decimals: 6, icon: "💵" },
  { symbol: "DEGEN", address: "0x4ed4E862860beD51a9570b96d89aF5E1B0Efefed" as `0x${string}`, decimals: 18, icon: "🎩" },
  { symbol: "BRETT", address: "0x532f27101965dd16442E59d40670FaF5eBB142E4" as `0x${string}`, decimals: 18, icon: "🐸" },
];

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { toast } = useToast();

  // Form State
  const [amount, setAmount] = useState("");
  const [maxClaims, setMaxClaims] = useState("");
  const [duration, setDuration] = useState("24");
  const [giveawayId, setGiveawayId] = useState<string | null>(null);

  // Token State
  const [tokenType, setTokenType] = useState<"ETH" | "ERC20">("ETH");
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenError, setTokenError] = useState("");

  // Approve State
  const [approveStep, setApproveStep] = useState<"idle" | "approving" | "approved">("idle");

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

  // Fetch token info when address changes
  const fetchTokenInfo = useCallback(async (addr: string) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setTokenSymbol("");
      setTokenDecimals(18);
      setTokenError("");
      return;
    }

    setTokenLoading(true);
    setTokenError("");
    try {
      const [symbol, decimals] = await Promise.all([
        publicClient.readContract({
          address: addr as `0x${string}`,
          abi: erc20Abi,
          functionName: "symbol",
        }),
        publicClient.readContract({
          address: addr as `0x${string}`,
          abi: erc20Abi,
          functionName: "decimals",
        }),
      ]);
      setTokenSymbol(symbol as string);
      setTokenDecimals(Number(decimals));
      setTokenError("");
    } catch {
      setTokenSymbol("");
      setTokenDecimals(18);
      setTokenError("Invalid ERC20 token address");
    } finally {
      setTokenLoading(false);
    }
  }, []);

  // Debounce token address lookup
  useEffect(() => {
    if (tokenType !== "ERC20" || !tokenAddress) return;
    const timer = setTimeout(() => fetchTokenInfo(tokenAddress), 500);
    return () => clearTimeout(timer);
  }, [tokenAddress, tokenType, fetchTokenInfo]);

  // Select a popular token
  const selectPopularToken = (token: typeof POPULAR_TOKENS[0]) => {
    setTokenType("ERC20");
    setTokenAddress(token.address);
    setTokenSymbol(token.symbol);
    setTokenDecimals(token.decimals);
    setTokenError("");
    setApproveStep("idle");
  };

  // Reset token state when switching to ETH
  const selectETH = () => {
    setTokenType("ETH");
    setTokenAddress("");
    setTokenSymbol("");
    setTokenDecimals(18);
    setTokenError("");
    setApproveStep("idle");
  };

  // Current active symbol/decimals for display
  const activeSymbol = tokenType === "ETH" ? "ETH" : (tokenSymbol || "TOKEN");
  const activeDecimals = tokenType === "ETH" ? 18 : tokenDecimals;

  // Compute total cost in smallest unit
  const computeTotalCost = (): bigint | null => {
    if (!amount || !maxClaims || Number(amount) <= 0 || Number(maxClaims) <= 0) return null;
    try {
      const rewardWei = parseUnits(amount, activeDecimals);
      return rewardWei * BigInt(maxClaims);
    } catch {
      return null;
    }
  };

  const handleApprove = async () => {
    if (tokenType !== "ERC20" || !tokenAddress || !tokenSymbol) return;
    const totalCost = computeTotalCost();
    if (!totalCost) return;

    if (chainId !== 8453) {
      try { switchChain({ chainId: 8453 }); return; } catch { toast("Please switch to Base"); return; }
    }

    setApproveStep("approving");
    try {
      const hash = await writeContractAsync({
        address: tokenAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: "approve",
        args: [CONTRACT_ADDRESS, totalCost],
      });
      // Wait for approval tx to be mined
      await publicClient.waitForTransactionReceipt({ hash });
      setApproveStep("approved");
    } catch (e: any) {
      console.error("Approve Error:", e);
      setApproveStep("idle");
      toast(`Approval failed: ${e.message || "Unknown error"}`);
    }
  };

  const handleCreate = async () => {
    if (!amount || !maxClaims) {
      toast("Please enter amount and max claims");
      return;
    }

    if (Number(amount) <= 0 || Number(maxClaims) <= 0 || Number(duration) <= 0) {
      toast("Values must be positive numbers");
      return;
    }

    if (Number(amount) < 0.00001) {
      toast("Minimum reward per person is 0.00001");
      return;
    }

    if (tokenType === "ERC20" && (!tokenAddress || !tokenSymbol || tokenError)) {
      toast("Please enter a valid token address");
      return;
    }

    // Check Chain ID
    if (chainId !== 8453) {
      try {
        switchChain({ chainId: 8453 });
        return;
      } catch (e) {
        console.error("Failed to switch chain", e);
        toast("Please switch to Base");
        return;
      }
    }

    setGiveawayId(null);
    setTxHash(undefined); // Reset hash

    try {
      // Generate UUID and convert to BigInt
      const uuid = crypto.randomUUID();
      const idBigInt = BigInt("0x" + uuid.replace(/-/g, ""));

      const rewardWei = parseUnits(amount, activeDecimals);
      const totalCost = rewardWei * BigInt(maxClaims);
      const durationSecs = BigInt(Math.floor(Number(duration) * 3600));

      let hash: `0x${string}`;

      if (tokenType === "ETH") {
        // Native ETH giveaway
        hash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: BaseKagetABI,
          functionName: "createGiveaway",
          args: [idBigInt, BigInt(maxClaims), rewardWei, durationSecs],
          value: totalCost,
        });
      } else {
        // ERC20 giveaway — approval must be done first
        if (approveStep !== "approved") {
          toast("Please approve the token first");
          return;
        }
        hash = await writeContractAsync({
          address: CONTRACT_ADDRESS,
          abi: BaseKagetABI,
          functionName: "createGiveawayERC20",
          args: [idBigInt, tokenAddress as `0x${string}`, BigInt(maxClaims), rewardWei, durationSecs],
        });
      }

      console.log("Transaction sent:", hash);
      setGiveawayId(uuid);
      setTxHash(hash);
    } catch (e: any) {
      console.error("Create Error:", e);
      toast(`Error creating giveaway: ${e.message || "Unknown error"}`);
    }
  };

  // Save to DB on success
  useEffect(() => {
    if (isConfirmedTx && giveawayId && txHash && address) {
      const saveToDb = async () => {
        try {
          const rewardWei = parseUnits(amount, activeDecimals);
          const totalAmount = rewardWei * BigInt(maxClaims);
          // Calculate expiration
          const expiresAt = Math.floor(Date.now() / 1000) + Math.floor(Number(duration) * 3600);

          await fetch("/api/giveaways", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: giveawayId, // UUID string
              creator: address,
              token: tokenType === "ETH" ? ZERO_ADDRESS : tokenAddress,
              amount: totalAmount.toString(),
              rewardPerClaim: rewardWei.toString(),
              maxClaims: maxClaims,
              expiresAt: expiresAt,
              txHash: txHash,
              tokenSymbol: tokenType === "ETH" ? "ETH" : tokenSymbol,
              tokenDecimals: activeDecimals,
            })
          });
          console.log("Giveaway saved to DB");
        } catch (e) {
          console.error("Failed to save to DB", e);
        }
      };
      saveToDb();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfirmedTx, giveawayId, txHash, address]);

  // Reset approve step when token/amount changes
  useEffect(() => {
    setApproveStep("idle");
  }, [tokenAddress, amount, maxClaims]);

  const totalCost = computeTotalCost();
  const isERC20Ready = tokenType === "ERC20" && tokenSymbol && !tokenError && !tokenLoading;

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
            <p className="text-gray-500 text-sm">Drop rewards for your community</p>
          </div>

          {/* Form */}
          <div className="glass-card p-6 space-y-5">
            <div className="space-y-4">

              {/* Token Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Token</label>
                <div className="flex gap-2">
                  <button
                    onClick={selectETH}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all border ${tokenType === "ETH"
                      ? "bg-blue-500/15 border-blue-500/30 text-blue-400"
                      : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
                      }`}
                  >
                    ⟠ ETH
                  </button>
                  <button
                    onClick={() => setTokenType("ERC20")}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-bold transition-all border ${tokenType === "ERC20"
                      ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
                      : "bg-white/5 border-white/10 text-gray-500 hover:text-gray-300"
                      }`}
                  >
                    🪙 Token
                  </button>
                </div>

                {/* Popular Tokens + Address Input */}
                {tokenType === "ERC20" && (
                  <div className="space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      {POPULAR_TOKENS.map((t) => (
                        <button
                          key={t.address}
                          onClick={() => selectPopularToken(t)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${tokenAddress === t.address
                            ? "bg-purple-500/15 border-purple-500/30 text-purple-400"
                            : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20"
                            }`}
                        >
                          {t.icon} {t.symbol}
                        </button>
                      ))}
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Or paste token address (0x...)"
                        value={tokenAddress}
                        onChange={(e) => {
                          setTokenAddress(e.target.value);
                          setApproveStep("idle");
                        }}
                        className="glass-input w-full p-3 text-sm font-mono placeholder:text-gray-600 focus:outline-none"
                      />
                      {tokenLoading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    {tokenError && (
                      <p className="text-red-400 text-xs ml-1">{tokenError}</p>
                    )}
                    {tokenSymbol && !tokenError && (
                      <div className="flex items-center gap-2 ml-1">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-xs text-green-400 font-bold">{tokenSymbol}</span>
                        <span className="text-xs text-gray-600">({tokenDecimals} decimals)</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Reward per Person</label>
                <div className="relative">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder={tokenType === "ETH" ? "0.001" : "10"}
                    min="0.00001"
                    step="any"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="glass-input w-full p-4 pr-20 text-lg font-mono placeholder:text-gray-600 focus:outline-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
                    {activeSymbol}
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
                    {totalCost ? formatUnits(totalCost, activeDecimals) : "—"} {activeSymbol}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Per Person</span>
                  <span className="text-blue-400 font-mono">{amount} {activeSymbol}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Slots</span>
                  <span className="text-gray-300">{maxClaims} people</span>
                </div>
              </div>
            )}

            {/* Approve + Submit Buttons */}
            {tokenType === "ERC20" && isERC20Ready && approveStep !== "approved" ? (
              <button
                onClick={handleApprove}
                disabled={isPending || approveStep === "approving" || !totalCost}
                className="btn-primary w-full py-4 text-base"
              >
                {approveStep === "approving" ? "Approving..." : `Approve ${tokenSymbol}`}
              </button>
            ) : (
              <button
                onClick={handleCreate}
                disabled={isPending || isConfirmingTx || (tokenType === "ERC20" && approveStep !== "approved")}
                className="btn-primary w-full py-4 text-base"
              >
                {isPending ? "Confirming in Wallet..." : isConfirmingTx ? "Transaction Pending..." : "Launch Giveaway 🚀"}
              </button>
            )}
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
                      toast("Copied!", "success");
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
                    setApproveStep("idle");
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
