"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Clock, AlertCircle } from "lucide-react";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface PermissionAnalyticsData {
  dailyUsed: number;
  dailyLimit: number;
  totalUsed: number;
  totalLimit: number;
  resetInSeconds: number;
  status: "HEALTHY" | "WARNING" | "CRITICAL";
  usageHistory: { timestamp: number; used: number }[];
}

export function PermissionAnalytics() {
  const { address } = useAccount();
  const [data, setData] = useState<PermissionAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${BACKEND_API_URL}/api/permission-analytics/${address}`);
        if (response.ok) {
          const analyticsData = await response.json();
          setData(analyticsData);
        }
        } catch (error) {
          // Only log if it's not a connection error (backend might not be running)
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes("Failed to fetch") && !errorMessage.includes("ERR_CONNECTION_REFUSED")) {
            console.error("Error fetching permission analytics:", error);
          }
        } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, [address]);

  if (loading) {
    return (
      <div className="glass-effect glass-effect-hover p-6 rounded-lg">
        <div className="space-y-4">
          <div className="h-4 bg-zinc-800 rounded w-1/2 animate-pulse" />
          <div className="h-[200px] bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass-effect p-6 rounded-lg text-center">
        <p className="font-mono text-zinc-400">No permission analytics available</p>
      </div>
    );
  }

  // Convert usageHistory to chart data
  const chartData = data.usageHistory.map((item) => ({
    name: new Date(item.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    used: item.used,
    limit: data.dailyLimit,
  }));

  const isWarning = data.status === "WARNING";
  const isCritical = data.status === "CRITICAL";

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-effect glass-effect-hover p-6 rounded-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-mono text-zinc-500 uppercase">Daily Used</p>
            <DollarSign className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-mono text-zinc-100">
            ${data.dailyUsed.toLocaleString()} / ${data.dailyLimit.toLocaleString()}
          </p>
          <p className={`text-sm font-mono mt-1 ${isCritical ? "text-rose-400" : isWarning ? "text-amber-400" : "text-emerald-400"}`}>
            {data.status}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-effect glass-effect-hover p-6 rounded-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-mono text-zinc-500 uppercase">Remaining</p>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <p className="text-2xl font-mono text-emerald-400">
            ${(data.dailyLimit - data.dailyUsed).toLocaleString()}
          </p>
          <p className="text-sm font-mono text-zinc-500 mt-1">
            Remaining today
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-effect glass-effect-hover p-6 rounded-lg"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-mono text-zinc-500 uppercase">Total Used</p>
            <DollarSign className="w-5 h-5 text-zinc-400" />
          </div>
          <p className="text-2xl font-mono text-zinc-100">
            ${data.totalUsed.toLocaleString()} / ${data.totalLimit.toLocaleString()}
          </p>
          <p className="text-sm font-mono text-zinc-500 mt-1">
            Total used / limit
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`glass-effect glass-effect-hover p-6 rounded-lg ${
            isCritical ? "border-rose-500/50" : isWarning ? "border-amber-400/50" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-mono text-zinc-500 uppercase">Status</p>
            {isCritical ? (
              <AlertCircle className="w-5 h-5 text-rose-400" />
            ) : isWarning ? (
              <AlertCircle className="w-5 h-5 text-amber-400" />
            ) : (
              <Clock className="w-5 h-5 text-emerald-400" />
            )}
          </div>
          <p
            className={`text-2xl font-mono ${
              isCritical ? "text-rose-400" : isWarning ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {isCritical ? "CRITICAL" : isWarning ? "WARNING" : "HEALTHY"}
          </p>
          <p className="text-sm font-mono text-zinc-500 mt-1">
            Daily limit: ${data.dailyLimit.toLocaleString()}
          </p>
        </motion.div>
      </div>

      {/* Usage Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-effect glass-effect-hover p-6 rounded-lg"
      >
        <h3 className="font-mono text-emerald-400 mb-4">Permission Usage (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="usageGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="name"
              stroke="#71717a"
              style={{ fontFamily: "JetBrains Mono", fontSize: "12px" }}
            />
            <YAxis
              stroke="#71717a"
              style={{ fontFamily: "JetBrains Mono", fontSize: "12px" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "8px",
                fontFamily: "JetBrains Mono",
              }}
            />
            <Area
              type="monotone"
              dataKey="used"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#usageGradient)"
            />
            <Line
              type="monotone"
              dataKey="limit"
              stroke="#71717a"
              strokeDasharray="5 5"
              strokeWidth={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}

