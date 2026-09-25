/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Upload de PDF/Word pelas Server Actions (limite da Vercel: 4,5 MB por requisição).
    serverActions: { bodySizeLimit: "4.5mb" },
  },
  // Modo demonstração: PostgreSQL embutido (WASM) + migrações lidas em tempo de execução.
  serverExternalPackages: ["@electric-sql/pglite", "pglite-prisma-adapter", "exceljs"],
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
    "/**": ["./prisma/migrations/**/*", "./node_modules/@electric-sql/pglite/dist/**/*"],
  },
};

export default nextConfig;
