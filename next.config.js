/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizeCss: false,
  },
  // Disable font optimization to avoid network issues
  optimizeFonts: false,
  // Configure images for Supabase storage
  images: {
    domains: ['shshlvaxfzfxrnczzery.supabase.co'],
  },
  // Add fallback for font loading issues
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;