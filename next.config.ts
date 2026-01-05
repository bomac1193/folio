import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
      {
        protocol: 'https',
        hostname: '*.tiktokcdn.com',
      },
      {
        protocol: 'https',
        hostname: '*.tiktokcdn-us.com',
      },
      {
        protocol: 'https',
        hostname: '*.tiktokcdn-eu.com',
      },
      {
        protocol: 'https',
        hostname: '*.tiktokcdn-uk.com',
      },
      {
        protocol: 'https',
        hostname: '*.tiktokcdn-ap.com',
      },
      {
        protocol: 'https',
        hostname: '*.muscdn.com',
      },
      {
        protocol: 'https',
        hostname: '*.cdninstagram.com',
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
      },
      {
        protocol: 'https',
        hostname: '*.twimg.com',
      },
    ],
  },
};

export default nextConfig;
