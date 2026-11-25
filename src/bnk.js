/* ExamView .bnk reader. Produces plain question objects with HTML content. */
var BNK=(function(){
  "use strict";
  var SYM={0x40:'≅',0xd0:'∠',0xb0:'°',0x5e:'⊥',0x7e:'∼',0xb4:'×',0xb8:'÷',0xb9:'≠',0xbb:'≈',0xa3:'≤',0xb3:'≥',0xb1:'±',0x70:'π',0x71:'θ',0x44:'Δ',0x61:'α',0x62:'β',0x67:'γ',0x6c:'λ',0x6d:'μ',0x73:'σ',0x77:'ω',0x57:'Ω',0x66:'φ',0xae:'→',0xac:'←',0xab:'↔',0xd6:'√',0x2d:'−',0x2b:'+',0x3d:'=',0x7c:'|',0xbd:'|',0xa5:'∞',0x5c:'∴',0xce:'∈',0xb7:'·',0xa2:'′',0xb2:'″',0xba:'∥',0xbe:'—',0xc6:'∅',0xc7:'∩',0xc8:'∪',0xd7:'·',0xf0:'',0x28:'(',0x29:')',0x2c:',',0x2e:'.',0x3a:':',0x3c:'<',0x3e:'>'};
  var CP1252={0x80:'€',0x82:'‚',0x83:'ƒ',0x84:'„',0x85:'…',0x86:'†',0x87:'‡',0x88:'ˆ',0x89:'‰',0x8a:'Š',0x8b:'‹',0x8c:'Œ',0x8e:'Ž',0x91:'‘',0x92:'’',0x93:'“',0x94:'”',0x95:'•',0x96:'–',0x97:'—',0x98:'˜',0x99:'™',0x9a:'š',0x9b:'›',0x9c:'œ',0x9e:'ž',0x9f:'Ÿ'};
  function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
  function latin(b){return CP1252[b]||String.fromCharCode(b);}

  function inflate(u8){
    if(typeof DecompressionStream==='undefined')return Promise.reject(new Error('This browser can’t unpack ExamView files. Please use a current version of Chrome, Edge, Firefox or Safari.'));
    var ds=new DecompressionStream('deflate');
    var stream=new Blob([u8]).stream().pipeThrough(ds);
    return new Response(stream).arrayBuffer().then(function(ab){return new Uint8Array(ab);});
  }

  function Reader(u8){this.u=u8;this.dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);}
  Reader.prototype.i32=function(o){return this.dv.getInt32(o,true);};
  Reader.prototype.u16str=function(o){var s='',u=this.u;while(o+1<u.length){var c=u[o]|(u[o+1]<<8);o+=2;if(!c)break;s+=String.fromCharCode(c);}return {s:s,o:o};};

  function find(u,pat,from,to){
    to=Math.min(to==null?u.length:to,u.length)-pat.length;
    var p0=pat[0];
    outer:for(var i=from;i<=to;i++){if(u[i]!==p0)continue;for(var j=1;j<pat.length;j++)if(u[i+j]!==pat[j])continue outer;return i;}
    return -1;
  }
  function int3(a,b,c){var x=new Uint8Array(12),dv=new DataView(x.buffer);dv.setInt32(0,a,true);dv.setInt32(4,b,true);dv.setInt32(8,c,true);return x;}

  /* ---- equations ---- */
  function parseEq(u,start,end){
    var dv=new DataView(u.buffer,u.byteOffset,u.byteLength),i=start+44,font=null,warn=[];
    function i32(){var v=dv.getInt32(i,true);i+=4;return v;}
    function seq(depth){
      var out=[];
      while(i<end){
        var t=u[i];
        if(t===0){i++;return out;}
        if(t===9){i++;i32();font=i32();i32();continue;}
        if(t===1){
          i++;i32();var n=i32(),sel=i32();i32();var saved=font,slots=[];
          if(n<0||n>8||depth>20){warn.push('template');return out;}
          for(var k=0;k<n;k++){i32();slots.push(seq(depth+1));}
          font=saved;
          out.push({t:'T',n:n,lo:sel&0xffff,hi:(sel>>>16)&0xffff,slots:slots});continue;
        }
        if(t===0x0b){i++;out.push({t:'E',v:i32()});continue;}
        if(t===6){i++;out.push({t:'c',c:' '});continue;}
        if(t===13){i++;out.push({t:'br'});continue;} // next line (systems of equations, stacked lines)
        if(t===3&&(u[i+1]===0x17||u[i+1]===0x18)){ // a mark on the character before: 0x17 bar (x̄), 0x18 hat (p̂)
          var last=out[out.length-1];
          if(last&&last.t==='c'){if(u[i+1]===0x17)out[out.length-1]={t:'T',n:1,lo:5,hi:0,slots:[[last]]};else last.c+='\u0302';}
          i+=2;continue;}
        if(t<0x20){i++;warn.push('tag'+t);continue;}
        i++;
        if(font===-6){var c=SYM[t];if(c===undefined){c='?';warn.push('sym'+t.toString(16));}out.push({t:'c',c:c,sym:1});}
        else out.push({t:'c',c:t===0x80?'∥':t===0xaa?'ℓ':t===0x9e?'∘':t===0x9c?'±':latin(t)}); // in an equation 0x80 is ExamView's parallel sign (not €), 0xaa the script ℓ (not ª), 0x9e the composition ∘ (not ž), 0x9c ± (not œ: 750 ± 2(20))
      }
      return out;
    }
    var tree=seq(0);
    return {tree:tree,warn:warn};
  }
  function eqHtml(tree){
    var h='';
    var prev='';
    tree.forEach(function(x){
      if(x.t==='br'){h+='<br>';prev='';return;}
      if(x.t==='c'){
        var c=x.c==='-'?'−':x.c;
        if(/^[=≅∼<>≤≥≠≈⊥∥]$/.test(c)||(/^[+−±×÷]$/.test(c)&&prev&&!/[(\[=,:≅∼<>≤≥≠\u2009 ]$/.test(prev))){h+='<span class="m-op">'+esc(c)+'</span>';}
        else h+=esc(c);
        prev=c;return;
      }
      prev='x';
      if(x.t==='E'){h+=x.v===0?'△':'';}
      else{
        var s=x.slots.map(eqHtml),k=x.lo+','+x.hi;
        if(k==='5,0')h+='<span class="m-ov">'+s[0]+'</span>';
        else if(k==='6,7')h+='<span class="m-acc m-line">'+s[0]+'</span>';
        else if(x.lo===6)h+='<span class="m-acc m-ray">'+s[0]+'</span>';
        else if(k==='0,30')h+='<span class="m-acc m-arc">'+s[0]+'</span>';
        else if(k==='1,5')h+='<span class="m-sqrt"><span class="m-rad-sign">√</span><span class="m-rad">'+s[0]+'</span></span>';
        else if(k==='2,0')h+='<sup>'+s[0]+'</sup>';
        else if(k==='3,0'||k==='2,1')h+='<sub>'+s[0].replace(/<span class="m-op">−<\/span>(?=axis)/g,'-')+'</sub>'; // 2,1: subscripts (log₂, aₙ, ₇C₅, r with x-axis, T₇,₅)
        else if(k==='0,0')h+='('+s[0]+')';
        else if(x.n===2&&k==='1,0')h+='<span class="m-frac"><span class="m-num">'+s[0]+'</span><span class="m-den">'+s[1]+'</span></span>';
        else h+=s.join(' ');
      }
    });
    return h;
  }

  /* ---- pictures ---- */
  function dibToPng(u,start,end){
    var dv=new DataView(u.buffer,u.byteOffset,u.byteLength),o=start;
    var hs=dv.getUint32(o,true),w=dv.getInt32(o+4,true),h=dv.getInt32(o+8,true),bpp=dv.getUint16(o+14,true),comp=dv.getUint32(o+16,true),used=dv.getUint32(o+32,true);
    if(comp!==0&&comp!==3)return null;
    var bottomUp=h>0;h=Math.abs(h);
    if(!(w>0&&h>0&&w<20000&&h<20000))return null;
    var pal=[];var nc=bpp<=8?(used||(1<<bpp)):0;var po=o+hs;
    for(var k=0;k<nc;k++){pal.push([u[po+k*4+2],u[po+k*4+1],u[po+k*4]]);}
    var px=po+nc*4+(comp===3?0:0);
    var stride=Math.floor((w*bpp+31)/32)*4;
    if(typeof document==='undefined')return {w:w,h:h,dataUrl:''};
    var cv=document.createElement('canvas');cv.width=w;cv.height=h;
    var ctx=cv.getContext('2d'),img=ctx.createImageData(w,h),D=img.data;
    for(var y=0;y<h;y++){
      var row=px+(bottomUp?(h-1-y):y)*stride;
      for(var x=0;x<w;x++){
        var r,g,b,q=(y*w+x)*4;
        if(bpp===24){var p=row+x*3;b=u[p];g=u[p+1];r=u[p+2];}
        else if(bpp===32){var p2=row+x*4;b=u[p2];g=u[p2+1];r=u[p2+2];}
        else if(bpp===8){var c=pal[u[row+x]]||[255,255,255];r=c[0];g=c[1];b=c[2];}
        else if(bpp===4){var v=u[row+(x>>1)];var ci=(x&1)?(v&15):(v>>4);var c4=pal[ci]||[255,255,255];r=c4[0];g=c4[1];b=c4[2];}
        else if(bpp===1){var v1=u[row+(x>>3)];var bit=(v1>>(7-(x&7)))&1;var c1=pal[bit]||[bit*255,bit*255,bit*255];r=c1[0];g=c1[1];b=c1[2];}
        else{r=g=b=255;}
        D[q]=r;D[q+1]=g;D[q+2]=b;D[q+3]=255;
      }
    }
    ctx.putImageData(img,0,0);
    return {w:w,h:h,dataUrl:cv.toDataURL('image/png')};
  }

  /* ---- text with objects ---- */
  /* A table is text too: \x10 starts it, \x11 ends each cell, \x11\x11 ends each row; the table ends at a row end that is
     followed by a line break, the answer choices or the end of the question. Returns the HTML and where the text goes on. */
  function tableEnd(s,i){var j=i;while((j=s.indexOf('\x11\x11',j))>=0){var n=s.charAt(j+2);if(j+2>=s.length||n==='\r'||n==='\n'||n==='\x10')return j;j+=2;}return -1;}
  function tableHtml(s,objHtml,oi){
    var rows=s.split('\x11\x11').map(function(r){return r.split('\x11');}),ncol=Math.max.apply(null,rows.map(function(r){return r.length;}));
    var title=rows.length>2&&rows[0].length===1&&ncol>1,head=title?1:0,side=rows.length-head<=2&&ncol>3; // a short wide table reads across: its first column is the header
    var h='<table class="q-tbl q-grid">'+rows.map(function(r,ri){
      return '<tr>'+r.map(function(cell,ci){var t=textHtml(cell,objHtml,oi);oi=t.next;
        var x=t.html.replace(/\b(mi|cm|in|ft|m|km|yd|mm)([23])\b/g,'$1<sup>$2</sup>'); // units like mi2, cm3: the 2 was a superscript in ExamView
        var bold=ri<head||(side?ci===0:ri===head);
        return '<td'+(r.length===1&&ncol>1?' colspan="'+ncol+'"':'')+'>'+(bold&&x?'<b>'+x+'</b>':x)+'</td>';}).join('')+'</tr>';}).join('')+'</table>';
    return {html:h,next:oi};
  }
  /* Text styles come after the text: n runs [position, style, 0], then m styles [size, flags, 0, weight 400|700, font, 0] (24 bytes each);
     n and m are at S+20 and S+24. Flags: 1 bold, 2 underline, 4 italic, 8 superscript, 16 subscript. Superscripts and subscripts
     (cm3, H0) are marked in the text with -, never across cells, choices or line breaks. */
  // a few questions have the 3 of cm3 as a plain digit in ExamView too
  function unitPowers(t){return t.replace(/(^|[^A-Za-z])(mi|cm|in|ft|km|yd|mm)([23])(?![A-Za-z0-9])/g,'$1$2\ue001$3\ue002');}
  function markScripts(text,d,R,S,from,to){
    var n=R.i32(S+20),m=R.i32(S+24),P=from,found=-1;
    if(!(n>0&&n<5000&&m>0&&m<500))return text;
    for(to=Math.min(to,d.length)-12*n-24*m;P<=to;P++){
      if(d[P]||d[P+1]||d[P+2]||d[P+3])continue;
      var ok=true,last=-1,j,a,st;
      for(j=0;ok&&j<n;j++){a=R.i32(P+12*j);st=R.i32(P+12*j+4);if(a<=last||a>text.length||st<0||st>=m||R.i32(P+12*j+8)!==0)ok=false;last=a;}
      for(j=0;ok&&j<m;j++){var sp=P+12*n+24*j,sz=Math.abs(R.i32(sp)),fl=R.i32(sp+4),wt=R.i32(sp+12);if((wt!==400&&wt!==700)||fl<0||fl>=1024||!sz||sz>=200)ok=false;}
      if(ok){found=P;break;}
    }
    if(found<0)return text;
    var out='',end=0;
    for(var k=0;k<n;k++){
      var b=R.i32(found+12*k),e=k+1<n?R.i32(found+12*k+12):text.length,f=R.i32(found+12*n+24*R.i32(found+12*k+4)+4)&24;
      out+=text.slice(end,b);end=e;
      out+=f===8||f===16?text.slice(b,e).replace(/[^\x00-\x0e\x10-\x1f]+/g,function(seg){var x=/^(\s*)([\s\S]*?)([\s:;.,]*)$/.exec(seg);return x[2]?x[1]+(f===8?'':'')+x[2]+(f===8?'':'')+x[3]:seg;}):text.slice(b,e);
    }
    return out+text.slice(end);
  }
  function textHtml(s,objHtml,start){
    var h='',oi=start;
    for(var i=0;i<s.length;i++){
      var c=s.charCodeAt(i);
      if(c===0x10){var te=tableEnd(s,i+1);if(te<0)te=s.length;var tb=tableHtml(s.slice(i+1,te),objHtml,oi);oi=tb.next;h=h.replace(/(<br>)+$/,'')+tb.html;i=te+1;if(s.charAt(i+1)==='\r')i++;continue;}
      if(c===0x0f){h+=objHtml[oi++]||'';}
      else if(c===0x0d||c===0x0b){h+='<br>';}
      else if(c===9){h+='&emsp;';}
      else if(c>=0xe001&&c<=0xe004){h+=['<sup>','</sup>','<sub>','</sub>'][c-0xe001];}
      else if(c>=0xf000&&c<=0xf0ff){var m=SYM[c-0xf000];h+=m!==undefined?esc(m):esc(String.fromCharCode(c-0xf000));}
      else if(c<0x20){}
      else h+=esc(s[i]);
    }
    return {html:h.replace(/^(<br>)+|(<br>)+$/g,''),next:oi};
  }

  /* ---- the text fields of a question: reference, standards, topic, subtopic ---- */
  function classify(strs){
    var ref='',std=[],topic='',sub=[],labelPts=0;
    strs.forEach(function(s){
      s=String(s||'').trim();
      if(!s||/^\d+$/.test(s))return;
      // newer banks add: "2pt multiple choice", the course code ("AI", "AII"), "EXAM 0123AI"
      var pl=s.match(/^(\d+(?:\.\d+)?)\s*pts?\b/i);if(pl){labelPts=+pl[1];return;}
      if(/^EXAM\b/i.test(s))return;
      if(/^(AI|AII|A1|A2|GEO|GE|IA|MA|MB|PC)$/.test(s))return;
      if(/^NY:$/.test(s))return;
      if(/^(NY:\s*)?[A-Z0-9]{1,5}(\.[A-Za-z0-9]{1,6}){1,4}$/.test(s)||/^[A-Z]{2,3}:\s/.test(s)){std.push(s);return;}
      if(!ref&&/^\d{6}[a-z]{1,6}$/i.test(s)){ref=s;return;}
      if(!ref&&/^[A-Za-z0-9_\-.]+$/.test(s)&&/\d/.test(s)&&!topic){ref=s;return;}
      if(!topic)topic=s;else sub.push(s);
    });
    return {ref:ref,std:std,topic:topic,sub:sub,points:labelPts};
  }
  // fixes questions imported by older versions, which put "2pt multiple choice" in the topic and
  // "012301ai; AI; Operations with Polynomials; subtraction; EXAM 0123AI" in the subtopic.
  // Returns true when it changed something.
  function repairFields(q){
    var sub=String(q.subtopic||''),parts=sub?sub.split('; '):[];
    var oddTopic=/^\d+(\.\d+)?\s*pts?\b/i.test(q.topic||'');
    var oddSub=parts.some(function(x){return /^EXAM\b/i.test(x)||/^(AI|AII|A1|A2|GEO|GE|IA|MA|MB|PC|NY:)$/.test(x)||/^\d{6}[a-z]{1,6}$/i.test(x);});
    if(!oddTopic&&!oddSub)return false;
    var fd=classify((oddTopic?[]:[q.topic]).concat(parts));
    if(!q.ref&&fd.ref)q.ref=fd.ref;
    if(fd.std.length&&!q.standard)q.standard=fd.std.join(', ');
    q.topic=fd.topic;q.subtopic=fd.sub.join('; ');
    return true;
  }

  function parse(fileBytes,name){
    var u=new Uint8Array(fileBytes);
    var head=String.fromCharCode.apply(null,u.subarray(0,16));
    if(head.indexOf('BNK')<0)return Promise.reject(new Error('“'+name+'” doesn’t look like an ExamView question bank.'));
    var z=-1;for(var i=0;i<64;i++){if(u[i]===0x78&&(u[i+1]===0xda||u[i+1]===0x9c||u[i+1]===0x01||u[i+1]===0x5e)){z=i;break;}}
    if(z<0)return Promise.reject(new Error('Couldn’t find the question data in “'+name+'”.'));
    return inflate(u.subarray(z)).then(function(d){return parseInner(d,name);});
  }

  function parseInner(d,name){
    var R=new Reader(d),warnings=[];
    var title=R.u16str(4).s.trim()||name.replace(/\.bnk$/i,'');
    var id=d.subarray(0,4);
    var marks=[],p=0;
    while((p=find(d,id,p+1))>=0){ if(d[p+8]===0xff&&d[p+9]===0xff&&d[p+10]===0xff&&d[p+11]===0xff)marks.push(p); }
    var qs=[];
    marks.forEach(function(Rp,k){
      try{
        var E=k+1<marks.length?marks[k+1]:d.length;
        var hh=[];for(var j=0;j<10;j++)hh.push(R.i32(Rp+12+j*4));
        // the fields block is 516 bytes into the record (in every bank seen), normally marked ff ff ff ff;
        // a few records have another value there, so check that its length fits instead of trusting the marker
        var fits=function(x){var n=x>=0&&x+16<=E?R.i32(x+12):-1;return n>=0&&x+16+n<=E;};
        var FF=[0xff,0xff,0xff,0xff],fi=Rp+516,LL=0;
        if(!fits(fi)){fi=find(d,FF,Rp+52,E);while(fi>=0&&!fits(fi))fi=find(d,FF,fi+1,E);}
        if(fi>=0)LL=R.i32(fi+12);
        if(fi<0)throw new Error('no fields');
        var points=R.i32(fi+4);
        var strs=[],o=fi+16,sEnd=Math.min(fi+16+LL,E,d.length);
        while(o<sEnd-1){var r=R.u16str(o);if(r.o<=o)break;o=r.o;if(r.s&&/[A-Za-z0-9]/.test(r.s))strs.push(r.s);}
        // a text block: its length, the text (\x0f marks objects), then a table of the objects (pictures, equations).
        // The question is the first block; for open-response questions the answer is a second block right after it.
        var block=function(S){
          var T=R.i32(S),text=null,tend=0;
          for(var q=S+4;q<S+400&&q+12<E;q+=4){
            var a=R.i32(q),b=R.i32(q+4),c=R.i32(q+8);
            if(b===1&&c===0&&a>=0&&a<300){
              var t0=q+12,c0=d[t0],c1=d[t0+1];
              if((c0||c1)&&c1<0x30){var rr=R.u16str(t0);text=rr.s;tend=rr.o;break;}
            }
          }
          if(text===null)return null;
          var cps=[];for(var ci=0;ci<text.length;ci++)if(text.charCodeAt(ci)===0x0f)cps.push(ci);
          var objHtml=[];
          if(cps.length){
            var pat=int3(cps[0],0,0),tp=tend,found=-1;
            while((tp=find(d,pat,tp,S+T+8))>=0){
              // a real table's entries point at objects inside the file (text can look like a table entry too)
              var ok=tp+72*cps.length<=d.length;for(var jj=0;ok&&jj<cps.length;jj++){var eo=R.i32(tp+72*jj+68);if(R.i32(tp+72*jj)!==cps[jj]||eo<0||S+eo+8>d.length||S+eo+4+R.i32(S+eo)>d.length)ok=false;}
              if(ok){found=tp;break;}tp++;
            }
            if(found<0)throw new Error('no object table');
            for(var oj=0;oj<cps.length;oj++){
              var e=found+72*oj,ow=R.i32(e+12),off=R.i32(e+68);
              var L=R.i32(S+off),ds=S+off+4,de=ds+L;
              if(R.i32(ds)===1&&R.i32(ds+12)===40){
                var png=dibToPng(d,ds+12,de);
                objHtml.push(png?'<img class="q-img" src="'+png.dataUrl+'" style="width:'+(ow/1440).toFixed(3)+'in" alt="">':'<span class="q-missing">[picture]</span>');
              }else{
                var pe=parseEq(d,ds,de);
                if(pe.warn.length)warnings.push((strs[0]||('#'+(k+1)))+': '+pe.warn.join(','));
                objHtml.push('<span class="m">'+eqHtml(pe.tree)+'</span>');
              }
            }
          }
          return {text:unitPowers(markScripts(text,d,R,S,tend,S+T+8)),objHtml:objHtml,end:S+T};
        };
        var S=sEnd,B=block(S);
        if(!B)throw new Error('no text');
        var text=B.text,objHtml=B.objHtml;
        // split stem / choices
        var ch0=-1;for(var c0i=text.indexOf('\x10');c0i>=0;c0i=text.indexOf('\x10',c0i+1))if(/^\s*\(?[a-hA-H1-8][).]\x11/.test(text.slice(c0i+1,c0i+8))){ch0=c0i;break;} // a \x10 that isn't followed by a) starts a table
        var stem=ch0>=0?text.slice(0,ch0):text,rest=ch0>=0?text.slice(ch0+1):'';
        var st=textHtml(stem,objHtml,0),choices=[];
        if(ch0>=0){
          var parts=rest.split('\x11'),objIdx=st.next,cur=null,list=[];
          // walk pieces keeping object indices in order
          parts.forEach(function(piece){
            var lab=piece.trim().match(/^\(?([a-hA-H1-8])[\).]$/);
            if(lab){cur={label:lab[1].toLowerCase(),html:''};list.push(cur);return;}
            var th=textHtml(piece,objHtml,objIdx);objIdx=th.next;
            if(cur&&th.html){cur.html+=(cur.html?' ':'')+th.html;}
          });
          list.sort(function(a,b){var x=isNaN(a.label)?a.label.charCodeAt(0)-96:+a.label,y=isNaN(b.label)?b.label.charCodeAt(0)-96:+b.label;return x-y;});
          choices=list.map(function(x){return x.html;});
        }
        // classify fields
        var fd=classify(strs),ref=fd.ref,std=fd.std,topic=fd.topic,sub=fd.sub,labelPts=fd.points;
        var isMC=choices.length>=2;
        var ansHtml='';
        if(!isMC){try{var AB=B.end+8<E?block(B.end):null;if(AB&&/\S/.test(AB.text))ansHtml=textHtml(AB.text,AB.objHtml,0).html;}catch(e){}} // the written answer (rubric, worked solution)
        var tf=isMC&&choices.length===2&&/^true$/i.test(choices[0].replace(/<[^>]+>/g,'').trim())&&/^false$/i.test(choices[1].replace(/<[^>]+>/g,'').trim());
        var ans=hh[3];
        var qObj={
          type:tf?'tf':isMC?'mc':'es',
          html:st.html,
          choices:isMC&&!tf?choices:undefined,
          answer:tf?(ans===0?'T':ans===1?'F':''):isMC?((ans>=0&&ans<choices.length)?ans:-1):ansHtml,
          points:points>0?points:(labelPts||1),
          bank:title,ref:ref,standard:std.join(', '),topic:topic,subtopic:sub.join('; '),
          space:isMC?undefined:Math.max(1.5,Math.min(9,Math.round((hh[3]/1440)*4)/4||3)),
          answerArea:isMC?undefined:'space'
        };
        if(isMC&&!tf&&qObj.answer<0)warnings.push((ref||('#'+(k+1)))+': no answer');
        qs.push(qObj);
      }catch(err){warnings.push('Question '+(k+1)+': '+err.message);}
    });
    return {title:title,questions:qs,warnings:warnings,found:marks.length};
  }
  return {parse:parse,classify:classify,repairFields:repairFields,_parseInner:parseInner,_eqHtml:eqHtml,_parseEq:parseEq,_markScripts:markScripts};
})();
if(typeof module!=='undefined')module.exports=BNK;
