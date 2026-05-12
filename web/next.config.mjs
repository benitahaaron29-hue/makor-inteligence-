/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Vercel serverless functions only bundle files Next.js can statically
  // trace. The export route reads tokens.css, components.css and the brand
  // PNG via fs.readFile — those live outside the function's import graph,
  // so we force-include them here. Without this, the export route builds
  // fine but fails at runtime on Vercel with "no such file or directory".
  experimental: {
    outputFileTracingIncludes: {
      "/briefings/*/export": [
        "./styles/tokens.css",
        "./styles/components.css",
        "./public/brand/**",
      ],
    },
  },

  // Proxy /api/* to the upstream data service so the frontend can use
  // same-origin URLs without CORS concerns. The proxy is inert when the
  // deployment runs in demo mode (no upstream is called).
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://127.0.0.1:8000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
