// Core helpers: references, clusters, cleaning question HTML, CSV, pasted text, settings migration.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, openApp, fn, settings } = require('./helpers.cjs');

let browser, page, errors;
before(async () => { browser = await launch(); ({ page, errors } = await openApp(browser)); });
after(async () => { await browser.close(); });

describe('references (MMYYQQ)', () => {
  test('June 2024 question 12', async () => {
    assert.deepEqual(await fn(page, 'parseRef', '062412'), { month: '06', year: 2024, qnum: 12 });
  });
  test('January 2026 question 1', async () => {
    assert.deepEqual(await fn(page, 'parseRef', '012601'), { month: '01', year: 2026, qnum: 1 });
  });
  test('question numbers above 36 and junk are rejected', async () => {
    assert.equal(await fn(page, 'parseRef', '062437'), null);
    assert.equal(await fn(page, 'parseRef', 'abc'), null);
    assert.equal(await fn(page, 'parseRef', ''), null);
  });
  test('exam label', async () => {
    assert.equal(await fn(page, 'examLabel', { month: '06', year: 2024, qnum: 12 }), 'June 2024 #12');
    assert.equal(await fn(page, 'examLabel', { month: '08', year: 2025 }), 'August 2025');
    assert.equal(await fn(page, 'examLabel', {}), '');
  });
  test('fillMeta fills month, year and question # from the reference', async () => {
    const q = await page.evaluate(() => { const q = { ref: '082503', standard: 'G.CO.A.1' }; window.__tb.fn.fillMeta(q); return q; });
    assert.equal(q.month, '08'); assert.equal(Number(q.year), 2025); assert.equal(Number(q.qnum), 3); assert.equal(q.cluster, 'G.CO.A');
  });
});

describe('standards', () => {
  test('cluster comes from the standard', async () => {
    assert.equal(await fn(page, 'clusterOf', 'G.SRT.B.5'), 'G.SRT.B');
    assert.equal(await fn(page, 'clusterOf', 'G.CO.A.1, G.CO.A.2'), 'G.CO.A');
    assert.equal(await fn(page, 'clusterOf', 'NY:G.1'), '');
    assert.equal(await fn(page, 'clusterOf', ''), '');
  });
});

describe('course guessing from file names', () => {
  const cases = [
    ['GEO2024-2026EXAMs.bnk', 'Geometry'], ['Geometry Unit 3.docx', 'Geometry'],
    ['alg1 unit 3.docx', 'Algebra 1'], ['Algebra II.pdf', 'Algebra 2'], ['Alg 2 review.bnk', 'Algebra 2'],
    ['precalc.bnk', 'Pre-Calculus'], ['random.bnk', ''],
  ];
  for (const [name, course] of cases) test(name + ' → ' + (course || '(none)'), async () => {
    assert.equal(await fn(page, 'guessCourse', name), course);
  });
});

describe('cleaning question HTML', () => {
  test('removes scripts, event handlers and javascript links', async () => {
    const out = await fn(page, 'sanitize', '<p onclick="x()">Hi<script>alert(1)</script><a href="javascript:alert(1)">x</a></p>');
    assert.doesNotMatch(out, /script|onclick|javascript|alert/);
    assert.match(out, /Hi/);
  });
  test('an image with onerror never runs it', async () => {
    await page.evaluate(() => { window.__pwned = false; });
    await fn(page, 'sanitize', '<img src="x" onerror="window.__pwned=true">');
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.__pwned), false);
  });
  test('keeps math formatting, tables and embedded pictures', async () => {
    const out = await fn(page, 'sanitize', 'x<sup>2</sup> + y<sub>1</sub> <b>bold</b><table><tr><td>a</td></tr></table><img src="data:image/png;base64,AAAA">');
    assert.match(out, /<sup>2<\/sup>/); assert.match(out, /<sub>1<\/sub>/); assert.match(out, /<b>bold<\/b>/);
    assert.match(out, /<table class="q-tbl"><tr><td>a<\/td><\/tr><\/table>/);
    assert.match(out, /<img src="data:image\/png;base64,AAAA" class="q-img">/);
  });
  test('drops images from other places (only data: and https:)', async () => {
    assert.doesNotMatch(await fn(page, 'sanitize', '<img src="http://example.com/a.png">'), /img/);
    assert.match(await fn(page, 'sanitize', '<img src="https://example.com/a.png">'), /img/);
  });
  test('keeps allowed math classes only', async () => {
    const out = await fn(page, 'sanitize', '<span class="m-ov evil">AB</span>');
    assert.match(out, /class="m-ov"/); assert.doesNotMatch(out, /evil/);
  });
  test('plain text and text to HTML', async () => {
    assert.equal(await fn(page, 'plain', '<p>Hello <b>you</b></p><img src="x">'), 'Hello you [picture]');
    assert.equal(await fn(page, 'textToHtml', 'a<b\nc'), 'a&lt;b<br>c');
  });
});

