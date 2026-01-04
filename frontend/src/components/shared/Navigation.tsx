"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAccount, useDisconnect } from "wagmi";
import { LogOut } from "lucide-react";
import { motion } from "framer-motion";

const navItems = [
  { href: "/dashboard", label: "DASHBOARD" },
  { href: "/history", label: "HISTORY" },
  { href: "/strategies", label: "STRATEGIES" },
  { href: "/permissions", label: "PERMISSIONS" },
  { href: "/delegations", label: "DELEGATIONS" },
  { href: "/analytics", label: "ANALYTICS" },
  { href: "/configure", label: "CONFIGURE" },
];

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render on server or if not connected
  if (!mounted || !isConnected || pathname === "/") {
    return null;
  }

  const handleLogout = () => {
    disconnect();
    router.push("/");
  };

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="font-mono text-xl text-zinc-100">
            AGENT 7715
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 font-mono text-sm transition-all ${
                  pathname === item.href
                    ? "text-emerald-400 border-b-2 border-emerald-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {address && (
            <div className="flex items-center gap-4">
              <div className="font-mono text-xs text-zinc-500">
                {address.slice(0, 6)}...{address.slice(-4)}
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleLogout}
                className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-xs text-zinc-400 hover:border-rose-500/50 hover:text-rose-400 transition-all"
                title="Disconnect Wallet"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>LOGOUT</span>
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

