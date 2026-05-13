import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiTarget = process.env.VITE_DEV_API_PROXY || "http://127.0.0.1:4000";

export default defineConfig({
  publicDir: path.resolve(__dirname, "../../freezone-web/public"),
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../../freezone-web/src"),
    },
    dedupe: ["react", "react-dom"],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
      "/uploads": { target: apiTarget, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    chunkSizeWarningLimit: 1100,
  },
  preview: {
    host: true,
    port: 4173,
    proxy: {
      "/api": { target: apiTarget, changeOrigin: true },
      "/uploads": { target: apiTarget, changeOrigin: true },
    },
  },
});
