// The Docker server (docker/server.js): sign-in, accounts, questions, settings, pictures, admin.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { startServer, api, TEST_DB, freshDatabase } = require('./helpers.cjs');

let srv, A, admin;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');

before(async () => {
  srv = await startServer();
  A = api(srv.url);
  admin = (await A.login('admin@example.com', 'admin-password-1')).json;
});
after(async () => { await srv.stop(); });

async function newUser(email, password = 'colleague-pass-1', isAdmin = false) {
  const r = await A.call('POST', '/admin/api/users', { token: admin.access_token, body: { email, password, admin: isAdmin } });
  assert.equal(r.status, 201, r.text);
  return (await A.login(email, password)).json;
}

describe('basics', () => {
  test('health check reports the version', async () => {
    const r = await A.call('GET', '/healthz');
    const v = fs.readFileSync(path.join(__dirname, '..', 'VERSION'), 'utf8').trim();
    assert.deepEqual(r.json, { ok: true, version: v });
  });
  test('serves the app and its settings', async () => {
    const page = await A.call('GET', '/');
    assert.equal(page.status, 200); assert.match(page.text, /ALittleCandleTestBuilder/);
    const cfg = await A.call('GET', '/config.js');
    assert.match(cfg.text, /selfHosted:true/);
  });
  test('the app page can be cached and revalidated', async () => {
    const r = await A.call('GET', '/');
    const etag = r.headers.get('etag');
    assert.ok(etag);
    const r2 = await fetch(srv.url + '/', { headers: { 'If-None-Match': etag } });
    assert.equal(r2.status, 304);
  });
  test('security headers are set', async () => {
    const r = await A.call('GET', '/');
    assert.ok(r.headers.get('x-content-type-options'));
  });
  test('unknown pages are 404', async () => {
    assert.equal((await A.call('GET', '/nope', { token: admin.access_token })).status, 404);
  });
});

