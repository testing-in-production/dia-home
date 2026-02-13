# Dia Home — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Manifest V3 Chrome extension that replaces the new tab page in Dia browser with a curated, searchable grid of pinned bookmarks.

**Architecture:** Vanilla HTML/CSS/JS Chrome extension. `newtab.html` is the entry point, overriding the default new tab. Pinned bookmark IDs stored in `chrome.storage.sync`, bookmark metadata fetched fresh from `chrome.bookmarks` API on each load. Three JS modules: `storage.js` (persistence), `bookmarks.js` (API wrapper), `app.js` (DOM/UI orchestration).

**Tech Stack:** Vanilla JS (ES6+), CSS Grid, Chrome Extensions Manifest V3 APIs (`chrome.bookmarks`, `chrome.storage.sync`, `chrome://favicon/`)

**Design doc:** `docs/plans/2026-02-13-dia-home-bookmarks-design.md`

---

### Task 1: Manifest + HTML Shell

Create the minimal extension that loads as a new tab page in Dia.

**Files:**
- Create: `manifest.json`
- Create: `newtab.html`
- Create: `css/style.css` (empty placeholder)
- Create: `js/app.js` (empty placeholder)
- Create: `js/storage.js` (empty placeholder)
- Create: `js/bookmarks.js` (empty placeholder)
- Create: `icons/` directory with placeholder icons

