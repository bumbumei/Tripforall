import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0F1620",
        warm: {
          50: "#FFF8F1",
          100: "#FDEAD3",
          500: "#E8895A",
          600: "#D26C3B",
          700: "#A04F23"
        },
        moss: {
          50: "#F2F7F1",
          500: "#6E9E6A",
          700: "#3F6A47"
        },
        sky: {
          50: "#F0F6FB",
          500: "#5A8FB4",
          700: "#34607F"
        }
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
