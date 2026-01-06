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
      // Twitch
      {
        protocol: 'https',
        hostname: 'static-cdn.jtvnw.net',
      },
      {
        protocol: 'https',
        hostname: 'clips-media-assets2.twitch.tv',
      },
      {
        protocol: 'https',
        hostname: '*.jtvnw.net',
      },
      // SoundCloud
      {
        protocol: 'https',
        hostname: 'i1.sndcdn.com',
      },
      {
        protocol: 'https',
        hostname: '*.sndcdn.com',
      },
      // Bandcamp
      {
        protocol: 'https',
        hostname: 'f4.bcbits.com',
      },
      {
        protocol: 'https',
        hostname: '*.bcbits.com',
      },
      // Mixcloud
      {
        protocol: 'https',
        hostname: 'thumbnailer.mixcloud.com',
      },
      {
        protocol: 'https',
        hostname: '*.mixcloud.com',
      },
    ],
  },
};

export default nextConfig;
