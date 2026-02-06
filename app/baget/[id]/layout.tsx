import type { Metadata } from "next";

const APP_URL = process.env.NEXT_PUBLIC_URL || "https://basekaget.tech";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const claimUrl = `${APP_URL}/baget/${id}`;

    const miniAppEmbed = JSON.stringify({
        version: "1",
        imageUrl: `${APP_URL}/api/og`,
        button: {
            title: "🎁 Claim Now",
            action: {
                type: "launch_miniapp",
                name: "Base Kaget",
                url: claimUrl,
                splashImageUrl: `${APP_URL}/api/splash`,
                splashBackgroundColor: "#0B0C10",
            },
        },
    });

    const frameEmbed = JSON.stringify({
        version: "1",
        imageUrl: `${APP_URL}/api/og`,
        button: {
            title: "🎁 Claim Now",
            action: {
                type: "launch_frame",
                name: "Base Kaget",
                url: claimUrl,
                splashImageUrl: `${APP_URL}/api/splash`,
                splashBackgroundColor: "#0B0C10",
            },
        },
    });

    return {
        title: "Claim Giveaway - Base Kaget",
        description: "Fastest finger first! Claim this Base Kaget giveaway now!",
        openGraph: {
            title: "🎁 Base Kaget Giveaway",
            description: "Fastest finger first! Claim this giveaway on Base now!",
            url: claimUrl,
            images: [
                {
                    url: `${APP_URL}/api/og`,
                    width: 1200,
                    height: 630,
                    alt: "Base Kaget Giveaway",
                    type: "image/png",
                },
            ],
        },
        other: {
            "fc:miniapp": miniAppEmbed,
            "fc:frame": frameEmbed,
        },
    };
}

export default function BagetLayout({ children }: { children: React.ReactNode }) {
    return children;
}
