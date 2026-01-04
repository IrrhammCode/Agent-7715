"use client";

import { useState, useEffect } from "react";
import { useWebSocket } from "../../hooks/useWebSocket";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";
import { useAccount } from "wagmi";

export function NotificationCenter() {
  const { address } = useAccount();
  const { messages, connected } = useWebSocket(["TRADE_EXECUTED", "PORTFOLIO_UPDATE", "RISK_ALERT"]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render on server
  if (!mounted) {
    return null;
  }

  const handleDismiss = (timestamp: number) => {
    setDismissed((prev) => new Set([...prev, timestamp.toString()]));
  };

  // Filter messages by user address (if available)
  const visibleMessages = messages.filter((msg) => {
    if (dismissed.has(msg.timestamp.toString())) return false;
    // If address is available, filter by it, otherwise show all
    if (address && msg.data?.userAddress) {
      return msg.data.userAddress.toLowerCase() === address.toLowerCase();
    }
    // Show all messages if no address filter
    return true;
  });

  // Don't show if no messages or not connected (silently fail)
  if (!connected || visibleMessages.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {visibleMessages.slice(0, 3).map((message) => (
          <motion.div
            key={message.timestamp}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className="glass-effect glass-effect-hover p-4 rounded-lg border border-zinc-800"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1">
                {message.type === "TRADE_EXECUTED" && (
                  <TrendingUp className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                {message.type === "PORTFOLIO_UPDATE" && (
                  <DollarSign className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                )}
                {message.type === "RISK_ALERT" && (
                  <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-mono text-xs text-zinc-400 mb-1">{message.type.replace("_", " ")}</p>
                  {message.type === "TRADE_EXECUTED" && (
                    <p className="font-mono text-sm text-zinc-100">
                      {message.data.amountIn} {message.data.tokenIn.slice(0, 4)} → {message.data.amountOut}{" "}
                      {message.data.tokenOut.slice(0, 4)}
                    </p>
                  )}
                  {message.type === "PORTFOLIO_UPDATE" && (
                    <p className="font-mono text-sm text-zinc-100">
                      P&L: {message.data.pnlPercentage >= 0 ? "+" : ""}
                      {message.data.pnlPercentage.toFixed(2)}%
                    </p>
                  )}
                  {message.type === "RISK_ALERT" && (
                    <p className="font-mono text-sm text-zinc-100">{message.data.message}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDismiss(message.timestamp)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

