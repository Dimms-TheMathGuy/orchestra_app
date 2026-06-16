import type { NextConfig } from "next";

// Backend origin: set NEXT_PUBLIC_API_URL in production (e.g. https://api.orchestra.app).
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

const nextConfig: NextConfig = {
  typescript: {
    // Exclude NEW FRONTEND folder from type checking
    tsconfigPath: './tsconfig.json',
  },
  async rewrites() {
    const proxied = [
      'auth', 'api', 'projects', 'users', 'meetings',
      'summaries', 'gemini', 'zoom', 'notion', 'github',
    ];
    return {
      beforeFiles: proxied.map((p) => ({
        source: `/${p}/:path*`,
        destination: `${API_URL}/${p}/:path*`,
      })),
    }
  },
};

export default nextConfig;

