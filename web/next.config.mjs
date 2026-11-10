/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fully static site: everything (including AI inference) runs in the browser,
  // so the demo can be hosted on any static host (Vercel, Netlify, GitHub Pages…).
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
};

export default nextConfig;
