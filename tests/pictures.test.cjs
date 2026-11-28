// LaTeX pictures (scripts/pictures.sty, IMAGE-RULES.md): every command compiles and the SVG has the size the rules say.
// Needs TeX Live (her Mac); skipped where it isn't installed (CI).
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const bin = ['/Library/TeX/texbin'].concat((process.env.PATH || '').split(':'));
const has = n => bin.some(d => fs.existsSync(path.join(d, n)));
test('LaTeX pictures compile to SVG at the right size', { skip: has('dvilualatex') && has('dvisvgm') ? false : 'TeX Live not installed' }, () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'pics-'));
  execFileSync('bash', [path.join(__dirname, '../scripts/picture-svg.sh'), path.join(__dirname, 'fixtures/pictures.tex'), out], { stdio: 'pipe' });
  const files = fs.readdirSync(out).sort(); assert.equal(files.length, 5);
  const svg = files.map(f => fs.readFileSync(path.join(out, f), 'utf8'));
  svg.forEach(s => { assert.match(s, /^<\?xml[\s\S]*<svg /); assert.doesNotMatch(s, /<text|<image|<script|href='(?!#)/); }); // outlines only
  const width = s => +/width='([\d.]+)pt'/.exec(s)[1];
  assert.ok(width(svg[1]) > 10 * 12.1 + 17 && width(svg[1]) < 10 * 12.1 + 45, 'grid of 10 boxes of 12.1: ' + width(svg[1]));
  assert.ok(width(svg[2]) > 6 * 18 && width(svg[2]) < 6 * 18 + 45, 'grid of 6 boxes of 18: ' + width(svg[2]));
  assert.ok(svg[1].includes('#c4c5c7'), 'grid gray');
  svg.forEach(s => { // one drawing per label font, Arial last, no id used twice
    assert.deepEqual([...s.matchAll(/<g class='v' id='(\w+)'>/g)].map(m => m[1]), ['schoolbook', 'times', 'arial']);
    const ids = [...s.matchAll(/\bid='([^']+)'/g)].map(m => m[1]); assert.equal(new Set(ids).size, ids.length);
    [...s.matchAll(/href='#([^']+)'/g)].forEach(m => assert.ok(ids.includes(m[1]), m[1])); });
  const by = svg[0].split("<g class='v'").slice(1).map(x => x.replace(/[sta]-/g, '')); assert.notEqual(by[0], by[1]); assert.notEqual(by[1], by[2]);
  // a folder of single pictures: each SVG is named like its file, whatever the order
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'picdir-'));
  fs.writeFileSync(path.join(dir, '0126-03.tex'), '\\begin{tikzpicture}\\draw(0,0)--(50,0);\\end{tikzpicture}\n');
  fs.writeFileSync(path.join(dir, 'spr24-01.tex'), '\\begin{tikzpicture}\\draw(0,0)--(200,0);\\end{tikzpicture}\n');
  execFileSync('bash', [path.join(__dirname, '../scripts/picture-svg.sh'), dir, dir + '/svg'], { stdio: 'pipe' });
  const w = n => width(fs.readFileSync(path.join(dir, 'svg', n), 'utf8'));
  assert.ok(Math.abs(w('0126-03.svg') - 54) < 2, String(w('0126-03.svg'))); assert.ok(Math.abs(w('spr24-01.svg') - 204) < 2);
  fs.writeFileSync(path.join(dir, 'bad.tex'), '\\begin{tikzpicture}\\draw[axis](0,0)--(50,0) (0,9)--(50,9);\\end{tikzpicture}\n');
  assert.throws(() => execFileSync('bash', [path.join(__dirname, '../scripts/picture-svg.sh'), dir, dir + '/svg'], { stdio: 'pipe' }), 'arrows lost on the first line');
});
test('bank-file.cjs: drawn pictures (SVG) and tables kept as Markdown in images/', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bank-')), out = path.join(dir, 'b.json');
  fs.mkdirSync(path.join(dir, 'questions')); fs.mkdirSync(path.join(dir, 'images'));
  fs.writeFileSync(path.join(dir, 'images', 'p.svg'), "<svg xmlns='http://www.w3.org/2000/svg' width='72pt' height='36pt'/>");
  fs.writeFileSync(path.join(dir, 'images', 't.md'), '| $x$ | $f(x)$ |\n|:-:|:-:|\n| −2 | 6 |\n');
  fs.writeFileSync(path.join(dir, 'questions', 'q1.md'), '---\nid: q1\ntype: multiple choice\nanswer: 1\n---\n\nThe table below.\n\n![table](../images/t.md){width=0in}\n\n![picture](../images/p.svg){width=1.000in}\n\nWhich?\n\n1. $\\sqrt[3]{m^{5}}$\n2. $\\sum_{i=2}^{6}(10-3i)$\n');
  execFileSync(process.execPath, [path.join(__dirname, '../scripts/bank-file.cjs'), dir, '--out', out, '--course', 'Algebra 1'], { stdio: 'pipe' });
  const q = JSON.parse(fs.readFileSync(out, 'utf8')).questions[0];
  assert.match(q.html, /<table class="q-tbl q-grid"><tr><td><span class="m">x<\/span><\/td>/, 'the table is a real table');
  assert.match(q.html, /src="data:image\/svg\+xml;base64,/, 'the SVG keeps its type');
  assert.match(q.choices[0], /<sup>3<\/sup><span class="m-sqrt">/, 'a root index is a raised number before the root sign');
  assert.match(q.choices[1], /∑<sub>i<span class="m-op">=<\/span>2<\/sub><sup>6<\/sup>/, 'sigma notation: limits as sub- and superscript');
});

test('pictures go after the question text; JMAP fields are hidden in bank files (2026-11-28)', () => {
  execFileSync(process.execPath, [path.join(__dirname, '../scripts/pics-after.cjs')], { stdio: 'pipe' }); // its own checks
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bank-')), out = path.join(dir, 'b.json');
  fs.mkdirSync(path.join(dir, 'questions')); fs.mkdirSync(path.join(dir, 'images'));
  fs.writeFileSync(path.join(dir, 'images', 'p.svg'), "<svg xmlns='http://www.w3.org/2000/svg' width='72pt' height='36pt'/>");
  fs.writeFileSync(path.join(dir, 'questions', 'q1.md'), '---\nid: q1\ntype: multiple choice\nanswer: 1\nJMAP topic: Lines\nAlso uses: Unit 1\n---\n\nLine m is shown below.\n\n![picture](../images/p.svg){width=1.000in}\n\nWhat is its slope?\n\n1. 1\n2. 2\n');
  fs.writeFileSync(path.join(dir, 'questions', 'q2.md'), '---\nid: q2\ntype: open response\ncourses: [Algebra 2, Precalculus]\n---\n\n![picture](../images/p.svg){width=1.000in}\n\nThe graph above shows f.\n');
  execFileSync(process.execPath, [path.join(__dirname, '../scripts/bank-file.cjs'), dir, '--out', out, '--course', 'Geometry'], { stdio: 'pipe' });
  const b = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.match(b.questions[0].html, /^Line m is shown below\.<br><br>What is its slope\?<br><br><img /, 'the picture moved after the text');
  assert.match(b.questions[1].html, /^The graph below shows f\.<br><br><img /, '"above" becomes "below" when the picture moves down');
  assert.deepStrictEqual(b.fields.map(f => [f.label, !!f.hidden]), [['JMAP topic', true], ['Also uses', false]]);
  assert.deepStrictEqual([b.questions[0].courses, b.questions[1].courses, b.courses], [['Geometry'], ['Algebra 2', 'Precalculus'], ['Geometry', 'Algebra 2', 'Precalculus']], 'a question can list its own courses');
});
