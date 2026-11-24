#!/usr/bin/env node
/* Turns an ExamView bank (.bnk) into a bank folder: one Markdown file per question (math as $LaTeX$, tables as Markdown
   tables), pictures as PNG files, and review.html to check every question next to the ExamView version.
   Pictures are cut at 300 dpi from the official Regents exam PDFs when they are found (any file name: each PDF is
   recognized by its cover page); otherwise the bank's own pictures are kept. The bank's pictures always stay in
   images/examview/.

   node scripts/bank-folder.cjs <bank.bnk> [--pdfs <folder>] [--out <folder>]
     --pdfs  where the exam PDFs are, looked for in subfolders too (default ~/Documents/TestBuilderResource/Regents exams)
     --out   where the bank folder goes (default ~/Documents/TestBuilderResource/Bank folders)

   Uses the app itself (ExamView reader, PDF reader) in a headless browser, so run `python3 build.py` first. */
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..');
const { launch, openApp } = require(path.join(ROOT, 'tests', 'helpers.cjs'));

const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const RES = path.join(os.homedir(), 'Documents', 'TestBuilderResource');
const PDFS = opt('--pdfs') || path.join(RES, 'Regents exams'), OUTDIR = opt('--out') || path.join(RES, 'Bank folders');
const BNK = args[0];
if (!BNK || !fs.existsSync(BNK)) { console.error('usage: node scripts/bank-folder.cjs <bank.bnk> [--pdfs <folder>] [--out <folder>]'); process.exit(1); }
const OUT = path.join(OUTDIR, path.basename(BNK, '.bnk') + ' bank folder');

const MON = { '01': 'January', '06': 'June', '08': 'August' }, MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const refParts = ref => { let m = /^(\d\d)(\d\d)(\d\d)/.exec(ref || ''); if (m) return { kind: 'exam', mm: m[1], yy: m[2], n: +m[3] };
  m = /^([a-z]+)(\d\d)(\d\d)/i.exec(ref || ''); return m ? { kind: m[1].toLowerCase(), yy: m[2], n: +m[3] } : null; };
const nameOf = (q, i) => { const r = refParts(q.ref); if (!r) return 'q' + String(i + 1).padStart(3, '0'); /* no exam reference: its place in the bank */ return (r.kind === 'exam' ? r.mm + r.yy : r.kind + r.yy) + '-' + String(r.n).padStart(2, '0'); };
const examOf = q => { const r = refParts(q.ref); if (!r) return ''; if (r.kind === 'exam') return (MON[r.mm] || r.mm) + ' 20' + r.yy + ' #' + r.n;
  const k = { spr: 'Spring', fall: 'Fall', sum: 'Summer', win: 'Winter' }[r.kind] || r.kind; return k + ' 20' + r.yy + ' sample #' + r.n; };
