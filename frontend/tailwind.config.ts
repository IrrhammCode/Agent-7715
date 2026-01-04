import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(0 0% 3.9%)", // zinc-950
        foreground: "hsl(0 0% 98%)",
        card: {
          DEFAULT: "hsl(0 0% 7.8%)", // zinc-900
          foreground: "hsl(0 0% 98%)",
        },
        border: "hsl(0 0% 14.9%)", // zinc-800
        input: "hsl(0 0% 14.9%)",
        primary: {
          DEFAULT: "hsl(142 76% 36%)", // emerald-400
          foreground: "hsl(0 0% 98%)",
        },
        secondary: {
          DEFAULT: "hsl(0 0% 14.9%)",
          foreground: "hsl(0 0% 98%)",
        },
        accent: {
          DEFAULT: "hsl(0 0% 14.9%)",
          foreground: "hsl(0 0% 98%)",
        },
        destructive: {
          DEFAULT: "hsl(0 84% 60%)", // rose-500
          foreground: "hsl(0 0% 98%)",
        },
        warning: {
          DEFAULT: "hsl(45 93% 47%)", // amber-400
          foreground: "hsl(0 0% 3.9%)",
        },
        muted: {
          DEFAULT: "hsl(0 0% 14.9%)",
          foreground: "hsl(0 0% 63.9%)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-border": "glow-border 2s ease-in-out infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": {
            opacity: "1",
            boxShadow: "0 0 20px rgba(16, 185, 129, 0.5)",
          },
          "50%": {
            opacity: "0.8",
            boxShadow: "0 0 30px rgba(16, 185, 129, 0.8)",
          },
        },
        "glow-border": {
          "0%, 100%": {
            borderColor: "rgba(39, 39, 42, 1)",
            boxShadow: "0 0 0px rgba(16, 185, 129, 0)",
          },
          "50%": {
            borderColor: "rgba(16, 185, 129, 0.5)",
            boxShadow: "0 0 10px rgba(16, 185, 129, 0.3)",
          },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;

