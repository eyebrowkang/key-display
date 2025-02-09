let { config } = await chrome.storage.sync.get("config");

if (Object.keys(config || {}).length === 0) {
  config = await setDefaultConfig();
}

const formEl = document.getElementById("form");
const maxKeysEl = document.getElementById("maxKeys");
const timeoutEl = document.getElementById("timeout");
const upperLetterEl = document.getElementById("upperLetter");
const mergeModifierKeyEl = document.getElementById("mergeModifierKey");
const mergeRepeatKeyEl = document.getElementById("mergeRepeatKey");
const showRepeatCountEl = document.getElementById("showRepeatCount");

const defaultOnEl = document.getElementById("defaultOn");
const rememberEl = document.getElementById("remember");

maxKeysEl.value = config.keyDisplay.maxKeys;
timeoutEl.value = config.keyDisplay.timeout;
upperLetterEl.value = config.keyDisplay.upperLetter ? "yes" : "no";
mergeModifierKeyEl.value = config.keyDisplay.mergeModifierKey ? "yes" : "no";
mergeRepeatKeyEl.value = config.keyDisplay.mergeRepeatKey ? "yes" : "no";
showRepeatCountEl.value = config.keyDisplay.showRepeatCount ? "yes" : "no";

defaultOnEl.value = config.extension.defaultOn ? "yes" : "no";
rememberEl.value = config.extension.remember ? "yes" : "no";

formEl.onsubmit = async (event) => {
  event.preventDefault();
  const keyDisplay = {
    maxKeys: maxKeysEl.value,
    timeout: timeoutEl.value,
    upperLetter: upperLetterEl.value === "yes",
    mergeModifierKey: mergeModifierKeyEl.value === "yes",
    mergeRepeatKey: mergeRepeatKeyEl.value === "yes",
    showRepeatCount: showRepeatCountEl.value === "yes",
  };
  const extension = {
    defaultOn: defaultOnEl.value === "yes",
    remember: rememberEl.value === "yes",
  };

  chrome.action.setBadgeText({
    text: extension.defaultOn ? "ON" : "OFF",
  });
  await chrome.storage.sync.set({
    config: {
      keyDisplay,
      extension,
    },
  });
  alert("submit success");
};

formEl.onreset = async (event) => {
  event.preventDefault();

  await setDefaultConfig();
  alert("reset success");
};

async function setDefaultConfig() {
  const { extension, keyDisplay } = await import("../../utils/config.ts");
  const config = {
    keyDisplay,
    extension,
  };
  await chrome.storage.sync.set({ config });
  return config;
}
