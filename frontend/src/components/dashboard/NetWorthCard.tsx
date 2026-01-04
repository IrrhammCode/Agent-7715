"use client";

import { motion } from "framer-motion";

interface NetWorthCardProps {
  portfolio: any;
}

export function NetWorthCard({ portfolio }: NetWorthCardProps) {
  if (!portfolio) {
    return (
      <div className="glass-effect glass-effect-hover p-6 rounded-lg h-full">
        <div className="space-y-3">
          <div className="h-4 bg-zinc-800 rounded w-1/3 animate-pulse" />
          <div className="h-10 bg-zinc-800 rounded w-1/2 animate-pulse" />
          <div className="h-12 bg-zinc-800 rounded w-full animate-pulse" />
        </div>
      </div>
    );
  }

  const totalValue = portfolio?.totalValueUSD || 0;
  const pnl = portfolio?.totalPnL || 0;
  const pnlPercent = portfolio?.totalPnLPercent || 0;
  const isPositive = pnl >= 0;

  // Generate sparkline data from portfolio history (if available)
  // For now, create simple trend from current value
  const baseValue = totalValue || 100;
  const sparklineData = Array.from({ length: 10 }, (_, i) => {
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    return baseValue * (1 + variation * (i / 10));
  });

  return (
    <div className="glass-effect glass-effect-hover p-6 rounded-lg h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
            Net Worth
          </p>
          <p className="text-4xl font-mono text-zinc-100 mb-1">
            ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
            P&L
          </p>
          <p
            className={`text-2xl font-mono ${
              isPositive ? "text-emerald-400" : "text-rose-500"
            }`}
          >
            {isPositive ? "+" : ""}
            {pnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p
            className={`text-sm font-mono ${
              isPositive ? "text-emerald-400" : "text-rose-500"
            }`}
          >
            {isPositive ? "+" : ""}
            {pnlPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Sparkline Chart */}
      <div className="h-12 mt-4 relative">
        <svg className="w-full h-full" viewBox="0 0 200 40" preserveAspectRatio="none">
          <motion.polyline
            points={sparklineData
              .map((val, idx) => {
                const x = (idx / (sparklineData.length - 1)) * 200;
                const y = 40 - (val / Math.max(...sparklineData)) * 40;
                return `${x},${y}`;
              })
              .join(" ")}
            fill="none"
            stroke={isPositive ? "#34d399" : "#f43f5e"}
            strokeWidth="2"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1, ease: "easeInOut" }}
          />
        </svg>
      </div>
    </div>
  );
}

