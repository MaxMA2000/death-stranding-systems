import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  reactStrictMode: false, // Disable strict mode to prevent WebSocket double connection issues
  /* config options here */
};

export default withNextIntl(nextConfig);
