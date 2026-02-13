// background.js
// Redirects new tabs to our extension page (workaround for Dia browser
// which doesn't honor chrome_url_overrides.newtab)

const NEWTAB_URL = chrome.runtime.getURL('newtab.html');

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && (changeInfo.url.startsWith('chrome://start-page/') || changeInfo.url === 'chrome://newtab/')) {
    chrome.tabs.update(tabId, { url: NEWTAB_URL });
  }
});
