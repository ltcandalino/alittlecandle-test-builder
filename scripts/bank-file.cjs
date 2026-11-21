#!/usr/bin/env node
/* Turns a bank folder (made by bank-folder.cjs, maybe edited since) into an app bank file (.json) that
   Import & backup › Your banks › Open bank files… reads. Math written as LaTeX goes back into the app's own math
   (fractions, roots, overlines, lines, rays, arcs, exponents, symbols); tables, bold, italics and pictures are kept.

   node scripts/bank-file.cjs "<bank folder>" [--out <file.json>] [--course "Algebra 1"]
     --out     default: "<bank> bank file.json" in Bank files (next to Bank folders), else next to the folder
     --course  the app course to put it in (default: from bank.md; Algebra I → Algebra 1, Algebra II → Algebra 2) */
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const OUTF = opt('--out'), COURSE = opt('--course'), DIR = args[0];
if (!DIR || !fs.existsSync(path.join(DIR, 'questions'))) { console.error('usage: node scripts/bank-file.cjs "<bank folder>" [--out file.json] [--course name]'); process.exit(1); }

/* ---------- front matter (the simple "key: value" lines bank-folder writes) ---------- */
function front(text) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(text); if (!m) return { meta: {}, body: text };
  const meta = {}; m[1].split('\n').forEach(l => { const k = /^([^:]+):\s?(.*)$/.exec(l); if (!k) return; let v = k[2].trim();
    if (/^".*"$/.test(v)) { try { v = JSON.parse(v); } catch (e) { } } else if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean);
    meta[k[1].trim()] = v; });
  return { meta, body: m[2] };
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- LaTeX (the part bank-folder writes) → the app's math HTML ---------- */
const SYM = { angle: '∠', cong: '≅', sim: '∼', perp: '⊥', parallel: '∥', pi: 'π', theta: 'θ', triangle: '△', Delta: 'Δ', times: '×', div: '÷', neq: '≠', ne: '≠', le: '≤', leq: '≤', ge: '≥', geq: '≥', pm: '±', approx: '≈', cdot: '·', to: '→', rightarrow: '→', leftarrow: '←', leftrightarrow: '↔', infty: '∞', ell: 'ℓ', therefore: '∴', in: '∈', varnothing: '∅', emptyset: '∅', cap: '∩', cup: '∪', alpha: 'α', beta: 'β', gamma: 'γ', lambda: 'λ', mu: 'μ', sigma: 'σ', omega: 'ω', Omega: 'Ω', phi: 'φ', surd: '√', vert: '|', circ: '°', degree: '°', prime: '′', ldots: '…', dots: '…' };
const FN = { sin: 1, cos: 1, tan: 1, log: 1, ln: 1 };
const REL = /^[=<>≤≥≠≈≅∼⊥∥]$/, BIN = /^[+−±×÷]$/;
function latex(src) {
  let i = 0;
  const peek = () => src[i];
  function group() { // {…} or one token
    while (src[i] === ' ') i++;
    if (src[i] === '{') { i++; const h = seq('}'); i++; return h; }
    return seq(null, true);
  }
  function seq(end, one) {
    let h = '', prev = '';
    const put = (s, isOp) => { h += s; prev = isOp ? 'op' : 'x'; };
    while (i < src.length && src[i] !== end) {
      const c = src[i];
      if (c === '\\') {
        const m = /^\\([A-Za-z]+|.)/.exec(src.slice(i)); i += m[0].length; const n = m[1];
        if (n === ',') put(' '); else if (n === ' ') put(' '); else if (n === '\\') put('<br>');
        else if ('%{}$#&_'.includes(n)) put(esc(n));
        else if (n === 'overline') put('<span class="m-ov">' + group() + '</span>');
        else if (n === 'overleftrightarrow') put('<span class="m-acc m-line">' + group() + '</span>');
        else if (n === 'overrightarrow') put('<span class="m-acc m-ray">' + group() + '</span>');
        else if (n === 'overset') { group(); put('<span class="m-acc m-arc">' + group() + '</span>'); } // \overset{\frown}{AB}
        else if (n === 'sqrt') put('<span class="m-sqrt"><span class="m-rad-sign">√</span><span class="m-rad">' + group() + '</span></span>');
        else if (n === 'frac' || n === 'dfrac' || n === 'tfrac') { const a = group(), b = group(); put('<span class="m-frac"><span class="m-num">' + a + '</span><span class="m-den">' + b + '</span></span>'); }
        else if (n === 'text' || n === 'mathrm' || n === 'textrm' || n === 'mathit') put(group());
        else if (FN[n]) put(n);
        else if (SYM[n]) { const s = SYM[n]; if (REL.test(s)) put('<span class="m-op">' + s + '</span>', true); else if (BIN.test(s) && prev === 'x') put('<span class="m-op">' + s + '</span>', true); else put(s); }
        else put(esc('\\' + n)); // unknown: left as written, so nothing is lost
        if (one) return h;
        continue;
      }
      i++;
      if (c === '^' || c === '_') { const g = group(), tag = c === '^' ? 'sup' : 'sub'; put(g === '°' ? '°' : g === '′' ? '′' : '<' + tag + '>' + g + '</' + tag + '>'); }
      else if (c === '{') { put(seq('}')); i++; }
      else if (c === ' ') { /* LaTeX ignores plain spaces */ }
      else if (c === "'") put('′');
      else if (c === '-') { if (prev === 'x') put('<span class="m-op">−</span>', true); else put('−'); }
      else if (c === '+') { if (prev === 'x') put('<span class="m-op">+</span>', true); else put('+'); }
      else if (REL.test(c)) put('<span class="m-op">' + esc(c) + '</span>', true);
      else put(esc(c));
      if (one) return h;
    }
    return h;
  }
  return seq(null);
}

