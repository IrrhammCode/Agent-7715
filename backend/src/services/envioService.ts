// Safe Mode Envio Service with Circuit Breaker
import { decodeEventLog, parseAbiItem, pad } from "viem";

import { CONTRACTS, CHAIN_ID } from "../config";

// AgentRouter Contract Address
const AGENT_ROUTER_ADDRESS = CONTRACTS.AGENT_ROUTER || "0xCE123054daF00AbDbf46a94c3473962181af66e6";

// HyperSync URL Mapping
const HYPERSYNC_URLS: Record<number, string> = {
    11155111: "https://sepolia.hypersync.xyz",
    42161: "https://arbitrum.hypersync.xyz",
    // Add default fallback
};

const HYPERSYNC_URL = HYPERSYNC_URLS[CHAIN_ID] || "https://sepolia.hypersync.xyz";

// Event Signature
const EVENT_ABI = parseAbiItem(
    "event AgentSwapExecuted(address indexed user, address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)"
);

export interface EnvioTrade {
    txHash: string;
    blockNumber: number;
    user: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: string;
    timestamp: number;
}

class EnvioService {
    private client: any = null;
    private initializationError: string | null = null;
    private circuitOpen: boolean = false;
    private lastCircuitError: number = 0;
    private readonly CIRCUIT_RESET_TIME = 60000; // Try again after 1 minute

    constructor() {
        try {
            // Dynamic require to prevent top-level crash if binary is missing
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const { HypersyncClient } = require("@envio-dev/hypersync-client");

            // Use API Token from .env if available
            const token = process.env.ENVIO_API_TOKEN;

            if (!token) {
                console.warn("⚠️  ENVIO_API_TOKEN is missing in .env");
                console.warn("⚠️  Skipping Envio connection to prevent 403 Forbidden spam.");
                console.warn("⚠️  System will use MOCK DATA for Live Feed.");
                this.circuitOpen = true; // Force circuit open permanently
                this.initializationError = "Missing API Token";
                return;
            }

            this.client = new HypersyncClient({
                url: HYPERSYNC_URL,
                apiToken: token,
            });
            console.log("✅ Envio HyperSync Client initialized");
        } catch (error) {
            console.warn("⚠️ Failed to initialize Envio HyperSync Client. Usage of /envio/trades will be limited.");
            this.initializationError = error instanceof Error ? error.message : String(error);
            this.circuitOpen = true;
        }
    }