describe('sign-in', () => {
  test('first admin account is created from ADMIN_EMAIL / ADMIN_PASSWORD', () => {
    assert.ok(admin.access_token); assert.equal(admin.user.email, 'admin@example.com'); assert.equal(admin.user.admin, true);
  });
  test('email is not case-sensitive', async () => {
    assert.equal((await A.login('ADMIN@Example.com', 'admin-password-1')).status, 200);
  });
  test('wrong password is refused', async () => {
    const r = await A.login('admin@example.com', 'nope-nope-nope');
    assert.equal(r.status, 400); assert.match(r.text, /Invalid login/);
  });
  test('everything else needs a sign-in', async () => {
    for (const p of ['/auth/v1/user', '/rest/v1/questions', '/rest/v1/app_state', '/admin/api/users'])
      assert.equal((await A.call('GET', p)).status, 401, p);
    assert.equal((await A.call('GET', '/rest/v1/questions', { token: 'made-up-token' })).status, 401);
  });
  test('refresh token gives a new session and can only be used once', async () => {
    const s = (await A.login('admin@example.com', 'admin-password-1')).json;
    const r = await A.call('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: s.refresh_token } });
    assert.equal(r.status, 200); assert.ok(r.json.access_token);
    const again = await A.call('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: s.refresh_token } });
    assert.equal(again.status, 400);
  });
  test('an access token cannot be used as a refresh token', async () => {
    const s = (await A.login('admin@example.com', 'admin-password-1')).json;
    assert.equal((await A.call('POST', '/auth/v1/token?grant_type=refresh_token', { body: { refresh_token: s.access_token } })).status, 400);
  });
  test('sign out ends the session', async () => {
    const s = (await A.login('admin@example.com', 'admin-password-1')).json;
    await A.call('POST', '/auth/v1/logout', { token: s.access_token });
    assert.equal((await A.call('GET', '/auth/v1/user', { token: s.access_token })).status, 401);
    admin = (await A.login('admin@example.com', 'admin-password-1')).json;
  });
  test('password reset emails are not offered', async () => {
    assert.equal((await A.call('POST', '/auth/v1/recover', { body: { email: 'admin@example.com' } })).status, 400);
  });
  test('too many wrong passwords locks that email for a while', async () => {
    const u = await newUser('locky@example.com');
    assert.ok(u.access_token);
    for (let i = 0; i < 8; i++) await A.login('locky@example.com', 'wrong-password-' + i);
    const r = await A.login('locky@example.com', 'colleague-pass-1');
    assert.equal(r.status, 429);
  });
});

describe('your own password', () => {
  test('change it, then sign in with the new one', async () => {
    const u = await newUser('pw@example.com');
    assert.equal((await A.call('PUT', '/auth/v1/user', { token: u.access_token, body: { password: 'short' } })).status, 422);
    assert.equal((await A.call('PUT', '/auth/v1/user', { token: u.access_token, body: { password: 'a-brand-new-pass' } })).status, 200);
    assert.equal((await A.login('pw@example.com', 'colleague-pass-1')).status, 400);
    assert.equal((await A.login('pw@example.com', 'a-brand-new-pass')).status, 200);
  });
});

describe('questions and settings', () => {
  test('save, read back, update and soft-delete questions', async () => {
    const u = await newUser('q@example.com');
    const t = u.access_token;
    let r = await A.call('POST', '/rest/v1/questions', { token: t, body: [{ id: 'q1', data: { html: 'One' } }, { id: 'q2', data: { html: 'Two' } }] });
    assert.equal(r.status, 201);
    r = await A.call('GET', '/rest/v1/questions', { token: t });
    assert.deepEqual(r.json.map(x => [x.id, x.data.html, x.deleted]), [['q1', 'One', false], ['q2', 'Two', false]]);
    const since = r.json[1].updated_at;
    await new Promise(res => setTimeout(res, 20));
    await A.call('POST', '/rest/v1/questions', { token: t, body: [{ id: 'q1', data: { html: 'One edited' } }, { id: 'q2', data: {}, deleted: true }] });
    r = await A.call('GET', '/rest/v1/questions?updated_at=gt.' + encodeURIComponent(since), { token: t });
    assert.deepEqual(r.json.map(x => [x.id, x.data.html || null, x.deleted]).sort(), [['q1', 'One edited', false], ['q2', null, true]]);
  });
  test('paging with limit and offset', async () => {
    const u = await newUser('paging@example.com');
    await A.call('POST', '/rest/v1/questions', { token: u.access_token, body: Array.from({ length: 5 }, (_, i) => ({ id: 'p' + i, data: { i } })) });
    const a = await A.call('GET', '/rest/v1/questions?limit=2&offset=0', { token: u.access_token });
    const b = await A.call('GET', '/rest/v1/questions?limit=2&offset=4', { token: u.access_token });
    assert.equal(a.json.length, 2); assert.equal(b.json.length, 1);
  });
  test('bad requests are refused and nothing is half-saved', async () => {
    const u = await newUser('bad@example.com');
    assert.equal((await A.call('POST', '/rest/v1/questions', { token: u.access_token, body: { not: 'a list' } })).status, 400);
    const r = await A.call('POST', '/rest/v1/questions', { token: u.access_token, body: [{ id: 'ok', data: {} }, { id: '', data: {} }] });
    assert.equal(r.status, 400);
    assert.equal((await A.call('GET', '/rest/v1/questions', { token: u.access_token })).json.length, 0);
  });
  test('settings (app state) are saved per person', async () => {
    const u = await newUser('state@example.com');
    assert.deepEqual((await A.call('GET', '/rest/v1/app_state', { token: u.access_token })).json, []);
    await A.call('POST', '/rest/v1/app_state', { token: u.access_token, body: [{ data: { course: 'Geometry' } }] });
    assert.equal((await A.call('GET', '/rest/v1/app_state', { token: u.access_token })).json[0].data.course, 'Geometry');
  });
  test('each person sees only their own questions', async () => {
    const a = await newUser('alice@example.com'), b = await newUser('bob@example.com');
    await A.call('POST', '/rest/v1/questions', { token: a.access_token, body: [{ id: 'same-id', data: { html: 'Alice' } }] });
    await A.call('POST', '/rest/v1/questions', { token: b.access_token, body: [{ id: 'same-id', data: { html: 'Bob' } }] });
    assert.deepEqual((await A.call('GET', '/rest/v1/questions', { token: a.access_token })).json.map(x => x.data.html), ['Alice']);
    assert.deepEqual((await A.call('GET', '/rest/v1/questions', { token: b.access_token })).json.map(x => x.data.html), ['Bob']);
    const r = await A.call('POST', '/rest/v1/questions', { token: b.access_token, body: [{ id: 'x', user_id: a.user.id, data: {} }] });
    assert.equal(r.status, 403, 'cannot write into someone else’s bank');
  });
});

describe('pictures', () => {
  test('upload to your own folder, read without signing in', async () => {
    const u = await newUser('pics@example.com');
    const name = u.user.id + '/abcdef0123456789.png';
    const up = await A.call('POST', '/storage/v1/object/images/' + name, { token: u.access_token, body: PNG, raw: true });
    assert.equal(up.status, 200);
    const r = await fetch(srv.url + '/storage/v1/object/public/images/' + name);
    assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), PNG);
  });
  test('cannot upload into someone else’s folder or with a strange name', async () => {
    const u = await newUser('pics2@example.com');
    assert.equal((await A.call('POST', '/storage/v1/object/images/' + admin.user.id + '/abcdef0123456789.png', { token: u.access_token, body: PNG, raw: true })).status, 403);
    assert.ok([403, 404].includes((await A.call('POST', '/storage/v1/object/images/' + u.user.id + '/../../evil.png', { token: u.access_token, body: PNG, raw: true })).status));
    assert.equal((await A.call('POST', '/storage/v1/object/images/' + u.user.id + '/abcdef0123456789.html', { token: u.access_token, body: PNG, raw: true })).status, 403);
  });
  test('missing pictures are 404', async () => {
    assert.equal((await fetch(srv.url + '/storage/v1/object/public/images/' + admin.user.id + '/0000000000000000.png')).status, 404);
    assert.notEqual((await fetch(srv.url + '/storage/v1/object/public/images/../server.js')).status, 200);
    assert.equal((await fetch(srv.url + '/storage/v1/object/public/images/' + admin.user.id + '/..%2F..%2Fserver.js')).status, 404);
  });
});

