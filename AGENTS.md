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
2. Run `npm test` (full suite, see Testing). Add or update tests for what you changed. Look at the
   PDFs in `tests/out/` when layout changed. Run `npm run test:docker` when `docker/` changed, and
   `npm run test:db` when `docker/server.js` or `docker/db.js` changed (CI runs both databases too).
3. Add a line under **[Unreleased]** in `CHANGELOG.md` (Added / Changed / Fixed / Removed).
4. Significant change → update `README.md`, the matching page(s) in `wiki/`, and `docker/README.md`
   if the server or setup changed. Never edit the GitHub wiki directly (the workflow overwrites it).
5. Update this file's Status / Backlog / Work log.
6. Commit with a clear message. On her Mac (Claude Code) `git push` and `gh` work (signed in as
   ltcandalino); the cloud sandbox has no GitHub access, so there the user pushes herself.
7. **Keep everything on the newest versions (security).** The image must scan clean: CI runs Trivy (fails on
   fixable HIGH/CRITICAL, SARIF to the Security tab) and rebuilds weekly; locally `docker scout cves <image>`.
   The Dockerfile is two-stage so npm/yarn/corepack aren't in the final image, and runs `apk upgrade`.
   Also watch CI after every push (`gh run list`): a red run went unnoticed for hours on 2026-11-13. Node = current LTS (Docker `FROM`, CI
   `node-version`, README). GitHub Actions = newest major. Dependabot opens weekly PRs for Actions,
   Docker and npm; review and merge them after CI passes. pdf.js isn't covered: at the start of a
   session compare `npm view pdfjs-dist version` with `vendor/pdfjs/VERSION.txt` and copy
   `legacy/build/pdf.min.mjs` + `pdf.worker.min.mjs` from `npm pack pdfjs-dist@<v>` when newer.
   Same for `vendor/fonts/` (`npm view @fontsource/atkinson-hyperlegible-next version`, `@fontsource/opendyslexic`).
   Run `npm outdated` / `npm audit` too.
8. Saved user data must keep loading: when settings or question fields change, migrate old data
   (`migrateSettings`, `normalize` in `src/app.js`) instead of breaking it.
9. Releases follow semantic versioning (MAJOR breaks saved data/backups/server setup, MINOR adds
   features, PATCH fixes). Use `python3 scripts/release.py major|minor|patch`; every release needs
   notes under [Unreleased] first. The tag drives the Docker image tags and the GitHub Release.

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
| `vendor/pdfjs/` | pdf.js 6.5.438 legacy build (inlined as `text/plain` scripts). |
| `vendor/fonts/` | Atkinson Hyperlegible Next + OpenDyslexic woff2 (latin, 400/700, normal/italic, fontsource 5.3.0); `build.py` embeds them as `@font-face` data URLs (~830 KB). |
| `build.py` | Concatenates everything into `ALittleCandleTestBuilder.html` (no config) and `docker/index.html` (loads `config.js`). |
| `docker/server.js` | Node server (26 LTS in the image), scrypt. Serves the app + a Supabase-subset API. |
| `docker/db.js` | Database layer: SQLite (`node:sqlite`, default) / PostgreSQL (`pg`) / MySQL-MariaDB (`mysql2`) via `DATABASE_URL`; `?` placeholders, `get/all/run/tx`, dialect upserts, one-time copy from SQLite. Drivers in `docker/package.json`, loaded lazily. |
| `docker/` | Dockerfile, compose (app + Caddy for HTTPS), Caddyfile, README (setup guide for the user). |
| `supabase/` | Alternative hosting: GitHub Pages + Supabase (`setup.sql`, `config.example.js`). Not in active use. |
| `PLAN.md` | Approved feature plan: accommodations, display settings, saved tests. |
| `PRODUCT.md` | Product record for design work (users, goals, principles), written with her via `/impeccable init`. |
| `wiki/` | User guide, published by `.github/workflows/wiki.yml`. |
| `.github/workflows/docker.yml` | Build, smoke-test and push image to `ghcr.io/<owner>/<repo>`. |
| `tests/*.test.cjs` | Test suite (node:test + Playwright), helpers in `tests/helpers.cjs`, sample files in `tests/fixtures/`. |
| `scripts/` | `release.py`, `release-notes.py`, `docker-test.sh`. |
| `VERSION` | Semantic version; `build.py` injects it (`APP_VERSION`, `<meta name="version">`); server reads it from index.html. |
| `.github/workflows/` | `docker.yml` = CI (tests → image to GHCR), `release.yml` (GitHub Release from CHANGELOG), `wiki.yml`. |

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
- `window.__tb` exposes state/normalize/render/printJobs and `fn` (most internal functions) for tests.
- `sanitize` parses into an inert `<template>` (so `onerror` never runs), drops script/style/svg/etc.,
  and allows images that are `data:`, `https:`, or this server's own picture URLs on `http:`.

