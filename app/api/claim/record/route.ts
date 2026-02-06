import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function fetchNeynarUser(fid: string) {
    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) return null;
    try {
        const res = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
            headers: { accept: "application/json", api_key: apiKey },
        });
        const data = await res.json();
        return data.users?.[0] || null;
    } catch (e) {
        console.error("Neynar error:", e);
        return null;
    }
}

// Input validation helpers
function isValidTxHash(hash: string): boolean {
    return typeof hash === "string" && /^0x[a-fA-F0-9]{64}$/.test(hash);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { giveawayId, fid, txHash, amount } = body;

        // Input validation
        if (!giveawayId || typeof giveawayId !== "string") {
            return NextResponse.json({ error: "Invalid giveawayId" }, { status: 400 });
        }
        if (!fid || isNaN(Number(fid)) || Number(fid) <= 0) {
            return NextResponse.json({ error: "Invalid fid" }, { status: 400 });
        }
        if (!txHash || !isValidTxHash(txHash)) {
            return NextResponse.json({ error: "Invalid txHash" }, { status: 400 });
        }
        if (!amount || isNaN(Number(amount))) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }

        // Fetch profile
        const user = await fetchNeynarUser(fid);

        // Use upsert to prevent race conditions
        const winner = await prisma.winner.upsert({
            where: {
                giveawayId_fid: {
                    giveawayId: giveawayId.toString(),
                    fid: fid.toString()
                }
            },
            update: {}, // If exists, do nothing (idempotent)
            create: {
                giveawayId: giveawayId.toString(),
                fid: fid.toString(),
                txHash,
                amount: amount.toString(),
                username: user ? `@${user.username}` : `FID: ${fid}`,
                avatarUrl: user ? user.pfp_url : "",
            },
        });

        return NextResponse.json(winner);
    } catch (e: any) {
        console.error("Error recording claim:", e);
        return NextResponse.json({ error: "Failed to record claim" }, { status: 500 });
    }
}
