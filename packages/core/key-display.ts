interface KeyDisplayConfig {
  maxKeys: number;
  hiddenDelay: number;
  mergeRepeatKeys: boolean;
  mergeModifierKeys: boolean;
}

function debounce<T extends WeakKey>(delayProp: keyof T | number) {
  return function (
    target: T,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const timersMap = new WeakMap<T, number>();

    descriptor.value = function (this: T, ...args: any[]) {
      const delay =
        typeof delayProp === "number" ? delayProp : (this[delayProp] as unknown as number);

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

class KeyDisplayElement extends HTMLElement {
  static observedAttributes = [
    "max-keys",
    "hidden-delay",
    "merge-repeat-keys",
    "merge-modifier-keys",
  ];
  static codeDict: Record<string, string> = {
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
    AltLeft: "\u2387", // ⎇
    AltRight: "\u2387", // ⎇
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
    MetaLeft: "\u2318", // ⌘
    MetaRight: "\u2318", // ⌘
    // MetaLeft: "\u229E", // ⊞
  };

  config: KeyDisplayConfig;
  modifierKeySet: Set<string>;
  shadow: ShadowRoot;
  handleKeydown: (event: KeyboardEvent) => void;

  constructor() {
    super();

    this.config = {
      maxKeys: 5,
      hiddenDelay: 5_000,
      mergeRepeatKeys: true,
      mergeModifierKeys: true,
    };
    this.modifierKeySet = new Set([
      KeyDisplayElement.codeDict["ControlLeft"],
      KeyDisplayElement.codeDict["ControlRight"],
      "ControlLeft",
      "ControlRight",
      KeyDisplayElement.codeDict["AltLeft"],
      KeyDisplayElement.codeDict["AltRight"],
      "AltLeft",
      "AltRight",
      KeyDisplayElement.codeDict["ShiftLeft"],
      KeyDisplayElement.codeDict["ShiftRight"],
      "ShiftLeft",
      "ShiftRight",
      KeyDisplayElement.codeDict["MetaLeft"],
      KeyDisplayElement.codeDict["MetaRight"],
      "MetaLeft",
      "MetaRight",
    ]);
    this.shadow = this.attachShadow({ mode: "open" });
    this.handleKeydown = this._handleKeydown.bind(this);

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
    console.log("key-display connectedCallback");

    window.addEventListener("keydown", this.handleKeydown, {
      capture: true,
      passive: true,
    });
  }

  disconnectedCallback() {
    console.log("key-display disconnectedCallback");

    window.removeEventListener("keydown", this.handleKeydown, true);
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    console.log(`Attribute ${name} has changed from ${oldValue} to ${newValue}.`);

    switch (name) {
      case "max-keys":
        const maxKeys = parseInt(newValue || '');
        if (isNaN(maxKeys) || maxKeys <= 0) {
          throw new Error("maxKeys must be positive");
        }
        this.config.maxKeys = maxKeys;
        break;
      case "hidden-delay":
        const hiddenDelay = parseInt(newValue || '');
        if (isNaN(hiddenDelay) || hiddenDelay <= 0) {
          throw new Error("hiddenDelay must be positive");
        }
        this.config.hiddenDelay = hiddenDelay;
        break;
      case "merge-repeat-keys":
        this.config.mergeRepeatKeys = newValue === "on";
        break;
      case "mergeModifierKeys":
        this.config.mergeModifierKeys = newValue === "on";
        break;
      default:
        break;
    }
  }

  get hiddenDelay() {
    return this.config.hiddenDelay;
  }

  @debounce<KeyDisplayElement>("hiddenDelay")
  private clearContainer() {
    const container = this.shadow.getElementById("container");
    if (!container) return;

    container.replaceChildren();
  }

  private _handleKeydown(event: KeyboardEvent) {
    console.log("keydown event", event.code, event);

    const container = this.shadow.getElementById("container");
    if (!container) return;

    const connector = " + ";
    let modifier = "";
    let code = event.code;

    if (this.config.mergeModifierKeys) {
      // FIXME: 多个修饰键按下的顺序问题
      if (event.ctrlKey && event.key !== "Control") {
        const controlCode =
          KeyDisplayElement.codeDict["ControlLeft"] ||
          KeyDisplayElement.codeDict["ControlRight"] ||
          "Control";
        modifier += controlCode + connector;
      }
      if (event.shiftKey && event.key !== "Shift") {
        const shiftCode =
          KeyDisplayElement.codeDict["ShiftLeft"] ||
          KeyDisplayElement.codeDict["ShiftRight"] ||
          "Shift";
        modifier += shiftCode + connector;
      }
      if (event.altKey && event.key !== "Alt") {
        const altCode =
          KeyDisplayElement.codeDict["AltLeft"] || KeyDisplayElement.codeDict["AltRight"] || "Alt";
        modifier += altCode + connector;
      }
      if (event.metaKey && event.key !== "Meta") {
        const metaCode =
          KeyDisplayElement.codeDict["MetaLeft"] ||
          KeyDisplayElement.codeDict["MetaRight"] ||
          "Meta";
        modifier += metaCode + connector;
      }
    }

    if (KeyDisplayElement.codeDict[code]) {
      code = KeyDisplayElement.codeDict[code];
    } else if (code.startsWith("Key")) {
      code = code.slice(3);
    } else if (code.startsWith("Digit")) {
      code = code.slice(5);
    } else if (code.startsWith("Numpad")) {
      code = code.slice(6);
    } else {
      code = event.code;
    }

    const kbdContent = modifier + code;
    const lastKeyNode = container.lastChild as HTMLElement | null;
    const kbdNode = lastKeyNode?.firstChild;

    if (this.config.mergeRepeatKeys && kbdNode && kbdNode.textContent === kbdContent) {
      if (lastKeyNode?.childElementCount === 1) {
        const supEl = document.createElement("sup");
        supEl.textContent = '2';
        lastKeyNode.appendChild(supEl);
      } else {
        const supNode = lastKeyNode.lastChild as HTMLElement;
        supNode.textContent = `${parseInt(supNode.textContent) + 1}`;
      }
    } else {
      let shouldCreateElement = true;

      if (
        this.config.mergeModifierKeys &&
        modifier &&
        kbdNode &&
        kbdNode.textContent &&
        lastKeyNode.childElementCount === 1
      ) {
        const lastPlusIndex = kbdNode.textContent.lastIndexOf(connector);
        const lastKey =
          lastPlusIndex === -1
            ? kbdNode.textContent
            : kbdNode.textContent.slice(lastPlusIndex + connector.length);

        if (this.modifierKeySet.has(lastKey)) {
          kbdNode.textContent = kbdNode.textContent + connector + code;
          shouldCreateElement = false;
        }
      }

      if (shouldCreateElement) {
        const keyDivEl = document.createElement("div");
        keyDivEl.classList.add("key");
        const kbdEl = document.createElement("kbd");
        kbdEl.textContent = kbdContent;
        keyDivEl.appendChild(kbdEl);
        container.appendChild(keyDivEl);
      }
    }

    while (container.childElementCount > this.config.maxKeys) {
      container.firstChild?.remove();
    }

    this.clearContainer();
  }
}

window.customElements.define("key-display", KeyDisplayElement);
