// Importers: ExamView .bnk, Word .docx, PDF. Uses the sample files in tests/fixtures/.
// Real banks in tests/fixtures/private/ (not committed) are tested too when present.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { launch, openApp, goPlace, FIX, b64, privateFixtures } = require('./helpers.cjs');

let browser, page, errors;
before(async () => { browser = await launch(); ({ page, errors } = await openApp(browser)); });
after(async () => { await browser.close(); });

const bytes = 'const u=x=>Uint8Array.from(atob(x),c=>c.charCodeAt(0)).buffer;';

describe('Word (.docx)', () => {
  let r;
  before(async () => {
    r = await page.evaluate(async ([d]) => { const u = x => Uint8Array.from(atob(x), c => c.charCodeAt(0)).buffer; return DOCX.parse(u(d), 'sample-exam.docx'); }, [b64(path.join(FIX, 'sample-exam.docx'))]);
  });
  test('finds all three questions', () => assert.equal(r.questions.length, 3));
  test('multiple choice with four choices and the part', () => {
    const q = r.questions[0];
    assert.equal(q.type, 'mc'); assert.equal(q.part, 'Part I'); assert.equal(q.points, 2);
    assert.match(q.html, /slope of the line/); assert.deepEqual(q.choices, ['1', '2', '3', '4']);
  });
  test('special characters survive (degree sign)', () => assert.equal(r.questions[1].choices[0], '30°'));
  test('open response with [4] credits in Part II', () => {
    const q = r.questions[2];
    assert.equal(q.type, 'es'); assert.equal(q.part, 'Part II'); assert.equal(q.points, 4); assert.doesNotMatch(q.html, /\[4\]/);
  });
  test('running header', () => assert.equal(r.header.running, 'Geometry'));
  test('a file that is not a Word document is refused cleanly', async () => {
    const msg = await page.evaluate(async () => { try { await DOCX.parse(new TextEncoder().encode('not a zip').buffer, 'x.docx'); return 'no error'; } catch (e) { return String(e && e.message || e); } });
    assert.notEqual(msg, 'no error');
  });
});

describe('PDF', () => {
  let found;
  before(async () => {
    found = await page.evaluate(async ([d]) => {
      const u = x => Uint8Array.from(atob(x), c => c.charCodeAt(0));
      const doc = await PDFIMP.open(u(d));
      return doc.found.map(f => ({ num: f.num, page: f.page, stem: f.stemText, choices: f.choices && f.choices.map(c => c.text), suggest: f.suggest }));
    }, [b64(path.join(FIX, 'sample-questions.pdf'))]);
  });
  test('finds the four numbered questions', () => assert.deepEqual(found.map(f => f.num), [1, 2, 3, 4]));
  test('reads the question text', () => {
    assert.equal(found[0].stem, 'What is 3 + 4?');
    assert.equal(found[3].stem, 'Explain why vertical angles are congruent.');
  });
  test('reads (1)–(4) choices', () => {
    assert.deepEqual(found[0].choices, ['5', '6', '7', '8']);
    assert.deepEqual(found[1].choices, ['(1, 2)', '(2, 1)', '(0, 1)', '(3, 3)']);
  });
  test('open question has no choices', () => assert.equal(found[3].choices, null));
  test('makes pictures of each question', async () => {
    const n = await page.evaluate(async ([d]) => {
      const u = x => Uint8Array.from(atob(x), c => c.charCodeAt(0));
      const doc = await PDFIMP.open(u(d)); await PDFIMP.cropAll(doc);
      return doc.found.filter(f => f.stemImg && /^data:image\/png/.test(f.stemImg.src || f.stemImg.url || f.stemImg.data || PDFIMP.imgHtml(f.stemImg))).length;
    }, [b64(path.join(FIX, 'sample-questions.pdf'))]);
    assert.equal(n, 4);
  });
});

