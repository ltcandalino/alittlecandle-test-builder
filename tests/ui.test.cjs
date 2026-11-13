// Clicking through the app like a teacher would: tabs, editing, deleting, importing, backups, courses, printing.
const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { launch, openApp, addQuestions, select, settings, gotoTab, FIX, OUT, privateFixtures } = require('./helpers.cjs');

let browser, ctx, page, errors;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });
beforeEach(async () => { ({ context: ctx, page, errors } = await openApp(browser)); });
afterEach(async () => { const e = errors.slice(); await ctx.close(); assert.deepEqual(e, [], 'page errors'); });

const count = () => page.evaluate(() => window.__tb.state.questions.filter(q => q.course === window.__tb.state.course).length);
const tab = async name => { await page.click(`#tabs [data-tab="${name}"]`); await page.waitForTimeout(100); };

describe('tabs', () => {
  test('the browser tab shows the candle icon, and so does the header', async () => {
    const ok = await page.evaluate(async () => {
      const img = new Image(); img.src = document.querySelector('link[rel=icon]').href;
      try { await img.decode(); } catch (e) { return false; }
      return img.naturalWidth > 0;
    });
    assert.equal(ok, true, 'favicon loads as an image');
    assert.equal(await page.evaluate(() => !!document.querySelector('.brand .mark svg')), true);
  });
  test('all three tabs open', async () => {
    await addQuestions(page, [{}, { type: 'es' }]);
    await gotoTab(page, 'bank');
    for (const t of ['build', 'io', 'bank']) {
      await tab(t);
      assert.ok(await page.$(`#tabs [data-tab="${t}"].on`), t + ' is highlighted');
    }
    assert.equal(await page.$$eval('#qlist .qcard', x => x.length), 2);
  });
  test('the version number shows next to the name', async () => {
    const v = fs.readFileSync(path.join(__dirname, '..', 'VERSION'), 'utf8').trim();
    assert.equal(await page.textContent('.brand .ver'), 'v' + v);
  });
});

