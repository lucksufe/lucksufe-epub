# EPUB Reader

轻量级浏览器端 EPUB 阅读器，无需后端服务，所有解析和渲染均在浏览器中完成。

[English](README.md)

## 功能特性

- **书库管理** — 网格视图展示封面，支持阅读进度指示
- **添加书籍** — 通过浏览器上传 EPUB 文件，或使用附带的 Python 脚本扫描本地目录
- **完整阅读体验** — 分页渲染、可自定义翻页点击区域、键盘导航
- **书签与高亮** — 保存书签，彩色高亮标注文本
- **阅读进度** — 自动保存和恢复阅读位置
- **个性化设置** — 字号、字体、三种主题（浅色 / 护眼 / 深色）
- **键盘快捷键** — 方向键、WASD、空格键翻页
- **中英双语** — 支持中文和英文界面
- **响应式布局** — 适配桌面和移动端

## 快速开始

### 方式一：上传书籍

```bash
cd reader
python3 -m http.server 8000
```

打开 `http://localhost:8000`，点击 **添加到书库** 上传 EPUB 文件。

### 方式二：扫描本地目录

```bash
pip install -r requirements.txt
python scan.py /path/to/your/epub/dir
python3 -m http.server 8000
```

这会生成 `manifest.json` 和封面图片，打开 `http://localhost:8000` 即可看到书库。

## 键盘快捷键

| 按键 | 操作 |
|------|------|
| `←` `↑` `A` `W` | 上一页 |
| `→` `↓` `D` `S` `空格` | 下一页 |
| `Esc` | 关闭面板 |

## 项目结构

```
reader/
  index.html              # 书库页面
  reader.html             # 阅读页面
  css/                    # 样式文件
  js/
    i18n.js               # 国际化（中/英）
    storage.js            # IndexedDB + localStorage
    epub.min.js           # epub.js 库
    jszip.min.js          # JSZip 依赖
    ...
  scan.py                 # 目录扫描工具（Python）
  requirements.txt        # Python 依赖
  books/                  # EPUB 文件和封面
```

## 技术栈

- **epub.js** — EPUB 解析和渲染
- **原生 HTML/CSS/JS** — 无框架，无构建步骤
- **localStorage** — 元数据、进度、书签、设置
- **IndexedDB** — EPUB 文件存储
- **Python + ebooklib** — 可选的目录扫描工具

## 开源协议

MIT
