# Picture rules (draft 2, 2026-11-25)

Rules for drawing every picture in Leigh's question banks in LaTeX and saving it as SVG, so SVG files can later replace the
picture files. **Nothing has been replaced.** The sizes below are measured from the drawing commands inside all 80 Regents exam
PDFs in `Regents exams/` (Algebra I, Algebra II, Geometry), not judged by eye; **Draft** marks a choice Leigh hasn't made yet
(list in section 7).

- The rules as LaTeX: `scripts/pictures.sty`. Make the SVGs: `scripts/picture-svg.sh pictures.tex [folder]`.
- Every command used once, with made-up figures: `tests/fixtures/pictures.tex` (checked by `tests/pictures.test.cjs`).
- 56 real pictures drawn this way, beside the originals: `~/Documents/TestBuilderResource/Picture trial/` (`Picture trial.pdf`,
  `.html`, `svg/`, `trial.tex`, `picture survey.csv`, `tools/`). Exam content stays there, out of this public repo.

## 1. What pictures there are

Counted from the 11 current bank files in `Bank files/` (the 16 in `Archive/` are the sources of the combined ones).

| Count | Pictures |
|---|---|
| Places a picture is used | 3,028 |
| Different picture files | 2,930 |
| Different drawings (same pixels after trimming the white edge) | **2,922**: 1,884 in questions, 438 in choices, 600 in answers |
| Picture files in the 22 bank folders | 3,086: 2,107 used, 979 unused ExamView originals kept beside a better PDF cut (`images/examview/`) |
| Only in a bank file, no bank folder | 836 drawings, all BFW Statistics |

Every picture a bank folder uses is also in a bank file; none is missing. Two cuts of the same drawing at different sizes count
as two. **Not in these counts:** 34 older ExamView banks not converted yet (Math A, Math B, Integrated Algebra, Geometry, Algebra
2/Trig, Sequential III) hold 3,552 more pictures, about 3,297 different; Word, PDF and DeltaMath files weren't counted.

### Types and banks

**How sure:** every one of the 2,922 was looked at and put in one type. A second look at 156 picked at random found 1 clear
mistake (fixed) and 3 that could go either way (for example a lone line on a grid: graph or figure), so expect about 1–3% to be
in a neighboring type. The totals are exact.