describe('question editor', () => {
  test('the question box comes first; More details opens when a question has them', async () => {
    const [plainQ, tagged] = await addQuestions(page, [{ html: 'Plain', bank: 'My questions', topic: '', source: '' }, { html: 'Tagged', ref: '061924', bank: 'My questions', topic: '', source: '' }]);
    await gotoTab(page, 'bank');
    await page.click('#newQ');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'e-text', 'cursor starts in the question box');
    assert.ok(!(await page.isVisible('#e-ref')), 'details folded for a new question');
    await page.keyboard.press('Escape');
    await page.click(`[data-edit="${tagged}"]`);
    assert.ok(await page.isVisible('#e-ref'), 'details open when the question has some');
    assert.equal(await page.evaluate(() => { const s = getSelection(); return s.anchorOffset === s.anchorNode.textContent.length || s.anchorNode.id === 'e-text'; }), true, 'cursor at the end');
    await page.keyboard.press('Escape');
    await page.click(`[data-edit="${plainQ}"]`);
    assert.ok(!(await page.isVisible('#e-ref')));
  });
  test('closing without changes needs no question', async () => {
    const [id] = await addQuestions(page, [{ html: 'Leave me' }]);
    await gotoTab(page, 'bank');
    await page.click(`[data-edit="${id}"]`);
    await page.keyboard.press('Escape');
    assert.equal(await page.$('#ov') === null, true, 'editor closed');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.edit), id, 'focus goes back to Edit');
  });
  test('Escape, Cancel or a click outside asks before throwing away edits', async () => {
    const [id] = await addQuestions(page, [{ html: 'Original text' }]);
    await gotoTab(page, 'bank');
    await page.click(`[data-edit="${id}"]`);
    await page.click('#e-text'); await page.keyboard.type(' plus my edit');
    await page.keyboard.press('Escape');
    assert.ok(await page.isVisible('#e-confirm'), 'Escape shows the question');
    await page.click('#e-keep');
    assert.ok(!(await page.isVisible('#e-confirm')) && (await page.$('#ov')) !== null, 'Keep editing stays open');
    await page.mouse.click(5, 5);
    assert.ok(await page.isVisible('#e-confirm'), 'clicking outside shows the question');
    await page.keyboard.press('Escape');
    assert.ok(!(await page.isVisible('#e-confirm')) && (await page.$('#ov')) !== null, 'Escape on the question keeps editing');
    await page.click('#e-cancel');
    await page.click('#e-discard');
    assert.equal(await page.$('#ov') === null, true, 'editor closed');
    assert.equal(await page.evaluate(id => window.__tb.state.questions.find(q => q.id === id).html, id), 'Original text');
  });
  test('write a new multiple-choice question', async () => {
    await gotoTab(page, 'bank');
    await page.click('#newQ');
    await page.click('#e-text'); await page.keyboard.type('What is 5 + 5?');
    for (const [i, t] of ['8', '9', '10', '11'].entries()) { await page.click(`[data-ct="${i}"]`); await page.keyboard.type(t); }
    await page.check('[data-ci="2"]');
    await page.fill('#e-unit', '4');
    await page.click('#e-save');
    await page.waitForTimeout(100);
    const q = await page.evaluate(() => window.__tb.state.questions[0]);
    assert.equal(q.html, 'What is 5 + 5?'); assert.deepEqual(q.choices, ['8', '9', '10', '11']); assert.equal(q.answer, 2); assert.equal(q.unit, '4');
  });
  test('the editor refuses an empty question', async () => {
    await gotoTab(page, 'bank');
    await page.click('#newQ'); await page.click('#e-save');
    assert.match(await page.textContent('#e-err'), /Type the question/);
    assert.equal(await count(), 0);
  });
  test('reference fills month, year and question #', async () => {
    await gotoTab(page, 'bank');
    await page.click('#newQ');
    await page.click('#e-text'); await page.keyboard.type('Ref question');
    await page.click('#e-moreD summary');
    await page.fill('#e-ref', '062412'); await page.dispatchEvent('#e-ref', 'input');
    if (await page.$('#e-fromref')) await page.click('#e-fromref');
    await page.click('[data-ct="0"]'); await page.keyboard.type('a'); await page.click('[data-ct="1"]'); await page.keyboard.type('b'); await page.check('[data-ci="0"]');
    await page.click('#e-save');
    const q = await page.evaluate(() => window.__tb.state.questions[0]);
    assert.deepEqual([q.ref, String(q.month), String(q.year), String(q.qnum)], ['062412', '06', '2024', '12']);
  });
  test('edit an existing question', async () => {
    const [id] = await addQuestions(page, [{ html: 'Old text' }]);
    await gotoTab(page, 'bank');
    await page.click(`[data-edit="${id}"]`);
    await page.evaluate(() => { document.querySelector('#e-text').innerHTML = 'New text'; });
    await page.click('#e-save');
    assert.equal(await page.evaluate(() => window.__tb.state.questions[0].html), 'New text');
  });
  test('copy a question', async () => {
    const [id] = await addQuestions(page, [{ html: 'Copy me' }]);
    await gotoTab(page, 'bank');
    await page.click(`[data-dup="${id}"]`);
    await page.waitForTimeout(100);
    if (await page.$('#e-save')) await page.click('#e-save');
    assert.equal(await count(), 2);
  });
  test('delete asks to confirm, then Undo brings it back', async () => {
    const [id] = await addQuestions(page, [{ html: 'Delete me' }, { html: 'Keep me' }]);
    await gotoTab(page, 'bank');
    await page.click(`[data-del="${id}"]`);
    assert.equal(await count(), 2, 'first click only asks to confirm');
    assert.equal(await page.textContent(`[data-del="${id}"]`), 'Confirm');
    await page.click(`[data-del="${id}"]`);
    await page.waitForTimeout(100);
    assert.equal(await count(), 1);
    await page.click('#toastUndo');
    assert.equal(await count(), 2);
  });
  test('search filters the list', async () => {
    await addQuestions(page, [{ html: 'Pythagorean theorem' }, { html: 'Slope of a line' }]);
    await gotoTab(page, 'bank');
    await page.fill('#fq', 'slope'); await page.dispatchEvent('#fq', 'input'); await page.waitForTimeout(400);
    const shown = await page.$$eval('#qlist .qcard', x => x.map(e => e.textContent));
    assert.equal(shown.length, 1); assert.match(shown[0], /Slope/);
  });
});

