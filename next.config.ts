import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: ["exceljs", "nodemailer", "@neondatabase/serverless"],
};

export default nextConfig;
