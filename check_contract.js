import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Base mainnet only (production)
const chain = base;
const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org';

const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
});

async function check() {
    const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    if (!address) {
        console.error("No contract address in env");
        return;
    }
    console.log(`Checking address: ${address} on ${chain.name}`);

    try {
        const code = await client.getBytecode({ address });
        console.log(`Code result: ${code}`);

        if (!code || code === '0x') {
            console.error('ERROR: No code at address! The contract is not deployed here.');
        } else {
            console.log('SUCCESS: Contract code found.');
        }
    } catch (error) {
        console.error("Error fetching bytecode:", error);
    }
}

check();
