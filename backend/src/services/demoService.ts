/**
 * Demo Service
 * Manages "God Mode" / "Demo Mode" state for the application.
 * Allows simulating market conditions, mock balances, and instant execution.
 */

export class DemoService {
    private _isDemoMode: boolean = process.env.DEMO_MODE === "true";
    private _priceOverrides: Map<string, number> = new Map();

    // Mock "Whale" balances for Demo Mode
    private _mockBalances: Record<string, string> = {
        // Large amount to prevent "insufficient funds" during demo
        "USDC": "10000.00",
        "ETH": "10.00",
        "WETH": "5.00"
    };

    get isDemoMode(): boolean {
        return this._isDemoMode;
    }

    setDemoMode(enabled: boolean): void {
        this._isDemoMode = enabled;
        console.log(`[DEMO SERVICE] Demo Mode set to: ${enabled}`);

        if (!enabled) {
            // Clear overrides when disabling demo mode
            this._priceOverrides.clear();
        }
    }

    // Price Overrides
    setPriceOverride(tokenSymbol: string, price: number): void {
        if (!this._isDemoMode) return;
        this._priceOverrides.set(tokenSymbol.toUpperCase(), price);
        console.log(`[DEMO SERVICE] Price override set: ${tokenSymbol} = $${price}`);
    }

    getPriceOverride(tokenSymbol: string): number | undefined {
        if (!this._isDemoMode) return undefined;
        return this._priceOverrides.get(tokenSymbol.toUpperCase());
    }

    getAllPriceOverrides(): Record<string, number> {
        const obj: Record<string, number> = {};
        this._priceOverrides.forEach((value, key) => {
            obj[key] = value;
        });
        return obj;
    }

    clearPriceOverride(tokenSymbol: string): void {
        this._priceOverrides.delete(tokenSymbol.toUpperCase());
    }

    // Mock Balances
    getMockBalance(tokenSymbol: string): string {
        return this._mockBalances[tokenSymbol.toUpperCase()] || "0";
    }
}

export const demoService = new DemoService();
