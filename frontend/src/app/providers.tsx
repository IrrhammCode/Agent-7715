"use client";

import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { metaMask } from "wagmi/connectors";
import { useState, useEffect } from "react";

// Wagmi configuration - Arbitrum Mainnet
const config = createConfig({
  chains: [sepolia],
  connectors: [
    metaMask({
      dappMetadata: {
        name: "Agent 7715",
        url: typeof window !== "undefined" ? window.location.origin : "",
      },
    }),
  ],
  transports: {
    [sepolia.id]: http(),
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  // Suppress console errors from MetaMask SDK and harmless warnings
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    // Helper function to check if message should be suppressed
    const shouldSuppress = (message: string): boolean => {
      const lowerMessage = message.toLowerCase();
      return (
        // React Native warnings
        lowerMessage.includes("@react-native-async-storage/async-storage") ||
        lowerMessage.includes("data-channel-name") ||
        lowerMessage.includes("data-extension-id") ||
        lowerMessage.includes("wallet must has at least one account") ||
        lowerMessage.includes("cannot read properties of undefined") ||
        // MetaMask ObjectMultiplex warnings (very aggressive matching)
        lowerMessage.includes("objectmultiplex") ||
        lowerMessage.includes("malformed chunk") ||
        lowerMessage.includes("without name") ||
        (lowerMessage.includes("ack") && (lowerMessage.includes("chunk") || lowerMessage.includes("name"))) ||
        lowerMessage.includes("malformed chunk without name") ||
        lowerMessage.includes("objectmultiplex - malformed") ||
        // MetaMask StreamMiddleware warnings (very aggressive matching)
        lowerMessage.includes("streammiddleware") ||
        lowerMessage.includes("unknown response id") ||
        (lowerMessage.includes("streammiddleware") && lowerMessage.includes("unknown")) ||
        lowerMessage.includes("streammiddleware - unknown") ||
        // MetaMask account warnings (very aggressive matching)
        lowerMessage.includes("eth_accounts' unexpectedly updated") ||
        lowerMessage.includes("eth_accounts") && lowerMessage.includes("unexpectedly") ||
        lowerMessage.includes("metamask: 'eth_accounts' unexpectedly") ||
        lowerMessage.includes("'eth_accounts' unexpectedly updated") ||
        lowerMessage.includes("please report this bug") ||
        // WebSocket connection errors (backend might not be running)
        (lowerMessage.includes("websocket connection") && lowerMessage.includes("failed")) ||
        (lowerMessage.includes("websocket") && lowerMessage.includes("error")) ||
        lowerMessage.includes("websocket connection to") && lowerMessage.includes("failed") ||
        (lowerMessage.includes("websocket") && lowerMessage.includes("closed before the connection is established")) ||
        (lowerMessage.includes("useWebSocket.ts:") && lowerMessage.includes("websocket")) ||
        // Backend API connection errors (suppress when backend is not running)
        lowerMessage.includes("err_connection_refused") ||
        lowerMessage.includes("failed to fetch") ||
        (lowerMessage.includes("connection") && lowerMessage.includes("refused")) ||
        lowerMessage.includes("net::err_connection_refused") ||
        // 404 errors from backend API (backend not running or endpoint not found)
        (lowerMessage.includes("404") && (lowerMessage.includes("not found") || lowerMessage.includes("localhost:3001"))) ||
        (lowerMessage.includes("get http://localhost:3001") && lowerMessage.includes("404")) ||
        (lowerMessage.includes("get http://localhost:3001/api")) ||
        (lowerMessage.includes("localhost:3001/api") && lowerMessage.includes("404")) ||
        (lowerMessage.includes("page.tsx:") && lowerMessage.includes("404")) ||
        (lowerMessage.includes("liveTerminal.tsx:") && lowerMessage.includes("404")) ||
        (lowerMessage.includes("permissionHealthCard.tsx:") && lowerMessage.includes("404")) ||
        (lowerMessage.includes("permissionAnalytics.tsx:") && lowerMessage.includes("404")) ||
        (lowerMessage.includes("fetchData") && lowerMessage.includes("404")) ||
        (lowerMessage.includes("fetchRecentTrades") && lowerMessage.includes("404")) ||
        (lowerMessage.includes("fetchPermissionData") && lowerMessage.includes("404")) ||
        (lowerMessage.includes("permission-analytics") && lowerMessage.includes("404")) ||
        // Error fetching analytics/portfolio/etc (backend not running)
        (lowerMessage.includes("error fetching") && lowerMessage.includes("failed to fetch")) ||
        // Additional MetaMask internal warnings
        lowerMessage.includes("understand this warning") ||
        lowerMessage.includes("understand this error") ||
        // MetaMask inpage.js warnings (suppress all from inpage.js)
        message.includes("inpage.js:") && (
          lowerMessage.includes("objectmultiplex") ||
          lowerMessage.includes("streammiddleware") ||
          lowerMessage.includes("eth_accounts") ||
          lowerMessage.includes("understand")
        )
      );
    };

    console.error = (...args) => {
      // Combine all arguments into a single string for comprehensive checking
      const fullMessage = args.map(arg => typeof arg === 'string' ? arg : (arg?.toString() || '')).join(' ');
      const lowerFullMessage = fullMessage.toLowerCase();

      // Check if any part of the message (including stack trace) should be suppressed
      const shouldSkip = shouldSuppress(fullMessage) ||
        // Additional checks for common MetaMask warning patterns in full message
        lowerFullMessage.includes('inpage.js') && (
          lowerFullMessage.includes('objectmultiplex') ||
          lowerFullMessage.includes('streammiddleware') ||
          lowerFullMessage.includes('eth_accounts') ||
          lowerFullMessage.includes('malformed chunk') ||
          lowerFullMessage.includes('unknown response id') ||
          lowerFullMessage.includes('understand this')
        );

      if (shouldSkip) {
        return; // Suppress these warnings
      }
      originalError.apply(console, args);
    };

    console.warn = (...args) => {
      // Combine all arguments into a single string for comprehensive checking
      const fullMessage = args.map(arg => typeof arg === 'string' ? arg : (arg?.toString() || '')).join(' ');
      const lowerFullMessage = fullMessage.toLowerCase();

      // Check if any part of the message (including stack trace) should be suppressed
      const shouldSkip = shouldSuppress(fullMessage) ||
        // Additional checks for common MetaMask warning patterns in full message
        lowerFullMessage.includes('inpage.js') && (
          lowerFullMessage.includes('objectmultiplex') ||
          lowerFullMessage.includes('streammiddleware') ||
          lowerFullMessage.includes('eth_accounts') ||
          lowerFullMessage.includes('malformed chunk') ||
          lowerFullMessage.includes('unknown response id') ||
          lowerFullMessage.includes('understand this')
        );

      if (shouldSkip) {
        return; // Suppress these warnings
      }
      originalWarn.apply(console, args);
    };

    // Also filter console.log for MetaMask messages and backend connection errors
    console.log = (...args) => {
      // Combine all arguments for comprehensive checking
      const fullMessage = args.map(arg => typeof arg === 'string' ? arg : (arg?.toString() || '')).join(' ');
      const lowerFullMessage = fullMessage.toLowerCase();

      const shouldSkip =
        // MetaMask warnings (very comprehensive)
        lowerFullMessage.includes("objectmultiplex") ||
        lowerFullMessage.includes("streammiddleware") ||
        lowerFullMessage.includes("malformed chunk") ||
        lowerFullMessage.includes("unknown response id") ||
        lowerFullMessage.includes("eth_accounts") && lowerFullMessage.includes("unexpectedly") ||
        lowerFullMessage.includes("please report this bug") ||
        // Backend connection errors (suppress if backend is not running)
        lowerFullMessage.includes("err_connection_refused") ||
        lowerFullMessage.includes("failed to fetch") ||
        (lowerFullMessage.includes("connection") && lowerFullMessage.includes("refused")) ||
        // MetaMask inpage.js logs (suppress ALL from inpage.js)
        fullMessage.includes("inpage.js:") ||
        // GET requests that fail (backend not running)
        (fullMessage.includes("GET ") && lowerFullMessage.includes("failed")) ||
        (fullMessage.includes("GET ") && lowerFullMessage.includes("err_connection_refused")) ||
        // 404 errors from API calls
        (fullMessage.includes("GET http://localhost:3001") && lowerFullMessage.includes("404")) ||
        (fullMessage.includes("localhost:3001/api") && lowerFullMessage.includes("404")) ||
        // WebSocket errors
        (lowerFullMessage.includes("websocket") && (lowerFullMessage.includes("failed") || lowerFullMessage.includes("closed")));

      if (shouldSkip) {
        return;
      }
      originalLog.apply(console, args);
    };

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
    };
  }, []);

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

