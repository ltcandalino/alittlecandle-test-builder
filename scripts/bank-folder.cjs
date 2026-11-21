#!/usr/bin/env node
/* Turns an ExamView bank (.bnk) into a bank folder: one Markdown file per question (math as $LaTeX$, tables as Markdown
   tables), pictures as PNG files, and review.html to check every question next to the ExamView version.
   Pictures are cut at 300 dpi from the official Regents exam PDFs when they are found (any file name: each PDF is
   recognized by its cover page); otherwise the bank's own pictures are kept. The bank's pictures always stay in
   images/examview/.

   node scripts/bank-folder.cjs <bank.bnk> [--pdfs <folder>] [--out <folder>]
     --pdfs  where the exam PDFs are (default ~/Downloads)
     --out   where the bank folder goes (default: ~/Downloads/BNKv6)

   Uses the app itself (ExamView reader, PDF reader) in a headless browser, so run `python3 build.py` first. */
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..');
const { launch, openApp } = require(path.join(ROOT, 'tests', 'helpers.cjs'));

const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const PDFS = opt('--pdfs') || path.join(os.homedir(), 'Downloads'), OUTDIR = opt('--out') || path.join(os.homedir(), 'Downloads', 'BNKv6');
const BNK = args[0];
if (!BNK || !fs.existsSync(BNK)) { console.error('usage: node scripts/bank-folder.cjs <bank.bnk> [--pdfs <folder>] [--out <folder>]'); process.exit(1); }
const OUT = path.join(OUTDIR, path.basename(BNK, '.bnk') + ' bank folder');

const MON = { '01': 'January', '06': 'June', '08': 'August' }, MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const refParts = ref => { let m = /^(\d\d)(\d\d)(\d\d)/.exec(ref || ''); if (m) return { kind: 'exam', mm: m[1], yy: m[2], n: +m[3] };
  m = /^([a-z]+)(\d\d)(\d\d)/i.exec(ref || ''); return m ? { kind: m[1].toLowerCase(), yy: m[2], n: +m[3] } : null; };
const nameOf = q => { const r = refParts(q.ref); if (!r) return q.id; return (r.kind === 'exam' ? r.mm + r.yy : r.kind + r.yy) + '-' + String(r.n).padStart(2, '0'); };
const examOf = q => { const r = refParts(q.ref); if (!r) return ''; if (r.kind === 'exam') return (MON[r.mm] || r.mm) + ' 20' + r.yy + ' #' + r.n;
  const k = { spr: 'Spring', fall: 'Fall', sum: 'Summer', win: 'Winter' }[r.kind] || r.kind; return k + ' 20' + r.yy + ' sample #' + r.n; };
