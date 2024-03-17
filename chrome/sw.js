chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({
    text: 'OFF'
  });
});

chrome.windows.onCreated.addListener(async () => {
  const { config } = await chrome.storage.sync.get("config");
  let text = "OFF";
  if (config) {
    text = config.extension.defaultOn ? "ON" : "OFF";
  }

  chrome.action.setBadgeText({
    text,
  });
});

chrome.action.onClicked.addListener(async (tab) => {
    const prevState = await chrome.action.getBadgeText({ tabId: tab.id });
    const nextState = prevState === 'ON' ? 'OFF' : 'ON';

    await chrome.action.setBadgeText({
      text: nextState,
    });

    // send message to content.js
    chrome.tabs.sendMessage(tab.id, nextState);
});