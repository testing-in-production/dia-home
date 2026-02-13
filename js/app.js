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
    ContextMenu.attachToTiles();
  },

  setupAddButton() {
    document.getElementById('add-tile').addEventListener('click', () => {
      Picker.open();
    });
  }
};

const Picker = {
  overlay: null,
  modal: null,
  body: null,
  filterInput: null,
  tree: null,

  setup() {
    this.overlay = document.getElementById('picker-overlay');
    this.modal = document.getElementById('picker-modal');
    this.body = document.getElementById('picker-body');
    this.filterInput = document.getElementById('picker-filter');

    document.getElementById('picker-close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.classList.contains('visible')) this.close();
    });
    this.filterInput.addEventListener('input', () => this.applyFilter());
  },

  async open() {
    this.tree = await Bookmarks.getTree();
    this.render();
    this.overlay.classList.add('visible');
    this.filterInput.value = '';
    this.filterInput.focus();
  },

  close() {
    this.overlay.classList.remove('visible');
  },

  render() {
    this.body.innerHTML = '';
    const roots = this.tree[0].children || [];
    roots.forEach(node => {
      const el = this.buildNode(node);
      if (el) this.body.appendChild(el);
    });
  },

  buildNode(node) {
    if (node.url) {
      return this.buildBookmarkRow(node);
    }
    if (node.children && node.children.length > 0) {
      return this.buildFolder(node);
    }
    return null;
  },

  buildFolder(folder) {
    const div = document.createElement('div');
    div.className = 'tree-folder';
    div.dataset.folderTitle = (folder.title || '').toLowerCase();

    const header = document.createElement('div');
    header.className = 'tree-folder-header';

    const arrow = document.createElement('span');
    arrow.className = 'tree-folder-arrow';
    arrow.textContent = '\u25BC';

    const name = document.createElement('span');
    name.textContent = folder.title || 'Untitled';

    header.appendChild(arrow);
    header.appendChild(name);
    header.addEventListener('click', () => div.classList.toggle('collapsed'));

    const children = document.createElement('div');
    children.className = 'tree-folder-children';

    (folder.children || []).forEach(child => {
      const childEl = this.buildNode(child);
      if (childEl) children.appendChild(childEl);
    });

    if (children.children.length === 0) return null;

    div.appendChild(header);
    div.appendChild(children);
    return div;
  },

  buildBookmarkRow(bookmark) {
    const row = document.createElement('div');
    row.className = 'tree-bookmark';
    row.dataset.title = (bookmark.title || '').toLowerCase();
    row.dataset.url = (bookmark.url || '').toLowerCase();
    row.dataset.bookmarkId = bookmark.id;

    const img = document.createElement('img');
    img.src = Bookmarks.getFaviconUrl(bookmark.url);
    img.alt = '';

    const title = document.createElement('span');
    title.className = 'tree-bookmark-title';
    title.textContent = bookmark.title || bookmark.url;

    const btn = document.createElement('button');
    btn.className = 'tree-bookmark-action';
    const isPinned = App.pinnedData.some(p => p.id === bookmark.id);
    if (isPinned) {
      btn.textContent = '\u2713';
      btn.classList.add('pinned');
    } else {
      btn.textContent = '+ Add';
      btn.addEventListener('click', async () => {
        await Storage.addPin(bookmark.id);
        await App.loadPinnedBookmarks();
        App.renderGrid();
        App.setupAddButton();
        btn.textContent = '\u2713';
        btn.classList.add('pinned');
        btn.replaceWith(btn.cloneNode(true)); // Remove listener
      });
    }

    row.appendChild(img);
    row.appendChild(title);
    row.appendChild(btn);
    return row;
  },

  applyFilter() {
    const query = this.filterInput.value.toLowerCase().trim();
    const bookmarks = this.body.querySelectorAll('.tree-bookmark');
    const folders = this.body.querySelectorAll('.tree-folder');

    bookmarks.forEach(row => {
      const matchTitle = row.dataset.title.includes(query);
      const matchUrl = row.dataset.url.includes(query);
      row.style.display = (matchTitle || matchUrl || !query) ? '' : 'none';
    });

    folders.forEach(folder => {
      const visibleChildren = folder.querySelectorAll('.tree-bookmark:not([style*="display: none"])');
      folder.style.display = visibleChildren.length > 0 ? '' : 'none';
      if (query) folder.classList.remove('collapsed');
    });
  }
};