describe('building', () => {
  test('pick questions in the bank, then reorder and remove them on Build & print', async () => {
    const ids = await addQuestions(page, [{ html: 'One' }, { html: 'Two' }, { html: 'Three' }]);
    await gotoTab(page, 'bank');
    for (const id of ids) await page.check(`[data-pick="${id}"]`);
    assert.deepEqual(await page.evaluate(() => window.__tb.state.selected), ids);
    await tab('build');
    assert.equal(await page.$$eval('#selList li', x => x.length), 3);
    await page.click(`#selList [data-rm="${ids[1]}"]`);
    assert.deepEqual(await page.evaluate(() => window.__tb.state.selected), [ids[0], ids[2]]);
  });
  test('document type buttons switch the layout and the preview', async () => {
    const ids = await addQuestions(page, [{ html: 'One' }, { type: 'es', html: 'Two' }]);
    await select(page, ids);
    await gotoTab(page, 'build');
    for (const dt of ['quiz', 'review', 'lesson', 'test']) {
      await page.click(`[data-doctype="${dt}"]`);
      await page.waitForTimeout(450);
      assert.equal(await page.evaluate(() => window.__tb.state.settings.docType), dt);
      assert.ok(await page.$(`#paper.pt-${dt}`), dt + ' preview');
      assert.ok(await page.$('#paper .pv-head img'), dt + ' header in preview');
    }
  });
  test('typing the unit number updates the automatic title', async () => {
    await gotoTab(page, 'build');
    await page.fill('[data-set="quarter"]', '2'); await page.fill('[data-set="unitNum"]', '6');
    assert.equal(await page.getAttribute('[data-set="title"]', 'placeholder'), 'auto: Quarter 2 – Unit 6 Exam');
  });
  test('lesson roles and bonus buttons', async () => {
    const ids = await addQuestions(page, [{ html: 'One' }, { html: 'Two' }]);
    await select(page, ids);
    await gotoTab(page, 'build');
    await page.click(`[data-bonus="${ids[1]}"]`);
    assert.equal(await page.evaluate(id => window.__tb.state.settings.bonus[id], ids[1]), true);
    await page.click('[data-doctype="lesson"]');
    await page.selectOption(`[data-role="${ids[0]}"]`, 'example');
    await page.fill(`[data-exc="${ids[0]}"]`, 'SAS');
    const s = await page.evaluate(() => window.__tb.state.settings);
    assert.equal(s.roles[ids[0]], 'example'); assert.equal(s.concepts[ids[0]], 'SAS');
  });
  test('Students need checkboxes', async () => {
    await gotoTab(page, 'build');
    await page.click('[data-doctype="lesson"]');
    await page.uncheck('[data-set="toolRuler"]');
    assert.equal(await page.evaluate(() => window.__tb.state.settings.toolRuler), false);
  });
  test('printing runs one print window per version and fills the print area', async () => {
    const ids = await addQuestions(page, [{ html: 'One' }, { html: 'Two' }]);
    await select(page, ids);
    await settings(page, { versions: 2, perVersion: true });
    await page.evaluate(() => { window.__prints = []; window.print = () => { window.__prints.push(document.querySelector('#printRoot').innerHTML.length); setTimeout(() => window.dispatchEvent(new Event('afterprint')), 10); }; });
    await gotoTab(page, 'build');
    await page.click('[data-print="both"]');
    await page.waitForFunction(() => window.__prints.length >= 3, null, { timeout: 15000 });
    const p = await page.evaluate(() => window.__prints);
    assert.equal(p.length, 3, 'version A, version B, answer keys');
    assert.ok(p.every(n => n > 500));
  });
});

