"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface PermissionSlidersProps {
  dailyBudget: number;
  onDailyBudgetChange: (value: number) => void;
  frequency: string;
  onFrequencyChange: (value: string) => void;
}

export function PermissionSliders({
  dailyBudget,
  onDailyBudgetChange,
  frequency,
  onFrequencyChange,
}: PermissionSlidersProps) {
  return (
    <div className="glass-effect glass-effect-hover p-6 rounded-lg space-y-6">
      <h3 className="text-sm font-mono text-zinc-400 uppercase tracking-wider mb-4">
        Permission Settings
      </h3>

      {/* Daily Budget Slider */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-mono text-zinc-300">Daily Budget Limit</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={dailyBudget}
              onChange={(e) => onDailyBudgetChange(Number(e.target.value))}
              className="w-24 bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-right text-emerald-400 font-mono focus:outline-none focus:border-emerald-500"
              step="0.00001"
              min="0"
            />
            <span className="text-sm font-mono text-emerald-400">DEMO</span>
          </div>
        </div>
        <input
          type="range"
          min="0"
          max="5"
          step="0.001"
          value={dailyBudget}
          onChange={(e) => onDailyBudgetChange(Number(e.target.value))}
          className="w-full h-2 bg-zinc-900 rounded-lg appearance-none cursor-pointer accent-emerald-500"
        />
        <div className="flex justify-between text-xs font-mono text-zinc-600 mt-1">
          <span>0 DEMO</span>
          <span>5.0 DEMO</span>
        </div>
      </div>

      {/* Frequency Dropdown */}
      <div>
        <label className="text-sm font-mono text-zinc-300 mb-3 block">Frequency</label>
        <select
          value={frequency}
          onChange={(e) => onFrequencyChange(e.target.value)}
          className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-zinc-100 focus:border-emerald-500/50 focus:outline-none transition-all"
        >
          <option value="Every Hour">Every Hour</option>
          <option value="Every Day">Every Day</option>
          <option value="Every Week">Every Week</option>
          <option value="On Signal">On Signal</option>
        </select>
      </div>
    </div>
  );
}

