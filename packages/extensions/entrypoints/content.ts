import { ContentScriptContext } from "wxt/utils/content-script-context";
import { ExtensionState, DEFAULT_STATE } from "~/shared/types";

class KeyDisplayManager {
  private keyDisplayElement: HTMLElement | null = null;
  private state: ExtensionState = DEFAULT_STATE;

  async init() {
    // Load initial state from storage
    await this.loadState();

    // Apply initial state
    if (this.state.enabled) {
      this.injectKeyDisplay();
    }

    // Listen for messages from the popup
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === "STATE_CHANGED") {
        this.handleStateChange(message.state);
      }
    });
  }

  private async loadState() {
    try {
      const result = await browser.storage.sync.get(["extensionState"]);
      this.state = { ...DEFAULT_STATE, ...result.extensionState };
    } catch (error) {
      console.error("Failed to load state:", error);
    }
  }

  private handleStateChange(newState: ExtensionState) {
    const wasEnabled = this.state.enabled;
    this.state = newState;

    if (newState.enabled && !wasEnabled) {
      // Extension was turned on
      this.injectKeyDisplay();
    } else if (!newState.enabled && wasEnabled) {
      // Extension was turned off
      this.removeKeyDisplay();
    } else if (newState.enabled && this.keyDisplayElement) {
      // Extension is enabled and config changed
      this.updateKeyDisplayConfig();
    }
  }

  private async injectKeyDisplay() {
    if (this.keyDisplayElement) {
      return; // Already injected
    }

    try {
      if (!window.customElements) {
        await import("@webcomponents/webcomponentsjs");
        await import("key-display");
      }

      // Create the key-display element
      this.keyDisplayElement = document.createElement("key-display");

      // Set initial attributes
      this.updateKeyDisplayConfig();

      // Append to body
      document.body.appendChild(this.keyDisplayElement);
    } catch (error) {
      console.error("Failed to inject Key Display component:", error);
    }
  }

  private removeKeyDisplay() {
    if (this.keyDisplayElement && this.keyDisplayElement.parentNode) {
      this.keyDisplayElement.parentNode.removeChild(this.keyDisplayElement);
      this.keyDisplayElement = null;
    }
  }

  private updateKeyDisplayConfig() {
    if (!this.keyDisplayElement) {
      return;
    }

    // Update attributes based on the current state
    this.keyDisplayElement.setAttribute("max-keys", this.state.maxKeys.toString());
    this.keyDisplayElement.setAttribute("hidden-delay", this.state.hiddenDelay.toString());
  }

  cleanup() {
    this.removeKeyDisplay();
  }
}

export default defineContentScript({
  matches: ["<all_urls>"],
  main(ctx: ContentScriptContext) {
    const manager = new KeyDisplayManager();
    manager.init();

    // Cleanup on context invalidation
    ctx.onInvalidated(() => {
      manager.cleanup();
    });
  },
});
