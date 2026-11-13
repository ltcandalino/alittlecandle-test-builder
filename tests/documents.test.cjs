// Building documents: versions, scrambling, parts, bonus, Test/Quiz/Review/Lesson layouts, answer keys, print jobs.
const { test, describe, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { launch, openApp, addQuestions, select, settings, fn } = require('./helpers.cjs');

let browser, ctx, page, errors, ids;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });
beforeEach(async () => {
  if (ctx) { assert.deepEqual(errors, [], 'page errors in previous test'); await ctx.close(); }
  ({ context: ctx, page, errors } = await openApp(browser));
  ids = await addQuestions(page, [
    { type: 'mc', html: 'MC one', choices: ['w', 'x', 'y', 'z'], answer: 2 },
    { type: 'mc', html: 'MC two', choices: ['p', 'q', 'All of the above'], answer: 2 },
    { type: 'mc', html: 'MC three', choices: ['1', '2', '3', '4'], answer: 0, lockChoices: true },
    { type: 'tf', html: 'TF four', answer: 'F' },
    { type: 'sa', html: 'SA five', points: 2, answer: '12' },
    { type: 'es', html: 'ES six', points: 4, answer: 'proof', source: 'Regents', ref: '062412' },
    { type: 'bm', html: 'BM seven', choices: ['a', 'b', 'c', 'd'], answer: 3, points: 2 },
  ]);
  await select(page, ids);
  await settings(page, { headerText: 'Geometry', versions: 2, shuffleQ: true, shuffleC: true, keepA: false, group: true, seed: 12345,
    quarter: '1', unitNum: '3', sectionNum: '4', topic: 'Lines', teacher: 'Ms. C', calc: 'Desmos', time: '1.5', roles: {}, concepts: {}, bonus: {} });
});

const version = (v) => page.evaluate(v => window.__tb.fn.buildVersion(v).map(it => ({
  id: it.q.id, html: it.q.html, pk: it.pk, bonus: !!it.bonus, open: !!it.open, choices: it.choices, answer: it.answer,
})), v);
const html = (v = 0, answers = false) => page.evaluate(([v, a]) => window.__tb.fn.testHtml(window.__tb.fn.buildVersion(v), v, { answers: a }), [v, answers]);
const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');

describe('versions and scrambling', () => {
  test('a version is the same every time it is built', async () => {
    assert.deepEqual(await version(1), await version(1));
  });
  test('New scramble (new seed) changes the order', async () => {
    const a = await version(1); await settings(page, { seed: 999 });
    assert.notDeepEqual(a.map(x => x.id + x.choices), (await version(1)).map(x => x.id + x.choices));
  });
  test('Keep Version A in the original order', async () => {
    await settings(page, { keepA: true, group: false });
    const a = await version(0);
    assert.deepEqual(a.map(x => x.id), ids);
    assert.deepEqual(a[0].choices, ['w', 'x', 'y', 'z']);
  });
  test('no shuffling keeps the picked order', async () => {
    await settings(page, { shuffleQ: false, shuffleC: false, group: false });
    assert.deepEqual((await version(1)).map(x => x.id), ids);
  });
  test('the correct answer follows its choice when choices are shuffled', async () => {
    for (let v = 0; v < 2; v++) for (const it of await version(v)) {
      if (!it.choices || it.open) continue;
      const orig = { 'MC one': 'y', 'MC two': 'All of the above', 'MC three': '1', 'BM seven': 'd' }[it.html];
      if (orig) assert.equal(it.choices[it.answer], orig, it.html);
    }
  });
  test('"All of the above" stays last', async () => {
    for (const s of [1, 2, 3, 4, 5]) {
      await settings(page, { seed: s });
      const it = (await version(1)).find(x => x.html === 'MC two');
      assert.equal(it.choices[it.choices.length - 1], 'All of the above');
    }
  });
  test('locked choices never move', async () => {
    for (const s of [1, 2, 3]) {
      await settings(page, { seed: s });
      assert.deepEqual((await version(1)).find(x => x.html === 'MC three').choices, ['1', '2', '3', '4']);
    }
  });
  test('number of versions', async () => {
    await settings(page, { versions: 4 });
    assert.equal(await fn(page, 'nVersions'), 4);
  });
});

