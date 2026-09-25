/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Upload de PDF/Word pelas Server Actions (limite da Vercel: 4,5 MB por requisição).
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  // Modo demonstração: PostgreSQL embutido (WASM) + migrações lidas em tempo de execução.
  serverExternalPackages: ["@electric-sql/pglite", "pglite-prisma-adapter", "exceljs"],
  outputFileTracingIncludes: {
    "/**": ["./prisma/migrations/**/*", "./node_modules/@electric-sql/pglite/dist/**/*"],
  },
};

export default nextConfig;
