import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  compiler: {
    removeConsole: {
      exclude: [],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'yetajbeaklbahhoeqykw.supabase.co',
      },
    ],
  },
};

export default nextConfig;
