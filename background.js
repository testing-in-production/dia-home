// background.js
// Redirects new tabs to our extension page (workaround for Dia browser
// which doesn't honor chrome_url_overrides.newtab)

const NEWTAB_URL = chrome.runtime.getURL('newtab.html');

chrome.tabs.onCreated.addListener((tab) => {
  // If the tab has a pendingUrl, it's navigating to a specific page
  // (e.g. Cmd+click a link) — don't intercept
  if (tab.pendingUrl) {
    return;
  }

  // Only redirect genuinely blank new tabs
  if (!tab.url || tab.url === '' || tab.url === 'chrome://newtab/') {
    chrome.tabs.update(tab.id, { url: NEWTAB_URL });
  }
});
