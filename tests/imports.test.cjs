// Importers: ExamView .bnk, Word .docx, PDF. Uses the sample files in tests/fixtures/.
// Real banks in tests/fixtures/private/ (not committed) are tested too when present.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { launch, openApp, FIX, b64, privateFixtures } = require('./helpers.cjs');

let browser, page, errors;
before(async () => { browser = await launch(); ({ page, errors } = await openApp(browser)); });
after(async () => { await browser.close(); });

const bytes = 'const u=x=>Uint8Array.from(atob(x),c=>c.charCodeAt(0)).buffer;';

describe('Word (.docx)', () => {
  let r;
  before(async () => {
    r = await page.evaluate(async ([d]) => { const u = x => Uint8Array.from(atob(x), c => c.charCodeAt(0)).buffer; return DOCX.parse(u(d), 'sample-exam.docx'); }, [b64(path.join(FIX, 'sample-exam.docx'))]);
  });
  test('finds all three questions', () => assert.equal(r.questions.length, 3));
  test('multiple choice with four choices and the part', () => {
    const q = r.questions[0];
    assert.equal(q.type, 'mc'); assert.equal(q.part, 'Part I'); assert.equal(q.points, 2);
    assert.match(q.html, /slope of the line/); assert.deepEqual(q.choices, ['1', '2', '3', '4']);
  });
  test('special characters survive (degree sign)', () => assert.equal(r.questions[1].choices[0], '30°'));
  test('open response with [4] credits in Part II', () => {
    const q = r.questions[2];
    assert.equal(q.type, 'es'); assert.equal(q.part, 'Part II'); assert.equal(q.points, 4); assert.doesNotMatch(q.html, /\[4\]/);
  });
  test('running header', () => assert.equal(r.header.running, 'Geometry'));
  test('a file that is not a Word document is refused cleanly', async () => {
    const msg = await page.evaluate(async () => { try { await DOCX.parse(new TextEncoder().encode('not a zip').buffer, 'x.docx'); return 'no error'; } catch (e) { return String(e && e.message || e); } });
    assert.notEqual(msg, 'no error');
  });
});

describe('PDF', () => {
  let found;
  before(async () => {
    found = await page.evaluate(async ([d]) => {
      const u = x => Uint8Array.from(atob(x), c => c.charCodeAt(0));
      const doc = await PDFIMP.open(u(d));
      return doc.found.map(f => ({ num: f.num, page: f.page, stem: f.stemText, choices: f.choices && f.choices.map(c => c.text), suggest: f.suggest }));
    }, [b64(path.join(FIX, 'sample-questions.pdf'))]);
  });
  test('finds the four numbered questions', () => assert.deepEqual(found.map(f => f.num), [1, 2, 3, 4]));
  test('reads the question text', () => {
    assert.equal(found[0].stem, 'What is 3 + 4?');
    assert.equal(found[3].stem, 'Explain why vertical angles are congruent.');
  });
  test('reads (1)–(4) choices', () => {
    assert.deepEqual(found[0].choices, ['5', '6', '7', '8']);
    assert.deepEqual(found[1].choices, ['(1, 2)', '(2, 1)', '(0, 1)', '(3, 3)']);
  });
  test('open question has no choices', () => assert.equal(found[3].choices, null));
  test('makes pictures of each question', async () => {
    const n = await page.evaluate(async ([d]) => {
      const u = x => Uint8Array.from(atob(x), c => c.charCodeAt(0));
      const doc = await PDFIMP.open(u(d)); await PDFIMP.cropAll(doc);
      return doc.found.filter(f => f.stemImg && /^data:image\/png/.test(f.stemImg.src || f.stemImg.url || f.stemImg.data || PDFIMP.imgHtml(f.stemImg))).length;
    }, [b64(path.join(FIX, 'sample-questions.pdf'))]);
    assert.equal(n, 4);
  });
});

describe('ExamView (.bnk)', () => {
  test('a file that is not a bank is refused cleanly', async () => {
    const r = await page.evaluate(async () => { try { const x = await BNK.parse(new TextEncoder().encode('hello').buffer, 'x.bnk'); return x.questions.length === 0 ? 'empty' : 'parsed'; } catch (e) { return 'error'; } });
    assert.ok(['error', 'empty'].includes(r), r);
  });
  const banks = privateFixtures('.bnk');
  if (!banks.length) test('real banks (put .bnk files in tests/fixtures/private/ to test them)', { skip: 'no private banks' }, () => {});
  for (const file of banks) {
    describe(path.basename(file), () => {
      let r;
      before(async () => {
        r = await page.evaluate(async ([d, name]) => {
          const u = x => Uint8Array.from(atob(x), c => c.charCodeAt(0)).buffer;
          const x = await BNK.parse(u(d), name);
          return { title: x.title, warnings: x.warnings, questions: x.questions.map(q => ({ type: q.type, html: q.html, choices: q.choices, answer: q.answer, points: q.points, ref: q.ref })) };
        }, [b64(file), path.basename(file)]);
      });
      test('has questions', () => assert.ok(r.questions.length > 0));
      test('every question has text', () => {
        const bad = r.questions.filter(q => !q.html || /undefined|NaN|\[object/.test(q.html.replace(/data:[^"]+/g, '')));
        assert.equal(bad.length, 0, bad.slice(0, 3).map(q => q.html).join(' | '));
      });
      test('every multiple-choice answer points at a real choice', () => {
        const bad = r.questions.filter(q => q.type === 'mc' && !(q.answer >= 0 && q.answer < q.choices.length));
        assert.equal(bad.length, 0);
      });
      test('pictures and math come through', () => {
        const all = r.questions.map(q => q.html + (q.choices || []).join('')).join('');
        assert.match(all, /<img /, 'no pictures found');
        assert.match(all, /class="m-|<sup>|<sub>|√|△/, 'no math found');
      });
      test('references parse into exam labels', async () => {
        const refs = r.questions.map(q => q.ref).filter(Boolean);
        if (!refs.length) return;
        const ok = await page.evaluate(refs => refs.filter(x => window.__tb.fn.parseRef(x)).length, refs);
        assert.ok(ok / refs.length > 0.8, ok + ' of ' + refs.length + ' references parsed');
      });
    });
  }
});

test('no page errors', () => assert.deepEqual(errors, []));
