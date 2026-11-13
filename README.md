# ALittleCandleTestBuilder

Builds printed tests, quizzes, reviews and lessons for high school math courses
from your own question banks.

## Try it

Open **`ALittleCandleTestBuilder.html`** in Chrome or Edge. No setup needed.
Your questions are saved in that browser on that computer. Use **Import & backup → Export backup**
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

## Making changes

1. Edit files in `src/`.
2. Run `python3 build.py`.
3. Open `ALittleCandleTestBuilder.html` to check, then commit.

For the website version, see `docker/README.md`.