const yq = v => v === '' || v == null ? '""' : typeof v === 'number' || (/^[\w .,()\-\/#]+$/.test(String(v)) && !/^\d+$/.test(String(v))) ? String(v) : JSON.stringify(String(v));
const b64 = f => fs.readFileSync(f).toString('base64');

(async () => {
  const browser = await launch(); const { page } = await openApp(browser);
  page.on('console', m => { if (m.type() === 'error') console.log('  [page]', m.text()); });

  // 1. read the bank with the app's own ExamView reader
  const bank = await page.evaluate(async ([d, name]) => {
    const u = Uint8Array.from(atob(d), c => c.charCodeAt(0)); const o = await BNK.parse(u.buffer, name);
    return { title: o.title, warnings: o.warnings, qs: o.questions.map(q => window.__tb.normalize({ questions: [q] }).questions[0]) };
  }, [b64(BNK), path.basename(BNK)]);
  const course = bank.title.replace(/\s*\d{4}(-\d{4})?\s*REGENTS EXAMS?\s*$/i, '').trim();
  console.log(bank.title + ': ' + bank.qs.length + ' questions (course on the exams: ' + course + ')');

  // 2. find the exam PDFs: the cover page names the course and the date (answer keys and rating guides are skipped)
  const want = new Set(bank.qs.map(q => refParts(q.ref)).filter(r => r && r.kind === 'exam').map(r => '20' + r.yy + r.mm));
  const exams = {};
  for (const f of fs.readdirSync(PDFS).filter(f => /\.pdf$/i.test(f))) {
    const full = path.join(PDFS, f); if (fs.statSync(full).size > 15e6) continue;
    const cover = await page.evaluate(async d => {
      const lib = await (window.__pdflib || (window.__pdflib = import(URL.createObjectURL(new Blob([document.getElementById('pdflib').textContent], { type: 'text/javascript' }))).then(async lib => {
        const w = await import(URL.createObjectURL(new Blob([document.getElementById('pdfworker').textContent], { type: 'text/javascript' }))); globalThis.pdfjsWorker = w; return lib; })));
      try { const doc = await lib.getDocument({ data: Uint8Array.from(atob(d), c => c.charCodeAt(0)) }).promise; const t = await (await doc.getPage(1)).getTextContent(); return t.items.map(i => i.str).join('\n'); } catch (e) { return ''; }
    }, b64(full));
    if (!/REGENTS HIGH SCHOOL EXAMINATION/i.test(cover) || /SCORING KEY|RATING GUIDE|CONVERSION CHART/i.test(cover)) continue;
    const lines = cover.split('\n').map(s => s.trim()).filter(Boolean);
    if (!lines.some(l => l.toUpperCase() === course.toUpperCase())) continue;
    const dm = new RegExp('(' + MONTHS.join('|') + ')\\s+\\d{1,2},\\s+(\\d{4})').exec(cover); if (!dm) continue;
    const ym = dm[2] + String(MONTHS.indexOf(dm[1]) + 1).padStart(2, '0');
    if (want.has(ym)) { exams[ym] = full; }
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
      const u = Uint8Array.from(atob(d), c => c.charCodeAt(0)), doc = await PDFIMP.open(u), S = 300 / 72, cache = {}, out = {};
      const pageCanvas = async pi => cache[pi] || (cache[pi] = (await PDFIMP.thumb(doc, pi, Math.round(doc.pages[pi].w * S))).canvas);
      const size = src => new Promise(r => { const i = new Image(); i.onload = () => r(i.naturalWidth / i.naturalHeight); i.onerror = () => r(0); i.src = src; });
      // the ink inside a box, without sentences, the page frame or the "Use this space for computations." note;
      // when there are several separate pieces, the one shaped most like the bank's picture
      const find = async (pi, bx, yEnd, textX, ratio, prose) => {
        const P = doc.pages[pi], cv = await pageCanvas(pi), ctx = cv.getContext('2d');
        const comp = P.lines.flatMap(L => L.items).filter(it => /computations|Use this space/i.test(it.s) && it.x > bx.x0 + 100 && it.top < yEnd + 300);
        const x0 = Math.max(0, Math.floor((bx.x0 - (prose ? 30 : 0)) * S)), x1 = Math.ceil((comp.length ? Math.min(bx.x1, Math.min(...comp.map(c => c.x)) - 6) : bx.x1) * S);
        const y0 = Math.floor(bx.y0 * S), y1 = Math.ceil(yEnd * S), W = x1 - x0, H = y1 - y0; if (W < 10 || H < 10) return null;
        const words = prose ? P.lines.filter(L => L.top * S < y1 && L.bot * S > y0 && ((L.text.length >= 18 && (L.text.match(/[A-Za-z]{3,}/g) || []).length >= 3) || (Math.abs(L.x0 - textX) < 4 && /[a-z]{2,}/.test(L.text)))) : [];
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
        if (!cands.length) return null;
        const big = cands.sort((p, q) => ratio ? Math.abs(Math.log(p.r / ratio)) - Math.abs(Math.log(q.r / ratio)) || (q.b - q.a) - (p.b - p.a) : (q.b - q.a) - (p.b - p.a))[0];
        const pad = Math.round(3 * S), cx = Math.max(0, x0 + big.lx - pad), cy = Math.max(0, y0 + big.a - pad), cw = Math.min(cv.width - cx, big.rx - big.lx + 2 * pad), ch = Math.min(cv.height - cy, big.b - big.a + 2 * pad);
        const o = document.createElement('canvas'); o.width = cw; o.height = ch; o.getContext('2d').drawImage(cv, cx, cy, cw, ch, 0, 0, cw, ch);
        return { png: o.toDataURL('image/png'), page: pi + 1, shape: (cw / ch) / (ratio || cw / ch) };
      };
      for (const j of jobs) {
        const q = doc.found.find(f => f.num === j.n); if (!q) { out[j.id] = { err: 'question ' + j.n + ' not found in the PDF' }; continue; }
        const r = { choices: [] };
        if (j.stem) {
          const ratio = await size(j.stem), end = q.choices ? q.choices[0].box.y0 : q.stemBox.y1;
          r.stem = await find(q.page, q.stemBox, end, q.textX, ratio, true);
          if (!r.stem && doc.pages[q.page].lines.some(l => /continued on the next page/i.test(l.text)) && doc.pages[q.page + 1])
            r.stem = await find(q.page + 1, { x0: q.stemBox.x0, x1: q.stemBox.x1, y0: 40 }, doc.pages[q.page + 1].h * 0.93, q.textX, ratio, true);
        }
        for (let k = 0; k < j.choices.length; k++) r.choices.push(j.choices[k] && q.choices && q.choices[k] ? await find(q.page, q.choices[k].box, q.choices[k].box.y1, 0, await size(j.choices[k]), false) : null);
        out[j.id] = r;
      }
      return out;
    }, [b64(exams[ym]), jobs]);
    Object.assign(crops, res);
    const flag = Object.entries(res).flatMap(([id, r]) => { const q = bank.qs.find(x => x.id === id), n = nameOf(q);
      if (r.err) return [n + ': ' + r.err];
      return [['', r.stem]].concat(r.choices.map((c, k) => ['-' + (k + 1), c])).filter(([, c], i) => i === 0 ? /<img/.test(q.html) : (q.choices[i - 1] || '').indexOf('<img') >= 0)
        .filter(([, c]) => !c || c.shape < 0.8 || c.shape > 1.25).map(([s, c]) => n + s + (c ? ' shape ' + c.shape.toFixed(2) : ' not found')); });
    console.log(MON[ym.slice(4)] + ' ' + ym.slice(0, 4) + ': ' + Object.keys(res).length + ' questions with pictures' + (flag.length ? '; check: ' + flag.join(', ') : ', all shapes match the bank'));
  }

  // 4. Markdown with LaTeX
  const md = await page.evaluate(qs => {
    const CH = { '∠': '\\angle ', '°': '^{\\circ}', 'º': '^{\\circ}', '−': '-', '≅': '\\cong ', '∼': '\\sim ', '⊥': '\\perp ', '∥': '\\parallel ', 'π': '\\pi ', 'θ': '\\theta ', '△': '\\triangle ', 'Δ': '\\Delta ', '×': '\\times ', '÷': '\\div ', '≠': '\\neq ', '≤': '\\le ', '≥': '\\ge ', '±': '\\pm ', '≈': '\\approx ', '·': '\\cdot ', '→': '\\to ', '←': '\\leftarrow ', '↔': '\\leftrightarrow ', '∞': '\\infty ', '∴': '\\therefore ', '∈': '\\in ', '∅': '\\varnothing ', '∩': '\\cap ', '∪': '\\cup ', 'α': '\\alpha ', 'β': '\\beta ', 'γ': '\\gamma ', 'λ': '\\lambda ', 'μ': '\\mu ', 'σ': '\\sigma ', 'ω': '\\omega ', 'Ω': '\\Omega ', 'φ': '\\phi ', '′': "'", '″': "''", '√': '\\surd ', '\u2009': '\\, ', '\u00a0': '\\ ', ' ': '\\ ', '%': '\\%', '{': '\\{', '}': '\\}', '$': '\\$', '#': '\\#', '&': '\\&', '_': '\\_', '|': '\\vert ' };
    const unknown = {};
    function tex(n) {
      if (n.nodeType === 3) {
        let s = ''; const t = n.data.replace(/(^|[^A-Za-z])m(?=∠)/g, '$1\u0001');
        t.split(/([a-z]{3,})/).forEach((part, i) => { // words inside math (like "units") stay upright
          if (i % 2) { s += /^(sin|cos|tan|log|ln)$/.test(part) ? '\\' + part + (part === 'log' && /^\d/.test(t.split(/([a-z]{3,})/)[i + 1] || '') ? '_' : ' ') : '\\text{' + part + '}'; return; } // log3(x): the 3 is the base
          for (const c of part) { if (c === '\u0001') s += '\\mathrm{m}'; else if (CH[c] !== undefined) s += CH[c]; else if (c.charCodeAt(0) > 126) { unknown[c] = 1; s += c; } else s += c; }
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
    const mathOf = n => '$' + tex(n).replace(/(\\, *)+(?=['′}^_])/g, '').replace(/\s+/g, ' ').replace(/(\\ )+$/, '').trim() + '$';
    const textOf = d => d.replace(/º/g, '°').replace(/([\\$*_|])/g, '\\$1').replace(/(\d+(?:\.\d+)?)?π/g, (_, k) => '$' + (k || '') + '\\pi$');
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
      const rows = [...t.querySelectorAll('tr')].map(r => [...r.children].map(td => ({ span: +(td.getAttribute('colspan') || 1), md: mdOf(td.innerHTML, () => '').replace(/\n+/g, ' ').replace(/^\*\*(.*)\*\*$/, '$1') })));
      let title = ''; if (rows.length > 1 && rows[0].length === 1 && rows[0][0].span > 1) title = '**' + rows.shift()[0].md + '**\n\n';
      const n = Math.max(...rows.map(r => r.reduce((a, c) => a + c.span, 0)));
      const line = r => '| ' + r.map(c => (c.md || ' ') + ' ' + '|'.repeat(c.span)).join(' '); // "title ||" spans two columns; an empty cell is "|   |"
      return title + line(rows[0]) + '\n|' + ':-:|'.repeat(n) + '\n' + rows.slice(1).map(line).join('\n');
    }
    const out = qs.map(q => {
      const pics = []; const pic = n => { pics.push({ src: n.getAttribute('src'), w: (/width:([\d.]+)in/.exec(n.getAttribute('style') || '') || [])[1] }); return '@@PIC' + (pics.length - 1) + '@@'; };
      const stem = mdOf(q.html, pic), choices = (q.choices || []).map(c => mdOf(c, pic).replace(/\n\n/g, ' ').trim());
      return { stem, choices, pics };
    });
    return { out, unknown: Object.keys(unknown) };
  }, bank.qs);
  if (md.unknown.length) console.log('characters with no LaTeX name (kept as they are): ' + md.unknown.join(' '));

  // 5. write the folder
  fs.mkdirSync(path.join(OUT, 'questions'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'images', 'examview'), { recursive: true });
  const used = {}, names = [], fields = ['type', 'points', 'answer', 'unit', 'section', 'standard', 'cluster', 'topic', 'subtopic', 'nyStd', 'source', 'notes'];
  let nNew = 0, nOld = 0;
  bank.qs.forEach((q, i) => {
    const m = md.out[i]; let name = nameOf(q); if (used[name]) { let k = 2; while (used[name + '-' + k]) k++; name += '-' + k; } used[name] = 1; names.push(name);
    const c = crops[q.id] || {}, stemImgs = (q.html.match(/<img/g) || []).length;
    const place = (s) => s.replace(/@@PIC(\d+)@@/g, (_, k) => {
      k = +k; const p = m.pics[k], ext = (/^data:image\/(\w+)/.exec(p.src) || [, 'png'])[1].replace('jpeg', 'jpg');
      const isChoice = k >= stemImgs, ci = isChoice ? m.choices.findIndex(t => t.indexOf('@@PIC' + k + '@@') >= 0) : -1, base = name + (isChoice ? '-' + (ci + 1) : k ? '-' + (k + 1) : '');
      if (p.src.startsWith('data:')) fs.writeFileSync(path.join(OUT, 'images', 'examview', base + '.' + ext), Buffer.from(p.src.split(',')[1], 'base64'));
      const cut = isChoice ? c.choices && c.choices[ci] : k === 0 ? c.stem : null;
      let file = 'examview/' + base + '.' + ext;
      if (cut && cut.png) { fs.writeFileSync(path.join(OUT, 'images', base + '.png'), Buffer.from(cut.png.split(',')[1], 'base64')); file = base + '.png'; nNew++; } else nOld++;
      return '![picture](../images/' + file + '){width=' + (p.w || '2') + 'in}';
    });
    const ny = /^(.*?),?\s*NY:\s*(.+)$/.exec(q.standard || ''); if (ny) { q.standard = ny[1].trim(); q.nyStd = q.nyStd || ny[2].trim(); }
    // run again on a folder: each question keeps the id it already has there
    const had = path.join(OUT, 'questions', name + '.md'), oldId = fs.existsSync(had) && (/\nid: (\S+)/.exec(fs.readFileSync(had, 'utf8')) || [])[1];
    const meta = { id: oldId || q.id, ref: q.ref, exam: examOf(q) };
    fields.forEach(k => { const v = q[k]; if (v !== '' && v != null && !(k === 'answer' && !(q.type === 'mc' || q.type === 'bm'))) meta[k] = k === 'answer' ? (v >= 0 ? v + 1 : '') : v; });
    meta.type = { mc: 'multiple choice', bm: 'bimodal', tf: 'true/false', sa: 'short answer', es: 'open response' }[q.type] || q.type;
    if (q.type === 'tf') meta.answer = q.answer === 'T' ? 'true' : q.answer === 'F' ? 'false' : '';
    else if (!(q.type === 'mc' || q.type === 'bm') && q.answer) meta['answer notes'] = q.answer;
    let txt = '---\n' + Object.entries(meta).map(([k, v]) => k + ': ' + yq(v)).join('\n') + '\n---\n\n' + place(m.stem) + '\n';
    if (m.choices.length) txt += '\n' + m.choices.map((ch, k) => (k + 1) + '. ' + place(ch)).join('\n') + '\n';
    fs.writeFileSync(path.join(OUT, 'questions', name + '.md'), txt);
  });
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
  var h=img(s).replace(/\\\$/g,'\u0004').split(/(\$[^$]+\$)/).map(function(part){
    if(/^\$[^$]+\$$/.test(part)){try{return katex.renderToString(part.slice(1,-1).replace(/\u0004/g,'\\$'),{throwOnError:true});}catch(e){errs++;return '<span class="err" title="'+esc(e.message)+'">'+esc(part)+'</span>';}}
    return esc(part).replace(/\\([\\$*_|])/g,'$1').replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>').replace(/\*([^*]+)\*/g,'<i>$1</i>').replace(/\n/g,'<br>')
      .replace(/\u0001([^\u0002]+)\u0002([\d.]+)\u0003/g,'<img src="$1" style="width:$2in">').replace(/\u0004/g,'$');}).join('');
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
.tb{border-collapse:collapse;margin:8px auto;font:13px Arial,Helvetica,sans-serif}.tb th,.tb td{border:1px solid #000;padding:2px 14px;text-align:center}
.meta{font:12px system-ui,sans-serif;color:#666;border-top:1px solid #eee;margin-top:10px;padding-top:6px}
.err{background:#fde8e8}
${css}
</style></head><body><header><b>${title}</b> · ExamView on the left, the new version on the right (math as LaTeX, pictures from the Regents PDFs). <span id="stat"></span></header><main id="m"></main>
<script>var Q=${JSON.stringify(items).replace(/</g, '\\u003c')};${script}</script></body></html>`;
}
