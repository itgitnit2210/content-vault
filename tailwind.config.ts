import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f5f1e8",
        ink: "#1a1815",
        ash: "#6b6660",
        rule: "#d9d2c2",
        accent: "#c2410c",
        accentSoft: "#fed7aa",
        highlight: "#fde68a",
        highlightGreen: "#bbf7d0",
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        body: ['"Inter"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
    },
  },
  plugins: [],
};
export default config;
