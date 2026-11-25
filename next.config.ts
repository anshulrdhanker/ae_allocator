import type { NextConfig } from 'next';

const apiUrl = process.env.API_URL || (process.env.VERCEL ? null : 'http://127.0.0.1:8000');
const config: NextConfig = {
  async rewrites() {
    return apiUrl ? [{ source: '/api/:path*', destination: `${apiUrl}/api/:path*` }] : [];
  },
};
export default config;