describe('ExamView (.bnk)', () => {
  test('a file that is not a bank is refused cleanly', async () => {
    const r = await page.evaluate(async () => { try { const x = await BNK.parse(new TextEncoder().encode('hello').buffer, 'x.bnk'); return x.questions.length === 0 ? 'empty' : 'parsed'; } catch (e) { return 'error'; } });
    assert.ok(['error', 'empty'].includes(r), r);
  });
  const banks = privateFixtures('.bnk');
  if (!banks.length) test('real banks (put .bnk files in tests/fixtures/private/ to test them)', { skip: 'no private banks' }, () => {});
  for (const file of banks) {
    describe(path.basename(file), () => {
      let r;
      before(async () => {
        r = await page.evaluate(async ([d, name]) => {
          const u = x => Uint8Array.from(atob(x), c => c.charCodeAt(0)).buffer;
          const x = await BNK.parse(u(d), name);
          return { title: x.title, warnings: x.warnings, questions: x.questions.map(q => ({ type: q.type, html: q.html, choices: q.choices, answer: q.answer, points: q.points, ref: q.ref })) };
        }, [b64(file), path.basename(file)]);
      });
      test('has questions', () => assert.ok(r.questions.length > 0));
      test('every question has text', () => {
        // "undefined" can be real math ("tan x is undefined when…"), so only look for leftovers of broken code
        const bad = r.questions.filter(q => !q.html || /\[object \w+\]|^undefined|>undefined<|>NaN</.test(q.html.replace(/data:[^"]+/g, '')));
        assert.equal(bad.length, 0, bad.slice(0, 3).map(q => q.html).join(' | '));
      });
      test('every multiple-choice answer points at a real choice', () => {
        // a few bank questions have no answer marked (the reader reports "no answer"); those are allowed
        // (the reader sets those to -1 and warns "no answer"; the app then asks for the answer)
        const bad = r.questions.filter(q => q.type === 'mc' && q.answer !== -1 && !(q.answer >= 0 && q.answer < q.choices.length));
        assert.equal(bad.length, 0);
      });
      test('pictures are not lost', () => {
        const all = r.questions.map(q => q.html + (q.choices || []).join(''));
        const missing = all.filter(h => /q-missing/.test(h)).length;
        assert.ok(missing <= Math.max(1, all.length * 0.02), missing + ' questions show [picture] instead of the picture');
      });
      test('tables are read, with the text and choices after them', () => {
        // older versions cut a question off at its table ("…shown in the table below." and nothing more)
        const cut = r.questions.filter(q => /table (below|shown)\W*$/i.test(q.html.replace(/<[^>]+>/g, '').trim()) && !/<table/.test(q.html));
        assert.equal(cut.length, 0, cut.slice(0, 3).map(q => q.ref || q.html.slice(0, 60)).join(' | '));
        if (/GEO2024-2026/.test(file)) {
          const census = r.questions.find(q => q.ref === '012620geo'), metals = r.questions.find(q => q.ref === '082526geo');
          assert.equal(census.choices.length, 4); assert.match(census.choices[census.answer], /^Pennsylvania, New York/);
          assert.match(census.html, /colspan="3"><b>2020 State Population and Land Area<\/b>/); assert.match(census.html, /mi<sup>2<\/sup>/);
          assert.match(metals.html, /<td>Silver<\/td><td>10\.5<\/td>.*Using the table above/);
        }
      });
      test('the composition sign is ∘ (not ž) and subscripts are subscripts', () => {
        const all = r.questions.map(q => q.html + (q.choices || []).join(''));
        assert.equal(all.filter(h => /ž/.test(h)).length, 0, 'no ž left');
        if (/GE2013-2014/.test(file)) assert.match(r.questions.find(q => q.ref === '081336ge').html, /r<sub>x-axis<\/sub>∘T<sub>7,5<\/sub>/);
      });
      test('Greek letters, prime marks and no blank equations', () => {
        const all = r.questions.map(q => q.html + (q.choices || []).join('') + q.answer), blank = all.join('').match(/<span class="m"><\/span>/g) || [];
        assert.ok(blank.length <= 3, blank.length + ' equations came in blank');
        if (/GEOCCSS2014-2016/.test(file)) { assert.ok(r.questions.find(q => q.ref === '081518geo').choices.some(c => /2π/.test(c.replace(/<[^>]+>/g, ''))), '2π, not 2p'); assert.match(r.questions.find(q => q.ref === '061516geo').html, /△A′B′C′/); assert.match(r.questions.find(q => q.ref === '081509geo').html, /If <span class="m">x<sup>2<\/sup>/); }
        if (/Ch 11 Test Bank/.test(file)) assert.ok(all.some(h => /χ<sup>2<\/sup>/.test(h)), 'chi-square');
      });
      test('superscripts and subscripts in plain text are kept (cm³, H₀)', () => {
        if (/GEO2024-2026/.test(file)) { assert.match(r.questions.find(q => q.ref === '012614geo').html, /333 cm<sup>3<\/sup>\. {1,2}To the/); assert.match(r.questions.find(q => q.ref === '082532geo').html, /1000 cm<sup>3<\/sup>/); }
        if (/Ch 10 Test Bank/.test(file)) assert.ok(r.questions.some(q => /H<sub>0<\/sub>/.test(q.html)));
      });
      test('written-response answers are read (the second text block of a question)', () => {
        if (!/^BFW/.test(path.basename(file))) return; // JMAP banks have no written answers
        const es = r.questions.filter(q => q.type === 'es');
        assert.ok(es.length && es.every(q => q.answer), 'every open question has its answer');
        if (/Ch 1 Lessons 1\.5/.test(file)) assert.match(es[0].answer, /^\(a\) .*The amounts of total oil recovered typically vary/);
        if (/Ch 7 Lessons/.test(file)) assert.match(r.questions.map(q => q.html).join(''), /<span class="m-ov">x<\/span>/, 'x̄ is x with a bar');
      });
      test('equation line breaks are understood', (t) => {
        assert.deepEqual(r.warnings.filter(w => /\btag13\b/.test(w)), []);
        // other equation codes the reader doesn't know yet are listed, not failed (see AGENTS.md backlog)
        const other = r.warnings.filter(w => /: (tag\d+|template)/.test(w));
        if (other.length) t.diagnostic(other.length + ' equation parts skipped: ' + [...new Set(other.map(w => w.split(': ')[1]))].join(' '));
      });
      test('equations with more than one line keep their line breaks', () => {
        // ExamView marks "next line" with code 13 (systems of equations, stacked lines)
        // A choice that is only math with two equals signs and nothing between them (no comma, semicolon
        // or space) is two equations run together; they must be on separate lines.
        // Chains like m∠A=m∠B=m∠C (no numbers), μ1=μ2=μ3 and worked fractions (t=(0.015−0)/0.008=1.875) are fine.
        const bad = [];
        for (const q of r.questions) for (const c of q.choices || []) {
          const t = c.replace(/<br>/g, '\n').replace(/<[^>]+>/g, '');
          if (/^<span class="m">/.test(c) && !/m-frac|μ/.test(c) && /\d/.test(t) && !/\b(and|or)\b|[a-z]{4,}/i.test(t) && t.split('\n').some(line => (line.match(/=/g) || []).length >= 2 && !/[,;]|\s{2,}/.test(line))) bad.push(q.ref + ': ' + t);
        }
        assert.deepEqual(bad.slice(0, 5), []);
      });
      test('references parse into exam labels', async () => {
        const refs = r.questions.map(q => q.ref).filter(Boolean);
        if (!refs.length) return;
        const ok = await page.evaluate(refs => refs.filter(x => window.__tb.fn.parseRef(x)).length, refs);
        assert.ok(ok / refs.length > 0.8, ok + ' of ' + refs.length + ' references parsed');
      });
    });
  }
});

test('text styles after the text: superscripts and subscripts are marked, not punctuation or other cells', async () => {
  const out = await page.evaluate(() => {
    const text = 'is 5 cm3. H0: x\x11y', runs = [[0, 0], [7, 1], [8, 0], [11, 2], [13, 0], [14, 2], [17, 0]], styles = [[11, 0, 0, 400, 0, 0], [11, 8, 0, 400, 0, 0], [11, 20, 0, 700, 0, 0]];
    const dv = new DataView(new ArrayBuffer(400)); dv.setInt32(20, runs.length, true); dv.setInt32(24, styles.length, true);
    let o = 101; runs.forEach(r => { dv.setInt32(o, r[0], true); dv.setInt32(o + 4, r[1], true); o += 12; }); styles.forEach(s => s.forEach(v => { dv.setInt32(o, v, true); o += 4; }));
    return BNK._markScripts(text, new Uint8Array(dv.buffer), { i32: x => dv.getInt32(x, true) }, 0, 60, 400).replace(/[\ue001-\ue004]/g, c => ['^(', ')', '_(', ')'][c.charCodeAt(0) - 0xe001]);
  });
  assert.equal(out, 'is 5 cm^(3). H_(0): _(x)\x11_(y)');
});
describe('importing a bank again fills blank equations and Greek letters, keeps labels and edits', () => {
  const g14 = privateFixtures('.bnk').find(f => /GEOCCSS2014-2016/.test(f));
  test('re-import GEOCCSS2014-2016', { skip: !g14 && 'needs GEOCCSS2014-2016EXAMs.bnk in tests/fixtures/private/' }, async () => {
    const { page: p2, errors: e2, context } = await openApp(browser);
    const imp = async () => { await goPlace(p2, 'io', 'import'); await p2.setInputFiles('input[type=file][accept*=".bnk"]', g14);
      await p2.waitForFunction(() => /2014-2016/.test((document.querySelector('#bnkRes') || {}).textContent || ''), null, { timeout: 60000 }); return p2.textContent('#bnkRes'); };
    await imp();
    await p2.evaluate(() => { const S = window.__tb.state, old = h => h.replace(/π/g, 'p').replace(/θ/g, 'q').replace(/′/g, ''), g = r => S.questions.find(q => q.ref === r); // as older versions read them
      S.questions.forEach(q => { q.html = old(q.html); if (q.choices) q.choices = q.choices.map(old); });
      const c = g('081509geo'); c.html = c.html.replace(/<span class="m">[\s\S]*<\/span>(?= is the equation)/, '<span class="m"></span>'); c.unit = '10';
      g('061516geo').html += ' (my edit)'; });
    assert.match(await imp(), /nothing was added.*math that came in wrong/);
    const q = await p2.evaluate(() => Object.fromEntries(window.__tb.state.questions.map(q => [q.ref, { h: q.html, u: q.unit, c: (q.choices || []).join(' ').replace(/<[^>]+>/g, '') }])));
    assert.match(q['081509geo'].h, /x<sup>2<\/sup>/); assert.equal(q['081509geo'].u, '10'); assert.match(q['081518geo'].c, /2π/);
    assert.match(q['061516geo'].h, /\(my edit\)$/); assert.doesNotMatch(q['061516geo'].h, /′/, 'an edited question is left alone');
    assert.deepEqual(e2, []); await context.close();
  });
});
describe('importing a bank again repairs subscripts older versions ran into the text', () => {
  const ge = privateFixtures('.bnk').find(f => /GE2013-2014/.test(f));
  test('re-import GE2013-2014: unedited questions get their subscripts, edited ones are kept', { skip: !ge && 'needs GE2013-2014EXAMs.bnk in tests/fixtures/private/' }, async () => {
    const { page: p2, errors: e2, context } = await openApp(browser);
    const imp = async () => { await goPlace(p2, 'io', 'import'); await p2.setInputFiles('input[type=file][accept*=".bnk"]', ge);
      await p2.waitForFunction(() => /GEOMETRY 2013-2014/.test((document.querySelector('#bnkRes') || {}).textContent || ''), null, { timeout: 60000 }); return p2.textContent('#bnkRes'); };
    await imp();
    await p2.evaluate(() => { const S = window.__tb.state, old = h => h.replace(/<\/?sub>/g, '');
      S.questions.forEach(q => { q.html = old(q.html); if (q.choices) q.choices = q.choices.map(old); }); // as older versions read them
      S.questions.find(q => q.ref === '011336ge').html += ' (my edit)'; });
    const msg = await imp();
    assert.match(msg, /nothing was added.*math that came in wrong/);
    const qs = await p2.evaluate(() => Object.fromEntries(window.__tb.state.questions.filter(q => /^0[18]1336ge$/.test(q.ref)).map(q => [q.ref, q.html])));
    assert.match(qs['081336ge'], /r<sub>x-axis<\/sub>∘T<sub>7, 5<\/sub>/);
    assert.match(qs['011336ge'], /\(my edit\)$/); assert.doesNotMatch(qs['011336ge'], /<sub>/, 'an edited question is left alone');
    assert.deepEqual(e2, []); await context.close();
  });
});

test('no page errors', () => assert.deepEqual(errors, []));
