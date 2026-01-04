const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  const chainId = await hre.ethers.provider.getNetwork().then(n => n.chainId);
  
  console.log("=".repeat(60));
  console.log("⛽ GAS ESTIMATION FOR DEPLOYMENT");
  console.log("=".repeat(60));
  console.log("Network:", network);
  console.log("Chain ID:", chainId);
  console.log("Deployer:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceEth = hre.ethers.formatEther(balance);
  console.log("Current Balance:", balanceEth, "ETH");
  
  // Estimate gas for AgentRouter deployment only
  console.log("\n📊 Estimating gas costs...\n");
  
  const gasPrice = await hre.ethers.provider.getFeeData();
  const currentGasPrice = gasPrice.gasPrice || hre.ethers.parseUnits("1", "gwei");
  
  console.log("Current Gas Price:", hre.ethers.formatUnits(currentGasPrice, "gwei"), "gwei");
  console.log("\nContract Deployment Estimate:");
  
  // Typical gas cost for AgentRouter deployment
  const estimatedGasPerContract = hre.ethers.parseUnits("2000000", "wei"); // ~2M gas for AgentRouter
  
  const estimatedCost = estimatedGasPerContract * currentGasPrice;
  const costEth = hre.ethers.formatEther(estimatedCost);
  
  console.log(`  AgentRouter: ~${costEth} ETH`);
  
  const totalCostEth = costEth;
  
  console.log("\n" + "=".repeat(60));
  console.log("💰 TOTAL ESTIMATED COST");
  console.log("=".repeat(60));
  console.log("Total Gas Cost:", totalCostEth, "ETH");
  
  // Estimate USD (assuming ETH = $3000)
  const ethPrice = 3000;
  const totalCostUSD = parseFloat(totalCostEth) * ethPrice;
  console.log("Estimated USD (ETH @ $3000):", `$${totalCostUSD.toFixed(2)}`);
  
  console.log("\n" + "=".repeat(60));
  console.log("✅ VERDICT");
  console.log("=".repeat(60));
  
  if (parseFloat(balanceEth) >= parseFloat(totalCostEth) * 1.5) {
    console.log("✅ SUFFICIENT BALANCE - Ready to deploy!");
    console.log(`   You have ${balanceEth} ETH, need ~${totalCostEth} ETH`);
  } else {
    console.log("⚠️  INSUFFICIENT BALANCE");
    console.log(`   You have ${balanceEth} ETH, need ~${totalCostEth} ETH`);
    const needed = parseFloat(totalCostEth) * 1.5 - parseFloat(balanceEth);
    console.log(`   Need additional: ~${needed.toFixed(6)} ETH`);
  }
  
  console.log("\n💡 Note: Base Mainnet gas fees are VERY LOW!");
  console.log("   Actual costs are usually 10-50x lower than estimates.");
  console.log("   $10 should be MORE than enough for deployment.");
  console.log("\n📝 Note: Only AgentRouter needs deployment.");
  console.log("   All tokens (USDC, WETH, BRETT, etc.) are REAL on Base Mainnet.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
