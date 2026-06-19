import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#fafaf7",
        ink: "#0e0f0c",
        body: "#1a1b18",
        muted: "#6b6f6a",
        faint: "#9aa09a",
        rule: "#e5e4dd",
        rule2: "#d4d2c8",
        accent: "#9a3412",        // burnt sienna — single warm accent
        accent2: "#166534",       // forest green — positive
        warn: "#b45309",          // amber
        bad: "#991b1b",           // deep red
        good: "#166534",
        field: "#f4f2ea",         // pale cream for inputs
      },
      fontFamily: {
        // Distinctive editorial pairing: GT Sectra-style serif for display
        // and a humanist sans (Söhne-style) for body, both via Google Fonts.
        // Falls back to native stacks if fonts fail to load.
        display: ['"Fraunces"', '"GT Sectra"', '"Tiempos Headline"', "ui-serif", "Georgia", "Cambria", "serif"],
        sans: ['"Inter Tight"', '"Söhne"', '"Söhne Breit"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Berkeley Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.025em",
        tight: "-0.015em",
        eyebrow: "0.14em",
      },
      maxWidth: {
        prose: "62ch",
        sheet: "46rem",
      },
      boxShadow: {
        hairline: "0 0 0 1px #e5e4dd",
        soft: "0 1px 0 0 rgba(14,15,12,0.04), 0 2px 8px -2px rgba(14,15,12,0.06)",
      },
    },
  },
  plugins: [],
} satisfies Config;
