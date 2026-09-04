import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  serverExternalPackages: [
    "exceljs",
    "nodemailer",
    "@neondatabase/serverless",
    "puppeteer-core",
    "@sparticuz/chromium",
  ],
  outputFileTracingIncludes: {
    "/api/report/daily": [
      "./node_modules/@sparticuz/chromium/**",
      "./src/fonts/**",
    ],
  },
};

export default nextConfig;
