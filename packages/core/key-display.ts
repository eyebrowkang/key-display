export interface KeyDisplayConfig {
  maxKeys: number;
  hiddenDelay: number;
}

export type OSType = "windows" | "macos" | "linux" | "common";

type SavedKeyboardEvent = Pick<
  KeyboardEvent,
  "altKey" | "code" | "ctrlKey" | "key" | "metaKey" | "repeat" | "shiftKey" | "timeStamp" | "type"
>;

// @internal
function debounce<T extends WeakKey>(delayProp: keyof T | number) {
  return function (target: T, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const timersMap = new WeakMap<T, number>();

    descriptor.value = function (this: T, ...args: any[]) {
      const delay = typeof delayProp === "number" ? delayProp : (this[delayProp] as unknown as number);

      const existingTimer = timersMap.get(this);
      if (existingTimer) {
        window.clearTimeout(existingTimer);
      }

      const newTimer = window.setTimeout(() => {
        originalMethod.apply(this, args);
        timersMap.delete(this);
      }, delay);

      timersMap.set(this, newTimer);
    };

    return descriptor;
  };
}

interface HistoryItem {
  event: SavedKeyboardEvent;
  keyElement: HTMLElement;
  kbdElement: HTMLElement;
  supElement: HTMLElement | null;
}

class KeypressHistory {
  history: HistoryItem[] = [];
  maxLength: number = 0;

  constructor(maxLength: number) {
    this.changeMaxLength(maxLength);
  }

  get last() {
    if (this.history.length <= 0) {
      return null;
    }

    return this.history[this.history.length - 1];
  }

  get secondLast() {
    if (this.history.length <= 1) {
      return null;
    }

    return this.history[this.history.length - 2];
  }

  changeMaxLength(len: number) {
    if (len <= 0) {
      throw new Error("maxLength must be positive");
    }

    this.maxLength = len;
  }

  add(item: HistoryItem) {
    this.history.push(item);

    while (this.history.length > this.maxLength) {
      this.history[0].keyElement.remove();
      this.history.shift();
    }
  }

  pop() {
    if (!this.last) {
      return;
    }

    this.last.keyElement.remove();
    this.history.pop();
  }

  clear() {
    this.history = [];
  }
}

class KeyDisplayElement extends HTMLElement {
  static observedAttributes = ["max-keys", "hidden-delay"];

  shadow: ShadowRoot;
  config: KeyDisplayConfig;
  os: OSType = this.getOS();
  codeMaps: Record<OSType, Record<string, string>>;
  history: KeypressHistory;
  handleKeydown: (event: KeyboardEvent) => void;

  constructor() {
    super();

    this.config = {
      maxKeys: 5,
      hiddenDelay: 5_000,
    };
    const commonCodeMaps = {
      Escape: "\u238B", // ⎋
      Minus: "\u002D", // -
      Equal: "\u003D", // =
      Backspace: "\u232B", // ⌫
      Tab: "\u21C4", // ⇄
      BracketLeft: "\u005B", // [
      BracketRight: "\u005D", // ]
      Enter: "\u23CE", // ⏎
      ControlLeft: "\u005E", // ^
      ControlRight: "\u005E", // ^
      Semicolon: "\u003B", // ;
      Quote: "\u0027", // '
      Backquote: "\u0060", // `
      ShiftLeft: "\u21E7", // ⇧
      ShiftRight: "\u21E7", // ⇧
      Backslash: "\u005C", // \
      Comma: "\u002C", // ,
      Period: "\u002E", // .
      Slash: "\u002F", // /
      NumpadMultiply: "\u002A", // *
      AltLeft: "Alt",
      AltRight: "Alt",
      CapsLock: "\u21EA", // ⇪
      NumpadSubtract: "\u002D", // -
      NumpadAdd: "\u002B", // +
      NumpadDecimal: "\u002E", // .
      IntlBackslash: "\u007C", // |
      NumpadEqual: "\u003D", // =
      NumpadComma: "\u002C", // ,
      NumpadEnter: "\u23CE", // ⏎
      NumpadDivide: "\u002F", // /
      ArrowUp: "\u2191", // ↑
      ArrowLeft: "\u2190", // ←
      ArrowRight: "\u2192", // →
      ArrowDown: "\u2193", // ↓
      MetaLeft: "Meta",
      MetaRight: "Meta",
    };
    this.codeMaps = {
      windows: {
        ...commonCodeMaps,
        AltLeft: "\u2387", // ⎇
        AltRight: "\u2387", // ⎇
        MetaLeft: "\u229E", // ⊞
        MetaRight: "\u229E", // ⊞
      },
      macos: {
        ...commonCodeMaps,
        AltLeft: "\u2325", // ⌥
        AltRight: "\u2325", // ⌥
        MetaLeft: "\u2318", // ⌘
        MetaRight: "\u2318", // ⌘
      },
      linux: {
        ...commonCodeMaps,
        AltLeft: "\u2387", // ⎇
        AltRight: "\u2387", // ⎇
        MetaLeft: "\u2756", // ❖
        MetaRight: "\u2756", // ❖
      },
      common: commonCodeMaps,
    };
    this.history = new KeypressHistory(this.config.maxKeys);
    this.handleKeydown = this._handleKeydown.bind(this);
    this.shadow = this.attachShadow({ mode: "open" });

    this.shadow.innerHTML = `<style>
#container {
  --kd-color-background: #f7f7f7;
  --kd-color-border: #cccccc;
  --kd-color-text: #999999;

  padding: 10px;
  display: flex;
  gap: 16px;

  position: fixed;
  bottom: 20vh;
  left: 50%;
  transform: translateX(-50%);
  animation: fadeIn 0.5s ease-out;
  z-index: 9999;
  user-select: none;
}

.key {
  position: relative;
  color: var(--kd-color-text);
}

.key:last-child {
  --kd-color-text: #333333;
}

kbd {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, monospace;
  background-color: var(--kd-color-background);
  border: 2px solid var(--kd-color-border);
  border-radius: 8px;
  box-shadow: 0 2px 0 1.5px var(--kd-color-border);
  cursor: default;
  font-size: 32px;
  font-weight: bold;
  display: inline-block;
  padding: 8px 16px;
  position: relative;
  top: -1px;
  white-space: nowrap;
}

.keypress kbd {
  box-shadow: 0 1px 0 0.5px var(--kd-color-border);
  top: 1px;
}

sup {
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, monospace;
  position: absolute;
  top: 0;
  right: 0;
  padding: 3px 6px;
  cursor: default;
}
</style>
<div id="container"></div>`;
  }

