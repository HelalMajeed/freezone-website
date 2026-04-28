import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.VITE_DEV_API_PROXY || "http://127.0.0.1:4000";

/** Hosts like Render set `PORT` for the process; local preview keeps 3000. */
const previewPort = Number(process.env.PORT) || 3000;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    /** Listen on all interfaces so other PCs on the LAN can open http://<this-pc-ip>:3000 */
    host: true,
    /** Allow requests whose Host is a LAN IP or hostname (Vite blocks unknown hosts by default). */
    allowedHosts: true,
    port: 3000,
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
