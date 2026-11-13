#!/usr/bin/env python3
"""Prints the CHANGELOG.md section for one version (used for the GitHub Release text).

    python3 scripts/release-notes.py 0.6.0
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
version = sys.argv[1].lstrip('v')
log = open(os.path.join(ROOT, 'CHANGELOG.md'), encoding='utf-8').read()
m = re.search(r'## \[' + re.escape(version) + r'\][^\n]*\n(.*?)(?=\n## \[|\Z)', log, re.S)
if not m or not m.group(1).strip():
    sys.exit(f'No notes for {version} in CHANGELOG.md')
print(m.group(1).strip())
