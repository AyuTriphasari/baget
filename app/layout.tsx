import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Base Kaget - Farcaster Giveaway",
  description: "Create and claim giveaways on Base",
};

import FrameInit from "./components/FrameInit";
import BottomNav from "./components/BottomNav";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <FrameInit />
          <BottomNav />
          <main className="min-h-screen w-full flex flex-col items-center p-4 sm:p-8 pb-24 max-w-lg mx-auto">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
