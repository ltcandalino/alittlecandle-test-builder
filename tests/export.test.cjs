// Downloads as files: Word (.docx) for now. Each file is checked from the outside (a real zip with
// well-formed XML parts) and by importing it back with the app's own Word importer.
const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('zlib');
const path = require('path');
const fs = require('fs');
const { launch, openApp, addQuestions, select, settings, gotoTab, OUT } = require('./helpers.cjs');
const { execFileSync, spawnSync } = require('child_process');
const os = require('os');

let browser, ctx, page, errors, ids;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });
beforeEach(async () => {
  ({ context: ctx, page, errors } = await openApp(browser));
  ids = await addQuestions(page, [
    { type: 'mc', html: 'In △ABC, <span class="m-ov">AB</span> ≅ <span class="m-ov">BC</span>. Which angle is congruent to ∠A?', choices: ['∠B', '∠C', '∠ABC', 'none'], answer: 1 },
    { type: 'mc', html: 'Simplify <span class="m-frac"><span class="m-num">6x</span><span class="m-den">3</span></span>.', choices: ['2x', '3x'], answer: 0 },
    { type: 'tf', html: 'Arc <span class="m-acc m-arc">EF</span> is a semicircle.', answer: 'T' },
    { type: 'sa', html: 'Solve x<sup>2</sup> = 49 for <i>x</i> &gt; 0.', answer: '7', lines: 2 },
    { type: 'es', html: 'Prove it.<table><tr><td>Statements</td><td>Reasons</td></tr></table>', answer: 'SAS', points: 4 },
  ]);
  await select(page, ids);
  await settings(page, { headerText: 'Geometry', quarter: '1', unitNum: '3', versions: 2 });
});
afterEach(async () => { const e = errors.slice(); await ctx.close(); assert.deepEqual(e, [], 'page errors'); });

// Reads a zip (stored or deflated entries) into {name: Buffer}.
function unzip(buf) {
  const out = {}, end = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let p = buf.readUInt32LE(end + 16);
  for (let i = 0, n = buf.readUInt16LE(end + 10); i < n; i++) {
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20), nameLen = buf.readUInt16LE(p + 28), extra = buf.readUInt16LE(p + 30), comment = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const ls = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28), data = buf.subarray(ls, ls + size);
    out[name] = method === 8 ? zlib.inflateRawSync(data) : Buffer.from(data);
    p += 46 + nameLen + extra + comment;
  }
  return out;
}
const makeFile = (fmt, kind) => page.evaluate(async ([fmt, kind]) => {
  const blob = await window.__tb.fn.exp()[fmt](kind), u8 = new Uint8Array(await blob.arrayBuffer());
  let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}, [fmt, kind]).then(b64 => Buffer.from(b64, 'base64'));
const makeDocx = (kind) => makeFile('docx', kind);
const PDFLATEX = spawnSync('pdflatex', ['--version']).status === 0;
const wellFormed = (xml) => page.evaluate(x => !new DOMParser().parseFromString(x, 'application/xml').querySelector('parsererror'), xml);

describe('Word (.docx)', () => {
  test('a real Word package: every part is well-formed, small, with the expected pieces', async () => {
    const buf = await makeDocx('both');
    fs.writeFileSync(path.join(OUT, 'export-test.docx'), buf);
    const z = unzip(buf);
    for (const n of ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/_rels/document.xml.rels'])
      assert.ok(z[n], n + ' is in the file');
    for (const [n, d] of Object.entries(z)) if (/\.(xml|rels)$/.test(n)) assert.ok(await wellFormed(d.toString('utf8')), n + ' is well-formed XML');
    assert.ok(buf.length < 60000, 'small: ' + buf.length + ' bytes');
    const doc = z['word/document.xml'].toString('utf8');
    assert.equal((doc.match(/<w:sectPr>/g) || []).length, 4, 'two versions + two keys, each its own section');
    assert.match(doc, /<m:bar>/, 'segment marks are Word equations');
    assert.match(doc, /<m:f>/, 'fractions are Word equations');
    assert.match(doc, /<m:groupChr>/, 'arc marks are Word equations');
    assert.match(doc, /<w:tbl>/, 'tables stay tables');
    assert.match(doc, /Answer Key/, 'keys are included');
    assert.match(doc, /w:pgNumType w:start="1"/, 'page numbers restart for each version');
  });
  test('import it back with the app’s own Word importer: the questions come back', async () => {
    await settings(page, { versions: 1 });
    const buf = await makeDocx('tests');
    const res = await page.evaluate(async (b64) => {
      const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
      const r = await DOCX.parse(u8.buffer, 'roundtrip.docx');
      return r.questions.map(q => ({ text: q.html.replace(/<[^>]+>/g, '').trim(), choices: (q.choices || []).length }));
    }, buf.toString('base64'));
    assert.ok(res.length >= 5, 'found ' + res.length + ' questions');
    assert.ok(res.some(q => /Which angle is congruent/.test(q.text) && q.choices === 4));
    assert.ok(res.some(q => /Solve x/.test(q.text)));
  });
  test('the answer keys get a blank page header, and an accommodated copy is its own section', async () => {
    await settings(page, { accom: { on: true, font: 'OpenDyslexic', size: 'l' } });
    const z = unzip(await makeDocx('both'));
    const doc = z['word/document.xml'].toString('utf8');
    assert.equal((doc.match(/<w:sectPr>/g) || []).length, 5);
    assert.match(z['word/styles.xml'].toString('utf8'), /w:ascii="OpenDyslexic"[^>]*\/><w:sz w:val="28"/, 'accommodated font and 14 pt');
    const blanks = Object.entries(z).filter(([n, d]) => /word\/header\d+\.xml/.test(n) && !/<w:t[ >]/.test(d.toString('utf8')));
    assert.equal(blanks.length, 2, 'one blank header per key section');
  });
  test('Format menu: Word changes the buttons to Download and saves a .docx', async () => {
    await gotoTab(page, 'build');
    await page.selectOption('#fmtSel', 'docx');
    assert.match(await page.textContent('[data-print="both"]'), /^Download /);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-print="keys"]')]);
    assert.equal(dl.suggestedFilename(), 'Geometry Quarter 1 – Unit 3 Exam - answer keys.docx');
    assert.ok(await page.evaluate(() => !!window.__tb.state.savedTests[0]), 'downloading saves the test too');
    await page.selectOption('#fmtSel', 'print');
    assert.match(await page.textContent('[data-print="both"]'), /^Print /);
  });
});

