import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  plugins: [react()],
  /** Load `.env` from this package (Cloudflare injects `VITE_*` at build time). */
  envDir: path.resolve(__dirname, "."),
  server: {
    port: 5173,
  },
});