| Type | All | A2 NG | A1 CC | A1 NG | A2 CC | Geo NG | Geo CC | eMath | BFW | AP Calc | AP Pre | AP Stat | in answers |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Function and context graphs | **419** | 10 | 186 | 31 | 159 |  | 2 |  | 6 | 15 | 9 | 1 | 121 |
| Triangles | **322** | 1 |  |  |  | 40 | 178 | 103 |  |  |  |  | 5 |
| Blank grids and axes | **198** | 3 | 72 | 19 | 48 | 5 | 24 | 25 | 1 |  |  | 1 |  |
| Figures on a coordinate plane | **186** |  | 1 |  | 1 | 24 | 117 | 43 |  |  |  |  | 40 |
| Dot plots | **178** |  | 3 | 3 | 13 |  |  |  | 158 |  |  | 1 | 26 |
| Circles | **151** |  |  |  |  | 9 | 70 | 72 |  |  |  |  | 3 |
| Quadrilaterals and polygons | **146** |  |  |  |  | 7 | 76 | 63 |  |  |  |  | 5 |
| Scatter and residual plots | **141** |  | 17 | 2 | 5 |  |  |  | 112 |  | 2 | 3 | 19 |
| Constructions | **116** |  |  |  |  | 7 | 44 | 65 |  |  |  |  | 33 |
| Histograms | **82** |  | 1 |  | 19 |  |  |  | 51 |  |  | 11 | 13 |
| Normal and other density curves | **80** | 1 |  |  |  |  |  |  | 79 |  |  |  | 60 |
| 3D solids and cross sections | **70** |  |  |  |  | 5 | 49 | 16 |  |  |  |  |  |
| Lines, rays, angles | **67** |  |  |  |  | 1 | 13 | 53 |  |  |  |  |  |
| Box plots | **52** |  | 8 | 7 |  |  |  |  | 34 |  |  | 3 | 9 |
| Inequality graphs | **44** |  | 37 | 7 |  |  |  |  |  |  |  |  | 28 |
| Dimension diagrams (ramp, garden) | **40** |  | 1 |  | 1 | 2 | 26 | 9 |  |  |  | 1 | 2 |
| Bar graphs | **37** |  |  |  |  |  |  |  | 37 |  |  |  | 9 |
| Stem-and-leaf plots | **33** |  |  |  |  |  |  |  | 33 |  |  |  | 8 |
| Transformations without a grid | **32** |  |  |  |  |  | 20 | 12 |  |  |  |  |  |
| Several things in one picture | **22** |  | 6 | 3 | 2 |  |  |  | 11 |  |  |  |  |
| Venn diagrams | **22** |  |  |  | 2 |  |  |  | 20 |  |  |  | 9 |
| Unit circle, rotation angles | **14** | 2 |  |  | 11 |  | 1 |  |  |  |  |  |  |
| Number lines | **12** |  | 3 | 9 |  |  |  |  |  |  |  |  |  |
| Pie charts | **9** |  |  |  | 1 |  |  |  | 8 |  |  |  |  |
| Tile patterns | **8** |  | 8 |  |  |  |  |  |  |  |  |  |  |
| Mapping diagrams | **8** |  | 8 |  |  |  |  |  |  |  |  |  |  |
| Polar graphs | **7** |  |  |  |  |  |  |  |  | 3 | 4 |  |  |
| Flow charts | **6** |  |  |  |  |  | 1 |  | 5 |  |  |  | 6 |
| Slope fields | **4** |  |  |  |  |  |  |  |  | 4 |  |  |  |
| Tree diagrams | **3** |  |  |  |  |  |  |  | 3 |  |  |  | 3 |
| Typed math or text saved as a picture | **223** |  |  |  |  |  | 3 |  | 220 |  |  |  | 171 |
| Tables saved as a picture | **116** |  | 45 | 7 | 7 |  | 1 |  | 56 |  |  |  | 7 |
| Calculator screens | **22** |  | 1 |  | 21 |  |  |  |  |  |  |  | 22 |
| Drawn scenes (trees, people, objects) | **39** |  |  |  | 1 | 4 | 23 | 5 | 2 |  | 4 |  | 1 |
| Photos | **13** |  |  |  |  | 1 | 12 |  |  |  |  |  |  |
| **All** | **2922** | 17 | 397 | 88 | 291 | 105 | 660 | 466 | 836 | 22 | 19 | 21 | 600 |

**What can be drawn:** 2,509 (86%) are math figures these rules cover. 339 (12%) are typed math or tables that shouldn't be pictures at all.
22 are calculator screens, 39 are drawn scenes, 13 are photos (section 5).

**Why it helps most in some banks:** 939 pictures print at under 150 dots per inch, the usual least for sharp print: 746 of BFW's
836, 119 of 660 in Geometry CC, 59 in Algebra CC. An SVG is sharp at any size. The 56 trial SVGs (three fonts each) take 2.0 MB, their originals 1.9 MB.

## 2. Rules for every picture

Lengths are PDF points, 72 to the inch (`bp` in LaTeX).

