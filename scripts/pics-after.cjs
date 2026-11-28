/* Pictures after the question text (her rule 2026-11-28, CONVERSION-RULES.md section 6). The Regents put a picture between
   sentences; in the banks it goes after the text instead. In a question with parts (a), (b) (or a) / a.), a picture inside a part
   goes after that part's text, and one before (a) after the opening text. Answer choices are not touched (callers pass only the stem).
   Not guessed, left as they are and reported: a picture inside a sentence ('inline'), two pictures in one part with text between
   them ('between': captions or labels), and text after the picture that says "above" ('above').

   const P = require('./pics-after.cjs');
   P.html(html) → {text, moved, flag}   app question HTML (bank files)
   P.md(body)   → {text, moved, flag}   Markdown question text (bank folders), choices and "## Answer" already cut off */

// "above" that points at a picture ("the graph above", "shown above"), not "above the ground"
const ABOVE = /\b(?:shown|graphed|given|pictured|displayed|drawn|plotted|illustrated|figure|diagram|graph|graphs|table|picture|chart|plot|stemplot|histogram|grid|axes|scatterplot|boxplot|map|image)\s+above\b|\babove\s+(?:figure|diagram|graph|table|picture|chart|plot)s?\b|\bthe above\b/i;
const LAB = /^\s*(?:\(([a-h])\)|([a-h])\)|([a-h])\.(?=\s))/;

// tokens: br (line break), img (a picture), tbl (a table, kept whole), txt (anything else); joining t.s gives the input back
function tokHtml(h) {
  const out = []; let i = 0;
  while (i < h.length) {
    const r = h.slice(i), br = /^<br\s*\/?>/i.exec(r), img = /^<img\b[^>]*>/i.exec(r);
    if (br) { out.push({ t: 'br', s: br[0] }); i += br[0].length; continue; }
    if (img) { out.push({ t: 'img', s: img[0] }); i += img[0].length; continue; }
    if (/^<table\b/i.test(r)) { // to its own </table>, nested tables included
      const re = /<(\/?)table\b[^>]*>/gi; re.lastIndex = i; let d = 0, m;
      while ((m = re.exec(h))) { d += m[1] ? -1 : 1; if (!d) break; }
      const end = m ? re.lastIndex : h.length; out.push({ t: 'tbl', s: h.slice(i, end) }); i = end; continue; }
    const n = r.search(/<br\s*\/?>|<img\b|<table\b/i), s = n < 0 ? r : r.slice(0, n || 1);
    out.push({ t: 'txt', s, x: s.replace(/<[^>]*>/g, '').replace(/&(?:nbsp|ensp|emsp|thinsp|#160|#8194|#8195);/g, ' ') }); i += s.length;
  }
  return out;
}
function tokMd(b) {
  const out = [];
  b.split('\n').forEach((l, k) => {
    if (k) out.push({ t: 'br', s: '\n' });
    if (/^\|/.test(l)) { out.push({ t: 'tbl', s: l }); return; } // a table row (pictures in cells stay)
    l.split(/(!\[[^\]]*\]\([^)]*\)(?:\{[^}]*\})?)/).forEach((p, j) => { if (p) out.push(j % 2 ? { t: /\.md\)/.test(p) ? 'tbl' : 'img', s: p } : { t: 'txt', s: p, x: p.replace(/[*$]/g, '') }); });
  });
  return out;
}

