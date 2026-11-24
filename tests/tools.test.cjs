// Bank tools: old NY codes, needs-attention checks, Change these…, Check & clean up, her own fields,
// bank files (save / open).
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { launch, openApp, addQuestions, fn, gotoTab, OUT, privateFixtures } = require('./helpers.cjs');

let browser, page, errors;
before(async () => { browser = await launch(); ({ page, errors } = await openApp(browser)); });
after(async () => { await browser.close(); });

const reset = () => page.evaluate(() => { const T = window.__tb; T.state = T.normalize({ courses: ['Algebra 1'], course: 'Algebra 1' }); const u = T.ui(); Object.keys(u).forEach(k => { if (/^x:/.test(k)) delete u[k]; }); Object.assign(u, { q: '', bank: '', topic: '', type: '', std: '', unit: '', section: '', source: '', year: '', month: '', cluster: '', sub: '', need: '', moreF: false, tab: 'bank' }); T.render(); });
const add = async (specs) => { const ids = await addQuestions(page, specs); await page.evaluate(() => window.__tb.render()); return ids; };
const qs = () => page.evaluate(() => window.__tb.state.questions);

describe('old NY codes in the standard', () => {
  test('mixed standards are split; NY-only standards are left alone', async () => {
    const r = await page.evaluate(() => {
      const f = window.__tb.fn;
      const a = { standard: 'A.REI.A.1, NY: A.N.1', cluster: '' }, b = { standard: 'NY: A.A.7' }, c = { standard: 'F.IF.A.2, NY: A.G.3, NY: A.G.4', nyStd: 'A.G.3' };
      return [f.splitNY(a), a, f.splitNY(b), b, f.splitNY(c), c];
    });
    assert.equal(r[0], true); assert.equal(r[1].standard, 'A.REI.A.1'); assert.equal(r[1].nyStd, 'A.N.1'); assert.equal(r[1].cluster, 'A.REI.A');
    assert.equal(r[2], false); assert.equal(r[3].standard, 'NY: A.A.7');
    assert.equal(r[5].standard, 'F.IF.A.2'); assert.equal(r[5].nyStd, 'A.G.3, A.G.4');
  });
  test('ExamView import keeps them apart', async (t) => {
    const file = privateFixtures('.bnk').find(f => /AICCSS2018-2019/.test(f));
    if (!file) return t.skip('private bank not here');
    await reset(); await gotoTab(page, 'io');
    await page.setInputFiles('#bnkFile', file);
    await page.waitForSelector('#bnkRes.ok', { timeout: 30000 });
    const list = await qs();
    assert.equal(list.length, 222);
    assert.ok(!list.some(q => /NY:/.test(q.standard)), 'no NY: codes left in Standard');
    const q1 = list.find(q => q.ref === '011801ai');
    assert.equal(q1.standard, 'A.REI.A.1'); assert.equal(q1.nyStd, 'A.N.1');
  });
});

describe('needs attention', () => {
  test('checks', async () => {
    await reset();
    const ids = await add([{ answer: -1 }, { standard: '' }, { unit: '', section: '' }, { standard: 'G.CO.A.1', cluster: '' }, { standard: 'A.SSE.A.2, NY: A.A.2' }, { type: 'tf', answer: '' }, { type: 'es', answer: '' }]);
    const r = await page.evaluate((ids) => { const T = window.__tb, by = {}; T.state.questions.forEach(q => { by[q.id] = q; }); return ids.map(id => ['noans', 'nostd', 'nounit', 'nosec', 'nocl', 'mixed'].filter(k => T.fn.needs(by[id], k))); }, ids);
    assert.deepEqual(r[0], ['noans', 'nostd']);
    assert.ok(r[1].includes('nostd'));
    assert.deepEqual(r[2].filter(k => k === 'nounit' || k === 'nosec'), ['nounit', 'nosec']);
    assert.ok(r[3].includes('nocl'));
    assert.ok(r[4].includes('mixed'));
    assert.ok(r[5].includes('noans'), 'true/false with no answer');
    assert.ok(!r[6].includes('noans'), 'open response needs no answer');
  });
  test('filter shows only those questions', async () => {
    await reset();
    await add([{ html: 'Has answer', standard: 'A.1' }, { html: 'Missing answer', answer: -1, standard: 'A.1' }]);
    await page.evaluate(() => { const u = window.__tb.ui(); u.moreF = true; window.__tb.render(); });
    await page.selectOption('#fneed', 'noans');
    const shown = await page.$$eval('#qlist .qcard', els => els.map(e => e.textContent));
    assert.equal(shown.length, 1); assert.match(shown[0], /Missing answer/);
    assert.match(await page.textContent('#chips'), /Needs attention: No correct answer/);
  });
});