describe('public questions (shared with colleagues)', () => {
  const shared = (t, since) => A.call('GET', '/rest/v1/questions?shared=1' + (since ? '&updated_at=gt.' + encodeURIComponent(since) : ''), { token: t });
  test('public questions reach colleagues with their owner; private ones never do', async () => {
    const a = await newUser('pub-a@example.com'), b = await newUser('pub-b@example.com');
    await A.call('POST', '/rest/v1/questions', { token: a.access_token, body: [{ id: 'reg1', data: { html: 'Regents', visibility: 'public' } }, { id: 'book1', data: { html: 'Textbook' } }] });
    const seen = (await shared(b.access_token)).json.filter(x => x.owner === a.user.id);
    assert.deepEqual(seen.map(x => [x.id, x.data.html, x.owner_email, x.deleted]), [['reg1', 'Regents', 'pub-a@example.com', false]]);
    assert.ok(!JSON.stringify((await shared(b.access_token)).json).includes('Textbook'), 'private text never leaves the server');
    // older apps (no shared=1) only ever get their own questions
    assert.ok((await A.call('GET', '/rest/v1/questions', { token: b.access_token })).json.every(x => !x.owner && x.id !== 'reg1'));
    // the owner sees their own as usual, without an owner field
    assert.deepEqual((await shared(a.access_token)).json.filter(x => x.id === 'reg1' || x.id === 'book1').map(x => [x.id, !!x.owner]).sort(), [['book1', false], ['reg1', false]]);
  });
  test('making it private again (or deleting it) takes it away from colleagues', async () => {
    const a = await newUser('pub-c@example.com'), b = await newUser('pub-d@example.com');
    await A.call('POST', '/rest/v1/questions', { token: a.access_token, body: [{ id: 'r1', data: { html: 'One', visibility: 'public' } }, { id: 'r2', data: { html: 'Two', visibility: 'public' } }] });
    const since = (await shared(b.access_token)).json.filter(x => x.owner === a.user.id).map(x => x.updated_at).sort().pop();
    await new Promise(res => setTimeout(res, 20));
    await A.call('POST', '/rest/v1/questions', { token: a.access_token, body: [{ id: 'r1', data: { html: 'One' } }, { id: 'r2', data: {}, deleted: true }] });
    const rows = (await shared(b.access_token, since)).json.filter(x => x.owner === a.user.id);
    assert.deepEqual(rows.map(x => [x.id, x.deleted, JSON.stringify(x.data)]).sort(), [['r1', true, '{}'], ['r2', true, '{}']]);
  });
  test('a colleague cannot change someone else’s public question', async () => {
    const a = await newUser('pub-e@example.com'), b = await newUser('pub-f@example.com');
    await A.call('POST', '/rest/v1/questions', { token: a.access_token, body: [{ id: 'mine', data: { html: 'Right', visibility: 'public' } }] });
    assert.equal((await A.call('POST', '/rest/v1/questions', { token: b.access_token, body: [{ id: 'mine', user_id: a.user.id, data: { html: 'Wrong' } }] })).status, 403);
    await A.call('POST', '/rest/v1/questions', { token: b.access_token, body: [{ id: 'mine', data: { html: 'B’s own' } }] }); // same id: B's own row, A's untouched
    const fromA = (await shared(b.access_token)).json.find(x => x.id === 'mine' && x.owner === a.user.id);
    assert.equal(fromA.data.html, 'Right');
  });
  test('removing an account keeps its public questions (the admin takes them over), private ones go', async () => {
    const a = await newUser('pub-leaving@example.com'), b = await newUser('pub-stays@example.com');
    await A.call('POST', '/rest/v1/questions', { token: a.access_token, body: [{ id: 'keep1', data: { html: 'Keep', visibility: 'public' } }, { id: 'gone1', data: { html: 'Gone' } }] });
    assert.equal((await A.call('DELETE', '/admin/api/users/' + a.user.id, { token: admin.access_token })).status, 200);
    const row = (await shared(b.access_token)).json.find(x => x.id === 'keep1');
    assert.equal(row.owner, admin.user.id); assert.equal(row.data.html, 'Keep');
    assert.ok(!(await shared(admin.access_token)).json.some(x => x.id === 'gone1'));
  });
});

