#!/usr/bin/env python3
"""Build ALittleCandleTestBuilder.

Combines the files in src/, vendor/pdfjs/ and vendor/fonts/ into single HTML pages:
  ALittleCandleTestBuilder.html  - open it straight from your computer (no logins)
  docker/index.html              - the website the Docker server hands out (logins + sync)

The version comes from the VERSION file.

Run:  python3 build.py
"""
import base64
import os
import urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'src')
SCRIPTS = ['bnk.js', 'pdfimp.js', 'docx.js', 'sync.js', 'icons.js', 'export.js', 'app.js']


def read(*parts):
    with open(os.path.join(ROOT, *parts), encoding='utf-8') as f:
        return f.read()


VERSION = read('VERSION').strip()
assert __import__('re').fullmatch(r'\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?', VERSION), 'VERSION must be semantic, like 1.2.3'
FONTS = {'Atkinson Hyperlegible Next': 'atkinson-hyperlegible-next', 'OpenDyslexic': 'opendyslexic'}


def font_faces():
    out = []
    for family, stem in FONTS.items():
        for weight in (400, 700):
            for style in ('normal', 'italic'):
                with open(os.path.join(ROOT, 'vendor', 'fonts', f'{stem}-latin-{weight}-{style}.woff2'), 'rb') as f:
                    data = base64.b64encode(f.read()).decode()
                out.append(f"@font-face{{font-family:'{family}';font-style:{style};font-weight:{weight};font-display:swap;"
                           f"src:url(data:font/woff2;base64,{data}) format('woff2')}}")
    return '\n'.join(out) + '\n'


css = font_faces() + read('src', 'style.css')
ICON = read('src', 'icon.svg').strip()
ICON_URL = 'data:image/svg+xml,' + urllib.parse.quote(ICON, safe=" =:/'")
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
        '<link rel="icon" type="image/svg+xml" href="' + ICON_URL.replace('"', '&quot;') + '">\n'
        '<style>' + css + '</style></head>\n'
        '<body><div id="root"></div><div id="printRoot"></div>\n'
        '<script type="text/plain" id="pdflib">' + lib + '</script>\n'
        '<script type="text/plain" id="pdfworker">' + worker + '</script>\n'
        + '<script>var APP_VERSION=' + repr(VERSION) + ';var BRAND_SVG=' + repr(ICON) + ';</script>\n'
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
