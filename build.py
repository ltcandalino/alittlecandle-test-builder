#!/usr/bin/env python3
"""Build ALittleCandleTestBuilder.

Combines the files in src/ and vendor/pdfjs/ into single HTML pages:
  ALittleCandleTestBuilder.html  - open it straight from your computer (no logins)
  docker/index.html              - the website the Docker server hands out (logins + sync)

The version comes from the VERSION file.

Run:  python3 build.py
"""
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
SCRIPTS = ['bnk.js', 'pdfimp.js', 'docx.js', 'sync.js', 'icons.js', 'app.js']


def read(*parts):
    with open(os.path.join(ROOT, *parts), encoding='utf-8') as f:
        return f.read()


VERSION = read('VERSION').strip()
assert __import__('re').fullmatch(r'\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?', VERSION), 'VERSION must be semantic, like 1.2.3'
css = read('src', 'style.css')
js = {name: read('src', name) for name in SCRIPTS}
lib = read('vendor', 'pdfjs', 'pdf.min.mjs')
worker = read('vendor', 'pdfjs', 'pdf.worker.min.mjs')
for text in list(js.values()) + [lib, worker]:
    assert '</script' not in text.lower(), 'a script contains </script'


def page(with_config):
    return (
        '<!DOCTYPE html>\n'
        '<html lang="en"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
        '<meta name="version" content="' + VERSION + '">\n<title>ALittleCandleTestBuilder</title>\n'
        '<style>' + css + '</style></head>\n'
        '<body><div id="root"></div><div id="printRoot"></div>\n'
        '<script type="text/plain" id="pdflib">' + lib + '</script>\n'
        '<script type="text/plain" id="pdfworker">' + worker + '</script>\n'
        + '<script>var APP_VERSION=' + repr(VERSION) + ';</script>\n'
        + ('<script src="config.js"></script>\n' if with_config else '')
        + ''.join('<script>' + js[name] + '</script>\n' for name in SCRIPTS)
        + '</body></html>'
    )


def write(path, text):
    with open(os.path.join(ROOT, path), 'w', encoding='utf-8') as f:
        f.write(text)
    print('wrote', path, os.path.getsize(os.path.join(ROOT, path)), 'bytes')


write('ALittleCandleTestBuilder.html', page(False))
write(os.path.join('docker', 'index.html'), page(True))
