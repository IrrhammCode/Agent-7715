/**
 * Trading Strategies Service
 * Implements multiple trading strategies for the agent
 */

import { publicClient } from "../config";
import type { Address } from "viem";

export enum TradingStrategy {
  MARKET = "MARKET",
  DCA = "DCA", // Dollar Cost Averaging
  LIMIT_ORDER = "LIMIT_ORDER",
  STOP_LOSS = "STOP_LOSS",
  GRID_TRADING = "GRID_TRADING",
  MOMENTUM = "MOMENTUM",
  MEAN_REVERSION = "MEAN_REVERSION",
}

export interface StrategyConfig {
  strategy: TradingStrategy;
  tokenIn: Address;
  tokenOut: Address;
  amount: bigint;
  params: Record<string, any>;
}

export interface DCAParams {
  interval: number; // seconds between trades
  totalAmount: bigint; // total amount to invest
  numberOfTrades: number; // number of trades to execute
  startTime: number; // when to start
}

export interface LimitOrderParams {
  targetPrice: number; // price to trigger at
  amount: bigint;
  side: "BUY" | "SELL";
  expiry: number; // timestamp
}

export interface StopLossParams {
  stopPrice: number; // price to trigger stop loss
  amount: bigint;
  side: "BUY" | "SELL";
}

export interface GridTradingParams {
  lowerBound: number;
  upperBound: number;
  gridLevels: number; // number of grid levels
  amountPerGrid: bigint;
}

/**
 * DCA Strategy: Execute trades at regular intervals
 */
export class DCAStrategy {
  async execute(config: StrategyConfig & { params: DCAParams }): Promise<boolean> {
    const { params } = config;
    const now = Math.floor(Date.now() / 1000);

    // Check if it's time to execute
    if (now < params.startTime) {
      return false;
    }

    // Calculate which trade number we're on
    const elapsed = now - params.startTime;
    const tradeNumber = Math.floor(elapsed / params.interval);

    if (tradeNumber >= params.numberOfTrades) {
      return false; // All trades completed
    }

    // Validate required params
    if (!params || !params.totalAmount || !params.numberOfTrades) {
      console.warn("[DCA] Missing required params:", params);
      return false;
    }

    // Calculate amount for this trade
    // params comes from JSON so convert to BigInt safely
    try {
      const amountPerTrade = BigInt(params.totalAmount) / BigInt(params.numberOfTrades);
    } catch (e) {
      console.error("[DCA] Error calculating trade amount:", e);
      return false;
    }

    return true; // Ready to execute
  }

  getNextExecutionTime(params: DCAParams): number | null {
    const now = Math.floor(Date.now() / 1000);
    if (now < params.startTime) {
      return params.startTime;
    }

    const elapsed = now - params.startTime;
    const tradeNumber = Math.floor(elapsed / params.interval);
    const nextTrade = tradeNumber + 1;

    if (nextTrade >= params.numberOfTrades) {
      return null; // All trades completed
    }

    return params.startTime + nextTrade * params.interval;
  }
}

/**
 * Limit Order Strategy: Execute when price reaches target
 */
// Limit Order Strategy: Execute when price reaches target
export class LimitOrderStrategy {
  async shouldExecute(
    config: StrategyConfig & { params: LimitOrderParams & { condition?: "ABOVE" | "BELOW" } },
    currentPrice: number
  ): Promise<boolean> {
    const { params } = config;

    // Check expiry
    if (params.expiry && Date.now() / 1000 > params.expiry) {
      return false; // Order expired
    }

    // Default condition based on side
    const condition = params.condition || (params.side === "BUY" ? "BELOW" : "ABOVE");

    if (condition === "ABOVE") {
      return currentPrice >= params.targetPrice; // Breakout Buy or Take Profit Sell
    } else {
      return currentPrice <= params.targetPrice; // Limit Buy or Stop Loss Sell
    }
  }
}

/**
 * Stop Loss Strategy: Execute when price hits stop loss level
 */
export class StopLossStrategy {
  async shouldExecute(
    config: StrategyConfig & { params: StopLossParams },
    currentPrice: number
  ): Promise<boolean> {
    const { params } = config;

    if (params.side === "BUY") {
      return currentPrice <= params.stopPrice; // Stop loss buy
    } else {
      return currentPrice >= params.stopPrice; // Stop loss sell
    }
  }
}

/**
 * Grid Trading Strategy: Execute trades at multiple price levels
 */
export class GridTradingStrategy {
  async getActiveGrids(
    config: StrategyConfig & { params: GridTradingParams },
    currentPrice: number
  ): Promise<Array<{ level: number; price: number; amount: bigint }>> {
    const { params } = config;

    if (currentPrice < params.lowerBound || currentPrice > params.upperBound) {
      return []; // Price out of range
    }

    const priceRange = params.upperBound - params.lowerBound;
    const gridStep = priceRange / params.gridLevels;

    const activeGrids: Array<{ level: number; price: number; amount: bigint }> = [];

    for (let i = 0; i < params.gridLevels; i++) {
      const gridPrice = params.lowerBound + i * gridStep;

      // Check if current price is near this grid level (within 1% of grid step)
      const priceDiff = Math.abs(currentPrice - gridPrice);
      if (priceDiff <= gridStep * 0.01) {
        activeGrids.push({
          level: i,
          price: gridPrice,
          amount: params.amountPerGrid,
        });
      }
    }

    return activeGrids;
  }
}

/**
 * Momentum Strategy: Trade based on price momentum
 */
export class MomentumStrategy {
  async shouldExecute(
    priceHistory: number[],
    threshold: number = 0.05 // 5% momentum threshold
  ): Promise<{ execute: boolean; side: "BUY" | "SELL" }> {
    if (priceHistory.length < 2) {
      return { execute: false, side: "BUY" };
    }

    const recent = priceHistory.slice(-10); // Last 10 prices
    const older = priceHistory.slice(-20, -10); // Previous 10 prices

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const momentum = (recentAvg - olderAvg) / olderAvg;

    if (momentum > threshold) {
      return { execute: true, side: "BUY" }; // Positive momentum, buy
    } else if (momentum < -threshold) {
      return { execute: true, side: "SELL" }; // Negative momentum, sell
    }

    return { execute: false, side: "BUY" };
  }
}

/**
 * Mean Reversion Strategy: Trade when price deviates from mean
 */
export class MeanReversionStrategy {
  async shouldExecute(
    priceHistory: number[],
    deviation: number = 0.1 // 10% deviation threshold
  ): Promise<{ execute: boolean; side: "BUY" | "SELL" }> {
    if (priceHistory.length < 20) {
      return { execute: false, side: "BUY" };
    }

    const mean = priceHistory.reduce((a, b) => a + b, 0) / priceHistory.length;
    const currentPrice = priceHistory[priceHistory.length - 1];

    const deviationPercent = Math.abs((currentPrice - mean) / mean);

    if (deviationPercent > deviation) {
      if (currentPrice > mean) {
        return { execute: true, side: "SELL" }; // Price above mean, sell
      } else {
        return { execute: true, side: "BUY" }; // Price below mean, buy
      }
    }

    return { execute: false, side: "BUY" };
  }
}

// Export strategy instances
export const dcaStrategy = new DCAStrategy();
export const limitOrderStrategy = new LimitOrderStrategy();
export const stopLossStrategy = new StopLossStrategy();
export const gridTradingStrategy = new GridTradingStrategy();
export const momentumStrategy = new MomentumStrategy();
export const meanReversionStrategy = new MeanReversionStrategy();

