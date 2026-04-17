import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "#E5E5E5",
        input: "#E5E5E5",
        ring: "#1A1A1A",
        background: "#FAFAFA",
        foreground: "#1A1A1A",
        primary: {
          DEFAULT: "#1A1A1A",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#F5F5F5",
          foreground: "#525252",
        },
        muted: {
          DEFAULT: "#F5F5F5",
          foreground: "#A3A3A3",
        },
        accent: {
          DEFAULT: "#F5F5F5",
          foreground: "#1A1A1A",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#FFFFFF",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#1A1A1A",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#1A1A1A",
        },
        success: "#22C55E",
        warning: "#EAB308",
        info: "#3B82F6",
      },
      borderRadius: {
        lg: "8px",
        md: "6px",
        sm: "4px",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "PingFang SC",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
export default config;