describe('Change these…', () => {
  test('sets a detail on every shown question, with undo', async () => {
    await reset();
    await add([{ topic: 'Old' }, { topic: 'Old' }, { topic: 'Other', unit: '2' }]);
    await page.selectOption('#fu', '1');
    await page.click('#setUnit');
    await page.selectOption('#bkF', 'topic');
    await page.fill('#bkV', 'Linear equations');
    await page.click('#bkGo');
    let list = await qs();
    assert.deepEqual(list.map(q => q.topic), ['Linear equations', 'Linear equations', 'Other']);
    await page.click('#toast button');
    list = await qs();
    assert.deepEqual(list.map(q => q.topic), ['Old', 'Old', 'Other']);
  });
  test('add, find and replace, clear; only the ticked ones', async () => {
    await reset();
    const ids = await add([{ standard: 'A.REI.B.4' }, { standard: 'A.REI.B.4', notes: 'calc ok' }, { standard: 'F.IF.A.2' }]);
    await page.click('#setUnit');
    await page.selectOption('#bkF', 'standard'); await page.selectOption('#bkA', 'add'); await page.fill('#bkV', 'A.SSE.A.1');
    await page.click('#bkGo');
    assert.deepEqual((await qs()).map(q => q.standard), ['A.REI.B.4, A.SSE.A.1', 'A.REI.B.4, A.SSE.A.1', 'F.IF.A.2, A.SSE.A.1']);
    await page.click('#setUnit');
    await page.selectOption('#bkF', 'standard'); await page.selectOption('#bkA', 'replace'); await page.fill('#bkFind', ', A.SSE.A.1'); await page.fill('#bkV', '');
    await page.click('#bkGo');
    assert.deepEqual((await qs()).map(q => q.standard), ['A.REI.B.4', 'A.REI.B.4', 'F.IF.A.2']);
    await page.evaluate((id) => { window.__tb.state.selected = [id]; window.__tb.render(); }, ids[1]);
    await page.click('#setUnit');
    await page.selectOption('#bkF', 'notes'); await page.selectOption('#bkA', 'clear');
    await page.selectOption('#bkW', 'ticked');
    await page.click('#bkGo');
    assert.deepEqual((await qs()).map(q => q.notes), ['', '', '']);
  });
  test('changing the standard updates a cluster that came from it', async () => {
    await reset();
    await add([{ standard: 'A.REI.B.4', cluster: 'A.REI.B' }, { standard: 'A.REI.B.4', cluster: 'Custom' }]);
    await page.click('#setUnit');
    await page.selectOption('#bkF', 'standard'); await page.fill('#bkV', 'F.IF.A.2'); await page.click('#bkGo');
    assert.deepEqual((await qs()).map(q => q.cluster), ['F.IF.A', 'Custom']);
  });
});

