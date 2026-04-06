import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { buildFullSitemapXml } from "./src/seo/sitemapXml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function sitemapPlugin() {
  return {
    name: "gomate-sitemap",
    buildStart() {
      const out = path.resolve(__dirname, "public/sitemap.xml");
      fs.writeFileSync(out, buildFullSitemapXml(), "utf8");
    },
  };
}

export default defineConfig({
  plugins: [react(), sitemapPlugin()],
  /** Load `.env` from this package (Cloudflare injects `VITE_*` at build time). */
  envDir: path.resolve(__dirname, "."),
  server: {
    port: 5173,
  },
});