const ContextMenu = {
  menu: null,
  activeBookmarkId: null,

  setup() {
    this.menu = document.getElementById('context-menu');

    document.getElementById('ctx-remove').addEventListener('click', async () => {
      if (this.activeBookmarkId) {
        await Storage.removePin(this.activeBookmarkId);
        await App.loadPinnedBookmarks();
        App.renderGrid();
        App.setupAddButton();
      }
      this.hide();
    });

    document.addEventListener('click', () => this.hide());
    document.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('.tile[data-bookmark-id]')) {
        this.hide();
      }
    });
  },

  attachToTiles() {
    document.querySelectorAll('.tile[data-bookmark-id]').forEach(tile => {
      tile.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.activeBookmarkId = tile.dataset.bookmarkId;
        this.menu.style.left = e.clientX + 'px';
        this.menu.style.top = e.clientY + 'px';
        this.menu.classList.add('visible');
      });
    });
  },

  hide() {
    this.menu.classList.remove('visible');
    this.activeBookmarkId = null;
  }
};

const Search = {
  input: null,
  results: null,
  items: [],
  selectedIndex: -1,
  debounceTimer: null,

  setup() {
    this.input = document.querySelector('.search-input');
    this.results = document.querySelector('.search-results');

    this.input.addEventListener('input', () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.doSearch(), 200);
    });

    this.input.addEventListener('keydown', (e) => {
      if (!this.results.classList.contains('visible')) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.items.length - 1);
        this.highlightSelected();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.highlightSelected();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this.selectedIndex >= 0 && this.items[this.selectedIndex]) {
          window.location.href = this.items[this.selectedIndex].url;
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        this.hideResults();
      }
    });

    this.input.addEventListener('focus', () => {
      if (this.input.value.trim() && this.items.length > 0) {
        this.results.classList.add('visible');
      }
    });
  },

  async doSearch() {
    const query = this.input.value.trim();
    if (!query) {
      this.hideResults();
      return;
    }

    const bookmarks = await Bookmarks.search(query);
    this.items = bookmarks.slice(0, 20);
    this.selectedIndex = -1;
    this.renderResults();
  },

  renderResults() {
    this.results.innerHTML = '';

    if (this.items.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'search-result-item';
      empty.style.cursor = 'default';
      empty.style.color = 'var(--text-muted)';
      empty.textContent = 'No bookmarks found';
      this.results.appendChild(empty);
      this.results.classList.add('visible');
      return;
    }

    this.items.forEach((bm, i) => {
      const item = document.createElement('a');
      item.className = 'search-result-item';
      item.href = bm.url;
      item.dataset.index = i;

      const img = document.createElement('img');
      img.src = Bookmarks.getFaviconUrl(bm.url);
      img.alt = '';

      const info = document.createElement('div');
      info.style.cssText = 'flex:1;min-width:0;';

      const title = document.createElement('div');
      title.className = 'search-result-title';
      title.textContent = bm.title || bm.url;

      const url = document.createElement('div');
      url.className = 'search-result-url';
      url.textContent = bm.url;

      info.appendChild(title);
      info.appendChild(url);
      item.appendChild(img);
      item.appendChild(info);

      item.addEventListener('mouseenter', () => {
        this.selectedIndex = i;
        this.highlightSelected();
      });

      this.results.appendChild(item);
    });

    this.results.classList.add('visible');
  },

  highlightSelected() {
    this.results.querySelectorAll('.search-result-item').forEach((el, i) => {
      el.classList.toggle('selected', i === this.selectedIndex);
    });
    const selected = this.results.querySelector('.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  },

  hideResults() {
    this.results.classList.remove('visible');
    this.items = [];
    this.selectedIndex = -1;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Picker.setup();
  ContextMenu.setup();
  Search.setup();
  App.init();
});
