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
});
