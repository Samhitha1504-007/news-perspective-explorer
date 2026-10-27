/** @type {import('next').NextConfig} */
const nextConfig = {
  // Database drivers run only on the server (API routes); load them from
  // node_modules instead of bundling them.
  experimental: {
    serverComponentsExternalPackages: ["mysql2", "mongodb", "bcryptjs", "jsonwebtoken"],
  },
};

export default nextConfig;
