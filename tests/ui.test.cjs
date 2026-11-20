// Clicking through the app like a teacher would: tabs, editing, deleting, importing, backups, courses, printing.
const { test, describe, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { launch, openApp, addQuestions, select, settings, gotoTab, goPlace, FIX, OUT, privateFixtures } = require('./helpers.cjs');

let browser, ctx, page, errors;
before(async () => { browser = await launch(); });
after(async () => { await browser.close(); });
beforeEach(async () => { ({ context: ctx, page, errors } = await openApp(browser)); });
afterEach(async () => { const e = errors.slice(); await ctx.close(); assert.deepEqual(e, [], 'page errors'); });

const count = () => page.evaluate(() => window.__tb.state.questions.filter(q => (q.courses || [q.course]).includes(window.__tb.state.course)).length);
const tab = async name => { await page.click(`#tabs [data-tab="${name}"]`); await page.waitForTimeout(100); };
const place = (p, sub) => goPlace(page, p, sub);

describe('tabs', () => {
  test('the browser tab shows the candle icon, and so does the header', async () => {
    const ok = await page.evaluate(async () => {
      const img = new Image(); img.src = document.querySelector('link[rel=icon]').href;
      try { await img.decode(); } catch (e) { return false; }
      return img.naturalWidth > 0;
    });
    assert.equal(ok, true, 'favicon loads as an image');
    assert.equal(await page.evaluate(() => (document.querySelector('.brand img.mark')?.naturalWidth || 0) > 0), true);
  });
  test('all three tabs open', async () => {
    await addQuestions(page, [{}, { type: 'es' }]);
    await gotoTab(page, 'bank');
    for (const t of ['pick', 'setup', 'print', 'io', 'bank']) {
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
  test('sort newest added first, or by exam date newest first', async () => {
    await addQuestions(page, [{ html: 'June 2024 q2', year: 2024, month: '06', qnum: 2 }, { html: 'Aug 2025 q1', year: 2025, month: '08', qnum: 1 }, { html: 'June 2024 q1', year: 2024, month: '06', qnum: 1 }]);
    await gotoTab(page, 'bank');
    const order = () => page.$$eval('#qlist .qcard div.qbody', x => x.map(e => e.textContent.trim()));
    await page.selectOption('#fsort', 'new');
    assert.deepEqual(await order(), ['June 2024 q1', 'Aug 2025 q1', 'June 2024 q2']);
    await page.selectOption('#fsort', 'examnew');
    assert.deepEqual(await order(), ['Aug 2025 q1', 'June 2024 q1', 'June 2024 q2']);
  });
});

describe('building', () => {
  test('pick questions in the bank, then reorder and remove them on Build & print', async () => {
    const ids = await addQuestions(page, [{ html: 'One' }, { html: 'Two' }, { html: 'Three' }]);
    await gotoTab(page, 'bank');
    for (const id of ids) await page.check(`[data-pick="${id}"]`);
    assert.deepEqual(await page.evaluate(() => window.__tb.state.selected), ids);
    await tab('setup'); await page.click('.subtabs [data-sub="questions"]');
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
    await place('setup', 'questions');
    await page.click(`[data-bonus="${ids[1]}"]`);
    assert.equal(await page.evaluate(id => window.__tb.state.settings.bonus[id], ids[1]), true);
    await settings(page, { docType: 'lesson' }); await place('setup', 'questions');
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
    await gotoTab(page, 'print');
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
    await place('setup', 'questions');
    assert.ok(!(await page.isVisible('[data-print="both"]')), 'Set up previews; printing happens on 3 Print');
    await page.click('#toPrint');
    assert.equal(await page.evaluate(() => window.__tb.fn.curSub('print')), 'preview');
    const order = await page.evaluate(() => {
      const y = el => el.getBoundingClientRect().top + window.scrollY;
      return { paper: y(document.querySelector('#paper')), print: y(document.querySelector('[data-print="both"]')) };
    });
    assert.ok(order.paper < order.print, 'paper preview is above the Print buttons');
    assert.equal(await page.textContent('#pbSum'), '3 versions · 1 question · 2 points');
    await page.evaluate(id => window.__tb.state.selected.push(id), ids[1]); await place('print', 'preview');
    assert.equal(await page.textContent('#pbSum'), '3 versions · 2 questions · 6 points');
    await place('setup', 'questions'); await page.click('#selList [data-rm]');
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
    await gotoTab(page, 'io', 'backup');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bkOut')]);
    const file = path.join(OUT, 'backup.json'); await dl.saveAs(file);
    const other = await openApp(browser);
    await gotoTab(other.page, 'io', 'backup');
    await other.page.setInputFiles('#bkIn', file);
    await other.page.waitForFunction(() => window.__tb.state.questions.length === 2, null, { timeout: 5000 });
    assert.deepEqual(await other.page.evaluate(() => window.__tb.state.questions.map(q => q.html).sort()), ['Backup one', 'Backup two']);
    await other.context.close();
  });
  test('restoring the same backup twice does not duplicate questions', async () => {
    await addQuestions(page, [{ html: 'Only once' }]);
    await gotoTab(page, 'io', 'backup');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bkOut')]);
    const file = path.join(OUT, 'backup2.json'); await dl.saveAs(file);
    await page.setInputFiles('#bkIn', file);
    await page.waitForSelector('#rsAdd');
    assert.ok(await page.isDisabled('#rsAdd'), 'nothing missing to add');
    assert.equal(await count(), 1);
  });
  test('restore over existing questions: Replace everything, with Undo', async () => {
    const [a] = await addQuestions(page, [{ html: 'Kept A' }, { html: 'Kept B' }]);
    await gotoTab(page, 'io', 'backup');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bkOut')]);
    const file = path.join(OUT, 'backup3.json'); await dl.saveAs(file);
    assert.match(await page.textContent('.last-bk'), /today/);
    await page.evaluate(a => { const st = window.__tb.state; st.questions.find(q => q.id === a).html = 'Edited A'; }, a);
    await addQuestions(page, [{ html: 'Extra C' }]);
    await gotoTab(page, 'io', 'backup');
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
    await gotoTab(page, 'io', 'backup');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bkOut')]);
    const file = path.join(OUT, 'backup4.json'); await dl.saveAs(file);
    const other = await openApp(browser);
    await addQuestions(other.page, [{ html: 'Already here' }]);
    await gotoTab(other.page, 'io', 'backup');
    await other.page.setInputFiles('#bkIn', file);
    await other.page.click('#rsAdd');
    assert.deepEqual(await other.page.evaluate(() => window.__tb.state.questions.map(q => q.html).sort()), ['Already here', 'From backup 1', 'From backup 2']);
    await other.context.close();
  });
});

describe('Browse banks (1 Pick questions)', () => {
  test('bank cards → units and sections → questions; Add, Add at random with Undo, and the path back', async () => {
    const qs = [];
    for (const [u, sct] of [['2', '1'], ['2', '2'], ['3', '1']]) for (let k = 0; k < 3; k++) qs.push({ html: `U${u} S${sct} #${k}`, bank: 'Regents', unit: u, section: sct });
    qs.push({ html: 'Plain one', bank: 'Warm ups', unit: '', section: '' });
    await addQuestions(page, qs);
    await goPlace(page, 'pick', 'browse');
    assert.deepEqual(await page.$$eval('[data-brbank]', e => e.map(x => x.dataset.brbank)), ['Regents', 'Warm ups']);
    await page.click('[data-brbank="Regents"]');
    assert.equal(await page.$$eval('.br-u', e => e.length), 2, 'Unit 2 and Unit 3');
    await page.click('[data-brunit="2"][data-brsec="2"]');
    assert.equal(await page.$$eval('#qlist .qcard', e => e.length), 3, 'only Unit 2 · Section 2');
    assert.match(await page.textContent('.crumbs'), /All banks.*Regents.*Unit 2 · Section 2/);
    await page.check('#qlist [data-pick]');
    assert.equal(await page.evaluate(() => window.__tb.state.selected.length), 1);
    await page.fill('#brN', '5'); await page.click('#brRand');
    assert.equal(await page.evaluate(() => window.__tb.state.selected.length), 3, 'only the 2 left in the section are added');
    await page.click('#toast button');
    assert.equal(await page.evaluate(() => window.__tb.state.selected.length), 1, 'Undo takes the random ones off');
    await page.click('[data-crumb="1"]');
    assert.match(await page.textContent('.br-tree'), /1 on the test/);
    await page.click('[data-crumb="0"]');
    await page.click('[data-brbank="Warm ups"]');
    assert.equal(await page.$$eval('#qlist .qcard', e => e.length), 1, 'a bank without units opens straight to its questions');
    // the Search filters are not touched by browsing
    assert.equal(await page.evaluate(() => window.__tb.ui().unit), '');
  });
});

describe('Your banks list', () => {
  test('long lists show 10 banks, Show all, find a bank, and save counts the ticked banks', async () => {
    await addQuestions(page, Array.from({ length: 15 }, (_, i) => ({ html: 'Q' + i, bank: 'Bank ' + String(i + 1).padStart(2, '0') })));
    await gotoTab(page, 'io', 'banks');
    const shown = () => page.$$eval('.blist li', els => els.filter(e => !e.hidden).length);
    assert.equal(await shown(), 10);
    await page.fill('#bankFind', 'bank 14');
    assert.equal(await shown(), 1);
    assert.ok(await page.isHidden('#bankMore'));
    await page.fill('#bankFind', '');
    await page.click('#bankMore');
    assert.equal(await shown(), 15);
    assert.equal(await page.textContent('#bfSave'), 'Save all as files…');
    await page.check('[data-bf][value="Bank 02"]'); await page.check('[data-bf][value="Bank 05"]');
    assert.equal(await page.textContent('#bfSave'), 'Save 2 as files…');
    await page.check('#bfAll');
    assert.equal(await page.$$eval('[data-bf]:checked', e => e.length), 15);
  });
});

describe('courses', () => {
  test('add a course and switch with the Course menu', async () => {
    await addQuestions(page, [{ html: 'Geometry question' }]);
    const start = await page.evaluate(() => window.__tb.state.course);
    await gotoTab(page, 'io', 'courses');
    await page.fill('#newCourse', 'AP Statistics'); await page.click('#addCourse');
    assert.equal(await page.evaluate(() => window.__tb.state.course), 'AP Statistics');
    assert.equal(await count(), 0);
    await page.selectOption('#courseSel', start);
    assert.equal(await count(), 1);
  });
});

describe('shared banks (one bank in several courses)', () => {
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(window.__tb.state.questions.map(q => ({ html: q.html, courses: q.courses, course: q.course })))));
  const share = async (bank, course) => {
    await gotoTab(page, 'io', 'banks');
    await page.click(`[data-bmenu="${bank}"] > summary`);
    await page.check(`[data-usein="${bank}"][value="${course}"]`);
  };
  test('Courses… on a bank puts its questions in another course too, as one copy', async () => {
    await page.evaluate(() => { window.__tb.state.course = 'Algebra 1'; window.__tb.render(); });
    await addQuestions(page, [{ html: 'Shared one' }, { html: 'Shared two' }]);
    await share('Test bank', 'Algebra 2');
    assert.equal((await st()).length, 2, 'no copies were made');
    assert.match(await page.textContent('.blist li'), /also in Algebra 2/);
    assert.ok(await page.evaluate(() => document.querySelector('[data-bmenu="Test bank"]').open), 'the menu stays open after a tick');
    await page.selectOption('#courseSel', 'Algebra 2');
    assert.equal(await count(), 2);
    await gotoTab(page, 'bank');
    assert.match(await page.textContent('#qlist'), /Also in Algebra 1/);
    // an edit in one course shows in the other
    await page.evaluate(() => { window.__tb.state.questions[0].html = 'Edited once'; });
    await page.selectOption('#courseSel', 'Algebra 1'); await gotoTab(page, 'bank');
    assert.match(await page.textContent('#qlist'), /Edited once/);
  });
  test('Delete on a shared question takes it out of this course only; Undo puts it back', async () => {
    await page.evaluate(() => { window.__tb.state.course = 'Algebra 1'; window.__tb.render(); });
    await addQuestions(page, [{ html: 'Shared one' }, { html: 'Only here' }]);
    await page.evaluate(() => { window.__tb.state.questions[0].courses = ['Algebra 1', 'Algebra 2']; });
    await gotoTab(page, 'bank');
    const del = '#qlist .qcard:has-text("Shared one") [data-del]';
    await page.click(del); await page.click(del);
    let q = await st();
    assert.equal(q.length, 2, 'still in the bank');
    assert.deepEqual(q[0].courses, ['Algebra 2']); assert.equal(q[0].course, 'Algebra 2');
    assert.match(await page.textContent('#toast'), /Removed from Algebra 1\. It’s still in Algebra 2/);
    await page.click('#toast button');
    assert.deepEqual((await st())[0].courses, ['Algebra 1', 'Algebra 2'], 'Undo');
    const del2 = '#qlist .qcard:has-text("Only here") [data-del]';
    await page.click(del2); await page.click(del2);
    assert.equal((await st()).length, 1, 'a question in one course only is deleted');
  });
  test('the editor shows course checkboxes; unticking this course moves it', async () => {
    await page.evaluate(() => { window.__tb.state.course = 'Algebra 1'; window.__tb.render(); });
    await addQuestions(page, [{ html: 'Shared one' }]);
    await page.evaluate(() => { window.__tb.state.questions[0].courses = ['Algebra 1', 'Algebra 2']; });
    await gotoTab(page, 'bank');
    await page.click('#qlist [data-edit]');
    assert.equal(await page.evaluate(() => document.getElementById('e-moreD').open), true, 'More details opens for a shared question');
    assert.deepEqual(await page.$$eval('#e-courses input:checked', x => x.map(e => e.value)), ['Algebra 1', 'Algebra 2']);
    await page.uncheck('#e-courses input[value="Algebra 1"]');
    await page.click('#e-save');
    assert.deepEqual((await st())[0].courses, ['Algebra 2']);
    assert.equal(await count(), 0);
  });
  test('deleting a bank or a course keeps shared questions in the other courses', async () => {
    await page.evaluate(() => { window.__tb.state.course = 'Algebra 1'; window.__tb.render(); });
    await addQuestions(page, [{ html: 'Shared one' }, { html: 'Only here' }]);
    await page.evaluate(() => { window.__tb.state.questions[0].courses = ['Algebra 1', 'Algebra 2']; });
    await gotoTab(page, 'io', 'banks');
    await page.click('[data-bmenu="Test bank"] > summary');
    await page.click('[data-delbank="Test bank"]'); await page.click('[data-delbank="Test bank"]');
    let q = await st();
    assert.equal(q.length, 1); assert.deepEqual(q[0].courses, ['Algebra 2']);
    await page.click('#toast button'); // Undo
    await gotoTab(page, 'io', 'courses');
    await page.click('[data-cdel="Algebra 2"]'); await page.click('[data-cdel="Algebra 2"]');
    q = await st();
    assert.equal(q.length, 2); assert.ok(q.every(x => x.courses.length === 1 && x.courses[0] === 'Algebra 1'));
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
  test('Set up has one panel per sub-tab, and the app reopens where you were', async () => {
    await place('setup', 'doc');
    assert.ok(!(await page.isVisible('[data-set="shuffleQ"]')), 'scrambling is under Set up › Versions');
    assert.ok(!(await page.isVisible('[data-set="font"]')), 'one panel at a time');
    await page.click('.subtabs [data-sub="page"]');
    assert.ok(await page.isVisible('[data-set="font"]'));
    assert.ok(await page.isVisible('#paper'), 'the preview stays beside the settings');
    await page.waitForFunction(() => window.__tb.ui().subs.setup === 'page');
    await page.evaluate(() => window.__tb.fn.persist());
    await page.reload(); await page.waitForFunction(() => window.__tb);
    await page.waitForSelector('.subtabs [data-sub="page"].on');
    assert.ok(await page.isVisible('[data-set="font"]'), 'still on Page style after reload');
    await place('setup', 'versions');
    assert.ok(await page.isVisible('[data-set="shuffleQ"]'));
  });
  test('related settings sit together, and Next walks through Set up to Print', async () => {
    const ids = await addQuestions(page, [{ html: 'One' }, { html: 'Two', type: 'es' }]);
    await select(page, ids); await settings(page, { docType: 'test', group: true });
    await place('setup', 'acc');
    assert.ok(await page.isVisible('[data-set="time"]'), 'Time accommodation is under Accommodations');
    await place('setup', 'doc');
    assert.ok(!(await page.isVisible('[data-set="time"]')), 'and no longer under Document');
    await place('setup', 'spacing');
    assert.ok(await page.isVisible('[data-set="bmMode"]'), 'both bimodal settings are under Spacing');
    await place('setup', 'page');
    assert.ok(await page.isVisible('[data-set="group"]') && await page.isVisible('#pdirReset'), 'Part directions sit with Group into parts');
    await place('setup', 'questions');
    const seen = [];
    for (let i = 0; i < 6; i++) { seen.push(await page.textContent('#nextStep')); await page.click('#nextStep'); }
    assert.deepEqual(seen.map(t => t.replace(/\s*→/, '').trim()), ['Next: Document', 'Next: Versions', 'Next: Spacing', 'Next: Accommodations', 'Next: Page style', 'Next: 3 Print']);
    assert.equal(await page.evaluate(() => window.__tb.ui().tab), 'print');
  });
  test('the rail: Alt+1–3 jump to the steps (not while typing), icons only, and old saved tabs still open', async () => {
    await addQuestions(page, [{ html: 'One' }]);
    await place('bank');
    await page.keyboard.press('Alt+Digit2');
    assert.equal(await page.evaluate(() => window.__tb.ui().tab), 'setup');
    await place('pick', 'search');
    await page.focus('#fq'); await page.keyboard.press('Alt+Digit3');
    assert.equal(await page.evaluate(() => window.__tb.ui().tab), 'pick', 'Alt+3 in the search box types, it doesn’t jump');
    await page.click('#railMin');
    assert.ok(await page.$('#shell.rmin'));
    assert.ok(!(await page.isVisible('#tabs .rl')), 'labels hidden');
    await page.click('#railMin');
    for (const old of ['build', 'arrange', 'format']) {
      await page.evaluate(t => { window.__tb.ui().tab = t; window.__tb.render(); }, old);
      assert.ok(await page.$('#tabs [data-tab="setup"].on'), old + ' (saved by an older version) opens 2 Set up');
    }
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
    await place('setup', 'acc');
    assert.ok(await page.isDisabled('[data-acc="font"]'), 'choices wait until it is turned on');
    await page.check('[data-acc="on"]');
    assert.equal(await page.textContent('#vtabs button.on'), 'Accommodated');
    await page.selectOption('[data-acc="font"]', 'OpenDyslexic');
    await page.selectOption('[data-acc="size"]', 'xl');
    await page.selectOption('[data-acc="version"]', '1');
    assert.match(await page.getAttribute('#paper', 'style'), /OpenDyslexic.*--pts: ?18pt/);
    await place('print', 'preview');
    assert.match(await page.textContent('#pbSum'), /2 versions \+ accommodated copy/);
    assert.ok(await page.isVisible('[data-print="acc"]'));
    const st = await page.evaluate(() => window.__tb.state.settings.accom);
    assert.deepEqual([st.on, st.font, st.size, st.version], [true, 'OpenDyslexic', 'xl', 1]);
    await page.evaluate(() => { window.print = () => setTimeout(() => window.dispatchEvent(new Event('afterprint')), 10); });
    await page.click('[data-print="acc"]');
    assert.equal(await page.evaluate(() => window.__tb.ui().pv), 'acc');
  });
});

describe('polish from the design review', () => {
  test('rail names say the counts, a backup dot shows until a backup, file pickers are one named tab stop', async () => {
    await addQuestions(page, [{ html: 'One' }]);
    await page.evaluate(() => { delete window.__tb.ui().lastBackup; window.__tb.render(); });
    assert.match(await page.getAttribute('#tabs [data-tab="bank"]', 'aria-label'), /Question bank, \d+ questions?/);
    assert.ok(await page.$('#tabs [data-tab="io"] .rdot'), 'dot while there is no backup');
    await gotoTab(page, 'io', 'backup');
    assert.equal(await page.getAttribute('#bkIn', 'aria-label'), 'Restore a backup');
    assert.equal(await page.getAttribute('#bkIn + *, .filebtn button', 'tabindex'), '-1', 'the look-alike button is not a second tab stop');
    await page.evaluate(() => { window.__tb.ui().lastBackup = new Date().toISOString(); window.__tb.render(); });
    assert.equal(await page.$('#tabs [data-tab="io"] .rdot'), null, 'no dot after a fresh backup');
    await goPlace(page, 'setup', 'questions');
    assert.equal((await page.textContent('.pvcard h2')).trim(), 'Preview', 'the heading is just the heading');
  });
});

describe('picking only picks', () => {
  test('1 Pick questions has the tick box and Edit; Delete, Copy and the bank tools stay in Question bank', async () => {
    const [id] = await addQuestions(page, [{ html: 'One' }, { html: 'Two' }]);
    for (const [where, sub] of [['pick', 'search'], ['pick', 'browse']]) {
      await place(where, sub);
      if (sub === 'browse') { await page.click('[data-brbank="Test bank"]'); if (await page.$('[data-brunit]')) await page.click('[data-brunit]'); }
      assert.ok(await page.$(`#qlist [data-pick="${id}"]`), where + ':' + sub + ' tick box');
      assert.ok(await page.$(`#qlist [data-edit="${id}"]`), 'Edit');
      for (const sel of ['[data-del]', '[data-dup]', '[data-share]', '#setUnit', '#newQ', '#cleanBtn']) assert.equal(await page.$(sel), null, sel + ' is not in Pick');
    }
    await place('pick', 'search');
    await page.click('#toBank');
    assert.equal(await page.evaluate(() => window.__tb.ui().tab), 'bank');
    for (const sel of [`[data-del="${id}"]`, `[data-dup="${id}"]`, '#setUnit', '#newQ', '#cleanBtn']) assert.ok(await page.$(sel), sel + ' is in Question bank');
  });
});

describe('3 Print: what will print', () => {
  test('a recap with links to each setting, warnings, a receipt after printing, and a way back when empty', async () => {
    await place('print', 'preview');
    assert.match(await page.textContent('#recap'), /Nothing to print yet/);
    await page.click('#rcPick');
    assert.equal(await page.evaluate(() => window.__tb.ui().tab), 'pick');
    const ids = await addQuestions(page, [{ html: 'One' }, { html: 'Two', answer: -1 }]);
    await select(page, ids); await settings(page, { versions: 2, shuffleQ: true, unitNum: '3', quarter: '1' });
    await place('print', 'preview');
    const rc = await page.textContent('#recap');
    assert.match(rc, /2 versions \(A, B\), questions shuffled/);
    assert.match(rc, /2 answer keys/);
    assert.match(rc, /Accommodated copy\s*Off/);
    assert.match(rc, /no correct answer/, 'the missing-answer warning is in the recap');
    assert.match(rc, /No backup downloaded/);
    await page.click('[data-rc="setup:versions"]');
    assert.equal(await page.evaluate(() => window.__tb.fn.curSub('setup')), 'versions', 'each line opens its setting');
    await place('print', 'preview');
    await page.evaluate(() => { window.print = () => setTimeout(() => window.dispatchEvent(new Event('afterprint')), 10); });
    await page.click('[data-print="tests"]');
    await page.waitForSelector('#recap .rc-done');
    assert.match(await page.textContent('#recap .rc-done'), /Printed today at .* saved as “Quarter 1 – Unit 3 Exam”/);
  });
});

describe('polish 2026-11-20', () => {
  test('on 1 Pick questions a click on a question picks it and Shift-click picks a run', async () => {
    const ids = await addQuestions(page, [{ html: 'P1' }, { html: 'P2' }, { html: 'P3' }, { html: 'P4' }]);
    await select(page, []); await page.evaluate(() => Object.assign(window.__tb.ui(), { q: 'P', sort: 'bank' }));
    await place('pick', 'search');
    const card = i => page.locator('#qlist .qcard', { hasText: 'P' + i }).locator('.qmeta');
    await card(1).click();
    await card(4).click({ modifiers: ['Shift'] });
    assert.deepEqual((await page.evaluate(() => window.__tb.state.selected)).sort(), ids.slice().sort(), 'P1 to P4 picked');
    await card(2).click();
    assert.equal(await page.evaluate(() => window.__tb.state.selected.length), 3, 'a second click takes it off');
    await page.evaluate(() => { window.__tb.ui().q = ''; });
  });
  test('an empty test points to 1 Pick questions; 3 Print shows only the recap', async () => {
    await select(page, []);
    await place('setup', 'questions');
    await page.click('#selPick');
    assert.equal(await page.evaluate(() => document.querySelector('#main').dataset.place), 'pick');
    await place('print', 'preview');
    assert.ok(!(await page.isVisible('.pvcard')), 'no preview, versions or print buttons with nothing to print');
    assert.match(await page.textContent('#recap'), /Nothing to print yet/);
  });
});

describe('picking all at once and copies of banks', () => {
  test('1 Pick questions opens on Search; Browse banks is the last tab', async () => {
    await addQuestions(page, [{ html: 'Order' }]);
    await page.evaluate(() => { const u = window.__tb.ui(); if (u.subs) delete u.subs.pick; });
    await place('pick');
    const tabs = await page.$$eval('.subtabs [data-sub]', b => b.map(x => x.dataset.sub));
    assert.equal(tabs[0], 'search'); assert.equal(tabs[tabs.length - 1], 'browse');
    assert.equal(await page.evaluate(() => window.__tb.fn.curSub('pick')), 'search');
  });
  test('Select all and Deselect all pick every question shown, with Undo', async () => {
    const ids = await addQuestions(page, [{ html: 'SelX one' }, { html: 'SelX two' }, { html: 'SelX three' }]);
    await select(page, []); await page.evaluate(() => { window.__tb.ui().q = 'SelX'; });
    await place('pick', 'search');
    assert.ok(await page.isDisabled('#selNone'));
    await page.click('#selAll');
    assert.deepEqual((await page.evaluate(() => window.__tb.state.selected)).sort(), ids.slice().sort());
    assert.ok(await page.isDisabled('#selAll'));
    await page.click('#selNone');
    assert.equal(await page.evaluate(() => window.__tb.state.selected.length), 0);
    await page.evaluate(() => { window.__tb.ui().q = ''; });
  });
  test('Duplicate makes a bank of copies; changing a copy leaves the original alone', async () => {
    const ids = await addQuestions(page, [{ html: 'Dup A', bank: 'DupBank' }, { html: 'Dup B', bank: 'DupBank' }]);
    await page.evaluate(() => window.__tb.fn.copyBank('DupBank'));
    const r = await page.evaluate(ids => { const S = window.__tb.state, c = S.questions.filter(q => q.bank === 'DupBank (copy)');
      c[0].html = 'Changed copy'; return { n: c.length, newIds: c.every(q => !ids.includes(q.id)), orig: S.questions.filter(q => ids.includes(q.id)).map(q => q.html) }; }, ids);
    assert.equal(r.n, 2); assert.ok(r.newIds, 'copies have their own ids');
    assert.deepEqual(r.orig, ['Dup A', 'Dup B'], 'the original bank is unchanged');
    await page.evaluate(() => window.__tb.fn.copyBank('DupBank'));
    assert.equal(await page.evaluate(() => window.__tb.state.questions.filter(q => q.bank === 'DupBank (copy 2)').length), 2);
  });
  test('a colleague’s bank copies into your own private bank that remembers where it came from', async () => {
    await page.evaluate(() => { const S = window.__tb.state; ['Col 1', 'Col 2'].forEach((h, i) => S.questions.push(window.__tb.normalize({ questions: [{ id: 'col' + i, html: h, type: 'sa', bank: 'Their bank', courses: [S.course], owner: 'u-col', ownerName: 'Pat', visibility: 'public', canEdit: false }] }).questions[0])); });
    await page.evaluate(() => { const S = window.__tb.state; S.questions.filter(q => q.id.startsWith('col')).forEach(q => { q.owner = 'u-col'; q.ownerName = 'Pat'; q.visibility = 'public'; }); window.__tb.fn.copyBank('sh:u-col|Their bank'); });
    const c = await page.evaluate(() => window.__tb.state.questions.filter(q => q.bank === 'Their bank' && !q.owner));
    assert.equal(c.length, 2);
    assert.ok(c.every(q => !q.visibility && q.origin && q.origin.owner === 'u-col' && q.courses.length === 1), 'private, yours, with its origin');
  });
});

describe('saved tests', () => {
  const stubPrint = () => page.evaluate(() => { window.print = () => setTimeout(() => window.dispatchEvent(new Event('afterprint')), 10); });
  test('printing saves the test; save, rename, duplicate, delete and undo', async () => {
    const ids = await addQuestions(page, [{ html: 'One' }, { html: 'Two' }]);
    await select(page, ids); await settings(page, { unitNum: '3', quarter: '1' });
    await place('print', 'saved');
    assert.match(await page.textContent('#svStatus'), /Not saved yet/);
    await place('print', 'preview');
    await stubPrint(); await page.click('[data-print="tests"]');
    await place('print', 'saved');
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
    await select(page, ids.slice(0, 1)); await place('print', 'saved');
    await page.click('#svSave');
    await page.evaluate(id => window.__tb.state.selected.push(id), ids[1]);
    await page.click('#svNew');
    await page.evaluate(id => window.__tb.state.selected.push(id), ids[2]);
    await place('print', 'saved');
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
    await select(page, ids); await place('print', 'saved');
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
      await gotoTab(page, 'print');
      await page.evaluate(() => { window.print = () => {}; });
      await page.click(`[data-print="${kind}"]`);
      await page.waitForFunction(() => document.querySelector('#printRoot section'));
      await page.emulateMedia({ media: 'print' });
      assert.deepEqual(await breaks(), want);
      await page.emulateMedia({ media: 'screen' });
    });
  }
});

describe('the preview shows letter-size pages', () => {
  test('pages are 8.5 x 11 in, numbered, never split a question, and keep the accommodated page breaks', async () => {
    const ids = await addQuestions(page, Array.from({ length: 24 }, (_, i) => ({ html: 'Question number ' + (i + 1) + ' about slope.' })));
    await select(page, ids); await settings(page, { docType: 'test', versions: 1 });
    await place('print', 'preview');
    await page.waitForFunction(() => document.querySelectorAll('#paper .pv-page').length > 1);
    const r = await page.evaluate(() => {
      const pages = [...document.querySelectorAll('#paper .pv-page')], m = document.querySelector('#pvMeasure'), t0 = m.getBoundingClientRect().top;
      const segs = [...document.querySelectorAll('#paper .pv-flow')].map(f => { const a = -parseFloat(f.style.marginTop); return [a, a + parseFloat(f.parentNode.style.height)]; });
      const split = [...m.querySelectorAll('.pt-q')].filter(q => { const b = q.getBoundingClientRect(), y0 = b.top - t0, y1 = b.bottom - t0; return !segs.some(([a, z]) => y0 >= a - 0.5 && y1 <= z + 0.5); }).length;
      return { n: pages.length, w: pages[0].offsetWidth, h: pages[0].offsetHeight, label: document.querySelector('#paper .pv-pn').textContent, heads: document.querySelectorAll('#paper .pv-head img').length, split };
    });
    assert.ok(r.n >= 2, 'more than one page');
    assert.deepEqual([r.w, r.h], [816, 1056], '8.5 x 11 inches');
    assert.equal(r.label, 'Page 1 of ' + r.n);
    assert.equal(r.heads, r.n, 'every page has its header');
    assert.equal(r.split, 0, 'no question is cut across two pages');
    // accommodated copy, 1 question per page: one page per question
    await page.evaluate(() => { const s = window.__tb.state.settings; s.accom = { on: true, perPage: 1, version: 0 }; window.__tb.ui().pv = 'acc'; window.__tb.render(); });
    await page.waitForFunction(() => document.querySelectorAll('#paper .pv-page').length >= 24);
    assert.equal(await page.evaluate(() => document.querySelectorAll('#paper .pv-page').length), 24);
  });
});