describe('Check & clean up', () => {
  test('moves NY codes, fills clusters, copies units, shows missing answers', async () => {
    await reset();
    await add([
      { html: 'A', standard: 'A.REI.A.1, NY: A.N.1', cluster: '' },
      { html: 'B', standard: 'A.REI.B.4', unit: '3', section: '3.2' },
      { html: 'C', standard: 'A.REI.B.4', unit: '', section: '' },
      { html: 'D', standard: 'G.CO.A.1', cluster: '', answer: -1 },
    ]);
    await page.click('#cleanBtn');
    await page.waitForSelector('.dialog.cleanup');
    const text = await page.textContent('.dialog.cleanup');
    assert.match(text, /1 question has an old NY code/); assert.match(text, /no correct answer/);
    await page.click('[data-fix="mixed"]');
    let list = await qs();
    assert.equal(list[0].standard, 'A.REI.A.1'); assert.equal(list[0].nyStd, 'A.N.1');
    await page.click('[data-fix="units"]');
    list = await qs();
    assert.equal(list[2].unit, '3'); assert.equal(list[2].section, '3.2');
    await page.click('[data-fix="nocl"]');
    list = await qs();
    assert.equal(list[3].cluster, 'G.CO.A');
    await page.click('#toast button'); // undo the last fix
    assert.equal((await qs())[3].cluster, '');
    await page.click('[data-show="noans"]');
    assert.equal(await page.$('.dialog.cleanup'), null);
    const shown = await page.$$eval('#qlist .qcard', els => els.length);
    assert.equal(shown, 1);
  });
  test('says when everything looks good', async () => {
    await reset();
    await add([{ standard: 'A.REI.B.4', cluster: 'A.REI.B' }]);
    await page.click('#cleanBtn');
    assert.match(await page.textContent('.dialog.cleanup'), /Everything looks good/);
    await page.keyboard.press('Escape');
    assert.equal(await page.$('.dialog.cleanup'), null);
  });
});

describe('her own fields', () => {
  test('add on Import & backup, fill in the editor, filter, delete with undo', async () => {
    await reset();
    await add([{ html: 'First' }, { html: 'Second' }]);
    await gotoTab(page, 'bank', 'fields');
    await page.fill('#newField', 'DOK'); await page.click('#addField');
    const f = await page.evaluate(() => window.__tb.state.fields);
    assert.equal(f.length, 1); assert.equal(f[0].label, 'DOK');
    await gotoTab(page, 'bank');
    await page.click('[data-edit]');
    await page.fill('[data-xf="' + f[0].id + '"]', '2');
    await page.fill('#e-ny', 'A.A.7');
    await page.click('#e-save');
    let list = await qs();
    assert.deepEqual(list[0].extra, { [f[0].id]: '2' }); assert.equal(list[0].nyStd, 'A.A.7');
    assert.equal(list[1].extra, undefined);
    assert.match(await page.textContent('#qlist'), /DOK: 2/);
    // filter
    await page.evaluate(() => { window.__tb.ui().moreF = true; window.__tb.render(); });
    await page.selectOption('[data-xff="' + f[0].id + '"]', '2');
    assert.equal(await page.$$eval('#qlist .qcard', e => e.length), 1);
    await page.click('#clearF');
    // bulk set
    await page.click('#setUnit'); await page.selectOption('#bkF', 'x:' + f[0].id); await page.fill('#bkV', '3'); await page.click('#bkGo');
    list = await qs();
    assert.deepEqual(list.map(q => q.extra[f[0].id]), ['3', '3']);
    // delete the field
    await gotoTab(page, 'bank', 'fields');
    await page.click('[data-fdel]'); await page.click('[data-fdel]');
    assert.equal((await page.evaluate(() => window.__tb.state.fields)).length, 0);
    assert.ok((await qs()).every(q => !q.extra));
    await page.click('#toast button');
    assert.equal((await page.evaluate(() => window.__tb.state.fields)).length, 1);
    assert.deepEqual((await qs()).map(q => q.extra[f[0].id]), ['3', '3']);
  });
  test('a field can be added from the editor', async () => {
    await reset();
    await add([{ html: 'Only' }]);
    await gotoTab(page, 'bank');
    await page.click('[data-edit]');
    await page.click('#e-addf'); await page.fill('#e-newf', 'Difficulty'); await page.press('#e-newf', 'Enter');
    const id = await page.evaluate(() => window.__tb.state.fields[0].id);
    await page.fill('[data-xf="' + id + '"]', 'hard'); await page.click('#e-save');
    assert.equal((await qs())[0].extra[id], 'hard');
  });
  test('old saved data keeps loading', async () => {
    const s = await page.evaluate(() => window.__tb.normalize({ questions: [{ id: 'a', type: 'tf', html: 'Q', answer: 'T', extra: [] }, { id: 'b', type: 'tf', html: 'Q', answer: 'T', extra: { f1: 'x' } }], fields: [{ id: 'f1', label: 'DOK' }, { id: 'f1', label: 'dup' }, null] }));
    assert.equal(s.questions[0].extra, undefined); assert.deepEqual(s.questions[1].extra, { f1: 'x' });
    assert.deepEqual(s.fields, [{ id: 'f1', label: 'DOK' }]);
    assert.equal(s.questions[0].nyStd, '');
  });
});

