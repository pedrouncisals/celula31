/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['firebasestorage.googleapis.com'],
  },
  webpack: (config) => {
    // Permitir importação de JSONs grandes
    config.resolve.extensionAlias = {
      ".json": [".json"],
    };
    return config;
  },
  // Otimizações de bundle
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
};

module.exports = withBundleAnalyzer(nextConfig);