describe('labels and credits', () => {
  test('points', async () => {
    assert.deepEqual(await page.evaluate(() => [1, 2, 0.5].map(window.__tb.fn.ptsLabel)), ['1 pt', '2 pts', '0.5 pts']);
  });
  test('credit wording for part directions', async () => {
    assert.equal(await fn(page, 'creditsText', [2, 2]), '2 credits');
    assert.equal(await fn(page, 'creditsText', [2, 4]), '2 or 4 credits');
    assert.equal(await fn(page, 'creditsText', [2, 4, 6]), '2, 4 or 6 credits');
  });
  test('roman numerals for parts', async () => {
    assert.deepEqual(await page.evaluate(() => ['Part III', 'Part IV', 'II'].map(window.__tb.fn.romanVal)), [3, 4, 2]);
  });
  test('answer choice labels follow the setting', async () => {
    const lab = async l => { await settings(page, { labels: l }); return page.evaluate(() => [0, 1, 2, 3].map(window.__tb.fn.letterOf)); };
    assert.deepEqual(await lab('num'), ['(1)', '(2)', '(3)', '(4)']);
    assert.deepEqual(await lab('upper'), ['A.', 'B.', 'C.', 'D.']);
    assert.deepEqual(await lab('lowerdot'), ['a.', 'b.', 'c.', 'd.']);
    assert.deepEqual(await lab('lower'), ['a)', 'b)', 'c)', 'd)']);
  });
  test('calculator and time accommodation', async () => {
    await settings(page, { calc: 'Desmos', time: '1.5' });
    assert.equal(await fn(page, 'calcLabel'), 'Desmos');
    assert.equal(await fn(page, 'timeLabel'), '1.5× extended time');
    await settings(page, { calc: 'other', calcOther: 'TI-30XS', time: '2' });
    assert.equal(await fn(page, 'calcLabel'), 'TI-30XS');
    assert.equal(await fn(page, 'timeLabel'), '2.0× extended time');
    await settings(page, { time: 'min', timeMin: '45' });
    assert.match(await fn(page, 'timeLabel'), /^45 /);
    await settings(page, { calc: '', time: '' });
    assert.equal(await fn(page, 'calcLabel'), ''); assert.equal(await fn(page, 'timeLabel'), '');
  });
});

describe('pasted questions', () => {
  test('multiple choice with * answer, true/false and open response', async () => {
    const r = await fn(page, 'parseText', '1. Which?\nA. one\n*B. two\nC. three\n\n2. The sun is a star.\nAnswer: True\n\n3. Describe mitosis.', 'Bank', 'Topic');
    assert.equal(r.errors.length, 0);
    assert.equal(r.qs.length, 3);
    assert.deepEqual([r.qs[0].type, r.qs[0].answer, r.qs[0].choices], ['mc', 1, ['one', 'two', 'three']]);
    assert.deepEqual([r.qs[1].type, r.qs[1].answer], ['tf', 'T']);
    assert.equal(r.qs[2].type, 'es');
    assert.ok(r.qs.every(q => q.bank === 'Bank' && q.topic === 'Topic'));
  });
});