| What | Rule | Measured |
|---|---|---|
| Ink | black; gray is a tint of black | exam ink is 100% black (`0 0 0 1 K`), grid 30% black |
| Figure lines (sides, circles, solids, axes) | 1 pt | 13,000 lines of 1 pt, by far the most common |
| Graphed functions, inequality boundaries, figures on a grid | 1.5 pt | 580 |
| Right-angle squares, axis ticks, dimension and leader lines, hatching | 0.5 pt | 5,400 |
| Grid | 1 pt, `#C4C5C7` (30% black as it shows on screen and in today's pictures) | 7,700 lines |
| Grid box | 12.1 (geometry, 16 × 16 boxes), 14.7 (large or blank), 18 (Algebra), 13.9 or 9.9 (choices) | the commonest steps |
| Axis arrow | 6.7 × 5 pt, tip 8.8 pt past the grid | 920 |
| Curve arrow | 9.2 × 6.8 pt | Algebra I |
| Data point / labeled point or center | 4 pt / 5 pt across, filled | 4 and 5 pt |
| Open point | 4 pt, white, 0.5 pt edge | |
| Labels (points, sides, angles, axis letters) | 11 pt in the font the user picks; line names italic | 11 pt Arial on all diagrams; 12 pt is the question text |
| Axis numbers | 11 pt, 10 on crowded graphs, 8 when every box is numbered | |
| Axis titles | 11 pt, **bold** name, regular unit: **Age** (in years) | |
| Hidden edges | 1 pt, dash 4 on 4 off | 4,4 |
| Dashed boundary (< or >) | 1.5 pt, dash 8 on 4 off | 8,4 |
| Rotation or auxiliary lines | 1 pt, dash 2 on 2 off | 2,2 |
| Right-angle square | 9 or 12 pt (9 in small figures) | 9 ×19, 12 ×17 |
| Equal-side ticks **Draft** | 7 pt long, 0.5 pt, 3 pt apart | set by eye from three pictures |
| Parallel marks **Draft** | arrowheads 6.6 × 5 pt, 6 pt apart | set by eye |
| Angle arcs **Draft** | 0.5 pt, radius about 16, second arc 3 pt out | set by eye |
| Dimension line | 0.5 pt, 12 pt end bars, text in a white gap | ramp picture |
| Shading | light `#D8D9DA`, medium `#C4C5C7`, dark `#85878B`, so it copies in black and white | the exam's own grays |
| Inequality shading | 0.5 pt lines, 6.5–7.5 pt apart; two regions cross | 6.5 and 7.5 |
| White space | 2 pt around the drawing | |

- **Label distance:** a vertex letter's center is 9 pt from its point, away from the figure. A letter on a grid gets a white
  background. No label touches a line.
- **Color:** none. Colors in the originals (BFW, calculator) become the grays above; two neighboring bars always differ in gray.
- **Font. Decided 2026-11-25:** each user picks the label font in their own settings: **Arial**, **Century Schoolbook** or **Times**.
  Arial and Century Schoolbook: upright letters, regular numbers. Times: bold italic letters, bold numbers, as in eMath. Axis units stay regular. Characters a font lacks
  (′ ℓ) come from Times. Arial is what shows when nothing is picked (**Draft**).
- **One SVG holds all three fonts**, each as outlines: `picture.svg` shows Arial, `picture.svg#schoolbook` and `picture.svg#times` the
  others, at the same size. Tried in Chrome 158 with embedded pictures, server addresses and the canvas the downloads use; Firefox and
  Safari not tried. A browser that ignores the `#` part shows Arial.
- **Size. Decided 2026-11-25:** every picture is drawn at exam size, blank grids too, and the bank's width becomes the SVG's own width. From a
  Regents PDF: the size on the exam. No exam PDF (581 from ExamView, all of BFW): **Draft**, 11 pt labels with the figure in the proportion
  the original has to its labels. Effect: the 975 Regents PDF cuts go from a middle width of 2.35 to 2.95 in and height of 1.77 to 2.31 in,
  so tests get longer. 3 of 213 choices are wider than a 2 × 2 choice column (2.87 in), and 3 pictures are a little wider than an open-response column (6.49 in):
  those shrink to fit.
- **Text** becomes outlines (`--no-fonts`): the SVG looks the same on every computer without the font.
- **Files:** one `.tex` and one `.svg` per picture, named like today's picture (`0126-03.tex`, `0126-03.svg`). The `.tex` is the
  master; nobody edits the SVG by hand.

## 3. How to make one

1. Coordinates come from the exam PDF's own vector data when there is a PDF (`tools/dump.mjs`), otherwise from pixels
   measured on the picture: `flip=k` (k = printed width in points ÷ pixels wide) lets those pixels be typed as they are.
2. Write the `tikzpicture` with the commands in section 4, run `scripts/picture-svg.sh`.
3. **Check, in this order:**
   1. `tools/match.py` lays the two drawings over each other: how much of the old ink is in the new one and the reverse. For a Regents PDF
      picture both should be at least 95%. On a dense grid or hatching it can hardly fail, so it never replaces step 2; also count the grid boxes
      left, right, above and below the axes.
   2. Look at them side by side at print size: every label, point, arrow, tick and shaded region is there and nothing is added.
   3. Read it against the question: every number and letter used in the question is on the picture with the same value; the
      figure's marks agree (a right-angle mark only where the original has one). Data pictures: count the dots or bars
      (trial: 100 dots, 200 in the histogram) and compare with the totals in the question.
   4. Print one page in black and white.

Trial result (Arial): 33 of 56 match at least 95% both ways. Of the 29 cut from Regents PDFs 24 do; the other 5 differ in hatch lines,
label sizes, the axis zigzag, or a label moved off a line. **Below 95% means find out why:** the lowest PDF one turned out to be drawn on the
wrong grid (−5 to 5 instead of −4 to 6) and was fixed. eMath and BFW are restyled on purpose (color to gray, other bar or box heights), the
2 ExamView ones are blurry or hand-drawn. Points read by eye off blurry statistics pictures (the two BFW scatter and box plots)
are the least certain and need the question's data. Every picture was also looked at in all three fonts; labels that touched a line in
one font were moved for all.

## 4. Patterns by type

Inside `plane`, coordinates are graph boxes; elsewhere they are points (1 pt = 1/72 in).

**Function and context graphs** (419). Takes: grid limits, box size, function or points, arrow ends, axis labels.
```latex
\setlength\cell{13.9bp}\begin{plane}{-5}{5}{-5}{5}\planeaxes\draw[both]plot[domain=-2.84:2.84](\x,{3-\x*\x});\end{plane}
\begin{plane}{0}{6}{0}{6}\planeaxesQ[t][d(t)]...\end{plane}   % first quadrant
```
`both` / `one` = arrows at two ends / one. `\opendot`, `\datum` for endpoints. Check: intercepts and turning points land on the same boxes.

**Blank grids and axes** (198). Takes: limits, box, axis letters. `\begin{plane}{-10}{10}{-10}{10}\planeaxes\end{plane}`.
Check: number of boxes each way. Many look alike, so a few files may serve them all (not counted yet).

**Figures on a coordinate plane** (186), **transformations without a grid** (32). Takes: vertices, labels, preimage/image, line or center.
`\draw[curve](2,2)--(3,5)--(7,3)--cycle;` letters with a white background. Check: coordinates against the question.

**Triangles** (322), **quadrilaterals and polygons** (146), **lines, rays, angles** (67), **dimension diagrams** (40).
Takes: points, label directions, marks, lengths.
```latex
\coordinate(A)at(0,0);\coordinate(B)at(100,0);\coordinate(C)at(100,60);\draw(A)--(B)--(C)--cycle;
\rightangle{A}{B}{C} \ticks{A}{C}[2] \parallelmark{A}{B} \anglearc{B}{A}{C}{16}[2] \dimline{0,-20}{100,-20}{10 cm}
\lbl{A}{200}{A}                      % letter A, in the 200° direction; a letter placed by hand: \V{A}
\draw[axis](0,0)--(80,20);           % line with two arrows; [ray1] = ray
```
Check: marks and their count; "not to scale" figures keep the original's shape, not the true measures.

**Circles** (151), **unit circle** (14). `\draw(O)circle[radius=48]; \point{O}`; sector: `\fill[fillA](Q)--(5:48)arc[...]--cycle`.
Check: chords end on the circle, tangents touch once.

**Constructions** (116). Givens: exactly the segments, rays, points given, and the empty space students need (keep the
picture's size). Answers: `\compass{center}{radius}{from}{to}` arcs. Check: arcs cross where the construction needs them.

**3D solids** (70). Outline 1 pt, hidden edges `hidden`, ellipses with the original's height, faces `fillA`–`fillC`, `\dimline`.
Check: which edges are hidden; dimension letters.

**Inequality graphs** (44). `\hatch{(corners)--cycle}{angle}[spacing]` under `\draw[both]` (solid) or `\draw[boundary]` (dashed).
Check: side shaded, solid or dashed.

**Number lines** (12). Axis with ticks, `\opendot` or `\datum`, heavy arrow; fractions `\pfrac[1]{1}{2}`. Check: open or closed, direction.

**Dot plots** (178), **histograms** (82), **bar graphs** (37), **box plots** (52), **scatter and residual plots** (141),
**stem-and-leaf** (33), **pie charts** (9). Takes: the data list, scale, title.
```latex
\foreach\x/\n in{0/1,1/4,2/6}{\foreach\k in{1,...,\n}{\datum{\x,7.4*\k}}}   % dots
\boxplot{height}{min}{Q1}{median}{Q3}{max}                                 % outliers: \datum
```
Histogram bars `fillB`; grouped bars `fillA` and `fillC`; axis titles bold. Axis starting past 0: zigzag, as in the original.
Check: counts and totals, not just looks.

**Normal and density curves** (80). `\normalshade{mean}{sd}{height}{from}{to}` then `\normalcurve{mean}{sd}{height}`. Check: shaded side and limits.

**Venn** (22), **tree** (3), **mapping** (8), **flow charts** (6), **tile patterns** (8), **slope fields** (4), **polar** (7). Plain TikZ with the
section 2 lines. Drawn in the trial: Venn, tree, mapping. Not tried yet: flow chart, tile pattern, slope field, polar, several things in one picture (22: draw each
part, type the tables).

## 5. Not to be redrawn

- **Photos** (13; water tower, Leaning Tower, climbing wall…): stay pictures. Labels and the math on top could be drawn over them.
- **Drawn scenes** (39; trees, people, kite, fan): the triangle and measures can be drawn; the tree or person can't be drawn by rule.
- **Calculator screens** (22, all answers): keep, or replace by the graph they show.
- **Typed math** (223, nearly all BFW answers) and **tables** (116): should become typed math and real tables in the question, not SVG.
- **Handwritten answers:** many of the 121 graph, 40 coordinate and 33 construction answers are scans with someone's handwriting. The figure
  can be redrawn; the written work has to be retyped.

## 6. What must change in the app before SVGs replace pictures

Tried 2026-11-25 with a trial SVG on a scratch copy of the app and a scratch server (nothing in the app was changed): rows 1–5. The other rows
come from reading the code.

| Step | Today | Needed |
|---|---|---|
| Question text (`sanitize`) | an SVG as an `<img>` picture **is kept**; a bare `<svg>` is dropped | nothing; keep dropping bare `<svg>` (scripts in an `<img>` never run) |
| Bank file save and open, print, print preview | **works**, sharp | nothing |
| Word and LaTeX downloads | picture is turned into a PNG at **96 dots per inch of its natural size** (147 × 121 px): blurry | in `prepareImages` (`src/export.js`) draw SVGs at 300 dpi; later real SVG in Word, or the TikZ code in LaTeX |
| Server picture storage | upload of `.svg` **refused (403)** | allow `svg` in `docker/server.js` (upload, read, type). Send it with a sandbox security header: an SVG opened by its own address can run scripts |
| Sync (`hostImages`, `src/sync.js`) | SVGs aren't moved to picture storage, so they stay inside the question; they do sync | add `svg+xml` there, and to `lite()` (change check) |
| Label font (new) | no setting | a personal setting (Arial, Century Schoolbook, Times) saved with the account; add `#schoolbook` or `#times` to SVG picture addresses when drawing the page, printing and downloading. Stored questions keep the plain address, so colleagues see their own font |
| Question height | `htmlInches` guesses an SVG's height as 3/4 of its width | read the SVG's width and height |
| `scripts/bank-file.cjs` | writes `data:image/svg`, not a valid type | write `svg+xml` |
| `scripts/bank-folder.cjs` | a re-run cuts the PNG again | keep the SVG |
| Picture… button, Word import | flatten an SVG to a small JPEG or PNG | keep SVG as it is |
| Saved tests | hold frozen copies, with the old pictures | nothing, but the "questions changed" notice won't notice a new picture |
| Replacing in her banks | open the new bank file: same questions updated. Re-importing the ExamView bank should keep the new pictures (read in the code, not tried) | a backup and a trial bank first |

## 7. Decisions for Leigh

Decided 2026-11-25: the label font is each user's setting; every picture at exam size.

1. **Which font to start with** before someone picks one: Arial, as drawn?
2. **BFW color → black and gray**, as drawn in the trial?
3. **Typed math and tables** (339): turn them into text and real tables instead of SVG?
4. **Handwritten answers:** redraw clean, keep the scans, or leave the answers out of the first round?
5. **Photos, scenes, calculator screens:** keep as pictures?
6. **Older ExamView banks** (about 3,297 more pictures): part of this, or later?
7. **First bank:** suggested Geometry NG 2024–2026 (105 pictures, 84 cut from exam PDFs).
