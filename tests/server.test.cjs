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