// front-matter keys the tool writes from the bank; a key it doesn't know (one of her own fields) or one of KEEP_KEYS is kept on a re-run
const TOOL_KEYS = new Set(['id', 'ref', 'exam', 'type', 'points', 'answer', 'answer notes', 'unit', 'section', 'standard', 'cluster', 'topic', 'subtopic', 'nyStd', 'source', 'notes', 'space', 'answerArea', 'lines']);
const KEEP_KEYS = new Set(['topic', 'subtopic', 'unit', 'section', 'notes']);
const yq = v => v === '' || v == null ? '""' : typeof v === 'number' || (/^[\w .,()\-\/#]+$/.test(String(v)) && !/^\d+$/.test(String(v))) ? String(v) : JSON.stringify(String(v));
const b64 = f => fs.readFileSync(f).toString('base64');

(async () => {
  const browser = await launch(); const { page } = await openApp(browser);
  page.on('console', m => { if (m.type() === 'error') console.log('  [page]', m.text()); });
  if (process.env.DBG) await page.evaluate(n => { globalThis.__DBGN = n; }, +process.env.DBG);

  // 1. read the bank with the app's own ExamView reader
  const bank = await page.evaluate(async ([d, name]) => {
    const u = Uint8Array.from(atob(d), c => c.charCodeAt(0)); const o = await BNK.parse(u.buffer, name);
    return { title: o.title, warnings: o.warnings, qs: o.questions.map(q => window.__tb.normalize({ questions: [q] }).questions[0]) };
  }, [b64(BNK), path.basename(BNK)]);
  const cc = /COMMON CORE/i.test(bank.title); // the older banks are the Common Core exams
  const course = bank.title.replace(/\s*\d{4}(-\d{4})?\s*REGENTS EXAMS?\s*$/i, '').replace(/\s*COMMON CORE STATE STANDARDS/i, '').trim();
  console.log(bank.title + ': ' + bank.qs.length + ' questions (course on the exams: ' + course + ')');

  // 2. find the exam PDFs: the cover page names the course and the date (answer keys and rating guides are skipped)
  const want = new Set(bank.qs.map(q => refParts(q.ref)).filter(r => r && r.kind === 'exam').map(r => '20' + r.yy + r.mm));
  const exams = {};
  const pdfsIn = (d, depth) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (depth ? pdfsIn(path.join(d, e.name), depth - 1) : []) : /\.pdf$/i.test(e.name) ? [path.join(d, e.name)] : []);
  for (const full of pdfsIn(PDFS, 3)) { if (fs.statSync(full).size > 15e6) continue;
    const cover = await page.evaluate(async d => {
      const lib = await (window.__pdflib || (window.__pdflib = import(URL.createObjectURL(new Blob([document.getElementById('pdflib').textContent], { type: 'text/javascript' }))).then(async lib => {
        const w = await import(URL.createObjectURL(new Blob([document.getElementById('pdfworker').textContent], { type: 'text/javascript' }))); globalThis.pdfjsWorker = w; return lib; })));
      try { const doc = await lib.getDocument({ data: Uint8Array.from(atob(d), c => c.charCodeAt(0)) }).promise; const t = await (await doc.getPage(1)).getTextContent(); return t.items.map(i => i.str).join('\n'); } catch (e) { return ''; }
    }, b64(full));
    if (!/REGENTS HIGH SCHOOL EXAMINATION/i.test(cover) || /SCORING KEY|RATING GUIDE|CONVERSION CHART/i.test(cover)) continue;
    // the course in capitals anywhere on the cover ("ALGEBRA I" can come in pieces; \b keeps ALGEBRA I and ALGEBRA II apart)
    if (!new RegExp('\\b' + course.trim().split(/\s+/).join('\\s+') + '\\b').test(cover.replace(/\s+/g, ' '))) continue;
    const dm = new RegExp('(' + MONTHS.join('|') + ')\\s+\\d{1,2},\\s+(\\d{4})').exec(cover); if (!dm) continue;
    const ym = dm[2] + String(MONTHS.indexOf(dm[1]) + 1).padStart(2, '0');
    // two exams on one date (a Common Core and a new one): take the one that matches the bank
    if (want.has(ym) && (!exams[ym] || /COMMON CORE/i.test(cover) === cc)) { exams[ym] = full; }
  }
  console.log('exam PDFs found: ' + (Object.keys(exams).sort().map(k => MON[k.slice(4)] + ' ' + k.slice(0, 4) + ' (' + path.basename(exams[k]) + ')').join(', ') || 'none'));
  const missing = [...want].filter(k => !exams[k]).sort();
  if (missing.length) console.log('no PDF yet for: ' + missing.map(k => (MON[k.slice(4)] || k.slice(4)) + ' ' + k.slice(0, 4)).join(', ') + ' (those keep the ExamView pictures)');

  // 3. cut each picture from its exam page (question pictures, and pictures that are answer choices)
  const crops = {};
  for (const ym of Object.keys(exams)) {
    const jobs = bank.qs.filter(q => { const r = refParts(q.ref); return r && r.kind === 'exam' && '20' + r.yy + r.mm === ym && /<img/.test(q.html + (q.choices || []).join('')); })
      .map(q => ({ id: q.id, n: refParts(q.ref).n, stem: (/<img[^>]*src="([^"]+)"/.exec(q.html) || [])[1] || null, choices: (q.choices || []).map(c => (/<img[^>]*src="([^"]+)"/.exec(c) || [])[1] || null) }));
    const res = await page.evaluate(async ([d, jobs]) => {
      window.__DBG = +(new URLSearchParams(location.search).get('dbg') || 0) || globalThis.__DBGN; const u = Uint8Array.from(atob(d), c => c.charCodeAt(0)), doc = await PDFIMP.open(u), S = 300 / 72, cache = {}, out = {};
      const pageCanvas = async pi => cache[pi] || (cache[pi] = (await PDFIMP.thumb(doc, pi, Math.round(doc.pages[pi].w * S))).canvas);
      const blanks = {};
      const size = src => new Promise(r => { const i = new Image(); i.onload = () => { const c = document.createElement('canvas'), w = c.width = Math.min(400, i.naturalWidth), h = c.height = Math.max(1, Math.round(w * i.naturalHeight / i.naturalWidth)); const x = c.getContext('2d'); x.drawImage(i, 0, 0, w, h);
        const d = x.getImageData(0, 0, w, h).data; let n = 0; for (let k = 0; k < d.length; k += 4) if (d[k] < 160 || d[k + 1] < 160 || d[k + 2] < 160) n++; blanks[src.length + ':' + src.slice(-40)] = n < w * h * 0.002; r(i.naturalWidth / i.naturalHeight); }; i.onerror = () => r(0); i.src = src; });
      const isBlank = src => !!blanks[src.length + ':' + src.slice(-40)];
      // the ink inside a box, without sentences, the page frame or the "Use this space for computations." note;
      // when there are several separate pieces, the one shaped most like the bank's picture
      const find = async (pi, bx, yEnd, textX, ratio, prose) => {
        const P = doc.pages[pi], cv = await pageCanvas(pi), ctx = cv.getContext('2d');
        const comp = P.lines.flatMap(L => L.items).filter(it => /computations|Use this space/i.test(it.s) && it.x > bx.x0 + 100 && it.top < yEnd + 300);
        const x0 = Math.max(0, Math.floor((bx.x0 - (prose ? 30 : 0)) * S)), x1 = Math.ceil((comp.length ? Math.min(...comp.map(c => c.x)) - 6 : prose ? P.w - 30 : bx.x1) * S);
        const y0 = Math.floor(bx.y0 * S), y1 = Math.ceil(yEnd * S), W = x1 - x0, H = y1 - y0; if (W < 10 || H < 10) return null;
        const words = prose ? P.lines.filter(L => L.top * S < y1 && L.bot * S > y0 && (/continued on the next page|^\[The use of/i.test(L.text) || (L.x0 < textX + 4 && /[a-z]{2,}/.test(L.text)) || (L.text.length >= 45 && (L.text.match(/[A-Za-z]{3,}/g) || []).length >= 5))) : [];
        const isProse = y => words.some(L => y >= (L.top - 0.45 * L.h) * S && y <= (L.bot + 0.25 * L.h) * S);
        const data = ctx.getImageData(x0, y0, W, H).data, dark = (x, y) => { const k = (y * W + x) * 4; return data[k] < 200 || data[k + 1] < 200 || data[k + 2] < 200; };
        const colN = new Uint32Array(W), rowN = new Uint32Array(H);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (dark(x, y)) { colN[x]++; rowN[y]++; }
        const frameC = x => (x < W * 0.06 || x > W * 0.94) && colN[x] > H * 0.5, frameR = y => (y < H * 0.06 || y > H * 0.94) && rowN[y] > W * 0.7;
        const ink = (x, y) => !frameC(x) && !frameR(y) && dark(x, y), row = new Uint8Array(H);
        for (let y = 0; y < H; y++) { if (isProse(y + y0)) { row[y] = 2; continue; } for (let x = 0; x < W; x++) if (ink(x, y)) { row[y] = 1; break; } }
        const bands = []; let cur = null, gap = 0;
        for (let y = 0; y < H; y++) { if (row[y] === 1) { if (cur && gap < 16 * S) cur.b = y; else { cur = { a: y, b: y }; bands.push(cur); } gap = 0; } else if (row[y] === 2) { cur = null; gap = 0; } else gap++; }
        const cands = bands.filter(b => b.b - b.a > 2 * S).map(b => { let lx = W, rx = 0; for (let y = b.a; y <= b.b; y++) for (let x = 0; x < W; x++) if (ink(x, y)) { if (x < lx) lx = x; if (x > rx) rx = x; } return Object.assign(b, { lx, rx, r: (rx - lx + 1) / (b.b - b.a + 1) }); });
        // pieces with no sentence between them can be one picture (dot plots in four panels, a box plot over its number line)
        const segs = []; let sg = null;
        bands.filter(b => b.b - b.a > 2 * S).forEach(b => { if (!sg || row.slice(sg.b, b.a).includes(2)) { sg = { a: b.a, b: b.b, n: 1 }; segs.push(sg); } else { sg.b = b.b; sg.n++; } });
        segs.filter(g => g.n > 1).forEach(g => { let lx = W, rx = 0; for (let y = g.a; y <= g.b; y++) if (row[y] !== 2) for (let x = 0; x < W; x++) if (ink(x, y)) { if (x < lx) lx = x; if (x > rx) rx = x; } cands.push({ a: g.a, b: g.b, lx, rx, r: (rx - lx + 1) / (g.b - g.a + 1) }); });
        if (!cands.length) return null;
        const big = cands.sort((p, q) => ratio ? Math.abs(Math.log(p.r / ratio)) - Math.abs(Math.log(q.r / ratio)) || (q.b - q.a) - (p.b - p.a) : (q.b - q.a) - (p.b - p.a))[0];
        const pad = Math.round(3 * S), cx = Math.max(0, x0 + big.lx - pad), cy = Math.max(0, y0 + big.a - pad), cw = Math.min(cv.width - cx, big.rx - big.lx + 2 * pad), ch = Math.min(cv.height - cy, big.b - big.a + 2 * pad);
        const o = document.createElement('canvas'); o.width = cw; o.height = ch; o.getContext('2d').drawImage(cv, cx, cy, cw, ch, 0, 0, cw, ch);
        return { png: o.toDataURL('image/png'), page: pi + 1, shape: (cw / ch) / (ratio || cw / ch) };
      };
      // answer choices that are pictures (graphs, small tables): find every separate picture in the question and give each
      // label (1)–(4) the picture right next to it (labels are often under the picture, which the text reader can't know)
      const choicePics = async (q, want, ratios) => {
        const P = doc.pages[q.page], cv = await pageCanvas(q.page), ctx = cv.getContext('2d');
        const comp = P.lines.flatMap(L => L.items).filter(it => /computations|Use this space/i.test(it.s) && it.x > q.stemBox.x0 + 100);
        const x0 = Math.max(0, Math.floor((q.stemBox.x0 - 30) * S)), x1 = Math.ceil((comp.length ? Math.min(q.stemBox.x1, Math.min(...comp.map(c => c.x)) - 6) : P.w - 30) * S);
        const y0 = Math.floor(q.top * S), y1 = Math.ceil(q.limitBottom * S), W = x1 - x0, H = y1 - y0;
        const data = ctx.getImageData(x0, y0, W, H).data, G = 6, gw = Math.ceil(W / G), gh = Math.ceil(H / G), cell = new Uint8Array(gw * gh);
        const blank = P.lines.filter(L => L.top * S < y1 && L.bot * S > y0).flatMap(L => (L.text.length >= 18 && (L.text.match(/[A-Za-z]{3,}/g) || []).length >= 3) ? [{ x: L.x0, x1: L.x1, top: L.top, bot: L.bot }] : L.items.filter(it => /^\(?[1-4]\)$/.test(it.s.trim())).map(it => ({ x: it.x, x1: it.x1, top: it.top, bot: it.bot })));
        const labelBoxes = P.lines.flatMap(L => L.items).filter(it => /^\(?[1-4]\)$/.test(it.s.trim()));
        const blanked = (x, y) => blank.some(b => x >= (b.x - 4) * S - x0 && x <= (b.x1 + 4) * S - x0 && y >= (b.top - 4) * S - y0 && y <= (b.bot + 4) * S - y0);
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = (y * W + x) * 4; if ((data[k] < 235 || data[k + 1] < 235 || data[k + 2] < 235) && !blanked(x, y)) cell[Math.floor(y / G) * gw + Math.floor(x / G)] = 1; }
        const seen = new Int32Array(gw * gh).fill(-1), blobs = [], R = 3; // cells within 3 (about 4 pt) belong together
        for (let i = 0; i < cell.length; i++) { if (!cell[i] || seen[i] >= 0) continue; const b = { x0: 1e9, y0: 1e9, x1: -1, y1: -1, n: 0 }, st = [i]; seen[i] = blobs.length;
          while (st.length) { const c = st.pop(), cx = c % gw, cy = (c - cx) / gw; b.n++; b.x0 = Math.min(b.x0, cx); b.x1 = Math.max(b.x1, cx); b.y0 = Math.min(b.y0, cy); b.y1 = Math.max(b.y1, cy);
            for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const nx = cx + dx, ny = cy + dy; if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue; const ni = ny * gw + nx; if (cell[ni] && seen[ni] < 0) { seen[ni] = blobs.length; st.push(ni); } } }
          blobs.push(b); }
        // labels sit under their pictures, or level with / above them. Try both ways and keep the one whose pictures are shaped
        // most like the bank's. Pictures stay in their label's column, and the question's own lines (at the text margin) are left out.
        const labels = (q.choices || []).map(c => ({ x: (c.box.x0 - 8) * S - x0, y: (c.box.y0 + 7) * S - y0 }));
        const rowsY = []; labels.forEach(L => { if (!rowsY.some(y => Math.abs(y - L.y) < 8 * S)) rowsY.push(L.y); }); rowsY.sort((a, b) => a - b);
        const rowOf = L => rowsY.findIndex(y => Math.abs(y - L.y) < 8 * S), gapR = rowsY.length > 1 ? Math.min(...rowsY.slice(1).map((y, i) => y - rowsY[i])) : 150 * S;
        const colRange = L => { const xs = labels.filter(M => rowOf(M) === rowOf(L)).map(M => M.x).sort((a, b) => a - b), i = xs.indexOf(L.x); return [i ? (xs[i - 1] + L.x) / 2 : -1e9, i < xs.length - 1 ? (L.x + xs[i + 1]) / 2 : 1e9]; };
        const textBot = Math.max(-1, ...P.lines.filter(L => Math.abs(L.x0 - q.textX) < 4 && L.text.replace(/\s/g, '').length >= 4 && L.bot * S - y0 < rowsY[0] - 6 * S && L.top >= q.top - 1).map(L => (L.bot + 2) * S - y0));
        const parts = blobs.filter(b => b.n >= 3 && b.y0 * G > textBot && !((b.y1 - b.y0 + 1) * G < 3 * S && (b.x1 - b.x0 + 1) * G > 60 * S)); // no answer lines
        const box = bs => { const b = { x0: Math.min(...bs.map(x => x.x0)), x1: Math.max(...bs.map(x => x.x1)), y0: Math.min(...bs.map(x => x.y0)), y1: Math.max(...bs.map(x => x.y1)) }, pad = Math.round(3 * S);
          if ((b.x1 - b.x0 + 1) * G < 15 * S || (b.y1 - b.y0 + 1) * G < 8 * S) return null; // too small to be a picture
          const cx = Math.max(0, x0 + b.x0 * G - pad), cy = Math.max(0, y0 + b.y0 * G - pad); return { cx, cy, cw: Math.min(cv.width - cx, (b.x1 - b.x0 + 1) * G + 2 * pad), ch: Math.min(cv.height - cy, (b.y1 - b.y0 + 1) * G + 2 * pad) }; };
        const tryWay = under => { const own = labels.map(() => []);
          parts.forEach(b => { const cx = (b.x0 + b.x1 + 1) / 2 * G, cy = (b.y0 + b.y1 + 1) / 2 * G; let best = -1, bd = 1e9;
            labels.forEach((L, k) => { const [lo, hi] = colRange(L); if (cx < lo || cx > hi) return; const d = under ? L.y - cy : cy - L.y, r = rowOf(L);
              const reach = under ? L.y - (r > 0 ? rowsY[r - 1] : textBot) : (r < rowsY.length - 1 ? rowsY[r + 1] : H) - L.y; // up to the row before (or the question's text), or down to the next row
              if (d < (under ? -22 : -12) * S || d > reach) return; if (Math.abs(d) < bd) { bd = Math.abs(d); best = k; } });
            if (best >= 0) own[best].push(b); });
          const boxes = own.map((bs, k) => want[k] && bs.length ? box(bs) : null);
          const err = boxes.reduce((e, b, k) => e + (!want[k] ? 0 : !b ? 3 : Math.abs(Math.log((b.cw / b.ch) / (ratios[k] || b.cw / b.ch)))), 0);
          return { boxes, err }; };
        const a = tryWay(true), b2 = tryWay(false), pick = a.err <= b2.err ? a : b2;
        if (window.__DBG === q.num) console.error('DBG', JSON.stringify({ labels: labels.map(L => [Math.round(L.x / S), Math.round(L.y / S)]), textBot: Math.round(textBot / S), parts: parts.map(b => [b.x0 * G / S | 0, b.y0 * G / S | 0, b.x1 * G / S | 0, b.y1 * G / S | 0]), a: a.err, b: b2.err, boxesA: a.boxes.map(Boolean), boxesB: b2.boxes.map(Boolean) }));
        return pick.boxes.map((bx, k) => { if (!bx) return null; const { cx, cy, cw, ch } = bx;
          const o = document.createElement('canvas'); o.width = cw; o.height = ch; const oc = o.getContext('2d'); oc.drawImage(cv, cx, cy, cw, ch, 0, 0, cw, ch);
          oc.fillStyle = '#fff'; labelBoxes.forEach(b => oc.fillRect((b.x - 2) * S - cx, (b.top - 2) * S - cy, (b.x1 - b.x + 4) * S, (b.bot - b.top + 4) * S)); // the (1)–(4) labels stay out of the pictures
          return { png: o.toDataURL('image/png'), page: q.page + 1, shape: (cw / ch) / (ratios[k] || cw / ch) }; });
      };
      for (const j of jobs) {
        const q = doc.found.find(f => f.num === j.n); if (!q) { out[j.id] = { err: 'question ' + j.n + ' not found in the PDF' }; continue; }
        const r = { choices: [] };
        if (j.stem) {
          const ratio = await size(j.stem), end = q.choices ? q.choices[0].box.y0 : q.stemBox.y1;
          r.stem = await find(q.page, q.stemBox, end, q.textX, ratio, true); r.stemBlank = isBlank(j.stem);
          if (!r.stem && doc.pages[q.page].lines.some(l => /continued on the next page/i.test(l.text)) && doc.pages[q.page + 1])
            r.stem = await find(q.page + 1, { x0: q.stemBox.x0, x1: q.stemBox.x1, y0: 40 }, doc.pages[q.page + 1].h * 0.93, q.textX, ratio, true);
        }
        if (j.choices.some(Boolean) && q.choices) { const ratios = []; for (const c of j.choices) ratios.push(c ? await size(c) : 0); r.choices = await choicePics(q, j.choices.map(Boolean), ratios); r.choiceBlank = j.choices.map(c => !!c && isBlank(c)); }
        out[j.id] = r;
      }
      return out;
    }, [b64(exams[ym]), jobs]);
    Object.assign(crops, res);
    const flag = Object.entries(res).flatMap(([id, r]) => { const q = bank.qs.find(x => x.id === id), n = nameOf(q, bank.qs.indexOf(q));
      if (r.err) return [n + ': ' + r.err];
      return [['', r.stem]].concat(r.choices.map((c, k) => ['-' + (k + 1), c])).filter(([, c], i) => i === 0 ? /<img/.test(q.html) : (q.choices[i - 1] || '').indexOf('<img') >= 0)
        .filter(([s, c]) => !c || ((c.shape < 0.8 || c.shape > 1.25) && !(s ? (r.choiceBlank || [])[+s.slice(1) - 1] : r.stemBlank))).map(([s, c]) => n + s + (c ? ' (shape differs, kept the ExamView picture)' : ' (not found, kept the ExamView picture)')); });
    console.log(MON[ym.slice(4)] + ' ' + ym.slice(0, 4) + ': ' + Object.keys(res).length + ' questions with pictures' + (flag.length ? '; check: ' + flag.join(', ') : ', all shapes match the bank'));
  }

  // 4. Markdown with LaTeX
  const md = await page.evaluate(qs => {
    const CH = { '∠': '\\angle ', '°': '^{\\circ}', 'º': '^{\\circ}', '−': '-', '≅': '\\cong ', '∼': '\\sim ', '~': '\\sim ', '∘': '\\circ ', '⊥': '\\perp ', '∥': '\\parallel ', 'π': '\\pi ', 'θ': '\\theta ', '△': '\\triangle ', 'Δ': '\\Delta ', '×': '\\times ', '÷': '\\div ', '≠': '\\neq ', '≤': '\\le ', '≥': '\\ge ', '±': '\\pm ', '≈': '\\approx ', '·': '\\cdot ', '→': '\\to ', '←': '\\leftarrow ', '↔': '\\leftrightarrow ', '∞': '\\infty ', 'ℓ': '\\ell ', '∴': '\\therefore ', '∈': '\\in ', '∅': '\\varnothing ', '∩': '\\cap ', '∪': '\\cup ', 'α': '\\alpha ', 'β': '\\beta ', 'γ': '\\gamma ', 'λ': '\\lambda ', 'μ': '\\mu ', 'σ': '\\sigma ', 'ω': '\\omega ', 'Ω': '\\Omega ', 'φ': '\\phi ', '′': "'", '″': "''", '√': '\\surd ', '\u2009': '\\, ', '\u00a0': '\\ ', ' ': '\\ ', '%': '\\%', '{': '\\{', '}': '\\}', '$': '\\$', '#': '\\#', '&': '\\&', '_': '\\_', '|': '\\vert ' };
    const unknown = {};
    function tex(n) {
      if (n.nodeType === 3) {
        let s = ''; const t = n.data.replace(/(^|[^A-Za-z])m(?=∠)/g, '$1\u0001').replace(/([A-Za-z])\u0302/g, '\u0002$1');
        t.split(/([a-z]{3,})/).forEach((part, i) => { // words inside math (like "units") stay upright
          if (i % 2) { s += /^(sin|cos|tan|log|ln)$/.test(part) ? '\\' + part + (part === 'log' && /^\d/.test(t.split(/([a-z]{3,})/)[i + 1] || '') ? '_' : ' ') : '\\text{' + part + '}'; return; } // log3(x): the 3 is the base
          let hat = false;
          for (const c of part) { if (c === '\u0002') { hat = true; continue; } if (hat) { s += '\\hat{' + c + '}'; hat = false; continue; } if (c === '\u0001') s += '\\mathrm{m}'; else if (CH[c] !== undefined) s += CH[c]; else if (c.charCodeAt(0) > 126) { unknown[c] = 1; s += c; } else s += c; }
        });
        return s;
      }
      if (n.nodeName === 'BR') return ' \\\\ ';
      const inner = () => [...n.childNodes].map(tex).join(''), c = n.classList || { contains: () => false };
      if (n.nodeName === 'SUP') return '^{' + inner() + '}';
      if (n.nodeName === 'SUB') return '_{' + inner() + '}';
      if (c.contains('m-ov')) return '\\overline{' + inner() + '}';
      if (c.contains('m-arc')) return '\\overset{\\frown}{' + inner() + '}';
      if (c.contains('m-line')) return '\\overleftrightarrow{' + inner() + '}';
      if (c.contains('m-ray')) return '\\overrightarrow{' + inner() + '}';
      if (c.contains('m-rad-sign')) return '';
      if (c.contains('m-sqrt')) return '\\sqrt{' + tex(n.querySelector('.m-rad')) + '}';
      if (c.contains('m-rad')) return inner();
      if (c.contains('m-frac')) return '\\dfrac{' + tex(n.querySelector('.m-num')) + '}{' + tex(n.querySelector('.m-den')) + '}';
      return inner();
    }
    const mathOf = n => { const t = tex(n).replace(/\^\{([^{}]*)\}\^\{/g, '^{$1').replace(/(\\, *)+(?=['′}^_])/g, '').replace(/\s+/g, ' ').replace(/(\\ )+$/, '').trim(); return t ? '$' + t + '$' : ''; }; // empty equations vanish
    const textOf = d => d.replace(/º/g, '°').replace(/([\\$*_|])/g, '\\$1').replace(/(^|[\s(“"])([b-z])(?=$|[\s,;:?!)”"-]|\.(?!\w))/g, (all, pre, v, at, str) => /\d\s$/.test(str.slice(Math.max(0, at - 2), at + pre.length)) ? all : pre + '$' + v + '$').replace(/(\d+(?:\.\d+)?)?π/g, (_, k) => '$' + (k || '') + '\\pi$');
    function mdOf(html, img) {
      const d = document.createElement('div'); d.innerHTML = html; let s = '';
      (function walk(el) {
        el.childNodes.forEach(n => {
          if (n.nodeType === 3) { s += textOf(n.data); return; }
          if (n.nodeName === 'BR') { s += '\n'; return; }
          if (n.nodeName === 'IMG') { s += '\n\n' + img(n) + '\n\n'; return; }
          if (n.nodeName === 'TABLE') { s += '\n\n' + tableMd(n) + '\n\n'; return; }
          if (n.classList && n.classList.contains('m')) { s += mathOf(n); return; }
          if (n.nodeName === 'SUP' || n.nodeName === 'SUB') { s += '$' + tex(n) + '$'; return; } // like the 2 in mi2
          if (n.nodeName === 'B' || n.nodeName === 'I') { const k = n.nodeName === 'B' ? '**' : '*', w = mdOf(n.innerHTML, img); s += w ? k + w + k : ''; return; }
          walk(n);
        });
      })(d);
      return s.replace(/[ \t]+\n/g, '\n').replace(/\n[ \t]+/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
    }
    // tables: a title row (one cell across) becomes a bold line above; the first row is the header
    function tableMd(t) {
      const rows = [...t.querySelectorAll('tr')].map(r => [...r.children].map(td => ({ span: +(td.getAttribute('colspan') || 1), md: mdOf(td.innerHTML, () => '').replace(/\n+/g, ' ') })));
      const n = Math.max(...rows.map(r => r.reduce((a, c) => a + c.span, 0)));
      const line = r => '| ' + r.map(c => (c.md || ' ') + ' ' + '|'.repeat(c.span)).join(' '); // "title ||" spans two columns; an empty cell is "|   |"
      return line(rows[0]) + '\n|' + ':-:|'.repeat(n) + '\n' + rows.slice(1).map(line).join('\n');
    }
    const out = qs.map(q => {
      const pics = []; const pic = n => { pics.push({ src: n.getAttribute('src'), w: (/width:([\d.]+)in/.exec(n.getAttribute('style') || '') || [])[1] }); return '@@PIC' + (pics.length - 1) + '@@'; };
      const stem = mdOf(q.html, pic), choices = (q.choices || []).map(c => mdOf(c, pic).replace(/\n\n/g, ' ').trim());
      // a written answer with math, pictures or tables (ExamView worked answers) becomes an "## Answer" section
      const apics = [], apic = n => { apics.push({ src: n.getAttribute('src'), w: (/width:([\d.]+)in/.exec(n.getAttribute('style') || '') || [])[1] }); return '@@APIC' + (apics.length - 1) + '@@'; };
      const rich = typeof q.answer === 'string' && /<|&[a-z]+;/i.test(q.answer), answer = rich ? mdOf(q.answer, apic).trim() : null;
      return { stem, choices, pics, answer, apics, rich };
    });
    return { out, unknown: Object.keys(unknown) };
  }, bank.qs);
  if (md.unknown.length) console.log('characters with no LaTeX name (kept as they are): ' + md.unknown.join(' '));

  // 5. write the folder
  fs.mkdirSync(path.join(OUT, 'questions'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'images', 'examview'), { recursive: true });
  const used = {}, names = [], fields = ['type', 'points', 'answer', 'unit', 'section', 'standard', 'cluster', 'topic', 'subtopic', 'nyStd', 'source', 'notes', 'space', 'answerArea', 'lines'];
  let nNew = 0, nOld = 0;
  bank.qs.forEach((q, i) => {
    const m = md.out[i]; let name = nameOf(q, i); if (used[name]) { let k = 2; while (used[name + '-' + k]) k++; name += '-' + k; } used[name] = 1; names.push(name);
    const c = crops[q.id] || {}, stemImgs = (q.html.match(/<img/g) || []).length;
    const place = (s) => s.replace(/@@PIC(\d+)@@/g, (_, k) => {
      k = +k; const p = m.pics[k], ext = (/^data:image\/(\w+)/.exec(p.src) || [, 'png'])[1].replace('jpeg', 'jpg');
      const isChoice = k >= stemImgs, ci = isChoice ? m.choices.findIndex(t => t.indexOf('@@PIC' + k + '@@') >= 0) : -1, base = name + (isChoice ? '-' + (ci + 1) : k ? '-' + (k + 1) : '');
      if (p.src.startsWith('data:')) fs.writeFileSync(path.join(OUT, 'images', 'examview', base + '.' + ext), Buffer.from(p.src.split(',')[1], 'base64'));
      let cut = isChoice ? c.choices && c.choices[ci] : k === 0 ? c.stem : null;
      const bankBlank = isChoice ? (c.choiceBlank || [])[ci] : c.stemBlank;
      if (cut && (cut.shape < 0.8 || cut.shape > 1.25) && !bankBlank) cut = null; // shaped differently from the bank's: keep the bank's
      let file = 'examview/' + base + '.' + ext;
      if (cut && cut.png) { fs.writeFileSync(path.join(OUT, 'images', base + '.png'), Buffer.from(cut.png.split(',')[1], 'base64')); file = base + '.png'; nNew++; } else { nOld++; try { fs.unlinkSync(path.join(OUT, 'images', base + '.png')); } catch (e) { } } // no leftover from an earlier run
      return '![picture](../images/' + file + '){width=' + (p.w || '2') + 'in}';
    });
    const ny = /^(.*?),?\s*NY:\s*(.+)$/.exec(q.standard || ''); if (ny) { q.standard = ny[1].trim(); q.nyStd = q.nyStd || ny[2].trim(); }
    // run again on a folder: each question keeps the id it already has there
    const had = path.join(OUT, 'questions', name + '.md'), hadTxt = fs.existsSync(had) ? fs.readFileSync(had, 'utf8') : '', oldId = (/\nid: (\S+)/.exec(hadTxt) || [])[1];
    // what was changed in the folder stays: topic, subtopic, unit, section, notes, and any field of her own (JMAP topic, …)
    const kept = {}; ((/^---\n([\s\S]*?)\n---/.exec(hadTxt) || [])[1] || '').split('\n').forEach(l => { const m = /^([^:]+):\s?(.*)$/.exec(l); if (m && !TOOL_KEYS.has(m[1].trim()) || m && KEEP_KEYS.has(m[1].trim())) kept[m[1].trim()] = m[2]; });
    const meta = { id: oldId || q.id, ref: q.ref, exam: examOf(q) };
    fields.forEach(k => { const v = q[k]; if (v !== '' && v != null && !(k === 'answer' && !(q.type === 'mc' || q.type === 'bm'))) meta[k] = k === 'answer' ? (v >= 0 ? v + 1 : '') : v; });
    meta.type = { mc: 'multiple choice', bm: 'bimodal', tf: 'true/false', sa: 'short answer', es: 'open response' }[q.type] || q.type;
    if (q.type === 'tf') meta.answer = q.answer === 'T' ? 'true' : q.answer === 'F' ? 'false' : '';
    else if (!(q.type === 'mc' || q.type === 'bm') && q.answer && !m.rich) meta['answer notes'] = q.answer;
    const lines = Object.entries(meta).filter(([k]) => !(k in kept)).map(([k, v]) => k + ': ' + yq(v)).concat(Object.entries(kept).map(([k, v]) => k + ': ' + v));
    let txt = '---\n' + lines.join('\n') + '\n---\n\n' + place(m.stem) + '\n';
    if (m.choices.length) txt += '\n' + m.choices.map((ch, k) => (k + 1) + '. ' + place(ch)).join('\n') + '\n';
    if (m.answer && /[A-Za-z0-9@]/.test(m.answer)) txt += '\n## Answer\n\n' + m.answer.replace(/@@APIC(\d+)@@/g, (_, k) => {
      const p = m.apics[+k], ext = (/^data:image\/(\w+)/.exec(p.src) || [, 'png'])[1].replace('jpeg', 'jpg'), file = name + '-answer' + (+k ? '-' + (+k + 1) : '') + '.' + ext;
      if (p.src.startsWith('data:')) fs.writeFileSync(path.join(OUT, 'images', 'examview', file), Buffer.from(p.src.split(',')[1], 'base64'));
      return '![picture](../images/examview/' + file + '){width=' + (p.w || '2') + 'in}';
    }) + '\n';
    fs.writeFileSync(path.join(OUT, 'questions', name + '.md'), txt);
  });
  fs.readdirSync(path.join(OUT, 'questions')).filter(f => f.endsWith('.md') && !used[f.slice(0, -3)]).forEach(f => fs.unlinkSync(path.join(OUT, 'questions', f)));
  const courseName = course.toLowerCase().replace(/\b(\w)/g, c => c.toUpperCase()).replace(/\bIi\b/, 'II').replace(/\bI\b/, 'I');
  fs.writeFileSync(path.join(OUT, 'bank.md'), '---\nname: ' + JSON.stringify(bank.title) + '\ncourses: [' + courseName + ']\nmade from: ' + path.basename(BNK) + '\n---\n\nOne file per question in questions/. Math is LaTeX between $ signs; tables are Markdown tables. Pictures are in images/:\nthe sharp ones were cut from the Regents exam PDFs at 300 dpi; images/examview/ keeps the pictures from the ExamView bank.\n');

  // 6. review.html: ExamView on the left, the new version on the right
  const css = fs.readFileSync(path.join(ROOT, 'src', 'style.css'), 'utf8').split('\n').filter(l => /^\.m[-{ ]|^\.q-grid|^\.q-tbl/.test(l)).join('\n');
  const items = bank.qs.map((q, i) => {
    let k = 0; const ev = (h, pre) => h.replace(/src="data:[^"]+"/g, () => { const f = fs.readdirSync(path.join(OUT, 'images', 'examview')).find(x => x.startsWith(names[i] + pre(k++) + '.')); return 'src="images/examview/' + (f || '') + '"'; });
    const stemN = (q.html.match(/<img/g) || []).length;
    const old = ev(q.html, j => j ? '-' + (j + 1) : '') + (q.choices && q.choices.length ? '<ol>' + q.choices.map((c, j) => '<li' + (j === q.answer ? ' class="ok"' : '') + '>' + ev(c, () => '-' + (j + 1)) + '</li>').join('') + '</ol>' : '');
    return { name: names[i], old, md: fs.readFileSync(path.join(OUT, 'questions', names[i] + '.md'), 'utf8') };
  });
  fs.writeFileSync(path.join(OUT, 'review.html'), REVIEW(bank.title, css, items));
  console.log('wrote ' + OUT + ' (' + names.length + ' questions; ' + nNew + ' pictures from the exam PDFs, ' + nOld + ' from ExamView)');

  // 7. check the math draws
  const rv = await browser.newPage(); await rv.goto('file://' + path.join(OUT, 'review.html')); await rv.waitForFunction(() => window.__bad != null, null, { timeout: 30000 });
  const bad = await rv.evaluate(() => [...document.querySelectorAll('.err[title]')].map(e => e.closest('section').id + ': ' + e.textContent.slice(0, 60)));
  console.log(bad.length ? 'math that needs a look: ' + bad.join(' | ') : 'all math draws');
  await browser.close();
})();

function REVIEW(title, css, items) {
  const script = String.raw`
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;');}
function img(p){var im=/!\[[^\]]*\]\(\.\.\/([^)]+)\)\{width=([\d.]+)in\}/g;return p.replace(im,function(_,f,w){return '\u0001'+f+'\u0002'+w+'\u0003';});}
function math(s){var errs=0;
  // \$ is a dollar sign (money), not the start of math
  var h=img(s).replace(/\\\$/g,'\u0004').replace(/\(\$([^$]+)\$\)/g,'$($1)$').split(/(\$[^$]+\$)/).map(function(part){
    if(/^\$[^$]+\$$/.test(part)){try{return katex.renderToString(part.slice(1,-1).replace(/\u0004/g,'\\$'),{throwOnError:true});}catch(e){errs++;return '<span class="err" title="'+esc(e.message)+'">'+esc(part)+'</span>';}}
    return esc(part).replace(/\\([\\$*_|])/g,'$1').replace(/\n/g,'<br>')
      .replace(/\u0001([^\u0002]+)\u0002([\d.]+)\u0003/g,'<img src="$1" style="width:$2in">').replace(/\u0004/g,'$');}).join('').replace(/\*\*([\s\S]+?)\*\*/g,'<b>$1</b>').replace(/(^|[^\\])\*([^*]+?)\*/g,'$1<i>$2</i>'); // bold and italics can hold math
  return {h:h,errs:errs};}
function table(p){var rows=p.split('\n').filter(function(r){return !/^\|[\s:|-]+\|$/.test(r);}),errs=0;
  var h='<table class="tb">'+rows.map(function(r,i){var parts=r.replace(/^\|/,'').replace(/\|$/,'').split(/(?<!\\)\|/),cells=[];
    parts.forEach(function(c){if(c===''&&cells.length){cells[cells.length-1].span++;return;}cells.push({t:c.trim(),span:1});}); // "||" = the cell before spans one more column
    return '<tr>'+cells.map(function(c){var x=math(c.t),tg=i?'td':'th';errs+=x.errs;return '<'+tg+(c.span>1?' colspan="'+c.span+'"':'')+'>'+x.h+'</'+tg+'>';}).join('')+'</tr>';}).join('')+'</table>';
  return {h:h,errs:errs};}
var bad=0;
document.getElementById('m').innerHTML=Q.map(function(q){
  var m=/^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(q.md),meta=m[1],body=m[2].trim(),ans=(/\nanswer: (\d)/.exec('\n'+meta)||[])[1];
  var lines=body.split('\n'),ch=[];while(lines.length&&/^\d+\. /.test(lines[lines.length-1]))ch.unshift(lines.pop().replace(/^\d+\. /,''));
  var errs=0;
  var paras=lines.join('\n').trim().split(/\n\n+/).map(function(p){var t=/^\|/.test(p),r=t?table(p):math(p);errs+=r.errs;return t?r.h:'<p>'+r.h+'</p>';}).join('');
  var chs=ch.length?'<ol>'+ch.map(function(c,i){var r=math(c);errs+=r.errs;return '<li'+(String(i+1)===ans?' class="ok"':'')+'>'+r.h+'</li>';}).join('')+'</ol>':'';
  if(errs)bad++;
  return '<section class="q" id="'+q.name+'"><h3>'+q.name+' · '+esc((/exam: (.*)/.exec(meta)||[])[1]||'')+'</h3><div><div class="lbl">ExamView</div>'+q.old+'</div><div'+(errs?' class="err"':'')+'><div class="lbl">New</div>'+paras+chs+'<div class="meta">'+esc(meta).replace(/\n/g,' · ')+'</div></div></section>';
}).join('');
document.getElementById('stat').textContent=Q.length+' questions'+(bad?' · '+bad+' with math that needs a look (pink)':' · all math drawn');
window.__bad=bad;`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title} · review</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
<style>
body{font:15px/1.45 "Century Schoolbook",Georgia,serif;margin:0;background:#f6f4ef;color:#1d1d1f}
header{position:sticky;top:0;background:#fff;border-bottom:1px solid #ddd;padding:10px 20px;font-family:system-ui,sans-serif;font-size:14px;z-index:2}
header b{color:#7851a9}
.q{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:16px 20px}
.q>div{background:#fff;border:1px solid #e3e0d8;border-radius:10px;padding:14px 18px;min-width:0}
.q h3{grid-column:1/-1;margin:8px 0 -6px;font:600 13px system-ui,sans-serif;color:#555}
.lbl{font:600 11px system-ui,sans-serif;text-transform:uppercase;letter-spacing:.05em;color:#888;margin-bottom:6px}
img{max-width:100%;height:auto;vertical-align:top}
ol{padding-left:28px} .q>div:last-child li{line-height:1.5;margin:.3em 0} .q>div:last-child li:has(.mfrac){margin:.8em 0} li.ok{font-weight:700}
.katex{font-size:1.05em}
.tb{border-collapse:collapse;margin:8px auto;font:inherit}.tb th,.tb td{border:1px solid #000;padding:2px 14px;text-align:center;font-weight:400}
.meta{font:12px system-ui,sans-serif;color:#666;border-top:1px solid #eee;margin-top:10px;padding-top:6px}
.err{background:#fde8e8}
${css}
</style></head><body><header><b>${title}</b> · ExamView on the left, the new version on the right (math as LaTeX, pictures from the Regents PDFs). <span id="stat"></span></header><main id="m"></main>
<script>var Q=${JSON.stringify(items).replace(/</g, '\\u003c')};${script}</script></body></html>`;
}
