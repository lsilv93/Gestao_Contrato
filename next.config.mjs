import { urlBanco } from "./src/lib/banco.mjs";

// Com banco conectado no build (Vercel), o modo demonstração (PGlite, ~26 MB) fica
// fora do pacote: funções menores → inicialização (cold start) mais rápida.
const comBanco = !!urlBanco();
const PGLITE = ["@electric-sql/pglite", "pglite-prisma-adapter"];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Upload de PDF/Word pelas Server Actions (limite da Vercel: 4,5 MB por requisição).
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  // Modo demonstração: PostgreSQL embutido (WASM) + migrações lidas em tempo de execução.
  serverExternalPackages: [...(comBanco ? [] : PGLITE), "exceljs"],
  // Cabeçalhos de segurança em todas as respostas (o HTTPS/HSTS já vem da Vercel).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" }, // impede abrir o sistema dentro de outro site (clickjacking)
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/**": comBanco ? [] : ["./prisma/migrations/**/*", "./node_modules/@electric-sql/pglite/dist/**/*"],
  },
  webpack(config, { isServer }) {
    if (comBanco && isServer) config.resolve.alias = { ...config.resolve.alias, ...Object.fromEntries(PGLITE.map((p) => [p, false])) };
    return config;
  },
};

export default nextConfig;
