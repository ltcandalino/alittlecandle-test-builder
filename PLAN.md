# Plan: accessibility options and saved tests

Status: **approved by Leigh 2026-11-13; all three parts built and released next.**

Order of work (each step ends with tests, changelog and notes, like every change):

1. The five design-review fixes, already agreed (see AGENTS.md Backlog). Protecting work comes first.
2. **Part A: accommodations on printed tests** (below).
3. **Part B: display settings for teachers** (below). Done together with review fix 4 (contrast and keyboard).
4. **Part C: saved tests** (below). It comes last because a saved test has to remember the accommodation
   settings too.

---

## Part A: accommodations on printed tests

**Done 2026-11-13.**

**What you'll see:** a new **Accommodations** section in the Build & print sidebar.

- **Font:** one dyslexia-friendly choice, **Atkinson Hyperlegible** or **OpenDyslexic**, alongside the
  usual fonts.
- **Text size:** Normal, Large (14 pt) or Extra large (18 pt). Pictures, answer lines, answer boxes and
  the computation column grow to match.
- **Extra spacing:** more space between lines, between answer choices and between questions.
  Text is left-aligned and nothing is squeezed to fit.
- **Questions per page:** As many as fit, 1 or 2.
- **Make a copy of:** Version A, B, C… (which version the accommodated copy uses).

Then, under Print:

- **Print accommodated copy:** the chosen version with these accommodations. It has the same questions
  and the same answer order, so **the answer key for that version still works**.
- "Print tests + answer keys" also includes the accommodated copy when Accommodations are turned on.
- The normal class versions print exactly as before.

**Details:**
- **The fonts are built into the app** (both are free and open-source, SIL Open Font License), so they
  work offline, in the single file, and print the same on any computer. This adds about 200–300 KB to
  the file. Math symbols a font doesn't have (∠ △ ≅ and so on) fall back to a matching font, and the
  tests check that they print.
- Works for Test, Quiz and Review. Lessons get the font, size and spacing; "questions per page" doesn't
  apply to them.
- **Student privacy:** the student copy doesn't say "Accommodated" anywhere. The answer key and the
  print window title do, so you can tell the copies apart.
- **Settings:** stored in the course's test settings (`settings.accom`), so they come back next time,
  are included in backups, and sync to the website version. Old saved data loads with accommodations off.

**Tests to add:**
- Each option changes the preview and the printed PDF (`tests/out/` gets an accommodated sample to look at).
- The accommodated copy uses the same answers as its version, and its key matches.
- Fonts load offline and math symbols render.
- Old settings without `accom` still load.

## Part B: display settings for teachers

**Done 2026-11-13** (with review fix 4).

**What you'll see:** a **Display** button (Aa) in the top bar opens:

- **App font:** Standard, Atkinson Hyperlegible or OpenDyslexic.
- **Text size:** Normal, Large or Larger. The whole app scales, and nothing gets cut off.
- **High contrast:** darker text, stronger borders, clear outline on whatever has keyboard focus.
- **Less motion:** turns off animations. This also happens automatically if the computer is set to
  reduce motion.

**Details:**
- These are **personal**: saved in that browser for that person (`tb-ui`), not synced. A colleague's
  choice never changes yours, and none of them change the printouts.
- They go with review fix 4, which already makes the normal look readable for everyone: darker gray
  text, math symbol buttons reachable with Tab, proper tab and dialog behavior for screen readers, and
  a visible keyboard focus.

**Tests to add:**
- Each setting applies and survives a reload.
- Keyboard-only walk-through: import → pick questions → print.
- An automated contrast check.

## Part C: saved tests

**Done 2026-11-13.**

**What you'll see:**
- Build & print gets **Save test** and a **Saved tests** list for the current course: name, date
  saved, date last printed. It's newest first and you can search it.
- **Names are filled in for you** from the document title (e.g. "Unit 3 Exam"). You can rename them.
- **Printing saves automatically:** every time you print, the test is saved (or updated) with the
  print date, so a printed test is never lost.
- **Open** a saved test to make it the current test, ready to look at, change or reprint. If the
  current test has unsaved changes, you're asked first.
