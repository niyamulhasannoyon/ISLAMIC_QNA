import { MetadataRoute } from "next";
import { getFatwaCount, getFatwaMetadataList } from "@/lib/db";
import { getSiteUrl, createFatwaSlug } from "@/lib/utils";

const CHUNK_SIZE = 10000;
const siteUrl = getSiteUrl();

export async function generateSitemaps() {
  const total = getFatwaCount();
  const numSitemaps = Math.max(1, Math.ceil(total / CHUNK_SIZE));
  return Array.from({ length: numSitemaps }, (_, i) => ({ id: i }));
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const offset = id * CHUNK_SIZE;
  const fatwas = getFatwaMetadataList(CHUNK_SIZE, offset);

  const fatwaEntries: MetadataRoute.Sitemap = fatwas.map((f) => {
    let lastMod = new Date();
    if (f.updated_at) {
      const parsed = new Date(f.updated_at);
      if (!isNaN(parsed.getTime())) lastMod = parsed;
    } else if (f.published_date) {
      const parsed = new Date(f.published_date);
      if (!isNaN(parsed.getTime())) lastMod = parsed;
    }

    return {
      url: `${siteUrl}/fatwa/${createFatwaSlug(f.title, f.id)}`,
      lastModified: lastMod,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    };
  });

  if (id === 0) {
    return [
      {
        url: siteUrl,
        lastModified: new Date(),
        changeFrequency: "daily" as const,
        priority: 1.0,
      },
      ...fatwaEntries,
    ];
  }

  return fatwaEntries;
}
