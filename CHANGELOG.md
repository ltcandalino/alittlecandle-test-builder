# Changelog

All notable changes to ALittleCandleTestBuilder are listed here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- **Download as LaTeX:** Format → LaTeX (.tex) downloads a .zip with the LaTeX file (exam class, pdfLaTeX, ready for Overleaf) and its pictures: same layout as the paper, with real LaTeX math for segment and arc marks, fractions and roots, and the math symbols set up. The accommodated copy keeps its larger size and spacing.
- **Download as Word (.docx):** a **Format** menu in the print bar (PDF, Word, Print…). With Word, the buttons download one editable file with the tests, answer keys and accommodated copy, each starting on a new page with its own page numbers and headers, laid out like the printed paper, with real Word equations, pictures (shrunk to print size) and tables. A test is typically 10 to 30 KB.
- A candle icon for the browser tab (favicon) and the top-left corner of the app, in both the single file and the website.

### Changed
- Word import recognises answer choices written on one line separated by tabs, like "(1) a ⇥ (2) b ⇥ (3) c".

## [0.7.1] - 2026-11-13

### Changed
- Website setup: `docker-compose.yml` now uses the ready-made GitHub image by default, so a server only needs `docker-compose.yml` and `Caddyfile`, and updates are `docker compose pull && docker compose up -d`. Building it yourself is still possible (`build: .` instead of `image:`).

### Fixed
- Printing no longer starts with a blank page. The first version was getting a page break in front of it, because the print's page settings sit before it in the page.
- An old `docker-compose.yml` that kept `build: .` next to a new `image:` line silently ran the old version from the local files. The setup guide now explains it, and the default file no longer has the trap.

## [0.7.0] - 2026-11-13

