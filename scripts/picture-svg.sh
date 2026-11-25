#!/bin/bash
# LaTeX pictures -> SVG files. Each tikzpicture becomes one SVG: file-1.svg, file-2.svg, ... (two digits from ten pictures up) (text becomes outlines, so no font is needed to view it)
#   scripts/picture-svg.sh pictures.tex [out folder]
set -euo pipefail
export PATH="/Library/TeX/texbin:$PATH"
here="$(cd "$(dirname "$0")" && pwd)"; src="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; out="${2:-$(dirname "$src")}"
mkdir -p "$out"; out="$(cd "$out" && pwd)"; tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
name="$(basename "$src" .tex)"; cd "$tmp"
TEXINPUTS="$here:$(dirname "$src"):" dvilualatex -interaction=nonstopmode -halt-on-error -output-directory="$tmp" "$src" > log.txt || { grep -A6 '^!' log.txt; exit 1; }
dvisvgm --no-fonts --exact-bbox --bbox=2bp --precision=2 --page=1- --output="$out/$name-%p.svg" "$name.dvi" 2>&1 | grep -iE 'warning|error' || true
ls "$out" | grep -c "^$name-.*\.svg" | sed "s|\$| SVG files in $out|"
