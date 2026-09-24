import type { Config } from "tailwindcss";

// Soft UI — neomorfismo navy com acento verde-água (saúde / ANVISA).
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    // Grids de 2+ colunas empilham abaixo de 820px.
    screens: { sm: "820px", md: "820px", lg: "1024px", xl: "1280px" },
    extend: {
      // Cores ligadas a variáveis CSS (tema escuro/claro em globals.css).
      colors: {
        fundo: "rgb(var(--c-fundo) / <alpha-value>)",
        acento: { DEFAULT: "rgb(var(--c-acento) / <alpha-value>)", hover: "rgb(var(--c-acento-hover) / <alpha-value>)" },
        ouro: "rgb(var(--c-ouro) / <alpha-value>)",
        erro: { DEFAULT: "rgb(var(--c-erro) / <alpha-value>)", claro: "rgb(var(--c-erro-claro) / <alpha-value>)" },
        ok: "rgb(var(--c-ok) / <alpha-value>)",
        t1: "rgb(var(--c-t1) / <alpha-value>)",
        t2: "rgb(var(--c-t2) / <alpha-value>)",
        t3: "rgb(var(--c-t3) / <alpha-value>)",
        t4: "rgb(var(--c-t4) / <alpha-value>)",
        sulco: "var(--sulco)",
      },
      fontFamily: {
        sans: ["'Helvetica Neue'", "Helvetica", "Arial", "sans-serif"],
        mono: ["ui-monospace", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