describe('importing', () => {
  test('paste questions', async () => {
    await gotoTab(page, 'io');
    await page.fill('#pasteBox', '1. Which?\nA. one\n*B. two\n\n2. The sun is a star.\nAnswer: True');
    await page.click('#pasteGo');
    assert.equal(await count(), 2);
  });
  test('Word file: review screen, then add', async () => {
    await gotoTab(page, 'io');
    await page.setInputFiles('#docxFile', path.join(FIX, 'sample-exam.docx'));
    await page.waitForSelector('#wAdd:not([disabled])', { timeout: 15000 });
    await page.click('#wAdd');
    await page.waitForTimeout(300);
    assert.equal(await count(), 3);
    const qs = await page.evaluate(() => window.__tb.state.questions.map(q => [q.type, q.part, q.points]));
    assert.deepEqual(qs, [['mc', 'Part I', 2], ['mc', 'Part I', 2], ['es', 'Part II', 4]]);
  });
  test('PDF: review screen, then add', async () => {
    await gotoTab(page, 'io');
    await page.setInputFiles('#pdfFile', path.join(FIX, 'sample-questions.pdf'));
    await page.waitForSelector('#impAdd:not([disabled])', { timeout: 30000 });
    await page.click('#impAdd');
    await page.waitForTimeout(300);
    assert.equal(await count(), 4);
    const q = await page.evaluate(() => window.__tb.state.questions[0]);
    assert.equal(q.source !== undefined, true);
  });
  for (const file of privateFixtures('.bnk')) test('ExamView bank ' + path.basename(file), async () => {
    await gotoTab(page, 'io');
    await page.setInputFiles('#bnkFile', file);
    await page.waitForFunction(() => window.__tb.state.questions.length > 0, null, { timeout: 30000 });
    assert.ok(await page.evaluate(() => window.__tb.state.questions.length) > 0);
  });
  for (const file of privateFixtures('.docx')) test('Word exam ' + path.basename(file), async () => {
    await gotoTab(page, 'io');
    await page.setInputFiles('#docxFile', file);
    await page.waitForSelector('#wAdd:not([disabled])', { timeout: 30000 });
    await page.click('#wAdd');
    await page.waitForTimeout(300);
    assert.ok(await count() > 0);
  });
});

describe('build and print layout', () => {
  test('the preview comes before the Print buttons, with a live summary', async () => {
    const ids = await addQuestions(page, [{ html: 'One' }, { html: 'Two', type: 'es' }]);
    await select(page, ids.slice(0, 1)); await settings(page, { versions: 3 });
    await gotoTab(page, 'build');
    const order = await page.evaluate(() => {
      const y = el => el.getBoundingClientRect().top + window.scrollY;
      return { paper: y(document.querySelector('#paper')), print: y(document.querySelector('[data-print="both"]')) };
    });
    assert.ok(order.paper < order.print, 'paper preview is above the Print buttons');
    assert.equal(await page.textContent('#pbSum'), '3 versions · 1 question · 2 points');
    await page.evaluate(id => window.__tb.state.selected.push(id), ids[1]); await gotoTab(page, 'build');
    assert.equal(await page.textContent('#pbSum'), '3 versions · 2 questions · 6 points');
    await page.click('#selList [data-rm]');
    assert.match(await page.textContent('#pbSum'), /1 question ·/);
  });
});

