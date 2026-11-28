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
  // A run is {text, b, i, u, sup, sub} | {br:1} | {img:src, w, h (inches)} | {math:'eq'|'bar'|'acc'|'frac'|'rad', …} ('eq' = a whole math span, one Word equation)
  function inlines(node, st) {
    st = st || {};
    var out = [];
    Array.prototype.forEach.call(node.childNodes, function (c) {
      if (c.nodeType === 3) { var t = c.nodeValue.replace(/[ \t\r\n]+/g, ' '); if (t) out.push(Object.assign({ text: t }, st)); return; }
      if (c.nodeType !== 1) return;
      var tag = c.tagName.toLowerCase(), cls = c.className || '';
      if (tag === 'br') return out.push({ br: 1 });
      if (tag === 'img') return out.push({ img: c.getAttribute('src'), w: inches(c.style.width), h: inches(c.style.height) });
      if (/(^|\s)m(\s|$)/.test(cls) && c.children.length && Array.prototype.every.call(c.childNodes, function (k) { return /^(SUP|SUB)$/.test(k.nodeName) && !k.children.length; })) { out = out.concat(inlines(c, st)); return; } // the 3 in cm3: text, not an equation without a base
      if (/(^|\s)m(\s|$)/.test(cls)) return out.push({ math: 'eq', kids: inlines(c, {}) });
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
          var svg = /^data:image\/svg/i.test(src) || /\.svg($|[?#])/i.test(src); // drawn pictures: 300 dpi at their printed size
          var scale = svg ? (printW * 300) / im.naturalWidth : Math.min(1, (printW * 200) / im.naturalWidth), w = Math.max(1, Math.round(im.naturalWidth * scale)), h = Math.max(1, Math.round(im.naturalHeight * scale));
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
  var BLANK = '\u0001blank\u0001'; // an empty paragraph between blocks (marker, so repeats can be collapsed)

  // the paper of every test, laid out like the preview (score box beside the last question when there's room), as a detached root
  function laidOut(kind) {
    var secs = sections(kind);
    return Promise.all(secs.map(function (s) { return s.type === 'test' ? A.fitHtml(s.html, s.acc) : s.html; })).then(function (hs) {
      var roots = hs.map(parse);
      roots.forEach(function (r) { var o = r.querySelector('.cl-score.over'); if (o) { var w = document.createElement('div'); w.className = 'cl-scorewrap over'; w.appendChild(o); r.appendChild(w); } });
      return { secs: secs, roots: roots };
    });
  }
  function docx(kind) { return laidOut(kind).then(function (x) { return docxOf(x.secs, x.roots); }); }
  function docxOf(secs, roots) {
    var uses = []; roots.forEach(function (r) { Array.prototype.forEach.call(r.querySelectorAll('img'), function (i) { uses.push({ src: i.getAttribute('src'), w: inches(i.style.width) }); }); });
    if (docType() === 'lesson') lessonTools().forEach(function (k) { uses.push({ src: LESSON_ICONS[k].src, w: LESSON_ICONS[k].w / 72 }); });
    return prepareImages(uses).then(function (imgs) {
      var w = new DocxWriter(imgs);
      secs.forEach(function (s, i) { w.section(s, roots[i], i === secs.length - 1); });
      return zip(w.files(), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });
  }

  function DocxWriter(imgs) {
    this.imgs = imgs; this.media = []; this.mediaIds = {}; this.body = ''; this.parts = []; this.rels = []; this.n = 0; this.nums = []; this.exam = isExamDoc(); this.ind = this.exam ? 360 : 576; // question numbers hang 0.25 in on tests, 0.4 in on lessons
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
    // math runs -> OMML: letters italic (Word's own style), points like ABCD too; words and Δ upright, x<sup>2</sup> -> a real superscript on its base
    omRuns: function (rs) {
      var self = this, out = [], OP = /^[=+\u2212\-<>\u2264\u2265\u2260\u2245\u223c\u2248\u00d7\u00f7\u00b7\u00b1]$/;
      var mr = function (t) {
        if (/^[A-Za-z]\u0302$/.test(t)) return '<m:acc><m:accPr><m:chr m:val="\u0302"/></m:accPr><m:e><m:r><m:t>' + t[0] + '</m:t></m:r></m:e></m:acc>'; // p̂
        return '<m:r>' + ((/^[A-Za-z]{2,}$/.test(t) && !/^[A-Z]+$/.test(t)) || t === '\u0394' ? '<m:rPr><m:sty m:val="p"/></m:rPr>' : '') + '<m:t xml:space="preserve">' + X(t) + '</m:t></m:r>'; };
      (rs || []).forEach(function (x) {
        if (x.math) { out.push({ x: self.omml(x) }); return; }
        if (!x.text) return;
        if (x.sup || x.sub) {
          var base = out.length && !/^\s+$/.test(out[out.length - 1].t || '') ? out.pop().x : '<m:r><m:t></m:t></m:r>';
          out.push({ x: '<m:' + (x.sup ? 'sSup' : 'sSub') + '><m:e>' + base + '</m:e><m:' + (x.sup ? 'sup' : 'sub') + '>' + mr(x.text.trim()) + '</m:' + (x.sup ? 'sup' : 'sub') + '></m:' + (x.sup ? 'sSup' : 'sSub') + '>' });
          return;
        }
        (x.text.match(/[A-Za-z]\u0302|[A-Za-z]{2,}|[A-Za-z]|\d+(?:\.\d+)?|\s+|[\s\S]/g) || []).forEach(function (t) { out.push({ t: t, x: mr(t) }); });
      });
      // spaces next to operators or at the ends are Word's job; spaces between words stay
      return out.filter(function (o, i) { return !/^\s+$/.test(o.t || '') || (i > 0 && i < out.length - 1 && !OP.test(out[i - 1].t || '') && !OP.test(out[i + 1].t || '') && out[i - 1].t && out[i + 1].t); }).map(function (o) { return o.x; }).join('');
    },
    omml: function (r) {
      var self = this;
      var e = function (rs) { return self.omRuns(rs); };
      if (r.math === 'eq') return e(r.kids);
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
    // Every paragraph is spacing 0 before/after, line 1.15 (tests and quizzes single, EXAM-FORMAT.md); gaps of 6 pt or more become an empty paragraph
    // (BLANK; repeats are collapsed in section()). Question numbers are a Word numbered list (o.numPr), so wrapped lines
    // line up with the text; the question's other lines are indented to match.
    p: function (content, o) {
      o = o || {};
      var pp = '', gapB = (o.before || 0) >= 120 ? BLANK : '', gapA = (o.after || 0) >= 120 ? BLANK : '';
      if (o.keepNext) pp += '<w:keepNext/>';
      if (o.newPage) pp += '<w:pageBreakBefore/>';
      if (o.numPr) pp += o.numPr;
      if (o.border) pp += '<w:pBdr>' + o.border + '</w:pBdr>';
      if (o.shade) pp += '<w:shd w:val="clear" w:color="auto" w:fill="' + o.shade + '"/>';
      if (o.tabs) pp += '<w:tabs>' + o.tabs.map(function (t) { return '<w:tab w:val="' + t[0] + '"' + (t[2] ? ' w:leader="' + t[2] + '"' : '') + ' w:pos="' + Math.round(t[1]) + '"/>'; }).join('') + '</w:tabs>';
      var sp = o.lines || this.cur.lines || (this.cur.spacing ? 1.6 : 1.15);
      pp += '<w:spacing w:before="0" w:after="0"' + (o.exact ? ' w:line="' + o.exact + '" w:lineRule="exact"' : ' w:line="' + Math.round(240 * sp) + '" w:lineRule="auto"') + '/>';
      if (o.ind) pp += '<w:ind' + (o.ind.left != null ? ' w:left="' + Math.round(o.ind.left) + '"' : '') + (o.ind.hanging ? ' w:hanging="' + Math.round(o.ind.hanging) + '"' : '') + (o.ind.right ? ' w:right="' + Math.round(o.ind.right) + '"' : '') + '/>';
      if (o.align) pp += '<w:jc w:val="' + o.align + '"/>';
      if (o.sect) pp += o.sect;
      return gapB + '<w:p>' + (pp ? '<w:pPr>' + pp + '</w:pPr>' : '') + content + '</w:p>' + gapA;
    },
    pageBreak: function () { return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'; },
    bdr: function (sides, sz) { return sides.map(function (s) { return '<w:' + s + ' w:val="single" w:sz="' + (sz || 6) + '" w:space="4" w:color="000000"/>'; }).join(''); },

    /* blocks: walk the paper by class */
    blocks: function (root) {
      var self = this, h = '', rows = '', cur = '';
      // test questions: one borderless table for each run of multiple-choice (or open-response) questions
      var flush = function () { if (rows) h += self.bare(cur === 'mc' ? [576, 8494] : [730, 9350], rows); rows = ''; };
      Array.prototype.forEach.call(root.children, function (el) {
        var k = /\bx-(mc|op)\b/.exec(el.className || ''), kind = k && k[1];
        if (!kind) { flush(); cur = ''; h += self.block(el); return; }
        if (kind !== cur) flush();
        cur = kind; rows += self.row(el, kind);
        if (/\bacc-break\b/.test(el.className)) { flush(); h += self.pageBreak(); }
      });
      flush();
      return h;
    },
    // a table without borders, like hers: 0.075 in of padding left and right
    bare: function (widths, rows) {
      var none = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (s) { return '<w:' + s + ' w:val="nil"/>'; }).join('');
      return '<w:tbl><w:tblPr><w:tblW w:w="' + widths.reduce(function (a, b) { return a + b; }, 0) + '" w:type="dxa"/><w:tblInd w:w="0" w:type="dxa"/><w:tblBorders>' + none + '</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="108" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>' +
        widths.map(function (w) { return '<w:gridCol w:w="' + w + '"/>'; }).join('') + '</w:tblGrid>' + rows + '</w:tbl>';
    },
    cell: function (w, inner) { inner = inner.split(BLANK).join(this.p('')); return '<w:tc><w:tcPr><w:tcW w:w="' + w + '" w:type="dxa"/></w:tcPr>' + (/<\/w:p>$/.test(inner) ? inner : inner + this.p('')) + '</w:tc>'; },
    within: function (w, fn) { var keep = this.cur; this.cur = Object.assign({}, keep, { width: w - 216 }); var x = fn(); this.cur = keep; return x; },
    // number → Word's own numbering (one list per run of numbers; each version starts a new one)
    numPr: function (num, el) {
      var m = /^(\d+)\.$/.exec(num); if (!m || el.querySelector('.pt-blank')) return '';
      var n = +m[1];
      if (!this.list || this.list.next !== n) { this.nums.push({ n: n, abs: 0 }); this.list = { id: this.nums.length }; }
      this.list.next = n + 1;
      return '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="' + this.list.id + '"/></w:numPr>';
    },
    // one test question as a table row: number | question, choices or credits, room to answer
    row: function (el, kind) {
      var self = this, num = textOf(el.querySelector(':scope > .pt-num')), blank = !!el.querySelector('.pt-blank'), w = kind === 'mc' ? [576, 8494] : [730, 9350], npr = this.numPr(num, el);
      var first = npr ? this.p('', { numPr: npr }) : this.p((blank ? this.t('____ ') : '') + this.t(num, { b: true }));
      if (blank) { w = [w[0] + 700, w[1] - 700]; }
      var body = el.querySelector(':scope > div:not(.pt-num)') || el;
      var inner = this.within(w[1], function () { return self.qparts(body, kind); });
      return '<w:tr>' + (/\blong\b/.test(el.className) ? '' : '<w:trPr><w:cantSplit/></w:trPr>') + (blank ? this.cell(w[0], first) : this.cell(w[0], first)) + this.cell(w[1], inner) + '</w:tr>';
    },
    // the pieces of a test question, top to bottom
    qparts: function (body, kind) {
      var self = this, h = '', blanks = function (n) { var x = ''; while (n--) x += self.p(''); return x; };
      Array.prototype.forEach.call(body.children, function (c) {
        if (/\bpt-qt\b|\bpt-more\b/.test(c.className)) h += self.text(c);
        else if (kind === 'mc' && (/\bpt-ch\b|\bq-two\b/.test(c.className))) h += blanks(1) + self.block(c);
        else h += self.block(c);
      });
      return h + blanks(kind === 'op' ? 1 : 2);
    },
    // question text: a paragraph per line, pictures on their own (q-mid centered), (a) (b) parts
    text: function (el, lead) {
      var self = this, h = '', cur = [];
      var put = function (content, o) { if (lead) { o = Object.assign({}, o, lead); lead = null; } h += self.p(content, Object.assign({ ind: self.inQ ? { left: self.inQ } : null }, o)); };
      var flush = function () {
        if (!cur.length) return;
        var line = []; cur.concat([{ br: 1 }]).forEach(function (r) { if (r.br) { put(self.runs(line)); line = []; } else line.push(r); }); cur = [];
      };
      Array.prototype.forEach.call(el.childNodes, function (c) {
        var tag = c.nodeType === 1 ? c.tagName.toLowerCase() : '', cls = c.className || '';
        if (tag === 'img' && /\bq-mid\b/.test(cls)) { flush(); put(self.pic(c.getAttribute('src'), inches(c.style.width), inches(c.style.height)), { align: 'center', ind: null }); }
        else if (/\bq-row\b/.test(cls)) { flush(); var line = []; Array.prototype.forEach.call(c.childNodes, function (i) { if (i.nodeName === 'IMG') line.push(self.pic(i.getAttribute('src'), inches(i.style.width), inches(i.style.height))); if (i.nodeName === 'BR' || !i.nextSibling) { if (line.length) put(line.join(self.t('    ')), { align: 'center', ind: null }); line = []; } }); } // pictures side by side
        else if (/\bq-part\b/.test(cls)) {
          flush(); var d = c.querySelector(':scope > div'), keep = self.inQ || 0;
          if (h) h += self.p('');
          self.inQ = keep + 360;
          h += self.text(d, null).replace(/^<w:p>(<w:pPr>.*?<w:ind)[^>]*\/>(.*?<\/w:pPr>)/, '<w:p>$1 w:left="' + (keep + 360) + '" w:hanging="360"/>$2' + self.t(textOf(c.querySelector('b')), { b: true }) + self.tab());
          self.inQ = keep;
        }
        else if (tag === 'table') { flush(); h += self.table(c, self.inQ || 0); }
        else if (/^(div|p)$/.test(tag)) { flush(); var rs = inlines(c); if (rs.length) { cur = rs; flush(); } }
        else if (/^(ul|ol)$/.test(tag)) { flush(); h += self.block(c); }
        else { var wrap = document.createElement('span'); wrap.appendChild(c.cloneNode(true)); cur = cur.concat(inlines(wrap)); }
      });
      flush();
      return h || (lead ? (put(''), h) : '');
    },
    // a box drawn on the page (text box over the text): x, y, w, h in inches; y from the page top (vr 'page') or the paragraph
    float: function (x, y, w, h, vr, line, inner) {
      var id = ++this.n, E = function (v) { return Math.round(v * 914400); };
      return '<w:r><mc:AlternateContent><mc:Choice Requires="wps"><w:drawing><wp:anchor distT="0" distB="0" distL="114300" distR="114300" simplePos="0" relativeHeight="' + (251658240 + id) + '" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1"><wp:simplePos x="0" y="0"/>' +
        '<wp:positionH relativeFrom="page"><wp:posOffset>' + E(x) + '</wp:posOffset></wp:positionH><wp:positionV relativeFrom="' + vr + '"><wp:posOffset>' + E(y) + '</wp:posOffset></wp:positionV><wp:extent cx="' + E(w) + '" cy="' + E(h) + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="' + id + '" name="Box ' + id + '"/><wp:cNvGraphicFramePr/>' +
        '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"><wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + E(w) + '" cy="' + E(h) + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>' + line + '</wps:spPr>' +
        '<wps:txbx><w:txbxContent>' + inner + '</w:txbxContent></wps:txbx><wps:bodyPr wrap="square" lIns="45720" tIns="45720" rIns="45720" bIns="45720" anchor="t"><a:noAutofit/></wps:bodyPr></wps:wsp></a:graphicData></a:graphic></wp:anchor></w:drawing></mc:Choice></mc:AlternateContent></w:r>';
    },
    compBox: function (vr, y) { return this.float(7.02, y, 1.233, 0.4, vr, '<a:noFill/><a:ln w="9525"><a:solidFill><a:srgbClr val="BFBFBF"/></a:solidFill></a:ln>', this.p(this.t('Use this space for computations.', { b: true, size: 8 }), { align: 'center', lines: 1 })); },
    block: function (el) {
      var cls = el.className || '', tag = el.tagName.toLowerCase(), W = this.cur.width, self = this;
      if (tag === 'style' || /\bcl-runfoot\b/.test(cls)) return '';
      if (/\bcl-name\b/.test(cls)) return this.exam ? this.p(this.t('Name: ') + this.tab() + this.tab() + this.t('Date: ') + this.tab(), { tabs: [['left', 3.64 * TW, 'underscore'], ['left', 5.11 * TW], ['right', W, 'underscore']] })
        : this.p(this.t('Name: ') + this.tab() + this.tab() + this.t('Date: ') + this.tab(), { tabs: [['left', W * 0.56, 'underscore'], ['left', W * 0.62], ['right', W, 'underscore']] });
      if (/\bcl-title\b/.test(cls)) return this.p(this.t(textOf(el.children[0]), { b: true }) + this.tab() + this.t(textOf(el.children[1]), { b: true }), { tabs: [['right', W]], lines: 1.15 });
      if (/\bcl-acc\b/.test(cls)) { var it = el.querySelectorAll('i'); return this.p('') + this.p([0, 1, 2].map(function (k) { return it[k] ? self.t(textOf(it[k]), { i: true }) : ''; }).join(this.tab()), { tabs: [['center', W / 2], ['right', W]] }); }
      if (/\bcl-part\b/.test(cls)) {
        var dir = el.querySelector('.cl-dir'), tot = dir && dir.querySelector('.cl-tot'), dirRuns = [];
        if (dir) { var dc = dir.cloneNode(true), tt = dc.querySelector('.cl-tot'); if (tt) tt.remove(); dirRuns = inlines(dc, { b: true }); }
        return this.p(this.t(textOf(el.querySelector('.cl-pname')), { b: true }), { align: 'center', before: /\bcl-first\b|\bcl-newpage\b/.test(cls) ? 0 : 240, keepNext: true, newPage: /\bcl-newpage\b/.test(cls) && !el.sectioned }) +
          (dir ? this.p(this.runs(dirRuns) + (tot ? this.tab() + this.t(textOf(tot), { b: true }) : ''), { tabs: [['right', W]], keepNext: true }) : '') + this.p(el.boxed ? this.compBox('paragraph', 0.15) : '', { keepNext: true });
      }
      if (/\bcl-comp\b/.test(cls)) return ''; // drawn with the part heading and in the page header
      if (/\bcl-bonus\b/.test(cls)) return this.p(this.t(textOf(el), { b: true, i: true }), { before: 240, keepNext: true });
      if (/\bcl-scorewrap\b/.test(cls)) { // an empty paragraph as tall as the box holds its place, so nothing is printed under it; the box is fixed to the bottom of that page
        var sc = el.querySelector('.cl-score'), num = sc.querySelector('.cl-score-n'), lab = sc.cloneNode(true); lab.querySelector('.cl-score-n').remove();
        return this.p(this.float(6.44, 8.96, 1.55, 1.01, 'page', '<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="6350"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln>',
          this.p(this.t(textOf(lab)), { lines: 1 }) + this.p(this.t(textOf(num), { size: 32 }), { align: 'right', lines: 1 })), { exact: /\bover\b/.test(cls) ? 20 : 1480 });
      }
      if (/\bq-two\b/.test(cls)) { // choices with a picture beside them
        var im = el.querySelector('.q-side img'), pw = Math.round((inches(im.style.width) || (this.imgs[im.getAttribute('src')] || {}).wIn || 2) * TW) + 216, full = W, lw = full - pw;
        return this.bare([lw, pw], '<w:tr>' + this.cell(lw, this.within(lw, function () { return self.blocks(el.children[0]); })) + this.cell(pw, this.within(pw, function () { return self.p(self.pic(im.getAttribute('src'), inches(im.style.width), inches(im.style.height)), { align: 'right' }); })) + '</w:tr>').replace('<w:tblInd w:w="0"', '<w:tblInd w:w="-108"');
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
      if (/\bpt-space\b/.test(cls) || (tag === 'div' && !el.children.length && !textOf(el) && el.style.height)) return this.p('', { exact: Math.max(20, Math.round(inches(el.style.height) * TW)) });
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
      var self = this, num = textOf(el.querySelector(':scope > .pt-num')), body = el.querySelector(':scope > div:not(.pt-num)') || el, IND = this.ind, h = '';
      if (/\bx-(sh|bn)\b/.test(el.className)) { // short answer: a numbered paragraph; bonus: no number
        var np = this.numPr(num, el), bn = /\bx-bn\b/.test(el.className), hd = '', qt0 = body.querySelector(':scope > .pt-qt');
        this.inQ = bn ? 0 : IND;
        hd = qt0 ? this.text(qt0, np ? { numPr: np, ind: null } : num ? { ind: { left: IND, hanging: IND } } : null) : '';
        if (!np && num) hd = hd.replace('</w:pPr>', '</w:pPr>' + this.t(num, { b: true }) + this.tab());
        Array.prototype.forEach.call(body.children, function (c) { if (c !== qt0) hd += /\bpt-more\b/.test(c.className) ? self.text(c) : self.block(c); });
        this.inQ = 0;
        return hd + this.p('') + this.p('') + (/\bacc-break\b/.test(el.className) ? this.pageBreak() : '');
      }
      var qt = body.querySelector(':scope > .pt-qt'), first = true, before = this.cur.spacing ? 360 : 220;
      var numPr = this.numPr(num, el);
      var lead = function (content, o) {
        var x = first && numPr ? self.p(content, Object.assign({ numPr: numPr, before: before, keepNext: true }, o || {}))
          : self.p((first && num ? self.t(num, { b: true }) + self.tab() : '') + content, Object.assign({ ind: { left: IND, hanging: first && num ? IND : 0 }, before: first ? before : 0, after: 60, keepNext: true }, o || {}));
        first = false; return x;
      };
      if (qt) {
        var cur = [];
        // each line (split at <br>) is its own paragraph, so it starts at the question's tab stop
        var flush = function () {
          if (!cur.length) return;
          var line = [];
          cur.concat([{ br: 1 }]).forEach(function (r) { if (r.br) { h += lead(self.runs(line)); line = []; } else line.push(r); });
          cur = [];
        };
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
      if (this.exam && cols === 4 && this.cur.big) { cols = 2; colW = (W - IND) / 2; }
      if (this.exam) return this.examChoices(ul, cols, IND);
      var items = Array.prototype.map.call(ul.querySelectorAll(':scope > li'), function (li) { var b = li.querySelector('b'), sp = li.querySelector('span'); return self.t(textOf(b), { b: true }) + self.t(' ') + self.runs(sp ? inlines(sp) : []); });
      for (var i = 0; i < items.length; i += cols) {
        var row = items.slice(i, i + cols), tabs = []; for (var k = 1; k < cols; k++) tabs.push(['left', IND + colW * k]);
        h += this.p(row.join(this.tab()), { tabs: tabs.length ? tabs : null, ind: { left: IND }, after: this.cur.spacing ? 140 : 60, keepNext: i + cols < items.length });
      }
      return h;
    },
    // a test's choices: four across or 2 × 2 in their own borderless table, sentences one under another
    examChoices: function (ul, cols, ind) {
      var self = this, W = this.cur.width - ind, cw = Math.floor(W / cols), lis = Array.prototype.slice.call(ul.querySelectorAll(':scope > li'));
      var ln = this.cur.spacing ? 0 : cols === 4 ? 1 : 1.15;
      this.nums.push({ n: 1, abs: 1 }); // a real Word list, starting again at a. for each question
      var npr = '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="' + this.nums.length + '"/></w:numPr>';
      var one = function (li, left) { var sp = li.querySelector('span'); return self.p(self.runs(sp ? inlines(sp) : []), { numPr: npr, ind: left ? { left: left + 360, hanging: 360 } : null, lines: ln }); };
      if (cols === 1) return lis.map(function (li) { return one(li, ind); }).join('');
      var rows = ''; for (var i = 0; i < lis.length; i += cols) { rows += '<w:tr><w:trPr><w:cantSplit/></w:trPr>'; for (var k = 0; k < cols; k++) rows += lis[i + k] ? this.cell(cw, this.within(cw, function () { return one(lis[i + k], 0); })) : this.cell(cw, this.p('')); rows += '</w:tr>'; }
      var ws = []; while (ws.length < cols) ws.push(cw);
      return this.bare(ws, rows).replace('<w:tblInd w:w="0"', '<w:tblInd w:w="' + ind + '"');
    },
    table: function (tb, indent) {
      var self = this, rows = tb.querySelectorAll(':scope > tr, :scope > thead > tr, :scope > tbody > tr'), W = this.cur.width - (indent || 0);
      if (!rows.length) return '';
      var ncol = 0; Array.prototype.forEach.call(rows, function (r) { var c = 0; Array.prototype.forEach.call(r.children, function (td) { c += +(td.getAttribute('colspan') || 1); }); ncol = Math.max(ncol, c); });
      var isRv = /\brv\b/.test(tb.className), isKey = /\bpt-key\b/.test(tb.className), grid = /\bq-grid\b/.test(tb.className);
      if (grid) W = Math.min(W, ncol * 1.5 * TW); // ExamView tables: as narrow as they need, centered
      var widths = isRv ? [0.45 * TW, W - 0.45 * TW] : null;
      if (!widths) { widths = []; for (var k = 0; k < ncol; k++) widths.push(W / ncol); }
      var grid = '<w:tblGrid>' + widths.map(function (w) { return '<w:gridCol w:w="' + Math.round(w) + '"/>'; }).join('') + '</w:tblGrid>';
      var borders = isKey ? '<w:tblBorders><w:insideH w:val="single" w:sz="4" w:color="DDDDDD"/><w:bottom w:val="single" w:sz="4" w:color="DDDDDD"/></w:tblBorders>' :
        '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(function (s) { return isRv ? '<w:' + s + ' w:val="nil"/>' : '<w:' + s + ' w:val="single" w:sz="6" w:color="000000"/>'; }).join('') + '</w:tblBorders>';
      var h = '<w:tbl><w:tblPr><w:tblW w:w="' + Math.round(W) + '" w:type="dxa"/>' + (indent ? '<w:tblInd w:w="' + Math.round(indent) + '" w:type="dxa"/>' : '') + borders + (grid ? '<w:jc w:val="center"/>' : '') + '<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr>' + grid;
      Array.prototype.forEach.call(rows, function (r) {
        var head = r.parentNode.tagName.toLowerCase() === 'thead' || /\brv-h\b/.test(r.className), shade = null, col = 0; // the review's Multiple Choice row has no fill (2026-11-28)
        h += '<w:tr>' + (head ? '<w:trPr><w:tblHeader/><w:cantSplit/></w:trPr>' : '<w:trPr><w:cantSplit/></w:trPr>');
        Array.prototype.forEach.call(r.children, function (td) {
          var span = +(td.getAttribute('colspan') || 1), w = widths.slice(col, col + span).reduce(function (a, b) { return a + b; }, 0); col += span;
          var keep = self.cur, inner;
          var hasBlocks = Array.prototype.some.call(td.children, function (c) { return /^(div|p|table|ul|ol)$/i.test(c.tagName); });
          self.cur = Object.assign({}, keep, { width: w - 160 });
          inner = hasBlocks ? self.blocks(td) : self.p(self.runs(inlines(td, head || /\b(n|l|rv-n)\b/.test(td.className) ? { b: true } : {})), { after: 40, align: grid ? 'center' : null });
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
      var lesson = s.doc === 'lesson', paper = this.exam && s.type !== 'key', wide = s.type !== 'key', W = (wide ? 7 : 7.5) * TW, self = this; // keys keep 0.5in margins
      this.list = null;
      this.cur = { width: W, font: s.font ? ({ 'Atkinson Hyperlegible': 'Atkinson Hyperlegible Next', 'OpenDyslexic': 'OpenDyslexic' })[s.font] || s.font : (appState().settings.font || 'Century Schoolbook'), size: s.size || num(appState().settings.fontSize, 12), spacing: s.spacing,
        lines: paper && !s.spacing ? 1 : 0, big: paper && (s.size || 0) > num(appState().settings.fontSize, 12) };
      // tests and quizzes: Name/Date and the title line (and teacher/calculator/time on the accommodated copy) go in the first-page header
      var top = '';
      if (paper) Array.prototype.slice.call(root.children).forEach(function (el) {
        if (/\bcl-(name|title|acc)\b/.test(el.className)) { top += self.block(el); el.remove(); }
      });
      var sid = 'Sec' + (this.parts.length + this.media.length + Math.random().toString(36).slice(2, 6));
      var styled = function (x) { return x.replace(/<w:p>(<w:pPr>)?/g, function (m0, pp) { return '<w:p><w:pPr><w:pStyle w:val="' + sid + '"/>' + (pp ? '' : '</w:pPr>'); }); };
      // a multiple-choice part is a Word section of its own: its page header carries the computations box on every page after its first
      var chunks = [{ els: [], box: false, type: 'nextPage' }];
      Array.prototype.slice.call(root.children).forEach(function (el) {
        if (paper && /\bcl-part\b/.test(el.className)) {
          var boxed = /\bcl-boxed\b/.test(el.className), c = chunks[chunks.length - 1];
          el.boxed = boxed;
          if (boxed !== c.box || (boxed && c.els.length)) { if (c.els.length) { el.sectioned = true; chunks.push({ els: [], box: boxed, type: /\bcl-newpage\b/.test(el.className) ? 'nextPage' : 'continuous' }); } else c.box = boxed; }
        } else if (paper && /\bcl-(bonus|scorewrap)\b/.test(el.className)) { /* stays with the last part */ }
        chunks[chunks.length - 1].els.push(el);
      });
      var blankP = '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="' + (this.cur.lines ? 240 : 276) + '" w:lineRule="auto"/></w:pPr></w:p>';
      var bodies = chunks.map(function (c) { var d = document.createElement('div'); c.els.forEach(function (e) { d.appendChild(e); });
        return styled(self.blocks(d).split(BLANK + BLANK).join(BLANK).split(BLANK + BLANK).join(BLANK).replace(new RegExp('^(' + BLANK + ')+'), '').split(BLANK).join(blankP)); });
      var course = headerText(), right = rightLabel(), hdr = {}, boxHdr = '';
      var bar = this.bdr(['bottom'], paper ? 12 : 10).replace(/w:space="4"/, paper ? 'w:space="1"' : 'w:space="4"'), small = { size: 9, color: '666666' };
      if (s.type === 'key') {
        hdr.header = this.hf('header', this.p('')); // blank: otherwise Word repeats the test's header
        hdr.footer = this.hf('footer', this.p(this.t(course + '  —  ' + docTitle() + '  —  ' + s.label, small) + this.tab() + this.t('Page ', small) + this.page(), { tabs: [['right', W]] }));
      } else if (paper) {
        var line = function (extra) { return styled(self.p(self.t(course, { b: true, size: 12 }) + (extra || ''), { align: 'center', border: bar, ind: { left: -180 } })); };
        hdr.first = this.hf('header', line() + (top ? styled(this.p('') + top) : ''));
        hdr.header = this.hf('header', line());
        if (chunks.some(function (c) { return c.box; })) boxHdr = this.hf('header', line(this.compBox('page', 0.83)));
        hdr.footer = this.hf('footer', styled(this.p(this.tab() + this.page(), { tabs: [['right', W]] })));
        hdr.firstFooter = this.hf('footer', styled(this.p(this.t('v. ' + (s.v + 1), { size: 10, color: '808080' }))));
      } else {
        var icons = lesson ? lessonTools().map(function (k) { return self.pic(LESSON_ICONS[k].src, LESSON_ICONS[k].w / 72, LESSON_ICONS[k].h / 72) + self.t(' '); }).join('') : '';
        hdr.first = this.hf('header', (icons ? this.p(icons) : '') + this.p(this.t(course, { b: true }), { align: 'center', border: bar }));
        hdr.header = this.hf('header', this.p(this.t(course), { align: 'center', border: bar }) + (right ? this.p(this.t(right, { i: s.doc === 'review' }), { align: 'right' }) : ''));
        var foot = lesson ? [lessonCode(), lessonSource() ? 'Source: ' + lessonSource() : ''].filter(Boolean).join('   ') : '';
        hdr.footer = this.hf('footer', this.p((foot ? this.t(foot, small) : '') + this.tab() + this.page(), { tabs: [['right', W]] }));
        hdr.firstFooter = this.hf('footer', this.p(''));
      }
      var mar = wide ? [1, 0.75, 0.5] : [0.5, 0.5, 0.25], ref = function (k, t, id) { return id ? '<w:' + k + 'Reference w:type="' + t + '" r:id="' + id + '"/>' : ''; };
      // the section's font and size go on every run through a paragraph-level default (rPr in pPr doesn't inherit), so use a style per section
      this.styles = (this.styles || '') + '<w:style w:type="paragraph" w:customStyle="1" w:styleId="' + sid + '"><w:name w:val="' + X(s.label || 'Test') + ' text"/><w:basedOn w:val="Normal"/><w:qFormat/><w:rPr><w:rFonts w:ascii="' + X(this.cur.font) + '" w:hAnsi="' + X(this.cur.font) + '" w:cs="' + X(this.cur.font) + '"/><w:sz w:val="' + Math.round(this.cur.size * 2) + '"/><w:szCs w:val="' + Math.round(this.cur.size * 2) + '"/></w:rPr></w:style>';
      chunks.forEach(function (c, i) {
        var h1 = i ? hdr.header : hdr.first, f1 = i ? hdr.footer : hdr.firstFooter, tp = i ? c.box : !!hdr.first;
        var sect = '<w:sectPr>' + (tp ? ref('header', 'first', h1) : '') + ref('header', 'default', c.box ? boxHdr : hdr.header) + (tp ? ref('footer', 'first', f1) : '') + ref('footer', 'default', hdr.footer) +
          '<w:type w:val="' + c.type + '"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="' + mar[0] * TW + '" w:right="' + mar[1] * TW + '" w:bottom="' + mar[0] * TW + '" w:left="' + mar[1] * TW + '" w:header="' + mar[2] * TW + '" w:footer="' + mar[2] * TW + '" w:gutter="0"/>' +
          (i ? '' : '<w:pgNumType w:start="1"/>') + (tp ? '<w:titlePg/>' : '') + '</w:sectPr>';
        if (last && i === chunks.length - 1) self.body += bodies[i] + sect;
        else self.body += bodies[i] + '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>' + sect + '</w:pPr></w:p>';
      });
    },
    files: function () {
      var media = this.media, rels = this.rels.concat(media.map(function (m) { return '<Relationship Id="' + m.id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + m.name + '"/>'; }));
      if (this.nums.length) rels.push('<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>');
      rels.push('<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>', '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>');
      var head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
      var font = X(appState().settings.font || 'Century Schoolbook');
      var files = [
        { name: '[Content_Types].xml', data: head + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>' +
          '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>' +
          (this.nums.length ? '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>' : '') +
          this.parts.map(function (p) { return '<Override PartName="/' + p.name + '" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.' + p.kind + '+xml"/>'; }).join('') + '</Types>' },
        { name: '_rels/.rels', data: head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
        { name: 'word/_rels/document.xml.rels', data: head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + rels.join('') + '</Relationships>' },
        { name: 'word/document.xml', data: head + '<w:document ' + NS + '><w:body>' + this.body + '</w:body></w:document>' },
        { name: 'word/styles.xml', data: head + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="' + font + '" w:hAnsi="' + font + '" w:eastAsia="' + font + '" w:cs="' + font + '"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:before="0" w:after="0" w:line="276" w:lineRule="auto"/><w:ind w:left="0" w:right="0"/></w:pPr></w:pPrDefault></w:docDefaults>' +
          '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>' + (this.styles || '') + '</w:styles>' },
        { name: 'word/settings.xml', data: head + '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="720"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>' }
      ];
      this.parts.forEach(function (p) { files.push({ name: p.name, data: p.xml }); });
      // question numbers: "1." bold, number at the margin, text at 0.4 in (wrapped lines too); one w:num per list, restarting at its first number
      if (this.nums.length) files.push({ name: 'word/numbering.xml', data: head + '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="' + this.ind + '"/></w:tabs><w:ind w:left="' + this.ind + '" w:hanging="' + this.ind + '"/></w:pPr><w:rPr><w:b/></w:rPr></w:lvl></w:abstractNum>' +
        (this.exam ? (function (l) { return '<w:abstractNum w:abstractNumId="1"><w:multiLevelType w:val="singleLevel"/><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="' + l[0] + '"/><w:lvlText w:val="' + l[1] + '"/><w:lvlJc w:val="left"/><w:pPr><w:tabs><w:tab w:val="num" w:pos="360"/></w:tabs><w:ind w:left="360" w:hanging="360"/></w:pPr><w:rPr><w:b/><w:i w:val="0"/></w:rPr></w:lvl></w:abstractNum>'; })({ lowerdot: ['lowerLetter', '%1.'], upper: ['upperLetter', '%1.'], lower: ['lowerLetter', '%1)'], num: ['decimal', '(%1)'] }[appState().settings.labels] || ['upperLetter', '%1.']) : '') +
        this.nums.map(function (n, i) { return '<w:num w:numId="' + (i + 1) + '"><w:abstractNumId w:val="' + n.abs + '"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="' + n.n + '"/></w:lvlOverride></w:num>'; }).join('') + '</w:numbering>' });
      media.forEach(function (m) { files.push({ name: 'word/media/' + m.name, data: m.data }); });
      var mediaRels = head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + media.map(function (m) { return '<Relationship Id="' + m.id + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' + m.name + '"/>'; }).join('') + '</Relationships>';
      this.parts.forEach(function (p) { if (/r:embed=/.test(p.xml)) files.push({ name: p.name.replace('word/', 'word/_rels/') + '.rels', data: mediaRels }); });
      return files;
    }
  };
  var NS = 'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';

  /* ---------- LaTeX (.zip with the .tex file and its pictures; pdfLaTeX, exam class) ---------- */
  // Unicode symbols that show up in math questions → LaTeX (set up with \newunicodechar in the preamble)
  var UNI = { '∠': '\\angle', '△': '\\triangle', '≅': '\\cong', '∼': '\\sim', '⊥': '\\perp', '∥': '\\parallel', '°': '^{\\circ}', 'π': '\\pi', '√': '\\surd', '≠': '\\neq', '≤': '\\leq', '≥': '\\geq', '±': '\\pm', '×': '\\times', '÷': '\\div', 'θ': '\\theta', '′': '^{\\prime}', '″': '^{\\prime\\prime}',
    '∴': '\\therefore', '∵': '\\because', '∞': '\\infty', '≈': '\\approx', '→': '\\rightarrow', '∘': '\\circ', '↔': '\\leftrightarrow', '⇒': '\\Rightarrow', '∈': '\\in', '∪': '\\cup', '∩': '\\cap', '⊂': '\\subset', '∅': '\\emptyset', '·': '\\cdot', '−': '-', '∑': '\\sum', '∆': '\\Delta', 'ℓ': '\\ell',
    'α': '\\alpha', 'β': '\\beta', 'γ': '\\gamma', 'δ': '\\delta', 'ε': '\\varepsilon', 'λ': '\\lambda', 'μ': '\\mu', 'σ': '\\sigma', 'φ': '\\varphi', 'ω': '\\omega', '▱': '\\Box', 'χ': '\\chi', 'η': '\\eta', 'κ': '\\kappa', 'ν': '\\nu', 'ρ': '\\rho', 'τ': '\\tau', 'ψ': '\\psi', 'ξ': '\\xi', 'ζ': '\\zeta', 'ι': '\\iota', 'Γ': '\\Gamma', 'Θ': '\\Theta', 'Λ': '\\Lambda', 'Ξ': '\\Xi', 'Π': '\\Pi', 'Φ': '\\Phi', 'Ψ': '\\Psi', 'Δ': '\\Delta', 'Σ': '\\Sigma', 'Ω': '\\Omega' };
  var FONT_PKG = { 'Century Schoolbook': '\\usepackage{tgschola}', 'Times New Roman': '\\usepackage{newtxtext}', 'Book Antiqua': '\\usepackage{tgpagella}', 'Georgia': '\\usepackage{tgschola}', 'Cambria': '\\usepackage{tgschola}', 'Garamond': '\\usepackage{ebgaramond}',
    'Arial': '\\usepackage{tgheros}\\renewcommand{\\familydefault}{\\sfdefault}', 'Calibri': '\\usepackage{tgheros}\\renewcommand{\\familydefault}{\\sfdefault}', 'Verdana': '\\usepackage{tgheros}\\renewcommand{\\familydefault}{\\sfdefault}', 'Comic Sans MS': '\\usepackage{tgheros}\\renewcommand{\\familydefault}{\\sfdefault}',
    'Atkinson Hyperlegible': '\\usepackage{tgheros}\\renewcommand{\\familydefault}{\\sfdefault}', 'OpenDyslexic': '\\usepackage{tgheros}\\renewcommand{\\familydefault}{\\sfdefault}' };
  function texEsc(s) {
    return String(s).replace(/[\\{}$&#%_^~]/g, function (c) { return { '\\': '\\textbackslash{}', '{': '\\{', '}': '\\}', '$': '\\$', '&': '\\&', '#': '\\#', '%': '\\%', '_': '\\_', '^': '\\textasciicircum{}', '~': '\\textasciitilde{}' }[c]; })
      .replace(/\u00a0/g, '~').replace(/[\u2003\u2002\u2009]/g, ' ');
  }
  function texMathText(s) { return String(s).replace(/[\\{}$&#%_]/g, function (c) { return c === '\\' ? '\\backslash ' : '\\' + c; }).replace(/\s+/g, '\\ '); }

  function latex(kind) { return laidOut(kind).then(function (x) { return latexOf(kind, x.secs, x.roots); }); }
  function latexOf(kind, secs, roots) {
    var uses = []; roots.forEach(function (r) { Array.prototype.forEach.call(r.querySelectorAll('img'), function (i) { uses.push({ src: i.getAttribute('src'), w: inches(i.style.width) }); }); });
    var lesson = docType() === 'lesson';
    if (lesson) lessonTools().forEach(function (k) { uses.push({ src: LESSON_ICONS[k].src, w: LESSON_ICONS[k].w / 72 }); });
    return prepareImages(uses).then(function (imgs) {
      var w = new TexWriter(imgs), body = secs.map(function (s, i) { return w.section(s, roots[i], i === 0); }).join('\n');
      var name = fileName(kind, 'tex').replace(/[^A-Za-z0-9 ._-]+/g, '').replace(/\s+/g, '-');
      var files = [{ name: name, data: w.preamble() + '\n\\begin{document}\n' + body + '\n\\end{document}\n' }].concat(w.files);
      return zip(files);
    });
  }
  function TexWriter(imgs) { this.imgs = imgs; this.files = []; this.names = {}; this.used = {}; }
  TexWriter.prototype = {
    preamble: function () {
      var s = appState().settings, lesson = docType() === 'lesson', ex = isExamDoc(), m = ex ? 'top=1in,bottom=1in,left=0.75in,right=0.75in,headheight=24pt,headsep=12pt,footskip=0.35in' : 'top=1in,bottom=1in,left=0.75in,right=0.75in,headheight=' + (lesson ? 40 : 16) + 'pt,headsep=12pt,footskip=0.5in'; // reviews and lessons: the test margins (2026-11-28)
      var uni = Object.keys(this.used).map(function (c) { return '\\newunicodechar{' + c + '}{\\ensuremath{' + UNI[c] + '}}'; }).join('\n');
      return '% Made by ALittleCandleTestBuilder. Compile with pdfLaTeX (Overleaf\'s default).\n' +
        '\\documentclass[12pt]{exam}\n\\usepackage[letterpaper,' + m + ']{geometry}\n\\usepackage[T1]{fontenc}\n\\usepackage[utf8]{inputenc}\n' +
        (FONT_PKG[s.font] || FONT_PKG['Century Schoolbook']) + '\n' +
        '\\usepackage{amsmath,amssymb,graphicx,array,tabularx,longtable,enumitem,needspace,newunicodechar}\n\\usepackage[table]{xcolor}\n' +
        '\\definecolor{lessonpurple}{HTML}{8064A2}\\definecolor{mcshade}{HTML}{E5DFEC}\n' +
        '\\setlength{\\parindent}{0pt}\\setlength{\\linefillheight}{24pt}\\setlength{\\fboxsep}{4pt}\n\\raggedbottom\n' +
        (ex ? '\\usepackage{eso-pic,afterpage}\n\\newif\\ifmcpage\n\\definecolor{boxgray}{HTML}{BFBFBF}\n' +
          '\\newcommand{\\compbox}{{\\setlength{\\fboxsep}{0pt}\\setlength{\\fboxrule}{0.75pt}\\fcolorbox{boxgray}{white}{\\parbox[c][0.4in][c]{1.233in}{\\centering\\fontsize{8}{9.6}\\selectfont\\bfseries Use this space for computations.}}}}\n' +
          '\\AddToShipoutPictureFG{\\ifmcpage\\AtPageUpperLeft{\\put(\\LenToUnit{7.02in},\\LenToUnit{-1.25in}){\\compbox}}\\fi}\n' +
          '\\newcommand{\\scorebox}[1]{{\\setlength{\\fboxsep}{5pt}\\setlength{\\fboxrule}{0.5pt}\\fcolorbox{black}{white}{\\parbox[b][0.86in][s]{1.4in}{Score:\\vfill\\hfill{\\fontsize{32}{36}\\selectfont #1}}}}}\n' : '') + uni + '\n';
    },
    // inline runs → LaTeX
    runs: function (rs) {
      var self = this;
      return rs.map(function (r) {
        if (r.br) return '\\newline{}';
        if (r.img) return self.pic(r.img, r.w);
        if (r.math === 'eq') return self.runs(r.kids); // LaTeX keeps a math span as text + its marks, as before
        if (r.math) return '$' + self.math(r) + '$';
        if (!r.text) return '';
        var t = self.uniText(r.text);
        if (r.sup) t = '\\textsuperscript{' + t + '}'; if (r.sub) t = '\\textsubscript{' + t + '}';
        if (r.b) t = '\\textbf{' + t + '}'; if (r.i) t = '\\textit{' + t + '}'; if (r.u) t = '\\underline{' + t + '}';
        return t;
      }).join('');
    },
    uniText: function (s) { var self = this; return texEsc(s).replace(/([A-Za-z])\u0302/g, '\\ensuremath{\\hat{$1}}').replace(/[^\x00-\x7f\u00a0-\u00ff\u2013\u2014\u2018\u2019\u201c\u201d\u2026]/g, function (c) { if (UNI[c]) { self.used[c] = 1; return c; } return '?'; }); },
    math: function (r) {
      var self = this;
      var e = function (rs) { return (rs || []).map(function (x) { if (x.math) return self.math(x); if (!x.text) return ''; var t = texMathText(x.text).replace(/([A-Za-z])\u0302/g, '\\hat{$1}').replace(/[^\x00-\x7f]/g, function (c) { return UNI[c] ? '{' + UNI[c] + '}' : '?'; }); return x.sup ? '^{' + t + '}' : x.sub ? '_{' + t + '}' : '\\mathrm{' + t + '}'; }).join(''); };
      if (r.math === 'eq') return e(r.kids);
      if (r.math === 'bar') return '\\overline{' + e(r.kids) + '}';
      if (r.math === 'acc') return (r.chr === '\u20d7' ? '\\overrightarrow{' : r.chr === '\u0311' ? '\\overset{\\frown}{' : '\\overleftrightarrow{') + e(r.kids) + '}';
      if (r.math === 'frac') return '\\dfrac{' + e(r.num) + '}{' + e(r.den) + '}'; // full size, as on paper
      if (r.math === 'rad') return '\\sqrt{' + e(r.kids) + '}';
      return '';
    },
    pic: function (src, wIn) {
      var im = this.imgs[src]; if (!im) return '';
      if (!this.names[src]) { var n = 'images/img' + (this.files.length + 1) + '.' + (im.ext === 'jpeg' ? 'jpg' : 'png'); this.files.push({ name: n, data: im.data }); this.names[src] = n; }
      var w = Math.min(wIn || im.wIn, this.width);
      return '\\includegraphics[width=' + (Math.round(w * 100) / 100) + 'in]{' + this.names[src] + '}';
    },
    para: function (rs) { var t = this.runs(rs).trim(); return t ? t + '\\par\n' : ''; },
    blocks: function (root) { var self = this; return Array.prototype.map.call(root.children, function (el) { return self.block(el); }).join(''); },
    mixed: function (el) {
      var self = this, h = '', cur = [];
      var flush = function () { if (cur.length) { h += self.para(inlines(wrapAll(cur))); cur = []; } };
      Array.prototype.forEach.call(el.childNodes, function (c) { if (c.nodeType === 1 && /\bq-(mid|row)\b/.test(c.className)) { flush(); h += '{\\centering ' + self.runs(inlines(wrapAll([c]))) + '\\par}\n'; }
        else if (c.nodeType === 1 && /^(div|p|table|ul|ol|hr|h1|h2|h3)$/i.test(c.tagName)) { flush(); h += self.block(c); }
        else if (c.nodeType === 1 && /\bq-mid\b/.test(c.className)) { flush(); h += '{\\centering ' + self.runs(inlines(wrapAll([c]))) + '\\par}\n'; } else cur.push(c); });
      flush(); return h;
    },
    block: function (el) {
      var cls = el.className || '', tag = el.tagName.toLowerCase(), self = this;
      if (tag === 'style' || /\bcl-runfoot\b/.test(cls)) return '';
      if (/\bcl-name\b/.test(cls)) return 'Name: \\rule{3.4in}{0.4pt}\\hfill Date: \\rule{1.9in}{0.4pt}\\par\\medskip\n';
      if (/\bcl-title\b/.test(cls)) return '\\textbf{' + this.uniText(textOf(el.children[0])) + '}\\hfill\\textbf{' + this.uniText(textOf(el.children[1])) + '}\\par\\vspace{3pt}\n';
      if (/\bcl-acc\b/.test(cls)) return '\\medskip' + Array.prototype.map.call(el.querySelectorAll('i'), function (i) { return '\\textit{' + self.uniText(textOf(i)) + '}'; }).join('\\hfill ') + '\\par\\vspace{3pt}\n';
      if (/\bcl-part\b/.test(cls)) {
        var dir = el.querySelector('.cl-dir'), tot = dir && dir.querySelector('.cl-tot'), dc = dir && dir.cloneNode(true); if (dc && dc.querySelector('.cl-tot')) dc.querySelector('.cl-tot').remove();
        var boxed = /\bcl-boxed\b/.test(cls), np = /\bcl-newpage\b/.test(cls);
        this.compNext = boxed;
        // the box is repeated on the pages after the part's first one
        return (np ? '\\newpage' : '') + (this.boxOn ? '\\afterpage{\\global\\mcpagefalse}' + (np ? '\\global\\mcpagefalse' : '') : '') + ((this.boxOn = boxed) ? '\\afterpage{\\global\\mcpagetrue}' : '') +
          (np || /\bcl-first\b/.test(cls) ? '' : '\\needspace{6\\baselineskip}\\bigskip') + '{\\centering\\textbf{' + this.uniText(textOf(el.querySelector('.cl-pname'))) + '}\\par}\n' +
          (dc ? '{\\bfseries\\raggedright ' + this.runs(inlines(dc)) + (tot ? '\\hspace*{\\fill}\\mbox{' + texEsc(textOf(tot)) + '}' : '') + '\\par}\\vspace{1\\baselineskip}\n' : '');
      }
      if (/\bcl-comp\b/.test(cls)) return '';
      if (/\bcl-bonus\b/.test(cls)) return (this.boxOn ? '\\afterpage{\\global\\mcpagefalse}' : '') + '\\medskip{\\bfseries\\itshape ' + this.uniText(textOf(el)) + '\\par}\n';
      if (/\bcl-scorewrap\b/.test(cls)) { var sb = '\\rlap{\\hspace*{5.69in}\\scorebox{' + texEsc(textOf(el.querySelector('.cl-score-n'))) + '}}'; return '\\par\\vspace*{\\fill}\\noindent' + (/\bover\b/.test(cls) ? '\\smash{' + sb + '}' : sb) + '\\mbox{}\\par\n'; }
      if (/\bq-two\b/.test(cls)) {
        var im = el.querySelector('.q-side img'), keep = this.width, pw = inches(im.style.width) || 2;
        this.width = keep - pw - 0.15; var left = this.blocks(el.children[0]).replace(/\\par\s*$/, ''); this.width = keep;
        return '\\par\\noindent\\begin{minipage}[t]{' + (Math.round((keep - pw - 0.15) * 100) / 100) + 'in}\\vspace{0pt}' + left + '\\end{minipage}\\hfill\\begin{minipage}[t]{' + pw + 'in}\\vspace{0pt}' + this.pic(im.getAttribute('src'), pw) + '\\end{minipage}\\par\n';
      }
      if (/\bq-part\b/.test(cls)) return '\\begin{itemize}[leftmargin=0.25in,labelwidth=0.25in,labelsep=0in,align=left,topsep=6pt]\n\\item[\\textbf{' + texEsc(textOf(el.querySelector('b'))) + '}] ' + this.mixed(el.querySelector(':scope > div')) + '\\end{itemize}\n';
      if (/\bpt-q\b/.test(cls) && tag !== 'tr') return this.question(el);
      if (/\brv-title\b/.test(cls)) return '\\begin{center}\\textbf{' + this.uniText(textOf(el)) + '}\\end{center}\n';
      if (tag === 'table') return this.table(el);
      if (/\bpt-head\b/.test(cls)) return '{\\Large\\textbf{' + this.uniText(textOf(el.querySelector('h1'))) + '}}\\par\n{\\small ' + this.uniText(textOf(el.querySelector('.pt-sub'))) + '}\\par\n';
      if (tag === 'hr') return '\\vspace{2pt}\\hrule\\medskip\n';
      if (/\bls-unit\b/.test(cls)) return '{\\hfill\\textbf{' + this.uniText(textOf(el)) + '}\\par}\n';
      if (/\bls-target\b/.test(cls)) return '\\textbf{' + this.uniText(textOf(el.querySelector('.ls-tl'))) + '} ' + this.runs(inlines(el.querySelector('.ls-tline') || document.createElement('i'))) + '\\par\\medskip\n';
      if (/\bls-ex\b/.test(cls) && el.querySelector('.ls-exn')) return '\\needspace{4\\baselineskip}\\medskip\\textbf{' + this.uniText(textOf(el)) + '}\\par\n';
      if (/\bls-h\b|\bls-notes\b/.test(cls) && !el.children.length) return '\\needspace{4\\baselineskip}\\bigskip{\\color{lessonpurple}\\textbf{' + this.uniText(textOf(el)) + '}}\\par\\smallskip\n';
      if (/\bls-box\b/.test(cls)) return '\\noindent\\fbox{\\parbox{\\dimexpr\\linewidth-2\\fboxsep-2\\fboxrule}{' + this.runs(inlines(el)) + '}}\\par\\medskip\n';
      if (/\bpt-lines\b/.test(cls)) return '\\fillwithlines{' + el.children.length + '\\linefillheight}\n';
      if (/\bpt-space\b/.test(cls) || (tag === 'div' && !el.children.length && !textOf(el) && el.style.height)) return '\\vspace*{' + inches(el.style.height) + 'in}\n';
      if (tag === 'ul' && /\bpt-ch\b/.test(cls)) return this.choices(el);
      if (/\bpt-tf\b/.test(cls)) return '\\hspace*{0.1in}\\textbf{T}\\hspace{0.7in}\\textbf{F}\\par\n';
      if (/\bcl-cred\b/.test(cls)) return '{\\hfill ' + texEsc(textOf(el)) + '\\par}\n';
      if (/\bpt-keynote\b|\brv-ref\b/.test(cls)) return '{\\hfill\\color{gray}\\tiny ' + this.uniText(textOf(el)) + '\\par}\n';
      if (tag === 'ul' || tag === 'ol') return '\\begin{' + (tag === 'ol' ? 'enumerate' : 'itemize') + '}[nosep]\n' + Array.prototype.map.call(el.children, function (li) { return '\\item ' + self.runs(inlines(li)) + '\n'; }).join('') + '\\end{' + (tag === 'ol' ? 'enumerate' : 'itemize') + '}\n';
      return this.mixed(el);
    },
    question: function (el) {
      var self = this, num = textOf(el.querySelector(':scope > .pt-num')), body = el.querySelector(':scope > div:not(.pt-num)') || el, keepW = this.width;
      var kx = /\bx-(mc|op|sh|bn)\b/.exec(el.className), K = kx && kx[1];
      if (K) { // a test question: the same columns as the printed page
        var blank = !!el.querySelector('.pt-blank'), ML = { mc: 0.475, op: 0.585, sh: 0.25, bn: 0 }[K] + (blank ? 0.45 : 0), MR = { mc: 0.775, op: 0.075, sh: 0, bn: 0 }[K];
        this.width = 7 - ML - MR;
        var parts = Array.prototype.map.call(body.children, function (c) { return /\bpt-qt\b|\bpt-more\b/.test(c.className) ? self.mixed(c) : (K === 'mc' && /\bpt-ch\b|\bq-two\b/.test(c.className) ? '\\vspace{1\\baselineskip}' : '') + self.block(c); }).join('');
        this.width = keepW;
        var comp = this.compNext && K === 'mc' ? '\\smash{\\rlap{\\hspace*{5.795in}\\raisebox{-0.06in}{\\compbox}}}' : ''; if (comp) this.compNext = false;
        return '\\needspace{3\\baselineskip}\\begin{itemize}[leftmargin=' + ML + 'in,rightmargin=' + MR + 'in,labelindent=' + (K === 'mc' || K === 'op' ? 0.075 : 0) + 'in,labelwidth=*,labelsep=0in,align=left,topsep=0pt,partopsep=0pt]\n\\item[' + (num ? '\\textbf{' + (blank ? '\\rule{0.4in}{0.4pt} ' : '') + texEsc(num) + '}' : '') + '] \\leavevmode ' + comp + parts + '\\end{itemize}\\vspace{' + (K === 'op' ? 1 : 2) + '\\baselineskip}\n' + (/\bacc-break\b/.test(el.className) ? '\\newpage\n' : '');
      }
      this.width = keepW - 0.4;
      var inner = Array.prototype.map.call(body.children, function (c) { return /\bpt-qt\b/.test(c.className) ? self.mixed(c) : self.block(c); }).join('');
      this.width = keepW;
      return '\\needspace{5\\baselineskip}\\begin{itemize}[leftmargin=0.4in,labelwidth=0.35in,labelsep=0.05in,align=left,topsep=' + (this.spacing ? '16pt' : '10pt') + ']\n\\item[' + (num ? '\\textbf{' + texEsc(num) + '}' : '') + '] ' + inner + '\\end{itemize}\n' + (/\bacc-break\b/.test(el.className) ? '\\newpage\n' : '');
    },
    choices: function (ul) {
      var self = this, cols = /\bc4\b/.test(ul.className) ? 4 : /\bc2\b/.test(ul.className) ? 2 : 1;
      if (isExamDoc() && cols === 1) return '\\begin{itemize}[leftmargin=0.25in,labelwidth=0.25in,labelsep=0in,align=left,topsep=0pt,itemsep=2pt,parsep=0pt]\n' + Array.prototype.map.call(ul.querySelectorAll(':scope > li'), function (li) { var sp = li.querySelector('span'); return '\\item[\\textbf{' + texEsc(textOf(li.querySelector('b'))) + '}] ' + self.runs(sp ? inlines(sp) : []) + '\n'; }).join('') + '\\end{itemize}\n';
      if (isExamDoc() && cols === 4 && this.big) cols = 2;
      var items = Array.prototype.map.call(ul.querySelectorAll(':scope > li'), function (li) { var b = li.querySelector('b'), sp = li.querySelector('span'); return (isExamDoc() ? '\\makebox[0.25in][l]{\\textbf{' + texEsc(textOf(b)) + '}}' : '\\textbf{' + texEsc(textOf(b)) + '}~') + self.runs(sp ? inlines(sp) : []); });
      var rows = []; for (var i = 0; i < items.length; i += cols) { var r = items.slice(i, i + cols); while (r.length < cols) r.push(''); rows.push(r.join(' & ')); }
      return '\\par\\smallskip\\noindent\\begin{tabularx}{\\linewidth}{@{}' + Array(cols + 1).join('X') + '@{}}\n' + rows.join(' \\\\[' + (this.spacing ? '8pt' : '3pt') + ']\n') + '\n\\end{tabularx}\\par\n';
    },
    table: function (tb) {
      var self = this, rows = tb.querySelectorAll(':scope > tr, :scope > thead > tr, :scope > tbody > tr'); if (!rows.length) return '';
      var ncol = 0; Array.prototype.forEach.call(rows, function (r) { var c = 0; Array.prototype.forEach.call(r.children, function (td) { c += +(td.getAttribute('colspan') || 1); }); ncol = Math.max(ncol, c); });
      var isRv = /\brv\b/.test(tb.className), isKey = /\bpt-key\b/.test(tb.className), grid = /\bq-grid\b/.test(tb.className), W = this.width;
      if (grid) W = Math.min(W, ncol * 1.5);
      var widths = isRv ? [0.35, W - 0.35] : null; if (!widths) { widths = []; for (var k = 0; k < ncol; k++) widths.push(W / ncol); }
      var ruled = !isKey && !isRv, bar = ruled ? '|' : ''; // Review: no borders
      var colspec = bar + widths.map(function (w) { return (grid ? '>{\\centering\\arraybackslash}' : '') + 'p{\\dimexpr' + (Math.round(w * 100) / 100) + 'in-2\\tabcolsep}'; }).join(bar) + bar;
      var h = (isRv || isKey ? '\\begin{longtable}{' + colspec + '}' : '\\begin{tabular}{' + colspec + '}') + (ruled ? '\\hline\n' : '\n');
      Array.prototype.forEach.call(rows, function (r) {
        var head = r.parentNode.tagName.toLowerCase() === 'thead' || /\brv-h\b/.test(r.className), shade = false, col = 0;
        // when one cell needs a block (pictures, lists…), every cell in the row is top-aligned the same way
        var anyBlocks = Array.prototype.some.call(r.children, function (td) { return Array.prototype.some.call(td.children, function (c) { return /^(div|p|table|ul|ol)$/i.test(c.tagName); }); });
        var cells = Array.prototype.map.call(r.children, function (td) {
          var span = +(td.getAttribute('colspan') || 1), w = widths.slice(col, col + span).reduce(function (a, b) { return a + b; }, 0); col += span;
          var keep = self.width; self.width = w - 0.15;
          var hasBlocks = Array.prototype.some.call(td.children, function (c) { return /^(div|p|table|ul|ol)$/i.test(c.tagName); });
          var inner = hasBlocks ? self.blocks(td).replace(/\\par\s*$/, '') : self.runs(inlines(td, head || /\b(n|l|rv-n)\b/.test(td.className) ? { b: true } : {}));
          self.width = keep;
          inner = inner.replace(/\n+$/, '');
          if (anyBlocks) inner = '\\begin{minipage}[t]{\\linewidth}\\vspace{0pt}' + inner + '\\end{minipage}'; // top-align, even when it starts with a picture
          return span > 1 ? '\\multicolumn{' + span + '}{' + bar + (grid ? '>{\\centering\\arraybackslash}' : '') + 'p{\\dimexpr' + (Math.round(w * 100) / 100) + 'in-2\\tabcolsep}' + bar + '}{' + (shade ? '\\cellcolor{mcshade}' : '') + inner + '}' : inner;
        });
        h += cells.join(' & ') + ' \\\\' + (isKey ? (head ? '\\hline\\endhead' : '') : ruled ? '\\hline' : '') + '\n';
      });
      if (grid) return '\\begin{center}' + h + '\\end{tabular}\\end{center}\n';
      return h + (isRv || isKey ? '\\end{longtable}\n' : '\\end{tabular}\\par\n');
    },
    section: function (s, root, first) {
      var lesson = s.doc === 'lesson', self = this, course = this.uniText(headerText()), right = this.uniText(rightLabel());
      this.width = 7; this.spacing = !!s.spacing; this.boxOn = this.compNext = false; this.big = (s.size || 0) > num(appState().settings.fontSize, 12);
      var body = this.blocks(root), h = (first ? '' : '\\newpage\n') + (isExamDoc() ? '\\global\\mcpagefalse' : '') + '\\setcounter{page}{1}\n';
      if (s.type === 'key') {
        h += '\\firstpageheader{}{}{}\\runningheader{}{}{}\\firstpageheadrule\\relax\\nofirstpageheadrule\\norunningheadrule\n' +
          '\\firstpagefooter{\\footnotesize\\color{gray}' + course + ' --- ' + this.uniText(docTitle()) + ' --- ' + this.uniText(s.label) + '}{}{\\footnotesize\\color{gray}Page \\thepage}\\runningfooter{\\footnotesize\\color{gray}' + course + ' --- ' + this.uniText(s.label) + '}{}{\\footnotesize\\color{gray}Page \\thepage}\n';
      } else {
        if (isExamDoc()) {
          var hd = '{}{\\makebox[0pt][c]{\\hspace*{-0.125in}\\begin{minipage}[b]{7.125in}\\centering\\hspace*{0.125in}\\textbf{\\normalsize ' + course + '}\\\\[-9pt]\\rule{7.125in}{1.5pt}\\end{minipage}}}{}';
          h += '\\firstpageheader' + hd + '\\nofirstpageheadrule\\runningheader' + hd + '\\norunningheadrule\n\\firstpagefooter{\\small\\color{gray}v. ' + (s.v + 1) + '}{}{}\\runningfooter{}{}{\\thepage}\n';
        } else {
        var icons = lesson ? lessonTools().map(function (k) { return self.pic(LESSON_ICONS[k].src, LESSON_ICONS[k].w / 72).replace('width=', 'height=0.45in,keepaspectratio,width='); }).join('\\,') : '';
        var foot = lesson ? this.uniText([lessonCode(), lessonSource() ? 'Source: ' + lessonSource() : ''].filter(Boolean).join('   ')) : '';
        h += '\\firstpageheader{' + icons + '}{\\textbf{' + course + '}}{}\\firstpageheadrule\n\\runningheader{}{' + course + '}{' + (s.doc === 'review' ? '\\textit{' + right + '}' : right) + '}\\runningheadrule\n' +
          '\\firstpagefooter{' + (isExamDoc() ? '\\tiny\\color{gray}v. ' + (s.v + 1) : '') + '}{}{}\\runningfooter{' + (foot ? '\\tiny\\color{gray}' + foot : '') + '}{}{\\thepage}\n';
        }
      }
      var size = s.size && s.size !== 12 ? '\\fontsize{' + s.size + '}{' + Math.round(s.size * 1.25) + '}\\selectfont\n' : '';
      if (s.font && s.font !== appState().settings.font) h += '% ' + s.label + ': ' + s.font + ' font on paper; this file uses the closest LaTeX font.\n';
      return h + '{' + (isExamDoc() && s.type !== 'key' ? '\\raggedright\\hyphenpenalty=10000 ' : '') + size + (s.spacing ? '\\linespread{1.5}\\selectfont\n' : '') + body + '}\n';
    }
  };

  /* ---------- download ---------- */
  function download(format, kind) {
    var make = { docx: docx, tex: latex }[format];
    if (!make) return Promise.reject(new Error('Unknown format ' + format));
    return make(kind).then(function (blob) { var name = fileName(kind, format === 'tex' ? 'zip' : 'docx'); saveFile(name, blob); return { name: name, size: blob.size }; });
  }
  return { sections: sections, fileName: fileName, inlines: inlines, zip: zip, crc32: crc32, docx: docx, latex: latex, download: download };
}
