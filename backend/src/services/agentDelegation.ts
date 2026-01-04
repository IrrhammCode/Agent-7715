/**
 * Agent-to-Agent Delegation (ERC-8004)
 * Enables agents to delegate permissions to other agents
 */

import type { Address } from "viem";
import { CONTRACTS } from "../config";

export interface DelegationConfig {
  delegatorAgent: Address; // Agent that grants permission
  delegateAgent: Address; // Agent that receives permission
  tokenAddress: Address;
  maxAmount: bigint; // Max amount delegate can spend
  maxAmountPerDay: bigint; // Daily limit
  targetContract: Address; // Contract delegate can interact with
  expiryTimestamp: number; // When delegation expires
}

export interface DelegationRecord {
  id: string;
  delegatorAgent: Address;
  delegateAgent: Address;
  tokenAddress: Address;
  maxAmount: bigint;
  maxAmountPerDay: bigint;
  usedAmount: bigint;
  usedAmountToday: bigint;
  targetContract: Address;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
  lastUsageDate?: Date;
}

// In-memory storage (in production, use database)
const delegations = new Map<string, DelegationRecord>();

/**
 * Create a delegation from one agent to another
 */
export function createDelegation(config: DelegationConfig): DelegationRecord {
  const delegationId = `${config.delegatorAgent}-${config.delegateAgent}-${Date.now()}`;

  const delegation: DelegationRecord = {
    id: delegationId,
    delegatorAgent: config.delegatorAgent,
    delegateAgent: config.delegateAgent,
    tokenAddress: config.tokenAddress,
    maxAmount: config.maxAmount,
    maxAmountPerDay: config.maxAmountPerDay,
    usedAmount: 0n,
    usedAmountToday: 0n,
    targetContract: config.targetContract,
    createdAt: new Date(),
    expiresAt: new Date(config.expiryTimestamp * 1000),
    isActive: true,
  };

  delegations.set(delegationId, delegation);

  return delegation;
}

/**
 * Get all delegations for an agent
 */
export function getDelegations(agentAddress: Address): {
  asDelegator: DelegationRecord[];
  asDelegate: DelegationRecord[];
} {
  const asDelegator: DelegationRecord[] = [];
  const asDelegate: DelegationRecord[] = [];

  delegations.forEach((delegation) => {
    if (delegation.delegatorAgent.toLowerCase() === agentAddress.toLowerCase()) {
      asDelegator.push(delegation);
    }
    if (delegation.delegateAgent.toLowerCase() === agentAddress.toLowerCase()) {
      asDelegate.push(delegation);
    }
  });

  return { asDelegator, asDelegate };
}

/**
 * Check if delegation is valid and has sufficient allowance
 */
export function canDelegateExecute(
  delegationId: string,
  amount: bigint
): { canExecute: boolean; reason?: string } {
  const delegation = delegations.get(delegationId);

  if (!delegation) {
    return { canExecute: false, reason: "Delegation not found" };
  }

  if (!delegation.isActive) {
    return { canExecute: false, reason: "Delegation is not active" };
  }

  if (new Date() > delegation.expiresAt) {
    delegation.isActive = false;
    return { canExecute: false, reason: "Delegation has expired" };
  }

  // Check total amount limit
  if (delegation.usedAmount + amount > delegation.maxAmount) {
    return { canExecute: false, reason: "Exceeds total delegation limit" };
  }

  // Check daily limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Check daily limit reset
  const lastUsage = delegation.lastUsageDate || delegation.createdAt;
  const lastUsageDate = new Date(lastUsage);
  lastUsageDate.setHours(0, 0, 0, 0);

  if (today > lastUsageDate) {
    delegation.usedAmountToday = 0n;
  }

  if (delegation.usedAmountToday + amount > delegation.maxAmountPerDay) {
    return { canExecute: false, reason: "Exceeds daily delegation limit" };
  }

  return { canExecute: true };
}

/**
 * Record delegation usage
 */
export function recordDelegationUsage(delegationId: string, amount: bigint): void {
  const delegation = delegations.get(delegationId);

  if (!delegation) {
    throw new Error("Delegation not found");
  }

  delegation.usedAmount += amount;
  delegation.usedAmount += amount;
  delegation.usedAmountToday += amount;
  delegation.lastUsageDate = new Date();
}

/**
 * Revoke a delegation
 */
export function revokeDelegation(delegationId: string): boolean {
  const delegation = delegations.get(delegationId);

  if (!delegation) {
    return false;
  }

  delegation.isActive = false;
  return true;
}

/**
 * Get delegation statistics
 */
export function getDelegationStats(agentAddress: Address): {
  totalDelegated: bigint;
  totalReceived: bigint;
  activeDelegations: number;
  totalDelegations: number;
} {
  const { asDelegator, asDelegate } = getDelegations(agentAddress);

  const totalDelegated = asDelegator.reduce(
    (sum, d) => sum + d.maxAmount,
    0n
  );

  const totalReceived = asDelegate.reduce(
    (sum, d) => sum + d.maxAmount,
    0n
  );

  const activeDelegations = [...asDelegator, ...asDelegate].filter((d) => d.isActive).length;

  return {
    totalDelegated,
    totalReceived,
    activeDelegations,
    totalDelegations: asDelegator.length + asDelegate.length,
  };
}

