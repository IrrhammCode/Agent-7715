"use client";

import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { StrategySelector, StrategyParams } from "../../components/configure/StrategySelector";
import { PermissionSliders } from "../../components/configure/PermissionSliders";
import { PermissionTemplates, type PermissionTemplate } from "../../components/configure/PermissionTemplates";
import { ActivateButton } from "../../components/configure/ActivateButton";
import { useToastContext } from "../../components/shared/ToastProvider";
import { useActivateAgent } from "../../hooks/useActivateAgent";
import Link from "next/link";

export default function ConfigurePage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const toast = useToastContext();

  // Configuration State
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [strategyParams, setStrategyParams] = useState<StrategyParams>({});
  const [dailyBudget, setDailyBudget] = useState(0.1); // Default to 0.1 USDC for testing
  const [frequency, setFrequency] = useState("Every Week");
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const [activationState, setActivationState] = useState<"idle" | "signing" | "granting" | "active">("idle");
  const [mounted, setMounted] = useState(false);

  // Get contract addresses from environment variables
  const usdcAddress = (process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238") as `0x${string}`;
  const agentRouterAddress = (process.env.NEXT_PUBLIC_AGENT_ROUTER_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

  // Use the real activation hook with daily budget from slider
  const { activateAgent, isLoading, error, success } = useActivateAgent({
    usdcAddress,
    agentRouterAddress,
    dailyBudget,
    frequency, // Pass selected frequency
    strategy: selectedStrategy || undefined,
    strategyParams, // Pass the params to the hook
    email: email || undefined, // Pass email
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update activation state based on hook state
  useEffect(() => {
    if (isLoading && activationState === "idle") {
      setActivationState("signing");
    } else if (success && activationState !== "active") {
      setActivationState("active");
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } else if (error && activationState !== "idle") {
      setActivationState("idle");
    }
  }, [isLoading, success, error, activationState, router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400 font-mono">Loading...</p>
        </div>
      </div>
    );
  }

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

  const handleActivate = async () => {
    if (!selectedStrategy) {
      toast.warning("Please select a trading strategy first");
      return;
    }

    if (!agentRouterAddress || agentRouterAddress === "0x0000000000000000000000000000000000000000") {
      toast.error("Agent Router address not configured. Please set NEXT_PUBLIC_AGENT_ROUTER_ADDRESS in .env.local");
      return;
    }

    try {
      setActivationState("signing");
      toast.info("Requesting permission from MetaMask...");

      // Call the real activation function
      await activateAgent();

      setActivationState("granting");
      toast.info("Granting ERC-7715 permissions...");

      // Wait a bit for the permission to be processed
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (success) {
        setActivationState("active");
        toast.success("Agent activated successfully! Permissions granted.");
      } else if (error) {
        throw new Error(error);
      }
    } catch (error) {
      setActivationState("idle");
      const errorMessage = error instanceof Error ? error.message : "Failed to activate agent";
      toast.error(errorMessage);
      console.error("Activation error:", error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-zinc-950 p-6 md:p-8"
    >
      <div className="max-w-4xl mx-auto space-y-12 pb-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold text-zinc-100 font-mono mb-2">
              AGENT CONFIGURATION
            </h1>
            <p className="text-sm font-mono text-zinc-500">
              Configure your trading agent and grant ERC-7715 permissions
            </p>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-sm text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-all hover:bg-zinc-900/70"
          >
            ← DASHBOARD
          </Link>
        </motion.div>

        {/* Permission Templates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PermissionTemplates
            selectedTemplate={selectedTemplate}
            onSelectTemplate={(template: PermissionTemplate) => {
              setSelectedTemplate(template.id);
              setDailyBudget(template.dailyBudget);
              setFrequency(template.frequency);
              setSelectedStrategy(template.defaultStrategy);
            }}
          />
        </motion.div>

        {/* Strategy Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <StrategySelector
            selectedStrategy={selectedStrategy}
            onSelect={setSelectedStrategy}
            strategyParams={strategyParams}
            onParamsChange={setStrategyParams}
          />
        </motion.div>

        {/* Check & Confirm (Sliders) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-bold text-zinc-100 font-mono mb-4">
            3. REVIEW & ACTIVATE
          </h2>
          <div className="glass-effect p-6 rounded-lg">
            <p className="text-xs font-mono text-zinc-500 mb-6">
              Review the permissions you are about to grant. You can adjust the budget manually if needed.
            </p>
            <PermissionSliders
              dailyBudget={dailyBudget}
              onDailyBudgetChange={(value) => {
                setDailyBudget(value);
                setSelectedTemplate(null);
              }}
              frequency={frequency}
              onFrequencyChange={(value) => {
                setFrequency(value);
                setSelectedTemplate(null);
              }}
            />

            <div className="mt-6 pt-6 border-t border-zinc-800">
              <h3 className="text-sm font-bold text-zinc-300 font-mono mb-3">
                NOTIFICATIONS (OPTIONAL)
              </h3>
              <div className="space-y-2">
                <label className="text-xs font-mono text-zinc-500">Email Address</label>
                <input
                  type="email"
                  placeholder="Enter email for trade notifications..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded p-2 text-zinc-100 font-mono text-sm focus:border-emerald-500 focus:outline-none placeholder:text-zinc-600"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <p className="text-[10px] text-zinc-500 font-mono">
                  We will send you an email when the agent executes a trade or checks conditions.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-zinc-800">
              <ActivateButton
                state={activationState}
                onActivate={handleActivate}
                disabled={!selectedStrategy}
              />
            </div>
          </div>
        </motion.div>

        {/* Status Display */}
        <AnimatePresence>
          {activationState === "active" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4"
            >
              <div className="glass-effect p-8 rounded-xl border-emerald-500/50 flex flex-col items-center justify-center space-y-6 max-w-md w-full text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center animate-pulse">
                  <div className="w-8 h-8 bg-emerald-400 rounded-full" />
                </div>
                <div>
                  <h3 className="font-mono text-emerald-400 text-2xl font-bold">AGENT ACTIVATED</h3>
                  <p className="font-mono text-zinc-400 mt-2">
                    Permissions granted. Redirecting to dashboard...
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

