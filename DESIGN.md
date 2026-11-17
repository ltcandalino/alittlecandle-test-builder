---
name: ALittleCandleTestBuilder
description: A teacher's own question banks turned into paper tests that match her templates.
colors:
  candle-purple: "#7851a9"
  candle-purple-deep: "#623f8e"
  candle-purple-soft: "#efe8f6"
  desk-cream: "#f6f4ef"
  paper-white: "#ffffff"
  ink: "#1d2125"
  ink-soft: "#4a5058"
  pencil-gray: "#5f656c"
  rule-line: "#e3e0d8"
  rule-line-strong: "#d3cfc4"
  danger-red: "#b3261e"
  danger-soft: "#fbe9e7"
  caution-amber: "#d08a12"
  caution-soft: "#fff4dc"
  type-mc-blue: "#2f5d9e"
  type-tf-plum: "#9b3b77"
  type-sa-brown: "#8a5214"
  type-es-violet: "#4e2f78"
typography:
  brand:
    fontFamily: "Georgia, 'Times New Roman', serif"
    fontSize: "20px"
    fontWeight: 700
  headline:
    fontFamily: "Georgia, serif"
    fontSize: "18px"
    fontWeight: 600
  body:
    fontFamily: "'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  overline:
    fontFamily: "'Segoe UI', system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif"
    fontSize: "12.5px"
    fontWeight: 600
    letterSpacing: "0.05em"
rounded:
  tag: "5px"
  control: "8px"
  card: "10px"
  dialog: "14px"
  pill: "999px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "18px"
  lg: "22px"
components:
  button:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  button-primary:
    backgroundColor: "{colors.candle-purple}"
    textColor: "{colors.paper-white}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
  button-primary-hover:
    backgroundColor: "{colors.candle-purple-deep}"
  button-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger-red}"
    rounded: "{rounded.control}"
  input:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "7px 10px"
  card:
    backgroundColor: "{colors.paper-white}"
    rounded: "{rounded.card}"
    padding: "18px"
  subtab:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    padding: "6px 14px"
  subtab-on:
    backgroundColor: "{colors.candle-purple}"
    textColor: "{colors.paper-white}"
  chip:
    backgroundColor: "{colors.candle-purple-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "3px 10px"
---

# Design System: ALittleCandleTestBuilder

## Overview

**Creative North Star: "The Teacher's Desk"**

The app is a warm desk with sheets of paper on it. The cream page is the desk, and white cards are the sheets. The printed test, shown in the preview, is the most important sheet. Everything on screen exists to get that paper right on the first try. The interface stays calm and lets the work lead.

The feel is **friendly, personal and crafted**: it should read as Leigh's own tool, not a generic test generator. The personal touches are small and specific. Her candle logo sits in the header, the serif Georgia headings echo the printed page, Candle Purple marks what's chosen, and the wording is a teacher's ("on the test", "credits", "Use this space for computations"). Density is moderate. There's room to breathe, but a teacher with 1,500 questions still needs to see several at once.

