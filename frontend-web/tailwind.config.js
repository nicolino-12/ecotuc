/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        cardLight: "var(--card-light)",
        cardBorder: "var(--card-border)",
        textMuted: "var(--text-muted)",
        brandDark: "#154726",
        brandLight: "#5cb836",
        primary: {
          DEFAULT: "#154726", // Verde Oscuro EcoTuc
          dark: "#0e331a",
          light: "#5cb836",   // Verde Claro EcoTuc
        },
        secondary: {
          DEFAULT: "#5cb836", // Verde Claro EcoTuc
          dark: "#489828",
          light: "#82d45c",
        },
        accent: {
          purple: "#8b5cf6",
          blue: "#3b82f6",
        },
        priority: {
          critica: "#ef4444", // Red
          alta: "#f97316",    // Orange
          media: "#f59e0b",   // Amber
          baja: "#5cb836",    // Green
        }
      },
      fontFamily: {
        sans: ["Arial", "Helvetica", "sans-serif"],
      },
    },
  },
  plugins: [],
}
