"use client";

import { motion } from "framer-motion";

const techStack = [
  "ERC-7715",
  "MetaMask Smart Accounts Kit",
  "Uniswap V2",
  "Envio Indexer",
  "Ethereum Sepolia",
  "Next.js",
  "TypeScript",
  "Viem",
];

export function TechStack() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.8 }}
      className="mt-16"
    >
      <h3 className="text-center font-mono text-zinc-400 text-sm uppercase tracking-wider mb-6">
        Built With
      </h3>
      <div className="flex flex-wrap justify-center gap-3">
        {techStack.map((tech, idx) => (
          <motion.span
            key={tech}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 + idx * 0.05 }}
            className="px-4 py-2 bg-zinc-900/50 border border-zinc-800 rounded-lg font-mono text-xs text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400 transition-all"
          >
            {tech}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