describe('saving and backups', () => {
  test('questions are still there after reloading the page', async () => {
    await addQuestions(page, [{ html: 'Persist me' }]);
    await page.evaluate(() => window.__tb.fn.persist());
    await page.reload(); await page.waitForFunction(() => window.__tb);
    await page.waitForFunction(() => window.__tb.state.questions.length === 1, null, { timeout: 5000 });
  });
  test('download a backup and restore it in an empty browser', async () => {
    await addQuestions(page, [{ html: 'Backup one' }, { html: 'Backup two', type: 'es' }]);
    await settings(page, { unitNum: '9' });
    await gotoTab(page, 'io');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bkOut')]);
    const file = path.join(OUT, 'backup.json'); await dl.saveAs(file);
    const other = await openApp(browser);
    await gotoTab(other.page, 'io');
    await other.page.setInputFiles('#bkIn', file);
    await other.page.waitForFunction(() => window.__tb.state.questions.length === 2, null, { timeout: 5000 });
    assert.deepEqual(await other.page.evaluate(() => window.__tb.state.questions.map(q => q.html).sort()), ['Backup one', 'Backup two']);
    await other.context.close();
  });
  test('restoring the same backup twice does not duplicate questions', async () => {
    await addQuestions(page, [{ html: 'Only once' }]);
    await gotoTab(page, 'io');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bkOut')]);
    const file = path.join(OUT, 'backup2.json'); await dl.saveAs(file);
    await page.setInputFiles('#bkIn', file);
    await page.waitForSelector('#rsAdd');
    assert.ok(await page.isDisabled('#rsAdd'), 'nothing missing to add');
    assert.equal(await count(), 1);
  });
  test('restore over existing questions: Replace everything, with Undo', async () => {
    const [a] = await addQuestions(page, [{ html: 'Kept A' }, { html: 'Kept B' }]);
    await gotoTab(page, 'io');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bkOut')]);
    const file = path.join(OUT, 'backup3.json'); await dl.saveAs(file);
    assert.match(await page.textContent('.last-bk'), /today/);
    await page.evaluate(a => { const st = window.__tb.state; st.questions.find(q => q.id === a).html = 'Edited A'; }, a);
    await addQuestions(page, [{ html: 'Extra C' }]);
    await gotoTab(page, 'io');
    await page.setInputFiles('#bkIn', file);
    await page.waitForSelector('#rsReplace');
    const msg = await page.textContent('#bkRes');
    assert.match(msg, /1 edited question goes back/); assert.match(msg, /1 question not in the backup is removed/);
    await page.click('#rsReplace');
    const htmls = () => page.evaluate(() => window.__tb.state.questions.map(q => q.html).sort());
    assert.deepEqual(await htmls(), ['Kept A', 'Kept B']);
    await page.click('#toastUndo');
    assert.deepEqual(await htmls(), ['Edited A', 'Extra C', 'Kept B']);
  });
  test('restore over existing questions: add only the missing ones', async () => {
    await addQuestions(page, [{ html: 'From backup 1' }, { html: 'From backup 2' }]);
    await gotoTab(page, 'io');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bkOut')]);
    const file = path.join(OUT, 'backup4.json'); await dl.saveAs(file);
    const other = await openApp(browser);
    await addQuestions(other.page, [{ html: 'Already here' }]);
    await gotoTab(other.page, 'io');
    await other.page.setInputFiles('#bkIn', file);
    await other.page.click('#rsAdd');
    assert.deepEqual(await other.page.evaluate(() => window.__tb.state.questions.map(q => q.html).sort()), ['Already here', 'From backup 1', 'From backup 2']);
    await other.context.close();
  });
  test('CSV export and import', async () => {
    await addQuestions(page, [{ html: 'CSV question', unit: '5' }]);
    await gotoTab(page, 'io');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#csvOut')]);
    const file = path.join(OUT, 'bank.csv'); await dl.saveAs(file);
    assert.match(fs.readFileSync(file, 'utf8'), /CSV question/);
    const other = await openApp(browser);
    await gotoTab(other.page, 'io');
    await other.page.setInputFiles('#csvFile', file);
    await other.page.waitForFunction(() => window.__tb.state.questions.length === 1, null, { timeout: 5000 });
    assert.equal(await other.page.evaluate(() => window.__tb.state.questions[0].unit), '5');
    await other.context.close();
  });
});

describe('courses', () => {
  test('add a course and switch with the Course menu', async () => {
    await addQuestions(page, [{ html: 'Geometry question' }]);
    const start = await page.evaluate(() => window.__tb.state.course);
    await gotoTab(page, 'io');
    await page.fill('#newCourse', 'AP Statistics'); await page.click('#addCourse');
    assert.equal(await page.evaluate(() => window.__tb.state.course), 'AP Statistics');
    assert.equal(await count(), 0);
    await page.selectOption('#courseSel', start);
    assert.equal(await count(), 1);
  });
});

