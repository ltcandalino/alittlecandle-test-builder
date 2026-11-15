// Database layer for docker/server.js: SQLite (built in), PostgreSQL or MySQL/MariaDB.
//   DATABASE_URL unset                    -> SQLite file <DATA_DIR>/alctb.db (no extra packages)
//   DATABASE_URL=postgres://user:pw@host/db -> PostgreSQL (needs the "pg" package)
//   DATABASE_URL=mysql://… or mariadb://…   -> MySQL / MariaDB (needs the "mysql2" package)
// Queries are written once with "?" placeholders; get/all/run/tx behave the same on all three.
'use strict';
const path = require('path');

const SCHEMA = {
  sqlite: [
    `PRAGMA journal_mode = WAL`,
    `PRAGMA foreign_keys = ON`,
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, pw TEXT NOT NULL,
       admin INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       kind TEXT NOT NULL, expires INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS questions (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, id TEXT NOT NULL,
       data TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, PRIMARY KEY (user_id, id))`,
    `CREATE INDEX IF NOT EXISTS questions_upd ON questions(user_id, updated_at)`,
    `CREATE TABLE IF NOT EXISTS app_state (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
       data TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    // groups (made by the admin) and team banks (lists of questions shared with groups, with editors)
    `CREATE TABLE IF NOT EXISTS user_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS group_members (group_id TEXT NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
       user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY (group_id, user_id))`,
    `CREATE TABLE IF NOT EXISTS team_banks (id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL,
       deleted INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS team_access (bank_id TEXT NOT NULL, user_id TEXT NOT NULL, role INTEGER NOT NULL, PRIMARY KEY (bank_id, user_id))`,
    `CREATE TABLE IF NOT EXISTS team_items (bank_id TEXT NOT NULL, q_owner TEXT NOT NULL, q_id TEXT NOT NULL, PRIMARY KEY (bank_id, q_owner, q_id))`,
    `CREATE INDEX IF NOT EXISTS team_items_q ON team_items(q_owner, q_id)`,
  ],
  postgres: [
    `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, pw TEXT NOT NULL,
       admin SMALLINT NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS tokens (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
       kind TEXT NOT NULL, expires BIGINT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS tokens_user ON tokens(user_id)`,
    `CREATE TABLE IF NOT EXISTS questions (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, id TEXT NOT NULL,
       data TEXT NOT NULL, deleted SMALLINT NOT NULL DEFAULT 0, updated_at TEXT NOT NULL, PRIMARY KEY (user_id, id))`,
    `CREATE INDEX IF NOT EXISTS questions_upd ON questions(user_id, updated_at)`,
    `CREATE TABLE IF NOT EXISTS app_state (user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
       data TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS user_groups (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS group_members (group_id TEXT NOT NULL REFERENCES user_groups(id) ON DELETE CASCADE,
       user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY (group_id, user_id))`,
    `CREATE TABLE IF NOT EXISTS team_banks (id TEXT PRIMARY KEY, owner TEXT NOT NULL, data TEXT NOT NULL,
       deleted SMALLINT NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS team_access (bank_id TEXT NOT NULL, user_id TEXT NOT NULL, role SMALLINT NOT NULL, PRIMARY KEY (bank_id, user_id))`,
    `CREATE TABLE IF NOT EXISTS team_items (bank_id TEXT NOT NULL, q_owner TEXT NOT NULL, q_id TEXT NOT NULL, PRIMARY KEY (bank_id, q_owner, q_id))`,
    `CREATE INDEX IF NOT EXISTS team_items_q ON team_items(q_owner, q_id)`,
  ],
  mysql: [
    `CREATE TABLE IF NOT EXISTS users (id VARCHAR(64) PRIMARY KEY, email VARCHAR(320) NOT NULL UNIQUE, pw VARCHAR(255) NOT NULL,
       admin TINYINT NOT NULL DEFAULT 0, created_at VARCHAR(40) NOT NULL) DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS tokens (token VARCHAR(64) PRIMARY KEY, user_id VARCHAR(64) NOT NULL, kind VARCHAR(16) NOT NULL,
       expires BIGINT NOT NULL, INDEX tokens_user (user_id),
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS questions (user_id VARCHAR(64) NOT NULL, id VARCHAR(100) NOT NULL, data LONGTEXT NOT NULL,
       deleted TINYINT NOT NULL DEFAULT 0, updated_at VARCHAR(40) NOT NULL, PRIMARY KEY (user_id, id),
       INDEX questions_upd (user_id, updated_at),
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS app_state (user_id VARCHAR(64) PRIMARY KEY, data LONGTEXT NOT NULL, updated_at VARCHAR(40) NOT NULL,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS user_groups (id VARCHAR(64) PRIMARY KEY, name VARCHAR(200) NOT NULL, created_at VARCHAR(40) NOT NULL) DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS group_members (group_id VARCHAR(64) NOT NULL, user_id VARCHAR(64) NOT NULL, PRIMARY KEY (group_id, user_id),
       FOREIGN KEY (group_id) REFERENCES user_groups(id) ON DELETE CASCADE,
       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE) DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS team_banks (id VARCHAR(64) PRIMARY KEY, owner VARCHAR(64) NOT NULL, data LONGTEXT NOT NULL,
       deleted TINYINT NOT NULL DEFAULT 0, updated_at VARCHAR(40) NOT NULL) DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS team_access (bank_id VARCHAR(64) NOT NULL, user_id VARCHAR(64) NOT NULL, role TINYINT NOT NULL,
       PRIMARY KEY (bank_id, user_id)) DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS team_items (bank_id VARCHAR(64) NOT NULL, q_owner VARCHAR(64) NOT NULL, q_id VARCHAR(100) NOT NULL,
       PRIMARY KEY (bank_id, q_owner, q_id), INDEX team_items_q (q_owner, q_id)) DEFAULT CHARSET=utf8mb4`,
  ],
};

// Columns added after the first release. Adding one that is already there fails; that's fine.
const ADD_COLUMNS = {
  sqlite: [`ALTER TABLE questions ADD COLUMN pub INTEGER NOT NULL DEFAULT 0`],
  postgres: [`ALTER TABLE questions ADD COLUMN IF NOT EXISTS pub SMALLINT NOT NULL DEFAULT 0`],
  mysql: [`ALTER TABLE questions ADD COLUMN pub TINYINT NOT NULL DEFAULT 0`],
};
const INDEXES = {
  sqlite: [`CREATE INDEX IF NOT EXISTS questions_pub ON questions(pub, updated_at)`],
  postgres: [`CREATE INDEX IF NOT EXISTS questions_pub ON questions(pub, updated_at)`],
  mysql: [`CREATE INDEX questions_pub ON questions(pub, updated_at)`],
};
async function addColumns(kind, exec) {
  for (const s of ADD_COLUMNS[kind].concat(INDEXES[kind])) {
    try { await exec(s); } catch (e) { if (!/duplicate|already exists/i.test(e.message)) throw e; }
  }
}

// Insert-or-update, which is spelled differently in MySQL.
function upsertSql(kind, table, keys, cols) {
  const all = keys.concat(cols);
  const head = `INSERT INTO ${table} (${all.join(', ')}) VALUES (${all.map(() => '?').join(',')})`;
  if (kind === 'mysql') return head + ' ON DUPLICATE KEY UPDATE ' + cols.map((c) => `${c} = VALUES(${c})`).join(', ');
  return head + ` ON CONFLICT (${keys.join(', ')}) DO UPDATE SET ` + cols.map((c) => `${c} = excluded.${c}`).join(', ');
}

// Postgres numbers its placeholders: ? -> $1, $2 …
const pgSql = (sql) => { let i = 0; return sql.replace(/\?/g, () => '$' + (++i)); };

// Counts and BIGINTs come back as strings from Postgres/MySQL; make them numbers.
const NUMERIC = new Set(['n', 'expires', 'admin', 'deleted', 'questions', 'pub', 'role', 'team']);
const fixRow = (r) => { if (r) for (const k of Object.keys(r)) if (NUMERIC.has(k) && r[k] != null) r[k] = Number(r[k]); return r; };

function kindOf(url) {
  if (!url) return 'sqlite';
  const proto = String(url).split(':')[0].toLowerCase();
  if (proto === 'postgres' || proto === 'postgresql') return 'postgres';
  if (proto === 'mysql' || proto === 'mariadb') return 'mysql';
  throw new Error('DATABASE_URL must start with postgres://, mysql:// or mariadb:// (or leave it out to use SQLite).');
}

// Describe the database without the password, for the log.
function describe(kind, url, file) {
  if (kind === 'sqlite') return 'SQLite ' + file;
  try { const u = new URL(url); return (kind === 'postgres' ? 'PostgreSQL ' : 'MySQL/MariaDB ') + u.hostname + (u.port ? ':' + u.port : '') + u.pathname; } catch (e) { return kind; }
}

function openSqlite(file) {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(file);
  const api = {
    kind: 'sqlite',
    get: async (sql, a = []) => fixRow(db.prepare(sql).get(...a)),
    all: async (sql, a = []) => db.prepare(sql).all(...a).map(fixRow),
    run: async (sql, a = []) => ({ changes: Number(db.prepare(sql).run(...a).changes) }),
    // SQLite calls are synchronous, so nothing else can slip in between BEGIN and COMMIT.
    tx: async (fn) => { db.exec('BEGIN'); try { const r = await fn(api); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } },
    close: async () => db.close(),
  };
  for (const s of SCHEMA.sqlite) db.exec(s);
  for (const s of ADD_COLUMNS.sqlite.concat(INDEXES.sqlite)) { try { db.exec(s); } catch (e) { if (!/duplicate|already exists/i.test(e.message)) throw e; } }
  return api;
}

async function openPostgres(url) {
  let pg;
  try { pg = require('pg'); } catch (e) { throw new Error('PostgreSQL needs the "pg" package (it is in the Docker image; outside Docker run: npm install --prefix docker).'); }
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  const wrap = (c) => ({
    kind: 'postgres',
    get: async (sql, a = []) => fixRow((await c.query(pgSql(sql), a)).rows[0]),
    all: async (sql, a = []) => (await c.query(pgSql(sql), a)).rows.map(fixRow),
    run: async (sql, a = []) => ({ changes: (await c.query(pgSql(sql), a)).rowCount }),
  });
  const api = Object.assign(wrap(pool), {
    tx: async (fn) => {
      const c = await pool.connect();
      try { await c.query('BEGIN'); const r = await fn(wrap(c)); await c.query('COMMIT'); return r; }
      catch (e) { await c.query('ROLLBACK').catch(() => {}); throw e; }
      finally { c.release(); }
    },
    close: () => pool.end(),
  });
  for (const s of SCHEMA.postgres) await pool.query(s);
  await addColumns('postgres', (s) => pool.query(s));
  return api;
}

async function openMysql(url) {
  let mysql;
  try { mysql = require('mysql2/promise'); } catch (e) { throw new Error('MySQL/MariaDB needs the "mysql2" package (it is in the Docker image; outside Docker run: npm install --prefix docker).'); }
  const pool = mysql.createPool({ uri: url.replace(/^mariadb:/i, 'mysql:'), connectionLimit: 10, charset: 'utf8mb4', supportBigNumbers: true, bigNumberStrings: true });
  const wrap = (c) => ({
    kind: 'mysql',
    get: async (sql, a = []) => fixRow((await c.query(sql, a))[0][0]),
    all: async (sql, a = []) => (await c.query(sql, a))[0].map(fixRow),
    run: async (sql, a = []) => ({ changes: (await c.query(sql, a))[0].affectedRows }),
  });
  const api = Object.assign(wrap(pool), {
    tx: async (fn) => {
      const c = await pool.getConnection();
      try { await c.beginTransaction(); const r = await fn(wrap(c)); await c.commit(); return r; }
      catch (e) { await c.rollback().catch(() => {}); throw e; }
      finally { c.release(); }
    },
    close: () => pool.end(),
  });
  for (const s of SCHEMA.mysql) await pool.query(s);
  await addColumns('mysql', (s) => pool.query(s));
  return api;
}

// Waits for a database server that is still starting (common right after "docker compose up").
async function retry(fn, tries = 30) {
  for (let i = 1; ; i++) {
    try { return await fn(); } catch (e) {
      const transient = /ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|starting up|PROTOCOL_CONNECTION_LOST|ER_CON_COUNT|Connection terminated/i.test(String(e.code || '') + ' ' + e.message);
      if (!transient || i >= tries) throw e;
      if (i === 1) console.log('Waiting for the database to accept connections…');
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function open(url, dataDir) {
  const kind = kindOf(url);
  const file = path.join(dataDir, 'alctb.db');
  const db = kind === 'sqlite' ? openSqlite(file) : await retry(() => (kind === 'postgres' ? openPostgres(url) : openMysql(url)));
  db.label = describe(kind, url, file);
  db.upsertQuestion = upsertSql(kind, 'questions', ['user_id', 'id'], ['data', 'deleted', 'updated_at', 'pub']);
  db.upsertState = upsertSql(kind, 'app_state', ['user_id'], ['data', 'updated_at']);
  db.sqliteFile = file;
  return db;
}

// First start on Postgres/MySQL with an old SQLite file next to it: copy everything over once.
async function copyFromSqlite(db, file, fs) {
  if (db.kind === 'sqlite' || !fs.existsSync(file)) return null;
  if ((await db.get('SELECT COUNT(*) AS n FROM users')).n) return null;
  const old = openSqlite(file);
  const users = await old.all('SELECT * FROM users');
  if (!users.length) { await old.close(); return null; }
  const tokens = await old.all('SELECT * FROM tokens WHERE expires > ?', [Date.now()]);
  const questions = await old.all('SELECT * FROM questions');
  const states = await old.all('SELECT * FROM app_state');
  const groups = await old.all('SELECT * FROM user_groups'), members = await old.all('SELECT * FROM group_members');
  const banks = await old.all('SELECT * FROM team_banks');
  await db.tx(async (t) => {
    for (const u of users) await t.run('INSERT INTO users (id, email, pw, admin, created_at) VALUES (?,?,?,?,?)', [u.id, u.email, u.pw, u.admin, u.created_at]);
    for (const k of tokens) await t.run('INSERT INTO tokens (token, user_id, kind, expires) VALUES (?,?,?,?)', [k.token, k.user_id, k.kind, k.expires]);
    for (const q of questions) await t.run('INSERT INTO questions (user_id, id, data, deleted, updated_at, pub) VALUES (?,?,?,?,?,?)', [q.user_id, q.id, q.data, q.deleted, q.updated_at, q.pub || 0]);
    for (const s of states) await t.run('INSERT INTO app_state (user_id, data, updated_at) VALUES (?,?,?)', [s.user_id, s.data, s.updated_at]);
    for (const g of groups) await t.run('INSERT INTO user_groups (id, name, created_at) VALUES (?,?,?)', [g.id, g.name, g.created_at]);
    for (const m of members) await t.run('INSERT INTO group_members (group_id, user_id) VALUES (?,?)', [m.group_id, m.user_id]);
    for (const b of banks) await t.run('INSERT INTO team_banks (id, owner, data, deleted, updated_at) VALUES (?,?,?,?,?)', [b.id, b.owner, b.data, b.deleted, b.updated_at]);
  });
  await old.close();
  return { users: users.length, questions: questions.length };
}

module.exports = { open, copyFromSqlite, kindOf };
