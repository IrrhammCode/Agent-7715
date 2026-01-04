/**
 * Portfolio Manager
 * Manages user portfolios and tracks performance
 */

import type { Address } from "viem";
import { publicClient, CONTRACTS } from "../config";
import { formatEther, formatUnits } from "viem";
import { getPrice } from "./priceService";
import { demoService } from "./demoService";

export interface PortfolioPosition {
  token: Address;
  symbol: string;
  balance: bigint;
  valueUSD: number;
  avgBuyPrice: number;
  currentPrice: number;
  pnl: number; // Profit and Loss
  pnlPercent: number;
}

export interface Portfolio {
  userAddress: Address;
  totalValueUSD: number;
  positions: PortfolioPosition[];
  totalPnL: number;
  totalPnLPercent: number;
  lastUpdated: number;
  maxDrawdown?: number;
}

export interface TradeHistory {
  txHash: string;
  timestamp: number;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOut: bigint;
  price: number;
  strategy: string;
  pnl?: number;
}

/**
 * Portfolio Manager Service
 */
import * as fs from "fs";
import * as path from "path";

const DATA_FILE = path.resolve(__dirname, "../../data/portfolio.json");

/**
 * Portfolio Manager Service
 */
export class PortfolioManager {
  private portfolios: Map<Address, Portfolio> = new Map();
  private tradeHistory: Map<Address, TradeHistory[]> = new Map();

  constructor() {
    this.loadPortfolios();
  }

