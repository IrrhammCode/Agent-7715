const fs = require("fs");
const path = require("path");

// Load deployed addresses
const addressesPath = path.join(__dirname, "../deployed-addresses.json");
if (!fs.existsSync(addressesPath)) {
  console.error("❌ deployed-addresses.json not found. Please deploy contracts first.");
  process.exit(1);
}

const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));

console.log("📝 Updating environment variables...");
console.log(`   AgentRouter: ${addresses.AgentRouter}`);
console.log(`   Network: ${addresses.network} (Chain ID: ${addresses.chainId || "N/A"})\n`);

// Update root .env (primary location)
const rootEnvPath = path.join(__dirname, "../../.env");
if (fs.existsSync(rootEnvPath)) {
  let rootEnv = fs.readFileSync(rootEnvPath, "utf8");
  
  // Update or add AGENT_ROUTER_ADDRESS
  if (rootEnv.includes("AGENT_ROUTER_ADDRESS=")) {
    rootEnv = rootEnv.replace(
      /AGENT_ROUTER_ADDRESS=0x[0-9a-fA-F]{40}/,
      `AGENT_ROUTER_ADDRESS=${addresses.AgentRouter}`
    );
  } else {
    rootEnv += `\nAGENT_ROUTER_ADDRESS=${addresses.AgentRouter}\n`;
  }
  
  // Update or add NEXT_PUBLIC_AGENT_ROUTER_ADDRESS
  if (rootEnv.includes("NEXT_PUBLIC_AGENT_ROUTER_ADDRESS=")) {
    rootEnv = rootEnv.replace(
      /NEXT_PUBLIC_AGENT_ROUTER_ADDRESS=0x[0-9a-fA-F]{40}/,
      `NEXT_PUBLIC_AGENT_ROUTER_ADDRESS=${addresses.AgentRouter}`
    );
  } else {
    rootEnv += `\nNEXT_PUBLIC_AGENT_ROUTER_ADDRESS=${addresses.AgentRouter}\n`;
  }
  
  // Update USDC address if MockUSDC is deployed (optional - for testing)
  if (addresses.MockUSDC) {
    const useMockUSDC = process.env.USE_MOCK_USDC !== "false"; // Default to true if MockUSDC exists
    if (useMockUSDC) {
      if (rootEnv.includes("USDC_ADDRESS=")) {
        rootEnv = rootEnv.replace(
          /USDC_ADDRESS=0x[0-9a-fA-F]{40}/,
          `USDC_ADDRESS=${addresses.MockUSDC}`
        );
      } else {
        rootEnv += `\nUSDC_ADDRESS=${addresses.MockUSDC}\n`;
      }
      
      if (rootEnv.includes("NEXT_PUBLIC_USDC_ADDRESS=")) {
        rootEnv = rootEnv.replace(
          /NEXT_PUBLIC_USDC_ADDRESS=0x[0-9a-fA-F]{40}/,
          `NEXT_PUBLIC_USDC_ADDRESS=${addresses.MockUSDC}`
        );
      } else {
        rootEnv += `\nNEXT_PUBLIC_USDC_ADDRESS=${addresses.MockUSDC}\n`;
      }
      console.log("✅ Updated USDC address to MockUSDC (for testing)");
      console.log("   💡 Set USE_MOCK_USDC=false to use real USDC");
    } else {
      console.log("ℹ️  MockUSDC available but using real USDC (USE_MOCK_USDC=false)");
    }
  }
  
  fs.writeFileSync(rootEnvPath, rootEnv);
  console.log("✅ Updated root .env");
} else {
  console.log("⚠️  root .env not found, creating from .env.example...");
  const rootExamplePath = path.join(__dirname, "../../.env.example");
  if (fs.existsSync(rootExamplePath)) {
    let rootEnv = fs.readFileSync(rootExamplePath, "utf8");
    rootEnv = rootEnv.replace(
      /AGENT_ROUTER_ADDRESS=.*/,
      `AGENT_ROUTER_ADDRESS=${addresses.AgentRouter}`
    );
    rootEnv = rootEnv.replace(
      /NEXT_PUBLIC_AGENT_ROUTER_ADDRESS=.*/,
      `NEXT_PUBLIC_AGENT_ROUTER_ADDRESS=${addresses.AgentRouter}`
    );
    fs.writeFileSync(rootEnvPath, rootEnv);
    console.log("✅ Created root .env from .env.example");
  } else {
    console.log("⚠️  .env.example not found, creating new .env...");
    const newEnv = `# Agent 7715 - Environment Variables
# Generated automatically after contract deployment

AGENT_ROUTER_ADDRESS=${addresses.AgentRouter}
NEXT_PUBLIC_AGENT_ROUTER_ADDRESS=${addresses.AgentRouter}

# Network Configuration
RPC_URL=https://rpc.sepolia.org
ETHEREUM_RPC_URL=https://rpc.sepolia.org
BUNDLER_URL=https://bundler.sepolia.metamask.io
CHAIN_ID=11155111

# Token Addresses (Ethereum Sepolia)
USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
WETH_ADDRESS=0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
NEXT_PUBLIC_USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
NEXT_PUBLIC_WETH_ADDRESS=0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14

# Backend Configuration
PORT=3001
BACKEND_URL=http://localhost:3001
WS_URL=ws://localhost:3001/ws
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001/ws

# Agent Private Key (PENTING! Generate dengan: openssl rand -hex 32)
AGENT_PRIVATE_KEY=0x...

# Trading Configuration
AUTO_EXECUTE=true
USE_UNISWAP=false
`;
    fs.writeFileSync(rootEnvPath, newEnv);
    console.log("✅ Created new root .env");
  }
}

console.log("\n✅ Environment variables updated successfully!");
console.log("\n📝 Next steps:");
console.log("1. Check root .env - ensure AGENT_ROUTER_ADDRESS is set");
console.log("2. Set AGENT_PRIVATE_KEY in root .env (generate dengan: openssl rand -hex 32)");
console.log("3. Restart backend server: cd backend && npm run dev");
console.log("4. Restart frontend dev server: cd frontend && npm run dev");
console.log(`\n🔍 Verify contract: ${addresses.explorer || "https://sepolia.etherscan.io/address/" + addresses.AgentRouter}`);
