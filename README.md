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
| `build.py` | Combines everything into the two HTML files below. |
| `ALittleCandleTestBuilder.html` | Built: the single-file version you open from your computer. |
| `docker/` | The website version with logins: server, Dockerfile, setup guide. `docker/index.html` is built. |
| `supabase/` | An alternative setup using GitHub Pages + Supabase instead of Docker. |
| `wiki/` | The user guide. Published to the GitHub wiki automatically. |
| `.github/workflows/` | GitHub Actions: builds and publishes the Docker image, and publishes the wiki. |
| `CHANGELOG.md` | What changed in each version. |
| `AGENTS.md` | Notes for AI assistants (Claude Code and others): how it's built, status, to-do list, work log. `CLAUDE.md` points to it. |
| `tests/` | Automatic check that every document type still builds (`npm test`). |

## Making changes

1. Edit files in `src/`.
2. Run `python3 build.py`.
3. Open `ALittleCandleTestBuilder.html` to check. Developers can also run `npm test`.
4. Add a line to `CHANGELOG.md` under **Unreleased**. For significant changes, update this README and the
   matching page in `wiki/`. Then commit.

## Releasing

Move the **Unreleased** notes in `CHANGELOG.md` under a new version number, commit, and tag it
(for example `git tag v0.6.0`). Once the repo is on GitHub, pushing the tag publishes a matching
Docker image (`ghcr.io/<owner>/<repo>:0.6.0`).

## GitHub setup (once the repo is pushed)

- **Docker image:** nothing to do. `.github/workflows/docker.yml` runs on every push.
- **Wiki:** in the repo's **Settings → Features**, tick **Wikis**. Open the **Wiki** tab and create any first page
  (GitHub needs one before the wiki can be updated). Then run the **Wiki** workflow from the **Actions** tab,
  or push a change in `wiki/`. Edit pages in `wiki/`; edits made directly on GitHub get replaced.

## Website version

See `docker/README.md`. GitHub Actions builds the image automatically from `.github/workflows/docker.yml`.
