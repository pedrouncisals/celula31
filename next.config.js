/** @type {import('next').NextConfig} */
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
};

module.exports = nextConfig;

