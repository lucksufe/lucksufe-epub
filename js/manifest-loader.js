async function loadManifest() {
  try {
    const resp = await fetch('manifest.json');
    if (!resp.ok) return;
    const manifest = await resp.json();
    if (!manifest.books || !Array.isArray(manifest.books)) return;

    const books = getAllBooks();
    const existingIds = new Set(books.map(b => b.id));
    let changed = false;

    for (const entry of manifest.books) {
      const existing = books.find(b => b.id === entry.id);
      if (existing) {
        if (existing.source === 'manifest') {
          existing.title = entry.title;
          existing.author = entry.author;
          existing.coverUrl = entry.coverPath;
          existing.filePath = entry.filePath;
          changed = true;
        }
      } else {
        books.push({
          id: entry.id,
          source: 'manifest',
          title: entry.title,
          author: entry.author,
          coverUrl: entry.coverPath,
          filePath: entry.filePath,
          fileSize: entry.fileSize,
          addedAt: Date.now(),
          lastReadAt: 0
        });
        changed = true;
      }
    }

    if (changed) saveAllBooks(books);
  } catch {
    // manifest.json not present or invalid — that's fine
  }
}