### Documents and printing
- `settings.docType`: `test` | `quiz` | `review` | `lesson`. `buildVersion(v)` orders items
  (exam parts via `partKeyOf`; review `reviewKind` open→mc; lesson `roleOf` warmup→example→practice;
  bonus last). `testHtml` dispatches to `examHtml` / `reviewHtml` / `lessonHtml`; `qBody` renders the
  answer area; `labelItems` sets printed numbers and answer-key labels.
- Accommodated copy: `settings.accom` {on,font,size,spacing,perPage,version} (read via `accom()` with
  `ACC_DEFAULT`); `accHtml` = `testHtml(buildVersion(v))` + `accBreaks` (page break every N `pt-q`/`rv-q`,
  not `pt-qt`!), `accStyle` (--ptf/--pts/--accz) + `accClass` (.acc-z zooms .q-img/.pt-space, .acc-sp);
  print job `label` 'Accommodated copy', `printJobs('acc')`; preview `ui.pv==='acc'`.
- Saved tests: `state.savedTests` [{id,name,course,created,savedAt,printedAt,settings,selected,questions}];
  `questions` = frozen copies. `settings.savedId` links the current test; `settings.frozen` makes `selQ`
  (used by `selectedQs`) prefer the frozen copies. `saveTest` (also on every print), `openSaved(id, 'latest')`,
  `savedDiff` via `paperSig` (ignores picture addresses). Synced in `app_state` (`statePart`), pictures hosted
  before the state push. normalize keeps frozen-only ids in `selected`.
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
- `docker/server.js` implements that subset with `docker/db.js` (SQLite by default, or Postgres/MySQL/MariaDB
  via `DATABASE_URL`; first start on an empty one copies from `DATA_DIR/alctb.db`) + picture files in `DATA_DIR`, scrypt
  passwords, bearer tokens, admin endpoints `/admin/api/users…`, `/healthz`, and generates `config.js`
  with `selfHosted:true` (shows "Manage accounts" for admins). Env: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
  (first start only), `ADMIN_RESET=1`, `PORT`, `DATA_DIR`, `DATABASE_URL`.

## Testing

```
npm install && npx playwright install chromium   # once
npm test               # build + every tests/*.test.cjs (~150 checks, ~45 s)
npm run test:fast      # core + documents
npm run test:server    # server API + two-browser sync
npm run test:docker    # real image on a machine with Docker (scripts/docker-test.sh, log in tests/out/)
npm run test:db        # server + sync tests on Postgres 18, MariaDB LTS, MySQL LTS in Docker (TEST_DATABASE_URL)
```
- `core` pure helpers; `documents` buildVersion/layouts/keys/printJobs/courses; `imports` DOCX/PDF/BNK;
  `ui` real clicks (editor, delete needs a second "Confirm" click, imports, backup/CSV downloads, print
  with `window.print` stubbed); `server` API incl. isolation, lockout, admin, restart, ADMIN_RESET;
  `sync` app served by the server, two browser contexts; `print` PDFs in `tests/out/`.
- Fixtures: `tests/fixtures/sample-exam.docx`, `sample-questions.pdf` (regenerate with
  `make-fixtures.py`, needs python-docx + reportlab). Her real files go in `tests/fixtures/private/`
  (gitignored; on her Mac it has `GEO2024-2026EXAMs.bnk` and `Geometry_Unit_3_Exam_v1.docx`), and are
  tested automatically when present.
- Margin-box headers only render when printing; check real Chrome print preview for layout work.
- Linux check without CI: `docker run node:26`, install python3 + Playwright chromium, `npm test` (the CI
  OOM crash on 2026-11-13 only showed on Linux: never pass Playwright ElementHandles to `assert`).