describe('groups and team banks', () => {
  const shared = async (t) => (await A.call('GET', '/rest/v1/questions?shared=1&limit=1000', { token: t })).json;
  const put = (t, id, body) => A.call('PUT', '/team/v1/banks/' + id, { token: t, body });
  let owner, editor, member, outsider, gid;
  before(async () => {
    owner = await newUser('team-owner@example.com'); editor = await newUser('team-editor@example.com');
    member = await newUser('team-member@example.com'); outsider = await newUser('team-out@example.com');
    const g = await A.call('POST', '/admin/api/groups', { token: admin.access_token, body: { name: 'Geometry Team' } });
    assert.equal(g.status, 201); gid = g.json.id;
    assert.equal((await A.call('PUT', '/admin/api/groups/' + gid, { token: admin.access_token, body: { members: [owner.user.id, editor.user.id, member.user.id] } })).status, 200);
    await A.call('POST', '/rest/v1/questions', { token: owner.access_token, body: [{ id: 'tb1', data: { id: 'tb1', html: 'Textbook 1', bank: 'Book', courses: ['Geometry'] } }, { id: 'tb2', data: { id: 'tb2', html: 'Not shared' } }] });
  });
  test('only the admin manages groups; everyone can list groups and people', async () => {
    assert.equal((await A.call('POST', '/admin/api/groups', { token: owner.access_token, body: { name: 'Mine' } })).status, 403);
    const pp = (await A.call('GET', '/team/v1/people', { token: member.access_token })).json;
    assert.deepEqual(pp.groups.find(g => g.id === gid).members.sort(), [owner.user.id, editor.user.id, member.user.id].sort());
    assert.ok(pp.people.some(x => x.email === 'team-out@example.com') && pp.people.every(x => Object.keys(x).sort().join() === 'email,id'));
  });
  test('a private bank shared with a group: members see it, others never', async () => {
    const r = await put(owner.access_token, 'geo-book', { name: 'Geometry textbook', groups: [gid], editors: [editor.user.id], items: [{ o: owner.user.id, id: 'tb1' }] });
    assert.equal(r.status, 200, r.text);
    const m = await shared(member.access_token);
    const q = m.find(x => x.id === 'tb1');
    assert.equal(q.data.html, 'Textbook 1'); assert.equal(q.owner_email, 'team-owner@example.com'); assert.equal(q.can_edit, false);
    assert.ok(!m.some(x => x.id === 'tb2'), 'questions not in the bank stay private');
    assert.ok(!(await shared(outsider.access_token)).some(x => x.id === 'tb1'), 'not in the group: nothing');
    assert.equal((await shared(editor.access_token)).find(x => x.id === 'tb1').can_edit, true);
    const banks = (await A.call('GET', '/team/v1/banks', { token: member.access_token })).json;
    assert.deepEqual(banks.map(b => [b.name, b.role, b.manage]), [['Geometry textbook', 1, false]]);
    assert.deepEqual((await A.call('GET', '/team/v1/banks', { token: outsider.access_token })).json, []);
  });
  test('editors can change the questions (owner keeps bank, courses, visibility); members and outsiders cannot', async () => {
    const edit = (t, html) => A.call('POST', '/rest/v1/questions', { token: t, body: [{ id: 'tb1', user_id: owner.user.id, data: { id: 'tb1', html, bank: 'Hijacked', courses: ['X'], visibility: 'public' } }] });
    assert.equal((await edit(member.access_token, 'member')).status, 403);
    assert.equal((await edit(outsider.access_token, 'outsider')).status, 403);
    assert.equal((await edit(editor.access_token, 'Textbook 1 (fixed)')).status, 201);
    const mine = (await A.call('GET', '/rest/v1/questions', { token: owner.access_token })).json.find(x => x.id === 'tb1');
    assert.equal(mine.data.html, 'Textbook 1 (fixed)'); assert.equal(mine.data.bank, 'Book'); assert.deepEqual(mine.data.courses, ['Geometry']);
    assert.equal(mine.data.visibility, undefined); assert.equal(mine.data.changedBy, 'team-editor@example.com');
    assert.ok(!(await shared(outsider.access_token)).some(x => x.id === 'tb1'), 'still private');
    // deleting someone else's question is never allowed
    assert.equal((await A.call('POST', '/rest/v1/questions', { token: editor.access_token, body: [{ id: 'tb1', user_id: owner.user.id, data: {}, deleted: true }] })).status, 403);
  });
  test('editors add and remove questions but cannot rename or re-share; a bank never passes on others’ questions', async () => {
    await A.call('POST', '/rest/v1/questions', { token: editor.access_token, body: [{ id: 'ed1', data: { id: 'ed1', html: 'Editor’s own' } }] });
    await A.call('POST', '/rest/v1/questions', { token: outsider.access_token, body: [{ id: 'out1', data: { id: 'out1', html: 'Outsider private' } }] });
    const r = await put(editor.access_token, 'geo-book', { name: 'Renamed', groups: [], editors: [], items: [{ o: owner.user.id, id: 'tb1' }, { o: editor.user.id, id: 'ed1' }, { o: outsider.user.id, id: 'out1' }] });
    assert.equal(r.status, 200);
    const b = (await A.call('GET', '/team/v1/banks', { token: owner.access_token })).json.find(x => x.id === 'geo-book');
    assert.equal(b.name, 'Geometry textbook'); assert.deepEqual(b.groups, [gid]); assert.equal(b.items.length, 3);
    const m = await shared(member.access_token);
    assert.ok(m.some(x => x.id === 'ed1')); assert.ok(!m.some(x => x.id === 'out1'), 'outsider is not owner or editor: no access granted');
    assert.equal((await put(member.access_token, 'geo-book', { name: 'x', items: [] })).status, 403);
    assert.equal((await A.call('DELETE', '/team/v1/banks/geo-book', { token: editor.access_token })).status, 403);
  });
  test('leaving the group, or deleting the bank, takes the questions away', async () => {
    await A.call('PUT', '/admin/api/groups/' + gid, { token: admin.access_token, body: { members: [owner.user.id, editor.user.id] } });
    const m = await shared(member.access_token);
    assert.ok(!m.some(x => x.id === 'tb1' && !x.deleted), 'gone after leaving the group');
    assert.equal((await A.call('DELETE', '/team/v1/banks/geo-book', { token: owner.access_token })).status, 200);
    assert.ok(!(await shared(editor.access_token)).some(x => x.id === 'tb1' && !x.deleted));
    assert.equal((await A.call('GET', '/team/v1/banks', { token: editor.access_token })).json.length, 0);
  });
  test('bad bank ids and missing names are refused', async () => {
    assert.equal((await put(owner.access_token, 'bad id!', { name: 'x' })).status, 404);
    assert.equal((await put(owner.access_token, 'ok-id', { name: '  ' })).status, 422);
  });
});

