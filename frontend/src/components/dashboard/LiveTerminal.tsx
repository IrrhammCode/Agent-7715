"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TerminalLog {
  timestamp: string;
  message: string;
  type: "SWAP" | "INFO" | "ERROR";
}

interface LiveTerminalProps {
  userAddress: string;
}

export function LiveTerminal({ userAddress }: LiveTerminalProps) {
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldReconnectRef = useRef(true);

  useEffect(() => {
    if (!userAddress) {
      setLoading(false);
      return;
    }

    shouldReconnectRef.current = true;

    // Fetch recent trades from Envio via backend
    const fetchRecentTrades = async () => {
      try {
        const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
        // Use user-filtered Envio endpoint
        const response = await fetch(`${BACKEND_API_URL}/api/envio/trades?limit=20&userAddress=${userAddress}`);

        if (response.ok) {
          const data = await response.json();
          // Map Envio trades to TerminalLogs
          const tradeLogs: TerminalLog[] = (data.trades || []).map((trade: any) => {
            const date = new Date(trade.timestamp * 1000);
            const timestamp = `${date.getHours().toString().padStart(2, "0")}:${date
              .getMinutes()
              .toString()
              .padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`;

            // Envio returns specific fields, ensuring we handle them safely
            // Note: Envio returns raw addresses. We might want to map to symbols if possible, 
            // but short address is fine for terminal.
            const tokenInDisplay = trade.tokenIn?.length > 10
              ? trade.tokenIn.slice(0, 4) + '..'
              : (trade.tokenIn || "USDC");
            const tokenOutDisplay = trade.tokenOut?.length > 10
              ? trade.tokenOut.slice(0, 4) + '..'
              : (trade.tokenOut || "TOKEN");

            // Format amounts (assuming 18 decimals for simplicity in terminal view, or use Utils)
            // Ideally we'd know decimals. For now, abbreviated.
            const amtIn = parseFloat(trade.amountIn) / 1e18 > 1000 ? (parseFloat(trade.amountIn) / 1e18).toFixed(0) : (parseFloat(trade.amountIn) / 1e18).toFixed(4);
            const amtOut = parseFloat(trade.amountOut) / 1e18 > 1000 ? (parseFloat(trade.amountOut) / 1e18).toFixed(0) : (parseFloat(trade.amountOut) / 1e18).toFixed(4);

            return {
              timestamp,
              message: `SWAP: ${amtIn} ${tokenInDisplay} -> ${amtOut} ${tokenOutDisplay} (On-Chain)`,
              type: "SWAP" as const,
            };
          });
          setLogs(tradeLogs);
        } else {
          // If no trades, show empty state
          setLogs([]);
        }
      } catch (error) {
        // Only log if it's not a connection error (backend might not be running)
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes("Failed to fetch") && !errorMessage.includes("ERR_CONNECTION_REFUSED")) {
          console.error("Error fetching trades:", error);
        }
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentTrades();

    // Subscribe to WebSocket for real-time updates
    const getWsUrl = () => {
      const url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";
      // Ensure url ends with /ws to match backend
      if (!url.endsWith('/ws')) {
        return `${url.replace(/\/$/, '')}/ws`;
      }
      return url;
    };
    const WS_URL = getWsUrl();

    const connectWebSocket = () => {
      try {
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          ws.send(JSON.stringify({ type: "subscribe", userAddress }));

          // Add connection log
          const now = new Date();
          const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now
            .getMinutes()
            .toString()
            .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
          setLogs((prev) => [{
            timestamp,
            message: "INFO: Connected to live feed",
            type: "INFO" as const,
          }, ...prev].slice(0, 20));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === "TRADE_EXECUTED" && message.data?.userAddress?.toLowerCase() === userAddress.toLowerCase()) {
              const now = new Date();
              const timestamp = `${now.getHours().toString().padStart(2, "0")}:${now
                .getMinutes()
                .toString()
                .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

              const newLog: TerminalLog = {
                timestamp,
                message: `SWAP: ${message.data.amountIn || 0} ${message.data.tokenIn?.slice(0, 4) || "DEMO"} -> ${message.data.amountOut || 0} ${message.data.tokenOut?.slice(0, 4) || "USDC"} (${message.data.strategy || "MARKET"})`,
                type: "SWAP" as const,
              };
              setLogs((prev) => [newLog, ...prev].slice(0, 20));
            }
          } catch (error) {
            // Silently handle parsing errors
          }
        };

        ws.onerror = () => {
          setConnected(false);
          // Silently handle WebSocket errors - backend might not be running
          // Error is already suppressed by console filter in providers.tsx
        };

        ws.onclose = () => {
          setConnected(false);
          // Silently handle WebSocket close - backend might not be running
          // Attempt to reconnect after 5 seconds if component is still mounted
          if (shouldReconnectRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (shouldReconnectRef.current && wsRef.current?.readyState === WebSocket.CLOSED) {
                connectWebSocket();
              }
            }, 5000);
          }
        };
      } catch (error) {
        // Silently handle WebSocket connection errors
        setConnected(false);
        // Attempt to reconnect after 5 seconds if component is still mounted
        if (shouldReconnectRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldReconnectRef.current) {
              connectWebSocket();
            }
          }, 5000);
        }
      }
    };

    connectWebSocket();

    // Refresh trades every 30 seconds
    const interval = setInterval(fetchRecentTrades, 30000);

    return () => {
      shouldReconnectRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      clearInterval(interval);
    };
  }, [userAddress]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [logs]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "SWAP":
        return "text-emerald-400";
      case "ERROR":
        return "text-rose-500";
      default:
        return "text-zinc-400";
    }
  };

  return (
    <div className="glass-effect glass-effect-hover p-6 rounded-lg h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-mono text-zinc-400 uppercase tracking-wider">
          Live Terminal
        </h3>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
          <span className={`text-xs font-mono ${connected ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {connected ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1 font-mono text-xs"
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-zinc-500 text-xs">Loading terminal data...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-2">
              <p className="text-zinc-500 text-xs">No trades yet</p>
              <p className="text-zinc-600 text-xs">Execute a trade to see activity here</p>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {logs.map((log, idx) => (
              <motion.div
                key={`${log.timestamp}-${idx}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-3 py-1"
              >
                <span className="text-zinc-600 shrink-0">[{log.timestamp}]</span>
                <span className={getTypeColor(log.type)}>{log.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