**Key Characteristics:**
- Warm cream desk (#f6f4ef), white paper cards, one purple accent.
- Serif for headings (paper voice), system sans for controls (tool voice).
- Nearly flat: hairline borders and a faint shadow; real shadows only for things that float above (dialogs, toasts).
- Plain teacher language; every setting has a one-line hint under it.
- The printed-paper styles (Arial headings, #8064A2 lesson purple, #E5DFEC review shading) belong to the printouts and follow her Word templates, not this system.

## Colors

A warm neutral desk with a single purple voice. Other colors appear only where they carry meaning.

### Primary
- **Candle Purple** (#7851a9): what's chosen and what to do next. Selected sub-tabs, the active rail item's text, primary buttons, focus rings, ticked question cards, links. Ties to the logo and the app's name.
- **Candle Purple Deep** (#623f8e): primary button hover. In high-contrast mode the accent becomes #4e2f78.
- **Candle Purple Soft** (#efe8f6): quiet selected backgrounds. Rail hover, filter chips, unit tags, the "Printed today at …" receipt.

### Neutral
- **Desk Cream** (#f6f4ef): the page background behind everything. It's deliberate, not a default beige.
- **Paper White** (#ffffff): cards, inputs, buttons, dialogs, the preview sheet.
- **Ink** (#1d2125): body text and headings.
- **Ink Soft** (#4a5058): labels, secondary text, sub-tab text.
- **Pencil Gray** (#5f656c): hints and quiet notes. 5.4:1 on cream, so it stays readable.
- **Rule Line** (#e3e0d8) and **Rule Line Strong** (#d3cfc4): card borders and dividers, and control borders.

### Semantic
- **Danger Red** (#b3261e on #fbe9e7): Delete buttons and destructive confirmations. Every Delete is red.
- **Caution Amber** (#d08a12, banners on #fff4dc with #6b4e12 text): backup reminders, missing-answer warnings, the dot on Import & backup.
- **Question-type colors**: multiple choice blue #2f5d9e, true/false plum #9b3b77, short answer brown #8a5214, extended response violet #4e2f78, bimodal #3b4fa8. Used only in the small type badges on question cards, each on its own pale tint.

**The One Voice Rule.** Candle Purple is the only accent. If something needs attention and isn't a choice or a next step, it gets amber (caution) or red (danger), never a second accent color.

**The Desk Isn't Beige Rule.** The cream background is part of the identity. Don't "fix" it to gray or white.

## Typography

**Heading Font:** Georgia (with Times New Roman, serif)
**Body Font:** Segoe UI / system-ui (with -apple-system, Roboto, Helvetica, Arial)

**Character:** Georgia gives headings the voice of the printed page and a crafted, personal warmth. The system sans keeps controls familiar and quick to read.

### Hierarchy
- **Brand** (700, 20px, Georgia): the app name in the header.
- **Headline** (600, 18px, Georgia): card titles ("Document", "What will print", "Preview"). Dialog titles are 20px.
- **Body** (400, 14px, line-height 1.45): everything else.
- **Label** (600, 12px, Ink Soft): the name above each field.
- **Hint** (400, 12px, Pencil Gray): the one-line explanation under a setting.
- **Overline** (600, 12.5px, uppercase, 0.05em tracking, Pencil Gray): small section headings inside a card.

**The Paper Voice Rule.** Serif is for headings only: titles of cards, dialogs and the brand. Controls, labels and body text stay sans.

**The Readable Floor Rule.** Nothing on screen is smaller than 11px. The 8pt "Use this space for computations" lives only on the paper.

## Layout

A sticky header (logo, course, Display, Help) sits over a two-column shell. On the left is a 210px rail with the three numbered steps (1 Pick questions, 2 Set up, 3 Print), a divider, then Question bank and Import & backup. It folds to 62px ("Icons only") and keeps the step numbers and counts. On the right, each place shows a row of pill sub-tabs, then one panel at a time.

On Set up, cards sit on the left and the preview on the right (1 : 1.25). On 3 Print, the recap and preview are centered, at most 940px wide. Cards are separated by 18px. Inside cards, fields sit 10–12px apart. Settings cards flow in a grid with a 340px minimum per column.

Below 1000px the preview drops under the cards. Below 760px the rail becomes a horizontal row across the top. Below 640px the header stops sticking and card actions drop below the card content. Pages never scroll sideways.

**The One Panel Rule.** A place shows one sub-tab's panel at a time. Related settings live together in that panel, not spread across tabs.

## Elevation & Depth

Nearly flat, like paper lying on a desk. Cards have a hairline border and the faintest shadow. Depth grows only for things that float above the desk.

### Shadow Vocabulary
- **Paper** (`0 1px 2px rgba(0,0,0,.05), 0 2px 8px rgba(0,0,0,.04)`): cards and the active rail item.
- **Sticky edge** (`0 -6px 12px -8px rgba(0,0,0,.12)`): the print bar pinned to the bottom of the preview.
- **Floating** (`0 20px 50px rgba(0,0,0,.25)`): dialogs (editor, clean-up, share) over a dimmed page.
- **Focus** (`0 0 0 3px rgba(120,81,169,.18)` on fields; a 2px Candle Purple outline on buttons): keyboard and focus state.

**The Paper-On-Desk Rule.** At rest, cards only get the Paper shadow. A bigger shadow means "this floats above your work and will go away".

## Shapes

Gently rounded, never sharp and never bubbly. Corners grow with the size of the thing:
- Tags have 5px corners.
- Buttons and fields have 8px.
- The rail item has 9px, cards have 10px and dialogs have 14px.
- Sub-tabs, filter chips and type badges are full pills (999px).
- Status dots are circles.

Borders are 1px, warm gray rule lines.

## Components

### Buttons
- **Default:** white with a Rule Line Strong border, 8px corners, 7px 12px padding, weight 500. On hover the background warms to #f3f1ec.
- **Primary:** Candle Purple fill with white text, and Deep on hover. Use one per view, for the main next step (Print, Save).
- **Ghost:** no border or fill; #eceae4 on hover. For quiet actions in toolbars.
- **Small:** 4px 9px padding, 12.5px text. For card actions.
- **Danger:** red text on Danger Soft. Every Delete uses it, and a second "Confirm" click is required.
- **Focus:** a 2px Candle Purple outline, offset 2px. In high-contrast mode it is 3px.

### Sub-tabs
White pills with a Rule Line Strong border, 13.5px Ink Soft text. The selected tab is filled Candle Purple with white semibold text. The row sits above the panel with a rule line under it.

### Rail
Transparent buttons with an icon (19px stroke icon), the label and an optional count. Hover gives a Candle Purple Soft background. The active item is a white sheet with the Paper shadow and Candle Purple text. An amber dot on Import & backup means there's no recent backup.

### Cards
Paper White, a 1px Rule Line border, 10px corners, the Paper shadow and 18px padding. The title is a Georgia headline. A **Next: … →** button sits at the bottom right of each Set up panel.

### Inputs / Fields
White fields with a Rule Line Strong border, 8px corners and 7px 10px padding. Focus turns the border Candle Purple and adds a soft purple glow. The label sits above (12px semibold) and the hint below (12px Pencil Gray).

### Chips, Tags and Badges
- **Filter chips:** Candle Purple Soft pills. They show the active filters, and each has a remove button.
- **Tags:** 5px-corner labels for unit, exam reference, source, and shared or team status.
- **Type badges:** 11px semibold pills in the question-type colors.

### Question Card (signature)
A white card with a 34px tick column, the question as it prints (with math and pictures), its choices, then tags. A ticked card gets a Candle Purple border and a #faf7fd wash. In 1 Pick questions, its only action is Edit.

### Print Recap (signature)
The "What will print" card on 3 Print is a two-column list. Each row has a semibold label and a value that links back to its setting. Below it, amber warnings appear with a button that fixes the problem. After printing, a Candle Purple Soft receipt says "Printed today at …".

### Paper Preview (signature)
The printed page shown as a white sheet on a cream tray. It follows the print styles exactly, so findings about its fonts and sizes don't apply to the app's screens.

## Do's and Don'ts

### Do:
- **Do** use Candle Purple (#7851a9) only for selection, focus and the main next step.
- **Do** give every setting a label above and a one-line Pencil Gray hint in teacher language.
- **Do** use a Georgia headline for each card title, and system sans for everything inside.
- **Do** make every Delete red (#b3261e) and require a second click.
- **Do** show warnings as amber banners with a button that fixes the problem.
- **Do** keep the cream desk (#f6f4ef) behind white cards.

### Don't:
- **Don't** add a second accent color. Green was removed on purpose (2026-11-14).
- **Don't** use colored side stripes or top stripes on cards (removed in the design review).
- **Don't** bring printout styles (Arial headings, lesson purple #8064A2, review shading #E5DFEC) into the app's screens.
- **Don't** put on-screen text under 11px.
- **Don't** use big shadows on cards. Big shadows are only for dialogs.
- **Don't** use technical words (JSON, sync conflict, CSV) in labels or messages.
