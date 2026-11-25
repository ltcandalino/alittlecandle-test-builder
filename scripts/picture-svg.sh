#!/bin/bash
# LaTeX pictures -> SVG files. Each tikzpicture becomes one SVG: file-1.svg, file-2.svg, ... (two digits from ten pictures up).
# Text becomes outlines, so no font is needed to view it. Each SVG holds the picture in all three label fonts and shows Arial;
# picture.svg#schoolbook and picture.svg#times show the others (picture-merge.py).
#   scripts/picture-svg.sh pictures.tex [out folder]
set -euo pipefail
export PATH="/Library/TeX/texbin:$PATH"
here="$(cd "$(dirname "$0")" && pwd)"; src="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; out="${2:-$(dirname "$src")}"
mkdir -p "$out"; out="$(cd "$out" && pwd)"; tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
name="$(basename "$src" .tex)"; cd "$tmp"
for font in arial schoolbook times; do
  mkdir "$font"
  TEXINPUTS="$here:$(dirname "$src"):" dvilualatex -interaction=nonstopmode -halt-on-error -jobname="$name" -output-directory="$tmp/$font" \
    "\\def\\picfont{$font}\\input{\"$src\"}" > log.txt || { grep -A6 '^!' log.txt; exit 1; }
  grep -i 'missing character' "$font/$name.log" | sort -u | sed "s/^/$font: /" || true
  (cd "$font" && dvisvgm --no-fonts --exact-bbox --bbox=2bp --precision=2 --page=1- --output="%f-%p.svg" "$name.dvi" 2>&1 | grep -iE 'warning|error' || true)
done
python3 "$here/picture-merge.py" "$tmp" "$out"
