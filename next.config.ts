import path from "path";
import type { NextConfig } from "next";

// ============================================================
// セキュリティヘッダー（全レスポンス共通）
//   - クリックジャッキング対策（frame-ancestors / X-Frame-Options）
//   - HTTPS強制（HSTS）
//   - MIMEスニッフィング無効化・リファラ制限・不要権限の遮断
// CSPは resource 読み込みを壊さないよう frame-ancestors / object-src /
// base-uri のみに限定（script/style/connect は制限しない）。
// ============================================================
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
