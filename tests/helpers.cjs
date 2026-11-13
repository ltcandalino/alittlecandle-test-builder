// Shared helpers for the test suite (node:test + Playwright).
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const net = require('net');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const APP = 'file://' + path.join(ROOT, 'ALittleCandleTestBuilder.html');
const FIX = path.join(__dirname, 'fixtures');
const OUT = path.join(__dirname, 'out');
fs.mkdirSync(OUT, { recursive: true });

const launch = () => chromium.launch();

// Opens the app in a fresh browser context (its own empty storage).
async function openApp(browser, url = APP) {
  const context = await browser.newContext({ viewport: { width: 1400, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  page.on('dialog', d => d.accept());
  await page.goto(url);
  await page.waitForFunction(() => window.__tb || document.querySelector('.login'));
  return { context, page, errors };
}

// Adds simple questions to the current course. specs: [{type:'mc', ...overrides}]
function addQuestions(page, specs) {
  return page.evaluate(specs => {
    const T = window.__tb, st = T.state, ids = [];
    specs.forEach((sp, i) => {
      const type = sp.type || 'mc';
      const q = Object.assign({
        id: T.uid(), course: st.course, bank: 'Test bank', source: 'Test source', type,
        unit: '1', section: '1', topic: 'Topic', points: type === 'mc' || type === 'tf' ? 2 : 4,
        html: 'Question ' + (i + 1),
        choices: type === 'mc' || type === 'bm' ? ['A1', 'A2', 'A3', 'A4'] : [],
        answer: type === 'mc' || type === 'bm' ? 0 : type === 'tf' ? 'T' : '',
        lines: 2, space: 1, answerArea: 'lines',
      }, sp);
      st.questions.push(q); ids.push(q.id);
    });
    T.state = T.normalize(st);
    return ids;
  }, specs);
}

const select = (page, ids) => page.evaluate(ids => { window.__tb.state.selected = ids.slice(); }, ids);
const settings = (page, s) => page.evaluate(s => Object.assign(window.__tb.state.settings, s), s);
const fn = (page, name, ...args) => page.evaluate(([name, args]) => window.__tb.fn[name](...args), [name, args]);
const gotoTab = (page, tab) => page.evaluate(tab => { window.__tb.ui().tab = tab; window.__tb.render(); }, tab);
const b64 = file => fs.readFileSync(file).toString('base64');
const privateFixtures = (ext) => {
  const dir = path.join(FIX, 'private');
  return fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith(ext)).map(f => path.join(dir, f)) : [];
};

function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
    s.on('error', rej);
  });
}

// TEST_DATABASE_URL=postgres://… or mysql://… runs the server tests on that database server instead of
// SQLite. Each fresh test server gets its own new, empty database there (the URL needs rights to create one).
const TEST_DB = process.env.TEST_DATABASE_URL || '';
const dbOfDir = new Map();
async function freshDatabase(adminUrl) {
  const name = 'alctb_t' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const req = (m) => require(path.join(ROOT, 'docker', 'node_modules', m));
  if (/^postgres/i.test(adminUrl)) {
    const c = new (req('pg').Client)({ connectionString: adminUrl }); await c.connect();
    await c.query('CREATE DATABASE ' + name); await c.end();
  } else {
    const c = await req('mysql2/promise').createConnection({ uri: adminUrl.replace(/^mariadb:/i, 'mysql:') });
    await c.query('CREATE DATABASE ' + name + ' CHARACTER SET utf8mb4'); await c.end();
  }
  const u = new URL(adminUrl); u.pathname = '/' + name; return u.toString();
}

// Starts docker/server.js with a temporary data folder (and, with TEST_DATABASE_URL, a new database).
async function startServer(env = {}) {
  const port = await freePort();
  const dataDir = env.DATA_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'alctb-'));
  if (TEST_DB && !('DATABASE_URL' in env)) {
    if (!dbOfDir.has(dataDir)) dbOfDir.set(dataDir, await freshDatabase(TEST_DB));
    env = Object.assign({ DATABASE_URL: dbOfDir.get(dataDir) }, env);
  }
  const cfg = Object.assign({ PORT: String(port), DATA_DIR: dataDir, ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin-password-1' }, env);
  const proc = spawn(process.execPath, ['--no-warnings', path.join(ROOT, 'docker', 'server.js')],
    { env: Object.assign({}, process.env, cfg), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  proc.stdout.on('data', d => { log += d; });
  proc.stderr.on('data', d => { log += d; });
  const url = 'http://127.0.0.1:' + port;
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(url + '/healthz'); if (r.ok) break; } catch (e) { /* not up yet */ }
    if (proc.exitCode !== null) throw new Error('server exited:\n' + log);
    await new Promise(r => setTimeout(r, 100));
  }
  const stop = () => new Promise(res => { if (proc.exitCode !== null) return res(); proc.once('exit', res); proc.kill(); });
  return { url, port, dataDir, proc, stop, log: () => log, env: cfg };
}

// Small JSON client for the server API.
function api(base) {
  const call = async (method, p, { token, body, raw } = {}) => {
    const headers = {};
    if (token) headers.Authorization = 'Bearer ' + token;
    if (body !== undefined && !raw) headers['Content-Type'] = 'application/json';
    const r = await fetch(base + p, { method, headers, body: body === undefined ? undefined : raw ? body : JSON.stringify(body) });
    const text = await r.text();
    let json = null; try { json = JSON.parse(text); } catch (e) { /* not json */ }
    return { status: r.status, json, text, headers: r.headers };
  };
  return {
    call,
    login: async (email, password) => (await call('POST', '/auth/v1/token?grant_type=password', { body: { email, password } })),
  };
}

module.exports = { TEST_DB, freshDatabase, ROOT, APP, FIX, OUT, launch, openApp, addQuestions, select, settings, fn, gotoTab, b64, privateFixtures, freePort, startServer, api };
