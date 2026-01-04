import { useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { parseUnits, parseEther } from "viem";
import { createWalletClient, custom } from "viem";
import { erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";
import { privateKeyToAccount } from "viem/accounts";
import { toMetaMaskSmartAccount, Implementation } from "@metamask/smart-accounts-kit";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface UseActivateAgentOptions {
  usdcAddress: `0x${string}`;
  agentRouterAddress: `0x${string}`;
  dailyBudget?: number; // Daily budget in USDC (default: 100)
  frequency?: string; // e.g. "Every Hour", "Every Day"
  strategy?: string;
  strategyParams?: any;
  email?: string;
}

export function useActivateAgent({
  usdcAddress,
  agentRouterAddress,
  dailyBudget = 100,
  frequency = "Every Day",
  strategy,
  strategyParams,
  email
}: UseActivateAgentOptions) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Helper to convert frequency string to seconds
  const getFrequencySeconds = (freq: string): number => {
    switch (freq) {
      case "Every Hour": return 3600;
      case "Every Day": return 86400;
      case "Every Week": return 604800;
      case "On Signal": return 300; // 5 min default for signals
      default: return 86400; // Default to 1 day
    }
  };

  const activateAgent = async () => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (typeof window === "undefined" || !window.ethereum) {
      setError("MetaMask is not installed");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Set up Wallet Client with erc7715ProviderActions
      // This is required to request Advanced Permissions from MetaMask
      const walletClient = createWalletClient({
        transport: custom(window.ethereum),
      }).extend(erc7715ProviderActions());

      // 2. Set up Public Client for Arbitrum
      const publicClient = createPublicClient({
        chain: sepolia,
        transport: http(),
      });

      // 3. Define the Session Account (The Agent)
      const sessionAccountAddress = process.env.NEXT_PUBLIC_AGENT_ADDRESS as `0x${string}`;

      if (!sessionAccountAddress || sessionAccountAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("NEXT_PUBLIC_AGENT_ADDRESS is not configured");
      }

      // 4. APPROVAL STEP: Approve Agent to spend USDC (Fallback for 4337 issues)
      console.log("🔓 Approving Agent to spend USDC...");
      // We use the walletClient extended with public actions or create a new one?
      // Standard walletClient works for writeContract
      const approvalHash = await walletClient.writeContract({
        address: usdcAddress,
        abi: [{
          name: 'approve',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'spender', type: 'address' },
            { name: 'amount', type: 'uint256' }
          ],
          outputs: [{ name: '', type: 'bool' }]
        }],
        functionName: 'approve',
        args: [sessionAccountAddress, BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935")], // MaxUint256
        chain: sepolia,
        account: address
      });

      console.log(`✅ Approval Hash: ${approvalHash}`);
      console.log("Waiting for approval confirmation...");
      await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      console.log("✅ Approval Confirmed!");

      // ... inside activateAgent ...

      // 5. Calculate current time and expiry (1 week from now)
      const currentTime = Math.floor(Date.now() / 1000);
      const expiry = currentTime + 604800; // 1 week in seconds

      const periodDuration = getFrequencySeconds(frequency);
      const periodAmount = parseUnits(dailyBudget.toString(), 18); // DEMO has 18 decimals

      // 6. NUCLEAR OPTION: Direct RPC call bypassing library
      // Call wallet_grantPermissions via LIBRARY with debugging
      console.log("📡 ATTEMPT: Calling via @metamask/smart-accounts-kit library");
      console.log("Chain ID:", chainId, `(hex: 0x${chainId.toString(16)})`);
      console.log("Session Account:", sessionAccountAddress);
      console.log("DEMO Address (was USDC):", usdcAddress);
      console.log("Period Amount:", periodAmount.toString());
      console.log("Period Duration:", periodDuration);
      console.log("Expiry:", expiry);

      try {
        const grantedPermissions = await walletClient.requestExecutionPermissions([{
          chainId: chainId,
          expiry,
          signer: {
            type: "account",
            data: {
              address: sessionAccountAddress,
            },
          },
          permission: {
            type: "erc20-token-periodic",
            data: {
              tokenAddress: usdcAddress,
              periodAmount,
              periodDuration,
              justification: strategy
                ? `${strategy} Strategy: Spend up to ${dailyBudget} DEMO per day`
                : `Automated Trading: Spend up to ${dailyBudget} DEMO daily`,
            },
          },
          isAdjustmentAllowed: true,
        }]);


        console.log("✅ SUCCESS! Granted permissions:", grantedPermissions);

        // 7. Extract permission context from library response
        const permissionContext = grantedPermissions[0].context;
        const delegationManager = grantedPermissions[0].signerMeta.delegationManager;

        console.log("Permission context:", permissionContext);
        console.log("Delegation manager:", delegationManager);

        // 8. Register the agent with the backend
        const response = await fetch(`${BACKEND_API_URL}/api/register-agent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userAddress: address,
            sessionAccountAddress: sessionAccountAddress,
            permissionContext: permissionContext,
            delegationManager: delegationManager,
            chainId: chainId,
            dailyBudget: dailyBudget, // Pass configured budget
            initialStrategy: strategy, // Pass selected strategy
            strategyParams: strategyParams, // Pass strategy params
            email: email, // Pass user email
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to register agent");
        }

        const data = await response.json();
        console.log("Agent registered:", data);

        setSuccess(true);
        return data;
      } catch (err) {
        console.error("Error activating agent:", err);
        throw err;
      }
    } catch (error: any) {
      console.error("Outer error:", error);
      setError(error.message || "Failed to activate agent");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    activateAgent,
    isLoading,
    error,
    success,
    isConnected,
    address,
  };
}

