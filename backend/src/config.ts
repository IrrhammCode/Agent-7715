import { sepolia } from "viem/chains";
import { createPublicClient, http, type PublicClient } from "viem";

export const CHAIN = sepolia;
export const CHAIN_ID = 11155111;

// Ethereum Sepolia Contract Addresses
export const CONTRACTS = {
  // Tokens on Sepolia
  USDC: (process.env.USDC_ADDRESS || "0xc970a9C00AEAf314523B9B289F6644CcCbfE6930") as `0x${string}`, // DEMO Token (Sepolia)
  WETH: (process.env.WETH_ADDRESS || "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14") as `0x${string}`, // WETH on Sepolia
  BRETT: (process.env.BRETT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`, // Not used
  AERO: (process.env.AERO_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`, // Not used
  DEGEN: (process.env.DEGEN_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`, // Not used

  // DEX Routers (Uniswap V3)
  UNISWAP_V2_ROUTER: (process.env.UNISWAP_V2_ROUTER_ADDRESS || "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E") as `0x${string}`, // SwapRouter02
  UNISWAP_V2_FACTORY: (process.env.UNISWAP_V2_FACTORY_ADDRESS || "0x0227628f3F023bb0B980b67D528571c95c6DaC1c") as `0x${string}`, // Uniswap V3 Factory

  // Agent Router (deployed on Sepolia)
  AGENT_ROUTER: "0x690ab1758ae6c99857a3241d18da0ffdd6c7c7ae",
} as const;

// MetaMask Smart Accounts Kit configuration
export const SMART_ACCOUNTS_CONFIG = {
  bundlerUrl: process.env.BUNDLER_URL || "https://bundler.sepolia.io", // Placeholder
  rpcUrl: process.env.RPC_URL || `https://ethereum-sepolia.publicnode.com`,
};

// Create public client for Base with timeout
export const publicClient: PublicClient = createPublicClient({
  chain: CHAIN,
  transport: http(SMART_ACCOUNTS_CONFIG.rpcUrl, {
    timeout: 10000, // 10 second timeout
    retryCount: 2, // Retry 2 times
    retryDelay: 1000, // 1 second delay between retries
  }),
});

// Validate required environment variables
export function validateConfig() {
  const required = [
    "AGENT_ROUTER_ADDRESS", // Only AgentRouter needs to be deployed
    "AGENT_PRIVATE_KEY", // Required for executing trades (or SESSION_PRIVATE_KEY)
  ];

  const optional = [
    "SESSION_PRIVATE_KEY", // Alternative to AGENT_PRIVATE_KEY
    "USDC_ADDRESS",
    "WETH_ADDRESS",
    "BRETT_ADDRESS",
    "AERO_ADDRESS",
    "DEGEN_ADDRESS",
    "UNISWAP_V2_ROUTER_ADDRESS",
    "UNISWAP_V2_FACTORY_ADDRESS",
    "COINGECKO_API_KEY",
    "USE_UNISWAP",
    "AUTO_EXECUTE",
    "PORT",
    "RPC_URL",
    "BUNDLER_URL",
    "ENVIO_GRAPHQL_URL",
  ];

  // Check for AGENT_PRIVATE_KEY or SESSION_PRIVATE_KEY
  const hasPrivateKey = process.env.AGENT_PRIVATE_KEY || process.env.SESSION_PRIVATE_KEY;
  const missingPrivateKey = !hasPrivateKey;

  // Check for AGENT_ROUTER_ADDRESS
  const missingRouter = !process.env.AGENT_ROUTER_ADDRESS || process.env.AGENT_ROUTER_ADDRESS === "0x0000000000000000000000000000000000000000";

  const missing: string[] = [];
  if (missingRouter) missing.push("AGENT_ROUTER_ADDRESS");
  if (missingPrivateKey) missing.push("AGENT_PRIVATE_KEY or SESSION_PRIVATE_KEY");

  if (missing.length > 0) {
    console.warn(
      `⚠️  Warning: Missing or placeholder environment variables: ${missing.join(", ")}`
    );
    if (missingRouter) {
      console.warn(
        `⚠️  Please deploy AgentRouter to Ethereum Sepolia and update AGENT_ROUTER_ADDRESS in .env`
      );
    }
    if (missingPrivateKey) {
      console.warn(
        `⚠️  Please set AGENT_PRIVATE_KEY or SESSION_PRIVATE_KEY in .env (must match frontend session account)`
      );
    }
    console.warn(
      `⚠️  Backend will run but contract calls will fail without these variables.`
    );
  }

  console.log("✅ Using Ethereum Sepolia:");
  console.log(`   Chain ID: ${CHAIN_ID}`);
  console.log(`   USDC: ${CONTRACTS.USDC}`);
  console.log(`   WETH: ${CONTRACTS.WETH}`);
  console.log(`   Bundler: ${SMART_ACCOUNTS_CONFIG.bundlerUrl}`);
  console.log(`   RPC: ${SMART_ACCOUNTS_CONFIG.rpcUrl}`);
}

