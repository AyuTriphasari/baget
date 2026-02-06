import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

const APP_URL = process.env.NEXT_PUBLIC_URL || "https://basekaget.tech";

// Mini App embed JSON for fc:miniapp meta tag
const miniAppEmbed = JSON.stringify({
  version: "1",
  imageUrl: `${APP_URL}/api/og`,
  button: {
    title: "🎁 Launch App",
    action: {
      type: "launch_miniapp",
      name: "Base Kaget",
      url: APP_URL,
      splashImageUrl: `${APP_URL}/api/splash`,
      splashBackgroundColor: "#0B0C10",
    },
  },
});

// Backward-compatible fc:frame embed JSON
const frameEmbed = JSON.stringify({
  version: "1",
  imageUrl: `${APP_URL}/api/og`,
  button: {
    title: "🎁 Launch App",
    action: {
      type: "launch_frame",
      name: "Base Kaget",
      url: APP_URL,
      splashImageUrl: `${APP_URL}/api/splash`,
      splashBackgroundColor: "#0B0C10",
    },
  },
});

export const metadata: Metadata = {
  title: "Base Kaget - Instant Giveaways on Base",
  description: "Create and claim instant giveaways on Base. Fast, fair, first-come-first-serve rewards. Powered by Farcaster.",
  metadataBase: new URL(APP_URL),
  applicationName: "Base Kaget",
  keywords: ["Base", "Giveaway", "Farcaster", "Crypto", "Airdrop", "Web3"],
  authors: [{ name: "Base Kaget" }],
  openGraph: {
    title: "Base Kaget - Instant Giveaways",
    description: "Create and claim instant giveaways on Base. Fast, fair, first-come-first-serve! 🎁",
    url: APP_URL,
    siteName: "Base Kaget",
    images: [
      {
        url: `${APP_URL}/api/og`,
        width: 1200,
        height: 630,
        alt: "Base Kaget - Instant Giveaways on Base",
        type: "image/png",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Base Kaget - Instant Giveaways",
    description: "Create and claim instant giveaways on Base 🎁",
    images: [`${APP_URL}/api/og`],
    creator: "@basekaget",
  },
  other: {
    "fc:miniapp": miniAppEmbed,
    "fc:frame": frameEmbed,
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
