
import { createPublicClient, http, formatUnits, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const AGENT_ADDRESS = process.env.NEXT_PUBLIC_AGENT_ADDRESS || "0x35494dFBf139Ba63Cf83c66792297Df9efD8D411";

const ERC20_ABI = parseAbi([
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
]);

async function main() {
    console.log("🔍 Checking Agent Wallet Balance...");
    console.log(`Agent Address: ${AGENT_ADDRESS}`);
    console.log(`USDC Address: ${USDC_ADDRESS}`);

    const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(process.env.RPC_URL || "https://ethereum-sepolia.publicnode.com"),
    });

    try {
        const decimals = await publicClient.readContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: "decimals",
        });

        const balance = await publicClient.readContract({
            address: USDC_ADDRESS,
            abi: ERC20_ABI,
            functionName: "balanceOf",
            args: [AGENT_ADDRESS as `0x${string}`],
        });

        console.log(`\n💰 Balance: ${formatUnits(balance, decimals)} USDC`);
        console.log(`Raw Balance: ${balance.toString()}`);

        if (balance === 0n) {
            console.error("\n❌ Agent wallet has 0 USDC balance!");
            console.error("The 'Execution reverted' error is likely because the Agent cannot pay for the trade.");
        } else {
            console.log("\n✅ Agent wallet has funds.");
        }

    } catch (error) {
        console.error("Error checking balance:", error);
    }
}

main();
