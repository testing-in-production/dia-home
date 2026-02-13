# Dia Home — Bookmarks Home Page Extension

## Overview

Manifest V3 Chrome extension for the Dia browser that replaces the new tab page with a curated grid of pinned bookmarks. Minimal, dark-themed, fast-loading.

## Extension Structure

```
dia-home/
  manifest.json        # MV3 manifest
  newtab.html          # New tab override page
  css/style.css        # Dark theme styles
  js/app.js            # Main application logic
  js/storage.js        # Pinned bookmarks persistence (chrome.storage.sync)
  js/bookmarks.js      # Chrome Bookmarks API wrapper
  icons/               # Extension icons (16, 48, 128)
```

No background service worker. No content scripts.

## Manifest Permissions

- `bookmarks` — read bookmark tree
- `storage` — persist pinned IDs via sync storage
- `favicon` — access `chrome://favicon/` for site icons

Override: `chrome_url_overrides.newtab` → `newtab.html`

## Page Layout

Dark theme (`#1a1a2e` background).

- **Search bar** at top — full-width, searches ALL bookmarks via `chrome.bookmarks.search()`. Results in a dropdown below. Enter navigates to selected result.
- **Tile grid** — CSS Grid, responsive columns (`auto-fill, minmax(100px, 1fr)`), centered. Each tile: 32px favicon + site title. Subtle rounded card with hover highlight.
- **'+' tile** — always last in grid. Opens bookmark picker modal.
- **Right-click tile** — context menu with "Remove from Home".
- No drag-to-reorder in v1.

## Bookmark Picker Modal

Triggered by '+' tile. Full bookmark tree browser:

- Folder tree with expandable/collapsible folders
- Filter bar at top narrows by title/URL
- Already-pinned bookmarks show checkmark (toggle to unpin)
- "+ Add" button per bookmark
- Only individual bookmarks can be pinned (not folders)
- Closes on X, outside click, or Escape

## Data Model

Stored in `chrome.storage.sync`:

```json
{
  "pinnedBookmarks": [
    { "id": "42", "order": 0 },
    { "id": "108", "order": 1 }
  ]
}
```

- Store IDs only — fetch fresh title/URL from Bookmarks API on each load
- Handles deleted bookmarks: silently remove stale IDs from pinned list
- Sync storage syncs pinned set across devices

## Search

`chrome.bookmarks.search(query)` across all bookmarks. Results rendered as dropdown list below search bar with favicon + title + URL. Click or Enter to navigate.

## Technology

Vanilla HTML/CSS/JS. No build step, no framework, no dependencies.
