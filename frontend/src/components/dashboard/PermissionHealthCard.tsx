"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface PermissionHealthCardProps {
  userAddress: string;
}

interface PermissionAnalytics {
  dailyUsed: number;
  dailyLimit: number;
  totalUsed: number;
  totalLimit: number;
  resetInSeconds: number;
  status: "HEALTHY" | "WARNING" | "CRITICAL";
}

export function PermissionHealthCard({ userAddress }: PermissionHealthCardProps) {
  const [analytics, setAnalytics] = useState<PermissionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!userAddress) return;

    const fetchPermissionData = async () => {
      try {
        setLoading(true);
        const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
        
        const response = await fetch(`${BACKEND_API_URL}/api/permission-analytics/${userAddress}`);
        if (response.ok) {
          const data: PermissionAnalytics = await response.json();
          setAnalytics(data);
        } else {
          // Handle non-OK responses, e.g., agent not registered
          setAnalytics(null);
        }
      } catch (error) {
        // Suppress console.error here as it's handled by global provider filter
        setAnalytics(null); // Clear analytics on error
      } finally {
        setLoading(false);
      }
    };

    fetchPermissionData();
    const interval = setInterval(fetchPermissionData, 30000); // Refresh every 30s

    return () => clearInterval(interval);
  }, [userAddress]);

  useEffect(() => {
    if (!analytics?.resetInSeconds) {
      setCountdown(null);
      return;
    }

    // Use a separate state for countdown to avoid infinite loop
    let currentSeconds = analytics.resetInSeconds;

    const updateCountdown = () => {
      if (currentSeconds <= 0) {
        setCountdown("0h 0m 0s");
        return;
      }

      const hours = Math.floor(currentSeconds / 3600);
      const minutes = Math.floor((currentSeconds % 3600) / 60);
      const seconds = currentSeconds % 60;
      setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      currentSeconds -= 1;
    };

    const countdownInterval = setInterval(updateCountdown, 1000);
    updateCountdown(); // Initial call

    return () => clearInterval(countdownInterval);
  }, [analytics?.resetInSeconds]); // Only re-run when resetInSeconds changes from backend

  if (loading) {
    return (
      <div className="glass-effect glass-effect-hover p-6 rounded-lg h-full">
        <div className="space-y-4">
          <div className="h-4 bg-zinc-800 rounded w-1/2 animate-pulse" />
          <div className="h-2 bg-zinc-800 rounded w-full animate-pulse" />
          <div className="pt-4 space-y-2">
            <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
            <div className="h-4 bg-zinc-800 rounded w-2/3 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="glass-effect p-6 rounded-lg h-full flex items-center justify-center">
        <p className="font-mono text-zinc-500 text-sm">No active permissions found.</p>
      </div>
    );
  }

  const percentage = (analytics.dailyUsed / analytics.dailyLimit) * 100;
  const remaining = analytics.dailyLimit - analytics.dailyUsed;

  let progressBarColor = "bg-emerald-400";
  if (percentage > 80) {
    progressBarColor = "bg-rose-500";
  } else if (percentage > 50) {
    progressBarColor = "bg-amber-400";
  }

  let statusColor = "text-emerald-400";
  if (analytics.status === "WARNING") {
    statusColor = "text-amber-400";
  } else if (analytics.status === "CRITICAL") {
    statusColor = "text-rose-500";
  }

  return (
    <div className="glass-effect glass-effect-hover p-6 rounded-lg h-full">
      <h3 className="text-sm font-mono text-zinc-400 uppercase tracking-wider mb-4">
        Permission Health
      </h3>

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-zinc-500">Daily Spending Limit</span>
            <span className="text-xs font-mono text-zinc-400">
              ${analytics.dailyUsed.toLocaleString()} / ${analytics.dailyLimit.toLocaleString()} used
            </span>
          </div>
          <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
            <motion.div
              className={`h-full ${progressBarColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-zinc-500">Remaining Today</span>
            <span className="text-lg font-mono text-emerald-400">${remaining.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-mono text-zinc-500">Reset In</span>
            <span className="text-sm font-mono text-zinc-400">{countdown || "N/A"}</span>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs font-mono text-zinc-500">Status</span>
            <span className={`text-sm font-mono ${statusColor}`}>{analytics.status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

