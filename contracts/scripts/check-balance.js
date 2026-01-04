const hre = require("hardhat");

async function main() {
  const address = process.env.DEPLOYER_ADDRESS || "0x174eE2b41cD2Ef994C8B0293B643011CD1c03E77";
  const network = hre.network.name;
  const chainId = await hre.ethers.provider.getNetwork().then(n => n.chainId);
  
  // Get deployer address from signer if available
  let deployerAddress = address;
  try {
    const [signer] = await hre.ethers.getSigners();
    deployerAddress = signer.address;
  } catch (e) {
    // Use provided address
  }
  
  console.log("Checking balance for:", deployerAddress);
  console.log("Network:", network);
  console.log("Chain ID:", chainId);
  console.log("RPC:", process.env.RPC_URL || hre.network.config.url || "Not set");
  console.log("\n" + "=".repeat(60));
  
  try {
    const balance = await hre.ethers.provider.getBalance(address);
    const eth = hre.ethers.formatEther(balance);
    const wei = balance.toString();
    
    console.log("\n✅ Balance Found!");
    console.log("ETH:", eth);
    console.log("Wei:", wei);
    
    const minRequired = hre.ethers.parseEther("0.01"); // 0.01 ETH minimum
    const hasEnough = balance >= minRequired;
    
    console.log("\n" + "=".repeat(60));
    if (hasEnough) {
      console.log("✅ SUFFICIENT BALANCE - Ready to deploy!");
      console.log("Minimum required: 0.01 ETH");
      console.log("Your balance:", eth, "ETH");
    } else {
      console.log("⚠️  INSUFFICIENT BALANCE");
      console.log("Minimum required: 0.01 ETH");
      console.log("Your balance:", eth, "ETH");
      console.log("\n💧 Get Base Sepolia ETH from:");
      console.log("1. https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
      console.log("2. https://www.alchemy.com/faucets/base-sepolia");
      console.log("3. https://faucet.quicknode.com/base/sepolia");
    }
    
    console.log("\n" + "=".repeat(60));
    console.log("BaseScan Link:");
    console.log(`https://sepolia.basescan.org/address/${address}`);
    
  } catch (error) {
    console.error("❌ Error checking balance:", error.message);
    console.log("\nPossible issues:");
    console.log("1. RPC URL not accessible");
    console.log("2. Network connection issue");
    console.log("3. Invalid address format");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