describe('Manage accounts (admin)', () => {
  test('only admins can manage accounts', async () => {
    const u = await newUser('notadmin@example.com');
    assert.equal((await A.call('GET', '/admin/api/users', { token: u.access_token })).status, 403);
  });
  test('add: checks email, password length and duplicates', async () => {
    const t = admin.access_token;
    assert.equal((await A.call('POST', '/admin/api/users', { token: t, body: { email: 'not-an-email', password: 'long-enough-1' } })).status, 422);
    assert.equal((await A.call('POST', '/admin/api/users', { token: t, body: { email: 'short@example.com', password: 'short' } })).status, 422);
    await newUser('dup@example.com');
    assert.equal((await A.call('POST', '/admin/api/users', { token: t, body: { email: 'DUP@example.com', password: 'long-enough-1' } })).status, 409);
  });
  test('list shows accounts with question counts', async () => {
    const u = await newUser('counted@example.com');
    await A.call('POST', '/rest/v1/questions', { token: u.access_token, body: [{ id: 'a', data: {} }, { id: 'b', data: {} }, { id: 'c', data: {}, deleted: true }] });
    const list = (await A.call('GET', '/admin/api/users', { token: admin.access_token })).json;
    assert.equal(list.find(x => x.email === 'counted@example.com').questions, 2);
    assert.ok(list.every(x => Object.keys(x).sort().join() === 'admin,created_at,email,id,questions'), 'password hashes never leave the server');
  });
  test('reset a password signs that person out', async () => {
    const u = await newUser('reset@example.com');
    const r = await A.call('POST', '/admin/api/users/' + u.user.id + '/password', { token: admin.access_token, body: { password: 'temp-pass-123' } });
    assert.equal(r.status, 200);
    assert.equal((await A.call('GET', '/auth/v1/user', { token: u.access_token })).status, 401);
    assert.equal((await A.login('reset@example.com', 'temp-pass-123')).status, 200);
  });
  test('make someone an admin; you cannot remove your own admin access', async () => {
    const u = await newUser('promote@example.com');
    await A.call('POST', '/admin/api/users/' + u.user.id + '/admin', { token: admin.access_token, body: { admin: true } });
    assert.equal((await A.call('GET', '/admin/api/users', { token: (await A.login('promote@example.com', 'colleague-pass-1')).json.access_token })).status, 200);
    assert.equal((await A.call('POST', '/admin/api/users/' + admin.user.id + '/admin', { token: admin.access_token, body: { admin: false } })).status, 422);
  });
  test('delete an account removes their questions and pictures; you cannot delete yourself', async () => {
    const u = await newUser('gone@example.com');
    await A.call('POST', '/rest/v1/questions', { token: u.access_token, body: [{ id: 'z', data: {} }] });
    await A.call('POST', '/storage/v1/object/images/' + u.user.id + '/abcdef0123456789.png', { token: u.access_token, body: PNG, raw: true });
    assert.equal((await A.call('DELETE', '/admin/api/users/' + u.user.id, { token: admin.access_token })).status, 200);
    assert.equal((await A.login('gone@example.com', 'colleague-pass-1')).status, 400);
    assert.equal((await fetch(srv.url + '/storage/v1/object/public/images/' + u.user.id + '/abcdef0123456789.png')).status, 404);
    const list = (await A.call('GET', '/admin/api/users', { token: admin.access_token })).json;
    assert.ok(!list.some(x => x.email === 'gone@example.com'));
    assert.equal((await A.call('DELETE', '/admin/api/users/' + admin.user.id, { token: admin.access_token })).status, 422);
    assert.equal((await A.call('DELETE', '/admin/api/users/no-such-id', { token: admin.access_token })).status, 404);
  });
});