  connectedCallback() {
    window.addEventListener("keydown", this.handleKeydown, {
      capture: true,
      passive: true,
    });
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this.handleKeydown, true);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    switch (name) {
      case "max-keys":
        const maxKeys = parseInt(newValue || "");
        if (isNaN(maxKeys) || maxKeys <= 0) {
          throw new Error("maxKeys must be positive");
        }
        this.config.maxKeys = maxKeys;
        this.history.changeMaxLength(maxKeys);
        break;
      case "hidden-delay":
        const hiddenDelay = parseInt(newValue || "");
        if (isNaN(hiddenDelay) || hiddenDelay <= 0) {
          throw new Error("hiddenDelay must be positive");
        }
        this.config.hiddenDelay = hiddenDelay;
        break;
      default:
        break;
    }
  }

  get hiddenDelay() {
    return this.config.hiddenDelay;
  }

  getOS(): OSType {
    const ua = window.navigator.userAgent.toLowerCase();

    if (ua.includes("windows")) return "windows";
    if (ua.includes("mac")) return "macos";
    if (ua.includes("linux") && !ua.includes("android")) return "linux";

    return "common";
  }

  _handleKeydown(event: KeyboardEvent) {
    const container = this.shadow.getElementById("container");
    if (!container) return;

    const eventCode = event.code;
    const currentEvent: SavedKeyboardEvent = {
      altKey: event.altKey,
      code: event.code,
      ctrlKey: event.ctrlKey,
      key: event.key,
      metaKey: event.metaKey,
      repeat: event.repeat,
      shiftKey: event.shiftKey,
      timeStamp: event.timeStamp,
      type: event.type,
    };

    let keyText = eventCode;
    if (this.codeMaps[this.os][eventCode]) {
      keyText = this.codeMaps[this.os][eventCode];
    } else if (eventCode.startsWith("Key")) {
      keyText = eventCode.slice(3);
    } else if (eventCode.startsWith("Digit")) {
      keyText = eventCode.slice(5);
    } else if (eventCode.startsWith("Numpad")) {
      keyText = eventCode.slice(6);
    } else {
      keyText = event.code;
    }

    const connector = " + ";
    const lastItem = this.history.last;

    if (!lastItem) {
      this.createKeyElement(currentEvent, connector, keyText, container);
    } else if (this.isRepeat(lastItem.event, currentEvent)) {
      this.addRepeatNumberFor(lastItem);
      lastItem.event = currentEvent;
    } else if (this.isSameModifier(lastItem.event, currentEvent)) {
      if (!this.isModifierKey(lastItem.event)) {
        this.createKeyElement(currentEvent, connector, keyText, container);
      } else if (lastItem.supElement) {
        // 有角标元素意味着可能是这样的按键顺序 Command, Command, Shift ，需要将角标减一
        const newSupNumber = parseInt(lastItem.supElement.textContent) - 1;
        if (newSupNumber <= 1) {
          lastItem.supElement.remove();
          lastItem.supElement = null;
        } else {
          lastItem.supElement.textContent = `${newSupNumber}`;
        }

        this.createKeyElement(currentEvent, connector, keyText, container);
      } else {
        const kbdContent = lastItem.kbdElement.textContent + connector + keyText;
        if (this.history.secondLast && this.history.secondLast.kbdElement.textContent === kbdContent) {
          // 可能是 Command + Shift, Command + Shift 的按键顺序
          this.addRepeatNumberFor(this.history.secondLast);
          this.history.secondLast.event = currentEvent;
          this.history.pop();
        } else {
          lastItem.kbdElement.textContent = kbdContent;
          lastItem.event = currentEvent;
        }
      }
    } else {
      this.createKeyElement(currentEvent, connector, keyText, container);
    }

    this.clearContainer();
  }

  createKeyElement(event: SavedKeyboardEvent, connector: string, keyText: string, container: HTMLElement) {
    let kbdContent = "";
    if (event.altKey && event.code !== "AltLeft" && event.code !== "AltRight") {
      kbdContent += (this.codeMaps[this.os]["AltLeft"] || this.codeMaps[this.os]["AltRight"] || event.code) + connector;
    }
    if (event.ctrlKey && event.code !== "ControlLeft" && event.code !== "ControlRight") {
      kbdContent += (this.codeMaps[this.os]["ControlLeft"] || this.codeMaps[this.os]["ControlRight"] || event.code) + connector;
    }
    if (event.metaKey && event.code !== "MetaLeft" && event.code !== "MetaRight") {
      kbdContent += (this.codeMaps[this.os]["MetaLeft"] || this.codeMaps[this.os]["MetaRight"] || event.code) + connector;
    }
    if (event.shiftKey && event.code !== "ShiftLeft" && event.code !== "ShiftRight") {
      kbdContent += (this.codeMaps[this.os]["ShiftLeft"] || this.codeMaps[this.os]["ShiftRight"] || event.code) + connector;
    }
    kbdContent += keyText;

    const keyDivEl = document.createElement("div");
    keyDivEl.classList.add("key");
    const kbdEl = document.createElement("kbd");
    kbdEl.textContent = kbdContent;
    keyDivEl.appendChild(kbdEl);
    container.appendChild(keyDivEl);

    this.history.add({
      event,
      keyElement: keyDivEl,
      kbdElement: kbdEl,
      supElement: null,
    });
  }

  addRepeatNumberFor(item: HistoryItem) {
    if (item.supElement) {
      item.supElement.textContent = `${parseInt(item.supElement.textContent) + 1}`;
    } else {
      const supEl = document.createElement("sup");
      supEl.textContent = "2";
      item.supElement = supEl;
      item.keyElement.appendChild(supEl);
    }
  }

  isRepeat(last: SavedKeyboardEvent, current: SavedKeyboardEvent): boolean {
    return (
      last.code === current.code &&
      last.altKey === current.altKey &&
      last.ctrlKey === current.ctrlKey &&
      last.metaKey === current.metaKey &&
      last.shiftKey === current.shiftKey
    );
  }

  isModifierKey(event: SavedKeyboardEvent) {
    return ["AltLeft", "AltRight", "ControlLeft", "ControlRight", "MetaLeft", "MetaRight", "ShiftLeft", "ShiftRight"].includes(
      event.code,
    );
  }

  isSameModifier(last: SavedKeyboardEvent, current: SavedKeyboardEvent): boolean {
    if (current.code === "AltLeft" || current.code === "AltRight") {
      return last.ctrlKey === current.ctrlKey && last.metaKey === current.metaKey && last.shiftKey === current.shiftKey;
    } else if (current.code === "ControlLeft" || current.code === "ControlRight") {
      return last.altKey === current.altKey && last.metaKey === current.metaKey && last.shiftKey === current.shiftKey;
    } else if (current.code === "MetaLeft" || current.code === "MetaRight") {
      return last.altKey === current.altKey && last.ctrlKey === current.ctrlKey && last.shiftKey === current.shiftKey;
    } else if (current.code === "ShiftLeft" || current.code === "ShiftRight") {
      return last.altKey === current.altKey && last.ctrlKey === current.ctrlKey && last.metaKey === current.metaKey;
    }

    return (
      last.altKey === current.altKey &&
      last.ctrlKey === current.ctrlKey &&
      last.metaKey === current.metaKey &&
      last.shiftKey === current.shiftKey
    );
  }

  @debounce<KeyDisplayElement>("hiddenDelay")
  clearContainer() {
    const container = this.shadow.getElementById("container");

    this.history.clear();
    container?.replaceChildren();
  }
}

window.customElements.define("key-display", KeyDisplayElement);
