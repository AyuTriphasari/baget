import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { syncGiveawayWinners } from "../claim/record/route";

// Cache for contract status (10 seconds TTL)
const statusCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10000; // 10 seconds

// Input validation helpers
function isValidAddress(address: string): boolean {
    return typeof address === "string" && /^0x[a-fA-F0-9]{40}$/.test(address);
}

function isValidId(id: string): boolean {
    return typeof id === "string" && id.length > 0 && id.length <= 100;
}

// Contract read helper
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.base.org"),
});

async function getGiveawayStatus(giveawayId: string, skipCache = false) {
    // Check cache first (unless skipCache)
    if (!skipCache) {
        const cached = statusCache.get(giveawayId);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
    }

    try {
        // Convert UUID to BigInt
        let idBigInt: bigint;
        if (giveawayId.includes("-")) {
            idBigInt = BigInt("0x" + giveawayId.replace(/-/g, ""));
        } else {
            idBigInt = BigInt(giveawayId);
        }

        const data = await publicClient.readContract({
            address: CONTRACT_ADDRESS,
            abi: [{
                inputs: [{ internalType: "uint256", name: "giveawayId", type: "uint256" }],
                name: "giveaways",
                outputs: [
                    { internalType: "address", name: "creator", type: "address" },
                    { internalType: "address", name: "token", type: "address" },
                    { internalType: "uint256", name: "rewardPerClaim", type: "uint256" },
                    { internalType: "uint256", name: "maxClaims", type: "uint256" },
                    { internalType: "uint256", name: "claimedCount", type: "uint256" },
                    { internalType: "uint256", name: "expiresAt", type: "uint256" },
                    { internalType: "bool", name: "isActive", type: "bool" }
                ],
                stateMutability: "view",
                type: "function"
            }],
            functionName: "giveaways",
            args: [idBigInt],
        }) as unknown as any[];

        const result = {
            isActive: data[6] as boolean,
            claimedCount: Number(data[4]),
        };

        // Cache the result
        statusCache.set(giveawayId, { data: result, timestamp: Date.now() });

        return result;
    } catch (e) {
        console.error("Error reading contract:", e);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { id, creator, token, amount, rewardPerClaim, maxClaims, expiresAt, txHash } = body;

        // Input validation
        if (!id || !isValidId(id.toString())) {
            return NextResponse.json({ error: "Invalid id" }, { status: 400 });
        }
        if (!creator || !isValidAddress(creator)) {
            return NextResponse.json({ error: "Invalid creator address" }, { status: 400 });
        }
        if (!token || (!isValidAddress(token) && token !== "0x0000000000000000000000000000000000000000")) {
            return NextResponse.json({ error: "Invalid token address" }, { status: 400 });
        }
        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        }
        if (!rewardPerClaim || isNaN(Number(rewardPerClaim)) || Number(rewardPerClaim) <= 0) {
            return NextResponse.json({ error: "Invalid rewardPerClaim" }, { status: 400 });
        }
        if (!maxClaims || isNaN(Number(maxClaims)) || Number(maxClaims) <= 0) {
            return NextResponse.json({ error: "Invalid maxClaims" }, { status: 400 });
        }

        const giveaway = await prisma.giveaway.create({
            data: {
                id: id.toString(),
                creator,
                token,
                amount: amount.toString(),
                rewardPerClaim: rewardPerClaim.toString(),
                maxClaims: Number(maxClaims),
                expiresAt: Number(expiresAt),
                txHash,
            },
        });

        return NextResponse.json(giveaway);
    } catch (e: any) {
        console.error("Error creating giveaway:", e);
        return NextResponse.json({ error: "Failed to create giveaway" }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const creator = searchParams.get("creator");

    const fresh = searchParams.get("fresh") === "1";

    try {
        if (id) {
            let giveaway = await prisma.giveaway.findUnique({
                where: { id },
                include: { winners: true },
            });
            if (!giveaway) return NextResponse.json({ error: "Not found" }, { status: 404 });

            // Get real status from contract (skip cache if fresh=1)
            const contractStatus = await getGiveawayStatus(id, fresh);
            const contractClaimedCount = contractStatus?.claimedCount ?? giveaway.winners.length;

            // Auto-sync: if contract has more claims than DB winners, backfill from on-chain events
            if (contractClaimedCount > giveaway.winners.length) {
                const synced = await syncGiveawayWinners(id);
                if (synced > 0) {
                    // Re-fetch giveaway with updated winners
                    giveaway = await prisma.giveaway.findUnique({
                        where: { id },
                        include: { winners: true },
                    }) as typeof giveaway;
                    if (!giveaway) return NextResponse.json({ error: "Not found" }, { status: 404 });
                }
            }

            return NextResponse.json({
                ...giveaway,
                claimedCount: contractClaimedCount,
                isActive: contractStatus?.isActive ?? true,
            });
        }

        if (creator) {
            const giveaways = await prisma.giveaway.findMany({
                where: { creator },
                orderBy: { createdAt: "desc" },
                include: {
                    _count: {
                        select: { winners: true }
                    }
                }
            });

            // Get contract status for each giveaway
            const giveawaysWithStatus = await Promise.all(
                giveaways.map(async (g: any) => {
                    const contractStatus = await getGiveawayStatus(g.id);
                    return {
                        ...g,
                        claimedCount: contractStatus?.claimedCount ?? g._count.winners,
                        isActive: contractStatus?.isActive ?? true,
                    };
                })
            );

            return NextResponse.json(giveawaysWithStatus);
        }

        // Default: Latest for Find page
        const giveaways = await prisma.giveaway.findMany({
            take: 50,
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { winners: true }
                }
            }
        });

        // Get contract status for each giveaway
        const giveawaysWithStatus = await Promise.all(
            giveaways.map(async (g: any) => {
                const contractStatus = await getGiveawayStatus(g.id);
                return {
                    ...g,
                    claimedCount: contractStatus?.claimedCount ?? g._count.winners,
                    isActive: contractStatus?.isActive ?? true,
                };
            })
        );

        return NextResponse.json(giveawaysWithStatus);

    } catch (e: any) {
        console.error("Error fetching giveaways:", e);
        return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
    }
}
