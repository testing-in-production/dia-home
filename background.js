// background.js
// Redirects new tabs to our extension page (workaround for Dia browser
// which doesn't honor chrome_url_overrides.newtab)

const NEWTAB_URL = chrome.runtime.getURL('newtab.html');

chrome.tabs.onCreated.addListener((tab) => {
  if (!tab.url || tab.url === '' || tab.url === 'chrome://newtab/' || tab.pendingUrl === 'chrome://newtab/') {
    chrome.tabs.update(tab.id, { url: NEWTAB_URL });
  }
});
