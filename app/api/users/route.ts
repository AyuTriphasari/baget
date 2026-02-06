import { NextRequest, NextResponse } from "next/server";

// Simple rate limiter
const rateLimitMap = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);
    if (!entry || now - entry.timestamp > RATE_LIMIT_WINDOW) {
        rateLimitMap.set(ip, { count: 1, timestamp: now });
        // Periodic cleanup: remove stale entries
        if (rateLimitMap.size > 500) {
            for (const [key, val] of rateLimitMap) {
                if (now - val.timestamp > RATE_LIMIT_WINDOW) rateLimitMap.delete(key);
            }
        }
        return true;
    }
    if (entry.count >= RATE_LIMIT_MAX) return false;
    entry.count++;
    return true;
}

export async function GET(req: NextRequest) {
    // Rate limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0] : "unknown";
    if (!checkRateLimit(ip)) {
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const fids = searchParams.get("fids");

    if (!fids) {
        return NextResponse.json({ error: "Missing fids" }, { status: 400 });
    }

    // Validate fids format (comma-separated numbers)
    const fidArray = fids.split(",");
    if (fidArray.length > 100) {
        return NextResponse.json({ error: "Too many fids (max 100)" }, { status: 400 });
    }
    for (const fid of fidArray) {
        if (!/^\d+$/.test(fid.trim())) {
            return NextResponse.json({ error: "Invalid fid format" }, { status: 400 });
        }
    }

    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    try {
        const response = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fids}`, {
            headers: {
                accept: "application/json",
                api_key: apiKey,
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: `Neynar API error: ${response.status}`, details: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching users from Neynar:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
