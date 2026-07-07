import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/shared/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/features", "/pricing", "/demo", "/login", "/signup"];
  return pages.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));
}
