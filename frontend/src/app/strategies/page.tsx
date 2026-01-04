"use client";

import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import Link from "next/link";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface Strategy {
  id: string;
  name: string;
  active: boolean;
  trades: number;
  winRate: number;
  pnl: number;
  pnlPercent: number;
}

export default function StrategiesPage() {
  const { address, isConnected } = useAccount();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering wallet-dependent content on client
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isConnected || !address) {
      if (mounted) {
        setLoading(false);
      }
      return;
    }

    const fetchStrategies = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch agent status to get strategies
        const response = await fetch(`${BACKEND_API_URL}/api/agent-status/${address}`);
        if (!response.ok) {
          throw new Error("Failed to fetch strategies");
        }

        const data = await response.json();

        // Fetch analytics for strategy performance
        const analyticsResponse = await fetch(`${BACKEND_API_URL}/api/analytics/${address}`);
        const analytics = analyticsResponse.ok ? await analyticsResponse.json() : null;

        // Transform agent data to strategies format
        // Transform agent data to strategies format
        if (data.agent && data.agent.strategiesCount > 0) {
          // Get strategy performance from analytics if available
          const strategyPerformance = analytics?.strategyPerformance || {};

          // Map strategies from agent (Source of Truth)
          const strategyList: Strategy[] = [];

          if (data.agent.strategies && Array.isArray(data.agent.strategies)) {
            data.agent.strategies.forEach((strat: any, index: number) => {
              const strategyId = strat.strategy;
              const perf = strategyPerformance[strategyId] || { trades: 0, profit: 0 };

              // Determine display name based on ID and Params
              let displayName = strategyId;
              if (strategyId === "LIMIT_ORDER") {
                if (strat.params?.condition === "ABOVE") displayName = "Breakout Buy";
                else if (strat.params?.condition === "BELOW") displayName = "Limit Buy (Dip)";
                else displayName = "Limit Order";
              }
              else if (strategyId === "STOP_LOSS") displayName = "Stop Loss";
              else if (strategyId === "DCA") displayName = "Dollar Cost Averaging";
              else if (strategyId === "MARKET") displayName = "Market Order";
              else if (strategyId === "GRID_TRADING") displayName = "Grid Trading";

              strategyList.push({
                // Ensure unique ID by appending index, as user can have multiple of same strategy
                id: `${strategyId.toLowerCase()}_${index}`,
                name: displayName,
                active: data.agent.isActive, // Simplified: Assume all active if agent is active
                trades: perf.trades || 0,
                winRate: 0,
                pnl: perf.profit || 0,
                pnlPercent: 0,
              });
            });
          }

          // Fallback if strategies array missing but count > 0 (backward compatibility or error)
          if (strategyList.length === 0) {
            // Try building from analytics as fallback
            if (analytics && analytics.strategyPerformance) {
              Object.entries(analytics.strategyPerformance).forEach(([strategyId, perf]: [string, any]) => {
                let displayName = strategyId; // ... (simplified mapping)
                if (strategyId === "LIMIT_ORDER") displayName = "Limit Order"; // Generic fallback
                // ...
                strategyList.push({
                  id: strategyId.toLowerCase(),
                  name: displayName,
                  active: true,
                  trades: perf.trades || 0,
                  winRate: 0,
                  pnl: perf.profit || 0,
                  pnlPercent: 0
                });
              });
            }
          }

          // Final fallback
          if (strategyList.length === 0) {
            strategyList.push({
              id: "market",
              name: "Market Order",
              active: data.agent.isActive,
              trades: 0,
              winRate: 0,
              pnl: 0,
              pnlPercent: 0,
            });
          }

          setStrategies(strategyList);
        } else {
          // No strategies yet
          setStrategies([]);
        }
      } catch (error) {
        // Only log if it's not a connection error (backend might not be running)
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes("Failed to fetch") && !errorMessage.includes("ERR_CONNECTION_REFUSED")) {
          console.error("Error fetching strategies:", error);
        }
        // Don't show error if backend is just not running - show empty state instead
        const isConnectionError = errorMessage.includes("Failed to fetch") || errorMessage.includes("ERR_CONNECTION_REFUSED");
        if (!isConnectionError) {
          setError(errorMessage);
        }
        setStrategies([]);
      } finally {
        setLoading(false);
      }
    };

    fetchStrategies();
    const interval = setInterval(fetchStrategies, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, [mounted, address, isConnected]);

  // Show loading state until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-8">
            <div className="h-9 bg-zinc-800 rounded w-48 animate-pulse" />
            <div className="h-10 bg-zinc-800 rounded w-40 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-effect p-6 rounded-lg space-y-4">
                <div className="h-6 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Link href="/" className="text-emerald-400 hover:text-emerald-300 font-mono">
          ← Connect Wallet
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-zinc-100 font-mono">STRATEGIES</h1>
            <div className="h-10 w-40 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-effect p-6 rounded-lg space-y-4">
                <div className="h-6 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 bg-zinc-800 rounded animate-pulse" />
                <div className="h-4 bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 font-mono mb-2">STRATEGIES</h1>
            <p className="text-sm font-mono text-zinc-500">
              Manage your active trading strategies
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-sm text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-all hover:bg-zinc-900/70"
            >
              DASHBOARD
            </Link>
            <Link
              href="/configure"
              className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg font-mono text-sm text-emerald-400 hover:bg-emerald-500/30 hover:border-emerald-400 transition-all"
            >
              + NEW STRATEGY
            </Link>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-effect glass-effect-hover p-4 rounded-lg border border-rose-500/50"
          >
            <p className="font-mono text-rose-400 text-sm">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setError(null);
                setLoading(true);
                const fetchStrategies = async () => {
                  try {
                    const response = await fetch(`${BACKEND_API_URL}/api/agent-status/${address}`);
                    if (!response.ok) throw new Error("Failed to fetch strategies");
                    const data = await response.json();
                    if (data.agent && data.agent.strategiesCount > 0) {
                      setStrategies([{
                        id: "market",
                        name: "Market Order",
                        active: data.agent.isActive,
                        trades: 0,
                        winRate: 0,
                        pnl: 0,
                        pnlPercent: 0,
                      }]);
                    } else {
                      setStrategies([]);
                    }
                  } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    if (!errorMessage.includes("Failed to fetch") && !errorMessage.includes("ERR_CONNECTION_REFUSED")) {
                      setError(errorMessage);
                    }
                    setStrategies([]);
                  } finally {
                    setLoading(false);
                  }
                };
                fetchStrategies();
              }}
              className="mt-3 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-xs text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
            >
              RETRY
            </motion.button>
          </motion.div>
        )}

        {strategies.length === 0 && !error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-effect glass-effect-hover p-12 rounded-lg text-center"
          >
            <p className="font-mono text-zinc-500 mb-2">No strategies configured</p>
            <p className="font-mono text-zinc-600 text-sm mb-4">
              Configure your first trading strategy to get started
            </p>
            <Link
              href="/configure"
              className="inline-block px-6 py-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg font-mono text-sm text-emerald-400 hover:bg-emerald-500/30 transition-all"
            >
              CONFIGURE STRATEGY
            </Link>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.map((strategy, idx) => (
              <motion.div
                key={strategy.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="glass-effect glass-effect-hover p-6 rounded-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-mono text-zinc-100 mb-1">{strategy.name}</h3>
                    {strategy.active ? (
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-mono">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-zinc-800 text-zinc-500 rounded text-xs font-mono">
                        INACTIVE
                      </span>
                    )}
                  </div>
                  <button
                    className={`px-3 py-1 rounded text-xs font-mono transition-all ${strategy.active
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30"
                      : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30"
                      }`}
                  >
                    {strategy.active ? "DISABLE" : "ENABLE"}
                  </button>
                </div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="space-y-3 pt-4 border-t border-zinc-800"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono text-zinc-500">Trades</span>
                    <span className="font-mono text-zinc-300">{strategy.trades}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono text-zinc-500">Win Rate</span>
                    <span className="font-mono text-zinc-300">{strategy.winRate}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-mono text-zinc-500">P&L</span>
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`font-mono ${strategy.pnl >= 0 ? "text-emerald-400" : "text-rose-500"
                        }`}
                    >
                      {strategy.pnl >= 0 ? "+" : ""}${strategy.pnl.toFixed(2)} (
                      {strategy.pnlPercent >= 0 ? "+" : ""}
                      {strategy.pnlPercent.toFixed(2)}%)
                    </motion.span>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
