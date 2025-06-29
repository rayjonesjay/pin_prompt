/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  trailingSlash: false,
  // Remove output: 'export' to allow dynamic routes
  async redirects() {
    return [
      // Redirect auth confirmation emails to the proper page
      {
        source: '/auth/confirm',
        destination: '/auth/confirm',
        permanent: false,
      },
      // Redirect password reset emails to the proper page
      {
        source: '/auth/reset-password',
        destination: '/auth/reset-password',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;