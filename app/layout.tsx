import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Base Kaget - Instant Giveaways on Base",
  description: "Create and claim instant giveaways on Base. Fast, fair, first-come-first-serve rewards. Powered by Farcaster.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || 'https://basekaget.tech'),
  applicationName: "Base Kaget",
  keywords: ["Base", "Giveaway", "Farcaster", "Crypto", "Airdrop", "Web3"],
  authors: [{ name: "Base Kaget" }],
  openGraph: {
    title: "Base Kaget - Instant Giveaways",
    description: "Create and claim instant giveaways on Base. Fast, fair, first-come-first-serve! 🎁",
    url: "https://basekaget.tech",
    siteName: "Base Kaget",
    images: [
      {
        url: "https://basekaget.tech/preview.svg",
        width: 1200,
        height: 630,
        alt: "Base Kaget - Instant Giveaways on Base",
        type: "image/svg+xml",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Base Kaget - Instant Giveaways",
    description: "Create and claim instant giveaways on Base 🎁",
    images: ["https://basekaget.tech/preview.svg"],
    creator: "@basekaget",
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": "https://basekaget.tech/preview.svg",
    "fc:frame:image:aspect_ratio": "1.91:1",
    "fc:frame:button:1": "🎁 Launch App",
    "fc:frame:button:1:action": "link",
    "fc:frame:button:1:target": "https://basekaget.tech",
  },
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <meta name="theme-color" content="#3B82F6" />
      </head>
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
