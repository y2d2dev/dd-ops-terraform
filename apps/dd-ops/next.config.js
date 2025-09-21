/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },
  compiler: {
    styledComponents: true,
    // ✅ 本番ビルド時のみ console.log を削除（error / warn は残す）
    ...(process.env.NODE_ENV === 'production'
      ? { removeConsole: { exclude: ['error', 'warn'] } }
      : {}),
  },
  webpack: (config) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
    return config;
  },
  generateEtags: false,
  poweredByHeader: false,
};

module.exports = nextConfig;
