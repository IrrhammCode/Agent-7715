"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { envioClient, RECENT_TRADES_QUERY, USER_TRADES_QUERY, type Trade } from "../../lib/envio";
import { formatUnits } from "viem";
import { formatDistanceToNow } from "date-fns"; // Check if date-fns is installed, if not will use native
import { Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface TradeHistoryProps {
    userAddress?: string; // If provided, shows specific user trades, else shows filtered recent
}

export function TradeHistory({ userAddress }: TradeHistoryProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ["trades", "envio", userAddress],
        queryFn: async () => {
            // FALLBACK: Use local backend history instead of Envio (due to specific Node.js v24 binary issues on Windows)
            if (!userAddress) return { trades: [] };

            // USE ENVIO ENDPOINT
            const url = new URL(`/api/envio/trades`, process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001");
            url.searchParams.set("limit", "20");
            if (userAddress) {
                url.searchParams.set("userAddress", userAddress);
            }

            const res = await fetch(url.toString());
            if (!res.ok) throw new Error("Failed to fetch trades");
            return res.json();
        },
        refetchInterval: 5000,
        retry: false,
    });

    if (!mounted) return null;

    if (error) {
        return (
            <div className="p-4 border border-rose-500/20 bg-rose-500/10 rounded-lg text-center">
                <p className="text-sm text-rose-400 font-mono mb-2">
                    Failed to load live trades via Envio HyperSync.
                </p>
                <button
                    onClick={() => refetch()}
                    className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 rounded text-xs font-mono transition-colors"
                >
                    Retry Connection
                </button>
            </div>
        );
    }

    // Adapter for the new data structure
    const trades = (data?.trades || []).map((t: any) => ({
        id: t.txHash,
        transactionHash: t.txHash,
        tokenIn: t.tokenIn,
        tokenOut: t.tokenOut,
        amountIn: t.amountIn,
        amountOut: t.amountOut,
        timestamp: t.timestamp.toString(),
        user: t.user
    }));

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="font-mono text-emerald-400 text-sm uppercase tracking-wider">
                    {userAddress ? "Your Trade History" : "Recent Executions"}
                </h3>
                {isLoading && <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />}
            </div>

            <div className="space-y-2">
                {trades.length === 0 && !isLoading ? (
                    <div className="text-center py-8 text-zinc-500 font-mono text-sm">
                        No trades executed yet.
                    </div>
                ) : (
                    trades.map((trade, idx) => (
                        <motion.div
                            key={trade.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="glass-effect p-4 rounded-lg flex items-center justify-between hover:border-emerald-500/30 transition-colors"
                        >
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <span className={`font-mono font-bold ${Number(trade.amountOut) > 0 ? "text-emerald-400" : "text-blue-400"}`}>
                                        {Number(trade.amountOut) > 0 ? "Buy" : "Transfer"}
                                    </span>
                                    <span className="font-mono text-zinc-100">
                                        {/* Demo Env: Treat all as 18 decimals for consistency with backend */}
                                        {Number(trade.amountOut) > 0
                                            ? `${parseFloat(formatUnits(BigInt(trade.amountOut), 18)).toFixed(4)} WETH`
                                            : "USDC -> Agent"
                                        }
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs font-mono text-zinc-500">
                                    {/* Demo Env: Backend initializes USDC with 18 decimals */}
                                    <span>with {parseFloat(formatUnits(BigInt(trade.amountIn), 18)).toFixed(2)} USDC</span>
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-1">
                                <a
                                    href={`https://sepolia.etherscan.io/tx/${trade.transactionHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-xs font-mono text-blue-400 hover:text-blue-300"
                                >
                                    <span>{trade.transactionHash.slice(0, 6)}...</span>
                                    <ExternalLink className="w-3 h-3" />
                                </a>
                                <span className="text-xs font-mono text-zinc-600">
                                    {/* Just display timestamp for now to avoid date-fns dep check */}
                                    {new Date(Number(trade.timestamp) * 1000).toLocaleTimeString()}
                                </span>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        </div>
    );
}
