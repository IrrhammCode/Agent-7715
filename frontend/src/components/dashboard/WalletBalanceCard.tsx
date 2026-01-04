"use client";

import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { Wallet, ExternalLink, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { formatEther, formatUnits } from "viem";

// MockUSDC address (deployed) - kept for compatibility
const MOCK_USDC_ADDRESS = "0x76E1e74ddc9A6b9ef729CDCf496080b2445a2604" as const;

// Demo Token Address (Mock Mode)
const REAL_USDC_ADDRESS = "0xc970a9C00AEAf314523B9B289F6644CcCbfE6930" as const;

// USDC contract address - use MockUSDC if available from env, otherwise real USDC
// In Next.js, process.env is only available at build time, so we need to handle it properly
const getUSDCAddress = (): `0x${string}` => {
  if (typeof window !== "undefined") {
    // Client-side: check from window or use default
    const envAddress = (window as any).__NEXT_PUBLIC_USDC_ADDRESS__ || process.env.NEXT_PUBLIC_USDC_ADDRESS;
    if (envAddress) {
      return envAddress as `0x${string}`;
    }
  }
  // Server-side or fallback: use env or default to MockUSDC for testing
  return (process.env.NEXT_PUBLIC_USDC_ADDRESS || REAL_USDC_ADDRESS) as `0x${string}`;
};

const USDC_ADDRESS = getUSDCAddress();

// Check if this is MockUSDC (always show mint button for MockUSDC)
const isMockUSDC = USDC_ADDRESS.toLowerCase() === MOCK_USDC_ADDRESS.toLowerCase();

// MockUSDC ABI (includes mintToSelf function)
const MOCK_USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [{ name: "amount", type: "uint256" }],
    name: "mintToSelf",
    outputs: [],
    type: "function",
  },
] as const;

// Sepolia USDC ABI (Standard ERC20)
const REAL_USDC_ABI = [
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
] as const;

const USDC_ABI = isMockUSDC ? MOCK_USDC_ABI : REAL_USDC_ABI;

export function WalletBalanceCard() {
  const { address, isConnected } = useAccount();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch portfolio from backend (which supports Demo Mode / God Mode)
  const fetchPortfolio = async () => {
    if (!address) return;
    setLoading(true);
    try {
      // Use public env for backend URL
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      const res = await fetch(`${backendUrl}/api/portfolio/${address}`);
      if (res.ok) {
        const data = await res.json();
        setPortfolioData(data);
      }
    } catch (error) {
      console.error("Failed to fetch portfolio:", error);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    if (isConnected && address) {
      fetchPortfolio();
      // Poll every 5 seconds to catch Demo Mode toggles quickly
      const interval = setInterval(fetchPortfolio, 5000);
      return () => clearInterval(interval);
    }
  }, [isConnected, address]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPortfolio();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  if (!isConnected || !address) {
    return null;
  }

  // Extract balances from portfolio data
  // Fallback to 0 if loading or error
  let ethAmount = 0;
  let usdcAmount = 0;

  if (portfolioData && portfolioData.positions) {
    const ethPos = portfolioData.positions.find((p: any) => p.symbol === "ETH");
    const usdcPos = portfolioData.positions.find((p: any) => p.symbol === "USDC");

    if (ethPos) {
      // Balance is BigInt string in backend, we need to convert back from Wei/Units
      // But portfolio data usually has formatted values or we can use valueUSD/price for approx
      // Better: use the 'balance' field which is raw BigInt string
      ethAmount = parseFloat(formatEther(BigInt(ethPos.balance)));
    }

    if (usdcPos) {
      usdcAmount = parseFloat(formatUnits(BigInt(usdcPos.balance), 18));
    }
  }

  const ethFormatted = ethAmount.toFixed(4);
  const usdcFormatted = usdcAmount.toFixed(2);
  const explorerUrl = `https://sepolia.etherscan.io/address/${address}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-effect glass-effect-hover p-6 rounded-lg border border-zinc-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-400" />
          <h3 className="font-mono text-sm font-semibold text-zinc-300">
            WALLET BALANCE
          </h3>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handleRefresh}
          disabled={isRefreshing || loading}
          className="p-1.5 rounded-lg bg-zinc-900/50 border border-zinc-800 hover:border-emerald-500/50 transition-all disabled:opacity-50"
          title="Refresh balance"
        >
          <RefreshCw
            className={`w-4 h-4 text-zinc-400 ${isRefreshing || loading ? "animate-spin" : ""
              }`}
          />
        </motion.button>
      </div>

      {/* Address */}
      <div className="mb-4 p-2 bg-zinc-900/50 rounded border border-zinc-800">
        <p className="text-xs text-zinc-500 font-mono mb-1">Address</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-mono text-zinc-300">
            {address.slice(0, 6)}...{address.slice(-4)}
          </p>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 transition-colors"
            title="View on Arbiscan"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Balances */}
      <div className="space-y-3">
        {/* ETH Balance */}
        <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded border border-zinc-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-400">Ξ</span>
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-mono">ETH</p>
              {loading && !portfolioData ? (
                <div className="h-5 w-20 bg-zinc-800 rounded animate-pulse" />
              ) : (
                <p className="text-lg font-mono font-semibold text-zinc-100">
                  {ethFormatted}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* USDC Balance */}
        <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded border border-zinc-800/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-xs font-bold text-emerald-400">$</span>
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-mono">DEMO</p>
              {loading && !portfolioData ? (
                <div className="h-5 w-20 bg-zinc-800 rounded animate-pulse" />
              ) : (
                <p className="text-lg font-mono font-semibold text-zinc-100">
                  {usdcFormatted}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Network Info */}
      <div className="mt-4 pt-4 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <p className="text-xs text-zinc-500 font-mono">Network</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
            <p className="text-xs font-mono text-blue-500">Ethereum Sepolia</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
