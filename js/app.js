document.addEventListener('DOMContentLoaded', async () => {
  const shelf = document.getElementById('book-shelf');
  const emptyState = document.getElementById('empty-state');
  const fileInput = document.getElementById('file-input');
  const fileInputLocal = document.getElementById('file-input-local');
  const btnUpload = document.getElementById('btn-upload');
  const btnOpenLocal = document.getElementById('btn-open-local');
  const btnLang = document.getElementById('btn-lang');
  const btnClearCache = document.getElementById('btn-clear-cache');
  const template = document.getElementById('book-card-template');

  btnUpload.addEventListener('click', () => fileInput.click());

  // Clear cache
  btnClearCache.addEventListener('click', async () => {
    if (!confirm(t('clearCacheConfirm'))) return;
    localStorage.clear();
    await new Promise((resolve) => {
      const req = indexedDB.deleteDatabase('EpubReaderDB');
      req.onsuccess = req.onerror = req.onblocked = resolve;
    });
    resetDB();
    renderShelf();
  });
  btnOpenLocal.addEventListener('click', () => fileInputLocal.click());
  fileInput.addEventListener('change', handleFileSelect);
  fileInputLocal.addEventListener('change', handleLocalOpen);

  // Language toggle
  btnLang.textContent = getLang() === 'zh' ? '中' : 'EN';
  btnLang.addEventListener('click', () => {
    const newLang = getLang() === 'zh' ? 'en' : 'zh';
    setLang(newLang);
    applyI18n();
    btnLang.textContent = newLang === 'zh' ? '中' : 'EN';
    renderShelf();
  });

  await loadManifest();
  applyI18n();
  renderShelf();

  function renderShelf() {
    const books = getAllBooks();
    shelf.innerHTML = '';

    if (books.length === 0) {
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    books.sort((a, b) => (b.lastReadAt || 0) - (a.lastReadAt || 0));

    for (const book of books) {
      const card = template.content.cloneNode(true).querySelector('.book-card');
      card.dataset.bookId = book.id;

      const img = card.querySelector('.book-cover img');
      const coverSrc = book.coverUrl || getCover(book.id) || 'img/default-cover.svg';
      img.src = coverSrc;
      img.alt = book.title || 'Untitled';

      card.querySelector('.book-title').textContent = book.title || t('untitled');
      card.querySelector('.book-author').textContent = book.author || t('unknown');

      const progress = getProgress(book.id);
      if (progress && progress.percentage > 0) {
        card.querySelector('.progress-fill').style.width =
          Math.round(progress.percentage * 100) + '%';
      }

      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete')) return;
        updateBook(book.id, { lastReadAt: Date.now() });
        window.location.href = `reader.html?book=${encodeURIComponent(book.id)}`;
      });

      card.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(t('removeConfirm', { title: book.title }))) {
          if (book.source === 'upload') {
            deleteEpub(book.id).catch(() => {});
          }
          removeBook(book.id);
          renderShelf();
        }
      });

      shelf.appendChild(card);
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    fileInput.value = '';

    try {
      const arrayBuffer = await file.arrayBuffer();
      const book = ePub(arrayBuffer);
      await book.ready;

      const meta = book.packaging.metadata;
      const bookId = meta.identifier || generateId();
      const title = meta.title || file.name.replace(/\.epub$/i, '');
      const author = meta.creator || 'Unknown';

      await storeEpub(bookId, arrayBuffer, file.name);

      let coverDataUrl = null;
      try {
        const coverUrl = await book.coverUrl();
        if (coverUrl) {
          const resp = await fetch(coverUrl);
          const blob = await resp.blob();
          coverDataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          setCover(bookId, coverDataUrl);
        }
      } catch {
        // no cover — fallback will be used
      }

      book.destroy();

      addBook({
        id: bookId,
        source: 'upload',
        title,
        author,
        coverUrl: null,
        filePath: null
      });

      renderShelf();
    } catch (err) {
      alert(t('failedToLoad') + err.message);
    }
  }

  async function handleLocalOpen(e) {
    const file = e.target.files[0];
    if (!file) return;
    fileInputLocal.value = '';

    try {
      const arrayBuffer = await file.arrayBuffer();
      resetDB();

      const bookId = generateId();
      const title = file.name.replace(/\.epub$/i, '');

      // Store first
      await storeEpub(bookId, arrayBuffer, file.name);

      // Then try to extract metadata and cover
      let author = t('unknown');
      let coverDataUrl = null;
      try {
        const book = ePub(arrayBuffer);
        await book.ready;
        const meta = book.packaging.metadata;
        if (meta.creator) author = meta.creator;
        try {
          const coverUrl = await book.coverUrl();
          if (coverUrl) {
            const resp = await fetch(coverUrl);
            const blob = await resp.blob();
            coverDataUrl = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
            setCover(bookId, coverDataUrl);
          }
        } catch {}
        book.destroy();
      } catch {}

      addBook({
        id: bookId,
        source: 'upload',
        title,
        author,
        coverUrl: null,
        filePath: null
      });

      renderShelf();
      window.location.href = `reader.html?book=${encodeURIComponent(bookId)}`;
    } catch (err) {
      alert(t('failedToOpen') + err.message);
    }
  }
});
