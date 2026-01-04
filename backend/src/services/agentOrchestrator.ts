/**
 * Agent Orchestrator
 * Manages multiple agents and their trading strategies
 */

import type { Address } from "viem";
import {
  TradingStrategy,
  type StrategyConfig,
  dcaStrategy,
  limitOrderStrategy,
  stopLossStrategy,
  gridTradingStrategy,
  momentumStrategy,
  meanReversionStrategy,
} from "./tradingStrategies";
import { getPrice, getPriceHistory } from "./priceService";
import { executeTradeOnBehalfOfUser } from "./executionEngine";
import { emailService } from "./emailService";

export interface Agent {
  userAddress: Address;
  permissionContext: string;
  strategies: StrategyConfig[];
  isActive: boolean;
  createdAt: number;
  lastExecuted: number;
  executionInterval?: number;
  email?: string; // Stored user email for notifications
}

export interface AgentExecutionResult {
  agent: Address;
  strategy: TradingStrategy;
  executed: boolean;
  txHash?: `0x${string}`;
  reason?: string;
}

/**
 * Agent Orchestrator Service
 * Manages and executes strategies for multiple agents
 */
export class AgentOrchestrator {
  private agents: Map<Address, Agent> = new Map();
  private priceHistory: Map<string, number[]> = new Map(); // token -> prices
  private executionInterval: NodeJS.Timeout | null = null;

