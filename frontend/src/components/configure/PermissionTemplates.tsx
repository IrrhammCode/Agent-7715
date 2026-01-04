"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Crown } from "lucide-react";

export interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  dailyBudget: number;
  frequency: string;
  icon: string;
  defaultStrategy: string;
}

// Define available permission templates
export const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  {
    id: "conservative",
    name: "Conservative Saver",
    description: "Accumulate tokens at specific target prices.",
    dailyBudget: 2,
    frequency: "Every Week",
    icon: "shield",
    defaultStrategy: "LIMIT_BUY",
  },
  {
    id: "aggressive",
    name: "Aggressive Trader",
    description: "Catch price breakouts above resistance.",
    dailyBudget: 100,
    frequency: "Every Day",
    icon: "zap",
    defaultStrategy: "BREAKOUT_BUY",
  },
];

interface PermissionTemplatesProps {
  selectedTemplate: string | null;
  onSelectTemplate: (template: PermissionTemplate) => void;
}

export function PermissionTemplates({
  selectedTemplate,
  onSelectTemplate,
}: PermissionTemplatesProps) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "shield": return Shield;
      case "zap": return Zap;
      case "crown": return Crown;
      default: return Shield;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-zinc-100 font-mono">
        1. CHOOSE PROFILE
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {PERMISSION_TEMPLATES.map((template) => {
          const Icon = getIcon(template.icon);
          const isSelected = selectedTemplate === template.id;

          return (
            <motion.button
              key={template.id}
              onClick={() => onSelectTemplate(template)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`relative p-6 rounded-xl border-2 transition-all text-left space-y-4 group ${isSelected
                ? "bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10"
                : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
            >
              <div
                className={`p-3 rounded-lg w-fit transition-colors ${isSelected
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-zinc-800 text-zinc-400 group-hover:text-zinc-300"
                  }`}
              >
                <Icon size={24} />
              </div>

              <div>
                <h3
                  className={`font-mono font-bold mb-1 ${isSelected ? "text-emerald-400" : "text-zinc-200"
                    }`}
                >
                  {template.name}
                </h3>
                <p className="text-sm text-zinc-500 leading-relaxed">
                  {template.description}
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800/50 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-zinc-600 font-mono mb-1">BUDGET</p>
                  <p className="font-mono text-zinc-300">
                    {template.dailyBudget} DEMO
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-600 font-mono mb-1">
                    FREQUENCY
                  </p>
                  <p className="font-mono text-zinc-300">
                    {template.frequency}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
