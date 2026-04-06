import { STATIC_SITEMAP_PATHS, absoluteUrl, getAllSeoPaths } from "./urls";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Full sitemap XML: static routes + every (lang × city × SEO slug) combination.
 */
export function buildFullSitemapXml(): string {
  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ];

  for (const row of STATIC_SITEMAP_PATHS) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(absoluteUrl(row.path))}</loc>`);
    lines.push(`    <changefreq>${row.changefreq}</changefreq>`);
    lines.push(`    <priority>${row.priority}</priority>`);
    lines.push("  </url>");
  }

  for (const p of getAllSeoPaths()) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(absoluteUrl(p))}</loc>`);
    lines.push(`    <changefreq>weekly</changefreq>`);
    lines.push(`    <priority>0.75</priority>`);
    lines.push("  </url>");
  }

  lines.push(`</urlset>`);
  lines.push("");

  return lines.join("\n");
}
