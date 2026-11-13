#!/usr/bin/env python3
"""Regenerates the small sample files the tests import (needs python-docx and reportlab).
The generated files are committed, so you only need this to change them."""
import os
from docx import Document
from docx.shared import Pt
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

HERE = os.path.dirname(os.path.abspath(__file__))

# ---- Word: an exam with a header, two parts, MC choices and an open question with credits
d = Document()
sec = d.sections[0]
sec.header.paragraphs[0].text = 'Geometry'
d.add_paragraph('Name: ________________ Date: ________')
d.add_paragraph('Quarter 2 – Unit 5 Exam')
d.add_paragraph('Part I')
d.add_paragraph('Answer all questions in this part. Each correct answer will receive 2 credits.')
qs = [
    ('What is the slope of the line through (0, 0) and (2, 4)?', ['1', '2', '3', '4']),
    ('Which angle is acute?', ['30°', '90°', '120°', '180°']),
]
for i, (stem, ch) in enumerate(qs, 1):
    d.add_paragraph(f'{i}. {stem}')
    for k, c in enumerate(ch, 1):
        d.add_paragraph(f'({k}) {c}')
d.add_paragraph('Part II')
d.add_paragraph('Answer all questions in this part. Each correct answer will receive 4 credits.')
d.add_paragraph('3. Prove that the diagonals of a rectangle are congruent.')
d.add_paragraph('[4]')
for p in d.paragraphs:
    for r in p.runs:
        r.font.size = Pt(12)
d.save(os.path.join(HERE, 'sample-exam.docx'))

# ---- PDF: numbered questions with (1)-(4) choices and one open question
c = canvas.Canvas(os.path.join(HERE, 'sample-questions.pdf'), pagesize=letter)
c.setFont('Times-Roman', 12)
y = 720
items = [
    ('1', 'What is 3 + 4?', ['5', '6', '7', '8']),
    ('2', 'Which point lies on the line y = 2x?', ['(1, 2)', '(2, 1)', '(0, 1)', '(3, 3)']),
    ('3', 'How many sides does a hexagon have?', ['4', '5', '6', '8']),
    ('4', 'Explain why vertical angles are congruent.', None),
]
for n, stem, ch in items:
    c.drawString(72, y, n + '  ' + stem); y -= 24
    if ch:
        for k, t in enumerate(ch, 1):
            c.drawString(96, y, f'({k})  {t}'); y -= 20
    y -= 28
c.save()
print('wrote sample-exam.docx and sample-questions.pdf')