/* ---------- a line of Markdown → HTML (text, $math$, **bold**, *italic*, pictures) ---------- */
function inline(s, pic) {
  s = s.replace(/!\[[^\]]*\]\(([^)]+)\)\{width=([\d.]+)in\}/g, (_, f, w) => '\u0001' + pic(f, w) + '\u0002');
  const parts = s.replace(/\\\$/g, '\u0003').split(/(\$[^$]+\$)/);
  let h = parts.map(p => {
    if (/^\$[^$]+\$$/.test(p)) return '<span class="m">' + latex(p.slice(1, -1).replace(/\u0003/g, '\\$')) + '</span>';
    return esc(p).replace(/\\([\\*_|])/g, '$1').replace(/\u0003/g, '$');
  }).join('');
  h = h.replace(/\*\*([\s\S]+?)\*\*/g, '<b>$1</b>').replace(/(^|[^\\])\*([^*]+?)\*/g, '$1<i>$2</i>');
  return h.replace(/\u0001([\s\S]*?)\u0002/g, (_, x) => x.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
}
function table(p, pic) {
  const rows = p.split('\n').filter(r => !/^\|[\s:|-]+\|$/.test(r));
  return '<table class="q-tbl q-grid">' + rows.map(r => {
    const cells = []; r.replace(/^\|/, '').replace(/\|$/, '').split(/(?<!\\)\|/).forEach(c => { if (c === '' && cells.length) cells[cells.length - 1].span++; else cells.push({ t: c.trim(), span: 1 }); });
    return '<tr>' + cells.map(c => '<td' + (c.span > 1 ? ' colspan="' + c.span + '"' : '') + '>' + inline(c.t, pic) + '</td>').join('') + '</tr>';
  }).join('') + '</table>';
}
function blocks(text, pic) {
  return text.trim().split(/\n\n+/).map(p => /^\|/.test(p) ? table(p, pic) : inline(p, pic).replace(/\n/g, '<br>'))
    .reduce((h, b, k, all) => h + (k && !/^<table/.test(b) && !/<\/table>$/.test(h) ? '<br><br>' : '') + b, '');
}

