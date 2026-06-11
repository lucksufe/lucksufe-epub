# EPUB Reader

A lightweight, browser-based EPUB reader. No server-side processing — all parsing and rendering happens in the browser.

## Features

- **Book Library** — Grid view with cover images, reading progress indicators
- **Two Ways to Add Books** — Upload via browser, or scan a local directory with the included Python script
- **Full Reading Experience** — Paginated rendering, page-turn click zones (customizable), keyboard navigation
- **Bookmarks & Highlights** — Save bookmarks, highlight text with color annotations
- **Reading Progress** — Automatically saves and restores your position
- **Customizable** — Font size, font family, three themes (Light / Sepia / Dark)
- **Keyboard Shortcuts** — Arrow keys, WASD, Space for navigation
- **i18n** — Chinese and English interface
- **Responsive** — Works on desktop and mobile

## Quick Start

### Option 1: Upload Books

```bash
cd reader
python3 -m http.server 8000
```

Open `http://localhost:8000`, click **Open Local File** or **Add to Library** to upload an EPUB.

### Option 2: Scan Local Directory

```bash
pip install -r requirements.txt
python scan.py /path/to/your/epub/dir
python3 -m http.server 8000
```

This generates `manifest.json` and cover images. Open `http://localhost:8000` to see your books.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` `↑` `A` `W` | Previous page |
| `→` `↓` `D` `S` `Space` | Next page |
| `Esc` | Close panel |

## Project Structure

```
reader/
  index.html              # Library page
  reader.html             # Reader page
  css/                    # Styles
  js/
    i18n.js               # Internationalization (zh/en)
    storage.js            # IndexedDB + localStorage
    epub.min.js           # epub.js library
    jszip.min.js          # JSZip dependency
    ...
  scan.py                 # Directory scanner (Python)
  requirements.txt        # Python dependencies
  books/                  # EPUB files and covers
```

## Tech Stack

- **epub.js** — EPUB parsing and rendering
- **Vanilla HTML/CSS/JS** — No framework, no build step
- **localStorage** — Metadata, progress, bookmarks, settings
- **IndexedDB** — EPUB file storage
- **Python + ebooklib** — Optional directory scanner

## License

MIT