    async getRecentTrades(limit: number = 20, userAddress?: string): Promise<EnvioTrade[]> {
        if (!this.client || this.initializationError) {
            return []; // Return empty instead of mock data as per user request
        }

        // Circuit Breaker Logic
        if (this.circuitOpen) {
            if (Date.now() - this.lastCircuitError > this.CIRCUIT_RESET_TIME) {
                this.circuitOpen = false; // logic reset
            } else {
                return []; // Return empty instead of mock data
            }
        }

        try {
            // Query HyperSync
            // Query 1: AgentSwapExecuted events from AgentRouter
            const swapQuery: any = {
                fromBlock: 0,
                logs: [
                    {
                        address: [AGENT_ROUTER_ADDRESS],
                        topics: userAddress ? [[], [pad(userAddress as `0x${string}`)]] : []
                    }
                ],
                fieldSelection: {
                    log: [
                        'BlockNumber',
                        'TransactionHash',
                        'Topic0',
                        'Topic1',
                        'Topic2',
                        'Topic3',
                        'Data',
                    ],
                }
            };

            // Query 2: Direct Transfers (Fallback Strategy) from Token Contract
            // We listen for Transfer(from, to, value) where 'from' is the user.
            const TRANSFER_EVENT_ABI = parseAbiItem("event Transfer(address indexed from, address indexed to, uint256 value)");
            const TOKEN_ADDRESS = process.env.VITE_USDC_ADDRESS || "0xc970a9C00AEAf314523B9B289F6644CcCbfE6930"; // DEMO Token

            const transferQuery: any = {
                fromBlock: 0,
                logs: [
                    {
                        address: [TOKEN_ADDRESS],
                        topics: userAddress ? [
                            // Topic0: Transfer event signature
                            // Topic1: 'from' address (User)
                            [],
                            [pad(userAddress as `0x${string}`)]
                        ] : []
                    }
                ],
                fieldSelection: {
                    log: [
                        'BlockNumber',
                        'TransactionHash',
                        'Topic0',
                        'Topic1',
                        'Topic2',
                        'Topic3',
                        'Data',
                    ],
                }
            };

            // Execute Queries in Parallel
            const [swapResults, transferResults] = await Promise.all([
                this.client.get(swapQuery),
                this.client.get(transferQuery)
            ]);

            const trades: EnvioTrade[] = [];

            // Process Swaps
            if (swapResults.data?.logs) {
                for (const log of swapResults.data.logs) {
                    try {
                        const decoded = decodeEventLog({
                            abi: [EVENT_ABI],
                            data: log.data as `0x${string}`,
                            topics: log.topics as [`0x${string}`, ...`0x${string}`[]]
                        });
                        const args: any = decoded.args;
                        trades.push({
                            txHash: log.transactionHash as string,
                            blockNumber: Number(log.blockNumber),
                            user: args.user,
                            tokenIn: args.tokenIn,
                            tokenOut: args.tokenOut,
                            amountIn: args.amountIn.toString(),
                            amountOut: args.amountOut.toString(),
                            timestamp: Number(args.timestamp)
                        });
                    } catch (e) {
                        // Ignore decoding errors
                    }
                }
            }

            // Process Transfers (Fallback)
            if (transferResults.data?.logs) {
                for (const log of transferResults.data.logs) {
                    try {
                        const decoded = decodeEventLog({
                            abi: [TRANSFER_EVENT_ABI],
                            data: log.data as `0x${string}`,
                            topics: log.topics as [`0x${string}`, ...`0x${string}`[]]
                        });
                        const args: any = decoded.args;

                        // Treat Transfer as Trade (Input = Output)
                        trades.push({
                            txHash: log.transactionHash as string,
                            blockNumber: Number(log.blockNumber),
                            user: args.from,
                            tokenIn: TOKEN_ADDRESS,
                            tokenOut: args.to,
                            amountIn: args.value.toString(),
                            amountOut: args.value.toString(),
                            timestamp: Math.floor(Date.now() / 1000) // Fallback timestamp
                        });
                    } catch (e) {
                        // Ignore
                    }
                }
            }

            // Deduplicate (by txHash) and Sort
            // Note: Transfer and Swap events might be same TX? (Not in Direct Transfer mode)
            // But if we had both, we might duplicate. Using Map by txHash could solve, but simple array is fine for now.
            return trades.sort((a, b) => b.blockNumber - a.blockNumber).slice(0, limit);

        } catch (error: any) {
            // Handle known errors quietly
            const errorMsg = String(error);
            const isForbidden = errorMsg.includes("403") || (error.status === 403);

            if (isForbidden) {
                console.warn("⚠️ Envio HyperSync 403 Forbidden. Circuit breaker tripped.");
                this.circuitOpen = true;
                this.lastCircuitError = Date.now();
            } else {
                console.error("HyperSync getRecentTrades Error:", errorMsg);
            }
            return []; // Return empty instead of mock data
        }
    }

    private getMockTrades(): EnvioTrade[] {
        return [
            {
                txHash: "0xMockTransactionHash1",
                blockNumber: 123456,
                user: "0xMockUser",
                tokenIn: "0xMockUSDC",
                tokenOut: "0xMockBRETT",
                amountIn: "10000000",
                amountOut: "1000000000000000000",
                timestamp: Math.floor(Date.now() / 1000)
            },
            {
                txHash: "0xMockTransactionHash2",
                blockNumber: 123459,
                user: "0xMockUser",
                tokenIn: "0xMockBRETT",
                tokenOut: "0xMockUSDC",
                amountIn: "5000000000000000000",
                amountOut: "45000000",
                timestamp: Math.floor(Date.now() / 1000) - 100
            }
        ];
    }
}

export const envioService = new EnvioService();