describe('bank files', () => {
  test('save and open again: adds new questions, updates changed ones, maps fields by name', async () => {
    await reset();
    await page.evaluate(() => { window.__tb.fn.addField('DOK'); });
    const fid = await page.evaluate(() => window.__tb.state.fields[0].id);
    await add([{ bank: 'Unit 3 bank', html: 'One', extra: { [fid]: '1' } }, { bank: 'Unit 3 bank', html: 'Two' }, { bank: 'Other', html: 'Three' }]);
    const data = await fn(page, 'bankFileData', 'Unit 3 bank');
    assert.equal(data.kind, 'bank'); assert.equal(data.questions.length, 2); assert.deepEqual(data.fields.map(f => f.label), ['DOK']);
    assert.equal(await fn(page, 'bankFileName', 'Unit 3: a/b?'), 'Unit 3- a-b-.json');
    // "save" with downloads (no folder picker in the test browser)
    await gotoTab(page, 'io', 'banks');
    await page.evaluate(() => { window.showDirectoryPicker = undefined; });
    await page.$$eval('[data-bf]', els => els.forEach(e => { e.checked = e.value === 'Unit 3 bank'; }));
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bfSave')]);
    const file = path.join(OUT, 'bank-file.json');
    await dl.saveAs(file);
    assert.equal(dl.suggestedFilename(), 'Unit 3 bank.json');
    // a teacher with a different field id for DOK, and one of the questions edited in the file
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    saved.fields = [{ id: 'other', label: 'dok' }];
    saved.questions.forEach(q => { if (q.extra) { q.extra = { other: q.extra[fid] }; } });
    saved.questions[1].html = 'Two (fixed)';
    saved.questions.push(Object.assign({}, saved.questions[0], { id: 'brandnew', html: 'Four <img src=x onerror=alert(1)>' }));
    fs.writeFileSync(file, JSON.stringify(saved));
    await page.setInputFiles('#bfIn', file);
    await page.waitForFunction(() => /Added/.test(document.querySelector('#bfRes')?.textContent || '')); // not the "Saved…" message from before
    assert.match(await page.textContent('#bfRes'), /Added 1 question, updated 1 question, 1 question already up to date/);
    const list = await qs();
    assert.equal(list.length, 4);
    assert.equal(list.find(q => q.html.startsWith('Two')).html, 'Two (fixed)');
    const nq = list.find(q => q.id === 'brandnew');
    assert.deepEqual(nq.extra, { [fid]: '1' }, 'field matched by name');
    assert.ok(!/onerror/.test(nq.html), 'shared files are cleaned like any import');
    assert.equal((await page.evaluate(() => window.__tb.state.fields)).length, 1);
    await page.click('#toast button');
    assert.equal((await qs()).length, 3);
  });
  test('a bank file updates questions you have from the same bank and exam (same reference), keeping their id and your details', async () => {
    await reset();
    const r = await page.evaluate(() => {
      const T = window.__tb, c = T.state.course;
      T.state.questions.push(T.normalize({ questions: [{ id: 'mine1', type: 'mc', html: 'Old', choices: ['a', 'b'], answer: 0, bank: 'GEO', ref: '062502geo', unit: '6', topic: 'Using Trigonometry to Find a Side', courses: [c] }] }).questions[0]);
      const res = T.fn.importBankData([{ name: 'geo.json', data: { app: 'test-builder', kind: 'bank', version: 1, bank: 'GEO', questions: [
        { id: 'fromfolder', type: 'mc', html: 'New <img class="q-img" src="data:image/png;base64,iVBORw0KGgo=">', choices: ['a', 'b', 'c'], answer: 2, bank: 'GEO', ref: '062502geo', unit: '', topic: 'Trigonometry', subtopic: 'find a side using a trig ratio', courses: [c] },
        { id: 'other', type: 'es', html: 'Another', bank: 'GEO', ref: '062503geo', courses: [c] }] } }]);
      const q = T.state.questions.find(x => x.ref === '062502geo');
      return { added: res.added, updated: res.updated, id: q.id, html: q.html.slice(0, 3), unit: q.unit, topic: q.topic, sub: q.subtopic, answer: q.answer, n: T.state.questions.filter(x => x.ref === '062502geo').length };
    });
    assert.deepEqual(r, { added: 1, updated: 1, id: 'mine1', html: 'New', unit: '6', topic: 'Trigonometry', sub: 'find a side using a trig ratio', answer: 2, n: 1 }, 'her unit stays; the file\'s new topic replaces the old one');
  });
  test('a combined bank file (new bank name) moves the questions you have into it: by reference, or by exact text without one', async () => {
    await reset();
    const r = await page.evaluate(() => {
      const T = window.__tb, c = T.state.course, Q = (id, bank, ref, html, extra) => Object.assign({ id, type: 'mc', html, choices: ['a', 'b'], answer: 0, bank, ref, courses: [c] }, extra || {});
      T.state.questions.push(...T.normalize({ questions: [Q('a1', 'AI 2013', '061501ai', 'One', { unit: '3' }), Q('a2', 'AI 2016', '061601ai', 'Two'), Q('a3', 'AI 2013', '', 'What is x?'),
        Q('d1', 'AI 2013', '081599ai', 'Dup'), Q('d2', 'My copy', '081599ai', 'Dup')] }).questions); // the same reference twice: never guessed
      const res = T.fn.importBankData([{ name: 'all.json', data: { app: 'test-builder', kind: 'bank', version: 1, bank: 'AI all', questions: [
        Q('f1', 'AI all', '061501ai', 'One', { topic: 'Lines' }), Q('f2', 'AI all', '061601ai', 'Two'), Q('f3', 'AI all', '', 'What is <i>x</i>?'), Q('f4', 'AI all', '081599ai', 'Dup')] } }]);
      const by = {}; T.state.questions.forEach(q => (by[q.bank] = by[q.bank] || []).push(q.id));
      return { added: res.added, updated: res.updated, by, a1: (({ unit, topic }) => ({ unit, topic }))(T.state.questions.find(q => q.id === 'a1')) };
    });
    assert.deepEqual(r, { added: 1, updated: 3, by: { 'AI all': ['a1', 'a2', 'a3', 'f4'], 'AI 2013': ['d1'], 'My copy': ['d2'] }, a1: { unit: '3', topic: 'Lines' } });
  });
  test('a backup file is not taken as a bank file', async () => {
    await reset();
    const r = await page.evaluate(() => window.__tb.fn.importBankData([{ name: 'backup.json', data: { app: 'test-builder', version: 1, state: { questions: [] } } }]));
    assert.deepEqual(r.bad, ['backup.json']);
  });
  test('no page errors', () => { assert.deepEqual(errors, []); });
});
