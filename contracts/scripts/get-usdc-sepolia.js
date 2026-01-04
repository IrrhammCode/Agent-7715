/**
 * Get USDC on Ethereum Sepolia Testnet
 * 
 * This script helps you get USDC testnet tokens on Sepolia.
 * Options:
 * 1. Use Circle USDC Faucet (recommended)
 * 2. Swap WETH to USDC via Uniswap (if available)
 * 3. Request from faucet manually
 */

const hre = require("hardhat");

// USDC contract address on Ethereum Sepolia
const USDC_ADDRESS = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

// USDC ABI (minimal - just for checking balance)
const USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
];

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const address = signer.address;

  console.log("\n" + "=".repeat(70));
  console.log("💵 GET USDC ON ETHEREUM SEPOLIA TESTNET");
  console.log("=".repeat(70) + "\n");

  console.log("📋 Your Wallet Address:", address);
  console.log("🌐 Network: Ethereum Sepolia (Chain ID: 11155111)");
  console.log("💵 USDC Contract:", USDC_ADDRESS);
  console.log("\n" + "-".repeat(70));

  // Check current USDC balance
  try {
    const usdcContract = new hre.ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
    const balance = await usdcContract.balanceOf(address);
    const decimals = await usdcContract.decimals();
    const formattedBalance = hre.ethers.formatUnits(balance, decimals);

    console.log("\n💰 Current USDC Balance:", formattedBalance, "USDC");

    if (parseFloat(formattedBalance) > 0) {
      console.log("✅ You already have USDC!");
      console.log("\n🔍 View on Etherscan:");
      console.log(`   https://sepolia.etherscan.io/address/${address}`);
      return;
    }
  } catch (error) {
    console.warn("⚠️  Could not check USDC balance:", error.message);
  }

  // Display options to get USDC
  console.log("\n" + "=".repeat(70));
  console.log("📝 HOW TO GET USDC TESTNET TOKENS:");
  console.log("=".repeat(70) + "\n");

  console.log("🔵 OPTION 1: Circle USDC Faucet (RECOMMENDED)");
  console.log("   1. Visit: https://faucet.circle.com/");
  console.log("   2. Connect your wallet (MetaMask)");
  console.log("   3. Select 'Ethereum Sepolia' network");
  console.log("   4. Enter your address:", address);
  console.log("   5. Click 'Get USDC'");
  console.log("   6. Wait for confirmation (usually instant)");
  console.log("   💡 You can get up to 1000 USDC per day\n");

  console.log("🟢 OPTION 2: Alchemy Sepolia Faucet");
  console.log("   1. Visit: https://www.alchemy.com/faucets/ethereum-sepolia");
  console.log("   2. Connect wallet");
  console.log("   3. Request ETH first (for gas)");
  console.log("   4. Then look for USDC option if available");
  console.log("   💡 Note: May not always have USDC option\n");

  console.log("🟡 OPTION 3: Manual Request via Etherscan");
  console.log("   1. Visit USDC contract on Etherscan:");
  console.log(`      https://sepolia.etherscan.io/address/${USDC_ADDRESS}`);
  console.log("   2. Check 'Contract' tab");
  console.log("   3. Look for 'mint' or 'faucet' function");
  console.log("   4. Connect wallet and call function");
  console.log("   💡 Note: USDC contract may not have public mint function\n");

  console.log("🟠 OPTION 4: Swap WETH to USDC (if DEX available)");
  console.log("   1. Get WETH first (wrap ETH)");
  console.log("   2. Use Uniswap or other DEX on Sepolia");
  console.log("   3. Swap WETH → USDC");
  console.log("   💡 Note: Requires DEX liquidity on Sepolia\n");

  console.log("=".repeat(70));
  console.log("\n📋 QUICK LINKS:");
  console.log("   Circle Faucet: https://faucet.circle.com/");
  console.log("   Alchemy Faucet: https://www.alchemy.com/faucets/ethereum-sepolia");
  console.log("   Your Address: https://sepolia.etherscan.io/address/" + address);
  console.log("   USDC Contract: https://sepolia.etherscan.io/address/" + USDC_ADDRESS);
  console.log("\n" + "=".repeat(70) + "\n");

  // Check ETH balance (needed for gas)
  try {
    const ethBalance = await hre.ethers.provider.getBalance(address);
    const ethFormatted = hre.ethers.formatEther(ethBalance);
    const minEth = 0.001;

    if (parseFloat(ethFormatted) < minEth) {
      console.log("⚠️  LOW ETH BALANCE - You need ETH for gas!");
      console.log(`   Current: ${ethFormatted} ETH`);
      console.log(`   Recommended: ${minEth} ETH minimum`);
      console.log("\n💧 Get Sepolia ETH from:");
      console.log("   1. https://www.alchemy.com/faucets/ethereum-sepolia");
      console.log("   2. https://www.infura.io/faucet/sepolia");
      console.log("   3. https://faucet.quicknode.com/ethereum/sepolia");
      console.log("   4. https://sepoliafaucet.com/\n");
    } else {
      console.log("✅ Sufficient ETH for gas:", ethFormatted, "ETH\n");
    }
  } catch (error) {
    console.warn("⚠️  Could not check ETH balance:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


