// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// Minimal Uniswap V3 SwapRouter interface
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}

/**
 * @title AgentRouterV3
 * @dev Production-grade router for delegated agents to execute swaps via Uniswap V3
 * @notice Compatible with MetaMask Smart Accounts Kit (ERC-7715)
 * Features: Ownership control, emergency pause, slippage protection, dynamic fee tiers
 */
contract AgentRouter is Ownable, Pausable {
    using SafeERC20 for IERC20;

    ISwapRouter public immutable swapRouter;
    
    // Default fee tier for Uniswap V3 (0.3%)
    uint24 public constant DEFAULT_FEE_TIER = 3000;
    
    // Maximum allowed slippage: 5% (500 basis points)
    uint256 public constant MAX_SLIPPAGE_BPS = 500;

    event SwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint24 feeTier
    );
    
    event TokensRescued(
        address indexed token,
        address indexed to,
        uint256 amount
    );

    constructor(address _swapRouter) Ownable(msg.sender) {
        require(_swapRouter != address(0), "Invalid router address");
        swapRouter = ISwapRouter(_swapRouter);
    }

    /**
     * @notice Executes a swap from tokenIn to tokenOut using Uniswap V3
     * @dev Assumes tokens have been approved or transferred to this contract
     * @param tokenIn Address of the input token
     * @param tokenOut Address of the output token
     * @param amountIn Amount of input tokens to swap
     * @param recipient Address to receive the swapped tokens (usually the user)
     * @return amountOut Amount of tokens received from the swap
     */
    function executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address recipient
    ) external whenNotPaused returns (uint256 amountOut) {
        return _executeSwapWithParams(tokenIn, tokenOut, amountIn, recipient, DEFAULT_FEE_TIER, 0);
    }
    
    /**
     * @notice Executes a swap with custom fee tier and slippage protection
     * @param tokenIn Address of the input token
     * @param tokenOut Address of the output token
     * @param amountIn Amount of input tokens to swap
     * @param recipient Address to receive the swapped tokens
     * @param feeTier Uniswap V3 pool fee tier (500 = 0.05%, 3000 = 0.3%, 10000 = 1%)
     * @param minAmountOut Minimum amount of output tokens (slippage protection)
     * @return amountOut Amount of tokens received from the swap
     */
    function executeSwapWithParams(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address recipient,
        uint24 feeTier,
        uint256 minAmountOut
    ) external whenNotPaused returns (uint256 amountOut) {
        require(
            feeTier == 500 || feeTier == 3000 || feeTier == 10000,
            "Invalid fee tier"
        );
        return _executeSwapWithParams(tokenIn, tokenOut, amountIn, recipient, feeTier, minAmountOut);
    }
    
    /**
     * @dev Internal swap execution logic
     */
    function _executeSwapWithParams(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        address recipient,
        uint24 feeTier,
        uint256 minAmountOut
    ) internal returns (uint256 amountOut) {
        require(tokenIn != address(0) && tokenOut != address(0), "Invalid token addresses");
        require(amountIn > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");
        
        // 1. Pull tokens from msg.sender (user or delegated caller)
        uint256 balanceBefore = IERC20(tokenIn).balanceOf(address(this));
        if (balanceBefore < amountIn) {
             IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        }

        // 2. Approve SwapRouter
        IERC20(tokenIn).forceApprove(address(swapRouter), amountIn);

        // 3. Prepare parameters for Uniswap V3 ExactInputSingle
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            fee: feeTier,
            recipient: recipient,
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: minAmountOut,
            sqrtPriceLimitX96: 0
        });

        // 4. Execute Swap
        amountOut = swapRouter.exactInputSingle(params);
        
        require(amountOut >= minAmountOut, "Slippage exceeded");
        
        emit SwapExecuted(recipient, tokenIn, tokenOut, amountIn, amountOut, feeTier);
    }
    
    /**
     * @notice Emergency pause functionality
     * @dev Only owner can pause/unpause
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Rescue stuck tokens (safety mechanism)
     * @dev Only owner can rescue tokens
     * @param token Address of the token to rescue
     * @param to Address to send the rescued tokens
     */
    function rescueTokens(address token, address to) external onlyOwner {
       require(to != address(0), "Invalid recipient");
       uint256 bal = IERC20(token).balanceOf(address(this));
       require(bal > 0, "No tokens to rescue");
       
       IERC20(token).safeTransfer(to, bal);
       
       emit TokensRescued(token, to, bal);
    }
}
