import { ExtensionState, DEFAULT_STATE } from "~/shared/types";

class PopupManager {
  private state: ExtensionState = DEFAULT_STATE;

  async init() {
    await this.loadState();
    this.renderUI();
    this.setupEventListeners();
  }

  private async loadState() {
    try {
      const result = await browser.storage.sync.get(["extensionState"]);
      this.state = { ...DEFAULT_STATE, ...result.extensionState };
    } catch (error) {
      console.error("Failed to load state:", error);
    }
  }

  private async saveState() {
    try {
      await browser.storage.sync.set({ extensionState: this.state });
      // Notify a content script about state changes
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.id) {
        browser.tabs
          .sendMessage(tabs[0].id, {
            type: "STATE_CHANGED",
            state: this.state,
          })
          .catch(() => {
            // Content script might not be ready, that's OK
          });
      }
    } catch (error) {
      console.error("Failed to save state:", error);
    }
  }

  private renderUI() {
    const app = document.getElementById("app")!;
    app.innerHTML = `
      <div class="popup-container">
        <div class="header">
          <h2>Key Display</h2>
        </div>

        <div class="control-group">
          <label class="switch-label">
            <span>Enable for this page</span>
            <label class="switch">
              <input type="checkbox" id="enabledSwitch" ${this.state.enabled ? "checked" : ""}>
              <span class="slider"></span>
            </label>
          </label>
        </div>

        <div class="config-section" id="configSection" style="display: ${this.state.enabled ? "block" : "none"}">
          <div class="control-group">
            <label for="maxKeysInput">Maximum Keys</label>
            <input type="number" id="maxKeysInput" min="1" max="50" value="${this.state.maxKeys}">
            <small>Maximum number of keys to display at once</small>
          </div>

          <div class="control-group">
            <label for="hiddenDelayInput">Hide Delay (ms)</label>
            <input type="number" id="hiddenDelayInput" min="500" max="10000" step="100" value="${this.state.hiddenDelay}">
            <small>Time before keys fade away</small>
          </div>
        </div>
      </div>
    `;
  }

  private setupEventListeners() {
    const enabledSwitch = document.getElementById("enabledSwitch") as HTMLInputElement;
    const configSection = document.getElementById("configSection")!;
    const maxKeysInput = document.getElementById("maxKeysInput") as HTMLInputElement;
    const hiddenDelayInput = document.getElementById("hiddenDelayInput") as HTMLInputElement;

    enabledSwitch.addEventListener("change", (e) => {
      const target = e.target as HTMLInputElement;
      this.state.enabled = target.checked;
      configSection.style.display = this.state.enabled ? "block" : "none";
      this.saveState();
    });

    maxKeysInput.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseInt(target.value);
      if (!isNaN(value) && value > 0 && value <= 50) {
        this.state.maxKeys = value;
        this.saveState();
      }
    });

    hiddenDelayInput.addEventListener("input", (e) => {
      const target = e.target as HTMLInputElement;
      const value = parseInt(target.value);
      if (!isNaN(value) && value >= 500 && value <= 10000) {
        this.state.hiddenDelay = value;
        this.saveState();
      }
    });
  }
}

// Initialize the popup when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const popup = new PopupManager();
  popup.init();
});
