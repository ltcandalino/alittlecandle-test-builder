# Changelog

All notable changes to ALittleCandleTestBuilder are listed here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.13.0] - 2026-11-16

### Changed
- **One thing at a time** (Plan 4, stage 1): a **rail on the left** replaces the three top tabs. Making a test is four steps: **1 Pick questions**, **2 Arrange**, **3 Format**, **4 Print**, then **Question bank** and **Import & backup**. Each place has buttons across the top that show one panel at a time: for example **3 Format** has Document, Spacing, Accommodations and Page style, with the preview beside them; **2 Arrange** has Order, Versions (with scrambling) and Part directions; **4 Print** has the preview with the print buttons, and Saved tests. **Alt+1** to **Alt+4** jump to the steps, and **« Icons only** makes the rail narrow. On a phone the rail is a row across the top. Nothing about your questions, settings or printouts changes.

## [0.12.0] - 2026-11-16

### Added
- **Spacing** on Build & print, for every document type: room to answer for open response, short answer and bimodal questions (blank space or answer lines, or each question's own size), and extra space after each question. Each document type remembers its own spacing, in print and in Word and LaTeX downloads.

### Changed
- Review's **Work space** menu moved into **Spacing**; what you had chosen carries over.

## [0.11.1] - 2026-11-16

### Changed
- **Import & backup**: **ExamView banks** and **Courses** moved to the right column, so the two columns are closer in length.
- **Your banks** is one tidy list: a line per bank with a tick box, and a **⋯** menu for Also use in (courses), Make public, Rename and Delete. With many banks it shows 10 at a time, with **Find a bank** and **Show all**. **Save all as files…** and **Open bank files…** moved here from the old Bank files card (tick banks to save only those).

### Removed
- The **Spreadsheet (CSV)** card (Import CSV, Export CSV, Blank template). Spreadsheets couldn't hold math or pictures; use **Download backup** or **Bank files** to keep or share banks.

## [0.11.0] - 2026-11-16

### Added
- **Team banks** on the website (Import & backup → **Team banks**): a list of questions shared with a group, even private ones like a textbook bank your department bought. The owner picks the groups and the **editors**, who can fix the questions (the owner's copy shows who changed it); everyone else in the group can use them on tests. Tick as many of your banks as you like under **Your banks in it…** (from any course; untick to take one out), or one question with the new **Share** button. Team banks show as purple tags and in the Bank filter.
- **Groups** in Manage accounts (admin): name a group and tick who is in it.
- **Share** on each of your questions: add it to team banks, or make it public.

### Changed
- **Margins** are ½ inch on all four sides for every document type and answer key, when printing and in Word and LaTeX downloads (were 1 in × ¾ in, lessons 0.8 in × ½ in). The header sits ¼ inch from the top edge.
- **Review** tables print with **no borders** (the purple Multiple Choice heading stays shaded).
- The GitHub **Feature request** form also asks where in the app, which documents, how you will check it is done, an example to test with, and what to leave alone.

### Removed
- The **Shared library** card and its server folder (`LIBRARY_DIR`): team banks replace it, and stay up to date when someone fixes a question. Bank files you saved still open with **Open bank files…**; any `.json` files left in the old library folder can be opened the same way.

## [0.10.0] - 2026-11-15

### Added
- **Public and private banks** on the website: every question is private until you make it public. **Make public** next to a bank on Import & backup (or **Who can see it** in the editor) shares it with everyone who has an account on your site. Colleagues find it under **Shared with you**, tick the courses to use it in, and see its questions with a **Shared by …** tag. Only the owner can change them; **Copy to mine** makes your own private copy. Making a bank private again removes it for colleagues. When the admin removes an account, its public questions stay.
- Issue forms on GitHub (**New issue**): Bug report, Import problem, Feature request, Question / help, plus `SECURITY.md` for reporting security problems privately.

### Changed
- The `:latest` Docker image now only changes when a version is released (before, it also picked up unreleased work). Unreleased work is published as `:edge` for trying out. The weekly security rebuild refreshes the newest release.
- CI checks every Docker image holds only the app (no questions, banks, accounts or pictures); the guides say so.

## [0.9.0] - 2026-11-14

### Added
- **Change these…** on the Question bank tab (replaces "Set unit / section"): change one detail on every question shown, or only on the ticked ones. Set it, add to it, find and replace, or clear it. Works for unit, section, topic, subtopic, standard, old NY standard, cluster, bank, source, part, points, notes and your own fields. Undo right after.
- **Check & clean up** on the Question bank tab: finds questions with old NY codes mixed into the standard, no cluster, no correct answer, no standard, no unit or no section. One click moves the old NY codes to their own field, fills in clusters from the standards, or copies a unit and section from other questions with the same standard. **Show them** lists the questions that need you. Every fix can be undone.
- **Needs attention** filter under More filters: no correct answer, no standard, no unit, no section, no cluster, old NY codes in the standard.
- **Old NY standard** field. ExamView imports now put codes like "NY: A.N.1" there and keep only the Common Core code in Standard.
- **Your own fields** (Import & backup): add details like DOK or difficulty. Fill them in under More details in the editor (or add one right there), filter by them, change many at once, and they come and go as CSV columns. They sync on the website and are in backups.
- **Bank files** (Import & backup): save banks as `.json` files, one per bank, straight into a folder you choose (Chrome and Edge; other browsers download them). Opening bank files adds their questions and updates the ones you already have from them. Your own fields are matched by name.
- **Shared library** on the website: share a bank with everyone who has an account on your site, and add theirs to your own questions. Only the person who shared a bank (or the admin) can replace or remove it. The library is a folder on the server (`LIBRARY_DIR`, default `/data/library`), so it can be a NAS folder.

### Fixed
- ExamView banks: newer Regents banks (Algebra I 2020 onward, including 2023–2024 and 2023–2025) put "2pt multiple choice", the course code and "EXAM 0123AI" next to the topic. The reader mixed these up: the topic said "2pt multiple choice", the subtopic held "012301ai; AI; Operations with Polynomials; subtraction; EXAM 0123AI", and the reference was empty. Now the reference, topic and subtopic each land in their own field. Questions you already imported are fixed automatically the next time the app opens; no need to import them again.
- ExamView banks: the Algebra II 2018–2019 bank froze the browser while importing. One question in it has an unusual layout that sent the reader into an endless loop. It now reads all 222 questions in a fraction of a second.
- ExamView banks: equations written on more than one line (systems of equations, recursive formulas) ran together, like "3.50H+2.50P=43H+P=14". Each line now starts on its own line. Found in the Algebra I 2018–2019 bank (35 questions). Already-imported banks need to be imported again to pick this up.
- ExamView banks: a few questions with one equation or picture were left out on import (9 questions across Sequential III 1988–1989, 1990–1991, 1994–1995, 1996–1997 and "Ch 7 Extra Prepared Test"). All of them come through now; import those banks again to get them.

## [0.8.3] - 2026-11-14

### Changed
- The last greens are purple too: the "Open response" label (True/False labels are now plum so the two still look different), the "saved" dot, the answer highlight on answer keys, and the tab icon's tints.

## [0.8.2] - 2026-11-14

### Changed
- The app's accent color is purple (#7851a9) instead of green: buttons, selected questions, tags, focus outlines and the browser-tab icon. Printed papers and answer keys are unchanged.

## [0.8.1] - 2026-11-14

### Changed
- Reference numbers (MMYYQQ) and the Question # box accept question numbers up to 50 (was 36). References that were too high before are read the next time the app opens.

## [0.8.0] - 2026-11-14

### Added
- **Share a bank between courses:** on Import & backup, **Courses…** next to a bank puts its questions in other courses too, as one shared copy (an edit shows up everywhere). The question editor has course checkboxes under More details. **Delete** on a shared question, bank or course only takes it out of the current course. CSV keeps several courses separated by semicolons. Older saved data loads unchanged.
- **Your logo** in the top-left corner of the app.
- **Sort newest first** in the question bank: "Newest added first" and "Exam date, newest first" (the old exam-date choice is now "Exam date, oldest first").
- **Download as LaTeX:** Format → LaTeX (.tex) downloads a .zip with the LaTeX file (exam class, pdfLaTeX, ready for Overleaf) and its pictures: same layout as the paper, with real LaTeX math for segment and arc marks, fractions and roots, and the math symbols set up. The accommodated copy keeps its larger size and spacing.
- **Download as Word (.docx):** a **Format** menu in the print bar (PDF, Word, Print…). With Word, the buttons download one editable file with the tests, answer keys and accommodated copy, each starting on a new page with its own page numbers and headers, laid out like the printed paper, with real Word equations, pictures (shrunk to print size) and tables. A test is typically 10 to 30 KB.
- A candle icon for the browser tab (favicon), in both the single file and the website.

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
