import { ExtensionState, DEFAULT_STATE } from "~/shared/types";

export default defineBackground(() => {
  // Helper function to update badge text based on extension state
  async function updateBadgeText(state: ExtensionState) {
    try {
      if (state.enabled) {
        await browser.action.setBadgeText({ text: "" });
      } else {
        await browser.action.setBadgeText({ text: "OFF" });
        await browser.action.setBadgeBackgroundColor({ color: "#dc3545" }); // Red color for disabled
      }
    } catch (error) {
      console.error("Failed to update badge text:", error);
    }
  }

  // Initialize storage with default values if not already set
  browser.runtime.onInstalled.addListener(async () => {
    try {
      const result = await browser.storage.sync.get(["extensionState"]);
      if (!result.extensionState) {
        await browser.storage.sync.set({ extensionState: DEFAULT_STATE });
      }
      // Set the initial badge text
      const state = { ...DEFAULT_STATE, ...result.extensionState };
      await updateBadgeText(state);
    } catch (error) {
      console.error("Failed to initialize extension state:", error);
    }
  });

  // Handle storage changes and propagate to all tabs
  browser.storage.onChanged.addListener(async (changes, area) => {
    if (area === "sync" && changes.extensionState) {
      const newState = changes.extensionState.newValue;

      // Update badge text
      await updateBadgeText(newState);

      // Notify all tabs about the state change
      try {
        const tabs = await browser.tabs.query({});
        for (const tab of tabs) {
          if (tab.id) {
            browser.tabs
              .sendMessage(tab.id, {
                type: "STATE_CHANGED",
                state: newState,
              })
              .catch(() => {
                // Content script might not be ready or tab might not support it, ignore
              });
          }
        }
      } catch (error) {
        console.error("Failed to notify tabs about state change:", error);
      }
    }
  });

  // Handle messages from content scripts or popup
  browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    try {
      switch (message.type) {
        case "GET_STATE":
          // Content script requesting current state
          const result = await browser.storage.sync.get(["extensionState"]);
          const state = { ...DEFAULT_STATE, ...result.extensionState };
          sendResponse({ state });
          break;

        case "UPDATE_STATE":
          // Update state (could be from a popup or content script)
          await browser.storage.sync.set({ extensionState: message.state });
          sendResponse({ success: true });
          break;

        default:
          console.log("Unknown message type:", message.type);
      }
    } catch (error: any) {
      console.error("Error handling message:", error);
      sendResponse({ error: error?.message });
    }

    return true; // Keep the message channel open for async response
  });
});
