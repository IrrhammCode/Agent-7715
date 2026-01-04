"use client";

import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToastContext } from "../../components/shared/ToastProvider";
import Link from "next/link";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

interface Permission {
  id: string;
  token: string;
  limit: number;
  used: number;
  target: string;
  expires: number;
  active: boolean;
}

export default function PermissionsPage() {
  const { address, isConnected } = useAccount();
  const toast = useToastContext();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only rendering wallet-dependent content on client
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !isConnected || !address) {
      if (mounted) {
        setLoading(false);
      }
      return;
    }

    const fetchPermissions = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch permission analytics which contains real limits and usage
        const response = await fetch(`${BACKEND_API_URL}/api/permission-analytics/${address}`);
        if (!response.ok) {
          throw new Error("Failed to fetch permissions");
        }

        const data = await response.json();

        // Also check basic status for active flag
        const statusResponse = await fetch(`${BACKEND_API_URL}/api/agent-status/${address}`);
        const statusData = await statusResponse.ok ? await statusResponse.json() : { agent: { isActive: false } };

        // Only show permission if registered
        if (!data.error && statusData.registered) {
          // Create a permission entry based on real analytics data
          const permission: Permission = {
            id: "1", // Upgrade this if supporting multiple permissions
            token: "USDC",
            limit: data.dailyLimit || 100,
            used: data.dailyUsed || 0,
            target: process.env.NEXT_PUBLIC_AGENT_ROUTER_ADDRESS || "AgentRouter",
            expires: Date.now() + (data.resetInSeconds * 1000) + 86400000 * 6, // Rough estimate or fetch from contract
            active: statusData.agent?.isActive ?? false,
          };
          setPermissions([permission]);
        } else {
          setPermissions([]);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes("Failed to fetch") && !errorMessage.includes("ERR_CONNECTION_REFUSED")) {
          console.error("Error fetching permissions:", error);
          setError(errorMessage);
        }
        setPermissions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
    const interval = setInterval(fetchPermissions, 30000);

    return () => clearInterval(interval);
  }, [mounted, address, isConnected]);

  const handleRevoke = async (permissionId: string) => {
    if (!confirm("Are you sure you want to revoke all permissions? This will stop the agent.")) return;

    try {
      toast.warning("Revoking permissions...");

      const response = await fetch(`${BACKEND_API_URL}/api/permissions/revoke-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userAddress: address }),
      });

      if (!response.ok) throw new Error("Failed to revoke permissions");

      toast.success("Permissions revoked successfully");
      // Refresh to show empty state
      window.location.reload();
    } catch (error) {
      toast.error("Failed to revoke permissions");
      console.error("Error revoking permissions:", error);
    }
  };

  // Show loading state until mounted to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-8">
            <div className="h-9 bg-zinc-800 rounded w-48 animate-pulse" />
            <div className="h-10 bg-zinc-800 rounded w-40 animate-pulse" />
          </div>
          <div className="glass-effect p-6 rounded-lg space-y-4">
            <div className="h-6 bg-zinc-800 rounded animate-pulse" />
            <div className="h-2 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Link href="/" className="text-emerald-400 hover:text-emerald-300 font-mono">
          ← Connect Wallet
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-zinc-100 font-mono">PERMISSIONS</h1>
            <div className="h-10 w-40 bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="glass-effect p-6 rounded-lg space-y-4">
            <div className="h-6 bg-zinc-800 rounded animate-pulse" />
            <div className="h-2 bg-zinc-800 rounded animate-pulse" />
            <div className="h-4 bg-zinc-800 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-zinc-100 font-mono">PERMISSIONS</h1>
          <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
            <Link
              href="/dashboard"
              className="px-4 py-2 hover:bg-zinc-800 rounded-md font-mono text-xs text-zinc-400 hover:text-emerald-400 transition-all"
            >
              DASHBOARD
            </Link>
            <Link
              href="/history"
              className="px-4 py-2 hover:bg-zinc-800 rounded-md font-mono text-xs text-zinc-400 hover:text-emerald-400 transition-all"
            >
              HISTORY
            </Link>
            <Link
              href="/analytics"
              className="px-4 py-2 hover:bg-zinc-800 rounded-md font-mono text-xs text-zinc-400 hover:text-emerald-400 transition-all"
            >
              ANALYTICS
            </Link>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-effect glass-effect-hover p-4 rounded-lg border border-rose-500/50"
          >
            <p className="font-mono text-rose-400 text-sm">{error}</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setError(null);
                setLoading(true);
                const fetchPermissions = async () => {
                  try {
                    const response = await fetch(`${BACKEND_API_URL}/api/agent-status/${address}`);
                    if (!response.ok) throw new Error("Failed to fetch permissions");
                    const data = await response.json();
                    if (data.registered && data.agent) {
                      setPermissions([{
                        id: "1",
                        token: "USDC",
                        limit: 100,
                        used: 0,
                        target: process.env.NEXT_PUBLIC_AGENT_ROUTER_ADDRESS || "AgentRouter",
                        expires: Date.now() + 86400000,
                        active: data.agent.isActive,
                      }]);
                    } else {
                      setPermissions([]);
                    }
                  } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    if (!errorMessage.includes("Failed to fetch") && !errorMessage.includes("ERR_CONNECTION_REFUSED")) {
                      setError(errorMessage);
                    }
                    setPermissions([]);
                  } finally {
                    setLoading(false);
                  }
                };
                fetchPermissions();
              }}
              className="mt-3 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-xs text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
            >
              RETRY
            </motion.button>
          </motion.div>
        )}

        {permissions.length === 0 && !error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-effect glass-effect-hover p-12 rounded-lg text-center"
          >
            <p className="font-mono text-zinc-500 mb-2">No permissions granted</p>
            <p className="font-mono text-zinc-600 text-sm mb-4">
              Grant ERC-7715 permissions to enable automated trading
            </p>
            <Link
              href="/configure"
              className="inline-block px-6 py-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg font-mono text-sm text-emerald-400 hover:bg-emerald-500/30 transition-all"
            >
              GRANT PERMISSIONS
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {permissions.map((permission) => (
              <motion.div
                key={permission.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-effect glass-effect-hover p-6 rounded-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-mono text-zinc-100">
                        {permission.token} Spending Permission
                      </h3>
                      {permission.active ? (
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-mono">
                          ACTIVE
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-xs font-mono">
                          IDLE
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-mono text-zinc-500">
                      Target: {typeof permission.target === 'string' && permission.target.startsWith('0x')
                        ? `${permission.target.slice(0, 10)}...${permission.target.slice(-8)}`
                        : permission.target}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleRevoke(permission.id)}
                    className="px-4 py-2 bg-rose-500/20 border border-rose-500/50 rounded-lg font-mono text-sm text-rose-400 hover:bg-rose-500/30 transition-all"
                  >
                    REVOKE
                  </motion.button>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-zinc-500">Daily Limit</span>
                      <span className="text-sm font-mono text-zinc-400">
                        ${permission.used} / ${permission.limit}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden">
                      <motion.div
                        className="h-full bg-emerald-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(permission.used / permission.limit) * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-zinc-500 pt-2 border-t border-zinc-800">
                    <span>Expires: {new Date(permission.expires).toLocaleString()}</span>
                    <span>Remaining: ${permission.limit - permission.used}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <Link href="/configure">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full p-4 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
          >
            + GRANT NEW PERMISSION
          </motion.button>
        </Link>
      </div>
    </div >
  );
}