describe('restarts and ADMIN_RESET', () => {
  test('accounts and questions survive a restart', async () => {
    const s1 = await startServer();
    const a1 = api(s1.url), t = (await a1.login('admin@example.com', 'admin-password-1')).json.access_token;
    await a1.call('POST', '/rest/v1/questions', { token: t, body: [{ id: 'keep', data: { html: 'kept' } }] });
    await s1.stop();
    const s2 = await startServer({ DATA_DIR: s1.dataDir, ADMIN_PASSWORD: 'a-different-pass' });
    const a2 = api(s2.url);
    assert.equal((await a2.login('admin@example.com', 'a-different-pass')).status, 400, 'ADMIN_PASSWORD is only used the first time');
    const t2 = (await a2.login('admin@example.com', 'admin-password-1')).json.access_token;
    assert.equal((await a2.call('GET', '/rest/v1/questions', { token: t2 })).json[0].data.html, 'kept');
    await s2.stop();
    const s3 = await startServer({ DATA_DIR: s1.dataDir, ADMIN_PASSWORD: 'a-different-pass', ADMIN_RESET: '1' });
    assert.equal((await api(s3.url).login('admin@example.com', 'a-different-pass')).status, 200, 'ADMIN_RESET sets the new password');
    await s3.stop();
  });
});

