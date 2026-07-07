import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/shared/config";

export default function sitemap(): MetadataRoute.Sitemap {
  // LP側のみをSEO対象にする（/login /signup はnoindexのため含めない）
  const pages = ["", "/features", "/pricing", "/demo", "/terms", "/privacy", "/commercial-law"];
  return pages.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
