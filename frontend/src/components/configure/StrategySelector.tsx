"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";

export interface StrategyParams {
  targetPrice?: number; // For Limit Buy / Breakout / Stop Loss
  interval?: number;    // For DCA
  stopPrice?: number;   // For Stop Loss
  lowerBound?: number;  // For Grid
  upperBound?: number;  // For Grid
  grids?: number;       // For Grid
  threshold?: number;   // For Momentum (deprecated but kept for types)
}

interface StrategySelectorProps {
  selectedStrategy: string | null;
  onSelect: (strategy: string) => void;
  strategyParams: StrategyParams;
  onParamsChange: (params: StrategyParams) => void;
}

const STRATEGIES = [
  {
    id: "MARKET",
    name: "Market Order",
    desc: "Execute immediately at current price",
    hasParams: true
  },
  {
    id: "LIMIT_BUY",
    name: "Buy at Target",
    desc: "Buy when price hits specific level",
    hasParams: true,
    paramType: "targetPrice",
    paramLabel: "Target Price ($)",
    defaultParam: 0.85
  },
  {
    id: "BREAKOUT_BUY",
    name: "Breakout Buy",
    desc: "Buy if price breaks above target",
    hasParams: true,
    paramType: "targetPrice",
    paramLabel: "Breakout Price ($)",
    defaultParam: 0.95
  },
  {
    id: "DCA",
    name: "DCA (Accumulate)",
    desc: "Buy fixed amount every X hours",
    hasParams: true,
    paramType: "interval",
    paramLabel: "Interval (Hours)",
    defaultParam: 24
  },
  {
    id: "STOP_LOSS",
    name: "Stop Loss",
    desc: "Sell if price drops below target",
    hasParams: true,
    paramType: "stopPrice",
    paramLabel: "Stop Price ($)",
    defaultParam: 0.90
  },
  {
    id: "GRID",
    name: "Grid Trading",
    desc: "Buy low / Sell high within range",
    hasParams: true,
    paramType: "grid",
    paramLabel: "Grid Settings",
    defaultParam: 0
  },
];

// Add helper for price fetch
const useCurrentPrice = () => {
  const [price, setPrice] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchPrice = async () => {
      try {
        setLoading(true);
        const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
        const res = await fetch(`${BACKEND_API_URL}/api/price`);
        if (res.ok) {
          const data = await res.json();
          setPrice(data.price);
        }
      } catch (err) {
        console.error("Failed to fetch price", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 10000); // 10s refresh
    return () => clearInterval(interval);
  }, []);

  return { price, loading };
};

import React from "react"; // Ensure React is imported for hooks