describe('moving to PostgreSQL or MySQL', { skip: !TEST_DB && 'set TEST_DATABASE_URL to run' }, () => {
  test('the first start on a new database copies everything from the old SQLite file', async () => {
    const s1 = await startServer({ DATABASE_URL: '' });
    const a1 = api(s1.url), t = (await a1.login('admin@example.com', 'admin-password-1')).json.access_token;
    await a1.call('POST', '/rest/v1/questions', { token: t, body: [{ id: 'moved', data: { html: 'came along' } }, { id: 'gone', data: {}, deleted: true }] });
    await a1.call('POST', '/rest/v1/app_state', { token: t, body: [{ data: { course: 'Geometry' } }] });
    await s1.stop();
    const s2 = await startServer({ DATA_DIR: s1.dataDir, DATABASE_URL: await freshDatabase(TEST_DB), ADMIN_PASSWORD: 'ignored-pass-1' });
    assert.match(s2.log(), /Copied 1 account\(s\) and 2 question\(s\)/);
    const a2 = api(s2.url), t2 = (await a2.login('admin@example.com', 'admin-password-1')).json.access_token;
    const qs = (await a2.call('GET', '/rest/v1/questions', { token: t2 })).json;
    assert.deepEqual(qs.map(q => [q.id, q.deleted]).sort(), [['gone', true], ['moved', false]]);
    assert.equal((await a2.call('GET', '/rest/v1/app_state', { token: t2 })).json[0].data.course, 'Geometry');
    assert.ok(fs.existsSync(path.join(s1.dataDir, 'alctb.db')), 'the SQLite file is left in place');
    await s2.stop();
  });
});

