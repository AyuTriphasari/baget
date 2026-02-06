import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Base Kaget - Farcaster Giveaway",
  description: "Create and claim instant giveaways on Base. Fast, fair, first-come-first-serve rewards.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || 'https://basekaget.tech'),
  openGraph: {
    title: "Base Kaget",
    description: "Create and claim instant giveaways on Base",
    url: "https://basekaget.tech",
    siteName: "Base Kaget",
    images: [
      {
        url: "/preview.png",
        width: 1200,
        height: 630,
        alt: "Base Kaget - Instant Giveaways",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Base Kaget",
    description: "Create and claim instant giveaways on Base",
    images: ["/preview.png"],
  },
  other: {
    "fc:frame": "vNext",
    "fc:frame:image": `${process.env.NEXT_PUBLIC_URL || 'https://basekaget.tech'}/preview.png`,
    "fc:frame:button:1": "Launch App",
    "fc:frame:button:1:action": "link",
    "fc:frame:button:1:target": `${process.env.NEXT_PUBLIC_URL || 'https://basekaget.tech'}`,
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
