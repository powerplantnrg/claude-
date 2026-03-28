import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        accent: {
          emerald: {
            50: "#ecfdf5",
            100: "#d1fae5",
            400: "#34d399",
            500: "#10b981",
            600: "#059669",
            700: "#047857",
          },
          rose: {
            50: "#fff1f2",
            100: "#ffe4e6",
            400: "#fb7185",
            500: "#f43f5e",
            600: "#e11d48",
          },
          amber: {
            50: "#fffbeb",
            100: "#fef3c7",
            400: "#fbbf24",
            500: "#f59e0b",
            600: "#d97706",
          },
        },
        surface: {
          primary: "var(--surface-primary)",
          secondary: "var(--surface-secondary)",
          tertiary: "var(--surface-tertiary)",
          elevated: "var(--surface-elevated)",
          overlay: "var(--surface-overlay)",
        },
        border: {
          DEFAULT: "var(--border-default)",
          muted: "var(--border-muted)",
          focus: "var(--border-focus)",
        },
      },
      borderRadius: {
        "premium-sm": "6px",
        "premium": "8px",
        "premium-md": "12px",
        "premium-lg": "16px",
        "premium-xl": "20px",
      },
      boxShadow: {
        "soft": "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
        "glass": "0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.04)",
        "glow": "0 0 20px rgba(99, 102, 241, 0.15)",
        "glow-emerald": "0 0 20px rgba(16, 185, 129, 0.15)",
        "glow-rose": "0 0 20px rgba(244, 63, 94, 0.15)",
        "elevated": "0 10px 15px -3px rgba(15, 23, 42, 0.06), 0 4px 6px -4px rgba(15, 23, 42, 0.04)",
        "premium": "0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)",
      },
      backdropBlur: {
        xs: "2px",
        premium: "12px",
        heavy: "24px",
      },
      transitionTimingFunction: {
        "premium": "cubic-bezier(0.23, 1, 0.32, 1)",
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        "display-sm": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.025em", fontWeight: "700" }],
        "display": ["2.25rem", { lineHeight: "2.75rem", letterSpacing: "-0.025em", fontWeight: "700" }],
        "display-lg": ["3rem", { lineHeight: "3.5rem", letterSpacing: "-0.025em", fontWeight: "700" }],
      },
      spacing: {
        "dashboard-gap": "1.5rem",
        "dashboard-padding": "2rem",
        "sidebar-width": "16rem",
        "sidebar-collapsed": "4.5rem",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "slide-up": "slideUp 0.35s ease-out forwards",
        "slide-in": "slideIn 0.3s ease-out forwards",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "shimmer": "shimmer 1.5s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-8px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 8px rgba(99, 102, 241, 0.15)" },
          "50%": { boxShadow: "0 0 20px rgba(99, 102, 241, 0.3)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
}

export default config
