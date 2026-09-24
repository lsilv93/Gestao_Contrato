/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Upload de PDF/Word pelas Server Actions (limite da Vercel: 4,5 MB por requisição).
    serverActions: { bodySizeLimit: "4.5mb" },
  },
};

export default nextConfig;
