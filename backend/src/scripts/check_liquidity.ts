
import { createPublicClient, http, formatUnits, parseAbi } from "viem";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Verify this is the USDC you have
const WETH_ADDRESS = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";

const V2_FACTORY = "0x7E0987E5b3a30e3f2828572Bb659A548460a3003"; // Standard Sepolia V2 Factory
const V3_FACTORY = "0x0227628f3F023bb0B980b67D528571c95cBbbfcB"; // Standard Sepolia V3 Factory

const V2_PAIR_ABI = parseAbi([
    "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
    "function token0() external view returns (address)",
]);

const V3_POOL_ABI = parseAbi([
    "function liquidity() external view returns (uint128)",
]);

const FACTORY_V2_ABI = parseAbi([
    "function getPair(address tokenA, address tokenB) external view returns (address pair)",
]);

const FACTORY_V3_ABI = parseAbi([
    "function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)",
]);

async function main() {
    const client = createPublicClient({
        chain: sepolia,
        transport: http(process.env.RPC_URL || "https://ethereum-sepolia.publicnode.com"),
    });

    console.log("🔍 Checking Liquidity on Sepolia...");

    // 1. Check Uniswap V2
    try {
        const pairV2 = await client.readContract({
            address: V2_FACTORY,
            abi: FACTORY_V2_ABI,
            functionName: "getPair",
            args: [USDC_ADDRESS, WETH_ADDRESS],
        });

        console.log(`\n🦄 Uniswap V2 Pair: ${pairV2}`);
        if (pairV2 !== "0x0000000000000000000000000000000000000000") {
            const reserves = await client.readContract({
                address: pairV2,
                abi: V2_PAIR_ABI,
                functionName: "getReserves",
            });
            console.log(`   Reserves: ${reserves[0]} / ${reserves[1]}`);
            if (reserves[0] > 0n && reserves[1] > 0n) {
                console.log("   ✅ V2 HAS LIQUIDITY!");
            } else {
                console.log("   ❌ V2 Pair exists but is empty.");
            }
        } else {
            console.log("   ❌ No V2 Pair found.");
        }
    } catch (e: any) {
        console.log("   ⚠️ Error checking V2:", e.message);
    }

    // 2. Check Uniswap V3 (Fee 3000)
    try {
        const poolV3 = await client.readContract({
            address: V3_FACTORY,
            abi: FACTORY_V3_ABI,
            functionName: "getPool",
            args: [USDC_ADDRESS, WETH_ADDRESS, 3000],
        });

        console.log(`\n🦄 Uniswap V3 Pool (0.3%): ${poolV3}`);
        if (poolV3 !== "0x0000000000000000000000000000000000000000") {
            const liquidity = await client.readContract({
                address: poolV3,
                abi: V3_POOL_ABI,
                functionName: "liquidity",
            });
            console.log(`   Liquidity: ${liquidity}`);
            if (liquidity > 0n) {
                console.log("   ✅ V3 HAS LIQUIDITY!");
            } else {
                console.log("   ❌ V3 Pool exists but is empty.");
            }
        } else {
            console.log("   ❌ No V3 Pool found.");
        }
    } catch (e: any) {
        console.log("   ⚠️ Error checking V3:", e.message);
    }
}

main();
