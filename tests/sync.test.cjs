// End to end: the website version in a browser, signed in to the Docker server, syncing between two computers.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { launch, openApp, startServer, api } = require('./helpers.cjs');

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
let srv, browser;
before(async () => {
  srv = await startServer();
  browser = await launch();
  const A = api(srv.url), t = (await A.login('admin@example.com', 'admin-password-1')).json.access_token;
  await A.call('POST', '/admin/api/users', { token: t, body: { email: 'teacher@example.com', password: 'teacher-pass-1' } });
  await A.call('POST', '/admin/api/users', { token: t, body: { email: 'saver@example.com', password: 'saver-pass-1' } });
});
after(async () => { await browser.close(); await srv.stop(); });

async function signIn(email = 'teacher@example.com', password = 'teacher-pass-1') {
  const s = await openApp(browser, srv.url);
  await s.page.waitForSelector('#le');
  await s.page.fill('#le', email); await s.page.fill('#lp', password); await s.page.click('#lgo');
  await s.page.waitForFunction(() => window.__tb && document.querySelector('#tabs'), null, { timeout: 15000 });
  return s;
}
// Syncs and waits until any sync already running has finished too.
async function syncNow(page) {
  await page.evaluate(() => CLOUD.sync());
  await page.waitForFunction(() => CLOUD.status() === 'Synced', null, { timeout: 15000 });
  await page.evaluate(() => CLOUD.sync());
  await page.waitForFunction(() => CLOUD.status() === 'Synced', null, { timeout: 15000 });
}
async function serverHas(token, check) {
  const A = api(srv.url);
  for (let i = 0; i < 100; i++) {
    const st = (await A.call('GET', '/rest/v1/app_state', { token })).json;
    const qs = (await A.call('GET', '/rest/v1/questions', { token })).json;
    if (check(st && st[0] && st[0].data, qs)) return;
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('server never got the change');
}

describe('website version', () => {
  test('saved tests sync to another computer, with their pictures uploaded', async () => {
    const a = await signIn('saver@example.com', 'saver-pass-1');
    await a.page.evaluate(png => {
      const T = window.__tb, st = T.state;
      st.questions.push({ id: 'sv-1', course: st.course, type: 'mc', html: 'Saved one <img src="' + png + '">', choices: ['a', 'b'], answer: 0, bank: 'B', points: 2 });
      T.state = T.normalize(st); T.state.selected = ['sv-1'];
      T.fn.saveTest({ name: 'Synced exam' });
    }, PNG);
    await a.page.evaluate(() => window.__tb.fn.persist());
    await syncNow(a.page);
    const b = await signIn('saver@example.com', 'saver-pass-1');
    await b.page.waitForFunction(() => (window.__tb.state.savedTests || []).some(t => t.name === 'Synced exam'), null, { timeout: 15000 });
    const html = await b.page.evaluate(() => window.__tb.state.savedTests.find(t => t.name === 'Synced exam').questions[0].html);
    assert.doesNotMatch(html, /data:image/, 'the saved copy points at the uploaded picture');
    await a.context.close(); await b.context.close();
  });

  test('wrong password shows a message', async () => {
    const s = await openApp(browser, srv.url);
    await s.page.waitForSelector('#le');
    await s.page.fill('#le', 'teacher@example.com'); await s.page.fill('#lp', 'wrong-password'); await s.page.click('#lgo');
    await s.page.waitForFunction(() => document.querySelector('#lerr') && document.querySelector('#lerr').textContent.trim().length > 0);
    await s.context.close();
  });

  test('questions, settings and pictures sync to another computer, and deletes follow', async () => {
    const a = await signIn();
    await a.page.evaluate(png => {
      const T = window.__tb, st = T.state;
      st.questions.push({ id: 'sync-1', course: st.course, type: 'mc', html: 'Synced question <img src="' + png + '">', choices: ['a', 'b'], answer: 1, bank: 'B', points: 2 });
      st.questions.push({ id: 'sync-2', course: st.course, type: 'es', html: 'Will be deleted', choices: [], answer: '', bank: 'B', points: 4 });
      st.settings.unitNum = '8';
      T.state = T.normalize(st);
    }, PNG);
    await a.page.evaluate(() => window.__tb.fn.persist());
    await syncNow(a.page);
    const tok = await a.page.evaluate(() => JSON.parse(localStorage.getItem('alctb-session')).access);
    await serverHas(tok, (st, qs) => st && st.settings && st.settings.unitNum === '8' && qs.length === 2);

    const b = await signIn();
    await b.page.waitForFunction(() => window.__tb.state.questions.length === 2, null, { timeout: 10000 });
    const q = await b.page.evaluate(() => window.__tb.state.questions.find(x => x.id === 'sync-1'));
    assert.match(q.html, /Synced question/);
    assert.match(q.html, new RegExp('src="' + srv.url.replace(/[.]/g, '\\.') + '/storage/v1/object/public/images/'), 'picture uploaded to the server');
    await b.page.waitForFunction(() => window.__tb.state.settings.unitNum === '8', null, { timeout: 10000 });
    const shown = await b.page.evaluate(() => window.__tb.fn.sanitize(window.__tb.state.questions.find(x => x.id === 'sync-1').html));
    assert.match(shown, /<img/, 'picture survives cleaning on an http:// server');

    await a.page.evaluate(() => { const st = window.__tb.state; st.questions = st.questions.filter(x => x.id !== 'sync-2'); });
    await a.page.evaluate(() => window.__tb.fn.persist());
    await syncNow(a.page);
    await syncNow(b.page);
    await b.page.waitForFunction(() => !window.__tb.state.questions.some(x => x.id === 'sync-2'), null, { timeout: 10000 });

    assert.deepEqual(a.errors, []); assert.deepEqual(b.errors, []);
    await a.context.close(); await b.context.close();
  });

  test('an edit made while an upload is still running is not lost', async () => {
    const a = await signIn();
    await syncNow(a.page);
    await a.page.evaluate(() => {
      const T = window.__tb, st = T.state;
      st.questions.push({ id: 'race-1', course: st.course, type: 'es', html: 'First version', choices: [], answer: '', bank: 'B', points: 4 });
      T.state = T.normalize(st);
    });
    // slow down uploads so the edit lands in the middle of one
    await a.page.route('**/rest/v1/questions*', async route => {
      if (route.request().method() === 'POST') await new Promise(r => setTimeout(r, 800));
      await route.continue();
    });
    const running = a.page.evaluate(() => CLOUD.sync());
    await a.page.waitForTimeout(300);
    await a.page.evaluate(() => { window.__tb.state.questions.find(q => q.id === 'race-1').html = 'Edited during upload'; });
    await running;
    await a.page.unroute('**/rest/v1/questions*');
    await syncNow(a.page);
    const tok = await a.page.evaluate(() => JSON.parse(localStorage.getItem('alctb-session')).access);
    await serverHas(tok, (st, qs) => qs.some(q => q.id === 'race-1' && q.data.html === 'Edited during upload'));
    await a.context.close();
  });

  test('another teacher does not see these questions', async () => {
    const A = api(srv.url), t = (await A.login('admin@example.com', 'admin-password-1')).json.access_token;
    await A.call('POST', '/admin/api/users', { token: t, body: { email: 'other@example.com', password: 'other-pass-123' } });
    const c = await signIn('other@example.com', 'other-pass-123');
    await syncNow(c.page);
    assert.equal(await c.page.evaluate(() => window.__tb.state.questions.length), 0);
    await c.context.close();
  });

  test('Manage accounts appears for the admin only', async () => {
    const a = await signIn('admin@example.com', 'admin-password-1');
    assert.equal(await a.page.evaluate(() => CLOUD.user().admin), true);
    await a.context.close();
    const t = await signIn();
    assert.equal(await t.page.evaluate(() => CLOUD.user().admin), false);
    await t.context.close();
  });
});

describe('shared library and her own fields (website version)', () => {
  test('her fields sync; a shared bank can be added by another teacher', async () => {
    const A = api(srv.url), t = (await A.login('admin@example.com', 'admin-password-1')).json.access_token;
    await A.call('POST', '/admin/api/users', { token: t, body: { email: 'sharer@example.com', password: 'sharer-pass-1' } });
    await A.call('POST', '/admin/api/users', { token: t, body: { email: 'taker@example.com', password: 'taker-pass-1' } });
    const a = await signIn('sharer@example.com', 'sharer-pass-1');
    await a.page.evaluate(() => {
      const T = window.__tb, st = T.state, f = T.fn.addField('DOK');
      st.questions.push({ id: 'lib-1', course: st.course, type: 'tf', html: 'Shared one', answer: 'T', bank: 'Shared bank', points: 1, extra: { [f.id]: '2' } });
      T.state = T.normalize(st); T.ui().tab = 'io'; T.render();
    });
    await a.page.evaluate(() => window.__tb.fn.persist());
    await syncNow(a.page);
    // the field list follows her to another computer
    const a2 = await signIn('sharer@example.com', 'sharer-pass-1');
    await a2.page.waitForFunction(() => (window.__tb.state.fields || []).some(f => f.label === 'DOK'), null, { timeout: 15000 });
    await a2.context.close();
    // share it from Import & backup
    await a.page.waitForSelector('#libShare');
    await a.page.selectOption('#libBank', 'Shared bank');
    await a.page.click('#libShare');
    await a.page.waitForSelector('#libRes.ok');
    await a.page.waitForSelector('[data-libadd="Shared bank.json"]');
    await a.context.close();
    // another teacher adds it
    const b = await signIn('taker@example.com', 'taker-pass-1');
    await b.page.waitForFunction(() => Array.isArray(window.__tb.state.courses));
    await b.page.evaluate(() => { window.__tb.ui().tab = 'io'; window.__tb.render(); });
    await b.page.waitForSelector('[data-libadd="Shared bank.json"]');
    assert.match(await b.page.textContent('#libList'), /shared by sharer@example.com/);
    assert.equal(await b.page.$('[data-libdel="Shared bank.json"]'), null, 'cannot remove someone else’s bank');
    await b.page.click('[data-libadd="Shared bank.json"]');
    await b.page.waitForSelector('#libRes.ok');
    const r = await b.page.evaluate(() => { const T = window.__tb.state; return { q: T.questions.find(q => q.id === 'lib-1'), f: T.fields }; });
    assert.equal(r.q.html, 'Shared one'); assert.equal(r.f[0].label, 'DOK'); assert.equal(r.q.extra[r.f[0].id], '2');
    await b.context.close();
  });
});

describe('public banks shared with colleagues (website version)', () => {
  test('make a bank public; a colleague uses it read-only, copies a question, and loses it when it goes private', async () => {
    const A = api(srv.url), t = (await A.login('admin@example.com', 'admin-password-1')).json.access_token;
    await A.call('POST', '/admin/api/users', { token: t, body: { email: 'regents@example.com', password: 'regents-pass-1' } });
    await A.call('POST', '/admin/api/users', { token: t, body: { email: 'colleague@example.com', password: 'colleague-pass-1' } });
    const a = await signIn('regents@example.com', 'regents-pass-1');
    await a.page.evaluate(() => {
      const T = window.__tb, st = T.state;
      st.questions.push({ id: 'pub-1', course: st.course, type: 'tf', html: 'A Regents question', answer: 'T', bank: 'Regents bank', ref: '061901ge', points: 2 });
      st.questions.push({ id: 'priv-1', course: st.course, type: 'tf', html: 'A textbook question', answer: 'F', bank: 'Textbook bank', points: 1 });
      T.state = T.normalize(st); T.ui().tab = 'io'; T.render();
    });
    // Make public asks for a second click
    await a.page.click('[data-pub="Regents bank"]');
    assert.match(await a.page.textContent('[data-pub="Regents bank"]'), /Confirm/);
    await a.page.click('[data-pub="Regents bank"]');
    await a.page.waitForSelector('[data-pub="Regents bank"][data-to="private"]');
    assert.equal(await a.page.getAttribute('[data-pub="Textbook bank"]', 'data-to'), 'public', 'other banks stay private');
    await a.page.evaluate(() => window.__tb.fn.persist());
    await syncNow(a.page);

    const b = await signIn('colleague@example.com', 'colleague-pass-1');
    await syncNow(b.page);
    await b.page.evaluate(() => { window.__tb.ui().tab = 'io'; window.__tb.render(); });
    await b.page.waitForSelector('#sharedCard [data-shuse]');
    const card = await b.page.textContent('#sharedCard');
    assert.match(card, /Regents bank/); assert.match(card, /shared by regents@example.com/); assert.doesNotMatch(card, /Textbook/);
    const course = await b.page.evaluate(() => window.__tb.state.course);
    assert.equal(await b.page.evaluate(() => window.__tb.fn.cq().length), 0, 'not in any course until she picks one');
    await b.page.check('#sharedCard [data-shuse="0"][value="' + course + '"]');
    await b.page.evaluate(() => { window.__tb.ui().tab = 'bank'; window.__tb.render(); });
    await b.page.waitForSelector('#qlist .qcard');
    assert.match(await b.page.textContent('#qlist'), /Shared by regents@example.com/);
    assert.equal(await b.page.$('#qlist [data-edit="pub-1"]'), null, 'no Edit on someone else’s question');
    // Copy to mine: her own private copy that remembers where it came from
    await b.page.click('#qlist [data-dup="pub-1"]');
    const copy = await b.page.evaluate(() => window.__tb.state.questions.find(q => q.origin && q.origin.id === 'pub-1'));
    assert.ok(copy && !copy.owner && !copy.visibility && copy.html === 'A Regents question');
    await b.page.evaluate(() => window.__tb.fn.persist());
    await syncNow(b.page);
    // the server has her copy and her course choice, never the original as hers
    const bt = (await A.login('colleague@example.com', 'colleague-pass-1')).json.access_token;
    await serverHas(bt, (st, qs) => qs.some(q => q.id === copy.id) && st && st.use && st.use['pub-1']);
    assert.ok(!(await A.call('GET', '/rest/v1/questions', { token: bt })).json.some(q => q.id === 'pub-1'));
    // her other computer gets the shared bank in the same course
    const b2 = await signIn('colleague@example.com', 'colleague-pass-1');
    await b2.page.waitForFunction(c => { const q = window.__tb.state.questions.find(x => x.id === 'pub-1'); return q && q.courses.includes(c); }, course, { timeout: 15000 });
    await b2.context.close();
    // the owner makes it private again: it disappears for the colleague (her copy stays)
    await a.page.evaluate(() => { window.__tb.ui().tab = 'io'; window.__tb.render(); });
    await a.page.click('[data-pub="Regents bank"][data-to="private"]');
    await a.page.evaluate(() => window.__tb.fn.persist());
    await syncNow(a.page);
    await syncNow(b.page);
    const left = await b.page.evaluate(() => window.__tb.state.questions.map(q => q.id));
    assert.ok(!left.includes('pub-1')); assert.ok(left.includes(copy.id));
    await a.context.close(); await b.context.close();
  });
});