describe('CSV', () => {
  test('quotes, commas and doubled quotes', async () => {
    assert.deepEqual(await fn(page, 'parseCSV', 'a,b\n"x, y","he said ""hi"""\n'), [['a', 'b'], ['x, y', 'he said "hi"']]);
  });
  test('export then import keeps the question details', async () => {
    const r = await page.evaluate(() => {
      const f = window.__tb.fn;
      const q = { id: 'a1', course: 'Geometry', type: 'mc', bank: 'B', source: 'S', unit: '3', section: '2', topic: 'T', subtopic: 'ST',
        standard: 'G.CO.A.1', points: 2, html: 'What is 2+2?', choices: ['3', '4', '5', '6'], answer: 1, ref: '062412', notes: 'note, with comma' };
      return f.fromCSV(f.toCSV([q]), 'Default');
    });
    const q = (r.qs || r)[0];
    assert.equal(q.html, 'What is 2+2?');
    assert.deepEqual(q.choices, ['3', '4', '5', '6']);
    assert.equal(q.answer, 1);
    for (const k of ['bank', 'source', 'unit', 'section', 'topic', 'subtopic', 'standard', 'ref', 'notes']) assert.ok(String(q[k]).length, k + ' missing');
    assert.equal(q.notes, 'note, with comma');
    assert.equal(Number(q.points), 2);
  });
});

describe('random numbers', () => {
  test('the same seed always gives the same shuffle', async () => {
    const r = await page.evaluate(() => {
      const f = window.__tb.fn, a = [1, 2, 3, 4, 5, 6, 7, 8];
      return [f.shuffle(a, f.rng(42)), f.shuffle(a, f.rng(42)), f.shuffle(a, f.rng(7)), a];
    });
    assert.deepEqual(r[0], r[1]);
    assert.notDeepEqual(r[0], r[2]);
    assert.deepEqual([...r[0]].sort(), [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.deepEqual(r[3], [1, 2, 3, 4, 5, 6, 7, 8], 'shuffle must not change the original list');
  });
});

describe('saved settings from older versions', () => {
  test('old "Geometry Test" title and default instructions are cleared', async () => {
    const s = await page.evaluate(() => window.__tb.normalize({ course: 'Geometry', settings: { title: 'Geometry Test', style: 'standard', instructions: 'Read each question carefully.' }, questions: [] }).settings);
    assert.equal(s.docType, 'test'); assert.equal(s.title, ''); assert.equal(s.style, 'classic'); assert.equal(s.instructions, '');
  });
  test('quarter, unit and quiz are read from an old title', async () => {
    const s = await page.evaluate(() => window.__tb.normalize({ course: 'Geometry', settings: { title: 'Quarter 1 – Unit 3 Quiz' }, questions: [] }).settings);
    assert.deepEqual([s.docType, s.quarter, s.unitNum], ['quiz', '1', '3']);
  });
  test('turning off the old lesson pictures switch turns off all three', async () => {
    const s = await page.evaluate(() => window.__tb.normalize({ course: 'Geometry', settings: { lessonIcons: false }, questions: [] }).settings);
    assert.deepEqual([s.toolCompass, s.toolRuler, s.toolTrace], [false, false, false]);
  });
  test('normalize fills in missing pieces and keeps questions', async () => {
    const st = await page.evaluate(() => window.__tb.normalize({ questions: [{ id: 'x', html: 'Q', type: 'mc', choices: ['a', 'b'], answer: 0 }] }));
    assert.equal(st.questions.length, 1);
    assert.ok(Array.isArray(st.courses) && st.courses.length >= 4);
    assert.ok(st.settings && typeof st.settings.roles === 'object');
  });
});

test('no page errors', () => assert.deepEqual(errors, []));
