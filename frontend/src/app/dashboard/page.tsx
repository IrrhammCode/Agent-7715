"use client";

import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { NetWorthCard } from "../../components/dashboard/NetWorthCard";
import { AgentStatusCard } from "../../components/dashboard/AgentStatusCard";
import { LiveTerminal } from "../../components/dashboard/LiveTerminal";
import { PermissionHealthCard } from "../../components/dashboard/PermissionHealthCard";
import { TradingHistoryChart } from "../../components/dashboard/TradingHistoryChart";
import { EmergencyStopButton } from "../../components/dashboard/EmergencyStopButton";
import { WalletBalanceCard } from "../../components/dashboard/WalletBalanceCard";
import { SkeletonCard } from "../../components/shared/SkeletonLoader";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { GodModePanel } from "../../components/dashboard/GodModePanel";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [portfolio, setPortfolio] = useState<any>(null);
  const [agentStatus, setAgentStatus] = useState<any>(null);
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

    const fetchData = async () => {
      try {
        setError(null);
        const [portfolioRes, statusRes] = await Promise.all([
          fetch(`${BACKEND_API_URL}/api/portfolio/${address}`),
          fetch(`${BACKEND_API_URL}/api/agent-status/${address}`),
        ]);

        if (!portfolioRes.ok || !statusRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const portfolioData = await portfolioRes.json();
        const statusData = await statusRes.json();

        setPortfolio(portfolioData);
        setAgentStatus(statusData);
        setLoading(false);
      } catch (error) {
        // Only log if it's not a connection error (backend might not be running)
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes("Failed to fetch") && !errorMessage.includes("ERR_CONNECTION_REFUSED")) {
          console.error("Error fetching dashboard data:", error);
        }
        setError("Backend server is not running. Please start the backend server.");
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <SkeletonCard />
            </div>
            <div className="lg:col-span-2">
              <SkeletonCard />
            </div>
            <div className="lg:col-span-3">
              <SkeletonCard />
            </div>
            <div>
              <SkeletonCard />
            </div>
            <div className="lg:col-span-4">
              <SkeletonCard />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <p className="text-zinc-400 font-mono">Please connect your wallet</p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-sm text-emerald-400 hover:border-emerald-500/50 hover:bg-zinc-900/70 transition-all"
          >
            ← Back to Landing
          </Link>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-8">
            <div className="h-9 bg-zinc-800 rounded w-48 animate-pulse" />
            <div className="h-10 bg-zinc-800 rounded w-40 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <SkeletonCard />
            </div>
            <div className="lg:col-span-2">
              <SkeletonCard />
            </div>
            <div className="lg:col-span-3">
              <SkeletonCard />
            </div>
            <div>
              <SkeletonCard />
            </div>
            <div className="lg:col-span-4">
              <SkeletonCard />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-effect glass-effect-hover p-8 rounded-lg border border-rose-500/50"
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-rose-400" />
              <h2 className="font-mono text-xl text-rose-400">Error Loading Dashboard</h2>
            </div>
            <p className="font-mono text-zinc-400 mb-6">{error}</p>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  const fetchData = async () => {
                    try {
                      const [portfolioRes, statusRes] = await Promise.all([
                        fetch(`${BACKEND_API_URL}/api/portfolio/${address}`),
                        fetch(`${BACKEND_API_URL}/api/agent-status/${address}`),
                      ]);
                      if (!portfolioRes.ok || !statusRes.ok) {
                        throw new Error("Failed to fetch dashboard data");
                      }
                      const portfolioData = await portfolioRes.json();
                      const statusData = await statusRes.json();
                      setPortfolio(portfolioData);
                      setAgentStatus(statusData);
                      setLoading(false);
                    } catch (error) {
                      setError("Backend server is not running. Please start the backend server.");
                      setLoading(false);
                    }
                  };
                  fetchData();
                }}
                className="px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-sm text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
              >
                RETRY
              </motion.button>
              <Link
                href="/configure"
                className="px-6 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg font-mono text-sm text-emerald-400 hover:bg-emerald-500/30 transition-all"
              >
                CONFIGURE AGENT
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <h1 className="text-3xl font-bold text-zinc-100 font-mono">DASHBOARD</h1>
          <div className="flex gap-2">
            <Link
              href="/configure"
              className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg font-mono text-sm text-emerald-400 hover:bg-emerald-500/30 hover:border-emerald-400 transition-all"
            >
              CONFIGURE AGENT
            </Link>
            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
              <Link
                href="/history"
                className="px-4 py-2 hover:bg-zinc-800 rounded-md font-mono text-xs text-zinc-400 hover:text-emerald-400 transition-all flex items-center"
              >
                HISTORY
              </Link>
              <Link
                href="/analytics"
                className="px-4 py-2 hover:bg-zinc-800 rounded-md font-mono text-xs text-zinc-400 hover:text-emerald-400 transition-all flex items-center"
              >
                ANALYTICS
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Top Left - Net Worth & PnL */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2"
          >
            <NetWorthCard portfolio={portfolio} />
          </motion.div>

          {/* Top Right - Agent Status */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="lg:col-span-2"
          >
            <AgentStatusCard agentStatus={agentStatus} />
          </motion.div>

          {/* Middle - Live Terminal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="lg:col-span-3"
          >
            <LiveTerminal userAddress={address} />
          </motion.div>

          {/* Wallet Balance */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
          >
            <WalletBalanceCard />
          </motion.div>

          {/* Permission Health */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <PermissionHealthCard userAddress={address} />
          </motion.div>

          {/* Emergency Stop */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
          >
            <EmergencyStopButton />
          </motion.div>

          {/* Trading History Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="lg:col-span-4"
          >
            <TradingHistoryChart userAddress={address} />
          </motion.div>
        </div>
      </div>
      <GodModePanel />
    </div>
  );
}

