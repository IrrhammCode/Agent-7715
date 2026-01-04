"use client";

import { motion } from "framer-motion";

interface AgentStatusCardProps {
  agentStatus: any;
}

export function AgentStatusCard({ agentStatus }: AgentStatusCardProps) {
  if (!agentStatus) {
    return (
      <div className="glass-effect glass-effect-hover p-6 rounded-lg h-full">
        <div className="space-y-3">
          <div className="h-4 bg-zinc-800 rounded w-1/3 animate-pulse" />
          <div className="h-8 bg-zinc-800 rounded w-1/2 animate-pulse" />
          <div className="h-3 bg-zinc-800 rounded w-1/4 animate-pulse" />
        </div>
      </div>
    );
  }

  const isOnline = agentStatus?.agent?.isActive ?? false;
  const strategiesCount = agentStatus?.agent?.strategiesCount ?? 0;

  return (
    <div className="glass-effect glass-effect-hover p-6 rounded-lg h-full">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-2">
            Agent Status
          </p>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-mono text-zinc-100">AGENT 7715</h2>
            <div className="flex items-center gap-2">
              <motion.div
                className={`w-3 h-3 rounded-full ${
                  isOnline ? "bg-emerald-400" : "bg-amber-400"
                }`}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.7, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
              <span
                className={`font-mono text-sm ${
                  isOnline ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {isOnline ? "ONLINE" : "IDLE"}
              </span>
            </div>
          </div>
          {strategiesCount > 0 && (
            <p className="text-xs font-mono text-zinc-500 mt-2">
              {strategiesCount} {strategiesCount === 1 ? "strategy" : "strategies"} active
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

