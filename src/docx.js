/* Word (.docx) reader: finds numbered questions, answer choices, math, pictures and tables. */
var DOCX=(function(){
  "use strict";
  var NS={w:'http://schemas.openxmlformats.org/wordprocessingml/2006/main',m:'http://schemas.openxmlformats.org/officeDocument/2006/math',a:'http://schemas.openxmlformats.org/drawingml/2006/main',wp:'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing',r:'http://schemas.openxmlformats.org/officeDocument/2006/relationships',pic:'http://schemas.openxmlformats.org/drawingml/2006/picture',v:'urn:schemas-microsoft-com:vml',mc:'http://schemas.openxmlformats.org/markup-compatibility/2006'};
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

  /* ---------- zip ---------- */
  function inflateRaw(u8){
    if(typeof DecompressionStream==='undefined')return Promise.reject(new Error('This browser can\u2019t open Word files. Please use a current version of Chrome, Edge, Firefox or Safari.'));
    var ds=new DecompressionStream('deflate-raw');
    return new Response(new Blob([u8]).stream().pipeThrough(ds)).arrayBuffer().then(function(b){return new Uint8Array(b);});
  }
  function unzip(buf){
    var u=new Uint8Array(buf),dv=new DataView(u.buffer,u.byteOffset,u.byteLength),eocd=-1;
    for(var i=u.length-22;i>=Math.max(0,u.length-70000);i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}}
    if(eocd<0)return Promise.reject(new Error('This doesn\u2019t look like a Word (.docx) file.'));
    var n=dv.getUint16(eocd+10,true),off=dv.getUint32(eocd+16,true),files={};
    for(var k=0;k<n;k++){
      if(dv.getUint32(off,true)!==0x02014b50)break;
      var method=dv.getUint16(off+10,true),csize=dv.getUint32(off+20,true),nl=dv.getUint16(off+28,true),el=dv.getUint16(off+30,true),cl=dv.getUint16(off+32,true),lho=dv.getUint32(off+42,true);
      var name=new TextDecoder().decode(u.subarray(off+46,off+46+nl));
      var lnl=dv.getUint16(lho+26,true),lel=dv.getUint16(lho+28,true),ds=lho+30+lnl+lel;
      files[name]={method:method,data:u.subarray(ds,ds+csize)};
      off+=46+nl+el+cl;
    }
    return Promise.resolve({
      has:function(n){return !!files[n];},
      bytes:function(n){var f=files[n];if(!f)return Promise.resolve(null);return f.method===0?Promise.resolve(f.data):inflateRaw(f.data);},
      text:function(n){return this.bytes(n).then(function(b){return b?new TextDecoder().decode(b):null;});}
    });
  }
  function xml(s){return s?new DOMParser().parseFromString(s,'application/xml'):null;}
  function kids(el,ns,name){var out=[];if(!el)return out;for(var c=el.firstElementChild;c;c=c.nextElementSibling){if(c.namespaceURI===NS[ns]&&(!name||c.localName===name))out.push(c);}return out;}
  function kid(el,ns,name){return kids(el,ns,name)[0]||null;}
  function attr(el,name,ns){if(!el)return null;var v=el.getAttributeNS(NS[ns||'w'],name);return v===''?el.getAttribute((ns||'w')+':'+name):v;}

  /* ---------- numbering ---------- */
  function toRoman(n){var r='',m=[[1000,'m'],[900,'cm'],[500,'d'],[400,'cd'],[100,'c'],[90,'xc'],[50,'l'],[40,'xl'],[10,'x'],[9,'ix'],[5,'v'],[4,'iv'],[1,'i']];m.forEach(function(p){while(n>=p[0]){r+=p[1];n-=p[0];}});return r;}
  function fmtNum(n,fmt){
    if(fmt==='lowerLetter')return String.fromCharCode(96+((n-1)%26)+1);
    if(fmt==='upperLetter')return String.fromCharCode(64+((n-1)%26)+1);
    if(fmt==='lowerRoman')return toRoman(n);if(fmt==='upperRoman')return toRoman(n).toUpperCase();
    if(fmt==='bullet')return '\u2022';if(fmt==='none')return '';
    return String(n);
  }
  function Numbering(doc){
    var abs={},nums={};
    if(doc){
      Array.prototype.forEach.call(doc.getElementsByTagNameNS(NS.w,'abstractNum'),function(a){
        var id=attr(a,'abstractNumId'),lv={};
        kids(a,'w','lvl').forEach(function(l){var il=+attr(l,'ilvl');var f=kid(l,'w','numFmt'),t=kid(l,'w','lvlText'),s=kid(l,'w','start');lv[il]={fmt:f?attr(f,'val'):'decimal',text:t?attr(t,'val'):'%1.',start:s?+attr(s,'val'):1};});
        var link=kid(a,'w','numStyleLink');abs[id]={lv:lv,link:link?attr(link,'val'):null};
      });
      Array.prototype.forEach.call(doc.getElementsByTagNameNS(NS.w,'num'),function(n){
        var id=attr(n,'numId'),an=kid(n,'w','abstractNumId'),ov={};
        kids(n,'w','lvlOverride').forEach(function(o){var so=kid(o,'w','startOverride');if(so)ov[+attr(o,'ilvl')]=+attr(so,'val');});
        nums[id]={abs:an?attr(an,'val'):null,ov:ov};
      });
    }
    var counters={};
    this.level=function(numId,il){var n=nums[numId];if(!n)return null;var a=abs[n.abs];if(!a)return null;var l=a.lv[il]||a.lv[0];return l?Object.assign({},l,{start:n.ov[il]!=null?n.ov[il]:l.start}):null;};
    this.next=function(numId,il){
      var l=this.level(numId,il);if(!l)return null;
      var c=counters[numId]||(counters[numId]={});
      c[il]=(c[il]!=null?c[il]+1:l.start);
      for(var k=il+1;k<10;k++)delete c[k];
      var self=this;
      var label=l.text.replace(/%(\d)/g,function(_,d){var lv=+d-1,ll=self.level(numId,lv)||l;return fmtNum(c[lv]!=null?c[lv]:ll.start,ll.fmt);});
      return {fmt:l.fmt,label:label,n:c[il]};
    };
  }

  /* ---------- math (OMML) ---------- */
  var OPS=/^[=\u2245\u2225\u22a5\u223c<>\u2264\u2265\u2260\u2248+\u2212\u00b1\u00d7\u00f7\u2192]$/;
  function mathText(s,state){
    var h='';
    for(var i=0;i<s.length;i++){
      var c=s[i]==='-'?'\u2212':s[i];
      if(c===' '){h+=' ';continue;}
      if(/^[=\u2245\u2225\u22a5\u223c<>\u2264\u2265\u2260\u2248\u2192]$/.test(c)||(/^[+\u2212\u00b1\u00d7\u00f7]$/.test(c)&&state.prev&&!/[(\[=,:\u2245\u223c<>\u2264\u2265\u2260 ]$/.test(state.prev)))h+='<span class="m-op">'+esc(c)+'</span>';
      else h+=esc(c);
      state.prev=c;
    }
    return h;
  }
  function omml(el,state){
    state=state||{prev:''};
    var h='';
    kids(el,'m').forEach(function(c){
      var t=c.localName;
      if(t==='r'){var tt=kid(c,'m','t');if(tt)h+=mathText(tt.textContent,state);return;}
      state.prev='x';
      var sub=function(name){var e=kid(c,'m',name);return e?omml(e,{prev:''}):'';};
      if(t==='f'){var pr=kid(c,'m','fPr'),ty=pr&&kid(pr,'m','type');var tv=ty?attr(ty,'val','m'):'';
        if(tv==='lin'||tv==='skw')h+=sub('num')+'/'+sub('den');else h+='<span class="m-frac"><span class="m-num">'+sub('num')+'</span><span class="m-den">'+sub('den')+'</span></span>';}
      else if(t==='rad'){var deg=sub('deg');h+=(deg?'<sup>'+deg+'</sup>':'')+'<span class="m-sqrt"><span class="m-rad-sign">\u221a</span><span class="m-rad">'+sub('e')+'</span></span>';}
      else if(t==='sSup')h+=sub('e')+'<sup>'+sub('sup')+'</sup>';
      else if(t==='sSub')h+=sub('e')+'<sub>'+sub('sub')+'</sub>';
      else if(t==='sSubSup')h+=sub('e')+'<sub>'+sub('sub')+'</sub><sup>'+sub('sup')+'</sup>';
      else if(t==='sPre')h+='<sub>'+sub('sub')+'</sub><sup>'+sub('sup')+'</sup>'+sub('e');
      else if(t==='acc'){var ap=kid(c,'m','accPr'),ch=ap&&kid(ap,'m','chr'),cv=ch?attr(ch,'val','m'):'\u0302',e=sub('e');
        if(/[\u0305\u00af\u203e\u0304]/.test(cv))h+='<span class="m-ov">'+e+'</span>';
        else if(/[\u20e1\u2194\u27f7]/.test(cv))h+='<span class="m-acc m-line">'+e+'</span>';
        else if(/[\u20d7\u2192\u27f6]/.test(cv))h+='<span class="m-acc m-ray">'+e+'</span>';
        else if(/[\u2312\u2322\u23dc\u0311]/.test(cv))h+='<span class="m-acc m-arc">'+e+'</span>';
        else h+=e+esc(cv);}
      else if(t==='bar'){var bp=kid(c,'m','barPr'),pos=bp&&kid(bp,'m','pos');var e2=sub('e');if(pos&&attr(pos,'val','m')==='bot')h+='<u>'+e2+'</u>';else h+='<span class="m-ov">'+e2+'</span>';}
      else if(t==='groupChr'){var gp=kid(c,'m','groupChrPr'),gc=gp&&kid(gp,'m','chr'),gv=gc?attr(gc,'val','m'):'';var e3=sub('e');
        if(/[\u2194\u27f7]/.test(gv))h+='<span class="m-acc m-line">'+e3+'</span>';else if(/[\u2192\u27f6]/.test(gv))h+='<span class="m-acc m-ray">'+e3+'</span>';else if(/[\u2322\u23dc\u2312]/.test(gv))h+='<span class="m-acc m-arc">'+e3+'</span>';else h+=e3;}
      else if(t==='d'){var dp=kid(c,'m','dPr'),beg='(',end=')',sep=',';
        if(dp){var b=kid(dp,'m','begChr'),en=kid(dp,'m','endChr'),sp=kid(dp,'m','sepChr');if(b)beg=attr(b,'val','m')||'';if(en)end=attr(en,'val','m')||'';if(sp)sep=attr(sp,'val','m');}
        h+=esc(beg)+kids(c,'m','e').map(function(x){return omml(x,{prev:''});}).join(esc(sep))+esc(end);}
      else if(t==='nary'){var np=kid(c,'m','naryPr'),nc=np&&kid(np,'m','chr'),sym=nc?attr(nc,'val','m'):'\u222b';h+=esc(sym)+'<sub>'+sub('sub')+'</sub><sup>'+sub('sup')+'</sup>'+sub('e');}
      else if(t==='func')h+=sub('fName')+' '+sub('e');
      else if(t==='limLow'||t==='limUpp')h+=sub('e')+'<sub>'+sub('lim')+'</sub>';
      else if(t==='eqArr')h+=kids(c,'m','e').map(function(x){return omml(x,{prev:''});}).join('<br>');
      else if(t==='m')h+='<span class="m-mat">'+kids(c,'m','mr').map(function(r){return kids(r,'m','e').map(function(x){return omml(x,{prev:''});}).join('&ensp;');}).join('<br>')+'</span>';
      else if(t==='box'||t==='borderBox'||t==='phant')h+=sub('e');
      else if(/Pr$/.test(t)){}
      else h+=omml(c,{prev:''});
    });
    return h;
  }

  /* ---------- body walk ---------- */
  function Ctx(zip,rels,numbering,media){this.zip=zip;this.rels=rels;this.num=numbering;this.media=media;}
  function runHtml(r,ctx){
    var rp=kid(r,'w','rPr'),b=rp&&kid(rp,'w','b'),i=rp&&kid(rp,'w','i'),u=rp&&kid(rp,'w','u'),va=rp&&kid(rp,'w','vertAlign');
    var on=function(e){if(!e)return false;var v=attr(e,'val');return v===null||v===''||(v!=='0'&&v!=='false'&&v!=='none');};
    var h='';
    for(var c=r.firstElementChild;c;c=c.nextElementSibling){
      var t=c.localName;
      if(c.namespaceURI===NS.w){
        if(t==='t')h+=esc(c.textContent);
        else if(t==='tab')h+='&emsp;';
        else if(t==='br'||t==='cr')h+='<br>';
        else if(t==='noBreakHyphen')h+='-';
        else if(t==='sym'){var ch=attr(c,'char');if(ch){var code=parseInt(ch,16);if(code>=0xf000)code-=0xf000;var SYM={0x40:'\u2245',0xd0:'\u2220',0xb0:'\u00b0',0x5e:'\u22a5',0x7e:'\u223c',0xb9:'\u2260',0xa3:'\u2264',0xb3:'\u2265',0x70:'\u03c0',0x44:'\u0394',0xae:'\u2192',0xd6:'\u221a'};h+=esc(SYM[code]||String.fromCharCode(code));}}
        else if(t==='drawing')h+=drawingHtml(c,ctx);
        else if(t==='pict')h+=pictHtml(c,ctx);
        else if(t==='object')h+=pictHtml(c,ctx);
      }else if(c.namespaceURI===NS.mc&&t==='AlternateContent'){
        var ch2=kid(c,'mc','Choice');if(ch2){var fake=document.createElementNS(NS.w,'w:r');for(var k=ch2.firstElementChild;k;k=k.nextElementSibling)fake.appendChild(k.cloneNode(true));h+=runHtml(fake,ctx);}
      }
    }
    if(!h)return '';
    if(va){var vv=attr(va,'val');if(vv==='superscript')h='<sup>'+h+'</sup>';else if(vv==='subscript')h='<sub>'+h+'</sub>';}
    if(on(u))h='<u>'+h+'</u>';if(on(i))h='<i>'+h+'</i>';if(on(b))h='<b>'+h+'</b>';
    return h;
  }
  function isTextBox(d){return d.getElementsByTagNameNS(NS.w,'txbxContent').length>0;}
  function drawingHtml(d,ctx){
    if(isTextBox(d))return '';
    var blip=d.getElementsByTagNameNS(NS.a,'blip')[0];if(!blip)return '';
    var id=blip.getAttributeNS(NS.r,'embed')||blip.getAttribute('r:embed');
    var ext=d.getElementsByTagNameNS(NS.wp,'extent')[0],w=ext?(+ext.getAttribute('cx'))/914400:2;
    var src=d.getElementsByTagNameNS(NS.a,'srcRect')[0],crop=null;
    if(src){var g=function(n){return (+src.getAttribute(n)||0)/100000;};crop={l:g('l'),t:g('t'),r:g('r'),b:g('b')};if(!crop.l&&!crop.t&&!crop.r&&!crop.b)crop=null;}
    var anchored=!!d.getElementsByTagNameNS(NS.wp,'anchor').length;
    return imgToken(id,w,crop,anchored,ctx);
  }
  function pictHtml(p,ctx){
    if(p.getElementsByTagNameNS(NS.v,'textbox').length)return '';
    var im=p.getElementsByTagNameNS(NS.v,'imagedata')[0];if(!im)return '';
    var id=im.getAttributeNS(NS.r,'id')||im.getAttribute('r:id');
    var sh=p.getElementsByTagNameNS(NS.v,'shape')[0],st=sh?sh.getAttribute('style')||'':'',m=st.match(/width:\s*([\d.]+)(pt|in)/),w=m?(m[2]==='pt'?+m[1]/72:+m[1]):1.5;
    return imgToken(id,w,null,false,ctx);
  }
  function imgToken(id,w,crop,anch,ctx){
    var k=ctx.media.length;ctx.media.push({id:id,w:w,crop:crop,anch:anch});
    return '\u0000IMG'+k+'\u0000';
  }
  function paraInfo(p,ctx){
    var pPr=kid(p,'w','pPr'),np=pPr&&kid(pPr,'w','numPr'),label=null,fmt=null,numId=null,ilvl=0;
    if(np){var ni=kid(np,'w','numId'),il=kid(np,'w','ilvl');numId=ni?attr(ni,'val'):null;ilvl=il?+attr(il,'val'):0;}
    if(!numId&&pPr){var ps=kid(pPr,'w','pStyle');if(ps&&ctx.styleNum[attr(ps,'val')]){numId=ctx.styleNum[attr(ps,'val')].numId;ilvl=ctx.styleNum[attr(ps,'val')].ilvl;}}
    if(numId&&numId!=='0'){var r=ctx.num.next(numId,ilvl);if(r){label=r.label;fmt=r.fmt;}}
    var jc=pPr&&kid(pPr,'w','jc'),align=jc?attr(jc,'val'):'';
    var h='',boxText='';
    (function walk(el){
      for(var c=el.firstElementChild;c;c=c.nextElementSibling){
        if(c.namespaceURI===NS.w&&c.localName==='r')h+=runHtml(c,ctx);
        else if(c.namespaceURI===NS.m&&(c.localName==='oMath'))h+='<span class="m">'+omml(c)+'</span>';
        else if(c.namespaceURI===NS.m&&c.localName==='oMathPara'){kids(c,'m','oMath').forEach(function(om){h+='<span class="m">'+omml(om)+'</span>';});}
        else if(c.namespaceURI===NS.w&&(c.localName==='hyperlink'||c.localName==='smartTag'||c.localName==='ins'||c.localName==='sdt'||c.localName==='sdtContent'||c.localName==='fldSimple'))walk(c);
        else if(c.namespaceURI===NS.mc&&c.localName==='AlternateContent'){var ch=kid(c,'mc','Choice');if(ch)walk(ch);}
      }
    })(p);
    // text inside text boxes (for detecting "Use this space\u2026" and score boxes)
    Array.prototype.forEach.call(p.getElementsByTagNameNS(NS.w,'txbxContent'),function(tb){boxText+=' '+tb.textContent;});
    var text=h.replace(/\u0000IMG\d+\u0000/g,' ').replace(/<[^>]+>/g,'').replace(/&emsp;/g,' ').replace(/&[a-z]+;/g,'x').replace(/\s+/g,' ').trim();
    return {kind:'p',html:h.replace(/(&emsp;)+$/,''),text:text,label:label,fmt:fmt,numId:numId,ilvl:ilvl,align:align,hasImg:/\u0000IMG/.test(h),boxText:boxText.trim()};
  }
  function cellBorders(tc){
    var pr=kid(tc,'w','tcPr'),b=pr&&kid(pr,'w','tcBorders'),s='';
    if(!b)return '';
    ['top','left','bottom','right'].forEach(function(side){var e=kid(b,'w',side)||(side==='left'?kid(b,'w','start'):side==='right'?kid(b,'w','end'):null);if(e){var v=attr(e,'val');if(v&&v!=='nil'&&v!=='none'){var sz=Math.max(1,Math.round((+attr(e,'sz')||4)/8));s+='border-'+side+':'+sz+'px solid #000;';}}});
    return s;
  }
  // Flatten into a stream of items: paragraphs (with depth, row and cell position) and nested tables kept whole
  function walkBody(el,ctx,depth,out,pos){
    for(var c=el.firstElementChild;c;c=c.nextElementSibling){
      if(c.namespaceURI!==NS.w)continue;
      if(c.localName==='p'){var pi=paraInfo(c,ctx);pi.depth=depth;pi.pos=pos;out.push(pi);}
      else if(c.localName==='tbl'){
        if(depth>=1){out.push({kind:'tbl',el:c,depth:depth,pos:pos});continue;}
        kids(c,'w','tr').forEach(function(tr,ri){
          var tableId=ctx.tblSeq++;
          kids(tr,'w','tc').forEach(function(tc,ci){walkBody(tc,ctx,depth+1,out,{table:tableId,row:ctx.rowSeq,cell:ci});});
          ctx.rowSeq++;
        });
      }
      else if(c.localName==='sdt'){var sc=kid(c,'w','sdtContent');if(sc)walkBody(sc,ctx,depth,out,pos);}
    }
  }
  function tableHtml(tbl,ctx){
    var h='<table class="q-tbl">';
    kids(tbl,'w','tr').forEach(function(tr){
      h+='<tr>';
      kids(tr,'w','tc').forEach(function(tc){
        var pr=kid(tc,'w','tcPr'),gs=pr&&kid(pr,'w','gridSpan'),span=gs?+attr(gs,'val'):1;
        var parts=[];
        (function cell(el){for(var c=el.firstElementChild;c;c=c.nextElementSibling){
          if(c.namespaceURI!==NS.w)continue;
          if(c.localName==='p'){var pi=paraInfo(c,ctx);parts.push((pi.label?'<b class="q-lbl">'+esc(pi.label)+'</b> ':'')+pi.html);}
          else if(c.localName==='tbl')parts.push(tableHtml(c,ctx));
        }})(tc);
        while(parts.length&&!parts[parts.length-1].replace(/<[^>]+>|&emsp;|\s/g,''))parts.pop();
        h+='<td'+(span>1?' colspan="'+span+'"':'')+' style="'+cellBorders(tc)+'">'+parts.join('<br>')+'</td>';
      });
      h+='</tr>';
    });
    return h+'</table>';
  }

  /* ---------- question finding ---------- */
  var JUNK=/^(use this space for (computations|work)\.?|score:?.*)$/i;
  function analyze(items,ctx){
    // which numbered lists are the questions? decimal lists at body level or first table cell
    var cand={};
    items.forEach(function(it){
      if(it.kind!=='p'||!it.label||it.fmt!=='decimal')return;
      if(it.depth===0||(it.depth===1&&it.pos&&it.pos.cell===0)){cand[it.numId]=(cand[it.numId]||0)+1;}
    });
    var qLists={};Object.keys(cand).forEach(function(k){var l=ctx.num.level(k,0);if(l&&/^%1[.)]?$/.test(l.text||''))qLists[k]=1;});
    var typed=!Object.keys(qLists).length;
    var qs=[],cur=null,part=null,partPts=null,partName=null,header=null,partDir='';
    function isStart(it){
      if(it.kind!=='p')return false;
      if(!typed)return it.label&&qLists[it.numId]&&it.ilvl===0&&it.depth<=1;
      return it.depth<=1&&/^\d{1,2}[.)]\s+\S/.test(it.text);
    }
    items.forEach(function(it,idx){
      if(it.kind==='p'&&it.depth===0){
        var pm=it.text.match(/^part\s+([ivx]+|\d+)\b\.?$/i);
        if(pm||/^bonus\b/i.test(it.text)){partName=it.text.replace(/\.$/,'');partPts=null;if(cur){qs.push(cur);cur=null;}partDir='';return;}
        var cm=it.text.match(/receive\s+(\d+)(\s*(or|to|-)\s*(\d+))?\s+credits?/i);
        if(cm&&!isStart(it)){partPts=+cm[1];partDir=it.text;if(cur){qs.push(cur);cur=null;}return;}
      }
      if(isStart(it)){
        if(cur)qs.push(cur);
        cur={num:typed?+it.text.match(/^\d+/)[0]:+String(it.label).replace(/\D/g,'')||qs.length+1,part:partName,partPts:partPts,items:[],depth:it.depth,row:it.pos?it.pos.row:null};
        var first=Object.assign({},it);
        if(typed)first.html=first.html.replace(/^\s*(<[^>]+>)*\s*\d{1,2}[.)]\s*/,'$1');
        first.label=null;
        if(first.text.replace(/^\d{1,2}[.)]\s*/,'')||first.hasImg)cur.items.push(first);
        return;
      }
      if(!cur)return;
      if(cur.depth===1){
        if(it.depth===0||(it.pos&&it.pos.row!==cur.row)){qs.push(cur);cur=null;return;}
      }else{
        if(it.depth>0&&it.kind==='p'&&it.pos&&it.pos.cell===0&&it.label){qs.push(cur);cur=null;return;}
      }
      cur.items.push(it);
    });
    if(cur)qs.push(cur);
    return qs.map(function(q){return buildQuestion(q,ctx);});
  }
  function buildQuestion(q,ctx){
    var stem=[],choices=[],points=null,curChoice=null,emptyRun=0,trailingEmpty=0,lastWasChoice=false,blanks=false;
    q.items.forEach(function(it){
      if(it.kind==='tbl'){
        // a nested table: choices inside it, or a table that belongs to the question (like a proof)
        var hasLetters=false;
        // check without advancing counters: look for letter-numbered paragraphs
        Array.prototype.forEach.call(it.el.getElementsByTagNameNS(NS.w,'numPr'),function(np){var ni=kid(np,'w','numId'),il=kid(np,'w','ilvl');var l=ctx.num.level(ni?attr(ni,'val'):'',il?+attr(il,'val'):0);if(l&&/Letter/.test(l.fmt))hasLetters=true;});
        if(hasLetters&&!choices.length){
          // each cell holds a choice
          kids(it.el,'w','tr').forEach(function(tr){kids(tr,'w','tc').forEach(function(tc){
            var html='',got=false;
            (function cell(el){for(var c=el.firstElementChild;c;c=c.nextElementSibling){if(c.namespaceURI===NS.w&&c.localName==='p'){var pi=paraInfo(c,ctx);if(pi.label&&/Letter/.test(pi.fmt||''))got=true;if(pi.html.replace(/&emsp;|\s/g,''))html+=(html?'<br>':'')+pi.html;}}})(tc);
            if(got||html)choices.push(html.replace(/^(<br>)+|(<br>)+$/g,''));
          });});
          lastWasChoice=true;trailingEmpty=0;
        }else{
          stem.push(tableHtml(it.el,ctx));trailingEmpty=0;
        }
        return;
      }
      var t=it.text;
      if(JUNK.test(t)&&!it.hasImg){return;}
      if(/^\[\s*\d+(\.\d+)?\s*\]$/.test(t)){points=+t.replace(/[^\d.]/g,'');if(!it.hasImg)return;it=Object.assign({},it,{html:it.html.replace(/\[\s*\d+(\.\d+)?\s*\]/,''),text:''});}
      var ptsInline=t.match(/\[(\d+)\]\s*$/);
      if(it.label&&/Letter/.test(it.fmt||'')){curChoice={html:it.html};choices.push(curChoice);lastWasChoice=true;trailingEmpty=0;return;}
      var typedCh=!it.label&&t.match(/^\(?([a-hA-H]|[1-8])[.)]\s+\S/);
      if(typedCh&&(stem.length||choices.length)&&(/[a-hA-H]/.test(typedCh[1])?typedCh[1].toLowerCase().charCodeAt(0)-97:+typedCh[1]-1)===choices.length&&(/\(/.test(t[0])||/[a-hA-H]/.test(typedCh[1]))){
        curChoice={html:it.html.replace(/^((<[^>]+>)*)\s*\(?([a-hA-H]|[1-8])[.)]\s*/,'$1')};choices.push(curChoice);lastWasChoice=true;trailingEmpty=0;return;}
      if(!t&&!it.hasImg){trailingEmpty++;if(curChoice)curChoice=null;return;}
      if(curChoice&&it.hasImg&&!t){curChoice.html+='<br>'+it.html;return;}
      curChoice=null;
      if(ptsInline&&points===null){points=+ptsInline[1];it=Object.assign({},it,{html:it.html.replace(/\[\d+\]\s*(<\/[a-z]+>)*\s*$/,'$1')});}
      if(/_{4,}/.test(t))blanks=true;
      stem.push((it.label?'<b class="q-lbl">'+esc(it.label)+'</b> ':'')+it.html);
      trailingEmpty=lastWasChoice?trailingEmpty:0;
      if(!lastWasChoice)trailingEmpty=0;
    });
    choices=choices.map(function(c){return typeof c==='string'?c:c.html;}).map(function(c){return c.replace(/^(\s|&emsp;)+|(\s|&emsp;|<br>)+$/g,'');});
    var html=stem.filter(function(s){return s.replace(/&emsp;|\s/g,'');}).join('<br>').replace(/(&emsp;){2,}/g,'&emsp;');
    var type=choices.length>=2?'mc':(blanks?'sa':'es');
    var hasGraph=/\u0000IMG/.test(html);
    return {num:q.num,part:q.part,points:points!=null?points:(q.partPts!=null?q.partPts:null),html:html,choices:choices.length>=2?choices:null,type:type,blanks:blanks,
      space:type==='es'?(hasGraph?0.25:Math.max(1,Math.min(4,trailingEmpty*0.22))):undefined};
  }

  /* ---------- pictures ---------- */
  function mediaUrls(ctx){
    var cache={};
    return Promise.all(ctx.media.map(function(m,k){
      var target=ctx.rels[m.id];if(!target)return Promise.resolve(null);
      var path=target.replace(/^\//,'');if(!/^word\//.test(path))path='word/'+path.replace(/^\.\//,'');
      var ext=(path.split('.').pop()||'').toLowerCase(),type={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',bmp:'image/bmp',webp:'image/webp',svg:'image/svg+xml'}[ext];
      if(!type)return Promise.resolve({missing:ext});
      var p=cache[path]||(cache[path]=ctx.zip.bytes(path).then(function(b){return b?new Blob([b],{type:type}):null;}));
      return p.then(function(blob){
        if(!blob)return null;
        return new Promise(function(res){
          var url=URL.createObjectURL(blob),img=new Image();
          img.onload=function(){
            var cr=m.crop||{l:0,t:0,r:0,b:0},sx=img.naturalWidth*cr.l,sy=img.naturalHeight*cr.t,sw=img.naturalWidth*(1-cr.l-cr.r),sh=img.naturalHeight*(1-cr.t-cr.b);
            var scale=Math.min(1,1800/Math.max(1,sw)),cv=document.createElement('canvas');cv.width=Math.max(1,Math.round(sw*scale));cv.height=Math.max(1,Math.round(sh*scale));
            var cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);cx.drawImage(img,sx,sy,sw,sh,0,0,cv.width,cv.height);
            URL.revokeObjectURL(url);res({url:cv.toDataURL(type==='image/jpeg'?'image/jpeg':'image/png',.9)});
          };
          img.onerror=function(){URL.revokeObjectURL(url);res(null);};img.src=url;
        });
      });
    }));
  }
  function fillMedia(html,ctx,urls){
    return html.replace(/\u0000IMG(\d+)\u0000/g,function(_,k){
      var m=ctx.media[+k],u=urls[+k];
      if(!u)return '';
      if(u.missing)return '<span class="q-missing">[picture: .'+esc(u.missing)+' can\u2019t be shown]</span>';
      return '<img class="q-img'+(m.anch?' q-float':'')+'" src="'+u.url+'" style="width:'+m.w.toFixed(3)+'in">';
    });
  }

  /* ---------- header text ---------- */
  function headerInfo(zip,docRels,sect){
    var ids={};if(sect)kids(sect,'w','headerReference').forEach(function(h){ids[attr(h,'type')]=h.getAttributeNS(NS.r,'id')||h.getAttribute('r:id');});
    var get=function(id){var t=docRels[id];if(!t)return Promise.resolve(null);return zip.text('word/'+t.replace(/^\.\//,'')).then(function(s){if(!s)return null;var d=xml(s);return Array.prototype.map.call(d.getElementsByTagNameNS(NS.w,'p'),function(p){var parts=[],cur='';Array.prototype.forEach.call(p.getElementsByTagNameNS(NS.w,'*'),function(e){if(e.localName==='t')cur+=e.textContent;else if(e.localName==='tab'){parts.push(cur);cur='';}});parts.push(cur);return parts.map(function(x){return x.trim();}).filter(Boolean);}).filter(function(a){return a.length;});});};
    return Promise.all([get(ids['default']),get(ids.first)]).then(function(r){
      var def=r[0]||[],first=r[1]||[],info={running:def.length?def[0].join(' '):''};
      first.forEach(function(line){
        var j=line.join(' ');
        if(/^name\b/i.test(j))info.nameLine=true;
        else if(j===info.running)return;
        else if(!info.title){info.title=line[0];if(line.length>1)info.topic=line[line.length-1];}
      });
      return info;
    });
  }

  /* ---------- main ---------- */
  function parse(buf,name){
    return unzip(buf).then(function(zip){
      if(!zip.has('word/document.xml'))throw new Error('\u201c'+name+'\u201d doesn\u2019t look like a Word (.docx) file.');
      return Promise.all([zip.text('word/document.xml'),zip.text('word/_rels/document.xml.rels'),zip.text('word/numbering.xml'),zip.text('word/styles.xml')]).then(function(r){
        var doc=xml(r[0]),rels={};
        if(r[1]){var rd=xml(r[1]);Array.prototype.forEach.call(rd.getElementsByTagName('Relationship'),function(e){rels[e.getAttribute('Id')]=e.getAttribute('Target');});}
        var num=new Numbering(xml(r[2]));
        var styleNum={};
        if(r[3]){var sd=xml(r[3]);Array.prototype.forEach.call(sd.getElementsByTagNameNS(NS.w,'style'),function(st){var pp=kid(st,'w','pPr'),np=pp&&kid(pp,'w','numPr');if(np){var ni=kid(np,'w','numId'),il=kid(np,'w','ilvl');if(ni)styleNum[attr(st,'styleId')]={numId:attr(ni,'val'),ilvl:il?+attr(il,'val'):0};}});}
        var ctx=new Ctx(zip,rels,num,[]);ctx.styleNum=styleNum;ctx.tblSeq=0;ctx.rowSeq=0;
        var body=doc.getElementsByTagNameNS(NS.w,'body')[0],items=[];
        walkBody(body,ctx,0,items,null);
        var qs=analyze(items,ctx);
        var sect=body.getElementsByTagNameNS(NS.w,'sectPr');sect=sect[sect.length-1];
        return Promise.all([mediaUrls(ctx),headerInfo(zip,rels,sect)]).then(function(res){
          var urls=res[0];
          qs.forEach(function(q){q.html=fillMedia(q.html,ctx,urls);if(q.choices)q.choices=q.choices.map(function(c){return fillMedia(c,ctx,urls);});});
          return {questions:qs,header:res[1]};
        });
      });
    });
  }
  return {parse:parse};
})();
if(typeof module!=='undefined')module.exports=DOCX;
