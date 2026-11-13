// ALittleCandleTestBuilder: all-in-one server (website, logins, question banks, pictures).
// No outside packages: uses Node's built-in HTTP server, crypto and SQLite.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = +(process.env.PORT || 8080);
const DATA = process.env.DATA_DIR || '/data';
const ACCESS_TTL = 60 * 60 * 1000;            // 1 hour
const REFRESH_TTL = 60 * 24 * 60 * 60 * 1000; // 60 days
const MAX_BODY = 25 * 1024 * 1024;
const IMG_DIR = path.join(DATA, 'images');
fs.mkdirSync(IMG_DIR, { recursive: true });

/* ---------------- database ---------------- */
const db = new DatabaseSync(path.join(DATA, 'alctb.db'));
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, pw TEXT NOT NULL,
    admin INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS tokens (
    token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL, expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS questions (
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, id TEXT NOT NULL,
    data TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL,
    PRIMARY KEY (user_id, id));
  CREATE INDEX IF NOT EXISTS questions_upd ON questions(user_id, updated_at);
  CREATE TABLE IF NOT EXISTS app_state (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    data TEXT NOT NULL, updated_at TEXT NOT NULL);
`);
const q = (sql) => db.prepare(sql);
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
function issue(user) {
  const a = newToken(), r = newToken(), t = Date.now();
  q('INSERT INTO tokens VALUES (?,?,?,?)').run(a, user.id, 'access', t + ACCESS_TTL);
  q('INSERT INTO tokens VALUES (?,?,?,?)').run(r, user.id, 'refresh', t + REFRESH_TTL);
  return { access_token: a, refresh_token: r, token_type: 'bearer', expires_in: ACCESS_TTL / 1000, user: publicUser(user) };
}
function publicUser(u) { return { id: u.id, email: u.email, admin: !!u.admin, app_metadata: { role: u.admin ? 'admin' : 'user' } }; }
function userFromToken(token, kind) {
  if (!token) return null;
  const row = q('SELECT u.*, t.expires FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.token = ? AND t.kind = ?').get(token, kind);
  if (!row || row.expires < Date.now()) return null;
  return row;
}
setInterval(() => { try { q('DELETE FROM tokens WHERE expires < ?').run(Date.now()); } catch (e) {} }, 60 * 60 * 1000).unref();

// locked out? set ADMIN_RESET=1 for one start to reset ADMIN_EMAIL's password to ADMIN_PASSWORD
if (process.env.ADMIN_RESET === '1' && process.env.ADMIN_EMAIL && String(process.env.ADMIN_PASSWORD || '').length >= 8) {
  const em = String(process.env.ADMIN_EMAIL).trim().toLowerCase();
  const r = q('UPDATE users SET pw = ?, admin = 1 WHERE email = ?').run(hashPw(process.env.ADMIN_PASSWORD), em);
  if (r.changes) { q('DELETE FROM tokens WHERE user_id = (SELECT id FROM users WHERE email = ?)').run(em); console.log('Reset the password for ' + em + '. Remove ADMIN_RESET now.'); }
}
// first start: create the admin account from environment variables
if (!q('SELECT COUNT(*) AS n FROM users').get().n) {
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const pw = String(process.env.ADMIN_PASSWORD || '');
  if (email && pw.length >= 8) {
    q('INSERT INTO users VALUES (?,?,?,?,?)').run(crypto.randomUUID(), email, hashPw(pw), 1, now());
    console.log('Created admin account for ' + email);
  } else {
    console.log('No accounts yet. Set ADMIN_EMAIL and ADMIN_PASSWORD (8+ characters) and restart to create the first admin.');
  }
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
const INDEX_ETAG = '"' + crypto.createHash('sha1').update(INDEX).digest('hex').slice(0, 16) + '"';
const CONFIG_JS = "window.ALCTB_CONFIG={supabaseUrl:location.origin,supabaseAnonKey:'self-hosted',selfHosted:true};\n";
const IMG_TYPES = { png: 'image/png', jpg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp' };

/* ---------------- request handling ---------------- */
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
  if (p === '/healthz') return send(res, 200, { ok: true });

  // pictures (public read; names are long random codes)
  if (req.method === 'GET' && p.startsWith('/storage/v1/object/public/images/')) {
    const rel = p.slice('/storage/v1/object/public/images/'.length);
    const m = rel.match(/^([0-9a-f-]{36})\/([a-z0-9]{8,64})\.(png|jpg|gif|webp)$/);
    if (!m) return err(res, 404, 'Not found');
    const file = path.join(IMG_DIR, m[1], m[2] + '.' + m[3]);
    if (!fs.existsSync(file)) return err(res, 404, 'Not found');
    res.writeHead(200, Object.assign({ 'Content-Type': IMG_TYPES[m[3]], 'Cache-Control': 'public, max-age=31536000, immutable' }, SEC));
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
      const user = q('SELECT * FROM users WHERE email = ?').get(email);
      if (!user || !checkPw(String(j.password || ''), user.pw)) { noteFail(key); return err(res, 400, 'Invalid login credentials'); }
      fails.delete(key);
      return send(res, 200, issue(user));
    }
    if (grant === 'refresh_token') {
      const user = userFromToken(j.refresh_token, 'refresh');
      if (!user) return err(res, 400, 'Invalid Refresh Token');
      q('DELETE FROM tokens WHERE token = ?').run(j.refresh_token);
      return send(res, 200, issue(user));
    }
    return err(res, 400, 'Unsupported grant type');
  }
  if (req.method === 'POST' && p === '/auth/v1/recover') return err(res, 400, 'Password reset emails aren’t available on this site. Ask your site admin to reset your password.');

  const me = userFromToken(bearer(req), 'access');
  if (p === '/auth/v1/logout' && req.method === 'POST') {
    if (me) q('DELETE FROM tokens WHERE user_id = ?').run(me.id);
    return send(res, 204, null);
  }
  if (!me) return err(res, 401, 'Please sign in again.');

  if (p === '/auth/v1/user') {
    if (req.method === 'GET') return send(res, 200, publicUser(me));
    if (req.method === 'PUT') {
      const j = json(body) || {};
      if (typeof j.password !== 'string' || j.password.length < 8) return err(res, 422, 'Use at least 8 characters.');
      q('UPDATE users SET pw = ? WHERE id = ?').run(hashPw(j.password), me.id);
      return send(res, 200, publicUser(me));
    }
  }

  // ---- questions and test settings ----
  if (p === '/rest/v1/questions' || p === '/rest/v1/app_state') {
    const table = p.endsWith('questions') ? 'questions' : 'app_state';
    if (req.method === 'GET') {
      if (table === 'app_state') {
        const row = q('SELECT data, updated_at FROM app_state WHERE user_id = ?').get(me.id);
        return send(res, 200, row ? [{ data: JSON.parse(row.data), updated_at: row.updated_at }] : []);
      }
      const limit = Math.min(1000, Math.max(1, +u.searchParams.get('limit') || 200));
      const offset = Math.max(0, +u.searchParams.get('offset') || 0);
      const since = (u.searchParams.get('updated_at') || '').replace(/^gt\./, '');
      const rows = since
        ? q('SELECT id, data, deleted, updated_at FROM questions WHERE user_id = ? AND updated_at > ? ORDER BY updated_at, id LIMIT ? OFFSET ?').all(me.id, since, limit, offset)
        : q('SELECT id, data, deleted, updated_at FROM questions WHERE user_id = ? ORDER BY updated_at, id LIMIT ? OFFSET ?').all(me.id, limit, offset);
      return send(res, 200, rows.map((r) => ({ id: r.id, data: JSON.parse(r.data), deleted: !!r.deleted, updated_at: r.updated_at })));
    }
    if (req.method === 'POST') {
      const arr = json(body);
      if (!Array.isArray(arr)) return err(res, 400, 'Expected a list');
      const t = now();
      db.exec('BEGIN');
      try {
        for (const r of arr) {
          if (r.user_id && r.user_id !== me.id) throw Object.assign(new Error('Not allowed'), { code: 403 });
          if (table === 'questions') {
            if (typeof r.id !== 'string' || !r.id || r.id.length > 100) throw Object.assign(new Error('Bad id'), { code: 400 });
            q(`INSERT INTO questions (user_id, id, data, deleted, updated_at) VALUES (?,?,?,?,?)
               ON CONFLICT(user_id, id) DO UPDATE SET data = excluded.data, deleted = excluded.deleted, updated_at = excluded.updated_at`)
              .run(me.id, r.id, JSON.stringify(r.data || {}), r.deleted ? 1 : 0, t);
          } else {
            q(`INSERT INTO app_state (user_id, data, updated_at) VALUES (?,?,?)
               ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`)
              .run(me.id, JSON.stringify(r.data || {}), t);
          }
        }
        db.exec('COMMIT');
      } catch (e) { db.exec('ROLLBACK'); return err(res, e.code || 500, e.message); }
      return send(res, 201, null);
    }
  }

  // ---- picture upload ----
  if (req.method === 'POST' && p.startsWith('/storage/v1/object/images/')) {
    const rel = p.slice('/storage/v1/object/images/'.length);
    const m = rel.match(/^([0-9a-f-]{36})\/([a-z0-9]{8,64})\.(png|jpg|gif|webp)$/);
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
    if (parts[2] !== 'users') return err(res, 404, 'Not found');
    const id = parts[3], action = parts[4];
    const j = json(body) || {};
    if (!id && req.method === 'GET') {
      const rows = q(`SELECT u.id, u.email, u.admin, u.created_at,
        (SELECT COUNT(*) FROM questions x WHERE x.user_id = u.id AND x.deleted = 0) AS questions
        FROM users u ORDER BY u.email`).all();
      return send(res, 200, rows.map((r) => Object.assign(r, { admin: !!r.admin })));
    }
    if (!id && req.method === 'POST') {
      const email = String(j.email || '').trim().toLowerCase();
      if (!validEmail(email)) return err(res, 422, 'That email doesn’t look right.');
      if (typeof j.password !== 'string' || j.password.length < 8) return err(res, 422, 'The password needs at least 8 characters.');
      if (q('SELECT 1 FROM users WHERE email = ?').get(email)) return err(res, 409, 'There’s already an account for that email.');
      const nid = crypto.randomUUID();
      q('INSERT INTO users VALUES (?,?,?,?,?)').run(nid, email, hashPw(j.password), j.admin ? 1 : 0, now());
      return send(res, 201, { id: nid, email });
    }
    const target = id && q('SELECT * FROM users WHERE id = ?').get(id);
    if (!target) return err(res, 404, 'No such account.');
    if (req.method === 'POST' && action === 'password') {
      if (typeof j.password !== 'string' || j.password.length < 8) return err(res, 422, 'The password needs at least 8 characters.');
      q('UPDATE users SET pw = ? WHERE id = ?').run(hashPw(j.password), id);
      q('DELETE FROM tokens WHERE user_id = ?').run(id);
      return send(res, 200, { ok: true });
    }
    if (req.method === 'POST' && action === 'admin') {
      if (id === me.id && !j.admin) return err(res, 422, 'You can’t remove your own admin access.');
      q('UPDATE users SET admin = ? WHERE id = ?').run(j.admin ? 1 : 0, id);
      return send(res, 200, { ok: true });
    }
    if (req.method === 'DELETE' && !action) {
      if (id === me.id) return err(res, 422, 'You can’t delete your own account.');
      q('DELETE FROM users WHERE id = ?').run(id);
      fs.rmSync(path.join(IMG_DIR, id), { recursive: true, force: true });
      return send(res, 200, { ok: true });
    }
  }
  return err(res, 404, 'Not found');
}

http.createServer((req, res) => {
  handle(req, res).catch((e) => { console.error(e); if (!res.headersSent) err(res, 500, 'Something went wrong on the server.'); });
}).listen(PORT, () => console.log('ALittleCandleTestBuilder is running on port ' + PORT + ' (data in ' + DATA + ')'));

for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { try { db.close(); } catch (e) {} process.exit(0); });
