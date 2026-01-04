const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Alternative RPC URLs for Sepolia
const RPC_URLS = [
  process.env.RPC_URL || process.env.ETHEREUM_RPC_URL,
  "https://rpc.sepolia.org",
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.gateway.tenderly.co",
  "https://rpc2.sepolia.org",
];

async function deployWithRetry() {
  let lastError = null;
  
  for (const rpcUrl of RPC_URLS) {
    if (!rpcUrl) continue;
    
    try {
      console.log(`\n🔄 Trying RPC: ${rpcUrl}`);
      
      // Update network config temporarily
      const networkConfig = hre.config.networks.ethereumSepolia;
      const originalUrl = networkConfig.url;
      networkConfig.url = rpcUrl;
      
      const [deployer] = await hre.ethers.getSigners();
      console.log("Deploying MockUSDC with account:", deployer.address);
      
      const balance = await hre.ethers.provider.getBalance(deployer.address);
      console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
      
      if (parseFloat(hre.ethers.formatEther(balance)) < 0.001) {
        console.error("❌ Insufficient ETH balance. Need at least 0.001 ETH for gas.");
        process.exit(1);
      }

      console.log("\n📦 Deploying MockUSDC to Ethereum Sepolia...");
      console.log("ℹ️  This will create a mintable USDC token for testing");
      
      const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
      const mockUSDC = await MockUSDC.deploy(deployer.address);
      await mockUSDC.waitForDeployment();
      const mockUSDCAddress = await mockUSDC.getAddress();
      
      console.log("✅ MockUSDC deployed to:", mockUSDCAddress);
      console.log("   Name:", await mockUSDC.name());
      console.log("   Symbol:", await mockUSDC.symbol());
      console.log("   Decimals:", await mockUSDC.decimals());

      // Mint initial supply to deployer (optional)
      const initialSupply = 1000000; // 1M USDC
      console.log(`\n💰 Minting ${initialSupply.toLocaleString()} USDC to deployer...`);
      const mintTx = await mockUSDC.mint(deployer.address, initialSupply);
      await mintTx.wait();
      console.log("✅ Initial supply minted!");

      // Check balance
      const usdcBalance = await mockUSDC.balanceOf(deployer.address);
      const formattedBalance = hre.ethers.formatUnits(usdcBalance, 6);
      console.log(`   Balance: ${formattedBalance} mUSDC`);

      // Save address
      const addressesPath = path.join(__dirname, "../deployed-addresses.json");
      let addresses = {};
      if (fs.existsSync(addressesPath)) {
        addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
      }
      
      addresses.MockUSDC = mockUSDCAddress;
      addresses.network = hre.network.name;
      addresses.chainId = 11155111;
      
      fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
      console.log("\n💾 Address saved to:", addressesPath);

      // Print summary
      console.log("\n" + "=".repeat(60));
      console.log("📋 DEPLOYMENT SUMMARY");
      console.log("=".repeat(60));
      console.log("Network: Ethereum Sepolia");
      console.log("Chain ID: 11155111");
      console.log("MockUSDC:", mockUSDCAddress);
      console.log("Explorer:", `https://sepolia.etherscan.io/address/${mockUSDCAddress}`);
      console.log("\n💡 You can now mint USDC using:");
      console.log("   - Script: npx hardhat run scripts/mint-usdc.js --network ethereumSepolia");
      console.log("   - Or call mintToSelf() directly from contract");
      console.log("=".repeat(60) + "\n");
      
      // Restore original URL
      networkConfig.url = originalUrl;
      return; // Success!
      
    } catch (error) {
      lastError = error;
      console.error(`❌ Failed with RPC ${rpcUrl}:`, error.message);
      if (error.message.includes("timeout") || error.message.includes("HeadersTimeoutError")) {
        console.log("   ⏳ Timeout error - trying next RPC...\n");
        continue;
      } else if (error.message.includes("insufficient funds")) {
        console.error("\n❌ Insufficient ETH for gas. Please get Sepolia ETH first.");
        console.log("   Faucet: https://www.alchemy.com/faucets/ethereum-sepolia");
        process.exit(1);
      } else {
        console.log("   ⚠️  Other error - trying next RPC...\n");
        continue;
      }
    }
  }
  
  // All RPCs failed
  console.error("\n❌ All RPC URLs failed. Last error:", lastError?.message);
  console.log("\n💡 Troubleshooting:");
  console.log("1. Check your internet connection");
  console.log("2. Try using a different RPC URL in .env:");
  console.log("   RPC_URL=https://ethereum-sepolia-rpc.publicnode.com");
  console.log("3. Get Sepolia ETH from faucet:");
  console.log("   https://www.alchemy.com/faucets/ethereum-sepolia");
  process.exit(1);
}

deployWithRetry()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


