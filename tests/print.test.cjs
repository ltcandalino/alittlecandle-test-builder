// Prints every document type and its answer keys to PDF in tests/out/ so the layout can be looked at.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { launch, openApp, addQuestions, select, settings, OUT, ROOT } = require('./helpers.cjs');

let browser, page, errors, ids;
before(async () => {
  browser = await launch();
  ({ page, errors } = await openApp(browser));
  const slope = 'Find the slope of the line through (1, 2) and (3, 6).';
  ids = await addQuestions(page, [
    ...[1, 2, 3, 4, 5, 6].map(i => ({ type: 'mc', html: 'Question ' + i + ': ' + slope, choices: ['1', '2', '3', '4'], answer: 1, ref: '0624' + String(i).padStart(2, '0'), source: 'Regents' })),
    { type: 'es', html: 'Prove that the diagonals of a rectangle are congruent.', space: 2, points: 4 },
    { type: 'sa', html: 'Solve for x: 2x + 3 = 11.', points: 2, answer: 'x = 4' },
    { type: 'es', html: 'Bonus: construct an equilateral triangle.', space: 2, points: 4 },
  ]);
  await select(page, ids);
});
after(async () => { await browser.close(); });

const css = fs.readFileSync(path.join(ROOT, 'src', 'style.css'), 'utf8');

for (const dt of ['test', 'quiz', 'review', 'lesson']) {
  test(dt + ' prints to PDF', async () => {
    await settings(page, {
      docType: dt, headerText: 'Geometry', quarter: '1', unitNum: '3', sectionNum: '4', week: '3', day: '12',
      teacher: 'Ms. Candalino', calc: 'Desmos', time: '1.5', topic: 'Linear Equations', target: 'find the slope of a line',
      ecTopic: 'Slope', ecDef: 'Slope is rise over run: m = (y2 − y1) / (x2 − x1).', success: 'I can find slope\nI can graph a line',
      versions: 2, perVersion: true, roles: { [ids[0]]: 'warmup', [ids[1]]: 'example', [ids[2]]: 'example' },
      concepts: { [ids[1]]: 'From two points' }, bonus: dt === 'test' ? { [ids[8]]: true } : {},
    });
    const jobs = await page.evaluate(() => window.__tb.printJobs('both'));
    assert.equal(jobs.length, 3);
    for (let j = 0; j < jobs.length; j++) {
      const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + css + '#printRoot{display:block}</style><style>' + jobs[j].css +
        '</style></head><body><div id="printRoot">' + jobs[j].html +
        (jobs[j].imgs || []).map(u => '<img class="pre-img" src="' + u.replace(/"/g, '&quot;') + '">').join('') + '</div></body></html>';
      const name = dt + '-' + ['version-A', 'version-B', 'answer-keys'][j];
      const file = path.join(OUT, name + '.html');
      fs.writeFileSync(file, html);
      const p = await browser.newPage();
      const perr = []; p.on('pageerror', e => perr.push(e.message));
      await p.goto('file://' + file);
      await p.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
      await p.waitForTimeout(300);
      const pdf = await p.pdf({ path: path.join(OUT, name + '.pdf'), preferCSSPageSize: true });
      await p.close();
      assert.deepEqual(perr, []);
      assert.ok(pdf.length > 5000, name + ' PDF is too small');
    }
  });
}

test('no page errors', () => assert.deepEqual(errors, []));
