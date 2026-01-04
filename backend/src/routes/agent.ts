import { Router, Request, Response } from "express";
import { parseUnits } from "viem";
import { executeTradeOnBehalfOfUser, executeTradeOnBehalfOfUserLegacy } from "../services/executionEngine";
// import { priceMonitor } from "../services/priceMonitor"; // Deprecated
import { agentOrchestrator } from "../services/agentOrchestrator";
import { portfolioManager } from "../services/portfolioManager";
import { getPrice, getPriceHistory, getMultiplePrices } from "../services/priceService";
import { TradingStrategy, type StrategyConfig } from "../services/tradingStrategies";
import { CONTRACTS } from "../config";
import { runBacktest, type BacktestConfig } from "../services/backtestingEngine";
import {
  createDelegation,
  getDelegations,
  revokeDelegation,
  getDelegationStats,
  canDelegateExecute,
  recordDelegationUsage,
  type DelegationConfig,
} from "../services/agentDelegation";
import { websocketService } from "../services/websocketService";
import { setAgentRegistrations } from "../services/executionEngine";
import { envioService } from "../services/envioService";
import { emailService } from "../services/emailService";

// ... (other imports)

const router = Router();

// Envio Route
router.get("/envio/trades", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const userAddress = req.query.userAddress ? (req.query.userAddress as string).toLowerCase() : undefined;

    // 1. Fetch from Envio (On-Chain Events)
    const envioTrades = await envioService.getRecentTrades(limit, userAddress);

    // 2. Fetch from Local Portfolio (Fallback/Direct Trades)
    let localTrades: any[] = [];
    if (userAddress) {
      localTrades = portfolioManager.getTradeHistory(userAddress as `0x${string}`, limit);
    }

    // 3. Merge & Deduplicate
    // We prefer Envio data if available, but fallback trades only exist locally
    const combinedMap = new Map();

    // Add local trades first (adapter to match EnvioTrade interface)
    localTrades.forEach(t => {
      combinedMap.set(t.txHash.toLowerCase(), {
        txHash: t.txHash,
        blockNumber: 0, // Unknown
        user: userAddress || "",
        tokenIn: t.tokenIn,
        tokenOut: t.tokenOut,
        amountIn: t.amountIn.toString(),
        amountOut: t.amountOut.toString(),
        timestamp: t.timestamp
      });
    });

    // Add Envio trades (overwrite local if duplicate exists, as Envio is more authoritative for on-chain status)
    envioTrades.forEach(t => {
      combinedMap.set(t.txHash.toLowerCase(), t);
    });

    const mergedTrades = Array.from(combinedMap.values())
      .sort((a, b) => b.timestamp - a.timestamp) // Sort Descending
      .slice(0, limit);

    res.json({
      success: true,
      trades: mergedTrades
    });
  } catch (error) {
    console.error("Error fetching Envio trades:", error);
    res.status(500).json({ error: "Failed to fetch trades" });
  }
});

// Store registered agents (in production, use a database)
interface AgentRegistration {
  permissionContext: string;
  sessionAccountAddress: `0x${string}`;
  delegationManager: `0x${string}`;
  chainId: number;
  dailyBudget?: number;
  executionInterval?: number; // Added executionInterval (seconds)
  strategies?: StrategyConfig[]; // Added strategies
}

interface TriggerAgentRequest {
  userAddress: string;
  action: "BUY" | "SELL";
  amount?: number;
  strategy?: TradingStrategy;
  tokenIn?: string;
  tokenOut?: string;
  params?: Record<string, any>;
}

interface RegisterAgentRequest {
  userAddress: string;
  sessionAccountAddress: string;
  permissionContext: string;
  delegationManager: string;
  chainId: number;
  strategies?: StrategyConfig[];
  dailyBudget?: number; // Added dailyBudget
  executionInterval?: number; // Added executionInterval
  initialStrategy?: string; // Optional: Simplified strategy name (e.g., "LIMIT_BUY", "BREAKOUT_BUY")
  strategyParams?: any;     // Optional: Parameters for simplified strategy
  email?: string; // Optional: Email for notifications
}

// Store registered agents (in production, use a database)
// This must be defined BEFORE it's used
const registeredAgents = new Map<string, AgentRegistration>();

