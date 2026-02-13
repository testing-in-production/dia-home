// js/app.js

const App = {
  pinnedData: [],  // Array of { id, order, title, url }

  async init() {
    await this.loadPinnedBookmarks();
    this.renderGrid();
    this.setupAddButton();
  },

  async loadPinnedBookmarks() {
    const pinned = await Storage.getPinned();
    if (pinned.length === 0) {
      this.pinnedData = [];
      return;
    }

    const ids = pinned.map(p => p.id);
    const bookmarks = await Bookmarks.getMultipleByIds(ids);
    const bookmarkMap = new Map(bookmarks.map(b => [b.id, b]));

    // Filter out stale IDs and merge order info
    const validIds = new Set(bookmarks.map(b => b.id));
    const cleanedPinned = await Storage.removeStaleIds(validIds);

    this.pinnedData = cleanedPinned
      .sort((a, b) => a.order - b.order)
      .map(p => {
        const bm = bookmarkMap.get(p.id);
        return bm ? { id: bm.id, order: p.order, title: bm.title, url: bm.url } : null;
      })
      .filter(Boolean);
  },

  renderGrid() {
    const grid = document.getElementById('tile-grid');
    grid.innerHTML = '';

    this.pinnedData.forEach(item => {
      const tile = document.createElement('a');
      tile.className = 'tile';
      tile.href = item.url;
      tile.dataset.bookmarkId = item.id;

      const img = document.createElement('img');
      img.src = Bookmarks.getFaviconUrl(item.url);
      img.alt = '';
      img.onerror = () => { img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="%234a9eff"/><text x="16" y="22" text-anchor="middle" fill="white" font-size="18" font-family="sans-serif">' + (item.title[0] || '?').toUpperCase() + '</text></svg>'; };

      const title = document.createElement('span');
      title.className = 'tile-title';
      title.textContent = item.title;

      tile.appendChild(img);
      tile.appendChild(title);
      grid.appendChild(tile);
    });

    // '+' Add tile
    const addTile = document.createElement('div');
    addTile.className = 'tile tile-add';
    addTile.id = 'add-tile';
    addTile.textContent = '+';
    grid.appendChild(addTile);
  },

  setupAddButton() {
    document.getElementById('add-tile').addEventListener('click', () => {
      Picker.open();
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
