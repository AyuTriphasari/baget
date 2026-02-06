"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function BottomNav() {
    const pathname = usePathname();

    const isActive = (path: string) => pathname === path;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 max-w-lg mx-auto pointer-events-none">
            <nav className="glass-card flex justify-around items-center p-2 pointer-events-auto bg-[#1A1A1A]/80 backdrop-blur-md border-white/10 shadow-lg rounded-2xl">
                <Link href="/" className={`flex flex-col items-center p-2 rounded-xl transition-all duration-300 w-16 ${isActive("/") ? "bg-blue-500/20 text-blue-400" : "text-gray-500 hover:text-gray-300"}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                    <span className="text-[10px] font-medium mt-1">Home</span>
                </Link>

                <Link href="/find" className={`flex flex-col items-center p-2 rounded-xl transition-all duration-300 w-16 ${isActive("/find") ? "bg-blue-500/20 text-blue-400" : "text-gray-500 hover:text-gray-300"}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <span className="text-[10px] font-medium mt-1">Find</span>
                </Link>

                <Link href="/about" className={`flex flex-col items-center p-2 rounded-xl transition-all duration-300 w-16 ${isActive("/about") ? "bg-blue-500/20 text-blue-400" : "text-gray-500 hover:text-gray-300"}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    <span className="text-[10px] font-medium mt-1">About</span>
                </Link>
            </nav>
        </div>
    );
}
