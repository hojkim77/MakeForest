/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@makeforest/db', '@makeforest/redis', '@makeforest/types'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'http', hostname: 'k.kakaocdn.net' },
    ],
  },
  env: {
    NEXT_PUBLIC_SERVER_URL: process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000',
  },
};

module.exports = nextConfig;
