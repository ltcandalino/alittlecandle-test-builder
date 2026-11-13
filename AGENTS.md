# AGENTS.md: working notes for AI agents (Claude Code, Cowork, others)

Read this first. It records how the project is built, what's done, what's next, and the rules for
changing it, so a new session can pick up without re-discovering everything.
**Keep it current:** update "Status", "Backlog" and "Work log" at the end of every working session.

## The user

Leigh Candalino, high school math teacher (Geometry, Algebra 1, Algebra 2, Pre-Calculus).
Not a developer: explain changes in plain language, name the buttons she'll click, and keep
technical detail out of her way. Prints paper tests. Previously used ExamView/ExamGen.

## Rules for every change

1. Edit `src/`, then `python3 build.py`. Commit the rebuilt `ALittleCandleTestBuilder.html` and
   `docker/index.html` with the source change.
2. Run `npm test` (smoke test, see Testing). Look at the PDFs in `tests/out/` when layout changed.
3. Add a line under **[Unreleased]** in `CHANGELOG.md` (Added / Changed / Fixed / Removed).
4. Significant change → update `README.md`, the matching page(s) in `wiki/`, and `docker/README.md`
   if the server or setup changed. Never edit the GitHub wiki directly (the workflow overwrites it).
5. Update this file's Status / Backlog / Work log.
6. Commit with a clear message. Don't push unless asked.
7. Saved user data must keep loading: when settings or question fields change, migrate old data
   (`migrateSettings`, `normalize` in `src/app.js`) instead of breaking it.

## Repo map

| Path | What |
|---|---|
| `src/app.js` | The whole UI and logic (~150 KB, vanilla JS, no framework, no build step besides concatenation). |
| `src/bnk.js` | ExamView `.bnk` parser → `BNK.parse(buf, name)` → `{title, questions, warnings, found}`. |
| `src/pdfimp.js` | PDF import helpers on pdf.js: `PDFIMP.open/cropAll/clip/thumb/imgHtml`. |
| `src/docx.js` | Word import: `DOCX.parse(buf, name)` → `{questions, header}`. |
| `src/sync.js` | `CLOUD` module: login + sync against a Supabase-style REST API (Supabase or our Docker server). |
| `src/icons.js` | `LESSON_ICONS` {compass, ruler, trace}: base64 PNGs from the user's Lesson template. |
| `src/style.css` | App styles + print styles. |
| `vendor/pdfjs/` | pdf.js 6.2.108 legacy build (inlined as `text/plain` scripts). |
| `build.py` | Concatenates everything into `ALittleCandleTestBuilder.html` (no config) and `docker/index.html` (loads `config.js`). |
| `docker/server.js` | Node 22 server, no npm deps (`node:sqlite`, scrypt). Serves the app + a Supabase-subset API. |
| `docker/` | Dockerfile, compose (app + Caddy for HTTPS), Caddyfile, README (setup guide for the user). |
| `supabase/` | Alternative hosting: GitHub Pages + Supabase (`setup.sql`, `config.example.js`). Not in active use. |
| `wiki/` | User guide, published by `.github/workflows/wiki.yml`. |
| `.github/workflows/docker.yml` | Build, smoke-test and push image to `ghcr.io/<owner>/<repo>`. |
| `tests/smoke.cjs` | Playwright smoke test. |

## Architecture notes

### App (`src/app.js`)
- Global `state` {questions, selected, settings, courses, course, courseTests, …} saved to IndexedDB
  (db `test-builder`, key `state` or `state:<uid>` when signed in); UI prefs in localStorage `tb-ui`.
  `persist()` is debounced 1.2 s and flushed on unload.
- Tabs: Question bank (`renderBank`), Build & print (`renderBuild`, `drawSel`, `drawPreview`),
  Import & backup (`renderIO`).
- Courses: each course has its own questions and its own `settings` (stored in `state.courseTests`,
  swapped by `switchCourse`).
- Question fields: course, bank, source, unit, section, part, topic, subtopic, standard, cluster,
  ref (MMYYQQ → month/year/qnum via `parseRef`/`fillMeta`; month ∈ 01/06/08), notes, points, type
  (`mc` `bm` `tf` `sa` `es`), html, choices[], answer, inImage, lockChoices, space, lines, answerArea.
  Question HTML is sanitized (`sanitize`) on import/edit.
- `window.__tb` exposes state/normalize/render/printJobs for tests.

### Documents and printing
- `settings.docType`: `test` | `quiz` | `review` | `lesson`. `buildVersion(v)` orders items
  (exam parts via `partKeyOf`; review `reviewKind` open→mc; lesson `roleOf` warmup→example→practice;
  bonus last). `testHtml` dispatches to `examHtml` / `reviewHtml` / `lessonHtml`; `qBody` renders the
  answer area; `labelItems` sets printed numbers and answer-key labels.
- Per-question lesson roles, example concepts and bonus flags live in settings
  (`roles`, `concepts`, `bonus`, keyed by question id).
- **Print uses `window.print()` with CSS `@page` margin boxes** (Chrome/Edge 131+). Headers are SVG
  data URLs (`headerSvg`, `lessonFootSvg`) placed in `@top-center` / `@bottom-left`, which allows the
  centered course name + bar + right-aligned label under the bar. `:first` only matches a document's
  first page, so with "Print each version separately" each version is its own print job, chained on
  `afterprint` (`printJobs` → `runJobs`). Header SVGs are preloaded as `<img class="pre-img">` and
  decoded before printing, or nested images (lesson icons) can be missing.
