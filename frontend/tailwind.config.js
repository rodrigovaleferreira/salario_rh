

// frontend/tailwind.config.js

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta principal — tons escuros corporativos
        brand: {
          50:  "#f0f4ff",
          100: "#dce6ff",
          200: "#b9cdff",
          300: "#85a8ff",
          400: "#4d7bff",
          500: "#2455f5",
          600: "#1a3fd4",
          700: "#162faa",
          800: "#172a8a",
          900: "#182870",
          950: "#111847",
        },
        surface: {
          DEFAULT: "#0f1117",
          50:  "#f8f9fc",
          100: "#f0f2f7",
          200: "#e2e6f0",
          300: "#c8cedf",
          400: "#9aa4be",
          500: "#6b7899",
          600: "#4a5578",
          700: "#333d5c",
          800: "#1e2540",
          900: "#141a30",
          950: "#0d1120",
        },
        success: "#22c55e",
        warning: "#f59e0b",
        danger:  "#ef4444",
        info:    "#3b82f6",
      },
      fontFamily: {
        sans:    ["'DM Sans'", "system-ui", "sans-serif"],
        display: ["'Sora'", "sans-serif"],
        mono:    ["'JetBrains Mono'", "monospace"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card:  "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        panel: "0 4px 24px -2px rgb(0 0 0 / 0.12), 0 2px 8px -2px rgb(0 0 0 / 0.08)",
        glow:  "0 0 24px -4px rgb(36 85 245 / 0.4)",
      },
    },
  },
  plugins: [],
}