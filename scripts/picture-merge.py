#!/usr/bin/env python3
"""picture-merge.py <folder with arial/ schoolbook/ times/> <out>: the same picture in three fonts -> one SVG that shows Arial,
or the font named after # in its address. Geometry is kept once per font because labels can have white boxes over the grid."""
import os, re, sys
FONTS = ['schoolbook', 'times', 'arial']  # Arial last: it hides when another one is asked for
CSS = '.v{display:none}#arial{display:inline}#schoolbook:target,#times:target{display:inline}#schoolbook:target~#arial,#times:target~#arial{display:none}'
src, out = sys.argv[1:3]
names = sorted(f for f in os.listdir(src + '/arial') if f.endswith('.svg'))
for n in names:
    parts = []
    for f in FONTS:
        s = open(f'{src}/{f}/{n}', encoding='utf-8').read()
        box = [float(v) for v in re.search(r"viewBox='([^']+)'", s)[1].split()]
        body = s[s.index('>', s.index('<svg ')) + 1:s.rindex('</svg>')].strip()
        body = re.sub(r"(id='|href='#|url\(#)", lambda m: m[1] + f[0] + '-', body)  # ids must not clash
        parts.append((f, box, body))
    # dvisvgm moves each drawing to its own origin; the largest box holds all three, each centered in it
    W, H = max(b[2] for _, b, _ in parts), max(b[3] for _, b, _ in parts)
    g = ''.join(f"<g class='v' id='{f}'><g transform='translate({(W - b[2]) / 2 - b[0]:.2f} {(H - b[3]) / 2 - b[1]:.2f})'>{t}</g></g>\n" for f, b, t in parts)
    with open(f'{out}/{n}', 'w', encoding='utf-8') as o:
        o.write(f"<?xml version='1.0' encoding='UTF-8'?>\n<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' width='{W:.2f}pt' height='{H:.2f}pt' viewBox='0 0 {W:.2f} {H:.2f}'>\n<style>{CSS}</style>\n{g}</svg>\n")
print(len(names), 'SVG files in', out)
