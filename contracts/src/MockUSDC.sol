// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockUSDC
 * @dev Mock USDC token for testing on Sepolia
 * - Mintable by owner
 * - 6 decimals (same as real USDC)
 * - Can be used for testing Agent 7715
 */
contract MockUSDC is ERC20, Ownable {
    uint8 private constant _decimals = 6;

    constructor(address initialOwner) ERC20("Mock USDC", "mUSDC") Ownable(initialOwner) {
        // Optional: Mint some initial supply to deployer
        // _mint(initialOwner, 1000000 * 10**decimals()); // 1M USDC
    }

    /**
     * @dev Returns the number of decimals used to get its user representation
     */
    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Mint tokens to a specific address
     * @param to Address to mint tokens to
     * @param amount Amount of tokens to mint (in token units, not wei)
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount * 10**decimals());
    }

    /**
     * @dev Mint tokens to caller (for easy testing)
     * Anyone can mint for themselves (remove onlyOwner for testing)
     */
    function mintToSelf(uint256 amount) public {
        _mint(msg.sender, amount * 10**decimals());
    }

    /**
     * @dev Batch mint to multiple addresses
     */
    function batchMint(address[] calldata recipients, uint256[] calldata amounts) public onlyOwner {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i] * 10**decimals());
        }
    }
}


