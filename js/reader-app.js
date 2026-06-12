document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const isTemp = params.get('mode') === 'temp';
  const bookId = params.get('book');

  if (!bookId) {
    window.location.href = 'index.html';
    return;
  }

  let bookRecord = null;
  if (isTemp) {
    bookRecord = {
      id: bookId,
      title: sessionStorage.getItem(bookId + ':title') || 'Local File',
      source: 'local'
    };
  } else {
    bookRecord = getBook(bookId);
    if (!bookRecord) {
      window.location.replace('index.html');
      return;
    }
  }

  // DOM elements
  const viewer = document.getElementById('epub-viewer');
  const header = document.getElementById('reader-header');
  const footer = document.getElementById('reader-footer');
  const headerTitle = document.getElementById('header-title');
  const btnBack = document.getElementById('btn-back');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnToc = document.getElementById('btn-toc');
  const btnBookmarks = document.getElementById('btn-bookmarks');
  const btnSettings = document.getElementById('btn-settings');
  const btnAddBookmark = document.getElementById('btn-add-bookmark');
  const tocSidebar = document.getElementById('toc-sidebar');
  const tocList = document.getElementById('toc-list');
  const bookmarksPanel = document.getElementById('bookmarks-panel');
  const bookmarksList = document.getElementById('bookmarks-list');
  const settingsPanel = document.getElementById('settings-panel');
  const fontSizeDisplay = document.getElementById('font-size-display');
  const fontFamilySelect = document.getElementById('font-family-select');
  const progressSlider = document.getElementById('progress-slider');
  const progressPercent = document.getElementById('progress-percent');
  const currentChapter = document.getElementById('current-chapter');
  const highlightPopup = document.getElementById('highlight-popup');

  // State
  let book, rendition;
  let currentCfi = null;
  let hideTimer = null;
  let activePanel = null;

  // Load settings
  const settings = getSettings();
  let fontSize = parseInt(settings.fontSize) || 100;

  // Initialize book
  try {
    if (isTemp) {
      // Local file mode — read from IndexedDB
      const epubData = await getEpub(bookId);
      if (!epubData) {
        alert('IndexedDB read failed.\nbookId: ' + bookId + '\nDB returned: null');
        window.location.href = 'index.html';
        return;
      }
      book = ePub(epubData.data);
    } else if (bookRecord.source === 'manifest' && bookRecord.filePath) {
      book = ePub(bookRecord.filePath);
    } else {
      const epubData = await getEpub(bookId);
      if (!epubData) {
        alert(t('bookDataNotFound'));
        window.location.href = 'index.html';
        return;
      }
      book = ePub(epubData.data);
    }

    await book.ready;
  } catch (err) {
    alert('Load error:\n' + err.message + '\n\n' + (err.stack || '').slice(0, 300));
    return;
  }

  const effectiveBookId = bookId;
  headerTitle.textContent = bookRecord.title || t('reading');

  // Language toggle
  const btnLang = document.getElementById('btn-lang');
  btnLang.textContent = getLang() === 'zh' ? '中' : 'EN';
  btnLang.addEventListener('click', () => {
    const newLang = getLang() === 'zh' ? 'en' : 'zh';
    setLang(newLang);
    applyI18n();
    btnLang.textContent = newLang === 'zh' ? '中' : 'EN';
    headerTitle.textContent = bookRecord.title || t('reading');
  });

  applyI18n();

  // Create rendition
  rendition = book.renderTo(viewer, {
    width: '100%',
    height: '100%',
    spread: 'auto',
    flow: 'paginated'
  });

  // Keyboard shortcuts
  function handleKeydown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
      case 'a':
      case 'A':
      case 'w':
      case 'W':
        e.preventDefault();
        rendition.prev();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
      case 'd':
      case 'D':
      case 's':
      case 'S':
        e.preventDefault();
        rendition.next();
        break;
      case 'Escape':
        closeAllPanels();
        hideHighlightPopup();
        const help = document.getElementById('shortcuts-help');
        if (help) help.remove();
        break;
    }
  }

  document.addEventListener('keydown', handleKeydown);

  // Mouse wheel page turning
  let wheelTimer = null;
  function handleWheel(e) {
    e.preventDefault();
    if (wheelTimer) return;
    wheelTimer = setTimeout(() => { wheelTimer = null; }, 200);
    if (e.deltaY < 0) {
      rendition.prev();
    } else if (e.deltaY > 0) {
      rendition.next();
    }
  }

  // Bind wheel to parent document (covers nav button areas too)
  document.addEventListener('wheel', handleWheel, { passive: false });

  // Theme colors for iframe override
  const THEME_COLORS = {
    light: { background: '#ffffff', color: '#1a1a1a' },
    sepia: { background: '#f4ecd8', color: '#5b4636' },
    dark:  { background: '#1a1a2e', color: '#e0e0e0' }
  };

  function updateIframeTheme(theme) {
    const colors = THEME_COLORS[theme];
    if (!colors) return;
    const doc = viewer.querySelector('iframe')?.contentDocument;
    if (doc?.body) {
      doc.body.style.setProperty('background', colors.background, 'important');
      doc.body.style.setProperty('color', colors.color, 'important');
    }
  }

  // Bind keyboard and wheel to epub.js iframe content
  rendition.hooks.content.register((contents) => {
    contents.document.addEventListener('keydown', handleKeydown);
    contents.document.addEventListener('wheel', handleWheel, { passive: false });
    updateIframeTheme(settings.theme || 'light');
  });

  // Register themes
  rendition.themes.register('light', {
    body: { background: '#ffffff !important', color: '#1a1a1a !important' }
  });
  rendition.themes.register('sepia', {
    body: { background: '#f4ecd8 !important', color: '#5b4636 !important' }
  });
  rendition.themes.register('dark', {
    body: { background: '#1a1a2e !important', color: '#e0e0e0 !important' }
  });

  // Apply saved settings
  applyTheme(settings.theme || 'light');
  rendition.themes.fontSize(fontSize + '%');
  if (settings.fontFamily) {
    rendition.themes.font(settings.fontFamily);
  }

  // Display book
  const savedProgress = getProgress(effectiveBookId);
  if (savedProgress && savedProgress.cfi) {
    await rendition.display(savedProgress.cfi);
  } else {
    await rendition.display();
  }

  // Generate locations for progress tracking
  book.locations.generate(1024).then(() => {
    if (savedProgress && savedProgress.cfi) {
      const pct = book.locations.percentageFromCfi(savedProgress.cfi);
      updateProgressUI(pct);
    }
  });

  // Load and render highlights
  loadAndRenderHighlights();

  // === Event Handlers ===

  // Relocated — save progress
  rendition.on('relocated', (location) => {
    currentCfi = location.start.cfi;
    const pct = book.locations.percentageFromCfi(location.start.cfi);
    updateProgressUI(pct);
    saveProgress(effectiveBookId, { cfi: location.start.cfi, percentage: pct });
    if (!isTemp) updateBook(effectiveBookId, { lastReadAt: Date.now() });

    // Update active TOC item
    updateActiveTocItem(location.start.href);
  });

  // Text selection — show highlight popup
  rendition.on('selected', (cfiRange) => {
    const highlights = getHighlights(effectiveBookId);
    const existing = highlights.find(h => h.cfi === cfiRange);
    showHighlightPopup(cfiRange, existing);
  });

  // Click on reading area — hide popup and toggle chrome
  rendition.on('click', () => {
    hideHighlightPopup();
    toggleChrome();
  });

  // Shortcuts help button
  document.getElementById('btn-shortcuts').addEventListener('click', toggleShortcutsHelp);

  // Navigation
  btnBack.addEventListener('click', async () => {
    if (isTemp) {
      await deleteEpub(bookId).catch(() => {});
    }
    window.location.href = 'index.html';
  });

  btnPrev.addEventListener('click', () => rendition.prev());
  btnNext.addEventListener('click', () => rendition.next());

  // Shortcuts help overlay
  function toggleShortcutsHelp() {
    let overlay = document.getElementById('shortcuts-help');
    if (overlay) {
      overlay.remove();
      return;
    }
    overlay = document.createElement('div');
    overlay.id = 'shortcuts-help';
    overlay.className = 'shortcuts-overlay';
    overlay.innerHTML = `
      <div class="shortcuts-panel">
        <div class="shortcuts-header">
          <h2>${t('keyboardShortcuts')}</h2>
          <button class="panel-close" onclick="this.closest('.shortcuts-overlay').remove()">&times;</button>
        </div>
        <div class="shortcuts-body">
          <div class="shortcut-row"><kbd>←</kbd><kbd>↑</kbd><kbd>A</kbd><kbd>W</kbd><span>${t('prevPage')}</span></div>
          <div class="shortcut-row"><kbd>→</kbd><kbd>↓</kbd><kbd>D</kbd><kbd>S</kbd><kbd>Space</kbd><span>${t('nextPage')}</span></div>
          <div class="shortcut-row"><kbd>T</kbd><span>${t('tableOfContents')}</span></div>
          <div class="shortcut-row"><kbd>B</kbd><span>${t('bookmarks')}</span></div>
          <div class="shortcut-row"><kbd>S</kbd><span>${t('settings')}</span></div>
          <div class="shortcut-row"><kbd>Esc</kbd><span>${t('closePanel')}</span></div>
        </div>
      </div>
    `;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }

  // Show/hide header and footer
  let chromeVisible = false;

  function showChrome() {
    header.classList.add('visible');
    footer.classList.add('visible');
    chromeVisible = true;
    resetHideTimer();
  }

  function hideChrome() {
    if (activePanel) return;
    if (document.activeElement === progressSlider) return;
    header.classList.remove('visible');
    footer.classList.remove('visible');
    chromeVisible = false;
  }

  function toggleChrome() {
    if (chromeVisible) {
      hideChrome();
    } else {
      showChrome();
    }
  }

  function resetHideTimer() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideChrome, 5000);
  }

  // Mouse move shows chrome temporarily
  viewer.addEventListener('mousemove', () => {
    if (!chromeVisible) showChrome();
    else resetHideTimer();
  });

  // Keep visible while hovering header/footer
  header.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  footer.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  header.addEventListener('mouseleave', () => { if (chromeVisible) resetHideTimer(); });
  footer.addEventListener('mouseleave', () => { if (chromeVisible) resetHideTimer(); });

  // Keep visible while dragging progress slider
  progressSlider.addEventListener('mousedown', () => clearTimeout(hideTimer));
  progressSlider.addEventListener('touchstart', () => clearTimeout(hideTimer));
  progressSlider.addEventListener('mouseup', () => { if (chromeVisible) resetHideTimer(); });
  progressSlider.addEventListener('touchend', () => { if (chromeVisible) resetHideTimer(); });

  // Panel toggles
  btnToc.addEventListener('click', () => togglePanel('toc-sidebar'));
  btnBookmarks.addEventListener('click', () => {
    renderBookmarksList();
    togglePanel('bookmarks-panel');
  });
  btnSettings.addEventListener('click', () => togglePanel('settings-panel'));

  // Panel close buttons
  document.querySelectorAll('.panel-close').forEach(btn => {
    btn.addEventListener('click', () => {
      closePanel(btn.dataset.panel);
    });
  });

  function setNavButtonsVisible(visible) {
    btnPrev.style.display = visible ? '' : 'none';
    btnNext.style.display = visible ? '' : 'none';
  }

  function togglePanel(panelId) {
    if (activePanel === panelId) {
      closePanel(panelId);
    } else {
      closeAllPanels();
      document.getElementById(panelId).classList.add('open');
      activePanel = panelId;
      setNavButtonsVisible(false);
    }
  }

  function closePanel(panelId) {
    document.getElementById(panelId).classList.remove('open');
    if (activePanel === panelId) {
      activePanel = null;
      setNavButtonsVisible(true);
    }
  }

  function closeAllPanels() {
    document.querySelectorAll('.panel.open').forEach(p => p.classList.remove('open'));
    if (activePanel) setNavButtonsVisible(true);
    activePanel = null;
  }

  // TOC
  book.loaded.navigation.then(nav => {
    tocList.innerHTML = '';
    renderTocItems(nav.toc, tocList, 0);
  });

  function renderTocItems(items, container, depth) {
    for (const item of items) {
      const link = document.createElement('a');
      link.href = '#' + item.href;
      link.textContent = item.label.trim();
      link.style.paddingLeft = (16 + depth * 16) + 'px';
      link.addEventListener('click', (e) => {
        e.preventDefault();
        rendition.display(item.href);
        closeAllPanels();
      });
      container.appendChild(link);
      if (item.subitems && item.subitems.length > 0) {
        renderTocItems(item.subitems, container, depth + 1);
      }
    }
  }

  function updateActiveTocItem(href) {
    const links = tocList.querySelectorAll('a');
    links.forEach(link => {
      const linkHref = link.getAttribute('href').slice(1);
      link.classList.toggle('active', href.includes(linkHref));
    });
  }

  // Bookmarks
  btnAddBookmark.addEventListener('click', () => {
    if (!currentCfi) return;
    const bookmarks = getBookmarks(effectiveBookId);
    const label = currentChapter.textContent || t('bookmark');
    bookmarks.push({ cfi: currentCfi, label, createdAt: Date.now() });
    saveBookmarks(effectiveBookId, bookmarks);
    renderBookmarksList();
  });

  function renderBookmarksList() {
    const bookmarks = getBookmarks(effectiveBookId);
    bookmarksList.innerHTML = '';
    if (bookmarks.length === 0) {
      bookmarksList.innerHTML = `<li style="padding:16px;color:var(--text-secondary);font-size:0.875rem;">${t('noBookmarks')}</li>`;
      return;
    }
    for (let i = bookmarks.length - 1; i >= 0; i--) {
      const bm = bookmarks[i];
      const li = document.createElement('li');
      li.className = 'bookmark-item';
      li.innerHTML = `<span class="bookmark-label">${escapeHtml(bm.label)}</span><button class="bookmark-delete" data-index="${i}">&times;</button>`;
      li.addEventListener('click', (e) => {
        if (e.target.closest('.bookmark-delete')) return;
        rendition.display(bm.cfi);
        closeAllPanels();
      });
      li.querySelector('.bookmark-delete').addEventListener('click', () => {
        bookmarks.splice(i, 1);
        saveBookmarks(effectiveBookId, bookmarks);
        renderBookmarksList();
      });
      bookmarksList.appendChild(li);
    }
  }

  // Progress slider
  progressSlider.addEventListener('input', (e) => {
    const pct = e.target.value / 100;
    const cfi = book.locations.cfiFromPercentage(pct);
    if (cfi) rendition.display(cfi);
  });

  function updateProgressUI(pct) {
    const percent = Math.round((pct || 0) * 100);
    progressPercent.textContent = percent + '%';
    progressSlider.value = percent;
  }

  // Settings
  document.getElementById('btn-font-decrease').addEventListener('click', () => {
    fontSize = Math.max(50, fontSize - 10);
    applyFontSize();
  });

  document.getElementById('btn-font-increase').addEventListener('click', () => {
    fontSize = Math.min(200, fontSize + 10);
    applyFontSize();
  });

  function applyFontSize() {
    rendition.themes.fontSize(fontSize + '%');
    fontSizeDisplay.textContent = fontSize + '%';
    settings.fontSize = fontSize + '%';
    saveSettings(settings);
  }

  fontFamilySelect.value = settings.fontFamily || 'Georgia';
  fontFamilySelect.addEventListener('change', () => {
    rendition.themes.font(fontFamilySelect.value);
    settings.fontFamily = fontFamilySelect.value;
    saveSettings(settings);
  });

  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
    });
  });

  function applyTheme(theme) {
    document.body.className = 'reader-body theme-' + theme;
    rendition.themes.select(theme);
    updateIframeTheme(theme);
    // epub.js may re-render asynchronously; re-apply after a frame
    requestAnimationFrame(() => updateIframeTheme(theme));
    settings.theme = theme;
    saveSettings(settings);

    document.querySelectorAll('.theme-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === theme);
    });
  }

  // Click zone size (vw-based, scales with screen)
  const clickZoneSlider = document.getElementById('click-zone-slider');
  const clickZoneDisplay = document.getElementById('click-zone-display');
  let clickZoneSize = parseInt(settings.clickZone) || 8;
  // Migrate old px-based value to vw
  if (clickZoneSize > 25) clickZoneSize = 8;

  function applyClickZone(size) {
    btnPrev.style.width = size + 'vw';
    btnNext.style.width = size + 'vw';
    clickZoneDisplay.textContent = size + '%';
    clickZoneSlider.value = size;
  }

  applyClickZone(clickZoneSize);

  clickZoneSlider.addEventListener('input', () => {
    clickZoneSize = parseInt(clickZoneSlider.value);
    applyClickZone(clickZoneSize);
    settings.clickZone = clickZoneSize;
    saveSettings(settings);
  });

  // Initial theme active state
  document.querySelector(`.theme-btn[data-theme="${settings.theme || 'light'}"]`)?.classList.add('active');

  // Highlight popup
  function showHighlightPopup(cfiRange, existing) {
    hideHighlightPopup();
    highlightPopup.hidden = false;

    // Position popup near selection
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      highlightPopup.style.left = rect.left + 'px';
      highlightPopup.style.top = (rect.top - 40) + 'px';
    }

    // Color buttons
    highlightPopup.querySelectorAll('.highlight-color').forEach(btn => {
      btn.onclick = () => {
        saveHighlight(effectiveBookId, cfiRange, btn.dataset.color);
        rendition.annotations.highlight(cfiRange, { fill: btn.dataset.color }, (e) => {
          // click on highlight
          showHighlightPopup(cfiRange, { cfi: cfiRange, color: btn.dataset.color });
        });
        hideHighlightPopup();
      };
    });

    // Remove button
    const removeBtn = highlightPopup.querySelector('.highlight-remove');
    if (existing) {
      removeBtn.hidden = false;
      removeBtn.onclick = () => {
        removeHighlight(effectiveBookId, cfiRange);
        rendition.annotations.remove(cfiRange, 'highlight');
        hideHighlightPopup();
      };
    } else {
      removeBtn.hidden = true;
    }
  }

  function hideHighlightPopup() {
    highlightPopup.hidden = true;
  }

  function loadAndRenderHighlights() {
    const highlights = getHighlights(effectiveBookId);
    for (const h of highlights) {
      rendition.annotations.highlight(h.cfi, { fill: h.color }, (e) => {
        showHighlightPopup(h.cfi, h);
      });
    }
  }
});
