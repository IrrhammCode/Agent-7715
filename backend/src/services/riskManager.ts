/**
 * Risk Management Service
 * Manages risk limits and position sizing
 */

import type { Address } from "viem";
import { portfolioManager, type Portfolio } from "./portfolioManager";

export interface RiskLimits {
  maxLossPerTrade: number; // Maximum loss per trade in USD
  maxDailyLoss: number; // Maximum daily loss in USD
  maxPositionSize: number; // Maximum position size in USD
  maxLeverage: number; // Maximum leverage (if applicable)
  stopLossPercent: number; // Stop loss percentage
}

export interface RiskAssessment {
  canTrade: boolean;
  riskScore: number; // 0-100, higher = riskier
  reasons: string[];
  recommendedSize: number; // Recommended position size
}

const DEFAULT_RISK_LIMITS: RiskLimits = {
  maxLossPerTrade: 100, // $100 max loss per trade
  maxDailyLoss: 500, // $500 max daily loss
  maxPositionSize: 1000, // $1000 max position
  maxLeverage: 1, // No leverage
  stopLossPercent: 5, // 5% stop loss
};

/**
 * Risk Manager Service
 */
export class RiskManager {
  private userLimits: Map<Address, RiskLimits> = new Map();
  private dailyLosses: Map<Address, number> = new Map();
  private lastReset: Map<Address, number> = new Map();

  /**
   * Set risk limits for a user
   */
  setRiskLimits(userAddress: Address, limits: Partial<RiskLimits>): void {
    const current = this.userLimits.get(userAddress) || DEFAULT_RISK_LIMITS;
    this.userLimits.set(userAddress, { ...current, ...limits });
  }

  /**
   * Get risk limits for a user
   */
  getRiskLimits(userAddress: Address): RiskLimits {
    return this.userLimits.get(userAddress) || DEFAULT_RISK_LIMITS;
  }

  /**
   * Assess risk before executing a trade
   */
  async assessRisk(
    userAddress: Address,
    tradeAmount: number,
    currentPrice: number,
    expectedPrice: number
  ): Promise<RiskAssessment> {
    const limits = this.getRiskLimits(userAddress);
    const portfolio = await portfolioManager.getPortfolio(userAddress);
    const reasons: string[] = [];
    let riskScore = 0;

    // Reset daily loss if new day
    this.resetDailyLossIfNeeded(userAddress);

    // Check position size
    if (tradeAmount > limits.maxPositionSize) {
      reasons.push(`Trade amount ($${tradeAmount}) exceeds max position size ($${limits.maxPositionSize})`);
      riskScore += 30;
    }

    // Check daily loss
    const dailyLoss = this.dailyLosses.get(userAddress) || 0;
    if (dailyLoss >= limits.maxDailyLoss) {
      reasons.push(`Daily loss limit ($${limits.maxDailyLoss}) reached`);
      return {
        canTrade: false,
        riskScore: 100,
        reasons,
        recommendedSize: 0,
      };
    }

    // Calculate potential loss
    const priceChange = Math.abs((expectedPrice - currentPrice) / currentPrice);
    const potentialLoss = tradeAmount * priceChange;

    if (potentialLoss > limits.maxLossPerTrade) {
      reasons.push(`Potential loss ($${potentialLoss.toFixed(2)}) exceeds max per trade ($${limits.maxLossPerTrade})`);
      riskScore += 40;
    }

    // Check portfolio value
    if (portfolio) {
      const portfolioValue = portfolio.totalValueUSD;
      if (tradeAmount > portfolioValue * 0.5) {
        reasons.push(`Trade amount exceeds 50% of portfolio value`);
        riskScore += 20;
      }

      // Check if portfolio is already down
      if (portfolio.totalPnL < -limits.maxDailyLoss * 0.5) {
        reasons.push(`Portfolio is down significantly`);
        riskScore += 10;
      }
    }

    // Calculate recommended size
    const maxRecommended = Math.min(
      limits.maxPositionSize,
      limits.maxDailyLoss - dailyLoss,
      limits.maxLossPerTrade / priceChange
    );
    const recommendedSize = Math.min(tradeAmount, maxRecommended);

    return {
      canTrade: riskScore < 70, // Allow if risk score < 70
      riskScore,
      reasons,
      recommendedSize,
    };
  }

  /**
   * Record a trade loss
   */
  recordLoss(userAddress: Address, lossAmount: number): void {
    const current = this.dailyLosses.get(userAddress) || 0;
    this.dailyLosses.set(userAddress, current + Math.abs(lossAmount));
  }

  /**
   * Reset daily loss if needed
   */
  private resetDailyLossIfNeeded(userAddress: Address): void {
    const lastResetTime = this.lastReset.get(userAddress) || 0;
    const now = Math.floor(Date.now() / 1000);
    const oneDay = 86400;

    if (now - lastResetTime >= oneDay) {
      this.dailyLosses.set(userAddress, 0);
      this.lastReset.set(userAddress, now);
    }
  }

  /**
   * Get current daily loss
   */
  getDailyLoss(userAddress: Address): number {
    this.resetDailyLossIfNeeded(userAddress);
    return this.dailyLosses.get(userAddress) || 0;
  }

  /**
   * Calculate position size based on risk
   */
  calculatePositionSize(
    userAddress: Address,
    riskPercent: number, // Risk percentage (e.g., 2% = 0.02)
    stopLossPercent: number
  ): number {
    const portfolio = await portfolioManager.getPortfolio(userAddress);
    if (!portfolio) {
      return 0;
    }

    const portfolioValue = portfolio.totalValueUSD;
    const riskAmount = portfolioValue * riskPercent;
    const positionSize = riskAmount / (stopLossPercent / 100);

    const limits = this.getRiskLimits(userAddress);
    return Math.min(positionSize, limits.maxPositionSize);
  }
}

export const riskManager = new RiskManager();

