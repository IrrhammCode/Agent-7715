"use client";

import { AnalyticsDashboard } from "../../components/analytics/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-zinc-950 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-mono text-zinc-100 mb-8">Analytics Dashboard</h1>
        <AnalyticsDashboard />
      </div>
    </div>
  );
}