### Added
- **Saved tests** on Build & print: save a test under a name, and come back to it later to look at, change or reprint it, the way ExamView worked. **Printing saves the test automatically** with the print date. Open, Rename, Duplicate (e.g. to start next year's version) and Delete (with Undo); find one by name when you have many. If the current test has unsaved changes, opening another asks first.
- If questions were edited or deleted from the bank since a test was saved, opening it says so and uses the questions **as printed** (so reprints and keys match what was handed out), with **Use the latest versions** to switch. Saved tests are in backups and sync to the website version (their pictures reuse the uploaded files).
- **Accommodations** on Build & print: print an extra accommodated copy of one version with a dyslexia-friendly font (Atkinson Hyperlegible or OpenDyslexic, built in), large print (14 or 18 pt, with pictures and answer spaces scaled up), extra spacing, and 1 or 2 questions per page. It has the same questions and answer order as its version, so that version's answer key works (the key says so), and nothing on the student's copy says "accommodated". Preview it with the **Accommodated** tab; print it with **Print tests + answer keys** or **Accommodated only**.
- Atkinson Hyperlegible and OpenDyslexic can also be chosen as the font for a whole test (Page style → Font).
- **Help** at the top now opens a short help panel inside the app (bringing in questions, picking, printing, answer keys, backups, keyboard), with a link to the full user guide.
- GitHub checks scan every Docker image for known vulnerabilities (Trivy) before it's published, show the results in the repository's Security tab, and stop if a high or critical problem has a fix available. A weekly run rebuilds the image from the latest base-image fixes and scans again.
- Website (Docker) version: choose the database. SQLite stays the default (nothing to set up); set `DATABASE_URL` to use **PostgreSQL** (preferred) or **MySQL / MariaDB**. Ready-made add-ons `compose.postgres.yml` and `compose.mariadb.yml`. Switching from SQLite copies all accounts, questions and settings over on the first start. The app waits for a database that is still starting.
- `npm run test:db`: runs the server and sync tests on real PostgreSQL, MariaDB and MySQL in Docker; GitHub runs them on every change too.
- Print bar: a warning that stays visible when questions have no correct answer (with a **Fix** button), and a "Printing 2 of 4: Version B" strip with **Stop after this one** while several print windows open.
- **Aa Display** button at the top: app font (Standard, Atkinson Hyperlegible or OpenDyslexic), text size (Normal, Large, Larger), High contrast and Less motion. Saved per person in that browser; printouts don't change. The two fonts are built into the app (SIL Open Font License), so they work offline.
- Keyboard and screen-reader support: a visible outline on whatever has keyboard focus; the math symbol row in the editor is reachable with the keyboard (one Tab stop, arrow keys inside) and each symbol has a spoken name; Tab stays inside the question editor; the current section is announced; each "Put on test" checkbox names its question.

### Changed
- Question editor: Type, Points, Unit, Section and Standard in one row, then the question box (the cursor starts there, at the end of the text), then the answers. Everything else is under **More details**, which opens by itself when a question has any of those filled in.
- Print buttons are greyed out until you pick questions. **New scramble** asks "Make new versions?" first and offers Undo. Part directions moved above the preview.
- Setup guide: a full **Behind your own proxy** section for running without the bundled Caddy (port 8080 for the proxy only, `X-Forwarded-For`, 25 MB uploads, nginx / Apache / Nginx Proxy Manager examples).
- Works on phones and narrow windows: no sideways scrolling, the header scrolls away, and question cards put Edit / Copy / Delete under the question.
- A **Help** link at the top opens the user guide. The empty Question bank offers **Import questions** (ExamView, Word, PDF, spreadsheet, paste), not only ExamView. The paste example is math. The editor explains what **Bimodal** means. **Delete** on a card is red.
- **Copy** no longer adds "(copy)" to the question's reference. The Questions box no longer shows versions as a count (the print bar shows it).
- Question bank: four main filters (unit, section, topic, standard); the rest are under **More filters**, which shows how many are in use. Active filters show as chips you can click to remove, plus **Clear filters**. Sort moved next to "Showing … of …".
- Question cards say **Unit 3 · Sec 2** instead of two bare numbers, ticked cards get a teal outline, and notes are labeled **My note:**. The unit and section menus say "Unit 3" and "Section 2".
- Build & print: font, size, answer labels, bimodal printing, scrambling and layout are folded under **Page style** (remembers open or closed). "Students need" for lessons stays in view.
- One color (teal) for every selected button: document type, version letters, toggles.
- Gray hint text is darker so it's easy to read (it now meets the WCAG AA contrast standard), and so is the "Short answer" label. The "Saved" dot is a clearer green.
- Build & print: the paper preview now comes right after the question list, and the print buttons sit in a bar at the bottom of the preview that stays in view while you scroll and shows "3 versions · 12 questions · 26 points". **New scramble** moved next to the version letters; Part directions moved below the preview.
- Backup is now the first box on Import & backup, and shows when you last downloaded one (bold after two weeks).

### Fixed
- Docker image: fixed the vulnerabilities Docker Scout reported (1 critical, 7 high): Alpine packages are upgraded during the build, and npm, which brought six of them, is no longer in the finished image (the server doesn't use it).
- Pressing Esc right after opening the question editor now closes it (the key used to be missed for a moment).
- The question editor no longer throws away your changes when you press Esc, click Cancel or click outside it: it asks **Keep editing** or **Discard changes**. Closing it puts you back on the question's Edit button.
- **Restore a backup** used to quietly merge (skipping edited questions and your settings) when you already had questions. It now asks: **Replace everything with this backup** (with Undo) or **Add the missing questions**.
- "That isn't a ALittleCandleTestBuilder backup file" now reads "an".

## [0.6.0] - 2026-11-13

### Added
- GitHub Actions CI: runs all tests, then builds, checks and publishes the Docker image to
  GitHub Container Registry.
- Option in `docker/docker-compose.yml` to use the GitHub-built image instead of building on the server.
- This changelog.
- `AGENTS.md` handoff notes for AI assistants (architecture, rules, status, backlog, work log).
- Full test suite (`npm test`, about 150 checks): core helpers, building documents, importers
  (Word, PDF, ExamView), clicking through the app, the Docker server's API, and syncing between two
  browsers. Real banks in `tests/fixtures/private/` (not committed) are tested when present.
- `scripts/docker-test.sh`: builds and checks the Docker image on your own computer.
- Version number: `VERSION` file, shown next to the app name and reported by the server's `/healthz`.
- Release tooling: `scripts/release.py` (semantic version bump, changelog, tag) and a Release
  workflow that publishes GitHub Release notes from the changelog with the app and Docker files attached.
- Docker images are tagged with the version (`1.2.3`, `1.2`, `1`), `latest` and `edge`.
- User guide in `wiki/` (Getting Started, Importing Questions, Question Bank, Building Documents,
  Printing and Answer Keys, Courses, Backups and Sync, Website Setup, Troubleshooting) and a
  workflow that publishes it to the GitHub wiki.
- Dependabot (`.github/dependabot.yml`): weekly update pull requests for GitHub Actions, the Docker
  base image and the test tools.

### Changed
- Node 26 (current LTS) for the Docker image and CI, was Node 22.
- pdf.js 6.5.438 (was 6.2.108) for PDF import.
- GitHub Actions updated to their newest versions (checkout, setup-node, setup-python, upload-artifact
  v7; Docker actions v4–v7); CI uses the newest Python 3.

### Fixed
- Question cleaning could run an image's `onerror` code from pasted or imported HTML; it now uses an
  inert template and drops scripts, styles and embedded objects completely.
- Pictures synced through a server without HTTPS (like a local Docker test at `http://localhost`)
  were removed when a question was shown or edited.
- "GEO…" bank file names are now recognized as Geometry.
- Sync: an edit made while an upload was still running could be marked as synced and never reach
  the server.
- `package.json` had broken quotes in the test command, so `npm install` and CI failed.

## [0.5.0] - 2026-11-12

### Added
- Source code in a git repo: `src/`, `vendor/pdfjs/`, `build.py`, `docker/`, `supabase/`, README.

## [0.4.0] - 2026-11-11

### Added
- Document types: **Test, Quiz, Review, Lesson**, matching the Word templates.
  - Every page has the course name centered with a bar under it (bold on the first page).
  - Test/Quiz: "Quarter # – Unit # Exam/Quiz" title line with the unit title in italics; teacher,
    calculator and time accommodation line; credits like [2] under open-response questions;
    bonus questions (printed last, not counted in the score box).
  - Review: bordered table with Short/Extended Response and Multiple Choice sections (purple
    header row), small gray references, choice of work space; "Unit # Review" header on pages 2+.
  - Lesson: "I am learning to", Warm Up!, Notes, Essential Concept box, Examples with concept names,
    Success Criteria, Practice; per-question Warm Up / Example / Practice roles; "3-4"
    unit-section label; Q#W##D### and Source footer on pages 2+.
  - Lesson "Students need" pictures: compass, ruler and tracing paper, each optional.
- Inputs for quarter, unit, section, week and day numbers; automatic title lines.

### Changed
- The old "Standard" print style is replaced by the course-name header on every document.
  Saved settings move over automatically.

## [0.3.0] - 2026-11-11

### Added
- Website version with separate logins:
  - Docker all-in-one server (Node 22, built-in SQLite) with admin "Manage accounts", plus Caddy for HTTPS.
  - Alternative GitHub Pages + Supabase setup.
- Sync between computers, with offline work that catches up later.

### Fixed
- Firefox "page is slowing down" during big PDF imports and large banks.

## [0.2.0] - 2026-11-10

### Added
- PDF import (text or picture per question, clipping, answer key paste, source name).
- Word (.docx) import with math, pictures, tables, parts and credits; picks up the exam header.
- Classic exam layout like the Word exams: running header, Parts I–IV with directions and
  totals, computation box, score box, "v. 1" footer.
- Multiple courses with their own banks and settings.
- Calculator type and time accommodation on the first page.
- Renamed to **ALittleCandleTestBuilder**.

## [0.1.0] - 2026-11-09

### Added
- Single-file test builder that runs in the browser.
- ExamView `.bnk` import, including math equations and pictures.
- Question editing and details: unit, section, topic, subtopic, standard, cluster, notes,
  reference (MMYYQQ → month, year, question #).
- Question types: multiple choice, bimodal (print with or without choices), true/false,
  short answer, extended response.
- Scrambled versions with matching answer keys; font choice (Century Schoolbook 12 pt default).
