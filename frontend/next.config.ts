import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Exclude NEW FRONTEND folder from type checking
    tsconfigPath: './tsconfig.json',
  },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/auth/:path*',
          destination: 'http://localhost:3000/auth/:path*',
        },
        {
          source: '/api/:path*',
          destination: 'http://localhost:3000/api/:path*',
        },
        {
          source: '/projects/:path*',
          destination: 'http://localhost:3000/projects/:path*',
        },
        {
          source: '/users/:path*',
          destination: 'http://localhost:3000/users/:path*',
        },
        {
          source: '/meetings/:path*',
          destination: 'http://localhost:3000/meetings/:path*',
        },
        {
          source: '/summaries/:path*',
          destination: 'http://localhost:3000/summaries/:path*',
        },
        {
          source: '/gemini/:path*',
          destination: 'http://localhost:3000/gemini/:path*',
        },
        {
          source: '/zoom/:path*',
          destination: 'http://localhost:3000/zoom/:path*',
        },
        {
          source: '/notion/:path*',
          destination: 'http://localhost:3000/notion/:path*',
        },
        {
          source: '/github/:path*',
          destination: 'http://localhost:3000/github/:path*',
        },
      ],
    }
  },
};

export default nextConfig;

