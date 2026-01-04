
# 🤖 Agent-7715: The Autonomous DeFi Portfolio Manager

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Network](https://img.shields.io/badge/network-Ethereum%20Sepolia-grey)
![Architecture](https://img.shields.io/badge/architecture-Agentic-purple)
![Track](https://img.shields.io/badge/Track-Best%20Use%20of%20Envio-green)

**Agent-7715** is a next-generation "Set & Forget" DeFi Agent built for the **MetaMask Developer Hackathon**. 
It harnesses the power of **ERC-7715 (Advanced Permissions)** to solve the biggest UX bottleneck in Web3: **The "Approve & Sign" Fatigue.**

> **The Vision:** Shift DeFi from *"User manually executing every trade"* to *"User setting policy, Agent executing strategy."*

---

## Advanced Permissions Usage
Since the Hackathon is focused on the Advanced Permissions, here are the links for the code usage:

We have implemented a **full-stack permissioning system** that handles Configuration, Requesting, Storing, Executing, and Visualizing permissions.

*   **1. Configuration & Simplification (UX):**
    *   [frontend/src/components/configure/PermissionTemplates.tsx](frontend/src/components/configure/PermissionTemplates.tsx) - We simplify complex ERC-7715 parameters into **User Personas** (e.g., "Conservative Saver", "Aggressive Trader"), making Advanced Permissions accessible to non-technical users.
    *   [frontend/src/components/configure/PermissionSliders.tsx](frontend/src/components/configure/PermissionSliders.tsx) - UI component where users define the **granular parameters** (Daily Budget, Frequency) for the permission they are about to grant.

*   **2. Requesting Permissions (Frontend):**
    *   [frontend/src/hooks/useActivateAgent.ts (L131-152)](frontend/src/hooks/useActivateAgent.ts#L131-L152) - Calling `walletClient.requestExecutionPermissions` with the `erc20-token-periodic` policy and user-defined parameters.

*   **3. Storing Context (Backend):**
    *   [backend/src/routes/agent.ts (L130-246)](backend/src/routes/agent.ts#L130-L246) - The API endpoint `/register-agent` receives the signed `permissionContext` from the frontend and stores it (along with the Session Key address) to link the User to the Agent.

*   **4. Redeeming Permissions (Backend Execution):**
    *   [backend/src/services/executionEngine.ts (L106-198)](backend/src/services/executionEngine.ts#L106-L198) - The core engine that runs on a cron job. It reconstructs the **Session Account** from the private key and executes the trade using `sendTransaction`. The blockchain validates the transaction against the stored Permission Policy.

*   **5. Agent-to-Agent Delegation (Future-Proofing):**
    *   [backend/src/services/agentDelegation.ts](backend/src/services/agentDelegation.ts) - We implemented logic for **Chain of Command Delegation** (inspired by ERC-8004), allowing one Agent to delegate sub-permissions to another specialized Agent (e.g., "Portfolio Manager" delegates to "Sniper Bot"). 
    *   See `canDelegateExecute` (L89) which enforces expiry and allowance checks off-chain before submission.

*   **6. Visualizing Health (Analytics):**
    *   [frontend/src/components/dashboard/PermissionHealthCard.tsx](frontend/src/components/dashboard/PermissionHealthCard.tsx) - A creative component that tracks valid permission usage (e.g., "70% of Daily Limit Used", "Resets in 4 hours"), giving users real-time transparency into their agent's autonomy.

*   **7. Emergency Revocation (Safety):**
    *   [frontend/src/components/dashboard/EmergencyStopButton.tsx](frontend/src/components/dashboard/EmergencyStopButton.tsx) - Users retain full control. This component allows them to instantly **Revoke** the permission (by setting allowance to 0 or invalidating the session) if the agent misbehaves.

*   **8. Transparent Reporting (Notifications):**
    *   [backend/src/services/emailService.ts (L128)](backend/src/services/emailService.ts#L128) - The agent acts as a fiduciary. After every autonomous trade, it sends a signed email receipt, ensuring the user is always informed of *how* their permission was used.

## Envio Usage
We are applying for the Envio track. Here is how we are using Envio:

We leverage **Envio HyperSync** throughout the entire stack to ensure our Autonomous Agent has instantaneous awareness of on-chain state without relying on slow RPC polling.

*   **1. Data Model Definition:**
    *   [envio/schema.graphql](envio/schema.graphql) - Defines the `UserTrade` and `TotalVolume` entities optimized for analytics queries.

*   **2. Multi-Chain Indexing Logic:**
    *   [envio/config.yaml](envio/config.yaml) - Configuration for indexing `AgentSwapExecuted` events across **multiple chains** (Sepolia, Arbitrum, Base) simultaneously.
    *   [envio/src/AgentRouter.ts](envio/src/AgentRouter.ts) - The logic that maps raw blockchain events to our Schema entities.

*   **3. Serverless API (Frontend-Facing):**
    *   [frontend/src/app/api/analytics/route.ts](frontend/src/app/api/analytics/route.ts) - A **Next.js API Route** that uses the `@envio-dev/hypersync-client` (Node.js) to query public HyperSync logs. This powers the user dashboard with <100ms latency updates.

*   **4. Backend Verification Service (Circuit-Breaker):**
    *   [backend/src/services/envioService.ts](backend/src/services/envioService.ts) - A robust backend service that uses HyperSync to **Verify** trades independently of the frontend. It implements a Circuit Breaker pattern to toggle between HyperSync (Primary) and RPC (Fallback) to ensure 100% uptime.

*   **5. Analytics Visualization:**
    *   [frontend/src/components/analytics/AnalyticsDashboard.tsx](frontend/src/components/analytics/AnalyticsDashboard.tsx) - Frontend component that transforms raw HyperSync data into actionable insights (PnL, Win Rate, Profit Factor) for the user.

## Feedback
We are applying for the Feedback track. We extensively used the new **MetaMask Smart Accounts Kit** and have documented our experience, bottlenecks, and feature requests.
*   [HACKATHON_FEEDBACK.md](HACKATHON_FEEDBACK.md) - Detailed feedback on ERC-7715 integration, Permission Context serialization, and Documentation gaps.

## Social Media
We are applying for "Best Social Media Presence on X". We documented the journey of building Agent-7715 publicly to inspire other devs.

*   **Social Media Link:** [Building Agent-7715 Thread](https://x.com/BabyBoomWeb3/status/2007059992822886649?s=20) (Tag: @MetaMaskDev)

**Showcase Description:**
Our thread demonstrates how MetaMask Advanced Permissions transformed the UX from "manual daily signing" to "set once, run forever". We highlight the challenges of current DeFi UX and how ERC-7715 solves them, engaging with the developer community to adopt this new standard.

---

## 🚀 Key Features

### 1. 🧠 Autonomous Execution Engine
A robust Node.js backend that runs on a configurable cron (e.g., every 60s). It uses **Viem** to interact with the blockchain using the delegated Session Key.

### 2. 🛡️ Smart Resilience (The "Testnet Fallback")
DeFi infrastructure on Testnets (Sepolia) is notoriously unstable. 
*   **Primary Strategy**: The Agent attempts to swap tokens on Uniswap V3.
*   **Fallback Strategy**: If liquidity is dry or the router reverts, the Agent **automatically switches** to "Direct Transfer Mode" to ensure the *permissioning system* is still verified.

### 3. 📊 Real-Time Indexing
Powered by **Envio HyperSync**, the dashboard is always up to date with on-chain events, removing the need for slow RPC calls.

### 4. 🔔 Multi-Channel Notifications
Transparency is key for autonomous agents.
*   **Frontend**: Live "Trade History" updates.
*   **Email**: The Agent sends an SMTP email immediately after a successful execution.

---

## 🛠️ Technology Stack

| Component | Tech | Role |
| :--- | :--- | :--- |
| **Permissions** | **ERC-7715** | Powered by **MetaMask Smart Accounts Kit** (Experimental). |
| **Frontend** | Next.js 14, Tailwind | User Dashboard for Policy Management. |
| **Backend** | Node.js (TypeScript) | The "Brain" that manages cron jobs and signing. |
| **Blockchain** | **Ethereum Sepolia** | Live Testnet deployment. |
| **Data Layer** | **Envio HyperSync** | Instant event indexing. |

---

## 📦 Installation & Setup

### 1. Prerequisites
*   Node.js v18+
*   MetaMask (Flask recommended for latest EIP features)
*   **Sepolia ETH** (Usage: Gas for Agent)

### 2. Environment Variables
Create `.env` files in both `frontend/` and `backend/`.

**Backend (`backend/.env`):**
```env
RPC_URL=https://ethereum-sepolia.publicnode.com
AGENT_PRIVATE_KEY=<YOUR_AGENT_WALLET_PRIVATE_KEY>
# Addresses
AGENT_ROUTER_ADDRESS=0x690ab1758ae6c99857a3241d18da0ffdd6c7c7ae
USDC_ADDRESS=0xc970a9C00AEAf314523B9B289F6644CcCbfE6930
# Services
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

**Frontend (`frontend/.env`):**
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
NEXT_PUBLIC_AGENT_ADDRESS=<ADDRESS_OF_AGENT_PRIVATE_KEY>
NEXT_PUBLIC_USDC_ADDRESS=0xc970a9C00AEAf314523B9B289F6644CcCbfE6930
```

### 3. Run the Project
We run backend and frontend concurrently.

**Terminal 1 (Backend):**
```bash
cd backend
npm install
npm run dev
# Server starts on port 3001
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm install
npm run dev
# App opens at http://localhost:3000
```
