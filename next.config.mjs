/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
    outputFileTracingIncludes: {
      '/api/**/*': ['./data/**/*'],
      '/**/*': ['./data/**/*'],
    },
  },
};

export default nextConfig;