describe('LaTeX (.zip with .tex and pictures)', () => {
  test('exam class, real LaTeX math and symbols, one section per version and key', async () => {
    await page.evaluate(id => { window.__tb.state.questions.find(q => q.id === id).html += ' <img src="' + (() => { const c = document.createElement('canvas'); c.width = 40; c.height = 20; return c.toDataURL('image/png'); })() + '" style="width:1in">'; }, ids[4]);
    const z = unzip(await makeFile('latex', 'both'));
    const texName = Object.keys(z).find(n => n.endsWith('.tex')), tex = z[texName].toString('utf8');
    assert.match(texName, /^Geometry-Quarter-1-Unit-3-Exam---tests-and-keys\.tex$/);
    assert.match(tex, /\\documentclass\[12pt\]\{exam\}/);
    assert.match(tex, /\\overline\{\\mathrm\{AB\}\}/, 'segment bar');
    assert.match(tex, /\\dfrac\{/, 'fraction');
    assert.match(tex, /\\overset\{\\frown\}/, 'arc');
    assert.match(tex, /\\newunicodechar\{∠\}\{\\ensuremath\{\\angle\}\}/, 'angle symbol set up');
    assert.match(tex, /\\fillwithlines\{2\\linefillheight\}/, 'answer lines');
    assert.equal((tex.match(/\\setcounter\{page\}\{1\}/g) || []).length, 4, 'two versions + two keys');
    const pics = Object.keys(z).filter(n => n.startsWith('images/'));
    assert.equal(pics.length, 1, 'the picture is in the zip once');
    assert.ok(tex.includes('{' + pics[0] + '}'), 'and the .tex uses it');
    if (!PDFLATEX) return; // GitHub's machines have no LaTeX; on the Mac this compiles it for real
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alctb-tex-'));
    for (const [n, d] of Object.entries(z)) { fs.mkdirSync(path.dirname(path.join(dir, n)), { recursive: true }); fs.writeFileSync(path.join(dir, n), d); }
    const run = () => spawnSync('pdflatex', ['-interaction=nonstopmode', '-halt-on-error', texName], { cwd: dir, encoding: 'utf8' });
    let r = run(); r = run();
    assert.equal(r.status, 0, 'pdfLaTeX compiles it:\n' + (r.stdout || '').split('\n').filter(l => /^!|^l\.\d/.test(l)).join('\n'));
    assert.ok(fs.existsSync(path.join(dir, texName.replace(/\.tex$/, '.pdf'))));
    fs.copyFileSync(path.join(dir, texName.replace(/\.tex$/, '.pdf')), path.join(OUT, 'export-latex.pdf'));
  });
  test('Format menu: LaTeX downloads a .zip', async () => {
    await gotoTab(page, 'build');
    await page.selectOption('#fmtSel', 'tex');
    assert.match(await page.textContent('[data-print="both"]'), /^Download /);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-print="both"]')]);
    assert.equal(dl.suggestedFilename(), 'Geometry Quarter 1 – Unit 3 Exam - tests and keys.zip');
  });
});
