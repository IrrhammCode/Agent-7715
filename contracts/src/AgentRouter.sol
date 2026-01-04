// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AgentRouter {
    using SafeERC20 for IERC20;

    // Event emitted when a swap is executed
    event AgentSwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp
    );

    // Mapping from token address to exchange rate
    // Exchange rate: 1 USDC = rate units of token (scaled by decimals)
    mapping(address => uint256) public exchangeRates;

    // USDC has 6 decimals, output tokens have 18 decimals
    // Exchange rate calculation: amountOut = (amountIn * EXCHANGE_RATE) / 1e6 * 1e18 / 1e6
    // Simplified: amountOut = amountIn * EXCHANGE_RATE * 1e12
    
    // Default exchange rates (1 USDC = rate units of token)
    // These are fallback rates - in production, use Uniswap V2 for real prices
    // 1 USDC = 0.0001 BRETT (10000 units) - fallback only
    uint256 private constant DEFAULT_RATE_BRETT = 10000;
    
    constructor() {
        // Exchange rates will be set after deployment via setExchangeRate
        // For now, we'll use a default mechanism
    }
    
    /**
     * @dev Set exchange rate for a token (only owner in production)
     * @param token Address of the token
     * @param rate Exchange rate (1 USDC = rate units of token)
     */
    function setExchangeRate(address token, uint256 rate) external {
        // In production, add onlyOwner modifier
        exchangeRates[token] = rate;
    }

    /**
     * @dev Execute a swap from tokenIn to tokenOut
     * @param tokenIn Address of the input token (USDC on Base Mainnet)
     * @param tokenOut Address of the output token (WETH, BRETT, AERO, DEGEN, etc. on Base Mainnet)
     * @param amountIn Amount of tokenIn to swap
     * @param recipient Address to receive the tokenOut
     * @notice In production, this should use Uniswap V2 Router for real swaps
     */
    function executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address recipient
    ) external {
        require(amountIn > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");

        // Transfer tokenIn from the caller (user) to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Get exchange rate based on tokenOut
        uint256 exchangeRate = getExchangeRateForToken(tokenOut);
        
        // Calculate amountOut based on exchange rate
        // For USDC (6 decimals) to output token (18 decimals)
        // amountOut = amountIn * EXCHANGE_RATE * 1e12
        // Note: In production, use Uniswap V2 Router for real price quotes
        uint256 amountOut = (amountIn * exchangeRate * 1e12) / 1e6;

        // Ensure the contract has enough tokenOut to fulfill the swap
        require(
            IERC20(tokenOut).balanceOf(address(this)) >= amountOut,
            "Insufficient liquidity"
        );

        // Transfer tokenOut to the recipient
        IERC20(tokenOut).safeTransfer(recipient, amountOut);

        // Emit event for Envio indexing
        emit AgentSwapExecuted(
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            block.timestamp
        );
    }

    /**
     * @dev Allow the contract to receive tokens (for initial liquidity setup)
     */
    function depositTokens(address token, uint256 amount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @dev Get exchange rate for a specific token
     * @param tokenOut Address of the output token
     * @return Exchange rate (scaled)
     */
    function getExchangeRateForToken(address tokenOut) internal view returns (uint256) {
        // Check if rate is set in mapping
        if (exchangeRates[tokenOut] > 0) {
            return exchangeRates[tokenOut];
        }
        
        // Default to BRETT rate if not set
        // In production, you'd fetch from oracle or revert if not set
        return DEFAULT_RATE_BRETT;
    }
    
    /**
     * @dev Get the current exchange rate (legacy function for backward compatibility)
     * @return Exchange rate for BRETT
     */
    function getExchangeRate() external pure returns (uint256) {
        return DEFAULT_RATE_BRETT;
    }
    
    /**
     * @dev Get exchange rate for a specific token (public function)
     * @param tokenOut Address of the output token
     * @return Exchange rate (scaled)
     */
    function getTokenExchangeRate(address tokenOut) external view returns (uint256) {
        return getExchangeRateForToken(tokenOut);
    }
}

