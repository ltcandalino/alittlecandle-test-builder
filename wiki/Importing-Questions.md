# Importing Questions

Everything is on the **Import & backup** tab. Questions go into the course chosen at the top.

## ExamView banks (.bnk)

Choose one or more `.bnk` files. The question text, answer choices, correct answers, points, pictures and math come in: fractions, square roots, exponents, overlines, segments, rays, arcs and triangle symbols.

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

Choose a Word file. Questions, choices, math, pictures, tables, **Part I/II/III** labels and credits like **[2]** come in. If the file is one of your exams, the header, title and quarter/unit numbers fill in the **Build & print** settings too.

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

## Spreadsheet (CSV)

Use **Blank template** to get the column headings, fill them in, then **Import CSV**. Columns for **Old NY standard** and your own fields (by their name) come in too. **Export CSV** saves your bank as a spreadsheet. Math and pictures don't fit in a CSV, so use a backup file to keep everything.

## Bank files (.json)

**Import & backup → Bank files** saves banks as files, one `.json` file per bank, with everything: math, pictures, answers, all the details and your own fields. Use them to keep your banks on a NAS, or to give a bank to another teacher.

- **Save to a folder…**: tick the banks, click the button, and choose the folder (for example your NAS folder). Chrome and Edge save straight into it, replacing older copies of the same banks. Other browsers put the files in Downloads.
- **Open bank files…**: choose one or more bank files. New questions are added; questions you already have from that file are updated to the file's version. Your own fields are matched by name, so another teacher's "DOK" goes into your "DOK".

A full backup is a different file (everything at once): open it with **Restore a backup…**.

## Shared library (website version)

On the website, **Import & backup → Shared library** lists banks the teachers on your site have shared.

- **Share**: pick one of your banks and click **Share**. Everyone with an account on the site can see it. Share it again after you fix something to replace the library copy.
- **Add to my questions**: adds a copy to your own questions (or updates the copy you added before). Changing your copy doesn't change the library.
- Only the teacher who shared a bank, or the site admin, can replace or **Remove** it.

The library is a folder on the server. Your site admin can put it on a NAS (see [[Website Setup (Docker)]]).

## Keeping the original files

The app saves the questions it pulls out of a file, not the file itself. Keep your `.bnk`, `.pdf` and `.docx` files somewhere safe, such as a NAS, and choose them from there when importing.
