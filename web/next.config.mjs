/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static site: everything (including AI inference) runs in the browser,
  // so the demo can be hosted on any static host (Vercel, Netlify, GitHub Pages…).
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  // Optional: serve from a sub-path (e.g. GitHub Pages) by building with NEXT_PUBLIC_BASE_PATH=/repo
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  reactStrictMode: true,
};

export default nextConfig;
