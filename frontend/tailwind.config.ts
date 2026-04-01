import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', '"Space Grotesk"'],
        mono: ['"JetBrains Mono"', '"IBM Plex Sans"'],
        display: ['"Space Grotesk"', '"IBM Plex Sans"'],
        heading: ['"Space Grotesk"', '"IBM Plex Sans"'],
        body: ['"IBM Plex Sans"', '"Space Grotesk"'],
      },
      colors: {
        void: "var(--void)",
        "deep-space": "var(--deep-space)",
        "nebula-dark": "var(--nebula-dark)",
        "event-horizon": "var(--event-horizon)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        gold: "var(--gold)",
        violet: "var(--violet)",
        cyan: "var(--cyan)",
        teal: "var(--teal)",
        amber: "var(--amber)",
        blue: "var(--blue)",
        red: "var(--red)",
        "surface-card": "var(--surface-card)",
        "surface-panel": "var(--surface-panel)",
        "border-ghost": "var(--border-ghost)",
        "border-active": "var(--border-active)",
      },
    },
  },
  plugins: [],
};

export default config;
