const BOOKS_KEY = 'reader:books';

function getAllBooks() {
  return getJSON(BOOKS_KEY, []);
}

function saveAllBooks(books) {
  setJSON(BOOKS_KEY, books);
}

function addBook(book) {
  const books = getAllBooks();
  const existing = books.findIndex(b => b.id === book.id);
  if (existing >= 0) {
    books[existing] = { ...books[existing], ...book };
  } else {
    books.push({
      addedAt: Date.now(),
      lastReadAt: Date.now(),
      ...book
    });
  }
  saveAllBooks(books);
  return books;
}

function removeBook(bookId) {
  const books = getAllBooks().filter(b => b.id !== bookId);
  saveAllBooks(books);
  localStorage.removeItem(`reader:progress:${bookId}`);
  localStorage.removeItem(`reader:bookmarks:${bookId}`);
  localStorage.removeItem(`reader:highlights:${bookId}`);
  localStorage.removeItem(`reader:cover:${bookId}`);
  return books;
}

function updateBook(bookId, updates) {
  const books = getAllBooks();
  const idx = books.findIndex(b => b.id === bookId);
  if (idx >= 0) {
    books[idx] = { ...books[idx], ...updates };
    saveAllBooks(books);
  }
  return books;
}

function getBook(bookId) {
  return getAllBooks().find(b => b.id === bookId) || null;
}