/* ---------- the bank ---------- */
const bankMd = fs.existsSync(path.join(DIR, 'bank.md')) ? front(fs.readFileSync(path.join(DIR, 'bank.md'), 'utf8')).meta : {};
const bankName = bankMd.name || path.basename(DIR).replace(/ bank folder$/, '');
const COURSES = { 'Algebra I': 'Algebra 1', 'Algebra II': 'Algebra 2' };
const courses = COURSE ? [COURSE] : (Array.isArray(bankMd.courses) ? bankMd.courses : [bankMd.courses].filter(Boolean)).map(c => COURSES[c] || (/algebra ii\b/i.test(c) ? 'Algebra 2' : /algebra i\b/i.test(c) ? 'Algebra 1' : /geometry/i.test(c) ? 'Geometry' : c));
const TYPE = { 'multiple choice': 'mc', bimodal: 'bm', 'true/false': 'tf', 'short answer': 'sa', 'open response': 'es' };
let pics = 0; const unknown = new Set();
const questions = fs.readdirSync(path.join(DIR, 'questions')).filter(f => f.endsWith('.md')).sort().map(f => {
  const { meta, body } = front(fs.readFileSync(path.join(DIR, 'questions', f), 'utf8'));
  const pic = (file, w) => { const full = path.resolve(path.join(DIR, 'questions'), file); if (!fs.existsSync(full)) return '<span class="q-missing">[picture]</span>';
    pics++; const ext = path.extname(full).slice(1).toLowerCase().replace('jpg', 'jpeg'); return '<img class="q-img" src="data:image/' + ext + ';base64,' + fs.readFileSync(full).toString('base64') + '" style="width:' + w + 'in" alt="">'; };
  const lines = body.trim().split('\n'), ch = []; while (lines.length && /^\d+\. /.test(lines[lines.length - 1])) ch.unshift(lines.pop().replace(/^\d+\. /, ''));
  const type = TYPE[meta.type] || meta.type || 'es', q = { id: meta.id, type, html: blocks(lines.join('\n'), pic), bank: bankName, courses: courses.slice() };
  if (ch.length) q.choices = ch.map(c => inline(c, pic));
  ['ref', 'unit', 'section', 'standard', 'cluster', 'topic', 'subtopic', 'nyStd', 'source', 'notes', 'answerArea'].forEach(k => { if (meta[k] != null && meta[k] !== '') q[k] = String(meta[k]); });
  ['points', 'space', 'lines'].forEach(k => { if (meta[k] != null && meta[k] !== '' && !isNaN(+meta[k])) q[k] = +meta[k]; });
  if (type === 'mc' || type === 'bm') q.answer = meta.answer ? +meta.answer - 1 : -1;
  else if (type === 'tf') q.answer = meta.answer === 'true' ? 'T' : meta.answer === 'false' ? 'F' : '';
  else q.answer = meta['answer notes'] || '';
  (q.html + (q.choices || []).join('')).replace(/\\[A-Za-z]+/g, m => { unknown.add(m); return m; });
  return q;
});
// next to the folder, or in "Bank files" when the folders are in "Bank folders" (Documents/TestBuilderResource)
const near = path.basename(path.dirname(path.resolve(DIR))) === 'Bank folders' ? path.join(path.dirname(path.dirname(path.resolve(DIR))), 'Bank files') : path.dirname(path.resolve(DIR));
const out = OUTF || path.join(near, path.basename(DIR).replace(/ bank folder$/, '') + ' bank file.json');
fs.writeFileSync(out, JSON.stringify({ app: 'test-builder', kind: 'bank', version: 1, saved: new Date().toISOString(), bank: bankName, courses, fields: [], questions }));
console.log('wrote ' + out + ': ' + questions.length + ' questions, ' + pics + ' pictures, course ' + courses.join(', ') + ' (' + (fs.statSync(out).size / 1e6).toFixed(1) + ' MB)');
if (unknown.size) console.log('LaTeX the app can’t draw yet (left as written): ' + [...unknown].join(' '));
