// js/storage.js
// Manages pinned bookmark IDs in chrome.storage.sync

const Storage = {
  STORAGE_KEY: 'pinnedBookmarks',

  async getPinned() {
    const data = await chrome.storage.sync.get(this.STORAGE_KEY);
    return data[this.STORAGE_KEY] || [];
  },

  async savePinned(pinnedList) {
    await chrome.storage.sync.set({ [this.STORAGE_KEY]: pinnedList });
  },

  async addPin(bookmarkId) {
    const pinned = await this.getPinned();
    if (pinned.some(p => p.id === bookmarkId)) return pinned;
    const maxOrder = pinned.reduce((max, p) => Math.max(max, p.order), -1);
    pinned.push({ id: bookmarkId, order: maxOrder + 1 });
    await this.savePinned(pinned);
    return pinned;
  },

  async removePin(bookmarkId) {
    let pinned = await this.getPinned();
    pinned = pinned.filter(p => p.id !== bookmarkId);
    pinned.forEach((p, i) => p.order = i);
    await this.savePinned(pinned);
    return pinned;
  },

  async isPinned(bookmarkId) {
    const pinned = await this.getPinned();
    return pinned.some(p => p.id === bookmarkId);
  },

  async removeStaleIds(validIds) {
    let pinned = await this.getPinned();
    const before = pinned.length;
    pinned = pinned.filter(p => validIds.has(p.id));
    if (pinned.length !== before) {
      pinned.forEach((p, i) => p.order = i);
      await this.savePinned(pinned);
    }
    return pinned;
  }
};
