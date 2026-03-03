/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Force SWC and disable Babel completely
  experimental: {
    forceSwcTransforms: true,
    optimizePackageImports: ['lucide-react'],
  },
  // Override any global Babel configuration
  webpack: (config, { dev, isServer }) => {
    // Force SWC in development
    if (dev) {
      config.resolve.alias = {
        ...config.resolve.alias,
        // Disable any Babel plugins
        'babel-plugin-styled-components': false,
      }
    }
    return config
  },
}

module.exports = nextConfig

