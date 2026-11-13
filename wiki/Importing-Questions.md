# Importing Questions

Everything is on the **Import & backup** tab. Questions go into the course chosen at the top.

## ExamView banks (.bnk)

Choose one or more `.bnk` files. The question text, answer choices, correct answers, points, pictures and math come in: fractions, square roots, exponents, overlines, segments, rays, arcs and triangle symbols.

If a question has a **reference** in the form `MMYYQQ`, the app fills in:
- **Month**: `01`, `06` or `08` (January, June, August)
- **Year**: the last two digits (`24` → 2024)
- **Question #**: 1–36

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

Use **Blank template** to get the column headings, fill them in, then **Import CSV**. **Export CSV** saves your bank as a spreadsheet. Math and pictures don't fit in a CSV, so use a backup file to keep everything.

## Keeping the original files

The app saves the questions it pulls out of a file, not the file itself. Keep your `.bnk`, `.pdf` and `.docx` files somewhere safe, such as a NAS, and choose them from there when importing.