describe('accessibility and display', () => {
  test('hint text is dark enough to read (WCAG AA)', async () => {
    await addQuestions(page, [{ html: 'Q' }]); await gotoTab(page, 'bank');
    const ratio = await page.evaluate(() => {
      const rgb = c => c.match(/\d+/g).slice(0, 3).map(Number);
      const lum = c => { const v = rgb(c).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
      const fg = getComputedStyle(document.querySelector('.subbar')).color, bg = getComputedStyle(document.body).backgroundColor;
      const a = lum(fg), b = lum(bg); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    assert.ok(ratio >= 4.5, `contrast ${ratio.toFixed(2)}`);
  });
  test('the current section is announced, and question checkboxes say which question', async () => {
    await addQuestions(page, [{ html: 'Area of a circle' }]); await gotoTab(page, 'bank');
    assert.equal(await page.getAttribute('#tabs button.on', 'aria-current'), 'page');
    assert.match(await page.getAttribute('[data-pick]', 'aria-label'), /Area of a circle/);
  });
  test('math symbols can be reached and typed with the keyboard', async () => {
    await gotoTab(page, 'bank');
    await page.click('#newQ'); await page.click('#e-text'); await page.keyboard.type('AB');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.sym), '∠', 'one Tab stop lands on the first symbol');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'triangle');
    await page.keyboard.press('Enter');
    assert.match(await page.evaluate(() => document.querySelector('#e-text').textContent), /△/);
  });
  test('Tab stays inside the question editor', async () => {
    await gotoTab(page, 'bank');
    await page.click('#newQ'); await page.focus('#e-save');
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => !!document.activeElement.closest('.dialog')));
  });
  test('Display settings change the app, are remembered, and never change the paper', async () => {
    await addQuestions(page, [{ html: 'Q' }]);
    const ids = await page.evaluate(() => window.__tb.state.questions.map(q => q.id));
    await page.evaluate(ids => { window.__tb.state.selected = ids; }, ids);
    await gotoTab(page, 'build');
    const paperFont = () => page.evaluate(() => getComputedStyle(document.querySelector('#paper')).fontFamily);
    const before = await paperFont();
    await page.click('.dispbtn');
    await page.check('input[name="d-font"][value="opendyslexic"]');
    await page.check('input[name="d-size"][value="l"]');
    await page.check('#d-contrast');
    assert.equal(await page.getAttribute('html', 'data-font'), 'opendyslexic');
    assert.match(await page.evaluate(() => getComputedStyle(document.body).fontFamily), /OpenDyslexic/);
    assert.ok(await page.evaluate(() => document.fonts.check('16px OpenDyslexic')), 'the font is built in');
    assert.equal(await paperFont(), before, 'printouts keep their font');
    await page.reload(); await page.waitForFunction(() => window.__tb);
    assert.equal(await page.getAttribute('html', 'data-size'), 'l');
    assert.ok(await page.evaluate(() => document.documentElement.classList.contains('hc')));
    await page.click('.dispbtn'); await page.click('#d-reset');
    assert.equal(await page.getAttribute('html', 'data-font'), '');
  });
});

