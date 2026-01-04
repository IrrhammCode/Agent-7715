/**
 * Price Service
 * Fetches real-time prices from multiple sources with rate limiting and caching
 */

import type { Address } from "viem";
import { publicClient } from "../config";
import { demoService } from "./demoService";

interface PriceData {
  price: number;
  timestamp: number;
  source: string;
  change24h?: number;
  volume24h?: number;
}

interface CoinGeckoPrice {
  [key: string]: {
    usd: number;
    usd_24h_change?: number;
    usd_24h_vol?: number;
  };
}

// Cache untuk price data (60 detik cache)
interface CachedPrice {
  data: PriceData;
  expiresAt: number;
}

const priceCache = new Map<string, CachedPrice>();
const CACHE_DURATION = 60 * 1000; // 60 detik cache

// Rate limiting
let lastApiCallTime = 0;
const MIN_API_INTERVAL = 2000; // Max 30 calls/minute

/**
 * Get price from CoinGecko API with caching and rate limiting
 */
export async function getPriceFromCoinGecko(
  tokenId: string
): Promise<PriceData | null> {
  const cached = priceCache.get(tokenId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const now = Date.now();
  const timeSinceLastCall = now - lastApiCallTime;
  if (timeSinceLastCall < MIN_API_INTERVAL) {
    const waitTime = MIN_API_INTERVAL - timeSinceLastCall;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  try {
    const apiKey = process.env.COINGECKO_API_KEY;
    const apiKeyParam = apiKey ? `&x_cg_demo_api_key=${apiKey}` : '';

    lastApiCallTime = Date.now();

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${tokenId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true${apiKeyParam}`
    );

    if (response.status === 429) {
      console.warn("CoinGecko rate limit hit, using cached/fallback price");
      if (cached) return cached.data;
      return null;
    }

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.statusText}`);
    }

    const data: CoinGeckoPrice = (await response.json()) as CoinGeckoPrice;
    const tokenData = data[tokenId];

    if (!tokenData) return null;

    const priceData: PriceData = {
      price: tokenData.usd,
      timestamp: Math.floor(Date.now() / 1000),
      source: "CoinGecko",
      change24h: tokenData.usd_24h_change,
      volume24h: tokenData.usd_24h_vol,
    };

    priceCache.set(tokenId, {
      data: priceData,
      expiresAt: Date.now() + CACHE_DURATION,
    });

    return priceData;
  } catch (error) {
    console.error("Error fetching price from CoinGecko:", error);
    if (cached) return cached.data;
    return null;
  }
}

// Add mapping for CoinGecko IDs
export function getTokenId(symbol: string): string {
  const map: Record<string, string> = {
    'BRETT': 'ethereum', // Map legacy BRETT to ETH for consistency
    'ARB': 'arbitrum',
    'WETH': 'ethereum',
    'USDC': 'usd-coin',
    'ETH': 'ethereum',
    'AERO': 'aerodrome-finance',
    'DEGEN': 'degen-base'
  };
  return map[symbol.toUpperCase()] || symbol.toLowerCase();
}

/**
 * Get fallback price (used when CoinGecko API is unavailable)
 */
function getFallbackPrice(tokenSymbol: string): number {
  const fallbackPrices: Record<string, number> = {
    ETH: 3000,
    BTC: 60000,
    USDC: 1,
    USDT: 1,
    BRETT: 3000, // Updated to match ETH
    ARB: 1.50,
    AERO: 0.5,
    DEGEN: 0.001,
    WETH: 3000,
  };

  return fallbackPrices[tokenSymbol.toUpperCase()] || 1;
}

/**
 * Get price with fallback chain
 */
export async function getPrice(
  tokenSymbol: string,
  tokenId?: string
): Promise<PriceData> {
  // Check Demo Mode Overrides first
  const DEMO_ADDRESS = "0xc970a9C00AEAf314523B9B289F6644CcCbfE6930";
  if (tokenSymbol.toUpperCase() === "DEMO" || tokenId?.toLowerCase() === DEMO_ADDRESS.toLowerCase()) {
    return {
      price: 1.0, // Fixed $1.00 for Demo Coin
      timestamp: Math.floor(Date.now() / 1000),
      source: "Demo Mode (Fixed)",
      change24h: 0,
      volume24h: 0,
    };
  }

  if (demoService.isDemoMode) {
    const override = demoService.getPriceOverride(tokenSymbol);
    if (override !== undefined) {
      return {
        price: override,
        timestamp: Math.floor(Date.now() / 1000),
        source: "Demo Mode (God Mode)",
        change24h: 0,
        volume24h: 0,
      };
    }
  }

  // Resolve correct CoinGecko ID if not provided or if symbol needs mapping
  const resolvedId = tokenId || getTokenId(tokenSymbol);

  // Try CoinGecko first
  if (resolvedId) {
    const coinGeckoPrice = await getPriceFromCoinGecko(resolvedId);
    if (coinGeckoPrice) {
      return coinGeckoPrice;
    }
  }

  // Fallback to cached price (used when CoinGecko API fails)
  return {
    price: getFallbackPrice(tokenSymbol),
    timestamp: Math.floor(Date.now() / 1000),
    source: "Fallback",
  };
}

/**
 * Get multiple token prices at once (optimized with batch request)
 */
export async function getMultiplePrices(
  tokens: Array<{ symbol: string; id?: string }>
): Promise<Record<string, PriceData>> {
  const prices: Record<string, PriceData> = {};

  const coinGeckoTokens = tokens.filter(t => t.id);
  const otherTokens = tokens.filter(t => !t.id);

  if (coinGeckoTokens.length > 0) {
    try {
      const tokenIds = coinGeckoTokens.map(t => t.id!).join(',');
      const cached = priceCache.get(`batch_${tokenIds}`);

      if (cached && cached.expiresAt > Date.now()) {
        coinGeckoTokens.forEach(token => {
          if (token.id) {
            const batchData = cached.data as any;
            if (batchData[token.id]) {
              prices[token.symbol] = batchData[token.id];
            }
          }
        });
      } else {
        const now = Date.now();
        const timeSinceLastCall = now - lastApiCallTime;
        if (timeSinceLastCall < MIN_API_INTERVAL) {
          await new Promise(resolve => setTimeout(resolve, MIN_API_INTERVAL - timeSinceLastCall));
        }

        const apiKey = process.env.COINGECKO_API_KEY;
        const apiKeyParam = apiKey ? `&x_cg_demo_api_key=${apiKey}` : '';
        lastApiCallTime = Date.now();

        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${tokenIds}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true${apiKeyParam}`
        );

        if (response.ok && response.status !== 429) {
          const data: CoinGeckoPrice = (await response.json()) as CoinGeckoPrice;
          coinGeckoTokens.forEach(token => {
            if (token.id && data[token.id]) {
              const tokenData = data[token.id];
              prices[token.symbol] = {
                price: tokenData.usd,
                timestamp: Math.floor(Date.now() / 1000),
                source: "CoinGecko",
                change24h: tokenData.usd_24h_change,
                volume24h: tokenData.usd_24h_vol,
              };
              priceCache.set(token.id, {
                data: prices[token.symbol],
                expiresAt: Date.now() + CACHE_DURATION,
              });
            }
          });
        }
      }
    } catch (error) {
      console.error("Error fetching batch prices from CoinGecko:", error);
    }
  }

  await Promise.all(
    otherTokens.map(async (token) => {
      if (!prices[token.symbol]) {
        const price = await getPrice(token.symbol, token.id);
        prices[token.symbol] = price;
      }
    })
  );

  return prices;
}

const historyCache = new Map<string, { data: Array<{ timestamp: number; price: number }>; expiresAt: number }>();
const HISTORY_CACHE_DURATION = 5 * 60 * 1000;

export async function getPriceHistory(
  tokenId: string,
  days: number = 7
): Promise<Array<{ timestamp: number; price: number }>> {
  const cacheKey = `${tokenId}_${days}`;
  const cached = historyCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const now = Date.now();
    const timeSinceLastCall = now - lastApiCallTime;
    if (timeSinceLastCall < MIN_API_INTERVAL) {
      const waitTime = MIN_API_INTERVAL - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const apiKey = process.env.COINGECKO_API_KEY;
    const apiKeyParam = apiKey ? `&x_cg_demo_api_key=${apiKey}` : '';
    lastApiCallTime = Date.now();

    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${tokenId}/market_chart?vs_currency=usd&days=${days}${apiKeyParam}`
    );

    if (response.status === 429) {
      if (cached) return cached.data;
      return [];
    }
    if (!response.ok) throw new Error(`CoinGecko API error: ${response.statusText}`);

    const data = await response.json() as { prices: [number, number][] };
    const history = data.prices.map(([timestamp, price]: [number, number]) => ({
      timestamp: Math.floor(timestamp / 1000),
      price,
    }));

    historyCache.set(cacheKey, {
      data: history,
      expiresAt: Date.now() + HISTORY_CACHE_DURATION,
    });

    return history;
  } catch (error) {
    if (cached) return cached.data;
    return [];
  }
}
