import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.VITE_DEV_API_PROXY || "http://127.0.0.1:4000";

/** Local dev UI port (override if 3000 is busy). Must match scripts/check-dev-ports.cjs / print-lan-dev-info. */
const devServerPort = Number(process.env.VITE_DEV_PORT) || 3000;

/** Hosts like Render set `PORT` for the process; local preview keeps 3000. */
const previewPort = Number(process.env.PORT) || 3000;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    /** Listen on all interfaces so other PCs on the LAN can open http://<this-pc-ip>:<VITE_DEV_PORT> */
    host: true,
    /** Allow requests whose Host is a LAN IP or hostname (Vite blocks unknown hosts by default). */
    allowedHosts: true,
    port: devServerPort,
    strictPort: true,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
      /** Uploaded CMS/hero images live on the API (`public/uploads`). */
      "/uploads": { target: apiTarget, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    /** Split heavy vendor libs so the main chunk is not one 700KB+ blob. */
    /** model-viewer min bundle is ~1MB; split from app entry already. */
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          /** Heavy / optional libs only — avoid a catch-all `vendor` chunk (circular deps with React). */
          if (id.includes("@google")) return "vendor-model-viewer";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("i18next") || id.includes("react-i18next")) return "vendor-i18n";
          if (id.includes("lucide-react")) return "vendor-lucide";
          if (id.includes("embla-carousel")) return "vendor-embla";
          return undefined;
        },
      },
    },
  },
  preview: {
    host: true,
    allowedHosts: true,
    port: previewPort,
    /** When `PORT` is set (e.g. Render), bind exactly to that port. */
    strictPort: Boolean(process.env.PORT),
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
      "/uploads": { target: apiTarget, changeOrigin: true },
    },
  },
});
