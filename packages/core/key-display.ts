export interface KeyDisplayConfig {
  maxKeys?: number;
  timeout?: number;
  upperLetter?: boolean;
  mergeModifierKey?: boolean;
  mergeRepeatKey?: boolean;
  showRepeatCount?: boolean;
}

// @internal
interface KeyPressHistoryItem {
  key: string;
  count: number;
  countEl: HTMLElement | null;
}

export default function (config: KeyDisplayConfig) {
  const maxKeys = config.maxKeys ?? 1;
  const timeout = config.timeout ?? 2000;
  const upperLetter = config.upperLetter ?? true;
  const mergeModifierKey = config.mergeModifierKey ?? true;
  const mergeRepeatKey = config.mergeRepeatKey ?? false;
  const showRepeatCount = config.showRepeatCount ?? false;

  customElements.define(
    "key-display",
    class extends HTMLElement {
      shadow: ShadowRoot;
      keyPressHistory: KeyPressHistoryItem[];
      clearContainer: () => void;
      handleKeydown: (event: KeyboardEvent) => void;

      constructor() {
        super();

        this.keyPressHistory = [];
        this.clearContainer = this._clearContainer();
        this.handleKeydown = this._handleKeydown.bind(this);

        this.shadow = this.attachShadow({ mode: "open" });
        this.shadow.innerHTML = `
      <style>
        .container {
          display: flex;
          justify-content: center;
          align-items: center;
          position: fixed;
          bottom: 4rem;
          left: 50%;
          transform: translateX(-50%);
          gap: 10px;
          animation: fadeIn 0.5s ease-out;
          user-select: none;
          z-index: 9999;
        }

        .key-box {
          position: relative;
          color: rgba(200, 200, 200);
          background: rgba(100, 100, 100);
          white-space: nowrap;
          border-radius: 5px;
          box-shadow: 0 4px 6px -1px rgba(250, 250, 250, 0.8), 0 2px 4px -2px rgba(250, 250, 250, 0.8);
        }

        .key-box:last-child {
          color: rgb(250, 250, 250);
          background: rgb(25, 25, 25);
        }

        .key-box .key {
          padding: 10px 20px;
          font-size: 16px;
          font-weight: bold;
        }

        .key-box .count {
          position: absolute;
          top: -100%;
          left: 50%;
          transform: translateX(-50%);
          color: orange;
          font-size: 1.5rem;
          font-weight: bold;
        }
      </style>
      <div class="container"></div>
      `;
      }

      connectedCallback() {
        document.addEventListener("keydown", this.handleKeydown);
      }

      disconnectedCallback() {
        document.removeEventListener("keydown", this.handleKeydown);
      }

      createKeyElement({ key }: KeyPressHistoryItem) {
        const keyContainerEl = document.createElement("div");
        keyContainerEl.classList.add("key-box");

        const keyEl = document.createElement("div");
        keyEl.classList.add("key");
        keyEl.textContent = key;

        const countEl = document.createElement("span");
        countEl.classList.add("count");

        keyContainerEl.appendChild(countEl);
        keyContainerEl.appendChild(keyEl);

        return [keyContainerEl, countEl];
      }

      updateKey(key: string) {
        const container = this.shadow.querySelector(".container");

        if (
          mergeRepeatKey &&
          this.keyPressHistory.length &&
          this.keyPressHistory[this.keyPressHistory.length - 1].key === key
        ) {
          const lastHistoryItem =
            this.keyPressHistory[this.keyPressHistory.length - 1];
          const count = ++lastHistoryItem.count;
          if (showRepeatCount && lastHistoryItem.countEl)
            lastHistoryItem.countEl.textContent = `\u00D7 ${count}`;
        } else {
          const item: KeyPressHistoryItem = {
            key,
            count: 1,
            countEl: null,
          };
          const [keyContainerEl, countEl] = this.createKeyElement(item);
          container?.appendChild(keyContainerEl);

          item.countEl = countEl;
          this.keyPressHistory.push(item);
        }

        if (this.keyPressHistory.length > maxKeys) {
          this.keyPressHistory.shift();
          container?.firstChild?.remove();
        }

        this.clearContainer();
      }

      _clearContainer() {
        function debounce(func: () => void, timeout: number) {
          let timer: number;
          return (...args: any) => {
            timer && clearTimeout(timer);
            timer = setTimeout(() => {
              // @ts-ignore
              func.apply(this, args);
            }, timeout);
          };
        }

        return debounce(() => {
          const container = this.shadow.querySelector(".container");
          if (!container) return;

          this.keyPressHistory = [];
          container.innerHTML = "";
        }, timeout);
      }

      _handleKeydown(event: KeyboardEvent) {
        let keyCombination = "";
        if (mergeModifierKey) {
          if (event.ctrlKey && event.key !== "Control")
            keyCombination += "Ctrl + ";
          if (event.shiftKey && event.key !== "Shift")
            keyCombination += "Shift + ";
          if (event.altKey && event.key !== "Alt") keyCombination += "Alt + ";
          if (event.metaKey && event.key !== "Meta")
            keyCombination += "Meta + ";
        }

        if (
          upperLetter &&
          event.key.length === 1 &&
          event.key.charCodeAt(0) >= 97 &&
          event.key.charCodeAt(0) <= 122
        ) {
          keyCombination += event.key.toUpperCase();
        } else {
          keyCombination += event.key;
        }

        this.updateKey(keyCombination);
      }
    },
  );
}
