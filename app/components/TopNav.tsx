"use client";

import { useAccount, useDisconnect } from "wagmi";
import { useState, useEffect } from "react";
import sdk from "@farcaster/miniapp-sdk";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopNav() {
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const [context, setContext] = useState<any>(null);
    const [showMenu, setShowMenu] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const load = async () => {
            try {
                const ctx = await sdk.context;
                setContext(ctx);
            } catch { }
        };
        load();
    }, []);

    // Close menu on route change
    useEffect(() => {
        setShowMenu(false);
    }, [pathname]);

    // Close menu on outside click
    useEffect(() => {
        if (!showMenu) return;
        const handleClick = () => setShowMenu(false);
        document.addEventListener("click", handleClick);
        return () => document.removeEventListener("click", handleClick);
    }, [showMenu]);

    const pageTitle = () => {
        if (pathname === "/") return null;
        if (pathname === "/find") return "Discover";
        if (pathname === "/dashboard") return "Dashboard";
        if (pathname === "/about") return "About";
        if (pathname.startsWith("/baget/")) return "Claim";
        return null;
    };

    const title = pageTitle();

    return (
        <header className="sticky top-0 z-40 w-full bg-[#0B0C10]/80 backdrop-blur-xl border-b border-white/5">
            <div className="max-w-lg mx-auto px-4">
                <div className="flex items-center justify-between h-14">
                    {/* Logo / Brand */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-shadow">
                            <span className="text-base">🎁</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-extrabold text-white tracking-tight">Base</span>
                            <span className="text-lg font-extrabold text-blue-500 tracking-tight">Kaget</span>
                        </div>
                    </Link>

                    {/* Center title for sub-pages */}
                    {title && (
                        <div className="absolute left-1/2 -translate-x-1/2">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</span>
                        </div>
                    )}

                    {/* Profile / Wallet */}
                    {isConnected ? (
                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors"
                            >
                                <div className="hidden sm:block text-right">
                                    <p className="text-[10px] text-gray-500 font-medium leading-none">
                                        {context?.user?.username ? `@${context.user.username}` : "Connected"}
                                    </p>
                                    <p className="text-xs font-bold font-mono text-white leading-tight">
                                        {address?.slice(0, 5)}…{address?.slice(-3)}
                                    </p>
                                </div>
                                {context?.user?.pfpUrl ? (
                                    <img
                                        src={context.user.pfpUrl}
                                        alt=""
                                        className="w-8 h-8 rounded-full border-2 border-blue-500/30 object-cover"
                                    />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
                                        {address?.slice(2, 4)}
                                    </div>
                                )}
                            </button>

                            {showMenu && (
                                <div className="absolute right-0 top-12 w-52 bg-[#181a24] border border-white/10 rounded-2xl p-1.5 shadow-2xl shadow-black/40 animate-fade-up">
                                    {/* Wallet Info */}
                                    <div className="px-3 py-2.5 border-b border-white/5 mb-1">
                                        <p className="text-[10px] text-gray-500 font-medium">Wallet</p>
                                        <p className="text-xs font-mono text-white mt-0.5">{address?.slice(0, 10)}…{address?.slice(-6)}</p>
                                    </div>

                                    <Link
                                        href="/dashboard"
                                        className="flex items-center gap-2.5 px-3 py-2.5 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl text-xs font-medium transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                                        </svg>
                                        My Giveaways
                                    </Link>

                                    <button
                                        onClick={() => disconnect()}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl text-xs font-medium transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                        </svg>
                                        Disconnect
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                            <span className="text-xs text-gray-500 font-medium">Connecting…</span>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
