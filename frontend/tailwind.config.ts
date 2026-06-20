import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        cream: "#FAF8F3", // Primary background
        "cream-soft": "#F3EFE7", // Secondary background
        card: "#FFFFFF",

        // Brand green
        primary: {
          DEFAULT: "#1F6B4F",
          dark: "#175940",
          light: "#DDEFE7",
        },

        // Text
        ink: "#2B2B2B", // Text primary
        "ink-soft": "#5F5F5F", // Text secondary

        // Borders
        line: "#E6E0D6",

        // Accent helpers (kept inside the brief's warm, human palette)
        sand: "#F1E4C9",
        terracotta: "#C96F4A",
        sky: "#E4EEF2",
      },
      fontFamily: {
        heading: ["var(--font-heading)"],
        body: ["var(--font-body)"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        soft: "0 2px 8px rgba(43, 43, 43, 0.04), 0 8px 24px rgba(43, 43, 43, 0.06)",
        card: "0 1px 2px rgba(43, 43, 43, 0.04), 0 4px 16px rgba(43, 43, 43, 0.05)",
        lift: "0 8px 30px rgba(31, 107, 79, 0.12)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "gentle-float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        "gentle-float": "gentle-float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
