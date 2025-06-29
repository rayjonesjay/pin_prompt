/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  trailingSlash: false,
  // Remove output: 'export' to allow dynamic routes
};

module.exports = nextConfig;