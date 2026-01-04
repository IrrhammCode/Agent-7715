const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const address = signer.address;

  // Load deployed addresses
  const addressesPath = path.join(__dirname, "../deployed-addresses.json");
  if (!fs.existsSync(addressesPath)) {
    console.error("❌ deployed-addresses.json not found. Please deploy MockUSDC first.");
    console.log("   Run: npx hardhat run scripts/deploy-mock-usdc.js --network ethereumSepolia");
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  const mockUSDCAddress = addresses.MockUSDC;

  if (!mockUSDCAddress) {
    console.error("❌ MockUSDC address not found. Please deploy MockUSDC first.");
    console.log("   Run: npx hardhat run scripts/deploy-mock-usdc.js --network ethereumSepolia");
    process.exit(1);
  }

  console.log("\n" + "=".repeat(70));
  console.log("💰 MINT MOCK USDC");
  console.log("=".repeat(70) + "\n");

  console.log("📋 Your Address:", address);
  console.log("💵 MockUSDC Contract:", mockUSDCAddress);
  console.log("🌐 Network: Ethereum Sepolia\n");

  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = MockUSDC.attach(mockUSDCAddress);

  // Get amount from command line or use default
  const amount = process.argv[2] ? parseInt(process.argv[2]) : 10000; // Default 10k USDC

  console.log(`⏳ Minting ${amount.toLocaleString()} USDC to ${address}...\n`);

  try {
    // Check if caller is owner (can use mint) or use mintToSelf
    const owner = await mockUSDC.owner();
    const isOwner = owner.toLowerCase() === address.toLowerCase();

    let tx;
    if (isOwner) {
      console.log("✅ You are the owner, using mint() function...");
      tx = await mockUSDC.mint(address, amount);
    } else {
      console.log("ℹ️  Using mintToSelf() function (public)...");
      tx = await mockUSDC.mintToSelf(amount);
    }

    console.log("   Transaction hash:", tx.hash);
    console.log("   Waiting for confirmation...");
    
    await tx.wait();
    console.log("✅ Mint successful!\n");

    // Check new balance
    const balance = await mockUSDC.balanceOf(address);
    const formattedBalance = hre.ethers.formatUnits(balance, 6);
    console.log("💰 New Balance:", formattedBalance, "mUSDC");
    console.log("\n🔍 View on Etherscan:");
    console.log(`   https://sepolia.etherscan.io/address/${address}`);
    console.log("=".repeat(70) + "\n");

  } catch (error) {
    console.error("❌ Error minting USDC:", error.message);
    if (error.message.includes("onlyOwner")) {
      console.log("\n💡 Tip: Use mintToSelf() function instead (no owner required)");
    }
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


