# Accepted design-checker findings

- **overused-font (Arial, Helvetica) in `src/style.css` print styles** (`.pt .pt-ver`, `.pt .pt-part`, `.pt .pt-keynote`,
  `.pt .pt-mynote`, `.rv-title`): these are the printed-paper layouts, copied on purpose from Leigh's Word templates
  (Geometry Unit Exam and Unit Review). They aren't app-screen font choices. Keep them.
- **Paper-preview findings on `.sheet` / `.pt`** (line length, 8 pt "Use this space for computations.", gray `#777`
  running footer): the preview shows the printed page exactly as it prints, not screen UI.
