import { Router, Request, Response } from "express";
import { demoService } from "../services/demoService";
import { portfolioManager } from "../services/portfolioManager";

const router = Router();

/**
 * GET /api/demo/status
 * Get current demo mode status
 */
router.get("/status", (req: Request, res: Response) => {
    res.json({
        isDemoMode: demoService.isDemoMode,
        priceOverrides: demoService.getAllPriceOverrides(),
        mockBalances: {
            ETH: demoService.getMockBalance("ETH"),
            USDC: demoService.getMockBalance("USDC"),
        }
    });
});

/**
 * POST /api/demo/toggle
 * Toggle Demo Mode on/off
 */
router.post("/toggle", (req: Request, res: Response) => {
    const { enabled } = req.body;

    if (typeof enabled !== "boolean") {
        return res.status(400).json({ error: "enabled (boolean) is required" });
    }

    demoService.setDemoMode(enabled);

    res.json({
        success: true,
        isDemoMode: demoService.isDemoMode,
        message: enabled ? "Demo Mode ENABLED (God Mode)" : "Demo Mode DISABLED"
    });
});

/**
 * POST /api/demo/price
 * Set price override for a token
 */
router.post("/price", (req: Request, res: Response) => {
    const { token, price } = req.body;

    if (!token || typeof price !== "number") {
        return res.status(400).json({ error: "token (string) and price (number) are required" });
    }

    demoService.setPriceOverride(token, price);

    res.json({
        success: true,
        token: token.toUpperCase(),
        price: price,
        message: `Price override set: ${token.toUpperCase()} = $${price}`
    });
});

import { agentOrchestrator } from "../services/agentOrchestrator";

/**
 * POST /api/demo/crash
 * Simulate market crash (-10%) and TRIGGER AGENTS
 */
router.post("/crash", async (req: Request, res: Response) => {
    if (!demoService.isDemoMode) {
        return res.status(400).json({ error: "Demo Mode must be enabled first" });
    }

    // Crash ETH and WETH
    demoService.setPriceOverride("ETH", 2250); // -10% from 2500
    demoService.setPriceOverride("WETH", 2250);

    // Trigger immediate execution
    setTimeout(() => agentOrchestrator.executeAllAgents(), 100);

    res.json({ success: true, message: "Market Crashed! ETH = $2250. Agents triggered." });
});

/**
 * POST /api/demo/pump
 * Simulate market pump (+10%) and TRIGGER AGENTS
 */
router.post("/pump", async (req: Request, res: Response) => {
    if (!demoService.isDemoMode) {
        return res.status(400).json({ error: "Demo Mode must be enabled first" });
    }

    // Pump ETH and WETH
    demoService.setPriceOverride("ETH", 2750); // +10% from 2500
    demoService.setPriceOverride("WETH", 2750);

    // Trigger immediate execution
    setTimeout(() => agentOrchestrator.executeAllAgents(), 100);

    res.json({ success: true, message: "Market Pumped! ETH = $2750. Agents triggered." });
});

export default router;
