import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  extensionApi: "chrome",
  manifest: {
    icons: {
      "16": "images/icon-16.png",
      "32": "images/icon-32.png",
      "48": "images/icon-48.png",
      "128": "images/icon-128.png",
    },
    action: {
      default_icon: {
        "16": "images/icon-16.png",
        "32": "images/icon-32.png",
        "48": "images/icon-48.png",
        "128": "images/icon-128.png",
      },
    },
    permissions: ["activeTab", "storage"],
    host_permissions: ["<all_urls>"],
  },
  vite: () => ({
    build: {
      target: "ESNext",
    },
  }),
});
