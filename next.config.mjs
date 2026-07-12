/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // Product/character images are served from /public/asset
    remotePatterns: [],
  },
  experimental: {
    // The admin "Add a product" form posts two images through a server action and
    // the default body limit is 1 MB. They're compressed in the browser first
    // (usually a few hundred KB), but leave room for the uncompressed fallback
    // when a browser can't re-encode them.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
