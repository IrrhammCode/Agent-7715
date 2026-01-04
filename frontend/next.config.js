/** @type {import('next').NextConfig} */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') }); // Attempt to load from root (parent)

const nextConfig = {
  reactStrictMode: true,
  env: {
    // Map backend var to frontend public var
    NEXT_PUBLIC_AGENT_ROUTER_ADDRESS: process.env.AGENT_ROUTER_ADDRESS,
    NEXT_PUBLIC_USDC_ADDRESS: process.env.USDC_ADDRESS,
    NEXT_PUBLIC_WETH_ADDRESS: process.env.WETH_ADDRESS,
    NEXT_PUBLIC_BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001",
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Ignore React Native modules when building for web
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };

    // Ignore warnings about React Native modules
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      {
        module: /node_modules\/@metamask\/sdk/,
        message: /Can't resolve '@react-native-async-storage\/async-storage'/,
      },
    ];

    return config;
  },
};

module.exports = nextConfig;

