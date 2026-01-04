"use client";

import { useAccount, useConnect } from "wagmi";
import { metaMask } from "wagmi/connectors";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  Bot,
  Shield,
  TrendingUp,
  BarChart3,
  Zap,
  Target,
  RefreshCw,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import { FeatureCard } from "../components/landing/FeatureCard";
import { TechStack } from "../components/landing/TechStack";

export default function LandingPage() {
  const { isConnected, address } = useAccount();
  const { connect, error: connectError } = useConnect();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering wallet-dependent content on client
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = () => {
    if (!isConnected) {
      try {
        connect({ connector: metaMask() });
      } catch (error) {
        // Error is handled by wagmi
        console.warn("Connection error:", error);
      }
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center space-y-12 max-w-6xl w-full"
      >
        {/* Main Title */}
        <div className="space-y-4">
          <h1 className="text-7xl md:text-9xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              AGENT
            </span>
            <br />
            <span className="text-zinc-100">7715</span>
          </h1>
          <p className="text-xl md:text-2xl text-zinc-400 font-light">
            Automated DeFi Trading Terminal
          </p>
          <p className="text-sm md:text-base text-zinc-500 font-mono">
            Powered by ERC-7715 Advanced Permissions • Ethereum Sepolia Testnet
          </p>
          <p className="text-xs md:text-sm text-amber-400/70 font-mono mt-2">
            ⚠️ Requires MetaMask Flask for Advanced Permissions
          </p>
        </div>

        {/* Problem Statement */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="max-w-3xl mx-auto"
        >
          <div className="glass-effect glass-effect-hover p-6 rounded-lg text-left">
            <h2 className="font-mono text-emerald-400 text-lg mb-3">The Problem</h2>
            <p className="text-zinc-300 leading-relaxed">
              Manual DeFi trading requires signing every transaction, making automation impossible. 
              Users can't set up automated strategies like DCA, stop-loss, or grid trading without 
              constant manual intervention.
            </p>
          </div>
        </motion.div>

        {/* Solution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="max-w-3xl mx-auto"
        >
          <div className="glass-effect glass-effect-hover p-6 rounded-lg text-left">
            <h2 className="font-mono text-emerald-400 text-lg mb-3">The Solution</h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Agent 7715 uses <span className="text-emerald-400 font-mono">ERC-7715 Advanced Permissions</span> to 
              enable automated trading on <span className="text-emerald-400 font-mono">Ethereum Sepolia Testnet</span>. Users grant granular permissions 
              (e.g., "spend 100 USDC/day on AgentRouter"), and the agent executes trades automatically using real testnet tokens 
              (USDC, WETH) without additional signatures. <span className="text-amber-400 font-mono">Requires MetaMask Flask</span> for Advanced Permissions support.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="flex items-center gap-2 font-mono text-xs text-zinc-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>No manual signatures per trade</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-zinc-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Granular permission control</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-zinc-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Multiple trading strategies</span>
              </div>
              <div className="flex items-center gap-2 font-mono text-xs text-zinc-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Real-time portfolio tracking</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Connect Button - Only render on client to prevent hydration mismatch */}
        {mounted && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {isConnected ? (
              <Link href="/dashboard">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-12 py-4 bg-emerald-500/20 border-2 border-emerald-500/50 rounded-lg font-mono text-emerald-400 text-lg tracking-wider uppercase hover:bg-emerald-500/30 hover:border-emerald-400 transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                >
                  ENTER TERMINAL
                </motion.button>
              </Link>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleConnect}
                className="px-12 py-4 bg-zinc-900/50 border-2 border-zinc-800 rounded-lg font-mono text-zinc-300 text-lg tracking-wider uppercase hover:border-emerald-500/50 hover:text-emerald-400 hover:bg-zinc-900/70 transition-all duration-300 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] relative overflow-hidden"
              >
                <span className="relative z-10">CONNECT WALLET</span>
                <motion.div
                  className="absolute inset-0 bg-emerald-500/10"
                  initial={{ x: "-100%" }}
                  whileHover={{ x: "100%" }}
                  transition={{ duration: 0.6 }}
                />
              </motion.button>
            )}
          </motion.div>
        )}

        {/* Status Indicator - Only render on client */}
        {mounted && isConnected && address && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm font-mono text-zinc-500 space-y-2"
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span>Connected: {address.slice(0, 6)}...{address.slice(-4)}</span>
            </div>
          </motion.div>
        )}

        {/* Connection Error - Only render on client */}
        {mounted && connectError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto p-4 bg-rose-500/10 border border-rose-500/50 rounded-lg"
          >
            <p className="text-sm font-mono text-rose-400 text-center">
              {connectError.message || "Failed to connect wallet. Please try again."}
            </p>
          </motion.div>
        )}

        {/* Key Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mt-16"
        >
          <h3 className="font-mono text-zinc-400 text-sm uppercase tracking-wider mb-6">
            Key Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
            <FeatureCard
              icon={Bot}
              title="7 Trading Strategies"
              description="DCA, Limit Orders, Stop Loss, Grid Trading, Momentum, Mean Reversion, and Market orders"
              delay={0.6}
            />
            <FeatureCard
              icon={Shield}
              title="ERC-7715 Permissions"
              description="Granular, time-limited permissions. Users control exactly what the agent can do"
              delay={0.7}
            />
            <FeatureCard
              icon={BarChart3}
              title="Ethereum Sepolia Testnet"
              description="Deployed on Ethereum Sepolia testnet. Uses real testnet tokens (USDC, WETH) for testing"
              delay={0.8}
            />
            <FeatureCard
              icon={TrendingUp}
              title="Portfolio Management"
              description="Real-time tracking, P&L calculation, trade history, and performance analytics"
              delay={0.9}
            />
            <FeatureCard
              icon={Zap}
              title="Envio Indexing"
              description="High-performance blockchain indexing for real-time trade feeds and analytics"
              delay={1.0}
            />
            <FeatureCard
              icon={Target}
              title="Risk Management"
              description="Max loss limits, position sizing, stop loss automation, and risk scoring"
              delay={1.1}
            />
            <FeatureCard
              icon={RefreshCw}
              title="Multi-Agent Support"
              description="Manage multiple agents with different strategies. Scalable architecture"
              delay={1.2}
            />
            <FeatureCard
              icon={DollarSign}
              title="Real Price Feeds"
              description="CoinGecko API integration for accurate market data and price history"
              delay={1.3}
            />
            <FeatureCard
              icon={Shield}
              title="MetaMask Flask Required"
              description="Uses MetaMask Flask (experimental) for ERC-7715 Advanced Permissions support"
              delay={1.4}
            />
            <FeatureCard
              icon={Bot}
              title="Smart Accounts Kit"
              description="Built with MetaMask Smart Accounts Kit for seamless permission management"
              delay={1.5}
            />
          </div>
        </motion.div>

        {/* Key Metrics & Capabilities */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="mt-16"
        >
          <h3 className="text-center font-mono text-zinc-400 text-sm uppercase tracking-wider mb-6">
            System Capabilities
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
            {[
              { label: "Trading Strategies", value: "7", icon: Bot },
              { label: "Ethereum Sepolia Tokens", value: "2", icon: BarChart3 },
              { label: "Price Data Sources", value: "2+", icon: DollarSign },
              { label: "Advanced Features", value: "10+", icon: Zap },
            ].map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + idx * 0.1 }}
                  className="glass-effect glass-effect-hover p-6 rounded-lg text-center"
                >
                  <Icon className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                  <div className="font-mono text-3xl text-emerald-400 mb-1">{stat.value}</div>
                  <div className="font-mono text-xs text-zinc-500">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Production Ready Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-12 max-w-4xl mx-auto"
        >
          <div className="glass-effect glass-effect-hover p-6 rounded-lg">
            <h3 className="font-mono text-emerald-400 text-sm uppercase tracking-wider mb-4 text-center">
              Production-Ready Features
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                "Backtesting Engine",
                "Agent-to-Agent Delegation (ERC-8004)",
                "Real-time WebSocket Notifications",
                "Advanced Analytics Dashboard",
                "Portfolio Management",
                "Risk Management System",
                "Multi-Strategy Orchestration",
                "Ethereum Sepolia Testnet Integration",
                "MetaMask Flask Support",
              ].map((feature, idx) => (
                <motion.div
                  key={feature}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.9 + idx * 0.05 }}
                  className="flex items-center gap-2 font-mono text-xs text-zinc-400"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Tech Stack */}
        <TechStack />

      </motion.div>
    </div>
  );
}
