import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: process.env.THEORIA_BASE_PATH ?? "/",
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icons/icon.svg"],
      manifest: {
        name: "Theoria Core",
        short_name: "Theoria",
        description: "Local-first learning and MCF course creation.",
        theme_color: "#f5f4f0",
        background_color: "#f5f4f0",
        display: "standalone",
        start_url: ".",
        icons: [{ src: "icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
      workbox: {
        navigateFallback: "index.html",
        globPatterns: ["**/*.{js,css,html,svg,json,woff2}"],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { sourcemap: true },
});
