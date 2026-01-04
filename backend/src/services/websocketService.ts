/**
 * WebSocket Service
 * Real-time notifications for trades, portfolio updates, and agent events
 */

import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

export interface NotificationMessage {
  type: "TRADE_EXECUTED" | "PORTFOLIO_UPDATE" | "AGENT_STATUS" | "PRICE_ALERT" | "RISK_ALERT" | "delegation_created" | "permissions_revoked";
  timestamp: number;
  data: any;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server): void {
    this.wss = new WebSocketServer({ server, path: "/ws" });

    this.wss.on("connection", (ws: WebSocket, req) => {
      const clientAddress = req.socket.remoteAddress || "unknown";
      console.log(`WebSocket client connected: ${clientAddress}`);

      this.clients.add(ws);

      // Send welcome message
      ws.send(
        JSON.stringify({
          type: "CONNECTED",
          timestamp: Date.now(),
          data: { message: "Connected to Agent 7715 WebSocket" },
        })
      );

      // Handle client messages
      ws.on("message", (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(ws, data);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      });

      // Handle client disconnect
      ws.on("close", () => {
        console.log(`WebSocket client disconnected: ${clientAddress}`);
        this.clients.delete(ws);
      });

      // Handle errors
      ws.on("error", (error) => {
        console.error("WebSocket error:", error);
        this.clients.delete(ws);
      });
    });

    console.log("✅ WebSocket server initialized on /ws");
  }

  /**
   * Handle client messages
   */
  private handleClientMessage(ws: WebSocket, data: any): void {
    // Handle subscription requests
    if (data.type === "SUBSCRIBE") {
      // Store subscription preferences on client
      (ws as any).subscriptions = data.subscriptions || [];
      ws.send(
        JSON.stringify({
          type: "SUBSCRIBED",
          timestamp: Date.now(),
          data: { subscriptions: data.subscriptions },
        })
      );
    }
  }

  /**
   * Broadcast notification to all connected clients
   */
  broadcast(notification: NotificationMessage): void {
    const message = JSON.stringify(notification);
    let sentCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        // Check if client is subscribed to this notification type
        const subscriptions = (client as any).subscriptions || [];
        if (
          subscriptions.length === 0 ||
          subscriptions.includes(notification.type) ||
          subscriptions.includes("ALL")
        ) {
          try {
            client.send(message);
            sentCount++;
          } catch (error) {
            console.error("Error sending WebSocket message:", error);
            this.clients.delete(client);
          }
        }
      } else {
        // Remove dead connections
        this.clients.delete(client);
      }
    });

    if (sentCount > 0) {
      console.log(`📡 Broadcasted ${notification.type} to ${sentCount} clients`);
    }
  }

  /**
   * Send notification to specific client
   */
  sendToClient(client: WebSocket, notification: NotificationMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(notification));
    }
  }

  /**
   * Notify trade execution
   */
  notifyTradeExecuted(data: {
    userAddress: string;
    txHash: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: string;
    strategy: string;
  }): void {
    this.broadcast({
      type: "TRADE_EXECUTED",
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Notify portfolio update
   */
  notifyPortfolioUpdate(data: {
    userAddress: string;
    portfolioValue: number;
    pnl: number;
    pnlPercentage: number;
  }): void {
    this.broadcast({
      type: "PORTFOLIO_UPDATE",
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Notify agent status change
   */
  notifyAgentStatus(data: {
    userAddress: string;
    isActive: boolean;
    status: string;
  }): void {
    this.broadcast({
      type: "AGENT_STATUS",
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Notify price alert
   */
  notifyPriceAlert(data: {
    token: string;
    price: number;
    change: number;
    threshold: number;
  }): void {
    this.broadcast({
      type: "PRICE_ALERT",
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Notify risk alert
   */
  notifyRiskAlert(data: {
    userAddress: string;
    alertType: string;
    message: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }): void {
    this.broadcast({
      type: "RISK_ALERT",
      timestamp: Date.now(),
      data,
    });
  }

  /**
   * Get connected clients count
   */
  getConnectedClients(): number {
    return this.clients.size;
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    this.clients.forEach((client) => {
      client.close();
    });
    this.clients.clear();

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }
  }
}

export const websocketService = new WebSocketService();

