import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from root .env file
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

const PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY || process.env.SESSION_PRIVATE_KEY || "";

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        sepolia: {
            url: process.env.RPC_URL || "https://rpc.sepolia.org",
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            chainId: 11155111,
        },
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY,
    },
};

export default config;