- **Also:** Duplicate (e.g. to start next year's version from this one), Rename, and Delete (with Undo).

**When questions changed since you printed it (your choice: ask each time):** opening it shows what's
different, for example "2 questions were edited since you printed this; 1 was deleted from the bank".
You choose:
- **Use what I printed:** reprints match the copies and answer key already handed out.
- **Use the latest versions:** picks up your fixes, but answer keys may differ from copies already handed out.

A question that has since been deleted from the bank can still be reprinted from the saved copy.

**How it's stored:**
- `state.savedTests`: a list of `{id, name, course, savedAt, printedAt, settings, selected,
  questions}`.
- `settings` includes the scramble number (`seed`), so the versions and keys come out the same.
- `questions` holds a frozen copy of each question as printed. That's what lets you compare and
  reprint, and it also covers questions deleted later.
- **Change detection:** compares each frozen copy with the bank's current one using the same
  signature the sync already uses.
- **Backups:** saved tests are included. The new Restore choices (review fix 2) handle them the same
  way: "Replace everything" replaces them, and "Add missing only" adds tests you don't have.
- **Website version:** saved tests sync with your account (added to the synced app state). Pictures in
  frozen copies use the already-uploaded picture files instead of being copied again, so syncing stays
  fast.
- **Old data:** loads with an empty list. The current "one test per course" keeps working exactly as
  now. It's simply the test you're working on.

**Tests to add:**
- Save, open, rename, duplicate, delete and undo.
- Printing saves automatically.
- An edited or deleted question triggers the "what changed" prompt, and both choices reprint correctly
  (same scramble, matching key).
- Backup and restore with saved tests.
- Two-browser sync of saved tests.
- Old backups load.

---

## Open decisions (defaults used unless you say otherwise)

- **Which dyslexia-friendly font is the default:**
  - Atkinson Hyperlegible: very clear, made for low vision, and it looks like a normal font.
  - OpenDyslexic: the one many IEPs name.
  - Both will be available; Atkinson is the default.
- **Large-print sizes:** 14 pt and 18 pt. Some IEPs name exact sizes, so tell me if you need others.
- **Several accommodated copies at once** (e.g. one large print and one with the dyslexia font):
  not in the first version, which has one set of accommodations per test. It can be added later if
  you need it.

---

# Plan 2: download as PDF, Word or LaTeX

Status: **approved by Leigh 2026-11-13.** Building in the order below.

**Goal:** one click downloads the test, answer keys or both as a file, instead of going through the print
window. Files stay small, everything works offline in the single file and on the website, and adding a format
later (Google Docs / Google Drive once social sign-in exists) is a small job.

## What you'll see

- The print bar gets a **Format** menu: **PDF** (default), **Word (.docx)**, **LaTeX (.tex)**, and **Print…**
  (the browser's print window, kept for printing straight to paper).
- The buttons follow the format: **Download tests**, **Download answer keys**, **Download tests + keys**
  (and **Accommodated only** when that's on). Saving a test still happens automatically.
- **File names** say what's inside, e.g. `Geometry Q1 Unit 3 Exam - Version A.pdf`. Several versions download as
  one file with each version starting on a new page, or one file per version when "Print each version
  separately" is on (bundled in a .zip).

## How it's built (efficient, small files)

1. **One description of the document.** The test, keys and accommodated copy are turned once into simple
   blocks: header lines, part headings and directions, numbered questions, answer choices, answer lines or work
   space, pictures, score box, page breaks. Question text keeps its bold, italics, super/subscripts, segment and
   arc marks, fractions and tables.
2. **Three small writers** turn those blocks into files:
   - **PDF:** built with **pdfmake** (free, MIT licence, works offline). Only the letters actually used are
     embedded, so a test is typically 50 to 150 KB. Fonts: a free Century Schoolbook look-alike (TeX Gyre
     Schola), Atkinson Hyperlegible and OpenDyslexic, plus a small symbol font for ∠ △ ≅ and friends.
     Headers and footers match the current paper (course name, bar, unit label, page numbers, "v. 1").
   - **Word:** written directly (a .docx is a zip of text files; the browser's built-in compression makes the
     zip, so there's nothing extra to download). Editable, styled like your templates, with real Word equations for
     overlines and fractions, and pictures. Opens in Word, Pages and Google Docs.
   - **LaTeX:** a .zip with the `.tex` file (the standard `exam` class: parts, points, choices, answer lines,
     `\printanswers` for the key) and its pictures. Ready for Overleaf.
3. **Pictures** are shrunk to the size they print at (about 200 dpi) before going into any file, to keep files
   small.

## Order of work

1. Document description + Format menu + **Word** (shares the most with the current layout). **Done 2026-11-13.**
2. **LaTeX**. **Done 2026-11-13.**
3. **PDF** (the biggest piece; until it's done, PDF uses the print window as now).

Each step: tests (open the files, check pages, text, fonts and size), sample files in `tests/out/` that I look
at page by page, guide and changelog updates.

## Open decisions (defaults unless you say otherwise)

- The PDF will match the current paper closely but is laid out by a different engine, so line breaks can fall
  slightly differently. The **Print…** choice stays for anyone who wants the browser's version.
- The app file grows by about 1.5 MB for the PDF engine and fonts (2.9 MB → about 4.4 MB). It still opens
  instantly from disk. Downloaded files stay small.
- Lessons and Reviews get the same three formats. Their special headings (Papyrus, Chalkduster…) are Mac
  fonts that can't be built in, so PDF and Word use the closest free look-alikes.

---

# Plan 3: a shared question database for colleagues

Status: **approved by Leigh 2026-11-14** (after releasing 0.9.0). Decisions below are her answers from 2026-11-14.

**Goal:** one place on your website where you and your colleagues write, upload, file and share test questions.
Each question belongs to the person who added it; banks group questions; sharing works for one question or a whole bank.

## What you'll see

- **Every question has an owner and is Public or Private.**
  - **Public:** for example Regents questions. Every colleague on the site can find and use them.
  - **Private:** for example a textbook bank you bought. Only you see it, unless you share it with a group (never public).
  - Uploading a `.bnk`, Word or PDF file asks once: "Public (like Regents questions) or Private (like a textbook bank)?"
    Files named like Regents banks (`…EXAMs.bnk`, questions with references like 061915ge) suggest Public.
- **Banks are lists of questions, like playlists.** A question can be in several banks and is still one copy.
  Your own banks, your groups' banks, and public banks all show in the Question bank, each marked with its owner or group.
  Your courses stay yours: you pick which banks appear in which of your courses (the **Courses…** choice you have now).
- **Groups** (Math Department, Geometry Team…): **you, as admin, create them and add people** on Manage accounts.
- **Sharing a bank:** the owner shares it with a group or makes it public, and picks **editors**. Everyone else can use
  the questions, comment on them and make a personal copy.
- **Sharing one question:** a **Share** button on the question card: add it to a bank you can edit (yours or a team
  bank), or make it public.
- **Personal copies:** **Copy to my questions** makes your own version that you can change freely. It remembers the
  original; when the original is fixed you see "The original was updated: look at the changes" and choose to take
  the fix or keep yours.
- **One copy of each Regents question:** a second upload of the same Regents bank links to the questions already there
  (matched by reference number and course) instead of adding duplicates. Differences are listed so nothing is lost.
- **Who can change a question:** its owner, and the editors the owner (or you as admin) chose on the owner's banks.
  Editors of someone else's bank that just *includes* a public question can't change it; they can comment or copy it.
  If two people save the same question at once, the later save wins and the other person is told who changed it.
- **Comments** on a question ("answer should be C", "too hard for Unit 2"), visible to everyone who can see the question;
  the author can mark one resolved.
- **Review status:** Draft → Checked → **Ready to use**. The author can mark "Checked by me"; only **another editor** can
  mark it Ready. A **Status** filter in More filters.
- **History:** every change is kept (who, when, what), so a mistake can be undone and copies can show what changed.
- **Works offline like now:** your questions and the shared ones you use are kept on your computer and sync when
  you're back online. The single file keeps working as a personal tool for anyone without an account.
- **The shared library becomes team banks:** banks already in it become banks shared with a "Math Department" group.

## How it's built

- **Server tables** (`docker/db.js`, all four databases):
  - `questions`: id, owner, visibility (public/private), data (JSON as now), `regents_key` (ref + course, public only,
    unique), status, checked_by, version, created/updated by and at, deleted.
  - `banks`: id, owner, name, visibility, group ids it's shared with, editor ids, ordered question ids.
  - `groups` + `group_members` (admin-managed).
  - `question_history` (version, data, who, when), `comments`.
  - Personal copies keep `origin_id` + `origin_version` in their data.
- **One permission check on the server** decides what each account may see and change; the browser never decides.
  A private question is visible only to its owner and to groups its owner's banks are shared with.
- **Sync** pulls every question the account may see (own, public, shared to its groups) changed since last time, with the
  same signatures and soft deletes as now. Settings, courses and saved tests stay personal in `app_state`.
- **Moving old data:** everyone's existing questions become Private questions they own, and each bank becomes a bank of
  theirs. Nothing is shared until they choose. A one-time **Make public…** helper lists Regents-looking banks.
- **Version:** step 1 is a MINOR release (old data, backups and setups keep working). 1.0.0 when banks become lists (step 2).

## Order of work (each step released and tried before the next)

1. Ownership, Public/Private, the new sync and moving old data. **Done 2026-11-14** (nothing to move: everything starts
   private; old apps never receive colleagues' questions). Banks-as-lists moved to step 2, where Share needs it.
2. Groups on Manage accounts, team banks shared with groups, editors, Share on a question. **Done 2026-11-15.**
   Simpler than "every bank is a list": your own banks stay as they are (one home bank per question, nothing to
   migrate), and **team banks** are the lists (a question can be in many). The file-based shared library is removed
   (it was empty); team banks replace it, and bank files still save banks to a NAS.
3. One copy of each Regents question on upload.
4. Personal copies that notice when the original changes, and the history.
5. Comments and review status.

## Open decisions (defaults unless you say otherwise)

- Release **0.9.0** (bank tools) first, so colleagues can tidy their banks before uploading them to the shared database.
- Students never get accounts; every account is a teacher.
- When an account is removed, its public questions stay (owned by the admin); its private ones are deleted.
- A Regents question uploaded as Private by mistake can be switched to Public later (and then joins the single copy).

# Plan 4: one thing at a time (step rail, sub-tabs, bank browser)

Approved 2026-11-17 (her choices: ideas 1 + 3 from the mock-ups; one left rail; sub-tabs everywhere; browser first).

## What you'll see

- **One rail on the left** instead of the three top tabs:
  - **Make a test:** 1 Pick questions · 2 Arrange · 3 Format · 4 Print (each shows its question/version count)
  - then a line, then **Question bank** and **Import & backup**.
  - On a phone the rail becomes a row of buttons across the top.
- **Sub-tabs** at the top of each place, so only one panel shows at a time:
  - 1 Pick questions: **Browse banks** · **Search** (today's list and filters) · **Team banks** · **Shared with you**
  - 2 Arrange: **Order** (the list on this test, move up/down, roles for lessons) · **Parts** · **Versions**
  - 3 Format: **Document** (type, course name, unit, title…) · **Spacing** · **Accommodations** · **Page style**
  - 4 Print: **Preview** (with the print bar) · **Saved tests**
  - Question bank: **All questions** · **Needs attention** · **Your fields**
  - Import & backup: **Import** (ExamView, Word, PDF, paste) · **Your banks** · **Team banks** · **Backup** · **Courses**
- **Bank browser** (Browse banks): one card per bank → its units and sections → that section's questions, each with
  **+ Add** (or **Added ✓**), plus **Add 5 at random** for the section. A path at the top (All banks › Bank › Unit 3)
  goes back. A small "On this test: 14" line stays in view.
- Nothing about your questions, banks, settings or printouts changes; only where things are on the screen.

## How it's built

- `ui.place` (pick, arrange, format, print, bank, io) + `ui.sub[place]`, remembered in `tb-ui`; the old `ui.tab` values map
  over (bank → bank, build → pick, io → io) so the app opens where you were.
- The existing cards are reused, just shown one sub-tab at a time (no rewrite of the forms); the Preview card moves to Print.
- Bank browser reads `unit`/`section` already on every question; questions without them go under "No unit".
- Tests (`ui`, `tools`, `sync`) switch places through one helper instead of clicking old tabs; new tests for the rail, sub-tabs
  and browser. README, wiki (every page names buttons and tabs), in-app Help, issue forms updated.

## Order of work (each stage released and tried before the next)

1. The rail and sub-tabs everywhere (MINOR 0.13.0). **Done 2026-11-17.** Question bank's sub-tabs are All questions and Your fields (Needs
   attention stays a filter and the Check & clean up dialog, which already do that job).
2. The bank browser in 1 Pick questions (MINOR 0.14.0).

## Open decisions (defaults unless you say otherwise)

- The rail can fold to icons only, for a wider preview.
- Keyboard: Alt+1…4 jump to the steps.
