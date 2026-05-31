# Second Brain — Browser Extension

Capture any page or highlighted text to your [Second Brain](https://github.com/rahilp/second-brain-cloudflare) with one click or a keyboard shortcut — without leaving the tab.

---

## Requirements

This extension requires a deployed **Second Brain Cloudflare Worker**. If you haven't set that up yet, start there first:

**[github.com/rahilp/second-brain-cloudflare](https://github.com/rahilp/second-brain-cloudflare)**

The Worker is free to deploy (Cloudflare free tier), takes about 2 minutes via the one-click deploy button, and gives you a Worker URL + auth token you'll need to connect the extension.

---

## What it does

- **Capture the current page** — saves the title and URL to your second brain
- **Capture highlighted text** — select any text on a page before clicking capture; the excerpt is saved alongside the title and URL
- **Add a note** — type context or `#hashtags` in the popup before saving; hashtags are automatically extracted as tags
- **Quick capture** — keyboard shortcut saves the page instantly without opening any popup, with a toast confirmation

---

## Installation

No app store required. Load the extension directly from source in about 60 seconds.

### Chrome / Brave

1. Clone this repo:
   ```bash
   git clone https://github.com/rahilp/second-brain-browser-extension.git
   ```
2. Go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked** and select the cloned folder
5. The Second Brain icon appears in your toolbar — pin it for easy access

### Microsoft Edge

Same steps, but go to `edge://extensions` in step 2 and enable **Developer mode** from the left sidebar.

### Staying up to date

When a new version is released, pull the latest changes and reload the extension:

```bash
git pull
```

Then go to `chrome://extensions` and click the reload icon on the Second Brain card.

---

## Setup

On first install, the extension opens a setup page automatically.

1. Enter your **Worker URL** (e.g. `https://your-worker.workers.dev`)
2. Enter your **Auth Token** (the `AUTH_TOKEN` secret you set when deploying)
3. Click **Connect** — the extension verifies the connection and saves your credentials

To update your settings later, click the gear icon in the popup.

---

## Usage

### Popup
Click the Second Brain icon in your toolbar (or press `Alt+Shift+B`).

| Element | What it does |
|---|---|
| Page info | Shows the title and URL that will be captured |
| Selection badge | Appears when text is highlighted — the excerpt will be included |
| Note field | Optional context to save with the capture. Use `#hashtags` to tag |
| Capture button | Sends to your Second Brain |

### Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Alt+Shift+B` (Mac: `⌥ Shift B`) | Open the popup |
| `Alt+Shift+S` (Mac: `⌥ Shift S`) | Quick capture — saves instantly, no popup |

Quick capture shows a toast notification in the top-right corner of the page confirming the result. You can customise both shortcuts at `chrome://extensions/shortcuts`.

### Capture results

| Result | Meaning |
|---|---|
| **Captured** | Saved successfully |
| **Already in your brain** | Near-duplicate detected — not saved again |
| **Merged / Updated** | Similar existing memory was updated instead |

---

## How content is stored

The extension builds the content string sent to `/capture`:

```
Page title
https://page-url.com

Highlighted: "selected text if any"

Your note with #hashtags
```

Hashtags in the note are extracted as tags by the Worker. The `source` field is set to `"extension"` so you can filter by it in your second brain.

---

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Read the current tab's title and URL |
| `scripting` | Get selected text from the page; inject toast notifications |
| `storage` | Save your Worker URL and auth token locally |
| `host_permissions: <all_urls>` | Make requests to your self-hosted Worker URL (which can be any domain) |

Credentials are stored in `chrome.storage.sync` — they never leave your browser except in requests to your own Worker.

---

## File structure

```
manifest.json      — Extension manifest (MV3)
background.js      — Service worker: handles quick-capture command + toast injection
popup.html/js/css  — Capture popup UI
setup.html/js/css  — First-run setup and settings page
icons/             — Extension icons
```

---

## Related

- [second-brain-cloudflare](https://github.com/rahilp/second-brain-cloudflare) — the Cloudflare Worker this extension connects to
- [second-brain-obsidian-plugin](https://github.com/rahilp/second-brain-obsidian-plugin) — Obsidian plugin
- [second-brain-cli](https://github.com/rahilp/second-brain-cli) — CLI tool

---

## License

MIT
