# Importing Questions

Everything is on **Import & backup › Import** (on the rail at the left). Questions go into the course chosen at the top.

## ExamView banks (.bnk)

Choose one or more `.bnk` files. The question text, answer choices, correct answers, points, pictures, tables and math come in: fractions, square roots, exponents, overlines, segments, rays, arcs and triangle symbols.

**Banks imported before version 0.18** lost every table: the question stopped at the table, and the text and sometimes an
answer choice after it were missing (so a few answer keys were wrong). To fix a bank you already have, import the same `.bnk`
file again. The app sees it's the same bank, repairs only the questions with a table, keeps everything you changed (units,
sections, your fields) and doesn't make a copy.

**Older imports** show some subscripts and superscripts as plain text (before version 0.24: log2x for log₂x, an for aₙ, 7C5 for
₇C₅; before version 0.27: cm3 for cm³, H0 for H₀, 2p for 2π, q for θ,
A for A′, and some equations or pictures left blank). Import the same `.bnk` file again to fix them the same way: only questions whose words you haven't
changed are fixed. The composition sign ∘ (f ∘ g) used to show as ž; that is fixed by itself when you open the app.

Standards like `A.REI.A.1, NY: A.N.1` are split: the Common Core code stays in **Standard**, and the old NY code goes to **Old NY standard**.

If a question has a **reference** in the form `MMYYQQ`, the app fills in:
- **Month**: `01`, `06` or `08` (January, June, August)
- **Year**: the last two digits (`24` → 2024)
- **Question #**: 1–50

For example, `062412` means June 2024, question 12, shown as "June 2024 #12".

## From a PDF

1. Choose the PDF and give it a **Source** name (for example *Big Ideas Geometry*).
2. The app finds the numbered questions and their answer choices. For each question, choose:
   - **Text**: the words and choices come in as text you can edit.
   - **Picture**: the question is cropped as an image, so it looks exactly like the PDF.
   - **Skip**: leave it out.
3. Drag on the page to clip a different area if a crop isn't right.
4. Optionally paste an answer key (like `1. 3  2. 1 …`) to fill in the answers.

## From Word (.docx)

Choose a Word file. Questions, choices, math, pictures, tables, **Part I/II/III** labels and credits like **[2]** come in. If the file is one of your exams, the header, title and quarter/unit numbers fill in the **2 Set up › Document** settings too.

## Paste questions

Paste plain text with a blank line between questions. Put a `*` before the correct choice:

```
1. Which point is the midpoint of AB?
A. (1, 2)
*B. (2, 3)
C. (3, 4)
D. (4, 5)

2. A square is a rectangle.
Answer: True

3. Prove that the diagonals of a parallelogram bisect each other.
```

## Bank files (.json)

**Import & backup → Your banks** saves banks as files, one `.json` file per bank, with everything: math, pictures, answers, all the details and your own fields. Use them to keep your banks on a NAS, or to give a bank to another teacher.

- **Save all as files…**: tick the banks you want (or none, for all of them; **All** ticks every one), click the button (it
  then says **Save 3 as files…**), and choose the folder (for example your NAS folder). Chrome and Edge save straight into it, replacing older copies of the same banks. Other browsers put the files in Downloads.
- **Open bank files…**: choose one or more bank files. New questions are added; questions you already have from that file are updated to the file's version. Your own fields are matched by name, so another teacher's "DOK" goes into your "DOK".

A full backup is a different file (everything at once): open it with **Restore a backup…**.

## Your banks

**Import & backup → Your banks** lists your banks in the course you're in, one line each with how many questions it has.
With many banks, the first 10 show: type in **Find a bank** or click **Show all** to see the rest. Each bank's **⋯** menu
has **Also use in** (other courses, see [[Courses]]), **Make public** on the website (see [[Sharing with Colleagues]]),
**Duplicate** (a second bank, named like "Unit 3 (copy)", with copies of every question: change them without touching the
original), **Rename** and **Delete** (click twice; Undo brings it back).

**Opening a bank file of a bank you already have** updates it: a question with the same exam reference (like `062502geo`)
is replaced by the file's version, keeping your units, sections and your own fields, and no copy is made.

**A bank file that combines several banks** (like `Algebra1CC2013-2024`, made from five Algebra I banks) moves the questions
you already have into the combined bank: each one is found by its exam reference, or by its exact text when it has none, even
though its bank had another name. Nothing is copied. A question is only matched when exactly one of yours and one in the file
fit, so two different questions are never merged; anything left over stays in its old bank, where you can check it.

## Keeping the original files

The app saves the questions it pulls out of a file, not the file itself. Keep your `.bnk`, `.pdf` and `.docx` files somewhere safe, such as a NAS, and choose them from there when importing.
