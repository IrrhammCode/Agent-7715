/**
 * Bundler Client
 * Direct API client for MetaMask Smart Accounts Bundler
 * Since @metamask/smart-accounts-kit bundler-client is not available for backend,
 * we use direct HTTP calls to the bundler API
 */

import { http } from "viem";

interface UserOperation {
  sender: `0x${string}`;
  nonce: string;
  callData: `0x${string}`;
  callGasLimit?: string;
  verificationGasLimit?: string;
  preVerificationGas?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  paymasterAndData?: string;
  signature: string; // Permission context from ERC-7715
}

interface BundlerResponse {
  result?: string; // User operation hash
  error?: {
    code: number;
    message: string;
  };
}

/**
 * Send user operation to bundler
 */
export async function sendUserOperation(
  bundlerUrl: string,
  userOperation: UserOperation,
  entryPoint: `0x${string}` = "0x0000000071727De22E5E9d8BAf0edAc6f37da032"
): Promise<string> {
  try {
    const response = await fetch(bundlerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: "eth_sendUserOperation",
        params: [
          {
            sender: userOperation.sender,
            nonce: userOperation.nonce || "0x0",
            callData: userOperation.callData,
            callGasLimit: userOperation.callGasLimit || "0x0",
            verificationGasLimit: userOperation.verificationGasLimit || "0x0",
            preVerificationGas: userOperation.preVerificationGas || "0x0",
            maxFeePerGas: userOperation.maxFeePerGas || "0x0",
            maxPriorityFeePerGas: userOperation.maxPriorityFeePerGas || "0x0",
            paymasterAndData: userOperation.paymasterAndData || "0x",
            signature: userOperation.signature, // Permission context
          },
          entryPoint,
        ],
        id: 1,
        jsonrpc: "2.0",
      }),
    });

    if (!response.ok) {
      throw new Error(`Bundler API error: ${response.statusText}`);
    }

    const result: BundlerResponse = await response.json();

    if (result.error) {
      throw new Error(`Bundler error: ${result.error.message}`);
    }

    if (!result.result) {
      throw new Error("No result from bundler");
    }

    return result.result;
  } catch (error) {
    console.error("Error sending user operation to bundler:", error);
    throw error;
  }
}

/**
 * Get user operation receipt
 */
export async function getUserOperationReceipt(
  bundlerUrl: string,
  userOpHash: string
): Promise<any> {
  try {
    const response = await fetch(bundlerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        method: "eth_getUserOperationReceipt",
        params: [userOpHash],
        id: 1,
        jsonrpc: "2.0",
      }),
    });

    if (!response.ok) {
      throw new Error(`Bundler API error: ${response.statusText}`);
    }

    const result = await response.json();
    return result.result;
  } catch (error) {
    console.error("Error getting user operation receipt:", error);
    throw error;
  }
}

