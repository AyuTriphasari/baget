"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
            <div className="max-w-lg mx-auto px-4 pb-4">
                <nav className="pointer-events-auto flex justify-around items-center p-1.5 bg-[#14161F]/90 backdrop-blur-xl border border-white/8 shadow-[0_-4px_24px_rgba(0,0,0,0.4)] rounded-2xl">
                    <Link href="/" className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all duration-200 ${isActive("/") ? "bg-blue-500/15 text-blue-400" : "text-gray-600 hover:text-gray-400"}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={isActive("/") ? 2.5 : 1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span className="text-[9px] font-bold mt-0.5 tracking-wide">Create</span>
                    </Link>

                    <Link href="/find" className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all duration-200 ${isActive("/find") ? "bg-blue-500/15 text-blue-400" : "text-gray-600 hover:text-gray-400"}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={isActive("/find") ? 2.5 : 1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                        <span className="text-[9px] font-bold mt-0.5 tracking-wide">Find</span>
                    </Link>

                    <Link href="/about" className={`flex flex-col items-center py-2 px-4 rounded-xl transition-all duration-200 ${isActive("/about") ? "bg-blue-500/15 text-blue-400" : "text-gray-600 hover:text-gray-400"}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={isActive("/about") ? 2.5 : 1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                        <span className="text-[9px] font-bold mt-0.5 tracking-wide">About</span>
                    </Link>
                </nav>
            </div>
        </div>
    );
}