**Step 1: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Dia Home",
  "version": "1.0.0",
  "description": "A bookmarks home page for Dia browser",
  "permissions": [
    "bookmarks",
    "storage",
    "favicon"
  ],
  "chrome_url_overrides": {
    "newtab": "newtab.html"
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

**Step 2: Create newtab.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Tab</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <div id="app">
    <h1>Dia Home</h1>
  </div>
  <script src="js/storage.js"></script>
  <script src="js/bookmarks.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

**Step 3: Create placeholder CSS and JS files**

- `css/style.css` — empty file
- `js/app.js` — `console.log('Dia Home loaded');`
- `js/storage.js` — empty file
- `js/bookmarks.js` — empty file

**Step 4: Generate placeholder icons**

Create simple SVG-based PNG icons at 16x16, 48x48, 128x128. Can be a simple colored square with "D" letter — just enough for Chrome to accept the manifest.

**Step 5: Verify in Dia**

1. Open Dia browser
2. Go to `dia://extensions` (or `chrome://extensions`)
3. Enable "Developer mode"
4. Click "Load unpacked" → select the `dia-home/` directory
5. Open a new tab
6. Expected: See "Dia Home" heading and "Dia Home loaded" in console

**Step 6: Commit**

```bash
git add manifest.json newtab.html css/ js/ icons/
git commit -m "feat: scaffold extension with manifest and new tab override"
```

---

### Task 2: Storage Module

Build the persistence layer for pinned bookmark IDs.

**Files:**
- Modify: `js/storage.js`

**Step 1: Implement storage.js**

```js
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
```

**Step 2: Verify in Dia**

1. Reload extension on `dia://extensions`
2. Open new tab → open DevTools console
3. Run: `await Storage.addPin('test1')` → should return `[{id: 'test1', order: 0}]`
4. Run: `await Storage.addPin('test2')` → should return array with 2 items
5. Run: `await Storage.getPinned()` → should return both items
6. Run: `await Storage.removePin('test1')` → should return `[{id: 'test2', order: 0}]`
7. Run: `await Storage.isPinned('test2')` → should return `true`

**Step 3: Commit**

```bash
git add js/storage.js
git commit -m "feat: add storage module for pinned bookmark persistence"
```

---

### Task 3: Bookmarks API Wrapper

Build the wrapper around Chrome's bookmarks API.

**Files:**
- Modify: `js/bookmarks.js`

**Step 1: Implement bookmarks.js**

```js
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
```

**Step 2: Verify in Dia**

1. Reload extension
2. Open new tab → DevTools console
3. Run: `await Bookmarks.getTree()` → should return bookmark tree array
4. Run: `await Bookmarks.search('google')` → should return matching bookmarks (if any exist)
5. Pick an ID from the tree and run: `await Bookmarks.getById('5')` → should return bookmark object
6. Run: `await Bookmarks.getById('999999')` → should return `null`

**Step 3: Update manifest for favicon access**

The `_favicon` API requires the `favicon` permission which we already have in manifest.json. Verify the `getFaviconUrl` function works by checking a URL in an `<img>` tag.

**Step 4: Commit**

```bash
git add js/bookmarks.js
git commit -m "feat: add bookmarks API wrapper module"
```

---

### Task 4: Dark Theme CSS

Build the complete dark theme stylesheet.

**Files:**
- Modify: `css/style.css`

**Step 1: Implement style.css**

```css
/* css/style.css */

*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-card: #0f3460;
  --bg-card-hover: #1a4a7a;
  --bg-input: #16213e;
  --bg-modal: #1a1a2e;
  --bg-overlay: rgba(0, 0, 0, 0.6);
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0b0;
  --text-muted: #6a6a80;
  --border: #2a2a4a;
  --accent: #4a9eff;
  --accent-hover: #6ab4ff;
  --danger: #ff4a6a;
  --radius: 10px;
  --radius-sm: 6px;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
}

/* ---- Search Bar ---- */

.search-container {
  max-width: 640px;
  margin: 48px auto 40px;
  padding: 0 24px;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 44px;
  font-size: 15px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-primary);
  outline: none;
  transition: border-color 0.15s;
}

.search-input::placeholder {
  color: var(--text-muted);
}

.search-input:focus {
  border-color: var(--accent);
}

.search-icon {
  position: absolute;
  left: 38px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  color: var(--text-muted);
  pointer-events: none;
}

/* ---- Search Results Dropdown ---- */

.search-results {
  position: absolute;
  top: 100%;
  left: 24px;
  right: 24px;
  margin-top: 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  max-height: 360px;
  overflow-y: auto;
  z-index: 100;
  display: none;
}

.search-results.visible {
  display: block;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  cursor: pointer;
  text-decoration: none;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
}

.search-result-item:last-child {
  border-bottom: none;
}

.search-result-item:hover,
.search-result-item.selected {
  background: var(--bg-card);
}

.search-result-item img {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.search-result-title {
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.search-result-url {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ---- Tile Grid ---- */

.tile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 16px;
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px 48px;
}

.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 8px;
  background: var(--bg-card);
  border-radius: var(--radius);
  cursor: pointer;
  text-decoration: none;
  color: var(--text-primary);
  transition: background 0.15s, transform 0.1s;
  user-select: none;
}

.tile:hover {
  background: var(--bg-card-hover);
  transform: translateY(-2px);
}

.tile img {
  width: 32px;
  height: 32px;
}

.tile-title {
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  color: var(--text-secondary);
}

.tile-add {
  border: 2px dashed var(--border);
  background: transparent;
  color: var(--text-muted);
  font-size: 28px;
  justify-content: center;
  min-height: 88px;
}

.tile-add:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: transparent;
  transform: translateY(-2px);
}

/* ---- Context Menu ---- */

.context-menu {
  position: fixed;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 4px 0;
  z-index: 200;
  min-width: 180px;
  display: none;
}

.context-menu.visible {
  display: block;
}

.context-menu-item {
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
  color: var(--text-primary);
}

.context-menu-item:hover {
  background: var(--bg-card);
}

.context-menu-item.danger {
  color: var(--danger);
}

/* ---- Modal (Bookmark Picker) ---- */

.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
  z-index: 300;
  display: none;
  align-items: center;
  justify-content: center;
}

.modal-overlay.visible {
  display: flex;
}

.modal {
  background: var(--bg-modal);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  width: 480px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h2 {
  font-size: 16px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.modal-close:hover {
  background: var(--bg-card);
  color: var(--text-primary);
}

.modal-filter {
  padding: 12px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-filter input {
  width: 100%;
  padding: 8px 12px;
  font-size: 14px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-primary);
  outline: none;
}

.modal-filter input:focus {
  border-color: var(--accent);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

/* ---- Bookmark Tree ---- */

.tree-folder {
  user-select: none;
}

.tree-folder-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}

.tree-folder-header:hover {
  background: var(--bg-secondary);
}

.tree-folder-arrow {
  font-size: 10px;
  transition: transform 0.15s;
  width: 16px;
  text-align: center;
}

.tree-folder.collapsed .tree-folder-arrow {
  transform: rotate(-90deg);
}

.tree-folder.collapsed .tree-folder-children {
  display: none;
}

.tree-folder-children {
  padding-left: 16px;
}

.tree-bookmark {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 20px;
  font-size: 13px;
  color: var(--text-primary);
}

.tree-bookmark:hover {
  background: var(--bg-secondary);
}

.tree-bookmark img {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.tree-bookmark-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tree-bookmark-action {
  flex-shrink: 0;
  padding: 2px 10px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--accent);
  cursor: pointer;
}

.tree-bookmark-action:hover {
  background: var(--bg-card);
}

.tree-bookmark-action.pinned {
  color: var(--text-muted);
  border-color: transparent;
  cursor: default;
}

/* ---- Scrollbar ---- */

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--text-muted);
}
```

**Step 2: Verify in Dia**

Reload extension, open new tab. Page should have dark background. Styles won't be visible yet since we have no DOM elements using them — but verify the dark background color applies to `body`.

**Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: add dark theme stylesheet"
```

---

### Task 5: HTML Structure

Build the complete HTML structure in newtab.html with all containers.

**Files:**
- Modify: `newtab.html`

**Step 1: Update newtab.html with full structure**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Tab</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- Search -->
  <div class="search-container">
    <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
    <input type="text" class="search-input" placeholder="Search bookmarks..." autofocus>
    <div class="search-results"></div>
  </div>

  <!-- Bookmark Grid -->
  <div class="tile-grid" id="tile-grid"></div>

  <!-- Right-click Context Menu -->
  <div class="context-menu" id="context-menu">
    <div class="context-menu-item danger" id="ctx-remove">Remove from Home</div>
  </div>

  <!-- Bookmark Picker Modal -->
  <div class="modal-overlay" id="picker-overlay">
    <div class="modal" id="picker-modal">
      <div class="modal-header">
        <h2>Add Bookmark</h2>
        <button class="modal-close" id="picker-close">&times;</button>
      </div>
      <div class="modal-filter">
        <input type="text" id="picker-filter" placeholder="Filter bookmarks...">
      </div>
      <div class="modal-body" id="picker-body"></div>
    </div>
  </div>

  <script src="js/storage.js"></script>
  <script src="js/bookmarks.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

**Step 2: Verify in Dia**

Reload extension, open new tab. Should see:
- Dark background
- Search bar with magnifying glass icon at top
- Empty grid area
- No modal visible
- Context menu hidden

**Step 3: Commit**

```bash
git add newtab.html
git commit -m "feat: add complete HTML structure for new tab page"
```

---

### Task 6: Tile Grid Rendering

Implement the main grid: render pinned bookmarks as tiles and the '+' add button.

**Files:**
- Modify: `js/app.js`

**Step 1: Implement tile grid rendering in app.js**

```js
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
```

**Step 2: Verify in Dia**

Reload extension, open new tab. Should see:
- Empty grid with just the '+' tile (dashed border, plus sign)
- '+' tile click will error in console since `Picker` doesn't exist yet — that's expected

**Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: render pinned bookmarks as tile grid with add button"
```

---

### Task 7: Bookmark Picker Modal

Implement the modal that lets users browse and pin/unpin bookmarks.

**Files:**
- Modify: `js/app.js` (add Picker object)

**Step 1: Add Picker to app.js (append after App object)**

```js
// Append to js/app.js after App object and before DOMContentLoaded

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
    arrow.textContent = '▼';

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
      btn.textContent = '✓';
      btn.classList.add('pinned');
    } else {
      btn.textContent = '+ Add';
      btn.addEventListener('click', async () => {
        await Storage.addPin(bookmark.id);
        await App.loadPinnedBookmarks();
        App.renderGrid();
        App.setupAddButton();
        btn.textContent = '✓';
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
```

**Step 2: Update DOMContentLoaded in app.js**

Replace the DOMContentLoaded block:

```js
document.addEventListener('DOMContentLoaded', () => {
  Picker.setup();
  App.init();
});
```

**Step 3: Verify in Dia**

1. Reload extension, open new tab
2. Click '+' tile → modal should appear with your bookmark tree
3. Type in the filter → bookmarks should filter
4. Click "+ Add" on a bookmark → it should appear in the grid behind the modal
5. Close modal (X, Escape, or click overlay) → grid should show the added bookmark
6. Click '+' again → previously added bookmark should show ✓

**Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: add bookmark picker modal with tree browser and filtering"
```

---

### Task 8: Right-Click Context Menu

Add right-click "Remove from Home" on bookmark tiles.

**Files:**
- Modify: `js/app.js` (add ContextMenu object, wire into App)

**Step 1: Add ContextMenu object to app.js (before DOMContentLoaded)**

```js
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
        ContextMenu.attachToTiles();
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
```

**Step 2: Wire ContextMenu into App.renderGrid**

Add `ContextMenu.attachToTiles()` at the end of `App.renderGrid()`.

**Step 3: Update DOMContentLoaded**

```js
document.addEventListener('DOMContentLoaded', () => {
  Picker.setup();
  ContextMenu.setup();
  App.init();
});
```

**Step 4: Verify in Dia**

1. Reload extension, open new tab
2. Pin a few bookmarks via the picker
3. Right-click a tile → context menu should appear at cursor with "Remove from Home"
4. Click "Remove from Home" → tile should disappear from grid
5. Click elsewhere → context menu should hide
6. Right-click on empty space → no context menu

**Step 5: Commit**

```bash
git add js/app.js
git commit -m "feat: add right-click context menu to remove pinned bookmarks"
```

---

### Task 9: Search Bar

Implement search across all bookmarks with dropdown results.

**Files:**
- Modify: `js/app.js` (add Search object, wire into DOMContentLoaded)

**Step 1: Add Search object to app.js (before DOMContentLoaded)**

```js
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
```

**Step 2: Update DOMContentLoaded**

```js
document.addEventListener('DOMContentLoaded', () => {
  Picker.setup();
  ContextMenu.setup();
  Search.setup();
  App.init();
});
```

**Step 3: Verify in Dia**

1. Reload extension, open new tab
2. Type in search bar → dropdown should appear with matching bookmarks
3. Arrow keys should navigate results (highlighted row)
4. Enter should navigate to selected bookmark
5. Click a result → should navigate to that URL
6. Click outside → dropdown should close
7. Clear search → dropdown should hide

**Step 4: Commit**

```bash
git add js/app.js
git commit -m "feat: add search bar with keyboard navigation and dropdown results"
```

---

### Task 10: Polish & Final Verification

Final touches and end-to-end testing.

**Files:**
- Possibly modify: any file for small fixes

**Step 1: Add empty-state message**

If no bookmarks are pinned yet, show a friendly message in the grid area. Add to `App.renderGrid()`, before the '+' tile:

```js
if (this.pinnedData.length === 0) {
  const empty = document.createElement('div');
  empty.style.cssText = 'grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 24px; font-size: 14px;';
  empty.textContent = 'Click + to pin your favorite bookmarks';
  grid.appendChild(empty);
}
```

**Step 2: Handle Escape key properly**

Ensure Escape closes context menu too (not just modal). Already handled by document click listener, but double check.

**Step 3: End-to-end verification in Dia**

Full walkthrough:
1. Open new tab → see search bar, empty state message, '+' tile
2. Click '+' → picker modal opens with full bookmark tree
3. Filter bookmarks in picker → tree filters
4. Add 5+ bookmarks → tiles appear in grid
5. Close modal → grid shows all pinned bookmarks with favicons
6. Right-click a tile → "Remove from Home" context menu
7. Remove a bookmark → tile disappears, grid re-renders
8. Search for a bookmark → dropdown with results
9. Arrow keys + Enter → navigates to bookmark
10. Close tab, open new tab → pinned bookmarks persist
11. Verify no console errors

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add empty state message and polish"
```

---

## Summary

| Task | What | Files |
|------|------|-------|
| 1 | Manifest + HTML shell | `manifest.json`, `newtab.html`, `css/`, `js/`, `icons/` |
| 2 | Storage module | `js/storage.js` |
| 3 | Bookmarks API wrapper | `js/bookmarks.js` |
| 4 | Dark theme CSS | `css/style.css` |
| 5 | HTML structure | `newtab.html` |
| 6 | Tile grid rendering | `js/app.js` |
| 7 | Bookmark picker modal | `js/app.js` |
| 8 | Right-click context menu | `js/app.js` |
| 9 | Search bar | `js/app.js` |
| 10 | Polish & final verification | various |
