// Every real ExamView bank in tests/fixtures/private/ (not committed): reads without hanging,
// keeps every question, and puts each detail in the right field.
// Runs the reader in a worker thread so a bank that would freeze the browser fails here instead of hanging.
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { Worker } = require('worker_threads');
const { privateFixtures } = require('./helpers.cjs');

const READER = path.join(__dirname, '..', 'src', 'bnk.js');
const LIMIT_MS = 30000;

function readBank(file) {
  return new Promise((resolve, reject) => {
    const w = new Worker(`
      const { parentPort, workerData } = require('worker_threads');
      const fs = require('fs');
      const BNK = require(workerData.reader);
      const b = fs.readFileSync(workerData.file);
      const t = Date.now();
      BNK.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length), workerData.name).then(r => parentPort.postMessage({
        ms: Date.now() - t, found: r.found, title: r.title, warnings: r.warnings,
        questions: r.questions.map(q => ({ ref: q.ref, type: q.type, points: q.points, topic: q.topic, subtopic: q.subtopic, standard: q.standard })),
      }), e => parentPort.postMessage({ error: String(e && e.message || e) }));
    `, { eval: true, workerData: { reader: READER, file, name: path.basename(file) } });
    const timer = setTimeout(() => { w.terminate(); reject(new Error('still reading after ' + LIMIT_MS / 1000 + ' s (this would freeze the browser)')); }, LIMIT_MS);
    w.once('message', m => { clearTimeout(timer); w.terminate(); m.error ? reject(new Error(m.error)) : resolve(m); });
    w.once('error', e => { clearTimeout(timer); reject(e); });
  });
}

const banks = privateFixtures('.bnk');
if (!banks.length) test('real banks (put .bnk files in tests/fixtures/private/ to test them)', { skip: 'no private banks' }, () => {});

for (const file of banks) {
  describe(path.basename(file), () => {
    let r, err;
    test('reads without freezing', { timeout: LIMIT_MS + 5000 }, async () => {
      try { r = await readBank(file); } catch (e) { err = e; }
      assert.ifError(err);
    });
    test('keeps every question in the bank', () => {
      assert.ok(r, 'not read'); assert.equal(r.questions.length, r.found, r.warnings.filter(w => !/no answer|tag|sym/.test(w)).join('; '));
    });
    test('topic is a topic, not a points/type label', () => {
      assert.ok(r, 'not read');
      const bad = r.questions.filter(q => /^\d+(\.\d+)?\s*pts?\b/i.test(q.topic || ''));
      assert.deepEqual(bad.slice(0, 3).map(q => q.ref + ': ' + q.topic), []);
    });
    test('subtopic has no reference, exam name or course code in it', () => {
      assert.ok(r, 'not read');
      const bad = r.questions.filter(q => /EXAM\b|\b\d{6}[a-z]+\b|(^|; )(AI|AII|A2|GEO|IA)(;|$)/.test(q.subtopic || ''));
      assert.deepEqual(bad.slice(0, 3).map(q => q.ref + ': ' + q.subtopic), []);
    });
    if (/EXAMs?\.bnk$/i.test(file)) test('Regents exam questions have their reference (MMYYQQ)', () => {
      assert.ok(r, 'not read');
      const missing = r.questions.filter(q => !q.ref).length;
      assert.ok(missing <= Math.max(1, r.questions.length * 0.01), missing + ' of ' + r.questions.length + ' have no reference');
    });
  });
}
