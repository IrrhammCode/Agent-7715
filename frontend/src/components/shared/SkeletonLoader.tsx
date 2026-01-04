"use client";

import { motion } from "framer-motion";

export function SkeletonCard() {
  return (
    <div className="glass-effect glass-effect-hover p-6 rounded-lg">
      <div className="space-y-3">
        <div className="h-4 bg-zinc-800 rounded w-1/3 animate-pulse" />
        <div className="h-8 bg-zinc-800 rounded w-1/2 animate-pulse" />
        <div className="h-3 bg-zinc-800 rounded w-2/3 animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-zinc-800 rounded animate-pulse ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="glass-effect glass-effect-hover p-6 rounded-lg">
      <div className="h-4 bg-zinc-800 rounded w-1/4 mb-4 animate-pulse" />
      <div className="h-[300px] bg-zinc-900/50 rounded flex items-end justify-between gap-2 p-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <motion.div
            key={i}
            className="flex-1 bg-zinc-800 rounded-t"
            initial={{ height: 0 }}
            animate={{ height: `${Math.random() * 60 + 20}%` }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
          />
        ))}
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-effect glass-effect-hover p-6 rounded-lg">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex gap-4 pb-3 border-b border-zinc-800">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 bg-zinc-800 rounded flex-1 animate-pulse" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 bg-zinc-800 rounded flex-1 animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