- Firefox isn't available in the cloud sandbox; the user has reported Firefox slowness before.
- Docker isn't reachable from the cloud sandbox or the desktop bridge VM; the user runs
  `npm run test:docker` on her Mac (Docker Desktop installed 2026-11-12) and the log lands in
  `tests/out/docker-test.log`, which can be read through the connected folder.

## Status (2026-11-12)

- **v0.6.0 released 2026-11-13**: GitHub Release with the app HTML and Docker zip attached; images
  `:0.6.0`, `:0.6`, `:latest` on GHCR. Repo has a description, wiki homepage link and topics.
- Remote: `git@github.com:ltcandalino/alittlecandle-test-builder.git` (branch `master`), public, first
  push done 2026-11-12. First CI run failed on broken `package.json` (fixed, CI green since); Wiki published after she
  created the first page. No release/tag yet. `gh` is installed and signed in on her Mac.
- Claude Code desktop on her Mac (Apple M1 Max) is now the main way of working (Node 26.13.1 from
  Homebrew in `/opt/homebrew`, Playwright installed).
- The user is trying the single-file version; Docker Desktop is installed on her Mac for local image tests.
- The user keeps original `.bnk`/`.pdf`/`.docx` files on a NAS. Templates and banks are hers; private
  copies for tests live only in `tests/fixtures/private/` on her Mac.

## Backlog / ideas

- [x] CI passes on GitHub (2026-11-12); image `ghcr.io/ltcandalino/alittlecandle-test-builder:latest`
      is published and pullable without login (public).
- [x] Wiki published (2026-11-12); all `wiki/` pages are on GitHub.
- [x] Her Mac is an Apple M1 Max. She reinstalled Homebrew natively in `/opt/homebrew` (the old one was
      the Intel copy in `/usr/local`); Node 26.13.1; 152 tests pass. Update with `brew upgrade node`.
- [x] `~/.zprofile` loads `/opt/homebrew` (she added it; agents may not edit it). If a session's shell
      still can't find `node`, prefix commands with `PATH=/opt/homebrew/bin:$PATH`.
- [x] Updated to Node 26, newest Actions, pdf.js 6.5.438; Dependabot added (2026-11-12).
- [ ] Docker setup on her web hosting/VPS (all-in-one container + Caddy).
- [x] Release v0.6.0 (2026-11-13).
- [ ] Collect her feedback from trying the single-file version.
- [ ] Design review 2026-11-13 (`/impeccable critique`, 27/40, snapshot in `.impeccable/critique/`). She chose
      all 5 issues, work-protection first: (1) DONE editor asks before discarding edits (`requestClose`); (2) DONE
      Restore offers Replace vs Add missing (`restoreChoice`), Backup card first with `ui.lastBackup` line; (3) DONE preview
      before Print (`.printbar` sticky in the Preview card, `printSummary`); (4) DONE `--muted` #5f656c, symbol bar toolbar
      (`wireToolbar`), `:focus-visible`, `aria-current`, editor focus trap, + PLAN Part B Display (`applyDisplay`); (5) DONE `MORE_F` + chips (`chipsHtml`), "Unit 3 · Sec 2",
      `details#pageStyle` (`ui.pageStyle`), teal for all selected states. Next: `/impeccable polish`, re-run critique.
- [x] Second-review items done 2026-11-13 (print bar, editor, in-app Help, New scramble confirm).
- [ ] Docker Scout still reports musl CVE-2026-107891 (HIGH): no fixed package in Alpine 3.24 yet; the weekly
      CI rebuild picks it up once published. Trivy doesn't flag it.
- [ ] (done, kept for context) Second review 2026-11-13: 27/40. She chose, before Part A:
      (1) print moment (`harden`): keep the missing-answer warning visible in the print bar with a Fix link,
      disable print at 0 questions, progress strip while chained print windows run, Part directions above
      the print bar; (2) editor (`layout`): Question + answers first, compact row Type/Points/Unit/Section/
      Standard, "More details" fold (open when any filled), caret at end; (3) Help built into the app
      (short panel + link to the wiki); (4) "New scramble" asks first (two-step + Undo).
