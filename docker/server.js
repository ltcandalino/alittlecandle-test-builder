// ALittleCandleTestBuilder: all-in-one server (website, logins, question banks, pictures).
// Uses Node's built-in HTTP server and crypto. Database: SQLite by default (built in), or PostgreSQL /
// MySQL / MariaDB when DATABASE_URL is set (see db.js).
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DB = require('./db');

const PORT = +(process.env.PORT || 8080);
const DATA = process.env.DATA_DIR || '/data';
const ACCESS_TTL = 60 * 60 * 1000;            // 1 hour
const REFRESH_TTL = 60 * 24 * 60 * 60 * 1000; // 60 days
const MAX_BODY = 25 * 1024 * 1024;
const IMG_DIR = path.join(DATA, 'images');
fs.mkdirSync(IMG_DIR, { recursive: true });

/* ---------------- database (opened in start() below) ---------------- */
let db;
const now = () => new Date().toISOString();

/* ---------------- passwords & tokens ---------------- */
function hashPw(pw) {
  const salt = crypto.randomBytes(16);
  const h = crypto.scryptSync(pw, salt, 64, { N: 16384, r: 8, p: 1 });
  return 'scrypt$' + salt.toString('base64') + '$' + h.toString('base64');
}
function checkPw(pw, stored) {
  const [, s, h] = String(stored).split('$');
  if (!s || !h) return false;
  const got = crypto.scryptSync(pw, Buffer.from(s, 'base64'), 64, { N: 16384, r: 8, p: 1 });
  const want = Buffer.from(h, 'base64');
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}
const newToken = () => crypto.randomBytes(32).toString('base64url');
async function issue(user) {
  const a = newToken(), r = newToken(), t = Date.now();
  await db.run('INSERT INTO tokens (token, user_id, kind, expires) VALUES (?,?,?,?)', [a, user.id, 'access', t + ACCESS_TTL]);
  await db.run('INSERT INTO tokens (token, user_id, kind, expires) VALUES (?,?,?,?)', [r, user.id, 'refresh', t + REFRESH_TTL]);
  return { access_token: a, refresh_token: r, token_type: 'bearer', expires_in: ACCESS_TTL / 1000, user: publicUser(user) };
}
function publicUser(u) { return { id: u.id, email: u.email, admin: !!u.admin, app_metadata: { role: u.admin ? 'admin' : 'user' } }; }
async function userFromToken(token, kind) {
  if (!token) return null;
  const row = await db.get('SELECT u.*, t.expires FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.token = ? AND t.kind = ?', [token, kind]);
  if (!row || row.expires < Date.now()) return null;
  return row;
}
/* ---------------- login throttling ---------------- */
const fails = new Map();
function tooMany(key) { const f = fails.get(key); return f && f.n >= 8 && Date.now() - f.t < 15 * 60 * 1000; }
function noteFail(key) { const f = fails.get(key); if (!f || Date.now() - f.t > 15 * 60 * 1000) fails.set(key, { n: 1, t: Date.now() }); else f.n++; }

