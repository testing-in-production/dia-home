// js/bookmarks.js
// Wraps chrome.bookmarks API

const Bookmarks = {
  async getTree() {
    const tree = await chrome.bookmarks.getTree();
    return tree;
  },

  async getById(id) {
    try {
      const results = await chrome.bookmarks.get(id);
      return results[0] || null;
    } catch (e) {
      return null;
    }
  },

  async getMultipleByIds(ids) {
    const results = await Promise.all(ids.map(id => this.getById(id)));
    return results.filter(Boolean);
  },

  async search(query) {
    if (!query || !query.trim()) return [];
    const results = await chrome.bookmarks.search(query.trim());
    return results.filter(r => r.url);
  },

  getFaviconUrl(pageUrl) {
    return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(pageUrl)}&size=32`;
  }
};
