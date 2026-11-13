# Plan: accessibility options and saved tests

Status: **approved by Leigh 2026-11-13**. Not built yet. Work through it in the order below.

Order of work (each step ends with tests, changelog and notes, like every change):

1. The five design-review fixes, already agreed (see AGENTS.md Backlog). Protecting work comes first.
2. **Part A: accommodations on printed tests** (below).
3. **Part B: display settings for teachers** (below). Done together with review fix 4 (contrast and keyboard).
4. **Part C: saved tests** (below). It comes last because a saved test has to remember the accommodation
   settings too.

---

## Part A: accommodations on printed tests

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
