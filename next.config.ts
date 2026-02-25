import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Only use static export for production builds (Netlify).
  // In dev mode, allow dynamic routes to render on demand.
  output: process.env.NODE_ENV === "production" ? "export" : undefined,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
