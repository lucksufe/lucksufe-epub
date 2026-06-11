const I18N = {
  zh: {
    // Common
    appTitle: 'EPUB Reader',
    untitled: '未命名',
    unknown: '未知作者',

    // Library
    addToLibrary: '添加到书库',
    noBooks: '还没有书',
    noBooksHint: '上传 EPUB 文件，或通过扫描脚本添加书籍',
    remove: '移除',
    removeConfirm: '确定移除「{{title}}」？',
    failedToLoad: '加载 EPUB 失败：',
    clearCache: '清除缓存',
    clearCacheConfirm: '确定清除所有缓存数据？这会删除所有已添加的书籍和阅读进度。',

    // Reader
    readingTitle: '阅读 - EPUB Reader',
    previous: '上一页',
    next: '下一页',
    tableOfContents: '目录',
    bookmarks: '书签',
    settings: '设置',
    addBookmark: '+ 添加书签',
    noBookmarks: '暂无书签',
    fontSize: '字号',
    font: '字体',
    theme: '主题',
    light: '浅色',
    sepia: '护眼',
    dark: '深色',
    yellow: '黄色',
    green: '绿色',
    blue: '蓝色',
    red: '红色',
    removeHighlight: '移除高亮',
    bookNotFound: '未找到书籍',
    sessionExpired: '会话已过期，请重新打开文件。',
    bookDataNotFound: '未找到书籍数据，请重新上传。',
    failedToLoadBook: '加载书籍失败：',
    reading: '阅读中',
    bookmark: '书签',
    keyboardShortcuts: '键盘快捷键',
    prevPage: '上一页',
    nextPage: '下一页',
    showShortcuts: '显示快捷键',
    closePanel: '关闭面板',
    clickZone: '翻页区域大小'
  },
  en: {
    // Common
    appTitle: 'EPUB Reader',
    untitled: 'Untitled',
    unknown: 'Unknown',

    // Library
    addToLibrary: 'Add to Library',
    noBooks: 'No books yet',
    noBooksHint: 'Upload an EPUB file or add books via the scan script',
    remove: 'Remove',
    removeConfirm: 'Remove "{{title}}"?',
    failedToLoad: 'Failed to load EPUB: ',
    clearCache: 'Clear cache',
    clearCacheConfirm: 'Clear all cached data? This will remove all added books and reading progress.',

    // Reader
    readingTitle: 'Reading - EPUB Reader',
    previous: 'Previous',
    next: 'Next',
    tableOfContents: 'Table of Contents',
    bookmarks: 'Bookmarks',
    settings: 'Settings',
    addBookmark: '+ Add Bookmark',
    noBookmarks: 'No bookmarks yet',
    fontSize: 'Font Size',
    font: 'Font',
    theme: 'Theme',
    light: 'Light',
    sepia: 'Sepia',
    dark: 'Dark',
    yellow: 'Yellow',
    green: 'Green',
    blue: 'Blue',
    red: 'Red',
    removeHighlight: 'Remove highlight',
    bookNotFound: 'Book not found',
    sessionExpired: 'Session expired. Please re-open the file.',
    bookDataNotFound: 'Book data not found. Please re-upload.',
    failedToLoadBook: 'Failed to load book: ',
    reading: 'Reading',
    bookmark: 'Bookmark',
    keyboardShortcuts: 'Keyboard Shortcuts',
    prevPage: 'Previous page',
    nextPage: 'Next page',
    showShortcuts: 'Show shortcuts',
    closePanel: 'Close panel',
    clickZone: 'Click zone size'
  }
};

function getLang() {
  return localStorage.getItem('reader:lang') || 'zh';
}

function setLang(lang) {
  localStorage.setItem('reader:lang', lang);
}

function t(key, vars) {
  const lang = getLang();
  let str = (I18N[lang] && I18N[lang][key]) || I18N.zh[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(`{{${k}}}`, v);
    }
  }
  return str;
}

function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  // Update html lang
  document.documentElement.lang = getLang() === 'zh' ? 'zh-CN' : 'en';
}
