export default defineContentScript({
  matches: ["<all_urls>"],
  main() {
    (async () => {
      let { config } = await chrome.storage.sync.get("config");

      if (Object.keys(config || {}).length === 0) {
        const { extension, keyDisplay } = await import("../utils/config");
        config = {
          keyDisplay,
          extension,
        };
        await chrome.storage.sync.set({ config });
      }

      await import("@webcomponents/webcomponentsjs");
      // @ts-ignore
      const { default: defineKeyDisplay } = await import("key-display");
      defineKeyDisplay({
        ...config.keyDisplay,
      });

      async function injectKeyDisplay() {
        const keyDisplayEl = document.createElement("key-display");
        document.body.appendChild(keyDisplayEl);
        return keyDisplayEl;
      }

      if (config.extension.defaultOn === true) {
        await injectKeyDisplay();
      }

      chrome.runtime.onMessage.addListener(async (message) => {
        if (message !== "ON" && message !== "OFF") return;

        if (message === "ON") {
          await injectKeyDisplay();
        } else {
          document.querySelector("key-display")?.remove();
        }

        if (config.extension.remember === true) {
          await chrome.storage.sync.set({
            config: {
              keyDisplay: config.keyDisplay,
              extension: {
                defaultOn: message === "ON",
                remember: true,
              },
            },
          });
        }
      });
    })();
  },
});
