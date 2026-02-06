"use client";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export default function AboutPage() {
    return (
        <div className="w-full space-y-5 pt-4 animate-fade-up">
            <div className="text-center space-y-1">
                <h1 className="text-2xl font-extrabold text-white tracking-tight">
                    About <span className="text-gradient-blue">Base Kaget</span>
                </h1>
                <p className="text-gray-500 text-sm">Instant, fair crypto giveaways</p>
            </div>

            <div className="space-y-4">
                {/* What is it */}
                <section className="glass-card p-5 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">🎁</span>
                        </div>
                        <h2 className="text-base font-bold text-white">What is Base Kaget?</h2>
                    </div>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Base Kaget is a "Flash Gift" (Kaget) platform built on Base, inspired by Dana Kaget from Indonesian e-wallet. It allows anyone to distribute ETH to Farcaster users via a simple link.
                    </p>
                </section>

                {/* How it works */}
                <section className="glass-card p-5 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">⚡</span>
                        </div>
                        <h2 className="text-base font-bold text-white">How it Works</h2>
                    </div>
                    <div className="space-y-2.5">
                        {[
                            { step: "1", text: "Create a giveaway with amount and number of claims" },
                            { step: "2", text: "Share the link on Farcaster" },
                            { step: "3", text: "Users click to claim instantly (FCFS)" },
                            { step: "4", text: "One claim per Farcaster ID" },
                            { step: "5", text: "Unclaimed funds can be withdrawn after expiry" },
                        ].map((item) => (
                            <div key={item.step} className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-[10px] font-bold text-blue-400">{item.step}</span>
                                </div>
                                <p className="text-gray-400 text-sm">{item.text}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Features */}
                <section className="glass-card p-5 space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-lg">🛡️</span>
                        </div>
                        <h2 className="text-base font-bold text-white">Features</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { icon: "🔐", label: "Secure on-chain" },
                            { icon: "⚡", label: "Instant claims" },
                            { icon: "🆔", label: "FID-gated" },
                            { icon: "💸", label: "Low gas on Base" },
                        ].map((f) => (
                            <div key={f.label} className="bg-subtle border border-white/5 rounded-xl p-3 flex items-center gap-2">
                                <span className="text-sm">{f.icon}</span>
                                <span className="text-xs text-gray-400 font-medium">{f.label}</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Contract Info */}
                <section className="glass-card p-5 space-y-3">
                    <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Smart Contract</h2>
                    <div className="bg-black/40 p-3 rounded-xl border border-white/5 break-all font-mono text-xs text-blue-300/80">
                        {CONTRACT_ADDRESS}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-600">
                        <span className="flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Base Network
                        </span>
                        <span>Chain ID: 8453</span>
                    </div>
                </section>

                <div className="text-center pt-2 pb-4">
                    <p className="text-[10px] text-gray-600">v1.0.0 · Built for Who Love Sharing 💙</p>
                </div>
            </div>
        </div>
    );
}
