#!/bin/bash
# LaTeX pictures -> SVG files. Each tikzpicture becomes one SVG: file-1.svg, file-2.svg, ... (two digits from ten pictures up).
# Text becomes outlines, so no font is needed to view it. Each SVG holds the picture in all three label fonts and shows Arial;
# picture.svg#schoolbook and picture.svg#times show the others (picture-merge.py).
#   scripts/picture-svg.sh pictures.tex [out folder]   or   scripts/picture-svg.sh folder [out folder]
# A folder holds one tikzpicture per .tex file, named like the picture (0126-03.tex -> 0126-03.svg).
set -euo pipefail
export PATH="/Library/TeX/texbin:$PATH"
here="$(cd "$(dirname "$0")" && pwd)"
if [ -d "$1" ]; then
  dir="$(cd "$1" && pwd)"; out="${2:-$dir}"; mkdir -p "$out"; w="$(mktemp -d)"; trap 'rm -rf "$w"' EXIT
  { echo '\documentclass[tikz,multi=tikzpicture,dvisvgm,border=2bp]{standalone}\usepackage{pictures}\begin{document}'
    for f in "$dir"/*.tex; do cat "$f"; done; echo '\end{document}'; } > "$w/p.tex"
  "$0" "$w/p.tex" "$w/svg"; i=0
  n="$(ls "$w/svg" | wc -l)"; ls "$w/svg" > "$w/made"; ls "$dir"/*.tex > "$w/want"
  [ "$n" -eq "$(wc -l < "$w/want")" ] || { echo "pictures and files don't match"; exit 1; }
  paste "$w/made" "$w/want" | while IFS=$'\t' read -r a b; do mv "$w/svg/$a" "$out/$(basename "$b" .tex).svg"; done
  exit 0
fi
src="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"; out="${2:-$(dirname "$src")}"
mkdir -p "$out"; out="$(cd "$out" && pwd)"; tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
name="$(basename "$src" .tex)"; cd "$tmp"
# TikZ puts arrows only on the last line of a \\draw: two lines in one arrowed \\draw would lose the first one's arrows
if grep -nE '\\draw\[[^]]*(tip|axis|both|one|ray1)[^]]*\][^;]*\) *\(' "$src"; then echo "arrows: give each line its own \\draw"; exit 1; fi
for font in arial schoolbook times; do
  mkdir "$font"
  TEXINPUTS="$here:$(dirname "$src"):" dvilualatex -interaction=nonstopmode -halt-on-error -jobname="$name" -output-directory="$tmp/$font" \
    "\\def\\picfont{$font}\\input{\"$src\"}" > log.txt || { grep -A6 '^!' log.txt; exit 1; }
  grep -i 'missing character' "$font/$name.log" | sort -u | sed "s/^/$font: /" || true
  (cd "$font" && dvisvgm --no-fonts --exact-bbox --bbox=2bp --precision=2 --page=1- --output="%f-%p.svg" "$name.dvi" 2>&1 | grep -iE 'warning|error' || true)
done
python3 "$here/picture-merge.py" "$tmp" "$out"
