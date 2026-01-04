/**
 * Backtesting Engine
 * Tests trading strategies against historical price data
 */

import { getPriceHistory } from "./priceService";
import { TradingStrategy, type StrategyConfig, type StrategyResult } from "./tradingStrategies";
import type { Address } from "viem";

export interface BacktestConfig {
  strategy: TradingStrategy;
  tokenIn: Address;
  tokenOut: Address;
  initialCapital: number;
  startDate: Date;
  endDate: Date;
  params?: Record<string, any>;
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  returnPercentage: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
}

export interface BacktestTrade {
  timestamp: Date;
  entryPrice: number;
  exitPrice: number;
  amount: number;
  profit: number;
  profitPercentage: number;
  type: "BUY" | "SELL";
}

export interface EquityPoint {
  timestamp: Date;
  equity: number;
  drawdown: number;
}

/**
 * Run backtest on a trading strategy
 */
export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  try {
    // Get historical price data
    const priceHistory = await getPriceHistory(
      "USDC", // Base currency
      config.startDate,
      config.endDate
    );

    if (!priceHistory || priceHistory.length < 2) {
      throw new Error("Insufficient price history data");
    }

    let capital = config.initialCapital;
    let position = 0; // Amount of tokenOut held
    let peakEquity = capital;
    let maxDrawdown = 0;

    const trades: BacktestTrade[] = [];
    const equityCurve: EquityPoint[] = [];

    // Initialize equity curve
    equityCurve.push({
      timestamp: config.startDate,
      equity: capital,
      drawdown: 0,
    });

    // Simulate trading
    for (let i = 1; i < priceHistory.length; i++) {
      const currentPrice = priceHistory[i].price;
      const previousPrice = priceHistory[i - 1].price;
      const timestamp = new Date(priceHistory[i].timestamp);

      // Determine if strategy should execute trade
      const shouldTrade = evaluateStrategy(
        config.strategy,
        priceHistory.slice(Math.max(0, i - 20), i + 1), // Last 20 data points
        currentPrice,
        previousPrice,
        config.params || {}
      );

      if (shouldTrade.action === "BUY" && capital > 0) {
        // Execute buy
        const tradeAmount = calculatePositionSize(
          capital,
          config.params?.positionSize || 0.1, // 10% of capital per trade
          config.params?.maxPositionSize || 0.5 // Max 50% of capital
        );

        const tokenAmount = tradeAmount / currentPrice;
        position += tokenAmount;
        capital -= tradeAmount;

        // Record trade
        trades.push({
          timestamp,
          entryPrice: currentPrice,
          exitPrice: currentPrice, // Will be updated on exit
          amount: tradeAmount,
          profit: 0,
          profitPercentage: 0,
          type: "BUY",
        });
      } else if (shouldTrade.action === "SELL" && position > 0) {
        // Execute sell
        const exitPrice = currentPrice;
        const exitValue = position * exitPrice;
        const entryValue = trades
          .filter((t) => t.type === "BUY" && t.exitPrice === t.entryPrice)
          .reduce((sum, t) => sum + t.amount, 0);

        const profit = exitValue - entryValue;
        const profitPercentage = (profit / entryValue) * 100;

        capital += exitValue;
        position = 0;

        // Update last buy trade
        const lastBuyTrade = trades
          .filter((t) => t.type === "BUY")
          .reverse()
          .find((t) => t.exitPrice === t.entryPrice);

        if (lastBuyTrade) {
          lastBuyTrade.exitPrice = exitPrice;
          lastBuyTrade.profit = profit;
          lastBuyTrade.profitPercentage = profitPercentage;
        }
      }

      // Update equity
      const currentEquity = capital + position * currentPrice;
      const drawdown = ((peakEquity - currentEquity) / peakEquity) * 100;

      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }

      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }

      equityCurve.push({
        timestamp,
        equity: currentEquity,
        drawdown,
      });
    }

    // Close any remaining positions
    if (position > 0 && priceHistory.length > 0) {
      const finalPrice = priceHistory[priceHistory.length - 1].price;
      capital += position * finalPrice;
      position = 0;
    }

    // Calculate metrics
    const completedTrades = trades.filter((t) => t.profit !== 0);
    const winningTrades = completedTrades.filter((t) => t.profit > 0);
    const losingTrades = completedTrades.filter((t) => t.profit < 0);

    const totalProfit = winningTrades.reduce((sum, t) => sum + t.profit, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0));
    const netProfit = capital - config.initialCapital;
    const returnPercentage = (netProfit / config.initialCapital) * 100;
    const winRate = completedTrades.length > 0 ? (winningTrades.length / completedTrades.length) * 100 : 0;
    const averageWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

    // Calculate Sharpe Ratio (simplified)
    const returns = equityCurve.slice(1).map((point, i) => {
      const prevEquity = equityCurve[i].equity;
      return prevEquity > 0 ? ((point.equity - prevEquity) / prevEquity) * 100 : 0;
    });

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0;

    return {
      totalTrades: completedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      totalProfit,
      totalLoss,
      netProfit,
      returnPercentage,
      maxDrawdown,
      sharpeRatio,
      winRate,
      averageWin,
      averageLoss,
      profitFactor,
      trades: completedTrades,
      equityCurve,
    };
  } catch (error) {
    console.error("Backtest error:", error);
    throw new Error(`Backtest failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Evaluate if strategy should execute trade
 */
function evaluateStrategy(
  strategy: TradingStrategy,
  priceHistory: Array<{ price: number; timestamp: number }>,
  currentPrice: number,
  previousPrice: number,
  params: Record<string, any>
): { action: "BUY" | "SELL" | "HOLD" } {
  if (priceHistory.length < 2) {
    return { action: "HOLD" };
  }

  const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;

  switch (strategy) {
    case TradingStrategy.MOMENTUM:
      // Buy on positive momentum
      if (priceChange > (params.momentumThreshold || 2)) {
        return { action: "BUY" };
      }
      // Sell on negative momentum
      if (priceChange < -(params.momentumThreshold || 2)) {
        return { action: "SELL" };
      }
      break;

    case TradingStrategy.MEAN_REVERSION:
      // Calculate moving average
      const ma = priceHistory.reduce((sum, p) => sum + p.price, 0) / priceHistory.length;
      const deviation = ((currentPrice - ma) / ma) * 100;

      // Buy when price is below mean (oversold)
      if (deviation < -(params.deviationThreshold || 5)) {
        return { action: "BUY" };
      }
      // Sell when price is above mean (overbought)
      if (deviation > (params.deviationThreshold || 5)) {
        return { action: "SELL" };
      }
      break;

    case TradingStrategy.DCA:
      // Buy at regular intervals (simplified - buy every 10% drop)
      if (priceChange < -(params.dcaThreshold || 5)) {
        return { action: "BUY" };
      }
      break;

    case TradingStrategy.GRID_TRADING:
      // Buy at lower grid levels, sell at higher
      const gridSize = params.gridSize || 2; // 2% grid
      const gridLevel = Math.floor((currentPrice % (currentPrice * gridSize / 100)) / (currentPrice * gridSize / 100));
      if (gridLevel === 0) {
        return { action: "BUY" };
      }
      if (gridLevel >= 3) {
        return { action: "SELL" };
      }
      break;

    default:
      return { action: "HOLD" };
  }

  return { action: "HOLD" };
}

/**
 * Calculate position size based on risk management
 */
function calculatePositionSize(
  capital: number,
  positionSizePercent: number,
  maxPositionSizePercent: number
): number {
  const baseSize = capital * positionSizePercent;
  const maxSize = capital * maxPositionSizePercent;
  return Math.min(baseSize, maxSize);
}