// Export agent registrations for execution engine
export { registeredAgents };

// Note: setAgentRegistrations is called when an agent is registered (see /register-agent endpoint)
// This avoids circular dependency issues during module initialization

/**
 * POST /register-agent
 * Register a user's permission context after they grant Advanced Permissions
 */
router.post("/register-agent", async (req: Request, res: Response) => {
  try {
    const {
      userAddress,
      sessionAccountAddress,
      permissionContext,
      delegationManager,
      chainId,
      strategies,
      initialStrategy,
      strategyParams,
      dailyBudget, // Destructure dailyBudget
      executionInterval, // Destructure executionInterval
      email // Destructure email
    }: RegisterAgentRequest = req.body;

    console.log("[DEBUG] Received dailyBudget from frontend:", dailyBudget);
    console.log("[DEBUG] Type of dailyBudget:", typeof dailyBudget);
    console.log("[DEBUG] Received email for notifications:", email || "None");

    if (!userAddress || !permissionContext || !sessionAccountAddress || !delegationManager) {
      return res.status(400).json({
        error: "Missing required fields: userAddress, sessionAccountAddress, permissionContext, delegationManager",
      });
    }

    // Store reference (will be updated at end)
    // registeredAgents.set(...) moved to end


    // Strategy Construction
    let activeStrategies: StrategyConfig[] = [];

    if (strategies && strategies.length > 0) {
      // Use provided full config
      activeStrategies = strategies;
    } else if (initialStrategy) {
      // Construct from simplified frontend params
      let strategyType = TradingStrategy.MARKET;
      let params = strategyParams || {};

      switch (initialStrategy) {
        case "LIMIT_BUY":
          strategyType = TradingStrategy.LIMIT_ORDER;
          params.side = "BUY";
          params.condition = "BELOW"; // Buy Dip
          break;
        case "BREAKOUT_BUY":
          strategyType = TradingStrategy.LIMIT_ORDER;
          params.side = "BUY";
          params.condition = "ABOVE"; // Breakout
          break;
        case "DCA":
          strategyType = TradingStrategy.DCA;
          break;
        case "STOP_LOSS":
          strategyType = TradingStrategy.STOP_LOSS;
          params.side = "SELL"; // Stop loss is usually selling
          break;
        case "MOMENTUM":
          strategyType = TradingStrategy.MOMENTUM;
          break;
        case "GRID":
          strategyType = TradingStrategy.GRID_TRADING;
          break;
        case "MARKET":
        default:
          strategyType = TradingStrategy.MARKET;
          break;
      }

      const amount = parseUnits((dailyBudget || 0.1).toString(), 18);
      console.log("[DEBUG] Calculated Amount (default strategy):", amount.toString());

      const newStrategyConfig = {
        strategy: strategyType,
        tokenIn: CONTRACTS.USDC,
        tokenOut: CONTRACTS.WETH,
        amount: amount, // Use dailyBudget
        params: params,
      };

      // Check if agent already exists to append strategy
      const existingAgent = registeredAgents.get(userAddress.toLowerCase());
      if (existingAgent && existingAgent.strategies) {
        // Append to existing strategies (max 5 to prevent spam)
        activeStrategies = [...existingAgent.strategies, newStrategyConfig];
        if (activeStrategies.length > 5) activeStrategies = activeStrategies.slice(-5);

        // Update budget to max of new or old (simplification)
        if (dailyBudget && dailyBudget > existingAgent.dailyBudget!) {
          existingAgent.dailyBudget = dailyBudget;
        }
      } else {
        // New agent
        activeStrategies = [newStrategyConfig];
      }
    } else {
      // Fallback Default
      const amount = parseUnits((dailyBudget || 0.1).toString(), 18);
      activeStrategies = [{
        strategy: TradingStrategy.MARKET,
        tokenIn: CONTRACTS.USDC,
        tokenOut: CONTRACTS.WETH,
        amount: amount,
        params: {},
      }];
    }

    // Register with orchestrator (use lowercase for consistency)
    agentOrchestrator.registerAgent(
      userAddress.toLowerCase() as `0x${string}`,
      permissionContext,
      activeStrategies,
      (dailyBudget && dailyBudget > 0) ? (executionInterval || 3600) : 3600, // Use executionInterval or default
      email // Pass email
    );

    // KEY FIX: Update registeredAgents source of truth AFTER calculating merged strategies
    registeredAgents.set(userAddress.toLowerCase(), {
      permissionContext,
      sessionAccountAddress: sessionAccountAddress as `0x${string}`,
      delegationManager: delegationManager as `0x${string}`,
      chainId: chainId || 11155111,
      dailyBudget: dailyBudget || 0.1,
      strategies: activeStrategies, // Use the FINAL merged list
    });

    // Safe JSON stringify for logs
    const replacer = (key: string, value: any) =>
      typeof value === 'bigint' ? value.toString() : value;

    console.log(`Agent registered: ${userAddress}`);
    console.log(`  Strategy: ${activeStrategies[0].strategy}`);
    console.log(`  Params: ${JSON.stringify(activeStrategies[0].params, replacer)}`);

    // Set agent registrations for execution engine
    setAgentRegistrations(registeredAgents);

    res.json({
      success: true,
      message: "Agent registered successfully",
      userAddress,
      strategiesCount: activeStrategies.length,
    });

    // UX IMPROVEMENT: Trigger immediate execution for instant feedback
    // This allows Market Orders to show "Trades: 1" immediately
    console.log(`[UX] Triggering immediate execution for ${userAddress}`);
    setTimeout(() => {
      agentOrchestrator.executeAgentStrategies(userAddress.toLowerCase() as `0x${string}`)
        .then(results => console.log("[UX] Immediate execution results:", results))
        .catch(err => console.error("[UX] Immediate execution error:", err));
    }, 100);

    // Send Activation Email
    // Only send if we have a valid recipient (User provided email OR System Alert Email)
    const recipient = email || process.env.ALERT_EMAIL;

    if (recipient) {
      emailService.sendAgentActivation(recipient, activeStrategies)
        .catch(err => console.error("Failed to send activation email:", err));
    } else {
      console.log("[Email] Skipped activation email: No recipient provided.");
    }
  } catch (error) {
    console.error("Error registering agent:", error);
    res.status(500).json({
      error: "Failed to register agent",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /trigger-agent
 * Manually trigger the agent to execute a trade (God Mode for demo)
 */
router.post("/trigger-agent", async (req: Request, res: Response) => {
  try {
    const { userAddress, action, amount, strategy, tokenIn, tokenOut, params }: TriggerAgentRequest = req.body;

    if (!userAddress) {
      return res.status(400).json({
        error: "Missing required field: userAddress",
      });
    }

    // Get the agent registration for this user
    const registration = registeredAgents.get(userAddress.toLowerCase());

    if (!registration) {
      return res.status(404).json({
        error: "No permission found for this user. Please register agent first.",
      });
    }

    // Get current price
    const priceData = await getPrice("USDC");

    // Determine amount to trade (default to 10 USDC if not specified)
    const tradeAmount = amount ? BigInt(amount) : 10n;

    // Create strategy config
    const strategyConfig: StrategyConfig = {
      strategy: strategy || TradingStrategy.MARKET,
      tokenIn: (tokenIn as `0x${string}`) || CONTRACTS.USDC,
      tokenOut: (tokenOut as `0x${string}`) || CONTRACTS.WETH,
      amount: tradeAmount,
      params: params || {},
    };

    // Execute the trade on behalf of the user
    // permissionContext will be fetched from registeredAgents in executionEngine
    const result = await executeTradeOnBehalfOfUser(
      userAddress.toLowerCase() as `0x${string}`,
      undefined, // Will be fetched from registeredAgents
      strategyConfig
    );

    console.log(`Trade executed: ${result.txHash} for user ${userAddress}`);

    res.json({
      success: true,
      transactionHash: result.txHash,
      userAddress,
      action: action || "BUY",
      amount: tradeAmount.toString(),
      amountOut: result.amountOut.toString(),
      price: result.price,
      strategy: strategyConfig.strategy,
      timestamp: Math.floor(Date.now() / 1000),
    });
  } catch (error) {
    console.error("Error triggering agent:", error);
    res.status(500).json({
      error: "Failed to execute trade",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /price
 * Get current BRETT price
 */
router.get("/price", async (req: Request, res: Response) => {
  try {
    const priceData = await getPrice("BRETT");
    res.json(priceData);
  } catch (error) {
    console.error("Error fetching price:", error);
    res.status(500).json({
      error: "Failed to fetch price",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /agent-status/:userAddress
 * Check if an agent is registered for a user
 */
router.get("/agent-status/:userAddress", (req: Request, res: Response) => {
  const { userAddress } = req.params;
  const permissionContext = registeredAgents.get(userAddress.toLowerCase());
  const agent = agentOrchestrator.getAgent(userAddress.toLowerCase() as `0x${string}`);

  const response = {
    registered: !!permissionContext,
    userAddress,
    agent: agent ? {
      isActive: agent.isActive,
      strategiesCount: agent.strategies.length,
      createdAt: agent.createdAt,
      lastExecuted: agent.lastExecuted,
      strategies: agent.strategies // Include strategies for details
    } : null,
  };

  const replacer = (key: string, value: any) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  };

  res.json(JSON.parse(JSON.stringify(response, replacer)));
});

/**
 * GET /portfolio/:userAddress
 * Get portfolio for a user (with actual wallet balances)
 */
router.get("/portfolio/:userAddress", async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;

    // Get portfolio with timeout handling
    let portfolio: any;
    try {
      portfolio = await portfolioManager.getPortfolio(userAddress as `0x${string}`);
    } catch (error) {
      // If portfolio fetch fails, return empty portfolio instead of error
      console.warn(`⚠️  Portfolio fetch failed for ${userAddress}, returning empty portfolio`);
      portfolio = null;
    }

    const stats = portfolioManager.getPortfolioStats(userAddress as `0x${string}`);

    if (!portfolio) {
      return res.json({
        userAddress,
        totalValueUSD: 0,
        positions: [],
        totalPnL: 0,
        totalPnLPercent: 0,
        stats,
      });
    }

    const replacer = (key: string, value: any) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    };

    const sanitizedPortfolio = JSON.parse(JSON.stringify(portfolio, replacer));
    const sanitizedStats = JSON.parse(JSON.stringify(stats, replacer));

    res.json({
      ...sanitizedPortfolio,
      stats: sanitizedStats,
    });
  } catch (error) {
    // Even if everything fails, return empty portfolio instead of error
    console.error("Error fetching portfolio:", error);
    const { userAddress } = req.params;
    const stats = portfolioManager.getPortfolioStats(userAddress as `0x${string}`);
    res.json({
      userAddress,
      totalValueUSD: 0,
      positions: [],
      totalPnL: 0,
      totalPnLPercent: 0,
      stats,
    });
  }
});

/**
 * GET /trades/:userAddress
 * Get trade history for a user
 */
router.get("/trades/:userAddress", (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const trades = portfolioManager.getTradeHistory(userAddress as `0x${string}`, limit);

    const replacer = (key: string, value: any) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    };

    const sanitizedTrades = JSON.parse(JSON.stringify(trades, replacer));

    res.json({
      userAddress,
      trades: sanitizedTrades,
      count: trades.length,
    });
  } catch (error) {
    console.error("Error fetching trades:", error);
    res.status(500).json({
      error: "Failed to fetch trades",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /strategies/:userAddress
 * Add or update strategies for an agent
 */
router.post("/strategies/:userAddress", async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;
    const { strategies }: { strategies: StrategyConfig[] } = req.body;

    if (!strategies || !Array.isArray(strategies)) {
      return res.status(400).json({
        error: "Invalid strategies array",
      });
    }

    const registration = registeredAgents.get(userAddress.toLowerCase());
    if (!registration) {
      return res.status(404).json({
        error: "Agent not registered. Please register agent first.",
      });
    }

    // Update agent with new strategies
    agentOrchestrator.unregisterAgent(userAddress.toLowerCase() as `0x${string}`);
    agentOrchestrator.registerAgent(
      userAddress.toLowerCase() as `0x${string}`,
      registration.permissionContext,
      strategies
    );

    res.json({
      success: true,
      message: "Strategies updated",
      strategiesCount: strategies.length,
    });
  } catch (error) {
    console.error("Error updating strategies:", error);
    res.status(500).json({
      error: "Failed to update strategies",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /execute-all
 * Execute all agents (admin/manual trigger)
 */
router.post("/execute-all", async (req: Request, res: Response) => {
  try {
    const results = await agentOrchestrator.executeAllAgents();

    res.json({
      success: true,
      executed: results.filter((r) => r.executed).length,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error("Error executing all agents:", error);
    res.status(500).json({
      error: "Failed to execute agents",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /prices
 * Get prices for multiple tokens
 */
router.get("/prices", async (req: Request, res: Response) => {
  try {
    const tokens = req.query.tokens
      ? (req.query.tokens as string).split(",").map((t) => ({ symbol: t.trim() }))
      : [{ symbol: "USDC" }, { symbol: "ETH" }, { symbol: "BTC" }];

    const prices = await getMultiplePrices(tokens);
    res.json(prices);
  } catch (error) {
    console.error("Error fetching prices:", error);
    res.status(500).json({
      error: "Failed to fetch prices",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /price-history/:tokenId
 * Get price history for a token
 */
router.get("/price-history/:tokenId", async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.params;
    const days = parseInt(req.query.days as string) || 7;
    const history = await getPriceHistory(tokenId, days);

    res.json({
      tokenId,
      days,
      data: history,
    });
  } catch (error) {
    console.error("Error fetching price history:", error);
    res.status(500).json({
      error: "Failed to fetch price history",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /backtest
 * Run backtest on a trading strategy
 */
router.post("/backtest", async (req: Request, res: Response) => {
  try {
    const config: BacktestConfig = req.body;

    if (!config.strategy || !config.tokenIn || !config.tokenOut || !config.initialCapital) {
      return res.status(400).json({
        error: "Missing required fields: strategy, tokenIn, tokenOut, initialCapital",
      });
    }

    const result = await runBacktest(config);
    res.json(result);
  } catch (error) {
    console.error("Error running backtest:", error);
    res.status(500).json({
      error: "Failed to run backtest",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /delegation/create
 * Create agent-to-agent delegation
 */
router.post("/delegation/create", async (req: Request, res: Response) => {
  try {
    const config: DelegationConfig = req.body;

    // Validate required fields
    if (!config.delegatorAgent || !config.delegateAgent || !config.tokenAddress || !config.targetContract) {
      return res.status(400).json({
        error: "Missing required fields: delegatorAgent, delegateAgent, tokenAddress, targetContract",
      });
    }

    const delegation = createDelegation(config);

    // Use JSON.stringify with replacer for BigInt support
    const replacer = (key: string, value: any) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    };

    // Serialize and parse back to JSON object
    const serializedDelegation = JSON.parse(JSON.stringify(delegation, replacer));

    // Notify via WebSocket
    websocketService.broadcast({
      type: "delegation_created",
      timestamp: Date.now(),
      data: serializedDelegation,
    });

    res.json({ success: true, delegation: serializedDelegation });
  } catch (error) {
    console.error("Error creating delegation:", error);
    res.status(500).json({
      error: "Failed to create delegation",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /delegation/:agentAddress
 * Get delegations for an agent
 */
router.get("/delegation/:agentAddress", async (req: Request, res: Response) => {
  try {
    const { agentAddress } = req.params;
    const delegations = getDelegations(agentAddress as `0x${string}`);

    // Use JSON.stringify with replacer for BigInt support
    const replacer = (key: string, value: any) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    };

    const serializedDelegations = JSON.parse(JSON.stringify(delegations, replacer));

    res.json(serializedDelegations);
  } catch (error) {
    console.error("Error fetching delegations:", error);
    res.status(500).json({
      error: "Failed to fetch delegations",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /delegation/revoke/:delegationId
 * Revoke a delegation
 */
router.post("/delegation/revoke/:delegationId", async (req: Request, res: Response) => {
  try {
    const { delegationId } = req.params;
    const success = revokeDelegation(delegationId);
    res.json({ success });
  } catch (error) {
    console.error("Error revoking delegation:", error);
    res.status(500).json({
      error: "Failed to revoke delegation",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /delegation/stats/:agentAddress
 * Get delegation statistics
 */
router.get("/delegation/stats/:agentAddress", async (req: Request, res: Response) => {
  try {
    const { agentAddress } = req.params;
    const stats = getDelegationStats(agentAddress as `0x${string}`);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching delegation stats:", error);
    res.status(500).json({
      error: "Failed to fetch delegation stats",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /analytics/:userAddress
 * Get advanced analytics for a user
 */
router.get("/analytics/:userAddress", async (req: Request, res: Response) => {
  try {
    const { userAddress: rawUserAddress } = req.params;
    const userAddress = rawUserAddress.toLowerCase() as `0x${string}`; // Normalization fix

    console.log(`[DEBUG] Analytics requested for: ${userAddress} (Raw: ${rawUserAddress})`);

    const portfolio = await portfolioManager.getPortfolio(userAddress);
    const trades = portfolioManager.getTradeHistory(userAddress);

    console.log(`[DEBUG] Found ${trades.length} trades for ${userAddress}`);

    const winningTrades = trades.filter((t: any) => (t.pnl || 0) > 0);
    const losingTrades = trades.filter((t: any) => (t.pnl || 0) < 0);

    const totalVolume = trades.reduce((sum: number, t: any) => sum + Number(t.amountIn), 0);
    const avgTradeSize = trades.length > 0 ? totalVolume / trades.length : 0;
    const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0;

    const profitFactor =
      losingTrades.length > 0
        ? winningTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0) /
        Math.abs(losingTrades.reduce((sum: number, t: any) => sum + (t.pnl || 0), 0))
        : 0;

    // Strategy performance
    const strategyPerformance = new Map<string, { trades: number; profit: number }>();
    trades.forEach((trade: any) => {
      const current = strategyPerformance.get(trade.strategy) || { trades: 0, profit: 0 };
      strategyPerformance.set(trade.strategy, {
        trades: current.trades + 1,
        profit: current.profit + (trade.pnl || 0),
      });
    });



    const replacer = (key: string, value: any) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    };

    const responseData = {
      portfolio: {
        value: portfolio?.totalValueUSD || 0,
        pnl: portfolio?.totalPnL || 0,
        pnlPercentage: portfolio?.totalPnLPercent || 0,
      },
      trades: {
        total: trades.length,
        winning: winningTrades.length,
        losing: losingTrades.length,
        winRate,
        avgTradeSize,
        totalVolume,
        profitFactor,
      },
      strategyPerformance: Object.fromEntries(strategyPerformance),
      riskMetrics: {
        maxDrawdown: portfolio?.maxDrawdown || 0,
        sharpeRatio: 0,
      },
    };

    const sanitizedResponse = JSON.parse(JSON.stringify(responseData, replacer));
    res.json(sanitizedResponse);
  } catch (error) {
    console.error("Error fetching analytics:", error);
    res.status(500).json({
      error: "Failed to fetch analytics",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /permission-analytics/:userAddress
 * Get permission usage analytics for a user
 */
router.get("/permission-analytics/:userAddress", async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;
    const permissionContext = registeredAgents.get(userAddress.toLowerCase());

    // Get trade history to calculate permission usage
    const trades = portfolioManager.getTradeHistory(userAddress as `0x${string}`, 100);

    // Calculate permission usage metrics
    const totalUsed = trades.reduce((sum: number, trade: any) => {
      return sum + parseFloat(trade.amountIn?.toString() || "0");
    }, 0);

    // Get agent status for permission details (use lowercase)
    const agentStatus = agentOrchestrator.getAgentStatus(userAddress.toLowerCase() as `0x${string}`);

    // Calculate daily usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTrades = trades.filter((trade: any) => {
      const tradeDate = new Date(trade.timestamp * 1000);
      tradeDate.setHours(0, 0, 0, 0);
      return tradeDate.getTime() === today.getTime();
    });

    const dailyUsed = todayTrades.reduce((sum: number, trade: any) => {
      return sum + parseFloat(trade.amountIn?.toString() || "0");
    }, 0);

    // Default permission limit (Micro Demo)
    const dailyLimit = permissionContext?.dailyBudget || 100;
    const totalLimit = dailyLimit * 7; // Total limit approx 1 week
    const remainingAllowance = Math.max(0, dailyLimit - dailyUsed);
    const usagePercentage = (dailyUsed / dailyLimit) * 100;

    // Calculate reset time (seconds until midnight)
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const resetInSeconds = Math.floor((midnight.getTime() - now.getTime()) / 1000);

    // Determine status based on usage
    let status: "HEALTHY" | "WARNING" | "CRITICAL";
    if (usagePercentage >= 80) {
      status = "CRITICAL";
    } else if (usagePercentage >= 50) {
      status = "WARNING";
    } else {
      status = "HEALTHY";
    }

    // Permission usage over time (last 7 days) - format for frontend
    const usageHistory: { timestamp: number; used: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dayTrades = trades.filter((trade: any) => {
        const tradeDate = new Date(trade.timestamp * 1000);
        tradeDate.setHours(0, 0, 0, 0);
        return tradeDate.getTime() === date.getTime();
      });

      const dayUsed = dayTrades.reduce((sum: number, trade: any) => {
        return sum + parseFloat(trade.amountIn?.toString() || "0");
      }, 0);

      usageHistory.push({
        timestamp: Math.floor(date.getTime() / 1000),
        used: dayUsed,
      });
    }

    // Return format that matches frontend expectations
    res.json({
      dailyUsed,
      dailyLimit,
      totalUsed,
      totalLimit,
      resetInSeconds,
      status,
      usageHistory,
    });
  } catch (error) {
    console.error("Error fetching permission analytics:", error);
    res.status(500).json({
      error: "Failed to fetch permission analytics",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * POST /permissions/revoke-all
 * Emergency stop - revoke all permissions for a user
 */
router.post("/permissions/revoke-all", async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.body;

    if (!userAddress) {
      return res.status(400).json({
        error: "Missing userAddress",
      });
    }

    // Remove agent registration
    registeredAgents.delete(userAddress.toLowerCase());

    // Unregister from orchestrator (use lowercase)
    agentOrchestrator.unregisterAgent(userAddress.toLowerCase() as `0x${string}`);

    // Revoke all delegations where user is delegator (outgoing grants)
    const delegations = getDelegations(userAddress as `0x${string}`);
    delegations.asDelegator.forEach((delegation) => {
      revokeDelegation(delegation.id);
    });

    // Revoke all delegations where user is delegate (incoming grants) - Full Clean Slate
    delegations.asDelegate.forEach((delegation) => {
      revokeDelegation(delegation.id);
    });

    console.log(`[EMERGENCY STOP] Revoked ${delegations.asDelegator.length} outgoing and ${delegations.asDelegate.length} incoming delegations for ${userAddress}`);

    // Notify via WebSocket
    websocketService.broadcast({
      type: "permissions_revoked",
      timestamp: Date.now(),
      data: { userAddress },
    });

    console.log(`All permissions revoked for user: ${userAddress}`);

    res.json({
      success: true,
      message: "All permissions revoked successfully",
      userAddress,
    });
  } catch (error) {
    console.error("Error revoking permissions:", error);
    res.status(500).json({
      error: "Failed to revoke permissions",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /permissions/:userAddress
 * Get all permissions for a user (for multi-permission support)
 */
router.get("/permissions/:userAddress", async (req: Request, res: Response) => {
  try {
    const { userAddress } = req.params;
    const permissionContext = registeredAgents.get(userAddress.toLowerCase());
    const agentStatus = agentOrchestrator.getAgentStatus(userAddress.toLowerCase() as `0x${string}`);

    // Get delegation stats
    const delegationStats = getDelegationStats(userAddress as `0x${string}`);

    res.json({
      userAddress,
      permissions: permissionContext ? [{
        id: "main",
        context: permissionContext,
        isActive: !!agentStatus?.isActive,
        createdAt: agentStatus?.createdAt || Date.now(),
        strategies: agentStatus?.strategies || [],
      }] : [],
      delegationStats,
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({
      error: "Failed to fetch permissions",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * GET /envio/trades
 * Get recent trades directly from Envio HyperSync
 */
router.get("/envio/trades", async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const user = req.query.user as string;
    const trades = await envioService.getRecentTrades(limit, user);
    res.json({
      source: "Envio HyperSync",
      count: trades.length,
      trades
    });
  } catch (error) {
    console.error("Error fetching Envio trades:", error);
    res.status(500).json({ error: "Failed to fetch trades from Envio" });
  }
});

export default router;

