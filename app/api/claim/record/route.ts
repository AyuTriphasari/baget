import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPublicClient, http, decodeEventLog, keccak256, toHex, pad } from "viem";
import { base } from "viem/chains";
import { BaseKagetABI } from "@/app/abi/BaseKaget";

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;
const BASESCAN_API_KEY = process.env.BASESCAN_API_KEY;

// In-memory lock to prevent duplicate sync calls for the same giveaway
const syncLocks = new Map<string, number>(); // giveawayId -> timestamp
const SYNC_LOCK_TTL = 30000; // 30 seconds lock per giveaway

const publicClient = createPublicClient({
    chain: base,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.base.org"),
});

async function fetchNeynarUser(fid: string) {
    if (!NEYNAR_API_KEY) return null;
    try {
        const res = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
            headers: { accept: "application/json", api_key: NEYNAR_API_KEY },
        });
        const data = await res.json();
        return data.users?.[0] || null;
    } catch (e) {
        console.error("Neynar error:", e);
        return null;
    }
}

// Fetch Neynar profiles in batch (up to 100 fids)
async function fetchNeynarUsers(fids: string[]): Promise<Map<string, any>> {
    const map = new Map<string, any>();
    if (!NEYNAR_API_KEY || fids.length === 0) return map;
    try {
        const res = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fids.join(",")}`, {
            headers: { accept: "application/json", api_key: NEYNAR_API_KEY },
        });
        const data = await res.json();
        for (const user of data.users || []) {
            map.set(user.fid.toString(), user);
        }
    } catch (e) {
        console.error("Neynar batch error:", e);
    }
    return map;
}

// Input validation
function isValidTxHash(hash: string): boolean {
    return typeof hash === "string" && /^0x[a-fA-F0-9]{64}$/.test(hash);
}

/**
 * Verify a claim tx on-chain by checking the transaction receipt
 * for a RewardClaimed event from our contract.
 */
async function verifyClaimTx(txHash: `0x${string}`, expectedGiveawayId: string, expectedFid: string): Promise<boolean> {
    try {
        const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

        // Tx must have succeeded
        if (receipt.status !== "success") return false;

        // Look for RewardClaimed event from our contract
        for (const log of receipt.logs) {
            if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) continue;
            try {
                const decoded = decodeEventLog({
                    abi: BaseKagetABI,
                    data: log.data,
                    topics: log.topics,
                });
                if (decoded.eventName === "RewardClaimed") {
                    const args = decoded.args as any;
                    // Convert contract giveawayId (bigint) back to UUID for comparison
                    const contractIdHex = args.giveawayId.toString(16).padStart(32, "0");
                    const contractUuid = [
                        contractIdHex.slice(0, 8),
                        contractIdHex.slice(8, 12),
                        contractIdHex.slice(12, 16),
                        contractIdHex.slice(16, 20),
                        contractIdHex.slice(20, 32),
                    ].join("-");

                    const contractFid = args.fid.toString();

                    if (contractUuid === expectedGiveawayId && contractFid === expectedFid) {
                        return true;
                    }
                }
            } catch {
                // Not our event, skip
            }
        }
        return false;
    } catch (e) {
        console.error("Error verifying tx:", e);
        return false;
    }
}

/**
 * Sync missing winners for a giveaway by reading RewardClaimed events via Basescan API.
 * Uses Basescan instead of RPC getLogs to avoid free-tier block range limits.
 */
export async function syncGiveawayWinners(giveawayId: string): Promise<number> {
    let synced = 0;
    try {
        // Debounce: skip if this giveaway was synced recently
        const lastSync = syncLocks.get(giveawayId);
        if (lastSync && Date.now() - lastSync < SYNC_LOCK_TTL) {
            return 0;
        }
        syncLocks.set(giveawayId, Date.now());

        if (!BASESCAN_API_KEY) {
            console.error("BASESCAN_API_KEY not configured, skipping sync");
            return 0;
        }

        // Convert UUID to BigInt for topic filter
        let idBigInt: bigint;
        if (giveawayId.includes("-")) {
            idBigInt = BigInt("0x" + giveawayId.replace(/-/g, ""));
        } else {
            idBigInt = BigInt(giveawayId);
        }

        // RewardClaimed(uint256 indexed giveawayId, uint256 indexed fid, address indexed claimer, uint256 amount)
        const eventSignature = keccak256(
            toHex("RewardClaimed(uint256,uint256,address,uint256)")
        );
        // topic1 = giveawayId (padded to 32 bytes hex)
        const topic1 = pad(toHex(idBigInt), { size: 32 });

        // Get the giveaway's creation block to narrow the search range
        let fromBlock = 0;
        try {
            const giveaway = await prisma.giveaway.findUnique({
                where: { id: giveawayId },
                select: { txHash: true },
            });
            if (giveaway?.txHash) {
                const receipt = await publicClient.getTransactionReceipt({
                    hash: giveaway.txHash as `0x${string}`,
                });
                fromBlock = Number(receipt.blockNumber);
            }
        } catch {
            // Fallback: use 0 if we can't determine the creation block
        }

        // Use Etherscan V2 API to get logs (Basescan V1 is deprecated)
        const url = `https://api.etherscan.io/v2/api?chainid=8453&module=logs&action=getLogs`
            + `&address=${CONTRACT_ADDRESS}`
            + `&topic0=${eventSignature}`
            + `&topic1=${topic1}`
            + `&topic0_1_opr=and`
            + `&fromBlock=${fromBlock}&toBlock=99999999`
            + `&apikey=${BASESCAN_API_KEY}`;

        const res = await fetch(url);
        const data = await res.json();

        if (data.status !== "1" || !Array.isArray(data.result)) {
            // status "0" with "No records found" is normal for new giveaways
            if (data.message === "No records found") return 0;
            console.error("Basescan API error:", data.message);
            return 0;
        }

        const logs = data.result;
        if (logs.length === 0) return 0;

        // Get existing winners from DB
        const existingWinners = await prisma.winner.findMany({
            where: { giveawayId },
            select: { fid: true },
        });
        const existingFids = new Set(existingWinners.map((w: { fid: string }) => w.fid));

        // Parse logs and find missing claims
        // Basescan log format: { topics: [topic0, topic1, topic2, topic3], data, transactionHash }
        // topic2 = fid (uint256, indexed), topic3 = claimer (address, indexed)
        // data = amount (uint256, non-indexed)
        const missingClaims: { fid: string; amount: string; txHash: string }[] = [];

        for (const log of logs) {
            const fidHex = log.topics[2]; // topic2 = fid
            const fid = BigInt(fidHex).toString();

            if (!existingFids.has(fid)) {
                const amount = BigInt(log.data).toString();
                missingClaims.push({
                    fid,
                    amount,
                    txHash: log.transactionHash,
                });
            }
        }

        if (missingClaims.length === 0) return 0;

        // Fetch Neynar profiles for missing fids
        const missingFids = missingClaims.map(c => c.fid);
        const profiles = await fetchNeynarUsers(missingFids);

        // Insert missing winners
        for (const claim of missingClaims) {
            const user = profiles.get(claim.fid);

            try {
                await prisma.winner.upsert({
                    where: {
                        giveawayId_fid: { giveawayId, fid: claim.fid }
                    },
                    update: {},
                    create: {
                        giveawayId,
                        fid: claim.fid,
                        txHash: claim.txHash,
                        amount: claim.amount,
                        username: user ? `@${user.username}` : `FID: ${claim.fid}`,
                        avatarUrl: user?.pfp_url || "",
                    },
                });
                synced++;
            } catch (e) {
                console.error(`Failed to sync winner fid=${claim.fid}:`, e);
            }
        }

        console.log(`Synced ${synced} missing winners for giveaway ${giveawayId}`);
    } catch (e) {
        console.error("Error syncing winners:", e);
    }
    return synced;
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

        // CRITICAL: Verify the tx actually succeeded on-chain with the correct event
        const isVerified = await verifyClaimTx(txHash as `0x${string}`, giveawayId, fid.toString());
        if (!isVerified) {
            return NextResponse.json({ error: "Transaction verification failed - claim not confirmed on-chain" }, { status: 400 });
        }

        // Fetch profile
        const user = await fetchNeynarUser(fid.toString());

        // Use upsert to prevent race conditions
        const winner = await prisma.winner.upsert({
            where: {
                giveawayId_fid: {
                    giveawayId: giveawayId.toString(),
                    fid: fid.toString()
                }
            },
            update: {},
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
