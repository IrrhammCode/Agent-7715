import { GraphQLClient } from 'graphql-request';

// Default to local Envio indexer, but allow override via env var
const ENVIO_API_URL = process.env.NEXT_PUBLIC_ENVIO_API_URL || 'http://localhost:8080/v1/graphql';

export const envioClient = new GraphQLClient(ENVIO_API_URL);

export const RECENT_TRADES_QUERY = `
  query GetRecentTrades($limit: Int = 10) {
    UserTrade(limit: $limit, order_by: { timestamp: desc }) {
      id
      user
      tokenIn
      tokenOut
      amountIn
      amountOut
      timestamp
      transactionHash
    }
  }
`;

export const USER_TRADES_QUERY = `
  query GetUserTrades($user: String!, $limit: Int = 50) {
    UserTrade(
      where: { user: { _eq: $user } }, 
      limit: $limit, 
      order_by: { timestamp: desc }
    ) {
      id
      user
      tokenIn
      tokenOut
      amountIn
      amountOut
      timestamp
      transactionHash
    }
  }
`;

export const TOTAL_VOLUME_QUERY = `
  query GetTotalVolume {
    TotalVolume(id: "TOTAL") {
      totalAmountIn
      totalAmountOut
      totalTrades
    }
  }
`;

export interface Trade {
    id: string;
    user: string;
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    amountOut: string;
    timestamp: string;
    transactionHash: string;
}