describe('shared library (bank files)', () => {
  const bank = (name, n = 2) => ({ app: 'test-builder', kind: 'bank', version: 1, bank: name, courses: ['Algebra 1'], fields: [], questions: Array.from({ length: n }, (_, i) => ({ id: 'q' + i, type: 'tf', html: 'Q' + i, answer: 'T', bank: name })) });
  let T1, T2;
  before(async () => { T1 = await newUser('lib1@example.com'); T2 = await newUser('lib2@example.com'); });
  test('needs a sign-in', async () => {
    assert.equal((await A.call('GET', '/library/v1/banks')).status, 401);
  });
  test('share, list, download', async () => {
    const put = await A.call('PUT', '/library/v1/banks/' + encodeURIComponent('Algebra 1 Regents.json'), { token: T1.access_token, body: bank('Algebra 1 Regents', 3) });
    assert.equal(put.status, 200, put.text);
    assert.equal(put.json.count, 3); assert.equal(put.json.mine, true);
    const list = (await A.call('GET', '/library/v1/banks', { token: T2.access_token })).json.banks;
    const b = list.find(x => x.file === 'Algebra 1 Regents.json');
    assert.ok(b); assert.equal(b.sharedBy, 'lib1@example.com'); assert.equal(b.mine, false); assert.equal(b.canChange, false); assert.equal(b.sharedById, undefined);
    const got = await A.call('GET', '/library/v1/banks/' + encodeURIComponent('Algebra 1 Regents.json'), { token: T2.access_token });
    assert.equal(got.status, 200); assert.equal(got.json.questions.length, 3); assert.equal(got.json.sharedBy, 'lib1@example.com');
    assert.ok(fs.existsSync(path.join(srv.dataDir, 'library', 'Algebra 1 Regents.json')), 'kept as a file in the library folder');
  });
  test('only the sharer or an admin can replace or remove it', async () => {
    const name = '/library/v1/banks/' + encodeURIComponent('Algebra 1 Regents.json');
    const r = await A.call('PUT', name, { token: T2.access_token, body: bank('Algebra 1 Regents', 1) });
    assert.equal(r.status, 403); assert.match(r.json.message, /lib1@example.com/);
    assert.equal((await A.call('DELETE', name, { token: T2.access_token })).status, 403);
    assert.equal((await A.call('PUT', name, { token: T1.access_token, body: bank('Algebra 1 Regents', 4) })).json.count, 4);
    assert.equal((await A.call('DELETE', name, { token: admin.access_token })).status, 204);
    assert.equal((await A.call('GET', name, { token: T1.access_token })).status, 404);
  });
  test('refuses bad names and files that aren’t banks', async () => {
    for (const bad of ['..%2Fx.json', '%2E%2E%2Fusers.json', 'x.txt', '.hidden.json', 'a%5Cb.json'])
      assert.equal((await A.call('PUT', '/library/v1/banks/' + bad, { token: T1.access_token, body: bank('x') })).status, 400, bad);
    assert.equal((await A.call('PUT', '/library/v1/banks/x.json', { token: T1.access_token, body: { state: {} } })).status, 400);
    assert.ok(!fs.existsSync(path.join(srv.dataDir, 'x.json')));
  });
  test('files put in the folder by hand show up; LIBRARY_DIR moves the folder', async () => {
    const os = require('os');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'alctb-lib-'));
    fs.writeFileSync(path.join(dir, 'Geometry.json'), JSON.stringify(bank('Geometry', 5)));
    fs.writeFileSync(path.join(dir, 'notes.json'), '{"not":"a bank"}');
    const s2 = await startServer({ LIBRARY_DIR: dir });
    try {
      const B = api(s2.url), t = (await B.login('admin@example.com', 'admin-password-1')).json.access_token;
      const list = (await B.call('GET', '/library/v1/banks', { token: t })).json.banks;
      assert.deepEqual(list.map(b => [b.bank, b.count, b.canChange]), [['Geometry', 5, true]]);
    } finally { await s2.stop(); }
  });
});
