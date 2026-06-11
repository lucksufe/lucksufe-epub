const DB_NAME = 'EpubReaderDB';
const DB_VERSION = 1;
const STORE_NAME = 'epub-files';

let dbPromise = null;

function resetDB() {
  dbPromise = null;
}

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'bookId' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });
  return dbPromise;
}

async function storeEpub(bookId, arrayBuffer, fileName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({
      bookId,
      data: arrayBuffer,
      fileName,
      storedAt: Date.now()
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getEpub(bookId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(bookId);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteEpub(bookId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(bookId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getJSON(key, fallback = null) {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function setJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSettings() {
  return getJSON('reader:settings', {
    theme: 'light',
    fontSize: '100%',
    fontFamily: 'Georgia'
  });
}

function saveSettings(settings) {
  setJSON('reader:settings', settings);
}

function getProgress(bookId) {
  return getJSON(`reader:progress:${bookId}`, null);
}

function saveProgress(bookId, progress) {
  setJSON(`reader:progress:${bookId}`, progress);
}

function getBookmarks(bookId) {
  return getJSON(`reader:bookmarks:${bookId}`, []);
}

function saveBookmarks(bookId, bookmarks) {
  setJSON(`reader:bookmarks:${bookId}`, bookmarks);
}

function getHighlights(bookId) {
  return getJSON(`reader:highlights:${bookId}`, []);
}

function saveHighlights(bookId, highlights) {
  setJSON(`reader:highlights:${bookId}`, highlights);
}

function getCover(bookId) {
  return localStorage.getItem(`reader:cover:${bookId}`);
}

function setCover(bookId, dataUrl) {
  localStorage.setItem(`reader:cover:${bookId}`, dataUrl);
}
