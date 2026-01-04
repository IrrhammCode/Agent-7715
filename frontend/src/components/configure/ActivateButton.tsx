"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface ActivateButtonProps {
  state: "idle" | "signing" | "granting" | "active";
  onActivate: () => void;
  disabled?: boolean;
}

export function ActivateButton({ state, onActivate, disabled }: ActivateButtonProps) {
  const [sliderPosition, setSliderPosition] = useState(0);

  const handleSliderMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (state !== "idle" || disabled) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);

    if (percentage >= 90) {
      onActivate();
    }
  };

  const handleMouseLeave = () => {
    if (state === "idle") {
      setSliderPosition(0);
    }
  };

  const getButtonContent = () => {
    switch (state) {
      case "signing":
        return (
          <div className="flex items-center justify-center gap-3">
            <motion.div
              className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span className="font-mono text-emerald-400">SIGNING...</span>
          </div>
        );
      case "granting":
        return (
          <div className="flex items-center justify-center gap-3">
            <motion.div
              className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <span className="font-mono text-emerald-400">GRANTING PERMISSIONS...</span>
          </div>
        );
      case "active":
        return (
          <div className="flex items-center justify-center gap-3">
            <motion.div
              className="w-3 h-3 bg-emerald-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <span className="font-mono text-emerald-400">PERMISSIONS GRANTED</span>
          </div>
        );
      default:
        return (
          <div className="relative w-full h-full flex items-center justify-center">
            <span className="font-mono text-zinc-300 uppercase tracking-wider z-10">
              GRANT AGENT PERMISSIONS
            </span>
            <motion.div
              className="absolute left-0 top-0 h-full bg-emerald-500/20 border-r-2 border-emerald-500"
              style={{ width: `${sliderPosition}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${sliderPosition}%` }}
            />
          </div>
        );
    }
  };

  return (
    <div className="w-full">
      <div
        className={`relative h-14 rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${state === "idle" && !disabled
            ? "border-zinc-800 hover:border-emerald-500/50"
            : state === "active"
              ? "border-emerald-500/50 bg-emerald-500/10"
              : "border-zinc-800 bg-zinc-900/50"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        onMouseMove={handleSliderMove}
        onMouseLeave={handleMouseLeave}
        onClick={state === "idle" && !disabled ? onActivate : undefined}
      >
        {getButtonContent()}
      </div>
      {state === "idle" && !disabled && (
        <p className="text-xs font-mono text-zinc-500 text-center mt-3">
          Slide or click to grant permissions
        </p>
      )}
    </div>
  );
}