  /**
   * Register a new agent
   */
  registerAgent(
    userAddress: Address,
    permissionContext: string,
    strategies: StrategyConfig[],
    executionInterval: number = 3600,
    email?: string
  ): void {
    // Check if agent exists to preserve timestamps
    const existingAgent = this.agents.get(userAddress);

    const agent: Agent = {
      userAddress,
      permissionContext,
      strategies,
      isActive: true,
      createdAt: existingAgent ? existingAgent.createdAt : Math.floor(Date.now() / 1000),
      lastExecuted: existingAgent ? existingAgent.lastExecuted : 0, // Persist execution history
      executionInterval,
      email: email || existingAgent?.email, // Update email if provided, otherwise keep existing
    };

    this.agents.set(userAddress, agent);
    console.log(`Agent registered/updated: ${userAddress} with ${strategies.length} strategies. Email: ${agent.email || "None"}`);
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(userAddress: Address): void {
    this.agents.delete(userAddress);
    console.log(`Agent unregistered: ${userAddress}`);
  }

  /**
   * Get agent by address
   */
  getAgent(userAddress: Address): Agent | null {
    return this.agents.get(userAddress) || null;
  }

  /**
   * Get agent status (alias for getAgent for API compatibility)
   */
  getAgentStatus(userAddress: Address): (Agent & { strategies: StrategyConfig[] }) | null {
    const agent = this.getAgent(userAddress);
    if (!agent) return null;
    return {
      ...agent,
      strategies: agent.strategies,
    };
  }

  /**
   * Get all active agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values()).filter((a) => a.isActive);
  }

  /**
   * Execute strategies for a specific agent
   */
  async executeAgentStrategies(userAddress: Address): Promise<AgentExecutionResult[]> {
    const agent = this.agents.get(userAddress);
    if (!agent || !agent.isActive) {
      return [];
    }

    const results: AgentExecutionResult[] = [];




    const executedActions: any[] = [];
    const skippedActions: any[] = [];

    for (const strategyConfig of agent.strategies) {
      try {
        // Frequency Check for MARKET Strategy (Demo Safety)
        if (strategyConfig.strategy === "MARKET") {
          const now = Math.floor(Date.now() / 1000);
          const timeSinceLast = now - agent.lastExecuted;
          // Dynamic Frequency Check
          const interval = agent.executionInterval || 3600; // Default to 1 hour if not set
          if (timeSinceLast < interval && agent.lastExecuted !== 0) {
            // Skip silently or log debug
            // console.debug(`Skipping MARKET execution: timeSinceLast ${timeSinceLast}s < interval ${interval}s`);
            continue;
          }
        }

        const shouldExecute = await this.shouldExecuteStrategy(strategyConfig);

        if (shouldExecute) {
          // Execute trade
          const result = await executeTradeOnBehalfOfUser(
            userAddress,
            undefined,
            strategyConfig
          );

          agent.lastExecuted = Math.floor(Date.now() / 1000);

          results.push({
            agent: userAddress,
            strategy: strategyConfig.strategy,
            executed: true,
            txHash: result.txHash,
          });

          const executionDetails = `Strategy ${strategyConfig.strategy} executed at ${new Date().toISOString()}. Price: Market`;
          executedActions.push({ strategy: strategyConfig.strategy, txHash: result.txHash });

          // Fire-and-forget email notification
          // Use agent.email if available, otherwise fallback is handled by EmailService (via TO arg or internal logic)
          // We need to update EmailService signature or just pass it here. 
          // Current EmailService expects (to, strategy, txHash, details).
          // If agent.email is undefined, we pass empty string or let service handle default.
          const recipient = agent.email || process.env.ALERT_EMAIL || "";
          if (recipient) {
            emailService.sendTradeExecution(recipient, strategyConfig.strategy, result.txHash || "N/A", executionDetails)
              .catch(err => console.error("Failed to send trade email:", err));
          }

          console.log(`Strategy ${strategyConfig.strategy} executed for ${userAddress}: ${result.txHash}`);
        } else {
          const reason = "Strategy conditions not met (e.g. price target not reached)";
          results.push({
            agent: userAddress,
            strategy: strategyConfig.strategy,
            executed: false,
            reason: reason,
          });
          skippedActions.push({ strategy: strategyConfig.strategy, reason });
        }
      } catch (error) {
        console.error(`Error executing strategy ${strategyConfig.strategy}:`, error);
        // ... 
      }
    }

    // Send Hourly Status Report if configured
    if (executedActions.length > 0 || skippedActions.length > 0) {
      const recipient = agent.email || process.env.ALERT_EMAIL || "";
      if (recipient) {
        emailService.sendHourlyStatus(recipient, userAddress, executedActions, skippedActions)
          .catch(err => console.error("Failed to send hourly status email:", err));
      }
    }

    return results;

    return results;
  }

  /**
   * Check if a strategy should be executed
   */
  private async shouldExecuteStrategy(config: StrategyConfig): Promise<boolean> {
    const { strategy, params } = config;

    // Get current price
    const priceData = await getPrice("USDC");
    const currentPrice = priceData.price;

    // Update price history
    const tokenKey = `${config.tokenIn}-${config.tokenOut}`;
    const history = this.priceHistory.get(tokenKey) || [];
    history.push(currentPrice);
    if (history.length > 100) {
      history.shift(); // Keep last 100 prices
    }
    this.priceHistory.set(tokenKey, history);

    switch (strategy) {
      case TradingStrategy.MARKET:
        // DEMO HACK: Force MARKET strategy to execute only once per hour
        // ideally this should be configurable in StrategyConfig, but strictly for this demo we hardcode safety
        const lastExecuted = this.getAgent(config.tokenIn as Address)?.lastExecuted || 0; // This access is tricky context-wise, better to pass agent context
        // Actually, we need to pass 'agent' to shouldExecuteStrategy or check in the caller.
        // Let's return TRUE here but handle the check in executeAgentStrategies loop as planned.
        return true;

      case TradingStrategy.DCA:
        return await dcaStrategy.execute(config as any);

      case TradingStrategy.LIMIT_ORDER:
        return await limitOrderStrategy.shouldExecute(config as any, currentPrice);

      case TradingStrategy.STOP_LOSS:
        return await stopLossStrategy.shouldExecute(config as any, currentPrice);

      case TradingStrategy.GRID_TRADING:
        const grids = await gridTradingStrategy.getActiveGrids(config as any, currentPrice);
        return grids.length > 0;

      case TradingStrategy.MOMENTUM:
        const momentumResult = await momentumStrategy.shouldExecute(history);
        return momentumResult.execute;

      case TradingStrategy.MEAN_REVERSION:
        const meanReversionResult = await meanReversionStrategy.shouldExecute(history);
        return meanReversionResult.execute;

      default:
        return false;
    }
  }

  /**
   * Start automatic execution loop
   */
  startExecutionLoop(intervalSeconds: number = 60): void {
    if (this.executionInterval) {
      this.stopExecutionLoop();
    }

    console.log(`Starting agent execution loop (every ${intervalSeconds}s)`);

    this.executionInterval = setInterval(async () => {
      const agents = this.getAllAgents();
      console.log(`Executing strategies for ${agents.length} agents...`);

      for (const agent of agents) {
        try {
          await this.executeAgentStrategies(agent.userAddress);
        } catch (error) {
          console.error(`Error executing agent ${agent.userAddress}:`, error);
        }
      }
    }, intervalSeconds * 1000);
  }

  /**
   * Stop automatic execution loop
   */
  stopExecutionLoop(): void {
    if (this.executionInterval) {
      clearInterval(this.executionInterval);
      this.executionInterval = null;
      console.log("Stopped agent execution loop");
    }
  }

  /**
   * Execute all agents once (manual trigger)
   */
  async executeAllAgents(): Promise<AgentExecutionResult[]> {
    const agents = this.getAllAgents();
    const allResults: AgentExecutionResult[] = [];

    for (const agent of agents) {
      const results = await this.executeAgentStrategies(agent.userAddress);
      allResults.push(...results);
    }

    return allResults;
  }
}

export const agentOrchestrator = new AgentOrchestrator();

