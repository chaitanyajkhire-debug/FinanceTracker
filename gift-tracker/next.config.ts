import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app sits beside another Next.js app in the same repo. Pinning the
  // root stops Turbopack from walking up and picking the parent lockfile.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
