import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

// PWA manifest / Workbox options, mirroring the previous @vue/cli-plugin-pwa
// (see the removed vue.config.js). The service worker keeps the versioned
// `ts3-manager` cache prefix and the navigateFallback rules so the migrated
// backend can keep serving the SPA at the root.
const PWA_OPTIONS = {
  registerType: "autoUpdate",
  includeAssets: ["img/icons/favicon.png", "img/icons/icon-192.png", "img/icons/icon-512.png", "img/icons/icon-maskable-512.png"],
  manifest: {
    name: "TS3 Manager",
    short_name: "TS3 Manager",
    description: "TeamSpeak 3 中文网页管理控制台",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#1c2537",
    theme_color: "#1c2537",
    icons: [
      { src: "img/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "img/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "img/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  },
  workbox: {
    cacheId: "ts3-manager-v3",
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true,
    navigateFallback: "index.html",
    navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/socket\.io(?:\/|$)/],
    globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
    runtimeCaching: [
      {
        urlPattern: ({ url }) =>
          url.origin === self.location.origin &&
          (/^\/api(?:\/|$)/.test(url.pathname) || /^\/socket\.io(?:\/|$)/.test(url.pathname)),
        handler: "NetworkOnly",
      },
    ],
  },
};

export default defineConfig(({ mode }) => {
  // loadEnv with an empty prefix loads every variable (including the legacy
  // VUE_APP_* names) so .env.* files keep working after the Vite migration.
  const env = loadEnv(mode, process.cwd(), "");
  const websocketUri = env.VUE_APP_WEBSOCKET_URI || "";

  return {
    base: "/",
    resolve: {
      extensions: [".mjs", ".js", ".mts", ".ts", ".jsx", ".tsx", ".json", ".vue"],
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    plugins: [
      vue(),
      VitePWA(PWA_OPTIONS),
    ],
    define: {
      // The framework-agnostic api/base.js and socket.js read
      // process.env.VUE_APP_WEBSOCKET_URI. Inject it so those modules keep
      // working unchanged after the webpack -> Vite migration.
      "process.env.VUE_APP_WEBSOCKET_URI": JSON.stringify(websocketUri),
      "process.env.BASE_URL": JSON.stringify("/"),
    },
    server: {
      host: "0.0.0.0",
      port: 8080,
    },
    build: {
      outDir: "dist",
      sourcemap: false,
      chunkSizeWarningLimit: 1100000,
    },
  };
});