- Page geometry: exam/review margins `1in .75in` (504 pt content width); lesson `.8in .5in` (540 pt).
- Layouts were matched to the user's Word templates: Geometry Unit Exam, Geometry Unit Review, Lesson.
  Lesson heading fonts are Mac fonts (Papyrus, Noteworthy, Chalkduster, Baskerville, Bradley Hand)
  with fallbacks; purple `#8064A2`; review MC header shading `#E5DFEC`.

### ExamView `.bnk` format (reverse-engineered, see `src/bnk.js`)
- Header `\x1aFSCBNK#W#06#00#` then a zlib stream (`DecompressionStream('deflate')`), UTF-16LE text.
- Records start with the 4-byte bank id followed by `ff ff ff ff`. Header ints: `hh[3]` = answer index
  (MC) or answer space in twips (CR); points; then a strings block.
- Text uses `\x0f` object markers, `\x10` choices start, `\x11` separators, letters `a)`.
- Object table stride 72 bytes (charpos +0, w +12, h +16, offset +68). Objects are DIB images
  (8/24-bit with palette) or equations: stream from byte 44; `0x09` font/style runs (-6 = Symbol),
  `0x01` templates (nslots + selector: 5,0 overline; 6,7 line ↔; 0,30 arc; 1,5 sqrt; 2,0 sup;
  3,0 sub; 0,0 parens; 2 slots 1,0 fraction), `0x0b E0` = △, `0x06` thin space.

### PDF import
pdf.js runs with a fake worker (module workers from blob URLs fail on `file://`): the worker module
is imported and set as `globalThis.pdfjsWorker`. Question detection: numbered lines, choice labels
`(1)`/`A.`/`a.`, the "Use this space for computations." column; crops at SCALE 2 with a fast trim.

### Word import
In-browser unzip (`DecompressionStream('deflate-raw')`), DOMParser; numbering.xml label formats,
OMML → HTML math, images (srcRect crops, anchored → `q-float`), nested tables (2×2 choices, proofs),
parts and `[N]` credits, exam header info. Non-ASCII characters in `docx.js` are written as `\uXXXX`.

### Sync and server
- `CLOUD` (`src/sync.js`) talks to `/auth/v1/token`, `/auth/v1/user`, `/rest/v1/questions`,
  `/rest/v1/app_state`, `/storage/v1/object/images/<sha256>`. Change detection by signature (fnv of
  canonical JSON without data URLs); soft deletes; `lastPull` from server `updated_at` minus 2 min, so
  it doesn't depend on client clocks. Images are uploaded and referenced by SHA-256 name.
- `docker/server.js` implements that subset with SQLite + files in `DATA_DIR` (`/data`), scrypt
  passwords, bearer tokens, admin endpoints `/admin/api/users…`, `/healthz`, and generates `config.js`
  with `selfHosted:true` (shows "Manage accounts" for admins). Env: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
  (first start only), `ADMIN_RESET=1`, `PORT`, `DATA_DIR`.

## Testing

```
npm install && npx playwright install chromium   # once
npm test                                         # build + tests/smoke.cjs
```
The smoke test adds sample questions, renders Test/Quiz/Review/Lesson + answer keys to PDF in
`tests/out/`, and checks the Build tab preview. For layout work, also compare against the user's
templates and print from real Chrome (margin boxes only render in print).
Server check: `cd docker && PORT=8099 DATA_DIR=$(mktemp -d) ADMIN_EMAIL=a@b.co ADMIN_PASSWORD=testpassword node server.js`, then `curl localhost:8099/healthz`.
Firefox isn't available in the cloud sandbox; the user has reported Firefox slowness before.

## Status (2026-11-12)

- Version 0.5.0 + Unreleased (CHANGELOG, wiki, GitHub Actions, smoke test, this file).
- The user is trying the single-file version before setting up Docker.
- Not on GitHub yet; no remote. Workflows (`docker.yml`, `wiki.yml`) are written but untested.
- The user keeps original `.bnk`/`.pdf`/`.docx` files on a NAS. Her templates and banks aren't in the
  repo (they're her files); ask her to attach them when needed.

## Backlog / ideas

- [ ] When the GitHub repo exists: set the image name in `docker/docker-compose.yml` and the wiki page,
      push, create the first wiki page, check both workflows run.
- [ ] Docker setup on her web hosting/VPS (she chose all-in-one container + Caddy).
- [ ] Collect her feedback from trying the single-file version.
- [ ] Possibly: CI job running `npm test`; release v0.6.0 once feedback is in.

## Work log

- **2026-11-09 → 11-11**: built the app (bnk/PDF/Word import, metadata, bimodal, courses, classic exam
  layout, performance fixes), Supabase and Docker hosting, logins and sync.
- **2026-11-11**: document types Test/Quiz/Review/Lesson from her Word templates; lesson label "3-4";
  separate compass/ruler/tracing paper options.
- **2026-11-12**: moved into her git repo; added CHANGELOG, README process, `wiki/` user guide,
  GitHub Actions (Docker image to GHCR, wiki publish), smoke test, `AGENTS.md`.
