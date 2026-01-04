import { parseUnits } from "viem";
import type { Address } from "viem";

/**
 * Create an ERC-20 periodic permission for Advanced Permissions (ERC-7715)
 * @param tokenAddress The ERC-20 token address (e.g., USDC on Ethereum Sepolia)
 * @param periodAmount Maximum amount per period (in token units, will be converted to decimals)
 * @param periodDuration Duration of each period in seconds
 * @param justification Human-readable explanation
 */
export function createERC20PeriodicPermission(
  tokenAddress: Address,
  periodAmount: string, // e.g., "100" for 100 USDC
  periodDuration: number, // e.g., 86400 for 1 day
  justification?: string
) {
  const currentTime = Math.floor(Date.now() / 1000);

  return {
    type: "erc20-token-periodic" as const,
    data: {
      tokenAddress,
      periodAmount: parseUnits(periodAmount, 18), // DEMO has 18 decimals
      periodDuration,
      startTime: currentTime,
      justification: justification || `Permission to spend ${periodAmount} DEMO per ${periodDuration / 86400} day(s)`,
    },
  };
}

/**
 * Create a native token periodic permission
 * @param periodAmount Maximum amount per period (in ETH, will be converted to wei)
 * @param periodDuration Duration of each period in seconds
 * @param justification Human-readable explanation
 */
export function createNativeTokenPeriodicPermission(
  periodAmount: string, // e.g., "0.001" for 0.001 ETH
  periodDuration: number,
  justification?: string
) {
  const currentTime = Math.floor(Date.now() / 1000);
  const { parseEther } = require("viem");

  return {
    type: "native-token-periodic" as const,
    data: {
      periodAmount: parseEther(periodAmount),
      periodDuration,
      startTime: currentTime,
      justification: justification || `Permission to spend ${periodAmount} ETH per ${periodDuration / 86400} day(s)`,
    },
  };
}

/**
 * Request Advanced Permissions using MetaMask Smart Accounts Kit
 * @see https://docs.metamask.io/smart-accounts-kit/guides/advanced-permissions-erc-7715
 */
export async function requestAdvancedPermission(
  permissions: Array<ReturnType<typeof createERC20PeriodicPermission> | ReturnType<typeof createNativeTokenPeriodicPermission>>,
  targetContract?: Address
) {
  const { createWalletClient } = await import("viem");
  const { http } = await import("viem");

  // Use Arbitrum One mainnet bundler URL (can be overridden via env variable)
  const bundlerUrl =
    process.env.NEXT_PUBLIC_BUNDLER_URL ||
    "https://bundler.arbitrum.io";

  const walletClient = createWalletClient({
    transport: http(bundlerUrl),
  });

  const result = await (walletClient as any).grantPermissions({
    permissions,
    ...(targetContract && { targetContract }),
  });

  return result;
}