describe('simpler screens', () => {
  test('main filters show; the rest are behind More filters, with chips to remove them', async () => {
    await addQuestions(page, [{ html: 'A', type: 'mc', year: 2024 }, { html: 'B', type: 'es', year: 2025 }]);
    await gotoTab(page, 'bank');
    assert.equal(await page.$('#fyr') === null, true, 'year filter is tucked away');
    await page.click('#moreF');
    await page.selectOption('#fy', 'es');
    assert.equal(await page.textContent('#moreF .count'), '1');
    assert.match(await page.textContent('#chips'), /Type: Open response/);
    assert.match(await page.textContent('#subbar'), /Showing 1 of 2/);
    await page.click('[data-unf="type"]');
    assert.match(await page.textContent('#subbar'), /Showing 2 of 2/);
    await page.fill('#fq', 'zzz');
    assert.match(await page.textContent('#chips'), /Search: “zzz”/);
    await page.click('#clearF');
    assert.equal(await page.inputValue('#fq'), '');
  });
  test('cards say Unit and Sec instead of bare numbers', async () => {
    await addQuestions(page, [{ html: 'A', unit: '3', section: '2' }]);
    await gotoTab(page, 'bank');
    assert.equal(await page.textContent('.tag.unit'), 'Unit 3 · Sec 2');
  });
  test('Page style folds away and remembers', async () => {
    await gotoTab(page, 'build');
    assert.ok(!(await page.isVisible('[data-set="shuffleQ"]')), 'folded by default');
    await page.click('#pageStyle summary');
    assert.ok(await page.isVisible('[data-set="shuffleQ"]'));
    await page.waitForFunction(() => window.__tb.ui().pageStyle === true);
    await page.reload(); await page.waitForFunction(() => window.__tb); await gotoTab(page, 'build');
    assert.ok(await page.isVisible('[data-set="shuffleQ"]'), 'stays open after reload');
  });
});

describe('help', () => {
  test('Help opens inside the app with the main how-tos and a link to the full guide', async () => {
    await page.click('.helpbtn');
    assert.ok(await page.isVisible('#helpPop'));
    assert.match(await page.textContent('#helpPop'), /Bring in questions[\s\S]*Answer keys always match/);
    assert.match(await page.getAttribute('#helpPop a', 'href'), /wiki/);
    await page.keyboard.press('Escape');
    assert.ok(!(await page.isVisible('#helpPop')));
  });
});

describe('accommodations', () => {
  test('turning on an accommodated copy shows its preview and print button', async () => {
    const ids = await addQuestions(page, [{ html: 'Slope?' }, { html: 'Area?' }]);
    await select(page, ids); await settings(page, { versions: 2 });
    await gotoTab(page, 'build');
    assert.ok(await page.isDisabled('[data-acc="font"]'), 'choices wait until it is turned on');
    await page.click('#accFold summary');
    await page.check('[data-acc="on"]');
    assert.equal(await page.textContent('#vtabs button.on'), 'Accommodated');
    await page.selectOption('[data-acc="font"]', 'OpenDyslexic');
    await page.selectOption('[data-acc="size"]', 'xl');
    await page.selectOption('[data-acc="version"]', '1');
    assert.match(await page.getAttribute('#paper', 'style'), /OpenDyslexic.*--pts:18pt/);
    assert.match(await page.textContent('#pbSum'), /2 versions \+ accommodated copy/);
    assert.ok(await page.isVisible('[data-print="acc"]'));
    const st = await page.evaluate(() => window.__tb.state.settings.accom);
    assert.deepEqual([st.on, st.font, st.size, st.version], [true, 'OpenDyslexic', 'xl', 1]);
    await page.evaluate(() => { window.print = () => setTimeout(() => window.dispatchEvent(new Event('afterprint')), 10); });
    await page.click('[data-print="acc"]');
    assert.equal(await page.evaluate(() => window.__tb.ui().pv), 'acc');
  });
});

