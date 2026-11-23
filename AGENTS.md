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
   `:latest` = newest release only (tags; the weekly cron checks out the newest `v*` tag and republishes it); master
   pushes publish `:edge`. Her local site uses `:latest`, so unreleased work doesn't reach it (or her public site) until a release.
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
10. **The Docker image never contains user data** (questions, banks, accounts, pictures): only `server.js`, `db.js`,
   `index.html`, drivers. `docker/.dockerignore` is an allow-list and CI checks `/app` and `/data` in every build.
   Never bake sample banks or her private fixtures into images or the app HTML.
11. Keep README, `wiki/`, `docker/README.md` and this file current with every significant change (her request 2026-11-14).
   Issue forms live in `.github/ISSUE_TEMPLATE/` (bug, import problem, feature, question); keep their options in step
   with the app's tabs.

## Repo map

| Path | What |
|---|---|
| `src/app.js` | The whole UI and logic (~150 KB, vanilla JS, no framework, no build step besides concatenation). |
| `src/bnk.js` | ExamView `.bnk` parser → `BNK.parse(buf, name)` → `{title, questions, warnings, found}`. |
| `src/pdfimp.js` | PDF import helpers on pdf.js: `PDFIMP.open/cropAll/clip/thumb/imgHtml`. |
| `src/docx.js` | Word import: `DOCX.parse(buf, name)` → `{questions, header}`. |
| `src/export.js` | Downloads. `makeExporter(api)` (app.js passes the functions it needs) → `EXP.sections(kind)`, `EXP.docx(kind)`, `EXP.latex(kind)` (zip: .tex + images/), `EXP.zip` (CompressionStream deflate-raw + CRC32), `EXP.download`. Writers walk the paper HTML by class (`cl-*`, `pt-*`, `rv-*`, `ls-*`); `inlines()` turns text + m-ov/m-acc/m-frac/m-sqrt into runs → OMML. |
| `src/sync.js` | `CLOUD` module: login + sync against a Supabase-style REST API (Supabase or our Docker server). |
| `src/icon.svg` | Favicon (candle): `build.py` adds it as `<link rel=icon>` (data URL). |
| `src/logo.png` | Her logo (112 px copy of her 701 px original), embedded by `build.py` as `BRAND_LOGO` for the header mark. |
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
| `DESIGN.md` | App screen design system ("The Teacher's Desk": tokens, Candle Purple, rules), from `/impeccable document`; sidecar `.impeccable/design.json`. Printout styles follow her Word templates instead. |
| `wiki/` | User guide, published by `.github/workflows/wiki.yml`. |
| `.github/workflows/docker.yml` | Build, smoke-test and push image to `ghcr.io/<owner>/<repo>`. |
| `tests/*.test.cjs` | Test suite (node:test + Playwright), helpers in `tests/helpers.cjs`, sample files in `tests/fixtures/`. |
| `scripts/` | `release.py`, `release-notes.py`, `docker-test.sh`, `bank-file.cjs` (bank folder → app bank file .json: LaTeX back into m-* spans, tables, pictures as data URLs), `bank-folder.cjs` (ExamView bank → bank folder: Markdown + LaTeX, pictures cut from Regents PDFs found by their cover page, review.html; run `python3 build.py` first). Her files: `~/Documents/TestBuilderResource/` (`ExamView banks/`, `Bank folders/`, `Bank files/`, `Regents exams/Algebra 1|Algebra 2|Geometry/` with exams, scoring keys `-sk`, rating guides `-rg`, `Curriculum/`); the scripts default to it. |
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
- Units: `q.unit` may list several units ("10, 11"); `unitsOf(q)` splits it; `uniq('unit')`, `matches` (Unit filter) and Browse banks use each unit. Section stays one value (her book section, e.g. 11.2).
- Question fields: courses[] (shared banks: one copy in several courses; `course` mirrors courses[0] for
  older copies; use `coursesOf`/`inCourse`/`setCourses`/`dropCourse`, never compare `q.course`), bank, source, unit, section, part, topic, subtopic, standard, cluster,
  ref (MMYYQQ → month/year/qnum 1–50 via `parseRef`/`fillMeta`; month ∈ 01/06/08), nyStd (old 2005 NY codes, split out of
  `standard` by `splitNY`; ExamView import does it automatically), extra {fieldId: value} (her own fields, defined in
  `state.fields` [{id,label}], synced in app_state; `extra` is left off entirely when empty so sync signatures don't
  change), notes, points, type
  (`mc` `bm` `tf` `sa` `es`), html, choices[], answer, inImage, lockChoices, space, lines, answerArea.
  Question HTML is sanitized (`sanitize`) on import/edit.
