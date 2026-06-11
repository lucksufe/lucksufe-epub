#!/usr/bin/env python3
"""
Scan a directory for EPUB files and generate manifest.json.

Usage:
    python scan.py /path/to/epub/dir [--output manifest.json] [--covers-dir books/]

Dependencies:
    pip install ebooklib lxml Pillow
"""

import argparse
import hashlib
import json
import os
import sys
from datetime import datetime, timezone

try:
    import ebooklib
    from ebooklib import epub
except ImportError:
    print("Error: ebooklib not installed. Run: pip install ebooklib")
    sys.exit(1)

try:
    from lxml import etree
except ImportError:
    print("Error: lxml not installed. Run: pip install lxml")
    sys.exit(1)

try:
    from PIL import Image
    import io
    HAS_PIL = True
except ImportError:
    HAS_PIL = False


def generate_id(filepath):
    """Generate a stable ID from file path."""
    return hashlib.sha256(filepath.encode()).hexdigest()[:12]


def extract_metadata(book):
    """Extract metadata from an EPUB book."""
    def get_meta(field):
        try:
            val = book.get_metadata('DC', field)
            if val and val[0]:
                return val[0][0] if isinstance(val[0], tuple) else val[0]
        except Exception:
            pass
        return None

    return {
        'title': get_meta('title') or 'Untitled',
        'author': get_meta('creator') or 'Unknown',
        'language': get_meta('language') or '',
        'publisher': get_meta('publisher') or '',
        'description': get_meta('description') or '',
    }


def extract_cover(book, filepath, covers_dir):
    """Try to extract cover image from EPUB. Returns cover filename or None."""
    cover_item = None

    # Method 1: get_item_with_id
    try:
        cover_item = book.get_item_with_id('cover-image')
    except Exception:
        pass

    # Method 2: items with cover-image property
    if not cover_item:
        for item in book.get_items():
            if item.get_type() == ebooklib.ITEM_IMAGE:
                item_name = item.get_name().lower()
                if 'cover' in item_name:
                    cover_item = item
                    break

    # Method 3: OPF meta
    if not cover_item:
        try:
            opf_item = None
            for item in book.get_items():
                if item.get_type() == ebooklib.ITEM_DOCUMENT and item.get_name().endswith('.opf'):
                    opf_item = item
                    break
            if opf_item:
                tree = etree.fromstring(opf_item.get_content())
                ns = {'opf': 'http://www.idpf.org/2007/opf'}
                meta = tree.find('.//opf:meta[@name="cover"]', ns)
                if meta is not None:
                    cover_id = meta.get('content')
                    if cover_id:
                        cover_item = book.get_item_with_id(cover_id)
        except Exception:
            pass

    if not cover_item:
        return None

    try:
        cover_data = cover_item.get_content()
        base_name = os.path.splitext(os.path.basename(filepath))[0]
        # Sanitize filename
        safe_name = "".join(c for c in base_name if c.isalnum() or c in '-_ ').strip()
        cover_filename = f"{safe_name}-cover.jpg"
        cover_path = os.path.join(covers_dir, cover_filename)

        if HAS_PIL:
            img = Image.open(io.BytesIO(cover_data))
            img = img.convert('RGB')
            img.thumbnail((400, 600), Image.LANCZOS)
            img.save(cover_path, 'JPEG', quality=85)
        else:
            # Save as-is (might be PNG/SVG/etc)
            ext = os.path.splitext(cover_item.get_name())[1].lower()
            if ext in ('.jpg', '.jpeg'):
                cover_filename = f"{safe_name}-cover{ext}"
            else:
                cover_filename = f"{safe_name}-cover.png"
            cover_path = os.path.join(covers_dir, cover_filename)
            with open(cover_path, 'wb') as f:
                f.write(cover_data)

        return cover_filename
    except Exception as e:
        print(f"  Warning: Failed to extract cover: {e}")
        return None


def scan_directory(scan_dir, output_path, covers_dir):
    """Walk directory and build manifest."""
    os.makedirs(covers_dir, exist_ok=True)

    books = []
    covers_count = 0

    for root, dirs, files in os.walk(scan_dir):
        for fname in sorted(files):
            if not fname.lower().endswith('.epub'):
                continue

            filepath = os.path.join(root, fname)
            rel_path = os.path.relpath(filepath, os.path.dirname(output_path))

            print(f"Scanning: {fname}")

            try:
                book = epub.read_epub(filepath)
                meta = extract_metadata(book)
                cover_filename = extract_cover(book, filepath, covers_dir)
                if cover_filename:
                    covers_count += 1

                book_id = generate_id(rel_path.replace('\\', '/'))
                file_size = os.path.getsize(filepath)
                last_modified = datetime.fromtimestamp(
                    os.path.getmtime(filepath), tz=timezone.utc
                ).isoformat()

                books.append({
                    'id': book_id,
                    'title': meta['title'],
                    'author': meta['author'],
                    'language': meta['language'],
                    'publisher': meta['publisher'],
                    'description': meta['description'],
                    'filePath': rel_path.replace('\\', '/'),
                    'coverPath': f"{covers_dir}/{cover_filename}" if cover_filename else None,
                    'fileSize': file_size,
                    'lastModified': last_modified,
                })

            except Exception as e:
                print(f"  Warning: Failed to read {fname}: {e}")

    manifest = {
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'books': books,
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\nDone: {len(books)} books scanned, {covers_count} covers extracted")
    print(f"Manifest written to: {output_path}")


def main():
    parser = argparse.ArgumentParser(description='Scan EPUB directory and generate manifest.json')
    parser.add_argument('scan_dir', help='Directory to scan for EPUB files')
    parser.add_argument('--output', '-o', default='manifest.json', help='Output manifest path (default: manifest.json)')
    parser.add_argument('--covers-dir', '-c', default='books', help='Directory for cover images (default: books/)')
    args = parser.parse_args()

    if not os.path.isdir(args.scan_dir):
        print(f"Error: {args.scan_dir} is not a directory")
        sys.exit(1)

    scan_directory(args.scan_dir, args.output, args.covers_dir)


if __name__ == '__main__':
    main()
