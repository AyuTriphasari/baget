"use client";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export default function AboutPage() {
    return (
        <div className="w-full max-w-md mx-auto space-y-8 pt-8 px-4 animate-fade-up">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-sm">
                    About <span className="text-blue-500">Base Kaget</span>
                </h1>
                <p className="text-gray-400 font-medium text-sm">Instant, fair, and fun crypto giveaways.</p>
            </div>

            <div className="space-y-6">
                {/* What is it */}
                <section className="glass-card p-6 space-y-2">
                    <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 2.625v-2.133c.758.267 1.62.42 2.504.42 2.94 0 4.168-1.138 4.168-2.548 0-1.278-1.09-2.28-2.656-2.673a5.99 5.99 0 01-1.928 3.535M7.5 12.75h3M7.5 9.75h3m-3-3h3" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-white">What is Base Kaget?</h2>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        Base Kaget is a "Flash Gift" (Kaget) platform built on Base inspired by Dana kaget from indonesian pocket. It allows anyone to distribute ETH or tokens to Farcaster users via a simple link.
                    </p>
                </section>

                {/* How it works */}
                <section className="glass-card p-6 space-y-2">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                    </div>
                    <h2 className="text-lg font-bold text-white">How it Works</h2>
                    <ul className="text-gray-400 text-sm space-y-2 list-disc pl-4">
                        <li>Create a giveaway with a specific amount and number of claims.</li>
                        <li>Share the link on Farcaster/baseapp.</li>
                        <li>Users click to claim instantly (FCFS).</li>
                        <li>One claim per Farcaster ID (FID).</li>
                        <li>Funds are secure on the Base network.</li>
                        <li>If giveaway expires, the remaining funds can be withdrawn to the creator.</li>
                        <li>Click your avatar in the top right corner to access your dashboard.</li>
                    </ul>
                </section>

                {/* Contract Info */}
                <section className="glass-card p-6 space-y-3">
                    <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Contract Address</h2>
                    <div className="bg-black/40 p-3 rounded-xl border border-white/5 break-all font-mono text-xs text-blue-300">
                        {CONTRACT_ADDRESS}
                    </div>
                    <div className="flex gap-2 text-xs text-gray-500">
                        <span>Network: Base</span>
                        <span>•</span>
                        <span>Chain ID: 8453</span>
                    </div>
                </section>

                <div className="text-center pt-4 opacity-50">
                    <p className="text-xs text-gray-600">v0.1.0 • Built for Who Love Sharing.</p>
                </div>
            </div>
        </div>
    );
}
