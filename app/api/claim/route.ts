import { NextResponse } from "next/server";
import { createWalletClient, http, keccak256, encodePacked } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;

// Simple in-memory rate limiter (use upstash/ratelimit for production)
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10; // 10 requests per minute

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(ip, { count: 1, timestamp: now });
        return true;
    }

    if (entry.count >= RATE_LIMIT_MAX) return false;
    entry.count++;
    return true;
}

// Verify FID ownership via Neynar API
async function verifyFidOwnership(fid: number, address: string): Promise<boolean> {
    if (!NEYNAR_API_KEY) {
        console.error("NEYNAR_API_KEY not configured");
        return false;
    }

    try {
        const res = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
            headers: {
                accept: "application/json",
                api_key: NEYNAR_API_KEY,
            },
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error("Neynar API error:", res.status, errorText);
            return false;
        }

        const data = await res.json();
        const user = data.users?.[0];

        if (!user) {
            console.error("FID not found:", fid);
            return false;
        }

        // Check if address matches custody address or any verified addresses
        const normalizedAddress = address.toLowerCase();
        const custodyAddress = user.custody_address?.toLowerCase();
        const verifiedAddresses = user.verified_addresses?.eth_addresses?.map((a: string) => a.toLowerCase()) || [];

        const isOwner = custodyAddress === normalizedAddress || verifiedAddresses.includes(normalizedAddress);

        if (!isOwner) {
            console.error("Address verification failed for FID:", fid, "Address:", address);
        }

        return isOwner;
    } catch (e) {
        console.error("Error verifying FID ownership:", e);
        return false;
    }
}

export async function POST(req: Request) {
    try {
        // Rate limiting
        const forwarded = req.headers.get("x-forwarded-for");
        const ip = forwarded ? forwarded.split(",")[0] : "unknown";
        if (!checkRateLimit(ip)) {
            return NextResponse.json({ error: "Too many requests" }, { status: 429 });
        }

        const { giveawayId, fid, address } = await req.json();

        // Input validation
        if (!giveawayId || typeof giveawayId !== "string") {
            return NextResponse.json({ error: "Invalid giveawayId" }, { status: 400 });
        }
        if (!fid || typeof fid !== "number" || fid <= 0) {
            return NextResponse.json({ error: "Invalid fid" }, { status: 400 });
        }
        if (!address || !address.match(/^0x[a-fA-F0-9]{40}$/)) {
            return NextResponse.json({ error: "Invalid address" }, { status: 400 });
        }

        if (!PRIVATE_KEY) {
            return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
        }

        // SECURITY: Verify FID ownership before generating signature
        const isValidOwner = await verifyFidOwnership(fid, address);
        if (!isValidOwner) {
            return NextResponse.json({ error: "FID ownership verification failed" }, { status: 403 });
        }

        const account = privateKeyToAccount(PRIVATE_KEY);
        const client = createWalletClient({
            account,
            chain: base,
            transport: http(process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.base.org"),
        });

        // Hash construction must match Smart Contract
        const chainId = base.id;

        // encodePacked in viem
        // giveawayId comes as string. If it's a UUID (has hyphens), convert to BigInt via Hex.
        // Otherwise treat as numeric string.
        let idBigInt: bigint;
        const gIdStr = giveawayId.toString();
        if (gIdStr.includes("-")) {
            idBigInt = BigInt("0x" + gIdStr.replace(/-/g, ""));
        } else {
            idBigInt = BigInt(gIdStr);
        }

        const messageHash = keccak256(
            encodePacked(
                ["uint256", "uint256", "address", "uint256"],
                [idBigInt, BigInt(fid), address as `0x${string}`, BigInt(chainId)]
            )
        );

        // Sign the hash
        const signature = await client.signMessage({
            message: { raw: messageHash }
        });

        return NextResponse.json({ signature });

    } catch (error: any) {
        console.error("Claim API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
