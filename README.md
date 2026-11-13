# ALittleCandleTestBuilder

Builds printed tests, quizzes, reviews and lessons for high school math courses
from your own question banks.

## User guide

The full guide is in the [GitHub wiki](../../wiki) (source in `wiki/`).

## Try it

Open **`ALittleCandleTestBuilder.html`** in Chrome or Edge. No setup needed.
Your questions are saved in that browser on that computer. Use **Import & backup → Download backup**
to keep a copy or move to another computer.

## What it does

- **Display settings** (Aa Display): dyslexia-friendly fonts, larger text, high contrast and less motion, just for you.
- **Imports questions** from ExamView banks (`.bnk`, with math and pictures), PDFs (as text or
  as pictures) and Word files (`.docx`).
- **Keeps details for each question:** course, bank, source, unit, section, part, topic,
  subtopic, standard, cluster, reference (MMYYQQ → month, year, question #), points, notes.
- **Question types:** multiple choice, bimodal (print with or without choices), true/false,
  short answer, extended response.
- **Document types**, each with the course name and a bar at the top of every page:
  - **Test / Quiz** – Quarter/Unit title line, teacher, calculator, time accommodation,
    Parts I–IV with directions and totals, credits like [2], computation box, bonus questions,
    score box, "v. 1" footer.
  - **Review** – table of Short/Extended Response and Multiple Choice questions with references.
  - **Lesson** – compass/ruler/tracing paper pictures, "I am learning to", Warm Up!, Notes,
    Essential Concept, Examples, Success Criteria, Practice, and a Q#W##D### / Source footer.
- **Versions:** 1–8 scrambled versions with matching answer keys.
- **Courses:** separate questions and settings for Geometry, Algebra 1, Algebra 2, Pre-Calculus…

## Folders

| Folder / file | What's in it |
|---|---|
| `src/` | The app's code and styles. Edit these. |
| `vendor/pdfjs/` | pdf.js, used to read PDFs (Apache 2.0). |
| `vendor/fonts/` | Atkinson Hyperlegible Next and OpenDyslexic, built into the app (SIL Open Font License). |
| `build.py` | Combines everything into the two HTML files below. |
| `ALittleCandleTestBuilder.html` | Built: the single-file version you open from your computer. |
| `docker/` | The website version with logins: server, Dockerfile, setup guide. `docker/index.html` is built. |
| `supabase/` | An alternative setup using GitHub Pages + Supabase instead of Docker. |
| `wiki/` | The user guide. Published to the GitHub wiki automatically. |
| `.github/workflows/` | GitHub Actions: CI (tests + Docker image), Release (GitHub Release notes and files), Wiki. |
| `CHANGELOG.md` | What changed in each version. |
| `AGENTS.md` | Notes for AI assistants (Claude Code and others): how it's built, status, to-do list, work log. `CLAUDE.md` points to it. |
| `tests/` | Automatic tests (`npm test`). See Testing. |
| `scripts/` | `release.py` (make a release), `release-notes.py`, `docker-test.sh` (check the Docker image locally). |
| `VERSION` | The current version number. |

## Making changes

1. Edit files in `src/`.
2. Run `python3 build.py`.
3. Open `ALittleCandleTestBuilder.html` to check, and run the tests (below).
4. Add a line to `CHANGELOG.md` under **Unreleased**. For significant changes, update this README and the
   matching page in `wiki/`. Then commit.

## Testing

Needs Node.js 26 (current LTS) and Python 3. Once: `npm install && npx playwright install chromium`.

| Command | What it checks |
|---|---|
| `npm test` | Everything (about 150 checks, under a minute) |
| `npm run test:fast` | Core helpers and document building only |
| `npm run test:server` | The Docker server's API and syncing between two browsers |
| `npm run test:docker` | Builds the real Docker image and checks it (needs Docker running) |

The tests are in `tests/`:

| File | Covers |
|---|---|
| `core.test.cjs` | References (MMYYQQ), clusters, cleaning question HTML, CSV, pasted text, settings from older versions |
| `documents.test.cjs` | Versions and scrambling, parts, bonus, Test/Quiz/Review/Lesson layouts, headers, answer keys, print jobs, courses |
| `imports.test.cjs` | Word, PDF and ExamView importers |
| `ui.test.cjs` | Clicking through the app: editor, delete/undo, building, printing, imports, backups, CSV, courses |
| `server.test.cjs` | Sign-in, passwords, questions, settings, pictures, Manage accounts, restarts |
| `sync.test.cjs` | The website version in two browsers, syncing questions, settings, pictures and deletes |
| `print.test.cjs` | Prints every document type to PDF in `tests/out/` to look at |

Sample files are in `tests/fixtures/` (`make-fixtures.py` recreates them). Put real banks, Word exams
or PDFs in `tests/fixtures/private/` to test them too. That folder is never committed.

## Versions and releases

The version is in the `VERSION` file and follows [semantic versioning](https://semver.org):

- **MAJOR** (1.0.0 → 2.0.0): something that breaks saved data, backups or the server setup
- **MINOR** (0.5.0 → 0.6.0): new features
- **PATCH** (0.6.0 → 0.6.1): fixes only

The app shows its version next to its name, and the server reports it at `/healthz`.

To release:

```
python3 scripts/release.py minor      # or major / patch / 1.2.3; add --dry-run to preview
git push && git push origin v0.6.0
```

`release.py` dates the **Unreleased** notes in `CHANGELOG.md`, updates `VERSION`, rebuilds, commits and
tags. Pushing the tag makes GitHub:
- run all tests, then publish the Docker image as `:0.6.0`, `:0.6`, `:latest` (and `:1` from 1.0.0 on)
- create a GitHub Release with the changelog notes, the single-file app and the Docker setup files

## GitHub setup (once the repo is pushed)

- **Tests and Docker image:** nothing to do. `.github/workflows/docker.yml` (CI) runs on every push
  and pull request; images are published from the main branch and version tags.
- **Releases:** nothing to do. `.github/workflows/release.yml` runs when a version tag is pushed.
- **Wiki:** in the repo's **Settings → Features**, tick **Wikis**. Open the **Wiki** tab and create any first page
  (GitHub needs one before the wiki can be updated). Then run the **Wiki** workflow from the **Actions** tab,
  or push a change in `wiki/`. Edit pages in `wiki/`; edits made directly on GitHub get replaced.

## Website version

See `docker/README.md`. GitHub Actions builds the image automatically from `.github/workflows/docker.yml`.
