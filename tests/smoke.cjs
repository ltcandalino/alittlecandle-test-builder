// Smoke test: opens the built single-file app in Chromium, adds sample questions,
// renders every document type (and answer keys) to PDF, and fails on any page error.
//   npm install && npx playwright install chromium   (once)
//   python3 build.py && npm test
// PDFs are written to tests/out/ so you can look at them.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const APP = 'file://' + path.join(ROOT, 'ALittleCandleTestBuilder.html');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(APP);
  await page.waitForFunction(() => window.__tb);

  await page.evaluate(() => {
    const T = window.__tb, st = T.state;
    const mk = (type, i, extra) => Object.assign({
      id: T.uid(), course: st.course, bank: 'Smoke', source: 'Smoke Test', type, points: type === 'mc' ? 2 : 4,
      unit: '3', topic: 'Lines', ref: '0624' + String(i).padStart(2, '0'),
      html: 'Sample question ' + i + ': find the slope of the line through (1, 2) and (3, 6).',
      choices: type === 'mc' ? ['1', '2', '3', '4'] : [], answer: type === 'mc' ? 1 : 'm = 2',
    }, extra || {});
    for (let i = 1; i <= 6; i++) st.questions.push(mk('mc', i));
    for (let i = 7; i <= 9; i++) st.questions.push(mk('es', i, { space: 2 }));
    T.state = T.normalize(st);
    T.state.selected = T.state.questions.map(q => q.id);
  });

  const docs = ['test', 'quiz', 'review', 'lesson'];
  for (const dt of docs) {
    await page.evaluate(dt => {
      const st = window.__tb.state, qs = st.questions;
      Object.assign(st.settings, {
        docType: dt, headerText: 'Geometry', quarter: '1', unitNum: '3', sectionNum: '4', week: '3', day: '12',
        teacher: 'Teacher', calc: 'Desmos', time: '1.5', topic: 'Linear Equations', target: 'find slope',
        ecTopic: 'Slope', ecDef: 'rise over run', success: 'I can find slope', versions: 2,
        roles: {}, concepts: {}, bonus: {},
      });
      if (dt === 'lesson') { st.settings.roles[qs[0].id] = 'warmup'; st.settings.roles[qs[1].id] = 'example'; st.settings.concepts[qs[1].id] = 'Two points'; }
      if (dt === 'test') st.settings.bonus[qs[8].id] = true;
    }, dt);
    const jobs = await page.evaluate(() => window.__tb.printJobs('both'));
    if (!jobs.length) throw new Error(dt + ': no print jobs');
    const css = fs.readFileSync(path.join(ROOT, 'src', 'style.css'), 'utf8');
    for (let j = 0; j < jobs.length; j++) {
      const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + css +
        '#printRoot{display:block}</style><style>' + jobs[j].css + '</style></head><body><div id="printRoot">' +
        jobs[j].html + (jobs[j].imgs || []).map(u => '<img class="pre-img" src="' + u.replace(/"/g, '&quot;') + '">').join('') +
        '</div></body></html>';
      const file = path.join(OUT, dt + '-' + (j + 1) + '.html');
      fs.writeFileSync(file, html);
      const p2 = await browser.newPage();
      p2.on('pageerror', e => errors.push(dt + ': ' + e.message));
      await p2.goto('file://' + file);
      await p2.waitForTimeout(800);
      await p2.pdf({ path: file.replace(/\.html$/, '.pdf'), preferCSSPageSize: true });
      await p2.close();
    }
    console.log('ok', dt, jobs.length, 'print job(s)');
  }

  // The Build tab renders for every document type
  for (const dt of docs) {
    await page.evaluate(dt => { window.__tb.state.settings.docType = dt; window.__tb.ui().tab = 'build'; window.__tb.render(); }, dt);
    await page.waitForTimeout(300);
    if (!(await page.$('#paper .pv-head'))) throw new Error(dt + ': preview header missing');
  }

  await browser.close();
  if (errors.length) { console.error('Page errors:\n' + errors.join('\n')); process.exit(1); }
  console.log('All smoke tests passed. PDFs in tests/out/');
})().catch(e => { console.error(e); process.exit(1); });
