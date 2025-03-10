import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  rewrites: async () => {
    return [
      {
        source: '/api/chat',
        destination: 'http://localhost:3000/chat',
      },
    ];
  },
};

export default nextConfig;
