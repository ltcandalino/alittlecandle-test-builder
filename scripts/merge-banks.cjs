#!/usr/bin/env node
/* Combines several app bank files (.json) into one bank file with a new bank name.
   Questions keep their ids, so opening the new file in the app moves questions you already have into the new bank
   (no copies) when they came from these bank files. Her own fields are merged by name.

   node scripts/merge-banks.cjs "<new bank name>" <bank file.json> <bank file.json> … [--out <file.json>]
     --out  default: "<new bank name> bank file.json" next to the first file */
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), opt = k => { const i = args.indexOf(k); return i >= 0 ? args.splice(i, 2)[1] : null; };
const OUTF = opt('--out'), [NAME, ...FILES] = args;
if (!NAME || !FILES.length) { console.error('usage: node scripts/merge-banks.cjs "<new bank name>" <bank file.json>… [--out file.json]'); process.exit(1); }

const fields = new Map(), courses = [], questions = [], ids = new Set(), refs = new Map();
for (const f of FILES) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (d.app !== 'test-builder' || d.kind !== 'bank' || !Array.isArray(d.questions)) { console.error(f + ' is not a bank file'); process.exit(1); }
  const map = {}; // a field's id in this file -> its id in the new file (same label = same field)
  for (const x of d.fields || []) { const same = [...fields].find(([, l]) => l.toLowerCase() === x.label.toLowerCase()); if (same) map[x.id] = same[0]; else { const id = fields.has(x.id) ? x.id + '_' + fields.size : x.id; fields.set(id, x.label); map[x.id] = id; } }
  for (const c of d.courses || []) if (!courses.includes(c)) courses.push(c);
  for (const q of d.questions) {
    if (ids.has(q.id)) { console.error('the same question id is in two files: ' + q.id + ' (' + path.basename(f) + ')'); process.exit(1); }
    ids.add(q.id);
    if (q.ref) { if (refs.has(q.ref)) console.log('note: exam reference ' + q.ref + ' is in ' + refs.get(q.ref) + ' and ' + path.basename(f)); refs.set(q.ref, path.basename(f)); }
    const n = Object.assign({}, q, { bank: NAME });
    if (q.extra) { n.extra = {}; for (const [k, v] of Object.entries(q.extra)) n.extra[map[k] || k] = v; }
    questions.push(n);
  }
  console.log(path.basename(f) + ': ' + d.questions.length + ' questions');
}
const out = OUTF || path.join(path.dirname(path.resolve(FILES[0])), NAME + ' bank file.json');
fs.writeFileSync(out, JSON.stringify({ app: 'test-builder', kind: 'bank', version: 1, saved: new Date().toISOString(), bank: NAME, courses, fields: [...fields].map(([id, label]) => ({ id, label })), questions }));
console.log('wrote ' + out + ': ' + questions.length + ' questions, course ' + courses.join(', ') + ', fields ' + [...fields.values()].join(', ') + ' (' + (fs.statSync(out).size / 1e6).toFixed(1) + ' MB)');
