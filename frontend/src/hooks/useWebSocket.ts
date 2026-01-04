"use client";

import { useEffect, useRef, useState } from "react";

const getWsUrl = () => {
  const url = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001/ws";
  // Ensure url ends with /ws to match backend
  if (!url.endsWith('/ws')) {
    return `${url.replace(/\/$/, '')}/ws`;
  }
  return url;
};

const WS_URL = getWsUrl();

export interface NotificationMessage {
  type: "TRADE_EXECUTED" | "PORTFOLIO_UPDATE" | "AGENT_STATUS" | "PRICE_ALERT" | "RISK_ALERT";
  timestamp: number;
  data: any;
}

export function useWebSocket(subscriptions: string[] = ["ALL"]) {
  const [messages, setMessages] = useState<NotificationMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Only connect on client side
    if (!mounted || typeof window === "undefined") {
      return;
    }

    let shouldReconnect = true;

    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
          // Only log in development, suppress in production
          if (process.env.NODE_ENV === "development") {
            console.log("WebSocket connected");
          }
          setConnected(true);
          // Subscribe to notifications
          ws.send(
            JSON.stringify({
              type: "SUBSCRIBE",
              subscriptions,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const message: NotificationMessage = JSON.parse(event.data);
            if (message.type === "TRADE_EXECUTED" || message.type === "PORTFOLIO_UPDATE" || message.type === "AGENT_STATUS" || message.type === "PRICE_ALERT" || message.type === "RISK_ALERT") {
              setMessages((prev) => [message, ...prev].slice(0, 50)); // Keep last 50 messages
            }
          } catch (error) {
            // Only log parsing errors in development
            if (process.env.NODE_ENV === "development") {
              console.error("Error parsing WebSocket message:", error);
            }
          }
        };

        ws.onerror = (error) => {
          // Silently handle errors - backend might not be running
          // Don't log to console to avoid noise
          setConnected(false);
        };

        ws.onclose = () => {
          setConnected(false);
          // Reconnect after 5 seconds if should reconnect
          if (shouldReconnect) {
            reconnectTimeoutRef.current = setTimeout(() => {
              if (shouldReconnect && wsRef.current?.readyState === WebSocket.CLOSED) {
                connect();
              }
            }, 5000);
          }
        };

        wsRef.current = ws;
      } catch (error) {
        // Silently handle connection errors
        setConnected(false);
        if (shouldReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (shouldReconnect) {
              connect();
            }
          }, 5000);
        }
      }
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [mounted, subscriptions.join(",")]);

  return { messages, connected };
}

