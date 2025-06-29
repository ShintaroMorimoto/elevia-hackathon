import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    nodeMiddleware: true,
  },
  serverExternalPackages: ['@libsql/client', 'libsql', '@google-cloud/cloud-sql-connector', 'pg'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Externalize libsql packages on server side
      config.externals.push('@libsql/client', 'libsql');
    }
    
    // Ignore binary files and documentation
    config.module.rules.push({
      test: /\.(node|md|LICENSE)$/,
      use: 'ignore-loader',
    });
    
    // Fallback for modules that don't resolve properly
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'better-sqlite3': false,
      '@libsql/client': false,
      'libsql': false,
    };
    
    return config;
  },
};

export default nextConfig;
