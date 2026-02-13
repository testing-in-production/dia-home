# Dia Home

A Chrome extension that replaces the new tab page in [Dia browser](https://dia.com) with a curated, searchable grid of pinned bookmarks — basically Safari's new tab experience, but for Dia. Because I switched browsers and immediately missed having my bookmarks front and center every time I opened a tab.

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Vibe Coded](https://img.shields.io/badge/Vibe-Coded-blueviolet)

## Disclaimer

This extension was ~99% written by Claude (AI). I provided the vibes, the opinions on color palettes ("too purple"), and the rigorous QA process of clicking buttons and saying "looks awesome." I am not entirely sure how half of this works, but I *am* sure it works. Probably. If it doesn't, see below.

## Features

- **Pinned Bookmarks Grid** — Pin your most-used bookmarks as tiles on the new tab page
- **Bookmark Picker** — Browse your full bookmark tree to add pins
- **Search** — Search across all bookmarks with keyboard navigation (Arrow keys + Enter)
- **Right-click to Remove** — Context menu to unpin bookmarks
- **Dark Theme** — Clean, neutral dark interface
- **Sync Storage** — Pinned bookmarks sync across devices via `chrome.storage.sync`

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/testing-in-production/dia-home.git
   ```
2. Open Dia browser and navigate to `dia://extensions` (or `chrome://extensions`)
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked**
5. Select the cloned `dia-home` directory
6. Open a new tab — you should see Dia Home

> **Note:** Dia browser overrides `chrome_url_overrides.newtab`, so this extension uses a background service worker to redirect new tabs to the extension page. We figured this out the hard way so you don't have to.

## Usage

- **Add bookmarks:** Click the `+` tile to open the bookmark picker, then click `+ Add` next to any bookmark
- **Remove bookmarks:** Right-click a tile and select "Remove from Home"
- **Search:** Type in the search bar to find any bookmark, use arrow keys to navigate, press Enter to open
- **Filter in picker:** Use the filter input in the picker modal to narrow down bookmarks

## Architecture

Vanilla HTML/CSS/JS — no build step, no dependencies. Just vibes and `chrome.bookmarks`.

```
dia-home/
├── manifest.json        # MV3 manifest with bookmarks, storage, favicon, tabs permissions
├── background.js        # Service worker for new tab redirect (Dia workaround)
├── newtab.html          # Entry point — new tab page
├── css/
│   └── style.css        # Dark theme stylesheet
├── js/
│   ├── storage.js       # Persistence layer (chrome.storage.sync)
│   ├── bookmarks.js     # Chrome bookmarks API wrapper
│   └── app.js           # UI orchestration (App, Picker, ContextMenu, Search)
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## Compatibility

Built for [Dia browser](https://dia.com) (Chromium-based). Should also work in Chrome and other Chromium browsers, though the background service worker redirect may not be necessary in browsers that honor `chrome_url_overrides.newtab`.

## Feedback

I'm very open to feedback — issues, PRs, strongly worded opinions about my color choices — all welcome. This is genuinely a learning-in-public situation, so if something is broken, dumb, or could be better, please tell me. I promise not to take it personally (my AI coworker might, though).

## License

MIT
