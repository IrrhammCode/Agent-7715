const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy AgentRouter
  // Note: Using Ethereum Sepolia testnet
  // Real tokens on Ethereum Sepolia (no need to deploy mock tokens)
  console.log("\n📦 Deploying AgentRouter to Ethereum Sepolia...");
  console.log("ℹ️  Using testnet tokens on Ethereum Sepolia:");
  console.log("   USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238");
  console.log("   WETH: 0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14");
  console.log("   Network: Ethereum Sepolia (Chain ID: 11155111)");
  
  const AgentRouter = await hre.ethers.getContractFactory("AgentRouter");
  const agentRouter = await AgentRouter.deploy();
  await agentRouter.waitForDeployment();
  const agentRouterAddress = await agentRouter.getAddress();
  console.log("✅ AgentRouter deployed to:", agentRouterAddress);

  // Save addresses to file
  const addresses = {
    AgentRouter: agentRouterAddress,
    network: hre.network.name,
    chainId: 11155111,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    // Testnet token addresses on Ethereum Sepolia
    testnetTokens: {
      USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
      // BRETT, AERO, DEGEN not available on testnet
    },
    explorer: "https://sepolia.etherscan.io/address/" + agentRouterAddress,
  };

  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("\n💾 Addresses saved to:", addressesPath);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("Network: Ethereum Sepolia");
  console.log("Chain ID: 11155111");
  console.log("AgentRouter:", agentRouterAddress);
  console.log("Explorer:", addresses.explorer);
  console.log("\n✅ AgentRouter deployed successfully!");
  console.log("\n📝 Next steps:");
  console.log("1. Update backend/.env with:");
  console.log(`   AGENT_ROUTER_ADDRESS=${agentRouterAddress}`);
  console.log("2. Update frontend/.env.local with:");
  console.log(`   NEXT_PUBLIC_AGENT_ROUTER_ADDRESS=${agentRouterAddress}`);
  console.log("3. Restart backend and frontend servers");
  console.log("4. Verify contract on Etherscan:", addresses.explorer);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
