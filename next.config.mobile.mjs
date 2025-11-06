/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // Static export configuration for mobile app
  output: process.env.BUILD_MOBILE === 'true' ? 'export' : undefined,
  distDir: process.env.BUILD_MOBILE === 'true' ? 'out' : '.next',
  images: {
    unoptimized: process.env.BUILD_MOBILE === 'true',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.twilio.com',
      },
    ],
  },
  webpack: (config) => {
    config.externals.push({
      'utf-8-validate': 'commonjs utf-8-validate',
      'bufferutil': 'commonjs bufferutil',
    });
    return config;
  },
  // Disable server features for mobile build
  ...(process.env.BUILD_MOBILE === 'true' && {
    experimental: {
      // Disable features that require server
    },
  }),
};

export default nextConfig;