describe('saved tests', () => {
  const stubPrint = () => page.evaluate(() => { window.print = () => setTimeout(() => window.dispatchEvent(new Event('afterprint')), 10); });
  test('printing saves the test; save, rename, duplicate, delete and undo', async () => {
    const ids = await addQuestions(page, [{ html: 'One' }, { html: 'Two' }]);
    await select(page, ids); await settings(page, { unitNum: '3', quarter: '1' });
    await gotoTab(page, 'build');
    assert.match(await page.textContent('#svStatus'), /Not saved yet/);
    await stubPrint(); await page.click('[data-print="tests"]');
    assert.match(await page.textContent('#svStatus'), /Unit 3 Exam.*printed/);
    const saved = () => page.evaluate(() => window.__tb.state.savedTests.map(t => t.name));
    const names = await saved();
    assert.equal(names.length, 1); assert.match(names[0], /Unit 3 Exam/, 'named from the title');
    assert.ok(await page.evaluate(() => !!window.__tb.state.savedTests[0].printedAt), 'print date recorded');
    await page.click('#svList summary');
    await page.click('[data-svren]'); await page.fill('.svl input', 'Unit 3 Exam, Nov 2026'); await page.keyboard.press('Enter');
    assert.deepEqual(await saved(), ['Unit 3 Exam, Nov 2026']);
    await page.click('[data-svdup]');
    assert.deepEqual(await saved(), ['Unit 3 Exam, Nov 2026 (copy)', 'Unit 3 Exam, Nov 2026']);
    const copy = await page.evaluate(() => window.__tb.state.savedTests[0].id);
    await page.click(`[data-svdel="${copy}"]`); await page.click(`[data-svdel="${copy}"]`);
    assert.deepEqual(await saved(), ['Unit 3 Exam, Nov 2026']);
    await page.click('#toastUndo');
    assert.equal((await saved()).length, 2);
  });
  test('opening another saved test asks first when the current one has unsaved changes', async () => {
    const ids = await addQuestions(page, [{ html: 'A' }, { html: 'B' }, { html: 'C' }]);
    await select(page, ids.slice(0, 1)); await gotoTab(page, 'build');
    await page.click('#svSave');
    await page.evaluate(id => window.__tb.state.selected.push(id), ids[1]);
    await page.click('#svNew');
    await page.evaluate(id => window.__tb.state.selected.push(id), ids[2]);
    await gotoTab(page, 'build');
    await page.click('#svList summary');
    const first = await page.evaluate(() => window.__tb.state.savedTests[1].id);
    await page.click(`[data-svopen="${first}"]`);
    assert.ok(await page.isVisible('#svAskSave'), 'asks before leaving unsaved changes');
    await page.click('#svAskSave');
    assert.deepEqual(await page.evaluate(() => window.__tb.state.selected.length), 1, 'opened the first test');
    assert.equal(await page.evaluate(() => window.__tb.state.savedTests[0].selected.length), 3, 'and saved the changes first');
  });
  test('an edited question shows the note and lets you switch to the latest versions', async () => {
    const ids = await addQuestions(page, [{ html: 'Original' }]);
    await select(page, ids); await gotoTab(page, 'build');
    await page.click('#svSave');
    const id = await page.evaluate(() => window.__tb.state.settings.savedId);
    await page.evaluate(q => { window.__tb.state.questions.find(x => x.id === q).html = 'Edited'; }, ids[0]);
    await page.click('#svList summary'); await page.click(`[data-svopen="${id}"]`);
    assert.match(await page.textContent('.sv-frozen'), /1 question was edited/);
    assert.match(await page.textContent('#paper'), /Original/);
    await page.click('#svLatest');
    assert.match(await page.textContent('#paper'), /Edited/);
    assert.equal(await page.$('.sv-frozen') === null, true);
  });
});

describe('printing', () => {
  // What actually goes to the printer: the first version starts on page 1, each later one on a new page.
  const breaks = () => page.evaluate(() => [...document.querySelectorAll('#printRoot section')].map(x => getComputedStyle(x).breakBefore));
  for (const [label, kind, perVersion, want] of [['tests, one window per version', 'tests', true, ['auto']],
                                                  ['all versions in one window', 'tests', false, ['auto', 'page']],
                                                  ['answer keys', 'keys', true, ['auto', 'page']]]) {
    test('no blank first page: ' + label, async () => {
      const ids = await addQuestions(page, [{ html: 'One' }, { html: 'Two' }]);
      await select(page, ids); await settings(page, { versions: 2, perVersion });
      await gotoTab(page, 'build');
      await page.evaluate(() => { window.print = () => {}; });
      await page.click(`[data-print="${kind}"]`);
      await page.waitForFunction(() => document.querySelector('#printRoot section'));
      await page.emulateMedia({ media: 'print' });
      assert.deepEqual(await breaks(), want);
      await page.emulateMedia({ media: 'screen' });
    });
  }
});
