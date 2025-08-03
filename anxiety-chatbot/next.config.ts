// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // tell Next.js to skip ESLint during production builds
  eslint: {
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
