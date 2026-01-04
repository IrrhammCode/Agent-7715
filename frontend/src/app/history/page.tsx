"use client";

import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ClientOnly } from "@/components/shared/ClientOnly";
import { TradeHistory } from "@/components/history/TradeHistory";




const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface Trade {
  txHash: string;
  timestamp: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  price: number;
  strategy: string;
  pnl?: number;
}

export default function HistoryPage() {
  const { address, isConnected } = useAccount();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isConnected || !address) return;

    const fetchTrades = async () => {
      try {
        const response = await fetch(`${BACKEND_API_URL}/api/trades/${address}?limit=100`);
        const data = await response.json();
        setTrades(data.trades || []);
      } catch (error) {
        console.error("Error fetching trades:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, [address, isConnected, mounted]);

  if (!mounted) return null; // Prevent hydration mismatch

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Link href="/" className="text-emerald-400 hover:text-emerald-300 font-mono">
          ← Connect Wallet
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 font-mono">TRADING HISTORY</h1>
          <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            <Link
              href="/dashboard"
              className="px-4 py-2 hover:bg-zinc-800 rounded-md font-mono text-xs text-zinc-400 hover:text-emerald-400 transition-all"
            >
              DASHBOARD
            </Link>
            <Link
              href="/analytics"
              className="px-4 py-2 hover:bg-zinc-800 rounded-md font-mono text-xs text-zinc-400 hover:text-emerald-400 transition-all"
            >
              ANALYTICS
            </Link>
          </div>
        </div>

        {/* Envio Live Feed */}
        <div className="mb-8 p-6 glass-effect glass-effect-hover rounded-lg border border-emerald-500/10">
          <div className="flex items-center gap-2 mb-4 text-emerald-400">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h2 className="font-mono text-sm uppercase tracking-wider">Live Blockchain Feed (Envio Indexer)</h2>
          </div>
          <ClientOnly>
            {/* @ts-ignore */}
            <TradeHistory userAddress={address} />
          </ClientOnly>
        </div>

        {loading ? (
          <div className="glass-effect glass-effect-hover p-6 rounded-lg">
            <div className="space-y-3">
              {/* Header skeleton */}
              <div className="flex gap-4 pb-3 border-b border-zinc-800">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-3 bg-zinc-800 rounded flex-1 animate-pulse" />
                ))}
              </div>
              {/* Row skeletons */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4 py-3 border-b border-zinc-800/50">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <div key={j} className="h-4 bg-zinc-800 rounded flex-1 animate-pulse" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : trades.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-effect glass-effect-hover p-12 rounded-lg text-center"
          >
            <p className="font-mono text-zinc-500">No trades yet</p>
            <p className="font-mono text-zinc-600 text-sm mt-2">Start trading to see your history here</p>
          </motion.div>
        ) : (
          <div className="glass-effect glass-effect-hover rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-900/50 border-b border-zinc-800">
                  <tr>
                    <th className="text-left p-4 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="text-left p-4 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                      Strategy
                    </th>
                    <th className="text-right p-4 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                      Amount In
                    </th>
                    <th className="text-right p-4 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                      Amount Out
                    </th>
                    <th className="text-right p-4 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="text-right p-4 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                      P&L
                    </th>
                    <th className="text-left p-4 text-xs font-mono text-zinc-400 uppercase tracking-wider">
                      TX Hash
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade, idx) => (
                    <motion.tr
                      key={trade.txHash}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="border-b border-zinc-800 hover:bg-zinc-900/50 transition-colors"
                    >
                      <td className="p-4 font-mono text-sm text-zinc-400">
                        {new Date(trade.timestamp * 1000).toLocaleString()}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-zinc-900 text-emerald-400 rounded text-xs font-mono">
                          {trade.strategy}
                        </span>
                      </td>
                      <td className="p-4 text-right font-mono text-zinc-300">{trade.amountIn}</td>
                      <td className="p-4 text-right font-mono text-zinc-300">{trade.amountOut}</td>
                      <td className="p-4 text-right font-mono text-zinc-400">
                        ${trade.price.toFixed(4)}
                      </td>
                      <td className="p-4 text-right font-mono">
                        {trade.pnl !== undefined && (
                          <span
                            className={trade.pnl >= 0 ? "text-emerald-400" : "text-rose-500"}
                          >
                            {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <a
                          href={`https://sepolia.etherscan.io/tx/${trade.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-emerald-400 hover:text-emerald-300 hover:underline"
                        >
                          {trade.txHash.slice(0, 10)}...
                        </a>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