export function StrategySelector({
  selectedStrategy,
  onSelect,
  strategyParams,
  onParamsChange
}: StrategySelectorProps) {
  const { price, loading } = useCurrentPrice();

  const handleParamChange = (key: keyof StrategyParams, value: number) => {
    onParamsChange({ ...strategyParams, [key]: value });
  };

  const renderInputs = (strategyId: string) => {
    switch (strategyId) {
      case "MARKET":
        return (
          <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-mono text-zinc-500 block">
                CURRENT PRICE ($)
              </label>
              {price && (
                <span className="text-xs font-mono text-emerald-400">
                  ${price.toFixed(4)}
                </span>
              )}
            </div>
            <div className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-400 font-mono text-sm">
              {price ? `~ ${price.toFixed(4)} USDC` : "Fetching price..."}
            </div>
          </div>
        );
      case "LIMIT_BUY":
        return (
          <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-mono text-zinc-500 block">
                TARGET PRICE ($)
              </label>
              {price && (
                <span className="text-xs font-mono text-emerald-400">
                  Current: ${price.toFixed(4)}
                </span>
              )}
            </div>
            <input
              type="number"
              step="0.0001"
              value={strategyParams.targetPrice || (price ? parseFloat((price * 0.95).toFixed(4)) : 0.85)}
              onChange={(e) => handleParamChange("targetPrice", parseFloat(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>
        );
      case "BREAKOUT_BUY":
        return (
          <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-mono text-zinc-500 block">
                BREAKOUT PRICE ($)
              </label>
              {price && (
                <span className="text-xs font-mono text-emerald-400">
                  Current: ${price.toFixed(4)}
                </span>
              )}
            </div>
            <input
              type="number"
              step="0.0001"
              value={strategyParams.targetPrice || (price ? parseFloat((price * 1.05).toFixed(4)) : 0.95)}
              onChange={(e) => handleParamChange("targetPrice", parseFloat(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>
        );
      // ... (Other cases similar update if needed, simplified for brevity as Limit/Breakout are most price-sensitive)
      // ... keeping others as is but adding the price hook context
      case "DCA":
        return (
          <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <label className="text-xs font-mono text-zinc-500 mb-2 block">
              INTERVAL (HOURS)
            </label>
            <input
              type="number"
              value={strategyParams.interval || 24}
              onChange={(e) => handleParamChange("interval", parseFloat(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>
        );
      case "STOP_LOSS":
        return (
          <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-mono text-zinc-500 block">
                STOP PRICE ($)
              </label>
              {price && (
                <span className="text-xs font-mono text-red-400">
                  Current: ${price.toFixed(4)}
                </span>
              )}
            </div>
            <input
              type="number"
              step="0.0001"
              value={strategyParams.stopPrice || (price ? parseFloat((price * 0.90).toFixed(4)) : 0.90)}
              onChange={(e) => handleParamChange("stopPrice", parseFloat(e.target.value))}
              className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 font-mono focus:border-emerald-500 focus:outline-none"
            />
          </div>
        );
      case "GRID":
        return (
          <div className="mt-4 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-mono text-zinc-500">GRID SETTINGS</span>
              {price && (
                <span className="text-xs font-mono text-emerald-400">
                  Current: ${price.toFixed(4)}
                </span>
              )}
            </div>
            <div>
              <label className="text-xs font-mono text-zinc-500 mb-1 block">LOWER BOUND ($)</label>
              <input
                type="number"
                step="0.0001"
                value={strategyParams.lowerBound || (price ? parseFloat((price * 0.90).toFixed(4)) : 0.90)}
                onChange={(e) => handleParamChange("lowerBound", parseFloat(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-zinc-500 mb-1 block">UPPER BOUND ($)</label>
              <input
                type="number"
                step="0.0001"
                value={strategyParams.upperBound || (price ? parseFloat((price * 1.10).toFixed(4)) : 1.10)}
                onChange={(e) => handleParamChange("upperBound", parseFloat(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-zinc-500 mb-1 block">GRID LEVELS</label>
              <input
                type="number"
                value={strategyParams.grids || 5}
                onChange={(e) => handleParamChange("grids", parseFloat(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-3 py-2 text-zinc-200 font-mono"
              />
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-zinc-100 font-mono">
          2. SELECT STRATEGY
        </h2>
        <div className="flex flex-col items-end">
          {selectedStrategy && (
            <div className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded mb-1">
              strategy: {selectedStrategy}
            </div>
          )}
          {price && !selectedStrategy && (
            <div className="text-xs font-mono text-zinc-400">
              Market: ${price.toFixed(4)}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {STRATEGIES.map((strategy) => {
          const isSelected = selectedStrategy === strategy.id;
          return (
            <motion.div
              key={strategy.id}
              layout
              className={`relative overflow-hidden rounded-xl border-2 transition-all ${isSelected
                ? "border-emerald-500/50 bg-emerald-500/5 shadow-lg shadow-emerald-500/10"
                : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700"
                }`}
            >
              <button
                onClick={() => onSelect(strategy.id)}
                className="w-full text-left p-4 flex items-start justify-between"
              >
                <div>
                  <h3 className={`font-mono font-bold mb-1 ${isSelected ? "text-emerald-400" : "text-zinc-200"}`}>
                    {strategy.name}
                  </h3>
                  <p className="text-xs text-zinc-500">{strategy.desc}</p>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Check size={12} className="text-emerald-400" />
                  </div>
                )}
              </button>

              <AnimatePresence>
                {isSelected && strategy.hasParams && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4"
                  >
                    {renderInputs(strategy.id)}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
