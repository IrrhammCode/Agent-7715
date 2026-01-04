"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, TrendingDown, TrendingUp, ShieldCheck, ShieldAlert, ChevronUp, ChevronDown } from "lucide-react";
import { useToastContext } from "../shared/ToastProvider";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";

export function GodModePanel() {
    const toast = useToastContext();
    const [isOpen, setIsOpen] = useState(false);
    const [isDemoMode, setIsDemoMode] = useState(false);
    const [loading, setLoading] = useState(false);

    // Fetch initial status
    useEffect(() => {
        fetch(`${BACKEND_API_URL}/api/demo/status`)
            .then(res => res.json())
            .then(data => {
                setIsDemoMode(data.isDemoMode);
            })
            .catch(err => console.error("Failed to fetch demo status:", err));
    }, []);

    const toggleDemoMode = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_API_URL}/api/demo/toggle`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ enabled: !isDemoMode }),
            });
            const data = await res.json();
            setIsDemoMode(data.isDemoMode);

            if (data.isDemoMode) {
                toast.success("GOD MODE ENABLED: Whale Balances & Instant Execution Active 🐳⚡");
            } else {
                toast.success("God Mode Disabled: Back to Real Sepolia 🛡️");
            }
        } catch (err) {
            toast.error("Failed to toggle Demo Mode");
        } finally {
            setLoading(false);
        }
    };

    const triggerCrash = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_API_URL}/api/demo/crash`, { method: "POST" });
            if (res.ok) {
                toast.warning("MARKET CRASH SIMULATED! ETH -> $2250 📉");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed");
            }
        } catch (err) {
            toast.error("Failed to trigger crash");
        } finally {
            setLoading(false);
        }
    };

    const triggerPump = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${BACKEND_API_URL}/api/demo/pump`, { method: "POST" });
            if (res.ok) {
                toast.success("MARKET PUMP SIMULATED! ETH -> $2750 🚀");
            } else {
                const err = await res.json();
                toast.error(err.error || "Failed");
            }
        } catch (err) {
            toast.error("Failed to trigger pump");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 left-6 z-50">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="mb-4 p-4 bg-zinc-900/95 backdrop-blur-xl border border-violet-500/30 rounded-xl shadow-2xl w-72"
                    >
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-800">
                            <Zap className="w-5 h-5 text-violet-400" />
                            <h3 className="font-mono font-bold text-violet-400">GOD MODE PANEL</h3>
                        </div>

                        <div className="space-y-3">
                            {/* Toggle Switch */}
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-mono text-zinc-400">DEMO MODE</span>
                                <button
                                    onClick={toggleDemoMode}
                                    disabled={loading}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${isDemoMode ? "bg-violet-500" : "bg-zinc-700"
                                        }`}
                                >
                                    <motion.div
                                        animate={{ x: isDemoMode ? 24 : 2 }}
                                        className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-md"
                                    />
                                </button>
                            </div>

                            {/* Actions */}
                            {isDemoMode && (
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <button
                                        onClick={triggerCrash}
                                        disabled={loading}
                                        className="flex flex-col items-center justify-center p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg hover:bg-rose-500/20 transition-all"
                                    >
                                        <TrendingDown className="w-5 h-5 text-rose-400 mb-1" />
                                        <span className="text-[10px] font-mono text-rose-300">CRASH (-10%)</span>
                                    </button>

                                    <button
                                        onClick={triggerPump}
                                        disabled={loading}
                                        className="flex flex-col items-center justify-center p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-all"
                                    >
                                        <TrendingUp className="w-5 h-5 text-emerald-400 mb-1" />
                                        <span className="text-[10px] font-mono text-emerald-300">PUMP (+10%)</span>
                                    </button>
                                </div>
                            )}

                            {!isDemoMode && (
                                <p className="text-[10px] text-zinc-500 text-center italic">
                                    Activate to enable Whale Balances & Instant Execution
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button
                onClick={() => setIsOpen(!isOpen)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg backdrop-blur-md border transition-all ${isOpen
                        ? "bg-violet-500 text-white border-violet-400"
                        : isDemoMode
                            ? "bg-violet-500/20 text-violet-400 border-violet-500/50"
                            : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
            >
                {isDemoMode ? <ShieldAlert className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                <span className="text-xs font-mono font-bold">
                    {isDemoMode ? "GOD MODE ON" : "DEMO"}
                </span>
                {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </motion.button>
        </div>
    );
}