  /**
   * Update portfolio after a trade
   */
  private loadPortfolios() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, "utf-8");
        const parsed = JSON.parse(data, (key, value) => {
          // Revive BigInt
          if (typeof value === 'string' && /^\d+n$/.test(value)) {
            return BigInt(value.slice(0, -1));
          }
          return value;
        });

        // Restore Maps
        if (parsed.portfolios) {
          this.portfolios = new Map(Object.entries(parsed.portfolios) as [Address, Portfolio][]);
        }
        if (parsed.tradeHistory) {
          this.tradeHistory = new Map(Object.entries(parsed.tradeHistory) as [Address, TradeHistory[]][]);
        }
        console.log(`[PortfolioManager] Loaded ${this.portfolios.size} portfolios from disk.`);
      }
    } catch (error) {
      console.error("[PortfolioManager] Failed to load data:", error);
    }
  }

  private savePortfolios() {
    try {
      const replacer = (key: string, value: any) => {
        if (typeof value === 'bigint') {
          return value.toString() + 'n'; // Mark as BigInt for revival
        }
        // Convert Maps to Objects for JSON
        if (value instanceof Map) {
          return Object.fromEntries(value);
        }
        return value;
      };

      const data = {
        portfolios: this.portfolios,
        tradeHistory: this.tradeHistory
      };

      // Ensure directory exists
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(DATA_FILE, JSON.stringify(data, replacer, 2));
    } catch (error) {
      console.error("[PortfolioManager] Failed to save data:", error);
    }
  }

  /**
   * Update portfolio after a trade
   */
  async updatePortfolio(
    userAddress: Address,
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
    amountOut: bigint,
    price: number,
    strategy: string,
    txHash: string
  ): Promise<void> {
    // Get or create portfolio
    let portfolio = this.portfolios.get(userAddress);
    if (!portfolio) {
      portfolio = {
        userAddress,
        totalValueUSD: 0,
        positions: [],
        totalPnL: 0,
        totalPnLPercent: 0,
        lastUpdated: Math.floor(Date.now() / 1000),
      };
    }

    // Add trade to history
    const history = this.tradeHistory.get(userAddress) || [];
    history.push({
      txHash,
      timestamp: Math.floor(Date.now() / 1000),
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      price,
      strategy,
    });
    this.tradeHistory.set(userAddress, history);

    // Update positions
    await this.updatePositions(portfolio, tokenIn, tokenOut, amountIn, amountOut, price);

    // Recalculate portfolio value
    await this.recalculatePortfolioValue(portfolio);

    this.portfolios.set(userAddress, portfolio);

    // Save to disk
    this.savePortfolios();
  }

  /**
   * Update token positions
   */
  private async updatePositions(
    portfolio: Portfolio,
    tokenIn: Address,
    tokenOut: Address,
    amountIn: bigint,
    amountOut: bigint,
    price: number
  ): Promise<void> {
    // Decrease tokenIn position
    const tokenInPosition = portfolio.positions.find((p) => p.token === tokenIn);
    if (tokenInPosition) {
      tokenInPosition.balance -= amountIn;
      if (tokenInPosition.balance <= 0n) {
        portfolio.positions = portfolio.positions.filter((p) => p.token !== tokenIn);
      }
    }

    // Increase tokenOut position
    const tokenOutPosition = portfolio.positions.find((p) => p.token === tokenOut);
    if (tokenOutPosition) {
      // Update average buy price (weighted average)
      const totalCost = tokenOutPosition.avgBuyPrice * Number(tokenOutPosition.balance) + price * Number(amountOut);
      tokenOutPosition.balance += amountOut;
      tokenOutPosition.avgBuyPrice = totalCost / Number(tokenOutPosition.balance);
    } else {
      // Create new position
      portfolio.positions.push({
        token: tokenOut,
        symbol: this.getTokenSymbol(tokenOut),
        balance: amountOut,
        valueUSD: price * Number(amountOut),
        avgBuyPrice: price,
        currentPrice: price,
        pnl: 0,
        pnlPercent: 0,
      });
    }
  }

  /**
   * Recalculate portfolio value and PnL
   */
  private async recalculatePortfolioValue(portfolio: Portfolio): Promise<void> {
    let totalValue = 0;
    let totalCost = 0;

    for (const position of portfolio.positions) {
      // Get current price (mock for now)
      position.currentPrice = await this.getCurrentPrice(position.token);
      position.valueUSD = position.currentPrice * Number(position.balance);

      const cost = position.avgBuyPrice * Number(position.balance);
      position.pnl = position.valueUSD - cost;
      position.pnlPercent = (position.pnl / cost) * 100;

      totalValue += position.valueUSD;
      totalCost += cost;
    }

    portfolio.totalValueUSD = totalValue;
    portfolio.totalPnL = totalValue - totalCost;
    portfolio.totalPnLPercent = totalCost > 0 ? (portfolio.totalPnL / totalCost) * 100 : 0;
    portfolio.lastUpdated = Math.floor(Date.now() / 1000);
  }

  /**
   * Get portfolio for a user (with actual wallet balances)
   * Handles RPC timeouts gracefully with fallback values
   */
  async getPortfolio(userAddress: Address): Promise<Portfolio | null> {
    const portfolio = this.portfolios.get(userAddress);

    // CRITICAL: Check Demo Mode FIRST and return Mock Portfolio immediately
    // Demo Mode block removed to ensure Honest Mode
    // if (demoService.isDemoMode) { ... }

    // Get actual wallet balances with timeout handling
    let ethBalance = 0n;
    let usdcBalance = 0n;

    // Real RPC Calls
    try {
      // Use Promise.race to add timeout
      const balancePromise = Promise.all([
        publicClient.getBalance({ address: userAddress }),
        this.getTokenBalance(userAddress, CONTRACTS.USDC, 6), // USDC has 6 decimals
      ]);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("RPC timeout")), 5000); // 5 second timeout
      });

      [ethBalance, usdcBalance] = await Promise.race([balancePromise, timeoutPromise]);
    } catch (error) {
      // If RPC times out, use cached values or defaults
      console.warn(`⚠️  RPC timeout fetching balances for ${userAddress}, using fallback values`);
      // Try to use cached values from previous portfolio if available
      if (portfolio) {
        const ethPosition = portfolio.positions.find(p =>
          p.token === "0x0000000000000000000000000000000000000000"
        );
        const usdcPosition = portfolio.positions.find(p =>
          p.token.toLowerCase() === CONTRACTS.USDC.toLowerCase()
        );
        ethBalance = ethPosition?.balance || 0n;
        usdcBalance = usdcPosition?.balance || 0n;
      }
    }

    // Get current prices (no mock fallbacks)
    let ethPrice = { price: 0 }; // Fallback to 0 if fetch fails
    let usdcPrice = { price: 1 }; // USDC is always 1

    try {
      ethPrice = await getPrice("ETH");
    } catch (error) {
      console.warn("⚠️  Could not fetch ETH price, using fallback");
    }

    // Calculate actual portfolio value from wallet balances
    const ethValue = parseFloat(formatEther(ethBalance)) * ethPrice.price;
    const usdcValue = parseFloat(formatUnits(usdcBalance, 6)) * usdcPrice.price;
    const walletValue = ethValue + usdcValue;

    // Get trade-based portfolio value
    const tradeValue = portfolio?.totalValueUSD || 0;

    // Combine wallet value with trade positions
    const totalValue = walletValue + tradeValue;

    // Calculate PnL based on trade positions only (wallet value is current, not tracked for PnL)
    // For now, PnL is calculated from trade positions only
    const tradePnL = portfolio?.totalPnL || 0;
    const tradePnLPercent = portfolio?.totalPnLPercent || 0;

    // Total PnL = trade PnL (wallet value is current value, not profit/loss)
    const totalPnL = tradePnL;
    const totalPnLPercent = tradePnLPercent;

    return {
      userAddress,
      totalValueUSD: totalValue,
      positions: [
        // Add ETH position
        {
          token: "0x0000000000000000000000000000000000000000" as Address, // ETH
          symbol: "ETH",
          balance: ethBalance,
          valueUSD: ethValue,
          avgBuyPrice: ethPrice.price, // Use current price as avg for now
          currentPrice: ethPrice.price,
          pnl: 0,
          pnlPercent: 0,
        },
        // Add USDC position
        {
          token: CONTRACTS.USDC,
          symbol: "USDC",
          balance: usdcBalance,
          valueUSD: usdcValue,
          avgBuyPrice: 1, // USDC is stablecoin
          currentPrice: 1,
          pnl: 0,
          pnlPercent: 0,
        },
        // Add trade positions (exclude ETH and USDC to avoid duplicates)
        ...(portfolio?.positions || []).filter(p =>
          p.token !== "0x0000000000000000000000000000000000000000" &&
          p.token.toLowerCase() !== CONTRACTS.USDC.toLowerCase()
        ),
      ],
      totalPnL,
      totalPnLPercent,
      lastUpdated: Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Get token balance from contract with timeout handling
   */
  private async getTokenBalance(
    userAddress: Address,
    tokenAddress: Address,
    decimals: number
  ): Promise<bigint> {
    try {
      const balancePromise = publicClient.readContract({
        address: tokenAddress,
        abi: [
          {
            constant: true,
            inputs: [{ name: "_owner", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "balance", type: "uint256" }],
            type: "function",
          },
        ],
        functionName: "balanceOf",
        args: [userAddress],
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Contract call timeout")), 5000);
      });

      const balance = await Promise.race([balancePromise, timeoutPromise]);
      return balance as bigint;
    } catch (error) {
      // Silently return 0 on timeout - will be handled by getPortfolio
      return 0n;
    }
  }

  /**
   * Get trade history for a user
   */
  getTradeHistory(userAddress: Address, limit: number = 50): TradeHistory[] {
    const history = this.tradeHistory.get(userAddress) || [];
    return history.slice(-limit).reverse();
  }

  /**
   * Get portfolio statistics
   */
  getPortfolioStats(userAddress: Address): {
    totalTrades: number;
    winRate: number;
    avgTradeSize: number;
    bestTrade: TradeHistory | null;
    worstTrade: TradeHistory | null;
  } {
    const history = this.getTradeHistory(userAddress);
    const tradesWithPnL = history.filter((t) => t.pnl !== undefined);

    const wins = tradesWithPnL.filter((t) => (t.pnl || 0) > 0).length;
    const winRate = tradesWithPnL.length > 0 ? (wins / tradesWithPnL.length) * 100 : 0;

    const avgTradeSize =
      history.length > 0
        ? history.reduce((sum, t) => sum + Number(t.amountIn), 0) / history.length
        : 0;

    const bestTrade =
      tradesWithPnL.length > 0
        ? tradesWithPnL.reduce((best, t) => ((t.pnl || 0) > (best.pnl || 0) ? t : best))
        : null;

    const worstTrade =
      tradesWithPnL.length > 0
        ? tradesWithPnL.reduce((worst, t) => ((t.pnl || 0) < (worst.pnl || 0) ? t : worst))
        : null;

    return {
      totalTrades: history.length,
      winRate,
      avgTradeSize,
      bestTrade,
      worstTrade,
    };
  }

  /**
   * Get current price for a token
   */
  private async getCurrentPrice(token: Address): Promise<number> {
    try {
      // Map token addresses to symbols
      if (token.toLowerCase() === CONTRACTS.USDC.toLowerCase()) {
        const price = await getPrice("USDC");
        return price.price;
      }
      if (token.toLowerCase() === CONTRACTS.WETH.toLowerCase()) {
        const price = await getPrice("ETH");
        return price.price;
      }
      // For ETH (zero address)
      if (token === "0x0000000000000000000000000000000000000000") {
        const price = await getPrice("ETH");
        return price.price;
      }
      // Default: try to get price or use 1
      const price = await getPrice("USDC"); // Fallback
      return price.price;
    } catch (error) {
      console.warn(`Could not fetch price for token ${token}:`, error);
      return 1; // Fallback
    }
  }

  /**
   * Get token symbol
   */
  private getTokenSymbol(token: Address): string {
    if (token.toLowerCase() === CONTRACTS.USDC.toLowerCase()) {
      return "USDC";
    }
    if (token.toLowerCase() === CONTRACTS.WETH.toLowerCase()) {
      return "WETH";
    }
    if (token === "0x0000000000000000000000000000000000000000") {
      return "ETH";
    }
    return "TOKEN";
  }
}

export const portfolioManager = new PortfolioManager();

