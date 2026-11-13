/* Downloads: Word (.docx) now; LaTeX and PDF reuse the same pieces.
   The shared "description" of a document is the paper app.js already draws (testHtml / keyHtml / accHtml):
   each writer walks that HTML by its classes, so every format follows the preview.
   app.js calls makeExporter({...}) with the functions it needs (this file loads first). */
function makeExporter(A) {
  'use strict';
  var nVersions = A.nVersions, testHtml = A.testHtml, buildVersion = A.buildVersion, LETTERS = A.LETTERS, accOn = A.accOn, accom = A.accom, accVersion = A.accVersion, accHtml = A.accHtml, accSize = A.accSize, keyHtml = A.keyHtml, docType = A.docType, headerText = A.headerText, docTitle = A.docTitle, rightLabel = A.rightLabel, isExamDoc = A.isExamDoc, lessonTools = A.lessonTools, lessonCode = A.lessonCode, lessonSource = A.lessonSource, num = A.num, saveFile = A.saveFile;
  var appState = A.state;

  /* ---------- what goes into a download ---------- */
  // kind: 'both' | 'tests' | 'keys' | 'acc'. Same order as printing.
  function sections(kind) {
    var n = nVersions(), out = [], dt = docType();
    if (kind !== 'keys' && kind !== 'acc') for (var v = 0; v < n; v++) out.push({ type: 'test', v: v, html: testHtml(buildVersion(v), v, {}), label: n > 1 ? 'Version ' + LETTERS[v] : '' });
    if ((kind === 'acc' || (kind !== 'keys' && accOn())) && appState().selected.length) {
      var a = accom(), av = accVersion();
      out.push({ type: 'test', v: av, acc: true, html: accHtml(), label: 'Accommodated copy', font: a.font || null, size: accSize(), spacing: !!a.spacing });
    }
    if (kind !== 'tests' && kind !== 'acc') for (var k = 0; k < n; k++) out.push({ type: 'key', v: k, html: keyHtml(buildVersion(k), k), label: 'Answer key' + (n > 1 ? ' — Version ' + LETTERS[k] : '') });
    out.forEach(function (s) { s.doc = dt; });
    return out;
  }
  function fileName(kind, ext) {
    var hd = headerText(), t = docTitle(), base = (t.indexOf(hd) === 0 ? t : [hd, t].filter(Boolean).join(' ')) || 'Test';
    var what = { both: ' - tests and keys', tests: '', keys: ' - answer keys', acc: ' - accommodated copy' }[kind] || '';
    return (base + what).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() + '.' + ext;
  }

  /* ---------- reading the paper: inline text, styles and math ---------- */
  // A run is {text, b, i, u, sup, sub} | {br:1} | {img:src, w, h (inches)} | {math:'bar'|'acc'|'frac'|'rad', …}
  function inlines(node, st) {
    st = st || {};
    var out = [];
    Array.prototype.forEach.call(node.childNodes, function (c) {
      if (c.nodeType === 3) { var t = c.nodeValue.replace(/\s+/g, ' '); if (t) out.push(Object.assign({ text: t }, st)); return; }
      if (c.nodeType !== 1) return;
      var tag = c.tagName.toLowerCase(), cls = c.className || '';
      if (tag === 'br') return out.push({ br: 1 });
      if (tag === 'img') return out.push({ img: c.getAttribute('src'), w: inches(c.style.width), h: inches(c.style.height) });
      if (/\bm-ov\b/.test(cls)) return out.push({ math: 'bar', kids: inlines(c, {}) });
      if (/\bm-acc\b/.test(cls)) return out.push({ math: 'acc', chr: /m-ray/.test(cls) ? '⃗' : /m-arc/.test(cls) ? '̑' : '⃡', kids: inlines(c, {}) });
      if (/\bm-frac\b/.test(cls)) { var nu = c.querySelector('.m-num'), de = c.querySelector('.m-den'); return out.push({ math: 'frac', num: nu ? inlines(nu, {}) : [], den: de ? inlines(de, {}) : [] }); }
      if (/\bm-sqrt\b/.test(cls)) { var r = c.querySelector('.m-rad'); return out.push({ math: 'rad', kids: r ? inlines(r, {}) : [] }); }
      var s2 = Object.assign({}, st);
      if (tag === 'b' || tag === 'strong' || tag === 'th') s2.b = true;
      if (tag === 'i' || tag === 'em') s2.i = true;
      if (tag === 'u') s2.u = true;
      if (tag === 'sup') s2.sup = true;
      if (tag === 'sub') s2.sub = true;
      var fw = c.style && c.style.fontWeight; if (fw === 'bold' || +fw >= 600) s2.b = true;
      if (c.style && c.style.fontStyle === 'italic') s2.i = true;
      out = out.concat(inlines(c, s2));
      if (/^(div|p|li|tr)$/.test(tag) && c.nextSibling) out.push({ br: 1 });
    });
    return out;
  }
  function inches(v) { var m = /([\d.]+)(in|pt|px)/.exec(v || ''); if (!m) return 0; return +m[1] / ({ in: 1, pt: 72, px: 96 })[m[2]]; }
  function wrapAll(nodes) { var w = document.createElement('span'); nodes.forEach(function (n) { w.appendChild(n.cloneNode(true)); }); return w; }
  function textOf(el) { return el ? el.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function parse(html) { var t = document.createElement('template'); t.innerHTML = html; var d = document.createElement('div'); d.appendChild(t.content); return d; }

  /* ---------- pictures: shrink to print size (200 dpi), PNG or JPEG ---------- */
  function loadImg(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; if (!/^data:/.test(src)) i.crossOrigin = 'anonymous'; i.src = src; }); }
  // uses: [{src, w}] where w is the printed width in inches (0 = its natural size)
  function prepareImages(uses) {
    var map = {}, widest = {};
    uses.forEach(function (u) { if (u.src) widest[u.src] = Math.max(widest[u.src] || 0, u.w || 0); });
    return Object.keys(widest).reduce(function (p, src) {
      return p.then(function () {
        return loadImg(src).then(function (im) {
          var wIn = im.naturalWidth / 96, hIn = im.naturalHeight / 96, printW = widest[src] || wIn;
          var scale = Math.min(1, (printW * 200) / im.naturalWidth), w = Math.max(1, Math.round(im.naturalWidth * scale)), h = Math.max(1, Math.round(im.naturalHeight * scale));
          var jpeg = /^data:image\/jpe?g/i.test(src) || /\.jpe?g($|\?)/i.test(src);
          var cv = document.createElement('canvas'); cv.width = w; cv.height = h; var cx = cv.getContext('2d');
          if (jpeg) { cx.fillStyle = '#fff'; cx.fillRect(0, 0, w, h); }
          cx.drawImage(im, 0, 0, w, h);
          return new Promise(function (r) { cv.toBlob(r, jpeg ? 'image/jpeg' : 'image/png', 0.85); }).then(function (b) { return b.arrayBuffer(); }).then(function (buf) {
            map[src] = { data: new Uint8Array(buf), ext: jpeg ? 'jpeg' : 'png', wIn: wIn, hIn: hIn };
          });
        }).catch(function () { /* unreadable picture: left out */ });
      });
    }, Promise.resolve()).then(function () { return map; });
  }

  /* ---------- zip (store/deflate with the browser's own compression) ---------- */
  var CRC = (function () { var t = new Uint32Array(256); for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { var c = 0xffffffff; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  function deflate(u8) { return new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer().then(function (b) { return new Uint8Array(b); }); }
  // files: [{name, data: string | Uint8Array}] -> Promise<Blob>
  function zip(files, type) {
    var enc = new TextEncoder();
    return Promise.all(files.map(function (f) {
      var raw = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      var store = /\.(png|jpe?g)$/i.test(f.name);
      return (store ? Promise.resolve(raw) : deflate(raw)).then(function (d) { return { name: enc.encode(f.name), raw: raw, data: d, method: store ? 0 : 8, crc: crc32(raw) }; });
    })).then(function (es) {
      var parts = [], central = [], off = 0;
      es.forEach(function (e) {
        var h = new DataView(new ArrayBuffer(30));
        h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(8, e.method, true); h.setUint16(12, 0x5821, true);
        h.setUint32(14, e.crc, true); h.setUint32(18, e.data.length, true); h.setUint32(22, e.raw.length, true); h.setUint16(26, e.name.length, true);
        parts.push(h.buffer, e.name, e.data);
        var c = new DataView(new ArrayBuffer(46));
        c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(10, e.method, true); c.setUint16(14, 0x5821, true);
        c.setUint32(16, e.crc, true); c.setUint32(20, e.data.length, true); c.setUint32(24, e.raw.length, true); c.setUint16(28, e.name.length, true); c.setUint32(42, off, true);
        central.push(c.buffer, e.name);
        off += 30 + e.name.length + e.data.length;
      });
      var size = central.reduce(function (a, b) { return a + b.byteLength; }, 0), end = new DataView(new ArrayBuffer(22));
      end.setUint32(0, 0x06054b50, true); end.setUint16(8, es.length, true); end.setUint16(10, es.length, true); end.setUint32(12, size, true); end.setUint32(16, off, true);
      return new Blob(parts.concat(central, [end.buffer]), { type: type || 'application/zip' });
    });
  }

  /* ---------- Word (.docx) ---------- */
  var X = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var TW = 1440; // twips per inch

  function docx(kind) {
    var secs = sections(kind), roots = secs.map(function (s) { return parse(s.html); });
    var uses = []; roots.forEach(function (r) { Array.prototype.forEach.call(r.querySelectorAll('img'), function (i) { uses.push({ src: i.getAttribute('src'), w: inches(i.style.width) }); }); });
    if (docType() === 'lesson') lessonTools().forEach(function (k) { uses.push({ src: LESSON_ICONS[k].src, w: LESSON_ICONS[k].w / 72 }); });
    return prepareImages(uses).then(function (imgs) {
      var w = new DocxWriter(imgs);
      secs.forEach(function (s, i) { w.section(s, roots[i], i === secs.length - 1); });
      return zip(w.files(), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
  }

  function DocxWriter(imgs) {
    this.imgs = imgs; this.media = []; this.mediaIds = {}; this.body = ''; this.parts = []; this.rels = []; this.n = 0;
  }
  DocxWriter.prototype = {
    rid: function () { return 'rId' + (++this.n + 10); },
    font: function () { return this.cur.font; },
    rpr: function (r, extra) {
      var p = '';
      if (r.b) p += '<w:b/>'; if (r.i) p += '<w:i/>'; if (r.u) p += '<w:u w:val="single"/>';
      if (r.sup) p += '<w:vertAlign w:val="superscript"/>'; if (r.sub) p += '<w:vertAlign w:val="subscript"/>';
      if (r.color) p += '<w:color w:val="' + r.color + '"/>';
      if (r.size) p += '<w:sz w:val="' + Math.round(r.size * 2) + '"/><w:szCs w:val="' + Math.round(r.size * 2) + '"/>';
      return (p || extra) ? '<w:rPr>' + (extra || '') + p + '</w:rPr>' : '';
    },
    t: function (text, r) { return '<w:r>' + this.rpr(r || {}) + '<w:t xml:space="preserve">' + X(text) + '</w:t></w:r>'; },
    tab: function (r) { return '<w:r>' + this.rpr(r || {}) + '<w:tab/></w:r>'; },
    // inline runs (text, math, pictures) -> run XML
    runs: function (rs, base) {
      var self = this, h = '';
      rs.forEach(function (r) {
        if (r.br) h += '<w:r><w:br/></w:r>';
        else if (r.img) { var big = (r.w || ((self.imgs[r.img] || {}).wIn) || 0) > 1.5; h += (big && h ? '<w:r><w:br/></w:r>' : '') + self.pic(r.img, r.w, r.h) + (big ? '<w:r><w:br/></w:r>' : ''); }
        else if (r.math) h += '<m:oMath>' + self.omml(r) + '</m:oMath>';
        else if (r.text) h += self.t(r.text, Object.assign({}, base || {}, r));
      });
      return h;
    },
    omml: function (r) {
      var self = this;
      var e = function (rs) { return (rs || []).map(function (x) { if (x.math) return self.omml(x); if (x.text) return '<m:r><m:t xml:space="preserve">' + X(x.text) + '</m:t></m:r>'; return ''; }).join(''); };
      if (r.math === 'bar') return '<m:bar><m:barPr><m:pos m:val="top"/></m:barPr><m:e>' + e(r.kids) + '</m:e></m:bar>';
      if (r.math === 'acc' && r.chr === '\u0311') return '<m:groupChr><m:groupChrPr><m:chr m:val="\u23dc"/><m:pos m:val="top"/><m:vertJc m:val="bot"/></m:groupChrPr><m:e>' + e(r.kids) + '</m:e></m:groupChr>'; // arc
      if (r.math === 'acc') return '<m:acc><m:accPr><m:chr m:val="' + r.chr + '"/></m:accPr><m:e>' + e(r.kids) + '</m:e></m:acc>';
      if (r.math === 'frac') return '<m:f><m:num>' + e(r.num) + '</m:num><m:den>' + e(r.den) + '</m:den></m:f>';
      if (r.math === 'rad') return '<m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e>' + e(r.kids) + '</m:e></m:rad>';
      return '';
    },
    pic: function (src, wIn, hIn) {
      var im = this.imgs[src]; if (!im) return '';
      if (!this.mediaIds[src]) { var id = this.rid(), name = 'image' + (this.media.length + 1) + '.' + im.ext; this.media.push({ name: name, data: im.data, id: id }); this.mediaIds[src] = id; }
      var w = wIn || im.wIn, h = hIn || (wIn ? wIn * im.hIn / im.wIn : im.hIn), max = this.cur.width / TW;
      if (w > max) { h = h * max / w; w = max; }
      var cx = Math.round(w * 914400), cy = Math.round(h * 914400), pid = ++this.n;
      return '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:docPr id="' + pid + '" name="Picture ' + pid + '"/>' +
        '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
        '<pic:nvPicPr><pic:cNvPr id="' + pid + '" name="Picture ' + pid + '"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="' + this.mediaIds[src] + '"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
        '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
    },
    p: function (content, o) {
      o = o || {};
      var pp = '';
      if (o.keepNext) pp += '<w:keepNext/>';
      if (o.border) pp += '<w:pBdr>' + o.border + '</w:pBdr>';
      if (o.shade) pp += '<w:shd w:val="clear" w:color="auto" w:fill="' + o.shade + '"/>';
      if (o.tabs) pp += '<w:tabs>' + o.tabs.map(function (t) { return '<w:tab w:val="' + t[0] + '"' + (t[2] ? ' w:leader="' + t[2] + '"' : '') + ' w:pos="' + Math.round(t[1]) + '"/>'; }).join('') + '</w:tabs>';
      var sp = this.cur.spacing ? 1.6 : 1.15;
      pp += '<w:spacing w:before="' + Math.round(o.before != null ? o.before : 0) + '" w:after="' + Math.round(o.after != null ? o.after : 0) + '"' + (o.exact ? ' w:line="' + o.exact + '" w:lineRule="exact"' : ' w:line="' + Math.round(240 * sp) + '" w:lineRule="auto"') + '/>';
      if (o.ind) pp += '<w:ind' + (o.ind.left != null ? ' w:left="' + Math.round(o.ind.left) + '"' : '') + (o.ind.hanging ? ' w:hanging="' + Math.round(o.ind.hanging) + '"' : '') + (o.ind.right ? ' w:right="' + Math.round(o.ind.right) + '"' : '') + '/>';
      if (o.align) pp += '<w:jc w:val="' + o.align + '"/>';
      if (o.sect) pp += o.sect;
      return '<w:p>' + (pp ? '<w:pPr>' + pp + '</w:pPr>' : '') + content + '</w:p>';
    },
    pageBreak: function () { return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; },
    bdr: function (sides, sz) { return sides.map(function (s) { return '<w:' + s + ' w:val="single" w:sz="' + (sz || 6) + '" w:space="4" w:color="000000"/>'; }).join(''); },

    /* blocks: walk the paper by class */
    blocks: function (root) {
      var self = this, h = '';
      Array.prototype.forEach.call(root.children, function (el) { h += self.block(el); });
      return h;
    },
    block: function (el) {
      var cls = el.className || '', tag = el.tagName.toLowerCase(), W = this.cur.width, self = this;
      if (tag === 'style' || /\bcl-runfoot\b/.test(cls)) return '';
      if (/\bcl-name\b/.test(cls)) return this.p(this.t('Name: ') + this.tab() + this.tab() + this.t('Date: ') + this.tab(), { tabs: [['left', W * 0.56, 'underscore'], ['left', W * 0.62], ['right', W, 'underscore']], after: 160 });
      if (/\bcl-title\b/.test(cls)) { var b = el.querySelector('b'), i = el.querySelector('i'); return this.p(this.t(textOf(b), { b: true }) + this.tab() + this.t(textOf(i), { i: true }), { tabs: [['right', W]], after: 80 }); }
      if (/\bcl-acc\b/.test(cls)) { var it = el.querySelectorAll('i'); return this.p([0, 1, 2].map(function (k) { return it[k] ? self.t(textOf(it[k]), { i: true }) : ''; }).join(this.tab()), { tabs: [['center', W / 2], ['right', W]], after: 120 }); }
      if (/\bcl-part\b/.test(cls)) {
        var dir = el.querySelector('.cl-dir'), tot = dir && dir.querySelector('.cl-tot'), dirRuns = [];
        if (dir) { var dc = dir.cloneNode(true), tt = dc.querySelector('.cl-tot'); if (tt) tt.remove(); dirRuns = inlines(dc, { b: true }); }
        return this.p(this.t(textOf(el.querySelector('.cl-pname')), { b: true }), { align: 'center', before: 240, keepNext: true }) +
          (dir ? this.p(this.runs(dirRuns) + (tot ? this.tab() + this.t(textOf(tot), { b: true }) : ''), { tabs: [['right', W]], after: 120, keepNext: true }) : '');
      }
      if (/\bcl-comp\b/.test(cls)) return this.p(this.t(textOf(el), { b: true, i: true, size: 8 }), { align: 'center', border: this.bdr(['top', 'left', 'bottom', 'right']), ind: { left: W - 1.3 * TW }, after: 80 });
      if (/\bcl-bonus\b/.test(cls)) return this.p(this.t(textOf(el), { b: true }), { align: 'center', before: 240, keepNext: true });
      if (/\bcl-scorewrap\b/.test(cls) || /\bcl-score\b/.test(cls)) {
        var sc = el.querySelector('.cl-score') || el, num = sc.querySelector('.cl-score-n'), lab = sc.cloneNode(true), nn = lab.querySelector('.cl-score-n'); if (nn) nn.remove();
        var box = this.bdr(['top', 'left', 'bottom', 'right'], 10), ind = { left: W - 1.9 * TW };
        return this.p(this.t(textOf(lab)), { border: box, ind: ind, before: 360 }) + this.p(this.t(textOf(num), { size: 26 }), { border: box, ind: ind, align: 'right', before: 360 });
      }
      if (/\bpt-q\b/.test(cls) && tag !== 'tr') return this.question(el);
      if (/\brv-title\b/.test(cls)) return this.p(this.t(textOf(el), { b: true }), { align: 'center', after: 80 });
      if (tag === 'table') return this.table(el);
      if (/\bpt-head\b/.test(cls)) { var h1 = el.querySelector('h1'), sub = el.querySelector('.pt-sub'); return this.p(this.t(textOf(h1), { b: true, size: 17 }), { after: 40 }) + (sub ? this.p(this.t(textOf(sub), { size: 10, color: '444444' })) : ''); }
      if (tag === 'hr') return this.p('', { border: this.bdr(['bottom'], 12), after: 120 });
      if (/\bls-unit\b/.test(cls)) return this.p(this.t(textOf(el), { b: true }), { align: 'right' });
      if (/\bls-target\b/.test(cls)) return this.p(this.t(textOf(el.querySelector('.ls-tl')) + ' ', { b: true }) + this.runs(inlines(el.querySelector('.ls-tline') || document.createElement('i'))), { after: 200 });
      if (/\bls-ex\b/.test(cls) && el.querySelector('.ls-exn')) return this.p(this.t(textOf(el), { b: true }), { before: 200, after: 60, keepNext: true });
      if (/\bls-h\b|\bls-notes\b|\bls-exn\b/.test(cls) && !el.children.length) return this.p(this.t(textOf(el), { b: true, color: '8064A2' }), { before: 280, after: 60, keepNext: true });
      if (/\bls-box\b/.test(cls)) return this.p(this.runs(inlines(el)), { border: this.bdr(['top', 'left', 'bottom', 'right']), after: 120 });
      if (/\bpt-lines\b/.test(cls)) return Array.prototype.map.call(el.children, function () { return self.p(self.tab(), { tabs: [['right', W, 'underscore']], ind: self.inQ ? { left: self.inQ } : null, exact: 480 }); }).join('');
      if (/\bpt-space\b/.test(cls) || (tag === 'div' && !el.children.length && !textOf(el) && el.style.height)) return this.p('', { after: inches(el.style.height) * TW });
      if (tag === 'ul' && /\bpt-ch\b/.test(cls)) return this.choices(el);
      if (/\bpt-tf\b/.test(cls)) { var L = (this.inQ || 0) + 0.1 * TW; return this.p(this.t('T', { b: true }) + this.tab() + this.t('F', { b: true }), { tabs: [['left', L + 0.8 * TW]], ind: { left: L } }); }
      if (/\bcl-cred\b/.test(cls)) return this.p(this.t(textOf(el)), { align: 'right' });
      if (/\bpt-keynote\b|\brv-ref\b/.test(cls)) return this.p(this.t(textOf(el), { size: 8, color: '808080' }), { align: 'right' });
      if (tag === 'ul' || tag === 'ol') return Array.prototype.map.call(el.children, function (li, k) { return self.p(self.t(tag === 'ol' ? (k + 1) + '. ' : '• ') + self.runs(inlines(li)), { ind: { left: 0.4 * TW, hanging: 0.25 * TW } }); }).join('');
      // anything else: text and blocks mixed → paragraphs for the text, blocks for the blocks
      return this.mixed(el);
    },
    mixed: function (el) {
      var self = this, h = '', cur = [];
      var flush = function () { if (cur.length) { var rs = inlines(wrapAll(cur)); if (rs.length) h += self.p(self.runs(rs), { after: 60, ind: self.inQ ? { left: self.inQ } : null }); cur = []; } };
      Array.prototype.forEach.call(el.childNodes, function (c) {
        if (c.nodeType === 1 && /^(div|p|table|ul|ol|hr|h1|h2|h3)$/i.test(c.tagName)) { flush(); h += self.block(c); }
        else cur.push(c);
      });
      flush();
      return h;
    },
    question: function (el) {
      var self = this, num = textOf(el.querySelector(':scope > .pt-num')), body = el.querySelector(':scope > div:not(.pt-num)') || el, IND = 0.4 * TW, h = '';
      var qt = body.querySelector(':scope > .pt-qt'), first = true, before = this.cur.spacing ? 360 : 220;
      var lead = function (content, o) { var x = self.p((first && num ? self.t(num, { b: true }) + self.tab() : '') + content, Object.assign({ ind: { left: IND, hanging: num ? IND : 0 }, before: first ? before : 0, after: 60, keepNext: true }, o || {})); first = false; return x; };
      if (qt) {
        var cur = [];
        var flush = function () { if (cur.length) { h += lead(self.runs(cur)); cur = []; } };
        Array.prototype.forEach.call(qt.childNodes, function (c) {
          if (c.nodeType === 1 && /^(table)$/i.test(c.tagName)) { flush(); if (first) h += lead(''); h += self.table(c, IND); }
          else if (c.nodeType === 1 && /^(div|p)$/i.test(c.tagName)) { flush(); var rs = inlines(c); if (rs.length) h += lead(self.runs(rs)); }
          else { var wrap = document.createElement('span'); wrap.appendChild(c.cloneNode(true)); cur = cur.concat(inlines(wrap)); }
        });
        flush();
        if (first) h += lead('');
      }
      this.inQ = IND;
      Array.prototype.forEach.call(body.children, function (c) { if (c !== qt) h += self.block(c); });
      this.inQ = 0;
      if (/\bacc-break\b/.test(el.className)) h += this.pageBreak();
      return h;
    },
    choices: function (ul) {
      var self = this, cols = /\bc4\b/.test(ul.className) ? 4 : /\bc2\b/.test(ul.className) ? 2 : 1, IND = this.inQ || 0, W = this.cur.width, colW = (W - IND) / cols, h = '';
      var items = Array.prototype.map.call(ul.querySelectorAll(':scope > li'), function (li) { var b = li.querySelector('b'), sp = li.querySelector('span'); return self.t(textOf(b), { b: true }) + self.t(' ') + self.runs(sp ? inlines(sp) : []); });
      for (var i = 0; i < items.length; i += cols) {
        var row = items.slice(i, i + cols), tabs = []; for (var k = 1; k < cols; k++) tabs.push(['left', IND + colW * k]);
        h += this.p(row.join(this.tab()), { tabs: tabs.length ? tabs : null, ind: { left: IND }, after: this.cur.spacing ? 140 : 60, keepNext: i + cols < items.length });
      }
      return h;
    },
    table: function (tb, indent) {
      var self = this, rows = tb.querySelectorAll(':scope > tr, :scope > thead > tr, :scope > tbody > tr'), W = this.cur.width - (indent || 0);
      if (!rows.length) return '';
      var ncol = 0; Array.prototype.forEach.call(rows, function (r) { var c = 0; Array.prototype.forEach.call(r.children, function (td) { c += +(td.getAttribute('colspan') || 1); }); ncol = Math.max(ncol, c); });
      var isRv = /\brv\b/.test(tb.className), isKey = /\bpt-key\b/.test(tb.className);
      var widths = isRv ? [0.45 * TW, W - 0.45 * TW] : null;
      if (!widths) { widths = []; for (var k = 0; k < ncol; k++) widths.push(W / ncol); }
      var grid = '<w:tblGrid>' + widths.map(function (w) { return '<w:gridCol w:w="' + Math.round(w) + '"/>'; }).join('') + '</w:tblGrid>';
      var borders = isKey ? '<w:tblBorders><w:insideH w:val="single" w:sz="4" w:color="DDDDDD"/><w:bottom w:val="single" w:sz="4" w:color="DDDDDD"/></w:tblBorders>' :
        '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (s) { return '<w:' + s + ' w:val="single" w:sz="6" w:color="000000"/>'; }).join('') + '</w:tblBorders>';
      var h = '<w:tbl><w:tblPr><w:tblW w:w="' + Math.round(W) + '" w:type="dxa"/>' + (indent ? '<w:tblInd w:w="' + Math.round(indent) + '" w:type="dxa"/>' : '') + borders + '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>' + grid;
      Array.prototype.forEach.call(rows, function (r) {
        var head = r.parentNode.tagName.toLowerCase() === 'thead' || /\brv-h\b/.test(r.className), shade = /\brv-h\b/.test(r.className) && /\bmc\b/.test(r.className) ? 'E5DFEC' : null, col = 0;
        h += '<w:tr>' + (head ? '<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>' : '<w:trPr><w:cantSplit/></w:trPr>');
        Array.prototype.forEach.call(r.children, function (td) {
          var span = +(td.getAttribute('colspan') || 1), w = widths.slice(col, col + span).reduce(function (a, b) { return a + b; }, 0); col += span;
          var keep = self.cur, inner;
          var hasBlocks = Array.prototype.some.call(td.children, function (c) { return /^(div|p|table|ul|ol)$/i.test(c.tagName); });
          self.cur = Object.assign({}, keep, { width: w - 160 });
          inner = hasBlocks ? self.blocks(td) : self.p(self.runs(inlines(td, head || /\b(n|l|rv-n)\b/.test(td.className) ? { b: true } : {})), { after: 40 });
          self.cur = keep;
          if (!/<\/w:p>$/.test(inner)) inner += '<w:p/>'; // a cell must end with a paragraph
          h += '<w:tc><w:tcPr><w:tcW w:w="' + Math.round(w) + '" w:type="dxa"/>' + (span > 1 ? '<w:gridSpan w:val="' + span + '"/>' : '') + (shade ? '<w:shd w:val="clear" w:color="auto" w:fill="' + shade + '"/>' : '') + '</w:tcPr>' + inner + '</w:tc>';
        });
        h += '</w:tr>';
      });
      return h + '</w:tbl>' + this.p('', { after: 60 });
    },

    /* headers / footers, one set per section (each version restarts its page numbers and first-page header) */
    hf: function (kind, inner) {
      var id = this.rid(), n = this.parts.length + 1, name = kind + n + '.xml', root = kind === 'header' ? 'w:hdr' : 'w:ftr';
      this.parts.push({ name: 'word/' + name, kind: kind, xml: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><' + root + ' ' + NS + '>' + inner + '</' + root + '>' });
      this.rels.push('<Relationship Id="' + id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/' + kind + '" Target="' + name + '"/>');
      return id;
    },
    page: function () { return '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r>'; },
    section: function (s, root, last) {
      var lesson = s.doc === 'lesson', W = (lesson ? 7.5 : 7) * TW, self = this;
      this.cur = { width: W, font: s.font ? ({ 'Atkinson Hyperlegible': 'Atkinson Hyperlegible Next', 'OpenDyslexic': 'OpenDyslexic' })[s.font] || s.font : (appState().settings.font || 'Century Schoolbook'), size: s.size || num(appState().settings.fontSize, 12), spacing: s.spacing };
      var body = this.blocks(root), course = headerText(), right = rightLabel(), hdr = {};
      var bar = this.bdr(['bottom'], 10), small = { size: 9, color: '666666' };
      if (s.type === 'key') {
        hdr.header = this.hf('header', this.p('')); // blank: otherwise Word repeats the test's header
        hdr.footer = this.hf('footer', this.p(this.t(course + '  —  ' + docTitle() + '  —  ' + s.label, small) + this.tab() + this.t('Page ', small) + this.page(), { tabs: [['right', W]] }));
      } else {
        var icons = lesson ? lessonTools().map(function (k) { return self.pic(LESSON_ICONS[k].src, LESSON_ICONS[k].w / 72, LESSON_ICONS[k].h / 72) + self.t(' '); }).join('') : '';
        hdr.first = this.hf('header', (icons ? this.p(icons) : '') + this.p(this.t(course, { b: true }), { align: 'center', border: bar }));
        hdr.header = this.hf('header', this.p(this.t(course), { align: 'center', border: bar }) + (right ? this.p(this.t(right, { i: s.doc === 'review' }), { align: 'right' }) : ''));
        var foot = lesson ? [lessonCode(), lessonSource() ? 'Source: ' + lessonSource() : ''].filter(Boolean).join('   ') : '';
        hdr.footer = this.hf('footer', this.p((foot ? this.t(foot, small) : '') + this.tab() + this.page(), { tabs: [['right', W]] }));
        hdr.firstFooter = this.hf('footer', isExamDoc() ? this.p(this.t('v. ' + (s.v + 1), { size: 8, color: '777777' })) : this.p(''));
      }
      var m = lesson ? { t: 0.8, s: 0.5 } : { t: 1, s: 0.75 };
      var sect = '<w:sectPr>' + (hdr.first ? '<w:headerReference w:type="first" r:id="' + hdr.first + '"/>' : '') + (hdr.header ? '<w:headerReference w:type="default" r:id="' + hdr.header + '"/>' : '') +
        (hdr.firstFooter ? '<w:footerReference w:type="first" r:id="' + hdr.firstFooter + '"/>' : '') + '<w:footerReference w:type="default" r:id="' + hdr.footer + '"/>' +
        '<w:type w:val="nextPage"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="' + m.t * TW + '" w:right="' + m.s * TW + '" w:bottom="' + m.t * TW + '" w:left="' + m.s * TW + '" w:header="' + 0.45 * TW + '" w:footer="' + 0.4 * TW + '" w:gutter="0"/>' +
        '<w:pgNumType w:start="1"/>' + (hdr.first ? '<w:titlePg/>' : '') + '</w:sectPr>';
      // the section's font and size go on every run through a paragraph-level default (rPr in pPr doesn't inherit), so use a style per section
      var sid = 'Sec' + (this.parts.length + this.media.length + Math.random().toString(36).slice(2, 6));
      this.styles = (this.styles || '') + '<w:style w:type="paragraph" w:customStyle="1" w:styleId="' + sid + '"><w:name w:val="' + X(s.label || 'Test') + ' text"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts w:ascii="' + X(this.cur.font) + '" w:hAnsi="' + X(this.cur.font) + '" w:cs="' + X(this.cur.font) + '"/><w:sz w:val="' + Math.round(this.cur.size * 2) + '"/><w:szCs w:val="' + Math.round(this.cur.size * 2) + '"/></w:rPr></w:style>';
      body = body.replace(/<w:p>(<w:pPr>)?/g, function (m0, pp) { return '<w:p><w:pPr><w:pStyle w:val="' + sid + '"/>' + (pp ? '' : '</w:pPr>'); });
      if (last) this.body += body + sect;
      else this.body += body + '<w:p><w:pPr>' + sect + '</w:pPr></w:p>';
    },
    files: function () {
      var media = this.media, rels = this.rels.concat(media.map(function (m) { return '<Relationship Id="' + m.id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + m.name + '"/>'; }));
      rels.push('<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>', '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>');
      var head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
      var font = X(appState().settings.font || 'Century Schoolbook');
      var files = [
        { name: '[Content_Types].xml', data: head + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>' +
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
          this.parts.map(function (p) { return '<Override PartName="/' + p.name + '" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.' + p.kind + '+xml"/>'; }).join('') + '</Types>' },
        { name: '_rels/.rels', data: head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
        { name: 'word/_rels/document.xml.rels', data: head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels.join('') + '</Relationships>' },
        { name: 'word/document.xml', data: head + '<w:document ' + NS + '><w:body>' + this.body + '</w:body></w:document>' },
        { name: 'word/styles.xml', data: head + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="' + font + '" w:hAnsi="' + font + '" w:eastAsia="' + font + '" w:cs="' + font + '"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>' +
          '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' + (this.styles || '') + '</w:styles>' },
        { name: 'word/settings.xml', data: head + '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="720"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>' }
      ];
      this.parts.forEach(function (p) { files.push({ name: p.name, data: p.xml }); });
      media.forEach(function (m) { files.push({ name: 'word/media/' + m.name, data: m.data }); });
      var mediaRels = head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + media.map(function (m) { return '<Relationship Id="' + m.id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + m.name + '"/>'; }).join('') + '</Relationships>';
      this.parts.forEach(function (p) { if (/r:embed=/.test(p.xml)) files.push({ name: p.name.replace('word/', 'word/_rels/') + '.rels', data: mediaRels }); });
      return files;
    }
  };
  var NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';

  /* ---------- download ---------- */
  function download(format, kind) {
    if (format !== 'docx') return Promise.reject(new Error('Unknown format ' + format));
    return docx(kind).then(function (blob) { var name = fileName(kind, 'docx'); saveFile(name, blob); return { name: name, size: blob.size }; });
  }
  return { sections: sections, fileName: fileName, inlines: inlines, zip: zip, crc32: crc32, docx: docx, download: download };
}
