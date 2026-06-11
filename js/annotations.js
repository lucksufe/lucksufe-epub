function saveHighlight(bookId, cfi, color, note) {
  const highlights = getHighlights(bookId);
  const existing = highlights.findIndex(h => h.cfi === cfi);
  if (existing >= 0) {
    highlights[existing].color = color;
    if (note !== undefined) highlights[existing].note = note;
  } else {
    highlights.push({ cfi, color, note: note || '', createdAt: Date.now() });
  }
  saveHighlights(bookId, highlights);
}

function removeHighlight(bookId, cfi) {
  const highlights = getHighlights(bookId).filter(h => h.cfi !== cfi);
  saveHighlights(bookId, highlights);
}

function updateHighlightNote(bookId, cfi, note) {
  const highlights = getHighlights(bookId);
  const h = highlights.find(h => h.cfi === cfi);
  if (h) {
    h.note = note;
    saveHighlights(bookId, highlights);
  }
}
