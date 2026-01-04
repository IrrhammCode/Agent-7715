const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Increase timeout for RPC calls
  const provider = hre.ethers.provider;
  if (provider._getConnection) {
    const connection = provider._getConnection();
    if (connection) {
      connection.timeout = 120000; // 120 seconds
    }
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying MockUSDC with account:", deployer.address);
  
  try {
    const balance = await Promise.race([
      hre.ethers.provider.getBalance(deployer.address),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Balance check timeout")), 30000))
    ]);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  } catch (error) {
    console.warn("⚠️  Could not check balance:", error.message);
    console.log("   Continuing with deployment...");
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
  const balance = await mockUSDC.balanceOf(deployer.address);
  const formattedBalance = hre.ethers.formatUnits(balance, 6);
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