describe('Test and Quiz', () => {
  test('parts: multiple choice first, then open response; each part keeps its questions together', async () => {
    const v = await version(1);
    const kinds = v.map(x => x.pk);
    const seen = []; for (const k of kinds) if (seen[seen.length - 1] !== k) seen.push(k);
    assert.equal(new Set(seen).size, seen.length, 'a part is split up: ' + kinds.join(','));
    assert.ok(v.findIndex(x => x.html === 'ES six') > v.findIndex(x => x.html === 'MC one'));
  });
  test('explicit Part labels set the order', async () => {
    await page.evaluate(() => { const qs = window.__tb.state.questions; qs.forEach((q, i) => { q.part = i < 3 ? 'Part II' : 'Part I'; }); });
    const v = await version(1);
    assert.ok(v.slice(0, 4).every(x => x.pk === 'Part I'), v.map(x => x.pk).join(','));
  });
  test('first page: title, unit title, teacher, calculator, time', async () => {
    const t = text(await html(0));
    assert.match(t, /Name:/); assert.match(t, /Quarter 1 – Unit 3 Exam/); assert.match(t, /Lines/);
    assert.match(t, /Ms\. C/); assert.match(t, /Desmos/); assert.match(t, /1\.5× extended time/);
  });
  test('typed title line replaces the automatic one', async () => {
    await settings(page, { title: 'Midterm Exam' });
    assert.match(text(await html(0)), /Midterm Exam/);
  });
  test('Quiz says Quiz', async () => {
    await settings(page, { docType: 'quiz' });
    assert.match(text(await html(0)), /Quarter 1 – Unit 3 Quiz/);
  });
  test('part directions with totals, credits, computation box, score box', async () => {
    const h = await html(0), t = text(h);
    assert.match(t, /Part I\b/); assert.match(t, /Part II\b/);
    const total = 2 + 2 + 2 + 2 + 2 + 4 + 2;
    assert.match(t, new RegExp('/' + total));
    assert.match(h, /cl-comp/);
    assert.match(h, /cl-cred">\[4\]/);
  });
  test('bonus questions go last, numbered from 1, and are not in the score', async () => {
    await settings(page, { bonus: { [ids[5]]: true } });
    const v = await version(1);
    assert.equal(v[v.length - 1].id, ids[5]); assert.equal(v[v.length - 1].bonus, true);
    const t = text(await html(1));
    assert.match(t, /Bonus 1\. ES six/);
    assert.match(t, /\/12\b/, 'score box should leave out the 4-point bonus (16 - 4)');
    const key = await page.evaluate(() => window.__tb.fn.keyHtml(window.__tb.fn.buildVersion(1), 1));
    assert.match(key, /Bonus 1/);
  });
  test('bimodal: with choices, without choices, and one-question override', async () => {
    let it = (await version(0)).find(x => x.html === 'BM seven');
    assert.equal(it.open, false);
    await settings(page, { bmMode: 'without' });
    it = (await version(0)).find(x => x.html === 'BM seven');
    assert.equal(it.open, true);
    await settings(page, { bmOverride: { [ids[6]]: 'with' } });
    it = (await version(0)).find(x => x.html === 'BM seven');
    assert.equal(it.open, false);
  });
  test('header picture has the course name; first page is bold', async () => {
    const h = await page.evaluate(() => window.__tb.fn.headers());
    assert.match(h.first.svg, />Geometry</); assert.match(h.first.svg, /font-weight="bold"/);
    assert.match(h.rest.svg, />Geometry</); assert.doesNotMatch(h.rest.svg, /font-weight="bold"/);
  });
  test('course name falls back to the course', async () => {
    await settings(page, { headerText: '' });
    assert.equal(await fn(page, 'headerText'), await page.evaluate(() => window.__tb.state.course));
  });
});

describe('Review', () => {
  beforeEach(async () => { await settings(page, { docType: 'review', reviewSpace: '1' }); });
  test('title, open questions first, then multiple choice', async () => {
    const v = await version(1);
    const firstMc = v.findIndex(x => x.pk === 'mc');
    assert.ok(v.slice(0, firstMc).every(x => x.pk === 'open') && v.slice(firstMc).every(x => x.pk === 'mc'), v.map(x => x.pk).join(','));
    const h = await html(0), t = text(h);
    assert.match(t, /Geometry Unit 3 Review/);
    assert.match(t, /Short\/Extended Response Questions/); assert.match(t, /Multiple Choice Questions/);
    assert.match(h, /rv-h mc/);
  });
  test('references in small gray type, and they can be turned off', async () => {
    assert.match(await html(0), /rv-ref">Regents June 2024 #12/);
    await settings(page, { showRef: false });
    assert.doesNotMatch(await html(0), /rv-ref/);
  });
  test('work space setting', async () => {
    const saRow = h => h.split('<tr').find(r => r.includes('SA five'));
    assert.match(saRow(await html(0)), /pt-space" style="height:1in/);
    await settings(page, { reviewSpace: '3' });
    assert.match(saRow(await html(0)), /pt-space" style="height:3in/);
    await settings(page, { reviewSpace: '0' });
    assert.doesNotMatch(saRow(await html(0)), /pt-space|pt-lines/);
    await settings(page, { reviewSpace: '' });
    assert.match(saRow(await html(0)), /pt-lines/, 'each question’s own setting: SA uses its answer lines');
  });
  test('pages 2+ header says Unit 3 Review in italics', async () => {
    const h = await page.evaluate(() => window.__tb.fn.headers());
    assert.match(h.rest.svg, /font-style="italic">Unit 3 Review</);
  });
});

describe('Lesson', () => {
  beforeEach(async () => {
    await settings(page, { docType: 'lesson', week: '3', day: '12', target: 'find slope', ecTopic: 'Slope', ecDef: 'rise over run',
      lessonNotes: 'Remember the formula', success: 'I can find slope\nI can graph a line',
      roles: { [ids[0]]: 'warmup', [ids[1]]: 'example', [ids[2]]: 'example' }, concepts: { [ids[1]]: 'Two points' } });
  });
  test('sections in order: Warm Up, Notes, Essential Concept, Examples, Success Criteria, Practice', async () => {
    const t = text(await html(0));
    const order = ['I am learning to', 'Warm Up!', 'Notes', 'Essential Concept', 'Example 1', 'Example 2', 'Success Criteria', 'Practice'];
    let last = -1;
    for (const w of order) { const i = t.indexOf(w); assert.ok(i > last, w + ' is out of order'); last = i; }
    assert.match(t, /find slope/); assert.match(t, /Slope rise over run/); assert.match(t, /Example 1 Two points/);
    assert.match(t, /I can find slope/); assert.match(t, /Remember the formula/);
  });
  test('practice is numbered from 1; warm up and examples are not', async () => {
    const v = await page.evaluate(() => window.__tb.fn.labelItems(window.__tb.fn.buildVersion(0)).map(x => [x.pk, x.num, x.keyLabel]));
    assert.deepEqual(v.filter(x => x[0] === 'practice').map(x => x[1]), ['1.', '2.', '3.', '4.']);
    assert.deepEqual(v.filter(x => x[0] !== 'practice').map(x => x[2]), ['Warm Up', 'Example 1', 'Example 2']);
  });
  test('unit-section label is 3-4', async () => {
    assert.equal(await fn(page, 'rightLabel'), '3-4');
    await settings(page, { sectionNum: '' }); assert.equal(await fn(page, 'rightLabel'), '3');
    await settings(page, { unitNum: '' }); assert.equal(await fn(page, 'rightLabel'), '');
  });
  test('footer code and source', async () => {
    assert.equal(await fn(page, 'lessonCode'), 'Q1W03D012');
    assert.equal(await fn(page, 'lessonSource'), 'Test source, Regents');
    await settings(page, { lessonSource: 'Big Ideas' });
    assert.equal(await fn(page, 'lessonSource'), 'Big Ideas');
    const f = await fn(page, 'lessonFootSvg');
    assert.match(f.svg, /Q1W03D012/); assert.match(f.svg, /Source<\/tspan>: Big Ideas/);
  });
  test('compass, ruler and tracing paper can each be turned off', async () => {
    const count = () => page.evaluate(() => (window.__tb.fn.headers().first.svg.match(/<image /g) || []).length);
    assert.equal(await count(), 3);
    await settings(page, { toolRuler: false }); assert.equal(await count(), 2);
    assert.deepEqual(await fn(page, 'lessonTools'), ['compass', 'trace']);
    await settings(page, { toolCompass: false, toolTrace: false }); assert.equal(await count(), 0);
  });
  test('lesson pages use narrower margins', async () => {
    assert.deepEqual(await fn(page, 'pageGeom'), { m: '.8in .5in', w: 540 });
  });
});

describe('answer keys', () => {
  test('lists the right answer for each question in that version', async () => {
    await settings(page, { labels: 'upper' });
    const r = await page.evaluate(() => { const f = window.__tb.fn, items = f.buildVersion(1); return { key: f.keyHtml(items, 1), items: items.map(it => ({ html: it.q.html, answer: it.answer, choices: it.choices })) }; });
    const t = text(r.key);
    assert.match(t, /Answer Key — Version B/);
    const mc1 = r.items.find(x => x.html === 'MC one');
    assert.ok(t.includes('BCDE'[0]) && mc1.choices[mc1.answer] === 'y');
    assert.match(t, /F/); assert.match(t, /12/);
  });
  test('notes appear on the key only when turned on, never on the test', async () => {
    await page.evaluate(() => { window.__tb.state.questions[0].notes = 'SECRET-NOTE'; });
    await settings(page, { keyNotes: true });
    const key = await page.evaluate(() => window.__tb.fn.keyHtml(window.__tb.fn.buildVersion(0), 0));
    assert.match(key, /SECRET-NOTE/);
    assert.doesNotMatch(await html(0), /SECRET-NOTE/);
    await settings(page, { keyNotes: false });
    assert.doesNotMatch(await page.evaluate(() => window.__tb.fn.keyHtml(window.__tb.fn.buildVersion(0), 0)), /SECRET-NOTE/);
  });
});

describe('print jobs', () => {
  test('each version separately: one job per version plus one for the keys', async () => {
    await settings(page, { perVersion: true, versions: 3 });
    assert.equal((await fn(page, 'printJobs', 'both')).length, 4);
    assert.equal((await fn(page, 'printJobs', 'tests')).length, 3);
    assert.equal((await fn(page, 'printJobs', 'keys')).length, 1);
  });
  test('all versions together: one job plus keys', async () => {
    await settings(page, { perVersion: false, versions: 3 });
    assert.equal((await fn(page, 'printJobs', 'both')).length, 2);
  });
  test('every document type makes headers in the page margins', async () => {
    for (const dt of ['test', 'quiz', 'review', 'lesson']) {
      await settings(page, { docType: dt });
      const [job] = await fn(page, 'printJobs', 'tests');
      assert.match(job.css, /@top-center\{content:url\("data:image\/svg\+xml/, dt);
      assert.match(job.css, /:first\{/, dt);
      assert.ok(job.imgs && job.imgs.length >= 2, dt + ' header images are preloaded');
      assert.match(job.html, new RegExp('pt-' + dt));
    }
  });
  test('test footer shows the version on the first page', async () => {
    const [job] = await fn(page, 'printJobs', 'tests');
    assert.match(job.css, /"v\. 1"/);
  });
});

describe('courses', () => {
  test('each course keeps its own settings and questions', async () => {
    const r = await page.evaluate(() => {
      const T = window.__tb, f = T.fn, start = T.state.course;
      T.state.settings.unitNum = '7';
      const other = T.state.courses.find(c => c !== start);
      f.switchCourse(other);
      const there = { course: T.state.course, unit: T.state.settings.unitNum, selected: T.state.selected.length };
      T.state.settings.unitNum = '2';
      f.switchCourse(start);
      return { start, there, back: { course: T.state.course, unit: T.state.settings.unitNum, selected: T.state.selected.length } };
    });
    assert.equal(r.there.unit, ''); assert.equal(r.there.selected, 0);
    assert.equal(r.back.course, r.start); assert.equal(r.back.unit, '7'); assert.equal(r.back.selected, 7);
  });
});

test('no page errors (last test)', () => assert.deepEqual(errors, []));