- Bank tools (section "her own fields, bulk changes, clean-up, bank files" in app.js): `getF`/`setF` ('x:<id>' for her
  fields), `bulkBox` (**Change these…**, replaced "Set unit / section", button id still `#setUnit`), `openCleanup`
  (**Check & clean up**, `NEEDS`/`needs`, `unitGuesses`), `ui.need` + `data-xff` selects in More filters, `fLabels()`
  for chips. Bank files: `{app,kind:'bank',version:1,bank,courses,fields,questions}`, `bankFileData`/`importBankData`
  (same id → update, fields matched by label, html sanitized), `saveBankFiles` (showDirectoryPicker, else downloads).
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
- Downloads (Plan 2): Format menu `ui.fmt` (`outFmt()`: pdf | docx | print); `printNow` saves the test then
  prints or calls `EXP.download('docx', kind)`. Word: one section per version/acc/key (`titlePg`, page numbers
  restart, keys get a blank header), a paragraph style per section carries its font/size, underscore tab
  leaders for lines, header parts get their own .rels. Check visually with LibreOffice
  (`soffice --headless --convert-to pdf`), swapping "Century Schoolbook" → "Times New Roman" in a copy first
  (LibreOffice can't draw the Office copy of that font on her Mac). QuickLook/textutil don't draw equations.
  LaTeX: `TexWriter` (exam class headers per section via `\setcounter{page}{1}` + `\firstpageheader`, tgschola,
  `\newunicodechar` only for symbols used, `UNI` map, longtable for review/key, cells top-aligned with
  `minipage[t]` + `\vspace{0pt}` when a row has blocks). TeX Live is on her Mac: export tests compile with
  pdfLaTeX when it's on PATH (`/Library/TeX/texbin`); CI skips that part.
- **Preview pages** (her request 2026-11-17): `drawPreview` → `drawSheets(p, html, v)` lays the document out once off screen in `#pvMeasure` (7.5in, flow-root), `pvBlocks` collects unsplittable blocks (break-inside:avoid, `tr`, leaves; skips table-column), `pvBreaks` places breaks like print (avoid-after/before, `acc-break` forced, taller-than-a-page cut), then each `.pv-page` (8.5×11in) shows its slice in `.pv-win` with the print header (`headers()`, `topFor`) and footer (v. N / page number / lesson footer). `pvFit` zooms to the card width (ResizeObserver); re-run after pictures/fonts load. Name clash warning: `drawPages` is the bank list pager.
- Per-question lesson roles, example concepts and bonus flags live in settings
  (`roles`, `concepts`, `bonus`, keyed by question id).
- **Print uses `window.print()` with CSS `@page` margin boxes** (Chrome/Edge 131+). Headers are SVG
  data URLs (`headerSvg`, `lessonFootSvg`) placed in `@top-center` / `@bottom-left`, which allows the
  centered course name + bar + right-aligned label under the bar. `:first` only matches a document's
  first page, so with "Print each version separately" each version is its own print job, chained on
  `afterprint` (`printJobs` → `runJobs`). Header SVGs are preloaded as `<img class="pre-img">` and
  decoded before printing, or nested images (lesson icons) can be missing.
- Page geometry (her choice 2026-11-15): every type `.5in` all round, 540 pt content width (`pageGeom`); header 0.25in from the
  top edge, body starts below it (`topFor` sets the @page margin-top per header; Word header=0.25in, LaTeX `includehead`).
  Review tables have no borders (CSS, Word `nil`, LaTeX no rules); answer keys keep their light lines.
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
- **Public questions (Plan 3 step 1):** `questions.pub` column (0 never, 1 public, 2 was public), set by the server from
  `data.visibility==='public'`. `GET /rest/v1/questions?shared=1` (sent by `sync.js` only when `selfHosted`) adds colleagues'
  pub>0 rows with `owner`/`owner_email`; pub 2 or deleted come back as `deleted` with empty data. Old apps don't send
  `shared=1`, so they never push someone else's question as their own. In the app a colleague's question has `q.owner` +
  `q.ownerName` (never on your own): `own(q)`; push skips them; pull replaces them; their courses are a per-person overlay
  synced as `app_state.use {id:[courses]}` (`useOf` in statePart). `dropCourse` never deletes them; Change these…,
  clean-up, bank rename/delete and Your banks skip them. **Copy to mine** = `data-dup` with `origin {id,owner,ownerName}`.
  Same id as one of yours → yours wins. Admin deleting an account moves its public questions to the admin.
- **Team banks (Plan 3 step 2):** tables `user_groups`, `group_members`, `team_banks` (id, owner, data JSON {name, groups,
  editors, items [{o,id}]}), and derived `team_access` (bank, user, role 1 see / 2 change) + `team_items` (only items owned
  by the bank's owner or an editor), rebuilt by `refreshTeam()` after every bank/group/user change. API: `/team/v1/people`,
  `/team/v1/banks[/<id>]` (PUT: owner/admin set all, editors only items), `/admin/api/groups[/<id>]`. Shared pulls add
  rows visible through `team_items` with `can_edit`; editors POST `{user_id: owner}` rows (server keeps the owner's bank,
  courses, visibility, adds `changedBy`). `sync.js` `pullTeams()` first: when the bank list changes it does a full pull and
  drops colleagues' questions no longer visible; `ownerCopy`/`sigC`/`meta.fsynced` track editors' unsent edits. App:
  `teams()`, `teamsOf(q)` (by `owner|id`), `teamQs`, `saveTeam`, `shareDialog`, `teamCardHtml`/`wireTeamCard`, `loadGroups`.
- `docker/server.js` implements that subset with `docker/db.js` (SQLite by default, or Postgres/MySQL/MariaDB
  via `DATABASE_URL`; first start on an empty one copies from `DATA_DIR/alctb.db`) + picture files in `DATA_DIR`, scrypt
  passwords, bearer tokens, admin endpoints `/admin/api/users…`, `/healthz`, and generates `config.js`
  with `selfHosted:true` (shows "Manage accounts" for admins). Env: `ADMIN_EMAIL`, `ADMIN_PASSWORD`
  (first start only), `ADMIN_RESET=1`, `PORT`, `DATA_DIR`, `DATABASE_URL`. (The file-based shared
  library and `LIBRARY_DIR` were removed in Plan 3 step 2: team banks replace it.)

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
  `ui` real clicks (editor, delete needs a second "Confirm" click, imports, backup downloads, print
  with `window.print` stubbed); `server` API incl. isolation, lockout, admin, restart, ADMIN_RESET;
  `sync` app served by the server, two browser contexts; `print` PDFs in `tests/out/`; `tools` Change these…, clean-up,
  her own fields, bank files (field sync end to end in `sync`; public/team banks in `server` and `sync`).
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

- **v0.23.0 released 2026-11-22** (filters narrow each other). Her local site runs it.
  Before it, **v0.22.0** (several units per question). Her public site (updated by James) runs v0.20.1.
  Before it, **v0.21.0** (bank files bring their topics/subtopics/standards to questions you already have). Before it, **v0.20.1** (ExamView ℓ, PDF question numbers past graphs). Before it, **v0.20.0** (bank files update questions by bank + reference). Before it, **v0.19.0** (reorder by drag or number in printed order, Sort menu). Before it, **v0.18.0** (ExamView tables read + re-import repair, ∥ instead of €). Before it, **v0.17.0** (print only from 3 Print, click-to-pick, Select all/Deselect all, Search first, Duplicate / Copy to mine for banks). Before it, **v0.16.0** (preview as letter-size pages). Before it, **v0.15.0** (design review 2026-11-17 steps 1–4: three steps, Print recap, picking only picks, polish). Before it, **v0.14.0** (Plan 4 stage 2: Browse banks). Before it, **v0.13.0** (left rail, sub-tabs). Before it, **v0.12.0** (Spacing). Before it, **v0.11.1** (tidier Import & backup: one Your banks list with ⋯ menus, CSV removed). Before it, **v0.11.0** (Plan 3 step 2: groups, team banks with editors, Share; ½-inch margins; borderless Review).
  Before it, **v0.10.0** (Plan 3 step 1: public/private banks, Shared with you; `:latest` = releases only). Before it, **v0.9.0** (bank tools, shared library, 9 dropped ExamView questions fixed).
  Before it, **v0.8.3** (no green left). Before it, **v0.8.2** (purple accent). Before it, **v0.8.1** (question numbers up to 50). Before it, **v0.8.0 released 2026-11-14** (Word + LaTeX downloads, her logo, newest-first sort, shared banks). Before it,
  **v0.7.1 released 2026-11-13** (blank first printed page fix). Before it, **v0.7.0**: design-review fixes, Display settings, database choice (SQLite/Postgres/
  MySQL/MariaDB), image scanning, print accommodations, saved tests. GitHub Release with the app HTML and Docker
  zip; images `:0.7.0`, `:0.7`, `:latest` on GHCR. CI green.
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
- [ ] Bank tools (2026-11-14): she wants to try Change these…, Check & clean up, her own fields and bank files on her
      real banks (her local compose changes are uncommitted on purpose). Ideas: auto unit/section from a standard→unit map she provides.
- [x] ExamView **tables** (2026-11-20): `bnk.js` `tableEnd`/`tableHtml`: \x10 starts a table unless followed by a choice label, \x11 cell,
      \x11\x11 row, ends at \x11\x11 + \r/\x10/end; title row → colspan, bold header row (first column when ≤2 rows and >3 cols), unit
      superscripts (mi2). `<table class="q-tbl q-grid">` (sanitize keeps q-grid; CSS ruled + centered; Word/LaTeX 1.5 in per column, centered).
      582 of 11,833 questions in her banks, 264 MC got a lost choice back; nothing else changed. Re-import repairs in place: `repairTables`/`tblKey`.
- [ ] ExamView equation codes not understood yet (shown as test diagnostics, the math around them still reads): 3 (251×),
      16 (148×), 17 (65×), 23 (24×), 24 (14×), 2 (3×), mostly in older banks (GE 2008–2016, Sequential III, Math A/B,
      Ch 9 Test Bank). Probably matrices/piles/limits; look at those questions next to ExamView output.
- [ ] Design review 2026-11-13 (`/impeccable critique`, 27/40, snapshot in `.impeccable/critique/`). She chose
      all 5 issues, work-protection first: (1) DONE editor asks before discarding edits (`requestClose`); (2) DONE
      Restore offers Replace vs Add missing (`restoreChoice`), Backup card first with `ui.lastBackup` line; (3) DONE preview
      before Print (`.printbar` sticky in the Preview card, `printSummary`); (4) DONE `--muted` #5f656c, symbol bar toolbar
      (`wireToolbar`), `:focus-visible`, `aria-current`, editor focus trap, + PLAN Part B Display (`applyDisplay`); (5) DONE `MORE_F` + chips (`chipsHtml`), "Unit 3 · Sec 2",
      `details#pageStyle` (`ui.pageStyle`), one accent color for all selected states (purple #7851a9 since 2026-11-14, was teal). Next: `/impeccable polish`, re-run critique.
- [x] Second-review items done 2026-11-13 (print bar, editor, in-app Help, New scramble confirm).
- [ ] Docker Scout still reports musl CVE-2026-107891 (HIGH): no fixed package in Alpine 3.24 yet; the weekly
      CI rebuild picks it up once published. Trivy doesn't flag it.
- [ ] (done, kept for context) Second review 2026-11-13: 27/40. She chose, before Part A:
      (1) print moment (`harden`): keep the missing-answer warning visible in the print bar with a Fix link,
      disable print at 0 questions, progress strip while chained print windows run, Part directions above
      the print bar; (2) editor (`layout`): Question + answers first, compact row Type/Points/Unit/Section/
      Standard, "More details" fold (open when any filled), caret at end; (3) Help built into the app
      (short panel + link to the wiki); (4) "New scramble" asks first (two-step + Undo).
- [x] PLAN Parts A, B, C all done and released in v0.7.0 (2026-11-13).
- [ ] PLAN.md **Plan 2** (approved 2026-11-13): Format menu + downloads as Word (.docx), LaTeX (.tex zip), PDF (pdfmake)
      from one document description. Order: Word (DONE 2026-11-13), LaTeX (DONE 2026-11-13), PDF. Later: Google Drive/Docs once social sign-in exists.
- [ ] `PLAN.md` (approved 2026-11-13), after the review fixes: (A) print accommodations (dyslexia font
      Atkinson Hyperlegible/OpenDyslexic embedded, large print, spacing, questions per page, extra
      accommodated copy of one version); (B) personal Display settings for the app (font, size, contrast,
      motion) with review fix 4; (C) saved tests (auto-save on print, frozen copies, ask when questions
      changed, synced and in backups).

- [ ] PLAN.md **Plan 4** (approved 2026-11-17): stage 1 rail + sub-tabs released v0.13.0; stage 2 bank browser released v0.14.0. Plan 4 done.
- [ ] PLAN.md **Plan 3** (approved 2026-11-14): shared question database: owner + Public/Private per
      question, banks as lists, admin-made groups, editors per bank, Share one question, one copy per Regents question,
      personal copies that notice updates, history, comments, review status (another editor marks Ready), offline cache.

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
- **2026-11-13**: released v0.7.0 (CI, Release, image tags all green).
- **2026-11-13**: fixed blank first printed page (`.pt-version:first-child` never matched: runJobs puts a <style>
  first in #printRoot; now `:first-of-type`); ui tests check break-before in print media. compose uses GHCR by default.
- **2026-11-13**: released v0.7.1 (CI, Release, image tags green; image checked for the fix).
- **2026-11-13**: favicon (candle, `src/icon.svg`). Plan 2 step 1: Format menu + Word export (`src/export.js`),
  checked with LibreOffice renders and a round trip through our Word importer (which now splits tab-separated
  choices). 190 tests. Her local test edits to docker/docker-compose.yml are uncommitted on purpose.
- **2026-11-13**: Plan 2 step 2: LaTeX export (exam class zip), compiled and checked page by page; fixes for
  fraction size and picture/number alignment in table cells. Export tests compile with pdfLaTeX locally.
- **2026-11-14**: her logo in the header (`src/logo.png`, 40 px); bank Sort adds "Newest added first" (reverse bank
  order: new questions are appended) and "Exam date, newest first". 193 tests.
- **2026-11-14**: shared banks: `q.courses` (normalize migrates `course`), bank **Courses…** checkboxes on Import &
  backup, editor course checkboxes, Delete on a shared question/bank/course drops only the current course, CSV
  `A; B`. Released in v0.8.0 (CI, Release, image tags green).
- **2026-11-14**: question numbers in references up to 50 (was 36); `fillMeta` re-reads refs left blank by the old limit.
- **2026-11-14**: accent color green → her purple #7851a9 (`--accent`, tints, hc #4e2f78, favicon); paper/key colors unchanged.
- **2026-11-14 (cloud session)**: she reported the Algebra I 2018–2019 bank (`AICCSS2018-2019EXAMs.bnk`) freezing her browser on import. Not reproducible in Chromium (parse 0.3 s, import + bank render + sync all fast, no dialogs, pictures ≤600 px); asked which browser. Found and fixed a real bug in it: equation code 13 is "next line" and was dropped (`bnk.js` now emits `<br>`). Bank added to `tests/fixtures/private/`; new import tests: no skipped equation codes, two-equation choices keep their line break. Note: `export.test.cjs` Word/LaTeX tests fail only in the cloud sandbox (old Playwright download name, no TeX).
- **2026-11-14 (cloud session, cont.)**: subtopic report on AICCSS2023-2024: newer banks' fields are
  `"2pt multiple choice", ref, "AI", standards, topic, subtopics…, "EXAM 0123AI"`; old classifier took the points label
  as topic. New `BNK.classify` (skips points label, EXAM, course codes AI/AII/A1/A2/GEO/GE/IA/MA/MB/PC, lone "NY:"),
  `BNK.repairFields` run in `normalize` fixes saved questions. Freeze found: AIICCSS2018-2019 record 34 has 0x18 instead
  of ff ff ff ff at the fields block; the old search hit a garbage length and `u16str` stopped advancing (infinite loop).
  Fields block is at record+516 in all 36 banks checked; reader uses that, validates the length, and the string loop
  always advances. New `tests/banks.test.cjs` reads each private bank in a worker with a 30 s limit (a hang fails instead
  of freezing the run) and checks fields. Import tests relaxed for her full collection ("undefined" is real math text,
  -1 answers are flagged "no answer", missing-picture check instead of "has pictures").
- **2026-11-14**: no green left: `--es` #4e2f78, `--tf` plum #9b3b77, saved dot, key highlight #e9e0f4, keynote, icon tints.
- **2026-11-14 (cloud session via her Mac)**: bank tools she asked for after seeing her AICCSS2018-2019 metadata (mixed
  "A.REI.A.1, NY: A.N.1" standards, 3 MC without answers, 1 without a standard, empty unit/section/cluster): **Change these…**
  (bulk edit, undo), **Check & clean up** dialog + **Needs attention** filter, **Old NY standard** field (`nyStd`, ExamView
  import splits automatically), **her own fields** (`state.fields`, `q.extra`; editor, filters, bulk, CSV, sync, backups),
  **bank files** (.json per bank; save to a chosen folder / open), **shared library** on the server (`LIBRARY_DIR`, NAS
  mount documented in docker/README). New `tests/tools.test.cjs`, library tests in server/sync tests. 228 tests; the 3
  export tests fail in the cloud sandbox only (same on the commit before). Released in v0.9.0.
- **2026-11-14 (her Mac)**: ran the full suite with her whole private collection (1470 checks). Fixed: `bnk.js` object-table search
  matched question text as a table entry (offset out of the file), dropping 9 questions in 5 old banks; entries are now validated.
  Line-break test no longer flags m∠A=m∠B=m∠C chains or worked fractions; bank-files test waited on the earlier "Saved" message.
  Export tests pass on the Mac. Released v0.9.0 (CI, Release, image tags green). Plan 3 approved. Library in her compose file still needs her NAS path.
- **2026-11-14**: released v0.9.0. Her requests: GitHub issue forms (bug, import problem, feature, question) + SECURITY.md;
  the image must never hold user data (CI now checks `/app` and `/data`); docs/wiki always current (rules 10–11).
  Private vulnerability reporting is off on the repo (she decides). Plan 3 step 1: public/private questions, Shared with
  you card, Copy to mine, admin keeps public questions of removed accounts. New wiki page Sharing-with-Colleagues.
  1475 checks + test:db (Postgres, MariaDB, MySQL) green.
- **2026-11-15**: `:latest` only for releases (`:edge` for master; weekly cron rebuilds newest tag); re-ran v0.9.0 to reset
  `:latest`. Her sign-in trouble was test@example.com (her local admin is test@test.com). Released v0.10.0 (CI, Release,
  `:latest` = 0.10.0 checked).
- **2026-11-15**: Plan 3 step 2: groups (admin), team banks with editors, Share dialog, editors' edits synced to owners,
  full pull when sharing changes. Kept personal banks as they are (team banks are the lists). 1484 checks + test:db green.
  The file-based shared library (empty on her site, NAS never set up) is removed: team banks replace it.
- **2026-11-15**: her request: a team bank takes several of her banks. **Your banks in it…** fold with a checkbox per bank
  (all courses; partly-in shows mixed; untick takes it out) replaces the one-at-a-time menu; `ui.tbBanks` keeps it open. 1479 checks.
- **2026-11-15**: her request: ½-inch margins on every document type (print, Word, LaTeX; preview sheet too) and no borders
  on Review tables. Checked the print PDFs and the compiled LaTeX page by page. 1479 checks.
- **2026-11-16**: feature request form gained Where / Which documents / Done when / Example / Leave alone. MySQL CI race in the
  team bank test fixed (wait for the redraw). Nightly CI failed once on a Trivy DB download 404 (mirror.gcr.io), not our code.
  Released v0.11.0 (CI, Release, `:latest` = 0.11.0 checked).
- **2026-11-16**: Import & backup: ExamView banks and Courses moved to the right column; the Spreadsheet (CSV) card and
  `parseCSV`/`toCSV`/`fromCSV` removed at her request (backups and bank files keep math and pictures; CSV couldn't).
- **2026-11-16**: her request (tidier Import & backup): Your banks is one list (`yourBanksCard`/`wireBanksCard`): tick boxes
  (`data-bf`, saving none ticked = all), `#bankFind`, first `BANKS_SHOWN` (10) + **Show all** (`ui.allBanks`), row ⋯ menu
  `details.bmenu` (`ui.bOpen` keeps it open after a re-render) with Also use in / Make public / Rename / Delete. The Bank files card
  and `bankCoursesHtml` are gone. 1476 checks.
- **2026-11-17**: released v0.11.1 (CI, Release, `:latest` = 0.11.1; her local site updated). Public site waits for James.
- **2026-11-17**: her request: **Spacing** fold on Build & print (`spacingSection`, `data-sp`, `ui.spaceFold`). `settings.spacing[docType]`
  {es, sa, bm, gap}: '' = each question's own, number = inches, 'lN' = N lines (`SPACE_OPTS`, `spaceOf`, `areaHtml`). `qBody` applies
  it on every document type; `gapHtml` adds an empty `.pt-gap` strip after each question, which Word/LaTeX already turn into
  space (generic empty-div-with-height rule). `migrateSettings` moves the old `reviewSpace` into `spacing.review`. 1479 checks.
- **2026-11-17**: released v0.12.0 (CI, Release, `:latest` = 0.12.0; her local site updated). Public site still waits for James.
- **2026-11-17**: Plan 4 stage 1 (her design, ideas 1 + 3): left rail (`RAIL`, `renderTabs`, `#shell`/`#tabs.rail`, `ui.railMin`,
  Alt+1–4) with places `ui.tab` = pick/arrange/format/print/bank/io ('build' maps to arrange) and sub-tabs `ui.subs[place]`
  (`subsOf`, `curSub`, `go(place,sub)`). Panels carry `data-show="place:sub"`; `renderBank/IO/Build` wrap `_render*` + `showPlace()`
  (sub-tab row, hides other panels, one column when the preview isn't shown). Build page split into cards (Document, Versions,
  Spacing, Accommodations, Page style, Saved, Order, Part directions | preview); folds removed. Tests: `goPlace`, `gotoTab(page,
  tab, sub)` opens the first sub-tab by default ('build' = format:doc). Help, wiki, issue forms updated. 1480 checks.
- **2026-11-17**: released v0.13.0 (CI, Release, `:latest` = 0.13.0; her local site updated). Public site still waits for James.
- **2026-11-17**: Plan 4 stage 2: **Browse banks** (first sub-tab of 1 Pick questions): `renderBrowse`/`_renderBrowse`, `browseBanks()`
  (banks by name + team banks as 'team:<id>'), `ui.brBank/brUnit/brSec` ('__none' = no unit/section, brSec '' = whole unit); at the
  question level it reuses `drawList` (`browsing()` makes `filtered()` use the bank/unit/section instead of the Search filters).
  Add N at random with Undo; banks without units skip the tree (`flat`). `.shell>main{width:100%}` (grid item shrank). 1481 checks.
- **2026-11-17**: released v0.14.0 (CI, Release, `:latest` = 0.14.0; her local site updated). Public site still waits for James.
- **2026-11-17**: design review (`/impeccable critique`, 26/40, snapshot 2026-11-17T03-01-23Z). Her picks: related settings + Next
  first, three steps, all five priority issues. Step 1 done: places pick/setup/print (+bank/io); `OLD_PLACE`/`OLD_SUB` + `oldPlace()`
  map saved 'build'/'arrange'/'format' tabs and subs into setup; setup subs questions/doc/versions/spacing/acc/page; Part directions
  card shows with page; time select moved to the Accommodations card (`.acc-time`), bmMode to Spacing (`.sp-bm`); `.nextbar` Next
  button added by `showPlace` (next Set up sub, then 3 Print; Pick → Set up); Alt+1–3 ignored in inputs. Next: Print finish line
  (clarify), picking-only Search (distill), polish.
- **2026-11-17**: review step 2: 3 Print recap card `#recap` (data-show print:preview) drawn by `drawRecap()` from `recapRows()` (each row
  `data-rc="place:sub"` → `go`), warnings = `printCheck()` + backup (`downloadBackup()` now shared with Import & backup), receipt
  `.rc-done` when the saved test was printed in the last 12 h and isn't dirty (`whenPrinted`); `drawPrintBar` calls `drawRecap`;
  empty test → **Go to 1 Pick questions**; on Print the print-bar warning and the empty-preview button are hidden (recap says it).
  CI flake in the team-banks sync test was a real race: `saveTeam` re-rendered from stale `state.teamBanks` when `CLOUD.sync()` only
  queued (busy); now it applies the saved bank locally before syncing.
- **2026-11-17**: review step 3: `picking()` (place pick): `qCard` shows only Edit (or nothing for read-only colleagues' questions); the
  toolbar drops Check & clean up / + New question and the subbar's Change these… becomes a hint with `#toBank` → Question bank. 1484 checks.
- **2026-11-17**: review step 4 (polish): rail buttons have `aria-label` with counts, `.ri` icon wrapper with `.rn` step number and
  `.rdot` (no recent backup, `backupStale`) shown when folded; bank cards lose the stripe/eyebrow (tags for shared/team); section counts
  spelled out; red Delete for courses/banks/team banks/fields/groups; `.pv-h` keeps Show answers out of the h2; every `.filebtn` button is
  `tabindex=-1 aria-hidden` and its file input carries the name (was a dead tab stop). All four review steps done; re-run critique next.
- **2026-11-17**: released v0.15.0 (CI, Release, `:latest` = 0.15.0; her local site updated). Public site still waits for James.
- **2026-11-17**: re-ran critique (27/40; her picks pending). `/impeccable document` wrote `DESIGN.md` + `.impeccable/design.json` with her choices: North Star "The Teacher's Desk", friendly/personal/crafted, Candle Purple, nearly flat.
- **2026-11-17**: her request: preview as letter-size pages (`drawSheets`, `pvBlocks`, `pvBreaks`, `.pv-page`). Breaks checked against Chrome's printed PDF for test, quiz, review, lesson (same questions on every page). 1486 checks.
- **2026-11-17**: released v0.16.0 (CI, Release, `:latest` = 0.16.0; her local site updated). SSH to github.com timed out; pushed over HTTPS with `git -c credential.helper='!gh auth git-credential' push https://github.com/...`. Public site still waits for James.
- **2026-11-20**: `/impeccable polish` on the 2026-11-17 critique: print bar + format note only on 3 Print (`data-show="print:preview"`), Set up preview has `#toPrint` **Review & print**; Pick cards tick on click (`tick`, `pickAnchor`, Shift = range over shown cards), no bank tag while `browsing()`; empty Set up › Questions → `#selPick`, empty Print hides `.pvcard`; phone rail wraps; bigger tap targets. Tests go to 3 Print before clicking `[data-print]` (`gotoTab(page,'print')`). Issue 4 (six Set up tabs) left for her decision. 1488 checks.
- **2026-11-20**: her requests: Select all / Deselect all (`#selAll`/`#selNone`, all filtered, Undo) replace Add all shown; Pick sub-tabs Search first, Browse banks last; copies: `copyQ` (new id, drops owner/canEdit/visibility, colleague → `origin` + this course), `bankByKey` (name | 'team:<id>' | 'sh:<owner>|<bank>'), `freeBankName` ("(copy)", "(copy 2)"), `copyBank` with Undo via a document-level `[data-copybank]` click; buttons in Your banks ⋯ (Duplicate), Shared with you, Team banks (not your own), Browse banks top bar, Copy to mine on Pick cards. 1492 checks.
- **2026-11-20**: released v0.17.0 (CI, Release, `:latest` = 0.17.0; her local site updated). Public site still waits for James.
- **2026-11-20**: bank-folder trial (her request: better pictures, LaTeX math, mass changes): GEO2024-2026EXAMs → `~/Downloads/BNKv6/GEO2024-2026EXAMs bank folder/` (questions/*.md with YAML front matter + `$LaTeX$`, images/*.png cropped at 300 dpi from her Regents PDFs in ~/Downloads matched by ref MMYYQQ, images/examview/ originals, review.html with KaTeX, make/ scripts). Crop: PDFIMP.open + found[num] stemBox, prose lines masked, edge frames ignored, next page when "continued on the next page"; 85/85 matched. Found + fixed: ExamView 0x80 in equations is ∥ (was €), `bnk.js` + normalize repair. Not in the app yet: import/export of bank folders, KaTeX rendering, LaTeX→OMML for Word.
- **2026-11-20**: her review of the bank folder: fixed crops (prose mask reaches 0.45 line height above for overlines), `\dfrac` for fractions, π as `$\pi$`, no `\,` before `}`, tables as Markdown pipe tables (0825-26, 0126-20 + its lost choice and answer, hand-copied from the PDFs in convert.cjs `FIX`), review page draws tables and spaces choices 1.5 (wider with fractions). `textcmp.cjs` compares every question's words with the PDF: only those two lost text.
- **2026-11-20**: ExamView tables read (see Backlog). Checked: all private banks old vs new (only table questions change), app card + print preview, LaTeX compiled with pdfLaTeX, Word via LibreOffice (Times copy).
- **2026-11-20**: released v0.18.0 (CI, Release, `:latest` = 0.18.0; her local site updated). Public site still waits for James.
- **2026-11-20**: her request: reorder by drag or number + Sort (2 Set up › Questions). `selGroups()` = printed order before shuffling (review open→mc via `reviewKind`, lesson roles, grouped test parts like `buildVersion`, bonus last); `drawSel` rows have `data-drag` handle (HTML5 drag within the same group `data-g`, ↑ ↓ keys) and `data-num` box (clamped to the group); `moveSel` rewrites `state.selected` in group order; `sortSel` + `SEL_SORTS` (`#selSort`), all with Undo. ↑ ↓ buttons removed.
- **2026-11-20**: released v0.19.0 (CI, Release, `:latest` = 0.19.0; her local site updated). Public site still waits for James.
- **2026-11-20**: her picks: current Regents banks next, she downloads the PDFs, app support after. `scripts/bank-folder.cjs` replaces the one-off scripts (finds exam PDFs in ~/Downloads by cover page course + date, skips keys/rating guides; crops question and answer-choice pictures, picks the piece shaped like the bank's picture; tables → Markdown, `"title ||"` spans; keeps ids on re-runs; `\$` = money; log3 → `\log_3`). Folders in ~/Downloads/BNKv6: GEO2024-2026 (redone, same as reviewed), AI2026-2027 and AII2025-2027 (ExamView pictures until she adds Algebra I Jan + June 2026 and Algebra II June 2026 PDFs; then re-run).
- **2026-11-20**: she put the exam PDFs inside each bank folder (`Algebra 1 Regents Exams/`, `Algebra 2 Regents Exams/`; run with `--pdfs`). Covers can split "ALGEBRA I" into pieces: course matched with `\b` on the whole cover. Answer-choice pictures (graphs, small tables; labels under the picture) found as separate ink blobs (6 px cells, ≤4 pt gaps, light gray counts) and given to the nearest (1)–(4) label, labels painted out. AI2026-2027: 21/21 pictures from PDFs; AII2025-2027: 11 from PDFs + 2 fall samples from ExamView.
- **2026-11-20**: her review of AI2026-2027: table title stays the first row (`title |||` span), bold kept as in the bank (`**…**`, header cells not bold by default; first column bold for across tables), single letters used as variables in text become math (`$x$`; not "a", not after a number like "5 m", not capitals). Review page applies bold/italics after drawing math. All three folders rebuilt.
- **2026-11-20**: her request: bank files from the bank folders now (option 1; LaTeX in the app later). `scripts/bank-file.cjs`; folders keep `space`/`answerArea`/`lines`. `importBankData` matches a missing id by bank + ref when the ref is unique on both sides: keeps the existing id and her unit/section/topic/standards/notes/extra/visibility. Files in ~/Downloads/BNKv6: `GEO2024-2026EXAMs bank file.json` (6.8 MB), `AI2026-2027EXAMs bank file.json`, `AII2025-2027EXAMs bank file.json`. Checked: bnk import then bank file → 148 updated, 0 added.
- **2026-11-20**: released v0.20.0 (CI, Release, `:latest` = 0.20.0; her local site updated). Public site still waits for James.
- **2026-11-20**: her request: more banks. All 18 current-framework and Common Core Regents banks for Algebra I, Algebra II, Geometry are bank folders + bank files in ~/Downloads/BNKv6 (PDFs: `AI2026-2027EXAMs bank folder/Algebra 1 Regents Exams`, `AII2025-2027EXAMs bank folder/Algebra 2 Regents Exams`, `BNKv6/Geometry Regents Exams`). Tool: Common Core titles match covers (prefer the cover that says COMMON CORE on a shared date); answer-choice pictures: every ink piece goes to a label in its column, trying "label under picture" and "label at/above picture", keeping the way whose shapes fit the bank; question pictures may be several parts with no sentence between; titles under graphs kept (a sentence = line with words starting at/left of the text margin, or ≥45 chars); a crop whose shape differs >25% from the bank's is NOT used (bank picture kept) unless the bank's is blank; questions without a ref are named qNNN; stale .md removed. App: ExamView 0xaa = ℓ (normalize repairs ª), `pdfimp` margin from lines ≥3 chars and question numbers lined up with the previous one (`numX`). Missing PDFs: Algebra I June 2021; Geometry CC Aug 2015–Aug 2016, Jan–Aug 2017, June 2018.
- **2026-11-20**: released v0.20.1 (CI, Release, `:latest` = 0.20.1; her local site updated). Public site still waits for James.
- **2026-11-21**: new exams without a bank: Geometry Aug 2026 fill-in spreadsheet `Regents exams/Geometry/Geometry August 2026 questions.xlsx` (# , start, type, credits + MC answers from the scoring key, Cluster from rating guide p.12 written G.CO.B; purple columns for her: unit, section, standard, topic, subtopic, answer/notes). Paused: she wants topics/subtopics re-based on NGLS or a textbook; proposed Unit/Section/Topic/Subtopic from her Scope & Sequence (= Big Ideas Geometry chapters/sections), standards/clusters official, JMAP topic kept in her own field, via a one-row-per-JMAP-topic mapping sheet. Moved all bank work from ~/Downloads/BNKv6 to ~/Documents/TestBuilderResource (her request; her EMathGeometryExams&Reviews folder left in BNKv6).
- **2026-11-21**: topics plan. Her Curriculum folder: `CURRICULUM MAP NGLS GEOMETRY 2024 - 2025.pdf` (11 units + lessons, standards per unit, Big Ideas pages) and `Pacing Guides Geometry - Multiple Resources .xlsx` (sheet JMAP: JMAP topic/subtopic → cluster, standard, her unit; covers 984/1023 Geometry questions; one row says Unit 20; 13 topics in several units). Her choice: a topic keeps ALL its units. Made `Curriculum/Geometry JMAP topics to your lessons.xlsx` (110 rows: units + suggested unit.lesson, 36 flagged; sheets Your lessons, How to check); generator + her lesson list in `Curriculum/tools/` (kept out of the repo). Next after her review: apply to the 5 Geometry bank folders (Unit/Section/Topic from her lessons, JMAP topic/subtopic into her own fields) and teach the app several units per question (unit "2, 4, 5" with matching sections; filters/Browse banks match any).
- **2026-11-21**: her topic style (from her Excel notes on the 40-question sample): short general skills, no parentheses/theorem names/"real-life", compositions say rigid motions or similarity transformations, coordinate proofs say "special parallelogram". Read Big Ideas "What You Will Learn" for all 58 sections (`Curriculum/Big Ideas Geometry Textbook/geo_pe_CC_SS.pdf`, no Ch. 2). `Curriculum/tools/vocab.py`: 44 topics / 106 subtopics with book sections + rules (JMAP label + question text) → all 1,023 Geometry questions labeled (94 subtopics used), spot-checked per subtopic. Review workbook `Curriculum/Geometry new topics - all questions.xlsx` (By subtopic, All questions, list). Waiting on her review before writing labels into the bank folders / bank files.
- **2026-11-21**: she approved the Geometry labels. All 1,023 question files in the 5 GEO bank folders now have the new topic/subtopic; JMAP's moved to `JMAP topic`/`JMAP subtopic` (her own fields; `Curriculum/tools/apply_labels.py`). `bank-folder.cjs` keeps topic/subtopic/unit/section/notes and unknown keys on re-runs (`TOOL_KEYS`/`KEEP_KEYS`); `bank-file.cjs` turns unknown keys into app fields (`f_<name>`, matched by label on import). App: `importBankData` ref-match now takes the file's topic/subtopic/standards, keeps her unit/section/source/notes when the file has none. 5 GEO bank files rebuilt. Units (multi-unit) not applied yet.
- **2026-11-21**: Algebra I/II topics drafted the Geometry way from her curriculum maps (`Curriculum/CURRICULUM MAP ALGEBRA 1 2023 - 2024.pdf` = her high school map, 11 units by book chapter; NOT the middle school `Algebra 1 Next Generation Standards Curriculum 2023.pdf`; `Algebra 2 NGS Curriculum Map.pdf`) and Big Ideas TEs (`BigIdeasAlgebra1TE/` 2019, `BigIdeasAlgebra2TE/` 2024; her A2 map follows the older chapter order: book 8→her 10, 9→11, 10→9, 11→8). `Curriculum/tools/a1vocab.py` (29 topics/93 subtopics, 1,198 questions) and `a2vocab.py` (23/77, 966), each with book section + her unit; review workbooks `Curriculum/Algebra 1|2 new topics - all questions.xlsx`. Waiting on her review; then apply like Geometry (`apply_labels.py` with the algebra vocab).
- **2026-11-21**: she approved the Algebra labels (A1 units from her HS map; combine functions = Unit 5; the one surface-area question → Expressions › interpret an expression in context; Geometry Review dropped). `apply_labels.py <vocab> <qs.json>` wrote topic/subtopic + JMAP fields into all 2,164 question files of the 13 Algebra folders (re-run safe); 13 Algebra bank files rebuilt, every question checked. Units not written yet (each Algebra subtopic has one unit in `a1vocab.unit`/`a2vocab.unit`). Bank files need the unreleased `importBankData` change (next release) to replace old topics.
- **2026-11-21**: released v0.21.0 (CI, Release, `:latest` = 0.21.0; her local site updated). She can now open all 18 rebuilt bank files (5 Geometry, 13 Algebra) to get the new topics.
- **2026-11-21**: her public site was updated by James on 2026-11-20 and runs v0.20.1 (she reported it). James updates it; it needs v0.21.0 before the new bank files bring topics there.
- **2026-11-21**: her request: units + sections in all banks. `Curriculum/tools/unitsec.py` maps every subtopic of each course to ONE (unit, lesson number) from her maps (Geometry lessons.py UNITS; A1 = bullets per unit of the HS map; A2 = her lesson numbers, older book order); '' lesson when a subtopic spans several. Written into all 3,187 question files (unit/section before topic; bank-folder.cjs keeps them), all 18 bank files rebuilt (3,185 with a unit; 2 A2 inequality questions have none). Review list: `Curriculum/Units and lessons for every subtopic.xlsx`. Geometry multi-unit (her earlier choice) is still not in the app; each subtopic has one primary unit for now.
- **2026-11-21**: she asked to use the units from the reviewed "<course> new topics - all questions.xlsx" workbooks instead: `Curriculum/tools/unitsfromsheet.py` (Geometry = all Pacing Guide units of the JMAP topic, e.g. "1, 5, 8" with sections in the same order when all known; Algebra = aXvocab.unit; section from unitsec.py when same unit). Folders verified equal to the workbooks; 18 bank files rebuilt; the separate units list was removed. 86 Geometry questions have several units, which the app still treats as one text value: next step is teaching the app several units per question (filters/Browse banks match any).
- **2026-11-21**: her correction: section = the Big Ideas book section (e.g. 8.4, ranges like 4.1–4.5 kept as written), NOT her lesson numbers (a lesson isn't a section). `unitsfromsheet.py` now writes unit + Book section exactly as in the three workbooks (verified equal); 18 bank files rebuilt. `unitsec.py` lesson numbers are no longer used.
- **2026-11-21**: her request: several units per question. `unitsOf`, Unit menu lists single units, filter/Browse banks match any unit, card "Units 10, 11", editor hint. Test in ui.test.cjs (several units per question). Wiki Question-Bank, CHANGELOG.
- **2026-11-21**: released v0.22.0 (CI, Release, `:latest` = 0.22.0; her local site updated). Public site (James) still v0.20.1.
- **2026-11-21**: eMath N-Gen Geometry PDFs (`~/Documents/TestBuilderResource/EMathExams&Reviews/GeometryNG/`, 77 files: assessments A/B, mid-unit quizzes, unit reviews; keys inside ("wKEY") or separate "Answer-Key" files). Their math is MathType: symbols/overlines don't survive as text, so the app's PDF Text mode garbles math and drops diagrams. Sample converted here by hand: Unit 1 Assessment Form A → `Bank folders/eMath N-Gen Geometry bank folder` (15 questions, LaTeX, 11 diagrams cut at 300 dpi from test pages with `Curriculum/tools/emcrop.cjs` + boxes json, key explanations in notes / answer notes, source "Unit 1 Assessment Form A #n", ids qemu01asmtaNN) + bank file; `emprint.cjs` prints test + key from the app into the folder for review. New Geometry subtopics: classify angles (1.5), use angle addition and bisectors (1.5), use midpoints and segment bisectors (1.3). Keep this bank Private (key copyright). Waiting on her review before the other 76 files.
- **2026-11-21**: her request: rest of eMath Unit 1. Converted Assessment Form B (15), Mid-Unit Quiz A (7) and B (7; its PDF has only key pages, so diagrams were cut from the key with answer labels blanked), Unit Review (25; free response has no points in the PDF → 2 each; #16–17 short answer; #24–25 keep their drawing space via `notrim`). Shared writer `Curriculum/tools/emath_lib.py` (label tuples PLP, PAIRS, …) + one `emath_<file>.py` per PDF; `emcrop.cjs` gained `blank` and `notrim`; `montage.cjs` (scratch) shows all crops at once. Bank file: 69 questions, 50 pictures. Review PDFs (test + key per file, printed from the app with the matching doc type) in the bank folder. Next: Unit 2 (keys are separate "Answer-Key" files from Unit 2 on).
- **2026-11-22**: her request: section without the chapter ("1.1" → "1", "4.1–4.5" → "1–5"). `Curriculum/tools/shortsec.py` rewrote all 3,239 sections in the 19 bank folders and reports where the book chapter isn't her unit (811 questions: A1 units ≠ book chapters, A2 book 2024 order ≠ her map, a few Geometry); `unitsfromsheet.py` and `emath_lib.py` write short sections now. All 19 bank files rebuilt.
- **2026-11-22**: her rule for sections: in each Curriculum Map, the bullets under a unit are its sections in order (sub-bullets belong to the bullet above); not book sections. `unitsec.py` holds that position per subtopic (A2 renumbered by position: 2.1, 2.2, 2.4 → 1–3; 7.1, 7.2, 7.5 → 1–3; 8.5 → 4; ch. 11 Regression Equations = 7; focus/directrix not in her map → none). `unitsfromsheet.py` writes it again (Geometry multi-unit: one section per unit, only when all known) and `emath_lib.py`/`emath_u1a.py` use `mapsec`. `shortsec.py` (book section without chapter) is no longer used. 19 bank files rebuilt.
- **2026-11-22**: her rule: a question is labeled with the LAST unit it uses (and that unit's section); earlier units go in her own field "Also uses" ("Unit 10 · Sec 3"); filtering/Browse show it only under the labeled unit (so units are single again; the app's "10, 11" support stays but is unused). Subtopics spanning several sections get a section per question from their words (`unitsfromsheet.py` `decide`/`other_unit`/`seq_kind`: solids → volume lesson, transformation words, arithmetic vs geometric from the terms, substitution vs elimination, …). Left without a section where her map has no bullet: 36 Geometry, 15 Algebra 1 (graph a polynomial, solve by graphing, combine functions), 38 Algebra 2 (focus/directrix, three-variable systems). 86 Geometry questions have Also uses. 19 bank files rebuilt.
- **2026-11-22**: "Rationalize" questions were labeled rational vs. irrational (the rule matched "rational" inside "rationalize"); `a1vocab.py` now matches whole words. Jan 2025 #30 and Fall 2023 sample #3 relabeled Radicals › simplify and operate with radicals (Unit 1 · Sec 3); AI2023-2025 bank file rebuilt.
- **2026-11-22**: eMath Unit 2 converted (her request "Unit 2 and keep going"): Assessment A (13 q), B (13), Mid-Unit Quiz A (7; no Form B exists), Unit Review (30; free response 2 pts, 4 for 30's (a)–(d)); keys are separate PDFs. Not done: `Geometry-Unit-2-Spiral-Review` (a mixed spiral review, not converted). `emath_lib.py` gained Unit 2 label tuples and `msec` (her last-section rule per question). eMath bank file: 132 questions, 88 pictures. Flagged in notes: Form B #6 eMath key says (3) 67° but the question gives 53° (key used x − 21); Form B #3 lists m∠Q twice. `emprint.cjs` headers now use the unit from the id prefix.
- **2026-11-22**: eMath Unit 3 converted: Assessment A (14 q, 45 pts; the student copy says /44, key says /45), B (15, 42), Mid-Unit Quiz A (7, 18), Unit Review (26; proofs/two-part 4 pts, others 2). Questions with an earlier unit's skill carry `also` → her field "Also uses" (emath_lib writes it). Form B #4's answer box is hidden under the key's note; its note says (4). Spiral reviews still skipped. eMath bank file: 194 questions, 138 pictures. Next: Unit 4.
- **2026-11-22**: eMath Unit 4 (Constructions) converted: Assessment A and B (12 q, 40 pts each), Mid-Unit Quiz A (5, 12), Unit Review (26; 2 each, #18 3; #1 MC). All constructions: crops keep the blank drawing space (`notrim`, space 0.25); answers are written construction steps (the keys are drawings). eMath bank file: 249 questions, 188 pictures, 12.6 MB. Next: Unit 5.
- **2026-11-22**: eMath Unit 5 (Coordinate Geometry) converted: Assessment A and B (15 q, 46 pts each), Mid-Unit Quiz A (7, 20; no Form B), Unit Review (28; free response 2, 4 for the ones with parts). Questions get her unit for the skill (slopes/lines Unit 3, distance/midpoint Unit 1, reflections/rotations Unit 4, isosceles with coordinates Unit 5, altitude by Pythagoras Unit 9) with Also uses. New Geometry subtopics in `vocab.py`/`unitsec.py`: Equations of Lines › find the slope of a line, write an equation of a line (Unit 3 · Sec 5). Crop boxes kept in `Curriculum/tools/emath_u5{a,b,q,r}_boxes.json`. eMath bank file: 314 questions, 220 pictures, 15.5 MB. Next: Unit 6.
- **2026-11-22**: her request: Search filters narrow each other. `facetOn` (set while the Search toolbar renders) makes `uniq`/`uniqX` list values from `facetPool(key)` = questions matching every other filter (search text ignored) plus the current pick (`facetPick`); `FKEY` maps standard→std, subtopic→sub. Select changes call `refilter(el)` (renderBank + refocus). Editor lists and Pick at random still list everything. Test in ui.test.cjs (filters narrow each other).
- **2026-11-22**: released v0.23.0 (CI, Release, `:latest` = 0.23.0; her local site updated). Public site (James) still v0.20.1.
- **2026-11-22**: AP work (outside the repo): `~/Documents/TestBuilderResource/APResources/` holds the official AP Central PDFs for 6 courses (index.md), `AP math curriculum outline.xlsx` (units/topics/objectives + her short subtopics, tools/ in that folder), and the first AP bank: `Bank folders/AP Precalculus FRQ bank folder` (2024–2026 FRQs, 12 × 6 pts; unit/section = CED topic number, standard = objective code, cluster = AP question type) + bank file. Fixed in the app: `isTall` now adds `htmlInches(q.html)` (text length, `<br>`, picture height from the PNG header) to the answer space; > 7 in → `.long` (may break), so a tall first question no longer leaves page 1 blank.
