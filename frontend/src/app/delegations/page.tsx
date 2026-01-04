"use client";

import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, ExternalLink, ArrowRightLeft } from "lucide-react";
import { useToastContext } from "../../components/shared/ToastProvider";
import Link from "next/link";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface Delegation {
  id: string;
  delegatorAgent: string;
  delegateAgent: string;
  tokenAddress: string;
  maxAmount: string;
  maxAmountPerDay: string;
  usedAmount: string;
  usedAmountToday: string;
  targetContract: string;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
}

export default function DelegationsPage() {
  const { address, isConnected } = useAccount();
  const toast = useToastContext();
  const [delegations, setDelegations] = useState<{
    asDelegator: Delegation[];
    asDelegate: Delegation[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    delegateAgent: "",
    tokenAddress: process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    maxAmount: "1.0",
    maxAmountPerDay: "0.1",
    expiryDays: "7",
  });

  useEffect(() => {
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    fetchDelegations();
    const interval = setInterval(fetchDelegations, 30000);

    return () => clearInterval(interval);
  }, [address, isConnected]);

  const fetchDelegations = async () => {
    if (!address) return;

    try {
      const response = await fetch(`${BACKEND_API_URL}/api/delegation/${address}`);
      if (response.ok) {
        const data = await response.json();
        setDelegations(data);
      }
    } catch (error) {
      console.error("Error fetching delegations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    try {
      const expiryTimestamp = Math.floor(Date.now() / 1000) + parseInt(formData.expiryDays) * 86400;

      const response = await fetch(`${BACKEND_API_URL}/api/delegation/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delegatorAgent: address,
          delegateAgent: formData.delegateAgent,
          tokenAddress: formData.tokenAddress,
          maxAmount: BigInt(parseFloat(formData.maxAmount) * 1e6).toString(), // USDC has 6 decimals
          maxAmountPerDay: BigInt(parseFloat(formData.maxAmountPerDay) * 1e6).toString(),
          targetContract: process.env.NEXT_PUBLIC_AGENT_ROUTER_ADDRESS || "0x0000000000000000000000000000000000000000",
          expiryTimestamp,
        }),
      });

      if (response.ok) {
        toast.success("Delegation created successfully!");
        setShowCreateForm(false);
        setFormData({
          delegateAgent: "",
          tokenAddress: process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
          maxAmount: "1.0",
          maxAmountPerDay: "0.1",
          expiryDays: "7",
        });
        fetchDelegations();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to create delegation");
      }
    } catch (error) {
      console.error("Error creating delegation:", error);
      toast.error("Failed to create delegation");
    }
  };

  const handleRevoke = async (delegationId: string) => {
    if (!confirm("Are you sure you want to revoke this delegation?")) return;

    try {
      const response = await fetch(`${BACKEND_API_URL}/api/delegation/revoke/${delegationId}`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Delegation revoked successfully!");
        fetchDelegations();
      } else {
        toast.error("Failed to revoke delegation");
      }
    } catch (error) {
      console.error("Error revoking delegation:", error);
      toast.error("Failed to revoke delegation");
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <p className="text-zinc-400 font-mono">Please connect your wallet</p>
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-sm text-emerald-400 hover:border-emerald-500/50 hover:bg-zinc-900/70 transition-all"
          >
            ← Back to Landing
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 font-mono mb-2">
              AGENT-TO-AGENT DELEGATION
            </h1>
            <p className="text-sm font-mono text-zinc-500">
              Delegate permissions from your agent to other agents (ERC-8004)
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-sm text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-all hover:bg-zinc-900/70"
            >
              ← DASHBOARD
            </Link>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg font-mono text-sm text-emerald-400 hover:bg-emerald-500/30 hover:border-emerald-400 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              CREATE
            </button>
          </div>
        </motion.div>

        {/* Create Delegation Form */}
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-effect glass-effect-hover p-6 rounded-lg border-emerald-500/50"
          >
            <h3 className="font-mono text-emerald-400 mb-4">Create New Delegation</h3>
            <form onSubmit={handleCreateDelegation} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-500 mb-2">
                  Delegate Agent Address
                </label>
                <input
                  type="text"
                  value={formData.delegateAgent}
                  onChange={(e) => setFormData({ ...formData, delegateAgent: e.target.value })}
                  placeholder="0x..."
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-500 mb-2">
                    Max Amount (USDC)
                  </label>
                  <input
                    type="number"
                    value={formData.maxAmount}
                    onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-500 mb-2">
                    Daily Limit (USDC)
                  </label>
                  <input
                    type="number"
                    value={formData.maxAmountPerDay}
                    onChange={(e) => setFormData({ ...formData, maxAmountPerDay: e.target.value })}
                    className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono text-zinc-500 mb-2">
                  Expiry (Days)
                </label>
                <input
                  type="number"
                  value={formData.expiryDays}
                  onChange={(e) => setFormData({ ...formData, expiryDays: e.target.value })}
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-sm text-zinc-100 focus:border-emerald-500/50 focus:outline-none"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-lg font-mono text-sm text-emerald-400 hover:bg-emerald-500/30 hover:border-emerald-400 transition-all"
                >
                  CREATE
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-sm text-zinc-300 hover:border-zinc-700 transition-all"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Delegations List */}
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="glass-effect p-6 rounded-lg">
                <div className="h-4 bg-zinc-800 rounded w-1/2 animate-pulse mb-4" />
                <div className="h-32 bg-zinc-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* As Delegator */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-effect glass-effect-hover p-6 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-4">
                <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
                <h3 className="font-mono text-emerald-400">Delegations You Created</h3>
                <span className="px-2 py-1 bg-zinc-900 rounded text-xs font-mono text-zinc-400">
                  {delegations?.asDelegator.length || 0}
                </span>
              </div>
              {delegations?.asDelegator.length === 0 ? (
                <p className="text-sm font-mono text-zinc-500 text-center py-8">
                  No delegations created yet
                </p>
              ) : (
                <div className="space-y-3">
                  {delegations?.asDelegator.map((delegation) => (
                    <div
                      key={delegation.id}
                      className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono text-zinc-500">To:</span>
                            <span className="text-sm font-mono text-zinc-300">
                              {delegation.delegateAgent.slice(0, 6)}...{delegation.delegateAgent.slice(-4)}
                            </span>
                            {delegation.isActive ? (
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-mono">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded text-xs font-mono">
                                INACTIVE
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                            <div>
                              <span className="text-zinc-500">Max:</span>
                              <span className="text-zinc-300 ml-2">
                                ${(parseFloat(delegation.maxAmount) / 1e6).toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Daily:</span>
                              <span className="text-zinc-300 ml-2">
                                ${(parseFloat(delegation.maxAmountPerDay) / 1e6).toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Used:</span>
                              <span className="text-zinc-300 ml-2">
                                ${(parseFloat(delegation.usedAmount) / 1e6).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRevoke(delegation.id)}
                          className="px-3 py-1.5 bg-rose-500/20 border border-rose-500/50 rounded text-xs font-mono text-rose-400 hover:bg-rose-500/30 transition-all flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          REVOKE
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* As Delegate */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-effect glass-effect-hover p-6 rounded-lg"
            >
              <div className="flex items-center gap-2 mb-4">
                <ArrowRightLeft className="w-5 h-5 text-amber-400 rotate-180" />
                <h3 className="font-mono text-amber-400">Delegations You Received</h3>
                <span className="px-2 py-1 bg-zinc-900 rounded text-xs font-mono text-zinc-400">
                  {delegations?.asDelegate.length || 0}
                </span>
              </div>
              {delegations?.asDelegate.length === 0 ? (
                <p className="text-sm font-mono text-zinc-500 text-center py-8">
                  No delegations received yet
                </p>
              ) : (
                <div className="space-y-3">
                  {delegations?.asDelegate.map((delegation) => (
                    <div
                      key={delegation.id}
                      className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-mono text-zinc-500">From:</span>
                            <span className="text-sm font-mono text-zinc-300">
                              {delegation.delegatorAgent.slice(0, 6)}...{delegation.delegatorAgent.slice(-4)}
                            </span>
                            {delegation.isActive ? (
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs font-mono">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-zinc-800 text-zinc-500 rounded text-xs font-mono">
                                INACTIVE
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                            <div>
                              <span className="text-zinc-500">Max:</span>
                              <span className="text-zinc-300 ml-2">
                                ${(parseFloat(delegation.maxAmount) / 1e6).toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Daily:</span>
                              <span className="text-zinc-300 ml-2">
                                ${(parseFloat(delegation.maxAmountPerDay) / 1e6).toFixed(2)}
                              </span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Used:</span>
                              <span className="text-zinc-300 ml-2">
                                ${(parseFloat(delegation.usedAmount) / 1e6).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

