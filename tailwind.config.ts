import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        night: {
          950: "#07090d",
          900: "#0b0f16",
          850: "#101722",
          800: "#162032",
        },
        signal: {
          gold: "#f6c550",
          amber: "#d99b28",
          cyan: "#7dd3fc",
        },
      },
      boxShadow: {
        board: "0 22px 80px rgba(0, 0, 0, 0.42)",
      },
    },
  },
  plugins: [],
} satisfies Config;
