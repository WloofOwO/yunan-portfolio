/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  // GitHub Pages can only serve files. Keep the existing Vinext worker build
  // untouched and give `next build` a separate, fully static output.
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    unoptimized: true,
  },
  // The repository also contains Cloudflare Worker-only modules. They are
  // validated by the normal Vinext build and are not part of the Pages app.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
