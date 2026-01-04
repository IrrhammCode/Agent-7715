"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { AlertTriangle, Power } from "lucide-react";
import { useToastContext } from "../shared/ToastProvider";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export function EmergencyStopButton() {
  const { address } = useAccount();
  const toast = useToastContext();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleEmergencyStop = async () => {
    if (!address) return;

    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_API_URL}/api/permissions/revoke-all`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAddress: address }),
      });

      if (response.ok) {
        toast.success("All permissions revoked successfully!");
        setShowConfirm(false);
        // Redirect to landing page after a short delay
        setTimeout(() => {
          window.location.href = "/";
        }, 2000);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to revoke permissions");
        setShowConfirm(false);
      }
    } catch (error) {
      console.error("Error revoking permissions:", error);
      toast.error("Failed to revoke permissions");
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-effect glass-effect-hover p-6 rounded-lg border-rose-500/30">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-5 h-5 text-rose-400" />
        <h3 className="text-sm font-mono text-rose-400 uppercase tracking-wider">
          Emergency Stop
        </h3>
      </div>

      <p className="text-xs font-mono text-zinc-500 mb-4">
        Immediately revoke all permissions and stop all agent activity. This action cannot be undone.
      </p>

      {showConfirm ? (
        <div className="space-y-3">
          <div className="p-3 bg-rose-500/10 border border-rose-500/50 rounded-lg">
            <p className="text-xs font-mono text-rose-400 text-center">
              Are you sure? This will revoke ALL permissions immediately.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleEmergencyStop}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-rose-500/20 border border-rose-500/50 rounded-lg font-mono text-sm text-rose-400 hover:bg-rose-500/30 hover:border-rose-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                  <span>REVOKING...</span>
                </>
              ) : (
                <>
                  <Power className="w-4 h-4" />
                  <span>CONFIRM REVOKE</span>
                </>
              )}
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={loading}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-sm text-zinc-300 hover:border-zinc-700 transition-all disabled:opacity-50"
            >
              CANCEL
            </button>
          </div>
        </div>
      ) : (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleEmergencyStop}
          className="w-full px-4 py-3 bg-rose-500/20 border-2 border-rose-500/50 rounded-lg font-mono text-sm text-rose-400 hover:bg-rose-500/30 hover:border-rose-400 transition-all flex items-center justify-center gap-2"
        >
          <Power className="w-5 h-5" />
          <span>EMERGENCY STOP</span>
        </motion.button>
      )}
    </div>
  );
}

