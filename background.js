// background.js
// Redirects new tabs to our extension page (workaround for Dia browser
// which doesn't honor chrome_url_overrides.newtab)

const NEWTAB_URL = chrome.runtime.getURL('newtab.html');
const redirected = new Set();

// Fastest hook: fires before the page starts loading
chrome.webNavigation.onBeforeNavigate.addListener((details) => {
  if (details.frameId !== 0) return;
  const url = details.url || '';
  if (url === 'chrome://newtab/' || url === 'chrome://new-tab-page/' || url === '') {
    redirected.add(details.tabId);
    chrome.tabs.update(details.tabId, { url: NEWTAB_URL });
  }
});

// Backup: catches tabs that onBeforeNavigate might miss
chrome.tabs.onCreated.addListener((tab) => {
  if (redirected.has(tab.id)) {
    redirected.delete(tab.id);
    return;
  }
  if (!tab.url || tab.url === '' || tab.url === 'chrome://newtab/' || tab.pendingUrl === 'chrome://newtab/') {
    chrome.tabs.update(tab.id, { url: NEWTAB_URL });
  }
});

// Cleanup
chrome.tabs.onRemoved.addListener((tabId) => redirected.delete(tabId));
