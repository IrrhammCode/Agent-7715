"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Play, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// Contract addresses (Ethereum Sepolia testnet addresses)
const USDC = process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const BRETT = process.env.NEXT_PUBLIC_BRETT_ADDRESS || "0x532f27101965dd16442E59d40670FaF5eBB142E4";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  netProfit: number;
  returnPercentage: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  profitFactor: number;
  equityCurve: Array<{ timestamp: Date; equity: number; drawdown: number }>;
}

export function BacktestPanel() {
  const [strategy, setStrategy] = useState("MOMENTUM");
  const [initialCapital, setInitialCapital] = useState(1000);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(null);

  const handleRunBacktest = async () => {
    setLoading(true);
    setResult(null);

    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const response = await fetch(`${BACKEND_API_URL}/api/backtest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          strategy,
          tokenIn: USDC,
          tokenOut: BRETT,
          initialCapital,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          params: {
            momentumThreshold: 2,
            positionSize: 0.1,
            maxPositionSize: 0.5,
          },
        }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Backtest error:", error);
    } finally {
      setLoading(false);
    }
  };

  const equityData =
    result?.equityCurve.map((point) => ({
      date: new Date(point.timestamp).toLocaleDateString(),
      equity: point.equity,
      drawdown: point.drawdown,
    })) || [];

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <div className="glass-effect glass-effect-hover p-6 rounded-lg">
        <h3 className="font-mono text-emerald-400 mb-4">Backtest Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-2">Strategy</label>
            <select
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 font-mono text-zinc-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="MOMENTUM">Momentum</option>
              <option value="MEAN_REVERSION">Mean Reversion</option>
              <option value="DCA">DCA</option>
              <option value="GRID_TRADING">Grid Trading</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-2">Initial Capital ($)</label>
            <input
              type="number"
              value={initialCapital}
              onChange={(e) => setInitialCapital(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 font-mono text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-zinc-400 mb-2">Period (days)</label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 font-mono text-zinc-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>
        <motion.button
          whileHover={{ scale: loading ? 1 : 1.02 }}
          whileTap={{ scale: loading ? 1 : 0.98 }}
          onClick={handleRunBacktest}
          disabled={loading}
          className="mt-4 px-6 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg font-mono text-emerald-400 hover:bg-emerald-500/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <motion.div
                className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <span>Running Backtest...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              <span>Run Backtest</span>
            </>
          )}
        </motion.button>
      </div>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="glass-effect glass-effect-hover p-4 rounded-lg">
              <p className="text-xs font-mono text-zinc-500 mb-1">Return</p>
              <p
                className={`text-xl font-mono ${
                  result.returnPercentage >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {result.returnPercentage >= 0 ? "+" : ""}
                {result.returnPercentage.toFixed(2)}%
              </p>
            </div>
            <div className="glass-effect glass-effect-hover p-4 rounded-lg">
              <p className="text-xs font-mono text-zinc-500 mb-1">Win Rate</p>
              <p className="text-xl font-mono text-zinc-100">{result.winRate.toFixed(1)}%</p>
            </div>
            <div className="glass-effect glass-effect-hover p-4 rounded-lg">
              <p className="text-xs font-mono text-zinc-500 mb-1">Max Drawdown</p>
              <p className="text-xl font-mono text-rose-400">{result.maxDrawdown.toFixed(2)}%</p>
            </div>
            <div className="glass-effect glass-effect-hover p-4 rounded-lg">
              <p className="text-xs font-mono text-zinc-500 mb-1">Profit Factor</p>
              <p className="text-xl font-mono text-zinc-100">{result.profitFactor.toFixed(2)}</p>
            </div>
          </div>

          {/* Equity Curve */}
          <div className="glass-effect glass-effect-hover p-6 rounded-lg">
            <h3 className="font-mono text-emerald-400 mb-4">Equity Curve</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={equityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#71717a" style={{ fontFamily: "JetBrains Mono" }} />
                <YAxis stroke="#71717a" style={{ fontFamily: "JetBrains Mono" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: "8px",
                    fontFamily: "JetBrains Mono",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="equity"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Trade Statistics */}
          <div className="glass-effect glass-effect-hover p-6 rounded-lg">
            <h3 className="font-mono text-emerald-400 mb-4">Trade Statistics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs font-mono text-zinc-500">Total Trades</p>
                <p className="text-lg font-mono text-zinc-100 mt-1">{result.totalTrades}</p>
              </div>
              <div>
                <p className="text-xs font-mono text-zinc-500">Winning</p>
                <p className="text-lg font-mono text-emerald-400 mt-1">{result.winningTrades}</p>
              </div>
              <div>
                <p className="text-xs font-mono text-zinc-500">Losing</p>
                <p className="text-lg font-mono text-rose-400 mt-1">{result.losingTrades}</p>
              </div>
              <div>
                <p className="text-xs font-mono text-zinc-500">Net Profit</p>
                <p
                  className={`text-lg font-mono mt-1 ${
                    result.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  ${result.netProfit.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