- [x] PLAN Parts A, B, C all done 2026-11-13. Next: release 0.7.0 (lots under [Unreleased]), then her feedback.
- [ ] `PLAN.md` (approved 2026-11-13), after the review fixes: (A) print accommodations (dyslexia font
      Atkinson Hyperlegible/OpenDyslexic embedded, large print, spacing, questions per page, extra
      accommodated copy of one version); (B) personal Display settings for the app (font, size, contrast,
      motion) with review fix 4; (C) saved tests (auto-save on print, frozen copies, ask when questions
      changed, synced and in backups).

## Work log

- **2026-11-09 → 11-11**: built the app (bnk/PDF/Word import, metadata, bimodal, courses, classic exam
  layout, performance fixes), Supabase and Docker hosting, logins and sync.
- **2026-11-11**: document types Test/Quiz/Review/Lesson from her Word templates; lesson label "3-4";
  separate compass/ruler/tracing paper options.
- **2026-11-12**: moved into her git repo; CHANGELOG, README process, `wiki/` user guide, GitHub Actions,
  `AGENTS.md`. Full test suite (150 checks) which found and fixed: sanitize could run `onerror`;
  pictures dropped on http:// servers; "GEO" file names not recognized; sync race where an edit during
  an upload was marked synced (sync.js now records the signature of what was actually sent). Added VERSION + version display,
  semantic-version release script, release notes workflow, versioned Docker tags, local Docker test script.
- **2026-11-12 (Claude Code)**: switched to Claude Code on her Mac. Docker test passed on her Mac.
  First GitHub CI run failed: `package.json` test script had unescaped quotes (invalid JSON); fixed,
  152 tests pass locally. Wiki workflow needs the first wiki page created by hand.
- **2026-11-12**: `gh` installed and signed in; CI green, image public on GHCR, wiki published. She asked
  to always use the newest packages (rule 7): Node 22 → 26 LTS, Actions to newest majors, pdf.js 6.5.438,
  Dependabot. Kept images on GHCR (not Docker Hub).
- **2026-11-13**: native Homebrew + Node 26.13.1 on her M1 Mac; released v0.6.0 (CI, Release, image
  tags all green); set repo description/topics.
- **2026-11-13**: design review (27/40), PRODUCT.md, approved PLAN.md. Review fixes 1–2 done: editor discard
  check (backdrop mousedown keeps focus in the dialog), Restore Replace/Add missing with Undo, Backup card first.
  Fix 3: Build & print order Questions → Preview (+ sticky print bar) → Part directions. 157 tests pass.
- **2026-11-13**: fix 4 + PLAN Part B: readable muted color, keyboard symbol bar, focus outlines, Display popover
  (native `popover`; `ui.display` in `tb-ui`; fonts via `--uif` on screen only, `zoom` for size, `.hc`, `.calm`). 162 tests.
- **2026-11-13**: fix 5: bank filters (4 main + More filters + chips + Clear), labeled unit/section, Page style fold,
  one accent color, no side stripes. `.impeccable/critique/ignore.md` accepts the print-template fonts. 165 tests.
- **2026-11-13**: polish pass: phone layout (grid minmax(0,1fr), static header <640px, card actions below), Help link
  to wiki, broader empty state, math paste example, Bimodal hint, red Delete, Copy keeps ref. 165 tests.
- **2026-11-13**: database support: `docker/db.js` (SQLite default, PostgreSQL preferred, MySQL/MariaDB) via
  `DATABASE_URL`, auto-copy from SQLite, compose add-ons, `npm run test:db`, CI `databases` matrix. 36/36 server
  tests on each. Paused mid-way: editor (question first), in-app Help, print-bar docs/changelog (next).
- **2026-11-13**: CI had been red since the first review fix: a test passed an ElementHandle to assert, the
  failure serialization ran the runner out of memory (Linux only), hiding a real bug (Esc missed before the
  editor focused). Fixed both; editor is question-first with a More details fold; in-app Help; Docker image
  two-stage without npm + `apk upgrade` (Scout 1C/7H → 1H unfixable); Trivy + weekly rebuild in CI. 167 tests.
- **2026-11-13**: PLAN Part A: accommodated copy (font, 14/18 pt, spacing, 1-2 per page, version), preview tab,
  print job/button, key label; accommodation PDFs in tests/out checked page by page. 173 tests (Mac + Linux).
- **2026-11-13**: PLAN Part C saved tests (card, auto-save on print, frozen copies + as-printed/latest choice,
  rename/duplicate/delete, dirty check, sync incl. pictures, backups, course rename/delete). 182 tests; test:db green.
