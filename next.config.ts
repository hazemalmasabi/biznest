import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: [] } : false,
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
