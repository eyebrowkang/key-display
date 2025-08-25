import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    version: "0.2.0",
    name: "Key Display",
    description: "Display key press on web page",
    permissions: ["activeTab", "storage"],
    host_permissions: ["<all_urls>"],
  },
});
