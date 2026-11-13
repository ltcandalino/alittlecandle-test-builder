# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary:** Leigh Candalino, a high school math teacher (Geometry, Algebra 1, Algebra 2,
  Pre-Calculus) who builds paper tests, quizzes, reviews and lessons, usually in Chrome on a Mac.
  Previously used ExamView/ExamGen.
- **Colleagues:** other math teachers at her school, signing in to the website (Docker) version with
  their own accounts. They didn't build the tool, so it has to make sense without explanation.
  None of the users are developers.

## Product Purpose

Builds printed math documents from the teacher's own question banks, replacing ExamView. Success
means all four of these hold at once:

1. **Fast to build:** picking questions and printing a test takes minutes, not an evening.
2. **The printout is exactly right:** the paper matches her Word templates (headers, parts,
   spacing, credits, answer keys).
3. **Easy to find questions:** filtering by course, unit, standard, topic or past-exam reference
   finds the right ones quickly.
4. **Never lose work:** questions and settings are safe, backed up, and the same on every computer.

## Positioning

A teacher's own question banks (imported from ExamView, Word and PDF) turned into documents laid
out to match her own templates, rather than a generic test generator's layout. It runs as a single
file with no setup, or as a self-hosted website the teacher controls.

## Operating Context

- **Workflow:** import questions → tag and edit them in the Question bank → pick questions in
  Build & print → choose document type and options → print (versions with answer keys).
- **Output is paper.** Printing uses Chrome/Edge print (CSS page margin boxes); the on-screen
  preview serves the printout.
- **Source materials:** ExamView `.bnk` banks, past exam PDFs, Word exams and templates (Geometry
  Unit Exam, Unit Review, Lesson), kept on her NAS.
- **Two ways to run it:** a single HTML file saved in that browser, or the Docker website with
  logins and sync.

## Capabilities and Constraints

- Imports: ExamView `.bnk` (with math and pictures), PDF (text or pictures), Word `.docx`, pasted
  text, CSV.
- Question details: course, bank, source, unit, section, part, topic, subtopic, standard, cluster,
  reference (MMYYQQ → month, year, question number), points, notes.
- Question types: multiple choice, bimodal, true/false, short answer, extended response.
- Document types: Test, Quiz, Review, Lesson; 1–8 scrambled versions with answer keys; separate
  courses each with their own questions and settings.
- Constraints: Chrome or Edge (131+) for printing; no framework, vanilla JS built into one file;
  saved data from older versions must keep loading; everything on current, secure versions.
- Terminology the app uses: Question bank, Build & print, Import & backup, Parts I–IV, credits
  like [2], versions, answer key, bimodal.

## Brand Commitments

- Name: **ALittleCandleTestBuilder**. Only a name, with no meaning to carry into the design.
- The printed layouts follow her Word templates. Lesson headings use purple `#8064A2` and her
  template's Mac fonts; review multiple-choice headers are shaded `#E5DFEC`. These belong to the
  printouts, not necessarily the app screens.
- Plain, teacher-friendly language with no technical jargon.

## Evidence on Hand

- Her real ExamView bank `GEO2024-2026EXAMs.bnk` and Word exam `Geometry_Unit_3_Exam_v1.docx`
  (private, in `tests/fixtures/private/`, never committed).
- Lesson template icons (compass, ruler, tracing paper) in `src/icons.js`.
- No testimonials, usage numbers or colleague feedback exist yet; don't invent any.

## Product Principles

1. **The paper is the product.** On-screen choices should make the printout right on the first try.
2. **Minutes, not evenings.** Every step from "I need a quiz" to a printed stack should feel short.
3. **Nothing is ever lost.** Saving, backups and sync are quiet, trustworthy and always on.
4. **A colleague can pick it up cold.** Labels and flows are clear to a teacher who didn't build it.
