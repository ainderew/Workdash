/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "camo.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "cdn.statically.io",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "cdn.cloudflare.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "avatars.steamstatic.com",
      },
    ],
  },
};

export default nextConfig;
