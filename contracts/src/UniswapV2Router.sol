// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title UniswapV2Router Integration
 * @notice Wrapper contract for Uniswap V2 Router on Base Sepolia
 * This contract integrates with Uniswap V2 Router to execute real swaps
 */
interface IUniswapV2Router02 {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function getAmountsOut(uint amountIn, address[] calldata path)
        external view returns (uint[] memory amounts);

    function WETH() external pure returns (address);
}

interface IUniswapV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

contract UniswapV2Router {
    using SafeERC20 for IERC20;

    // Uniswap V2 Router address on Base Sepolia
    // Update this with actual Uniswap V2 Router address on Base Sepolia
    address public constant UNISWAP_V2_ROUTER = 0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24; // Base Sepolia Uniswap V2 Router
    address public constant UNISWAP_V2_FACTORY = 0x8909dc15e40173cF4699343B6Eb8132ce26518EF; // Base Sepolia Uniswap V2 Factory

    IUniswapV2Router02 public immutable router;
    IUniswapV2Factory public immutable factory;

    // Event emitted when a swap is executed
    event AgentSwapExecuted(
        address indexed user,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 timestamp,
        string dex
    );

    constructor() {
        router = IUniswapV2Router02(UNISWAP_V2_ROUTER);
        factory = IUniswapV2Factory(UNISWAP_V2_FACTORY);
    }

    /**
     * @dev Execute a swap using Uniswap V2
     * @param tokenIn Address of the input token
     * @param tokenOut Address of the output token
     * @param amountIn Amount of tokenIn to swap
     * @param amountOutMin Minimum amount of tokenOut to receive (slippage protection)
     * @param recipient Address to receive the tokenOut
     */
    function executeSwap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient
    ) external returns (uint256 amountOut) {
        require(amountIn > 0, "Amount must be greater than 0");
        require(recipient != address(0), "Invalid recipient");

        // Transfer tokenIn from the caller to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve router to spend tokenIn
        IERC20(tokenIn).forceApprove(UNISWAP_V2_ROUTER, amountIn);

        // Create path for swap
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        // Execute swap via Uniswap V2
        uint[] memory amounts = router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            recipient,
            block.timestamp + 300 // 5 minute deadline
        );

        amountOut = amounts[1];

        // Emit event for Envio indexing
        emit AgentSwapExecuted(
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            block.timestamp,
            "UniswapV2"
        );
    }

    /**
     * @dev Get the expected output amount for a swap
     * @param tokenIn Address of the input token
     * @param tokenOut Address of the output token
     * @param amountIn Amount of tokenIn to swap
     * @return amountOut Expected amount of tokenOut
     */
    function getExpectedAmountOut(
        address tokenIn,
        address tokenOut,
        uint256 amountIn
    ) external view returns (uint256 amountOut) {
        address[] memory path = new address[](2);
        path[0] = tokenIn;
        path[1] = tokenOut;

        uint[] memory amounts = router.getAmountsOut(amountIn, path);
        return amounts[1];
    }

    /**
     * @dev Check if a pair exists on Uniswap V2
     * @param tokenA Address of token A
     * @param tokenB Address of token B
     * @return exists True if pair exists
     */
    function pairExists(address tokenA, address tokenB) external view returns (bool exists) {
        address pair = factory.getPair(tokenA, tokenB);
        return pair != address(0);
    }
}