function move(toks, md) {
  const ws = t => t.t === 'txt' && !t.x.trim(), gap = t => t.t === 'br' || ws(t);
  // part starts: a line whose text starts with (a), (b), … in order (two at least, like the app's splitParts)
  const starts = []; let seq = 0;
  toks.forEach((t, i) => {
    if (t.t !== 'txt' || ws(t)) return; let j = i - 1; while (j >= 0 && ws(toks[j])) j--;
    if (j >= 0 && toks[j].t !== 'br' && toks[j].t !== 'tbl') return;
    const m = LAB.exec(t.x); if (m && (m[1] || m[2] || m[3]) === 'abcdefgh'[seq]) { starts.push(i); seq++; } });
  const cuts = [0].concat(seq > 1 ? starts : [], [toks.length]);
  let out = [], moved = 0, flag = '';
  for (let k = 0; k + 1 < cuts.length; k++) {
    const seg = toks.slice(cuts[k], cuts[k + 1]), groups = [];
    for (let i = 0; i < seg.length; i++) {
      if (seg[i].t !== 'img') continue;
      let e = i; for (let j = i + 1; j < seg.length; j++) { if (seg[j].t === 'img') e = j; else if (!gap(seg[j])) break; }
      groups.push([i, e]); i = e;
    }
    const content = (a, b) => seg.slice(a, b).some(t => !gap(t) && t.t !== 'img');
    let f = '';
    groups.forEach(([a, e]) => { // a picture on its own line (or next to a table), not inside a sentence
      let p = a - 1; while (p >= 0 && ws(seg[p])) p--; let n = e + 1; while (n < seg.length && ws(seg[n])) n++;
      if ((p >= 0 && seg[p].t === 'txt') || (n < seg.length && seg[n].t === 'txt')) f = f || 'inline'; });
    if (!groups.length || !content(groups[0][1] + 1, seg.length)) { out = out.concat(seg); continue; }
    if (!f && groups.length > 1) f = 'between';
    if (!f && ABOVE.test(seg.slice(groups[0][1] + 1).map(t => t.x || '').join(' '))) f = 'above';
    if (f) { flag = flag || f; out = out.concat(seg); continue; }
    // take the picture out: the line breaks on its two sides become one gap (the bigger one)
    const [a, e] = groups[0]; let l = a, r = e + 1;
    while (l > 0 && gap(seg[l - 1])) l--; while (r < seg.length && gap(seg[r])) r++;
    const brs = s => s.filter(t => t.t === 'br').length, L = brs(seg.slice(l, a)), R = brs(seg.slice(e + 1, r));
    const sep = md ? 2 : Math.max(L, R, 1), br = { t: 'br', s: md ? '\n' : '<br>' }, pic = seg.slice(a, e + 1);
    let rest = seg.slice(0, l).concat(l ? Array(Math.max(L, R)).fill(br) : [], seg.slice(r));
    // then put it after the last words of this part (before the line breaks that lead to the next part)
    let t = rest.length; while (t > 0 && gap(rest[t - 1])) t--;
    const tail = rest.slice(t), before = rest.slice(0, t), last = before[before.length - 1];
    rest = before.concat(!md && last && last.t === 'tbl' ? [] : Array(sep).fill(br), pic, tail);
    out = out.concat(rest); moved++;
  }
  return { text: out.map(t => t.s).join(''), moved, flag };
}

const html = h => { const r = move(tokHtml(h || ''), false); if (r.flag || !r.moved) r.text = h; return r; };
const md = b => { const r = move(tokMd(b || ''), true); if (r.flag || !r.moved) r.text = b; return r; };
module.exports = { html, md };

if (require.main === module) { // self-check: node scripts/pics-after.cjs
  const a = require('assert'), I = '<img class="q-img" src="x">';
  a.strictEqual(html('One.<br><br>' + I + '<br><br>Two?').text, 'One.<br><br>Two?<br><br>' + I);
  a.strictEqual(html('One.<br>' + I + '<br>Two?').text, 'One.<br>Two?<br>' + I);
  a.strictEqual(html('Open.<br><br>' + I + '<br><br>More.<br><br>(a) First.<br><br>' + I + '<br><br>then.<br><br>(b) Second.').text,
    'Open.<br><br>More.<br><br>' + I + '<br><br>(a) First.<br><br>then.<br><br>' + I + '<br><br>(b) Second.');
  a.strictEqual(html('Text ' + I + ' and more.').flag, 'inline');
  a.strictEqual(html(I + '<br><br>Figure A<br><br>' + I + '<br><br>Which?').flag, 'between');
  a.strictEqual(html(I + '<br><br>In the diagram above, x?').flag, 'above');
  a.strictEqual(html('One.<br><br>' + I + '<table><tr><td>1</td></tr></table>').text, 'One.<br><br><table><tr><td>1</td></tr></table>' + I);
  a.strictEqual(html('Done.<br><br>' + I).moved, 0);
  const P = '![picture](../images/a.svg){width=2in}';
  a.strictEqual(md('Open.\na) x\n\n' + P + '\n$b$) y').text, 'Open.\na) x\n\n' + P + '\n$b$) y'); // $b$) is part (b)
  a.strictEqual(md('One.\n\n' + P + '\n\nTwo?').text, 'One.\n\nTwo?\n\n' + P);
  a.strictEqual(md('Open.\n\n' + P + '\n\n**(a)** x\n\n**(b)** y').text, 'Open.\n\n' + P + '\n\n**(a)** x\n\n**(b)** y');
  a.strictEqual(md('One.\n\n' + P + '\n\n| a | b |\n|---|---|\n| 1 | 2 |').text, 'One.\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n' + P);
  a.strictEqual(md('A.\n\n![t](../images/t.md){width=0in}\n\n' + P + '\n\nB?').text, 'A.\n\n![t](../images/t.md){width=0in}\n\nB?\n\n' + P); // a table file stays
  for (const s of ['x', 'One.<br><br>' + I + '<br><br>Two?']) a.strictEqual(html(html(s).text).text, html(s).text); // twice = once
  console.log('pics-after: ok');
}
