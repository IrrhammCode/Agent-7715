"use client";

import { BacktestPanel } from "../../components/backtesting/BacktestPanel";

export default function BacktestPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-mono text-zinc-100 mb-8">Strategy Backtesting</h1>
        <BacktestPanel />
      </div>
    </div>
  );
}