/* ---------------- helpers ---------------- */
const SEC = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin',
  'Content-Security-Policy': "frame-ancestors 'none'", 'X-Frame-Options': 'DENY'
};
function send(res, code, obj, headers) {
  const body = obj === undefined || obj === null ? '' : JSON.stringify(obj);
  res.writeHead(code, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, SEC, headers || {}));
  res.end(body);
}
const err = (res, code, msg) => send(res, code, { error: msg, error_description: msg, message: msg });
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('Too large'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
const json = (buf) => { try { return JSON.parse(buf.toString('utf8') || 'null'); } catch (e) { return null; } };
function bearer(req) { const h = req.headers['authorization'] || ''; return h.startsWith('Bearer ') ? h.slice(7) : ''; }
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const clientIp = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';

/* ---------------- website files ---------------- */
const INDEX = fs.readFileSync(path.join(__dirname, 'index.html'));
const VERSION = (INDEX.toString('utf8', 0, 4000).match(/<meta name="version" content="([^"]+)"/) || [])[1] || 'unknown';
const INDEX_ETAG = '"' + crypto.createHash('sha1').update(INDEX).digest('hex').slice(0, 16) + '"';
const CONFIG_JS = "window.ALCTB_CONFIG={supabaseUrl:location.origin,supabaseAnonKey:'self-hosted',selfHosted:true};\n";
const IMG_TYPES = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
// an SVG opened by its own address could run scripts: never let it (pictures in the app are <img>, which never run them)
const SVG_SEC = { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox" };

/* ---------------- request handling ---------------- */
/* ---------------- groups and team banks ----------------
   A team bank is a list of questions (items {o: owner id, id}) that its owner shares with groups.
   Owner and editors (role 2) may change the questions; group members (role 1) may see and use them.
   A bank only grants anything for questions owned by its owner or one of its editors, so nobody can
   pass on a colleague's private question by putting it in their own bank.
   team_access / team_items are rebuilt from team_banks + group_members after every change (school-sized). */
const BANK_ID = /^[A-Za-z0-9_-]{1,64}$/;
async function refreshTeam() {
  const banks = (await db.all('SELECT id, owner, data FROM team_banks WHERE deleted = 0')).map((b) => Object.assign(JSON.parse(b.data), { id: b.id, owner: b.owner }));
  const members = await db.all('SELECT group_id, user_id FROM group_members');
  const users = new Set((await db.all('SELECT id FROM users')).map((u) => u.id));
  await db.tx(async (t) => {
    await t.run('DELETE FROM team_access');
    await t.run('DELETE FROM team_items');
    for (const b of banks) {
      const roles = new Map();
      for (const m of members) if ((b.groups || []).includes(m.group_id)) roles.set(m.user_id, 1);
      for (const e of [b.owner].concat(b.editors || [])) if (users.has(e)) roles.set(e, 2);
      for (const [u, r] of roles) await t.run('INSERT INTO team_access (bank_id, user_id, role) VALUES (?,?,?)', [b.id, u, r]);
      const trusted = new Set([b.owner].concat(b.editors || [])), seen = new Set();
      for (const it of b.items || []) {
        const k = it.o + '\n' + it.id;
        if (trusted.has(it.o) && !seen.has(k)) { seen.add(k); await t.run('INSERT INTO team_items (bank_id, q_owner, q_id) VALUES (?,?,?)', [b.id, it.o, it.id]); }
      }
    }
  });
}
// best role (1 see, 2 change) user has on question (owner, id) through team banks; 0 for none
const TEAM_ROLE = 'SELECT MAX(ta.role) AS role FROM team_items ti JOIN team_access ta ON ta.bank_id = ti.bank_id WHERE ti.q_owner = ? AND ti.q_id = ? AND ta.user_id = ?';
async function teamRole(owner, id, userId) { const r = await db.get(TEAM_ROLE, [owner, id, userId]); return (r && r.role) || 0; }

function cleanBank(j) {
  const str = (v, n) => typeof v === 'string' && v.length <= n;
  if (!j || !str(j.name, 120) || !j.name.trim()) return null;
  const list = (a, ok) => (Array.isArray(a) ? a : []).filter(ok);
  return {
    name: j.name.trim(),
    groups: list(j.groups, (g) => str(g, 64)),
    editors: list(j.editors, (e) => str(e, 64)),
    items: list(j.items, (it) => it && str(it.o, 64) && str(it.id, 100)).slice(0, 50000).map((it) => ({ o: it.o, id: it.id })),
  };
}
async function team(req, res, p, body, me) {
  if (p === '/team/v1/people' && req.method === 'GET') {
    const groups = await db.all('SELECT id, name FROM user_groups ORDER BY name');
    const members = await db.all('SELECT group_id, user_id FROM group_members');
    const people = await db.all('SELECT id, email FROM users ORDER BY email');
    return send(res, 200, { groups: groups.map((g) => ({ id: g.id, name: g.name, members: members.filter((m) => m.group_id === g.id).map((m) => m.user_id) })), people });
  }
  if (p === '/team/v1/banks' && req.method === 'GET') {
    const rows = await db.all(`SELECT b.id, b.owner, b.data, b.updated_at, u.email, a.role FROM team_banks b JOIN team_access a ON a.bank_id = b.id AND a.user_id = ?
      LEFT JOIN users u ON u.id = b.owner WHERE b.deleted = 0 ORDER BY b.id`, [me.id]);
    return send(res, 200, rows.map((r) => Object.assign(JSON.parse(r.data), { id: r.id, owner: r.owner, owner_email: r.email || '', updated_at: r.updated_at, role: r.role, manage: r.owner === me.id || !!me.admin })));
  }
  const id = decodeURIComponent(p.slice('/team/v1/banks/'.length));
  if (!p.startsWith('/team/v1/banks/') || !BANK_ID.test(id)) return err(res, 404, 'Not found');
  const row = await db.get('SELECT owner, data, deleted FROM team_banks WHERE id = ?', [id]);
  const old = row && !row.deleted ? JSON.parse(row.data) : null;
  if (row && row.deleted) return err(res, 404, 'That team bank was deleted.');
  const manage = !row || row.owner === me.id || !!me.admin;
  const role = row ? ((await db.get('SELECT role FROM team_access WHERE bank_id = ? AND user_id = ?', [id, me.id])) || {}).role || 0 : 2;
  if (req.method === 'DELETE') {
    if (!row || !manage) return err(res, 403, 'Only the person who made this team bank can delete it.');
    await db.run('UPDATE team_banks SET deleted = 1, updated_at = ? WHERE id = ?', [now(), id]);
    await refreshTeam();
    return send(res, 200, { ok: true });
  }
  if (req.method === 'PUT') {
    const j = cleanBank(json(body));
    if (!j) return err(res, 422, 'A team bank needs a name.');
    if (!manage && role < 2) return err(res, 403, 'Only the owner and editors can change this team bank.');
    // editors may add and remove questions; name, groups and editors are the owner's (or the admin's)
    const data = manage ? j : Object.assign({}, old, { items: j.items });
    if (row) await db.run('UPDATE team_banks SET data = ?, updated_at = ? WHERE id = ?', [JSON.stringify(data), now(), id]);
    else await db.run('INSERT INTO team_banks (id, owner, data, deleted, updated_at) VALUES (?,?,?,?,?)', [id, me.id, JSON.stringify(data), 0, now()]);
    await refreshTeam();
    return send(res, 200, Object.assign({}, data, { id, owner: row ? row.owner : me.id }));
  }
  return err(res, 405, 'Not allowed');
}
async function groupsAdmin(req, res, parts, body) {
  const gid = parts[3], j = json(body) || {};
  if (!gid && req.method === 'GET') return team(Object.assign({}, req, { method: 'GET' }), res, '/team/v1/people', body, {});
  if (!gid && req.method === 'POST') {
    const name = String(j.name || '').trim();
    if (!name || name.length > 120) return err(res, 422, 'Give the group a name.');
    const nid = crypto.randomUUID();
    await db.run('INSERT INTO user_groups (id, name, created_at) VALUES (?,?,?)', [nid, name, now()]);
    return send(res, 201, { id: nid, name, members: [] });
  }
  if (!(await db.get('SELECT 1 AS one FROM user_groups WHERE id = ?', [gid]))) return err(res, 404, 'No such group.');
  if (req.method === 'PUT') {
    if (j.name !== undefined) { const name = String(j.name).trim(); if (!name || name.length > 120) return err(res, 422, 'Give the group a name.'); await db.run('UPDATE user_groups SET name = ? WHERE id = ?', [name, gid]); }
    if (Array.isArray(j.members)) {
      const users = new Set((await db.all('SELECT id FROM users')).map((u) => u.id));
      await db.tx(async (t) => {
        await t.run('DELETE FROM group_members WHERE group_id = ?', [gid]);
        for (const u of new Set(j.members)) if (users.has(u)) await t.run('INSERT INTO group_members (group_id, user_id) VALUES (?,?)', [gid, u]);
      });
      await refreshTeam();
    }
    return send(res, 200, { ok: true });
  }
  if (req.method === 'DELETE') {
    await db.run('DELETE FROM group_members WHERE group_id = ?', [gid]);
    await db.run('DELETE FROM user_groups WHERE id = ?', [gid]);
    await refreshTeam();
    return send(res, 200, { ok: true });
  }
  return err(res, 405, 'Not allowed');
}

async function handle(req, res) {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;

  // website
  if (req.method === 'GET' && (p === '/' || p === '/index.html')) {
    if (req.headers['if-none-match'] === INDEX_ETAG) { res.writeHead(304, SEC); return res.end(); }
    res.writeHead(200, Object.assign({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache', ETag: INDEX_ETAG }, SEC));
    return res.end(INDEX);
  }
  if (req.method === 'GET' && p === '/config.js') {
    res.writeHead(200, Object.assign({ 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-cache' }, SEC));
    return res.end(CONFIG_JS);
  }
  if (p === '/healthz') return send(res, 200, { ok: true, version: VERSION });

  // pictures (public read; names are long random codes)
  if (req.method === 'GET' && p.startsWith('/storage/v1/object/public/images/')) {
    const rel = p.slice('/storage/v1/object/public/images/'.length);
    const m = rel.match(/^([0-9a-f-]{36})\/([a-z0-9]{8,64})\.(png|jpg|gif|webp|svg)$/);
    if (!m) return err(res, 404, 'Not found');
    const file = path.join(IMG_DIR, m[1], m[2] + '.' + m[3]);
    if (!fs.existsSync(file)) return err(res, 404, 'Not found');
    res.writeHead(200, Object.assign({ 'Content-Type': IMG_TYPES[m[3]], 'Cache-Control': 'public, max-age=31536000, immutable' }, SEC, m[3] === 'svg' ? SVG_SEC : {}));
    return fs.createReadStream(file).pipe(res);
  }

  let body;
  try { body = await readBody(req); } catch (e) { return err(res, e.code || 400, e.code === 413 ? 'That file is too large.' : 'Bad request'); }

  // ---- sign in / refresh ----
  if (req.method === 'POST' && p === '/auth/v1/token') {
    const j = json(body) || {};
    const grant = u.searchParams.get('grant_type');
    if (grant === 'password') {
      const email = String(j.email || '').trim().toLowerCase();
      const key = email + '|' + clientIp(req);
      if (tooMany(key)) return err(res, 429, 'Too many tries. Wait 15 minutes and try again.');
      const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
      if (!user || !checkPw(String(j.password || ''), user.pw)) { noteFail(key); return err(res, 400, 'Invalid login credentials'); }
      fails.delete(key);
      return send(res, 200, await issue(user));
    }
    if (grant === 'refresh_token') {
      const user = await userFromToken(j.refresh_token, 'refresh');
      if (!user) return err(res, 400, 'Invalid Refresh Token');
      await db.run('DELETE FROM tokens WHERE token = ?', [j.refresh_token]);
      return send(res, 200, await issue(user));
    }
    return err(res, 400, 'Unsupported grant type');
  }
  if (req.method === 'POST' && p === '/auth/v1/recover') return err(res, 400, 'Password reset emails aren’t available on this site. Ask your site admin to reset your password.');

  const me = await userFromToken(bearer(req), 'access');
  if (p === '/auth/v1/logout' && req.method === 'POST') {
    if (me) await db.run('DELETE FROM tokens WHERE user_id = ?', [me.id]);
    return send(res, 204, null);
  }
  if (!me) return err(res, 401, 'Please sign in again.');

  if (p === '/auth/v1/user') {
    if (req.method === 'GET') return send(res, 200, publicUser(me));
    if (req.method === 'PUT') {
      const j = json(body) || {};
      if (typeof j.password !== 'string' || j.password.length < 8) return err(res, 422, 'Use at least 8 characters.');
      await db.run('UPDATE users SET pw = ? WHERE id = ?', [hashPw(j.password), me.id]);
      return send(res, 200, publicUser(me));
    }
  }

  // ---- groups' team banks ----
  if (p.startsWith('/team/v1/')) return team(req, res, p, body, me);

  // ---- questions and test settings ----
  if (p === '/rest/v1/questions' || p === '/rest/v1/app_state') {
    const table = p.endsWith('questions') ? 'questions' : 'app_state';
    if (req.method === 'GET') {
      if (table === 'app_state') {
        const row = await db.get('SELECT data, updated_at FROM app_state WHERE user_id = ?', [me.id]);
        return send(res, 200, row ? [{ data: JSON.parse(row.data), updated_at: row.updated_at }] : []);
      }
      const limit = Math.min(1000, Math.max(1, +u.searchParams.get('limit') || 200));
      const offset = Math.max(0, +u.searchParams.get('offset') || 0);
      const since = (u.searchParams.get('updated_at') || '').replace(/^gt\./, '');
      // shared=1 (this version of the app and newer): also colleagues' public questions, read-only, with their owner.
      // A question that stopped being public, or was deleted, comes back as "deleted" so copies disappear.
      // Older apps don't ask, so they never mistake someone else's question for their own.
      if (u.searchParams.get('shared') === '1') {
        // ...and questions in team banks shared with this person (team = 1 see, 2 change)
        const TEAM = 'SELECT MAX(ta.role) FROM team_items ti JOIN team_access ta ON ta.bank_id = ti.bank_id WHERE ti.q_owner = q.user_id AND ti.q_id = q.id AND ta.user_id = ?';
        const rows = await db.all(`SELECT q.user_id, q.id, q.data, q.deleted, q.pub, q.updated_at, u.email, (${TEAM}) AS team FROM questions q JOIN users u ON u.id = q.user_id
          WHERE (q.user_id = ? OR q.pub > 0 OR (${TEAM}) > 0)${since ? ' AND q.updated_at > ?' : ''} ORDER BY q.updated_at, q.user_id, q.id LIMIT ? OFFSET ?`,
          since ? [me.id, me.id, me.id, since, limit, offset] : [me.id, me.id, me.id, limit, offset]);
        return send(res, 200, rows.map((r) => {
          if (r.user_id === me.id) return { id: r.id, data: JSON.parse(r.data), deleted: !!r.deleted, updated_at: r.updated_at };
          const gone = r.deleted || (r.pub !== 1 && !r.team);
          return { id: r.id, owner: r.user_id, owner_email: r.email, data: gone ? {} : JSON.parse(r.data), deleted: !!gone, can_edit: !gone && r.team === 2, updated_at: r.updated_at };
        }));
      }
      const rows = since
        ? await db.all('SELECT id, data, deleted, updated_at FROM questions WHERE user_id = ? AND updated_at > ? ORDER BY updated_at, id LIMIT ? OFFSET ?', [me.id, since, limit, offset])
        : await db.all('SELECT id, data, deleted, updated_at FROM questions WHERE user_id = ? ORDER BY updated_at, id LIMIT ? OFFSET ?', [me.id, limit, offset]);
      return send(res, 200, rows.map((r) => ({ id: r.id, data: JSON.parse(r.data), deleted: !!r.deleted, updated_at: r.updated_at })));
    }
    if (req.method === 'POST') {
      const arr = json(body);
      if (!Array.isArray(arr)) return err(res, 400, 'Expected a list');
      const t = now();
      try {
        await db.tx(async (t2) => { for (const r of arr) {
          if (table === 'questions' && r.user_id && r.user_id !== me.id) {
            // an editor changing a colleague's question in a team bank: the owner's bank, courses and visibility stay theirs
            if (typeof r.id !== 'string' || r.deleted || (await teamRole(r.user_id, r.id, me.id)) < 2) throw Object.assign(new Error('Only the owner and the team bank’s editors can change this question.'), { code: 403 });
            const cur = await t2.get('SELECT data, pub FROM questions WHERE user_id = ? AND id = ? AND deleted = 0', [r.user_id, r.id]);
            if (!cur) throw Object.assign(new Error('That question was deleted.'), { code: 409 });
            const was = JSON.parse(cur.data), d = Object.assign({}, r.data || {});
            for (const k of ['bank', 'courses', 'course', 'visibility']) { if (was[k] === undefined) delete d[k]; else d[k] = was[k]; }
            delete d.owner; delete d.ownerName; delete d.canEdit;
            d.changedBy = me.email;
            await t2.run(db.upsertQuestion, [r.user_id, r.id, JSON.stringify(d), 0, t, cur.pub]);
            continue;
          }
          if (r.user_id && r.user_id !== me.id) throw Object.assign(new Error('Not allowed'), { code: 403 });
          if (table === 'questions') {
            if (typeof r.id !== 'string' || !r.id || r.id.length > 100) throw Object.assign(new Error('Bad id'), { code: 400 });
            const was = await t2.get('SELECT pub FROM questions WHERE user_id = ? AND id = ?', [me.id, r.id]);
            const pub = !r.deleted && r.data && r.data.visibility === 'public' ? 1 : (was && was.pub ? 2 : 0);
            await t2.run(db.upsertQuestion, [me.id, r.id, JSON.stringify(r.data || {}), r.deleted ? 1 : 0, t, pub]);
          } else {
            await t2.run(db.upsertState, [me.id, JSON.stringify(r.data || {}), t]);
          }
        } });
      } catch (e) { return err(res, typeof e.code === 'number' ? e.code : 500, typeof e.code === 'number' ? e.message : 'Couldn’t save. Try again.'); }
      return send(res, 201, null);
    }
  }

  // ---- picture upload ----
  if (req.method === 'POST' && p.startsWith('/storage/v1/object/images/')) {
    const rel = p.slice('/storage/v1/object/images/'.length);
    const m = rel.match(/^([0-9a-f-]{36})\/([a-z0-9]{8,64})\.(png|jpg|gif|webp|svg)$/);
    if (!m || m[1] !== me.id) return err(res, 403, 'Not allowed');
    const dir = path.join(IMG_DIR, me.id);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, m[2] + '.' + m[3]), body);
    return send(res, 200, { Key: 'images/' + rel });
  }

  // ---- admin: manage accounts ----
  if (p.startsWith('/admin/api/')) {
    if (!me.admin) return err(res, 403, 'Only admins can manage accounts.');
    const parts = p.split('/').filter(Boolean); // admin, api, users, :id, action
    if (parts[2] === 'groups') return groupsAdmin(req, res, parts, body);
    if (parts[2] !== 'users') return err(res, 404, 'Not found');
    const id = parts[3], action = parts[4];
    const j = json(body) || {};
    if (!id && req.method === 'GET') {
      const rows = await db.all(`SELECT u.id, u.email, u.admin, u.created_at,
        (SELECT COUNT(*) FROM questions x WHERE x.user_id = u.id AND x.deleted = 0) AS questions
        FROM users u ORDER BY u.email`);
      return send(res, 200, rows.map((r) => Object.assign(r, { admin: !!r.admin })));
    }
    if (!id && req.method === 'POST') {
      const email = String(j.email || '').trim().toLowerCase();
      if (!validEmail(email)) return err(res, 422, 'That email doesn’t look right.');
      if (typeof j.password !== 'string' || j.password.length < 8) return err(res, 422, 'The password needs at least 8 characters.');
      if (await db.get('SELECT 1 AS one FROM users WHERE email = ?', [email])) return err(res, 409, 'There’s already an account for that email.');
      const nid = crypto.randomUUID();
      await db.run('INSERT INTO users (id, email, pw, admin, created_at) VALUES (?,?,?,?,?)', [nid, email, hashPw(j.password), j.admin ? 1 : 0, now()]);
      return send(res, 201, { id: nid, email });
    }
    const target = id && await db.get('SELECT * FROM users WHERE id = ?', [id]);
    if (!target) return err(res, 404, 'No such account.');
    if (req.method === 'POST' && action === 'password') {
      if (typeof j.password !== 'string' || j.password.length < 8) return err(res, 422, 'The password needs at least 8 characters.');
      await db.run('UPDATE users SET pw = ? WHERE id = ?', [hashPw(j.password), id]);
      await db.run('DELETE FROM tokens WHERE user_id = ?', [id]);
      return send(res, 200, { ok: true });
    }
    if (req.method === 'POST' && action === 'admin') {
      if (id === me.id && !j.admin) return err(res, 422, 'You can’t remove your own admin access.');
      await db.run('UPDATE users SET admin = ? WHERE id = ?', [j.admin ? 1 : 0, id]);
      return send(res, 200, { ok: true });
    }
    if (req.method === 'DELETE' && !action) {
      if (id === me.id) return err(res, 422, 'You can’t delete your own account.');
      // public questions stay for everyone: the admin who deletes the account takes them over (private ones go)
      const mine = new Set((await db.all('SELECT id FROM questions WHERE user_id = ?', [me.id])).map((r) => r.id));
      const pubs = (await db.all('SELECT id FROM questions WHERE user_id = ? AND pub = 1 AND deleted = 0', [id])).filter((r) => !mine.has(r.id));
      await db.tx(async (t2) => {
        for (const r of pubs) await t2.run('UPDATE questions SET user_id = ?, updated_at = ? WHERE user_id = ? AND id = ?', [me.id, now(), id, r.id]);
        await t2.run('UPDATE team_banks SET owner = ?, updated_at = ? WHERE owner = ?', [me.id, now(), id]);
        await t2.run('DELETE FROM users WHERE id = ?', [id]);
      });
      await refreshTeam();
      if (!pubs.length) fs.rmSync(path.join(IMG_DIR, id), { recursive: true, force: true }); // pictures of public questions stay
      return send(res, 200, { ok: true });
    }
  }
  return err(res, 404, 'Not found');
}

async function start() {
  db = await DB.open(process.env.DATABASE_URL, DATA);
  const copied = await DB.copyFromSqlite(db, db.sqliteFile, fs);
  await refreshTeam();
  if (copied) console.log('Copied ' + copied.users + ' account(s) and ' + copied.questions + ' question(s) from ' + db.sqliteFile + ' (the file is left as it was).');

  // locked out? set ADMIN_RESET=1 for one start to reset ADMIN_EMAIL's password to ADMIN_PASSWORD
  if (process.env.ADMIN_RESET === '1' && process.env.ADMIN_EMAIL && String(process.env.ADMIN_PASSWORD || '').length >= 8) {
    const em = String(process.env.ADMIN_EMAIL).trim().toLowerCase();
    const r = await db.run('UPDATE users SET pw = ?, admin = 1 WHERE email = ?', [hashPw(process.env.ADMIN_PASSWORD), em]);
    if (r.changes) { await db.run('DELETE FROM tokens WHERE user_id IN (SELECT id FROM users WHERE email = ?)', [em]); console.log('Reset the password for ' + em + '. Remove ADMIN_RESET now.'); }
  }
  // first start: create the admin account from environment variables
  if (!(await db.get('SELECT COUNT(*) AS n FROM users')).n) {
    const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const pw = String(process.env.ADMIN_PASSWORD || '');
    if (email && pw.length >= 8) {
      await db.run('INSERT INTO users (id, email, pw, admin, created_at) VALUES (?,?,?,?,?)', [crypto.randomUUID(), email, hashPw(pw), 1, now()]);
      console.log('Created admin account for ' + email);
    } else {
      console.log('No accounts yet. Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) and restart to create the first admin.');
    }
  }
  setInterval(() => { db.run('DELETE FROM tokens WHERE expires < ?', [Date.now()]).catch(() => {}); }, 60 * 60 * 1000).unref();

  http.createServer((req, res) => {
    handle(req, res).catch((e) => { console.error(e); if (!res.headersSent) err(res, 500, 'Something went wrong on the server.'); });
  }).listen(PORT, () => console.log('ALittleCandleTestBuilder ' + VERSION + ' is running on port ' + PORT + ' (database: ' + db.label + '; pictures in ' + IMG_DIR + ')'));
}

for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { Promise.resolve(db && db.close()).catch(() => {}).then(() => process.exit(0)); });
start().catch((e) => { console.error('Could not start: ' + e.message); process.exit(1); });
