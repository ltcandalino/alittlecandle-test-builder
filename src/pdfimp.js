/* PDF import: read text with positions, find numbered questions and answer choices, crop pictures. */
var PDFIMP=(function(){
  "use strict";
  var libP=null;
  function loadLib(){
    if(libP)return libP;
    libP=(function(){
      var libTxt=document.getElementById('pdflib').textContent;
      var u=URL.createObjectURL(new Blob([libTxt],{type:'text/javascript'}));
      return import(u).then(function(lib){
        var wTxt=document.getElementById('pdfworker').textContent;
        var wu=URL.createObjectURL(new Blob([wTxt],{type:'text/javascript'}));
        // run the PDF reader on the page itself (works when opened as a file)
        return import(wu).then(function(wmod){globalThis.pdfjsWorker=wmod;lib.GlobalWorkerOptions.workerSrc=wu;return lib;});
      });
    })();
    libP.catch(function(){libP=null;});
    return libP;
  }

  /* ---------- text extraction ---------- */
  var MATHFONT=/symbol|math|mt ?extra|euclid|cmsy|cmmi|cmex|wingding|webding|esstix|mathtype/i;
  function pageText(lib,page){
    var vp=page.getViewport({scale:1});
    return page.getTextContent().then(function(tc){
      var items=[];
      tc.items.forEach(function(it){
        if(!it.str||!it.str.trim())return;
        var t=lib.Util.transform(vp.transform,it.transform);
        var fh=Math.hypot(t[2],t[3])||Math.abs(it.height)||10;
        var x=t[4],base=t[5],w=it.width*(Math.hypot(t[0],t[1])/(Math.hypot(it.transform[0],it.transform[1])||1));
        if(!isFinite(w)||w<=0)w=fh*0.5*it.str.length;
        var st=tc.styles&&tc.styles[it.fontName],fam=st?(st.fontFamily||'')+' '+(it.fontName||''):'';
        items.push({s:it.str,x:x,x1:x+w,top:base-fh*0.82,bot:base+fh*0.22,base:base,h:fh,math:MATHFONT.test(fam)});
      });
      return {w:vp.width,h:vp.height,lines:toLines(items)};
    });
  }
  function toLines(items){
    items.sort(function(a,b){return a.base-b.base||a.x-b.x;});
    var lines=[];
    items.forEach(function(it){
      var L=null;
      for(var i=lines.length-1;i>=0&&i>=lines.length-4;i--){var l=lines[i];if(Math.abs(l.base-it.base)<Math.max(2,Math.min(l.h,it.h)*0.45)){L=l;break;}}
      if(!L){L={items:[],base:it.base,h:it.h,top:it.top,bot:it.bot};lines.push(L);}
      L.items.push(it);L.top=Math.min(L.top,it.top);L.bot=Math.max(L.bot,it.bot);L.h=Math.max(L.h,it.h);
    });
    lines.forEach(function(L){
      L.items.sort(function(a,b){return a.x-b.x;});
      L.x0=L.items[0].x;L.x1=Math.max.apply(null,L.items.map(function(i){return i.x1;}));
      L.text=joinItems(L.items);L.math=L.items.some(function(i){return i.math;});
    });
    lines.sort(function(a,b){return a.top-b.top||a.x0-b.x0;});
    return lines;
  }
  function joinItems(items){
    var s='';items.forEach(function(it,i){
      if(i){var prev=items[i-1],gap=it.x-prev.x1;if(gap>prev.h*0.18&&!/\s$/.test(s)&&!/^\s/.test(it.s))s+=' ';}
      s+=it.s;
    });
    return s.replace(/\s+/g,' ').trim();
  }

  /* ---------- question finding ---------- */
  var JUNK=/^(use this space for (computations|work)\.?|\[?\s*over\s*\]?|\[\d+\]|page \d+( of \d+)?)$/i;
  var STOP=/^(part\s+[ivx]+\b|answer all \d+ questions|directions\b|high school math reference sheet|reference sheet|scrap graph paper|this page (was )?(intentionally )?left blank)/i;
  function cleanLines(P){
    var H=P.h;
    P.lines=P.lines.filter(function(L){
      if(L.top<H*0.035||L.top>H*0.935)return false;
      if(JUNK.test(L.text))return false;
      return true;
    });
    // remove "Use this space for computations." even when merged on a line with question text
    P.lines.forEach(function(L){
      var k=-1;L.items.forEach(function(it,i){if(k<0&&/^use this space/i.test(it.s.trim()))k=i;});
      if(k>0){L.items=L.items.slice(0,k);L.x1=Math.max.apply(null,L.items.map(function(i){return i.x1;}));L.text=joinItems(L.items);}
    });
    var xs=P.lines.map(function(L){return L.x0;}).sort(function(a,b){return a-b;});
    P.left=xs.length?xs[Math.floor(xs.length*0.05)]:P.w*0.08;
  }
  function startNum(L,P){
    if(L.x0>P.left+18)return null;
    var first=L.items[0].s.trim(),m=first.match(/^(\d{1,2})[.)]?$/);
    if(m&&L.items.length>1)return {n:+m[1],textX:L.items[1].x};
    m=L.text.match(/^(\d{1,2})[.)]?\s+(?=\S)/);
    if(m){var it=L.items[0],frac=m[0].length/Math.max(1,it.s.length);return {n:+m[1],textX:it.x+(it.x1-it.x)*Math.min(1,frac)};}
    return null;
  }
  function splitLabels(P){
    P.lines.forEach(function(L){
      var out=[];
      L.items.forEach(function(it){
        var re=/\s(?=\([1-8]\)\s|[A-Ha-h][.)]\s)/g,idx=[0],m;
        while((m=re.exec(it.s)))idx.push(m.index+1);
        if(idx.length<2){out.push(it);return;}
        idx.push(it.s.length);
        var cw=(it.x1-it.x)/Math.max(1,it.s.length);
        for(var i=0;i<idx.length-1;i++){var part=it.s.slice(idx[i],idx[i+1]);if(!part.trim())continue;out.push({s:part,x:it.x+cw*idx[i],x1:it.x+cw*idx[i+1],top:it.top,bot:it.bot,base:it.base,h:it.h,math:it.math});}
      });
      L.items=out;
    });
  }
  function findQuestions(pages){
    var qs=[],expected=null,cur=null;
    pages.forEach(function(P,pi){
      cleanLines(P);splitLabels(P);
      P.lines.forEach(function(L,li){
        var st=startNum(L,P);
        if(st&&(expected===null?st.n<=60:st.n===expected)){
          if(cur)qs.push(cur);
          cur={num:st.n,page:pi,textX:st.textX,lines:[L],more:[],stopped:false};
          expected=st.n+1;return;
        }
        if(!cur)return;
        if(STOP.test(L.text)){cur.stopped=true;return;}
        if(cur.stopped)return;
        if(cur.page===pi)cur.lines.push(L);
        else cur.more.push({page:pi,line:L});
      });
      if(cur&&cur.page!==pi)cur.stopped=true;
    });
    if(cur)qs.push(cur);
    qs.forEach(function(q,i){
      q.nextTop=null;
      var nx=qs[i+1];if(nx&&nx.page===q.page)q.nextTop=nx.lines[0].top;
      delete q.more;
    });
    return qs;
  }
  var LABEL_RES=[
    {re:/(^|\s)\(([1-8])\)(?=\s|$)/g,val:function(m){return +m[2];}},
    {re:/(^|\s)([A-H])[.)](?=\s)/g,val:function(m){return m[2].charCodeAt(0)-64;}},
    {re:/(^|\s)([a-h])[.)](?=\s)/g,val:function(m){return m[2].charCodeAt(0)-96;}}
  ];
  function findChoices(q){
    for(var k=0;k<LABEL_RES.length;k++){
      var R=LABEL_RES[k],all=[];
      q.lines.forEach(function(L,li){
        L.items.forEach(function(it,ii){
          var s=it.s,m;R.re.lastIndex=0;
          while((m=R.re.exec(s))){
            var start=m.index+m[1].length,end=m.index+m[0].length;
            if(li===0&&ii===0&&start===0)continue;
            var cw=(it.x1-it.x)/Math.max(1,s.length);
            all.push({v:R.val(m),line:li,x:it.x+cw*start,lx1:it.x+cw*end,item:it,from:start,cut:end});
          }
        });
      });
      var pick=[],v=1;
      while(true){var c=all.filter(function(a){return a.v===v;});if(!c.length)break;pick.push(c[0]);v++;}
      if(pick.length>=2){
        var firstLine=Math.min.apply(null,pick.map(function(p){return p.line;}));
        if(firstLine===0)continue;
        return pick;
      }
    }
    return null;
  }

  /* ---------- building results ---------- */
  function textOf(lines,x0,x1,skipFirstNum){
    var out=[],prevBot=null,ph=12;
    lines.forEach(function(L,i){
      var its=L.items.filter(function(it){var c=(it.x+it.x1)/2;return c>=x0-1&&c<=x1+1;});
      if(!its.length)return;
      var t=joinItems(its);
      if(i===0&&skipFirstNum)t=t.replace(/^\d{1,2}[.)]?\s*/,'');
      if(!t)return;
      if(prevBot!==null&&L.top-prevBot>ph*0.9)out.push('\n');else if(out.length)out.push(' ');
      out.push(t);prevBot=L.bot;ph=L.h;
    });
    return out.join('').replace(/ *\n */g,'\n').trim();
  }
  function analyze(pages){
    var qs=findQuestions(pages),res=[];
    qs.forEach(function(q){
      var P=pages[q.page],L0=q.lines[0];
      var top=L0.top-3;
      var lastBot=Math.max.apply(null,q.lines.map(function(L){return L.bot;}));
      var bottom=q.nextTop!==null?q.nextTop-4:Math.min(P.h*0.93,Math.max(lastBot+4,lastBot));
      var limitBottom=q.nextTop!==null?q.nextTop-4:P.h*0.93;
      var right=Math.max.apply(null,q.lines.map(function(L){return L.x1;}))+6;
      right=Math.min(P.w-P.left*0.5,Math.max(right,P.left+P.w*0.45));
      var ch=findChoices(q),stemLines=q.lines,choices=null;
      var r={num:q.num,page:q.page,textX:q.textX,left:q.textX-2,right:right,top:top,limitBottom:limitBottom,warn:[]};
      if(ch){
        var firstChoiceLine=ch[0].line;
        stemLines=q.lines.slice(0,firstChoiceLine);
        var rows={};ch.forEach(function(c){(rows[c.line]=rows[c.line]||[]).push(c);});
        var rowKeys=Object.keys(rows).map(Number).sort(function(a,b){return a-b;});
        choices=ch.map(function(c){
          var row=rows[c.line].slice().sort(function(a,b){return a.x-b.x;}),idx=row.indexOf(c);
          var x1=idx<row.length-1?row[idx+1].x-4:right;
          var ri=rowKeys.indexOf(c.line);
          var ctop=q.lines[c.line].top-2;
          var cbot=ri<rowKeys.length-1?q.lines[rowKeys[ri+1]].top-2:limitBottom;
          var cl=q.lines.filter(function(L,li){return li>=c.line&&(ri<rowKeys.length-1?li<rowKeys[ri+1]:true);});
          var txt=cl.map(function(L,li){
            var its=L.items.filter(function(it){var m=(it.x+it.x1)/2;return m>=c.x-1&&m<=x1+1;});
            return joinItems(its.map(function(it){return it===c.item?{s:it.s.slice(c.cut),x:c.lx1,x1:it.x1,h:it.h}:it;}));
          }).join(' ').replace(/\s+/g,' ').trim();
          var math=cl.some(function(L){return L.items.some(function(it){var m=(it.x+it.x1)/2;return it.math&&m>=c.x-1&&m<=x1+1;});});
          return {v:c.v,box:{page:q.page,x0:c.lx1+1,x1:x1,y0:ctop,y1:cbot},text:txt,math:math};
        });
        r.labelKind=ch[0].item?null:null;
        var stemBottom=q.lines[firstChoiceLine].top-3;
        r.stemBox={page:q.page,x0:r.left,x1:right,y0:top,y1:stemBottom};
      }else{
        r.stemBox={page:q.page,x0:r.left,x1:right,y0:top,y1:limitBottom};
      }
      r.stemText=textOf(stemLines,r.left-30,right,true);
      r.choices=choices;
      // is text safe to use?
      var diag=false,maxGap=0,short=0;
      for(var i=1;i<stemLines.length;i++){var g=stemLines[i].top-stemLines[i-1].bot;if(g>maxGap)maxGap=g;}
      stemLines.forEach(function(L,i){if(i&&L.text.replace(/[^A-Za-z0-9]/g,'').length<=3&&L.text.length<=8)short++;});
      if(maxGap>(L0.h||12)*2.4)diag=true;
      if(short>=1)diag=true;
      if(q.nextTop!==null&&!ch&&(q.nextTop-lastBot)>(L0.h||12)*4)diag=diag||false;
      var math=stemLines.some(function(L){return L.math;})||(choices&&choices.some(function(c){return c.math;}));
      var odd=/[-�]/.test(r.stemText+(choices?choices.map(function(c){return c.text;}).join(''):''));
      var emptyChoice=choices&&choices.some(function(c){return !c.text;});
      r.diagram=diag;r.mathFont=math;r.stemTextBot=stemLines.length?Math.max.apply(null,stemLines.map(function(L){return L.bot;})):null;r.lineH=L0.h||12;
      r.suggest=(diag||math||odd||emptyChoice)?'pic':'text';
      if(diag)r.warn.push('has a diagram');if(math||odd)r.warn.push('has math symbols');if(emptyChoice)r.warn.push('a choice is a picture');
      res.push(r);
    });
    return res;
  }

  /* ---------- rendering & cropping ---------- */
  var SCALE=2;
  function renderPage(page,scale){
    var vp=page.getViewport({scale:scale});
    var cv=document.createElement('canvas');cv.width=Math.ceil(vp.width);cv.height=Math.ceil(vp.height);
    var ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);
    return page.render({canvasContext:ctx,canvas:cv,viewport:vp}).promise.then(function(){return cv;});
  }
  // crop box (in PDF points at scale 1) from a page canvas; trims white space at the bottom and right
  function crop(cv,box,opts){
    var s=SCALE,x0=Math.max(0,Math.floor(box.x0*s)),y0=Math.max(0,Math.floor(box.y0*s)),x1=Math.min(cv.width,Math.ceil(box.x1*s)),y1=Math.min(cv.height,Math.ceil(box.y1*s));
    if(x1-x0<4||y1-y0<4)return null;
    var ctx=cv.getContext('2d'),d=ctx.getImageData(x0,y0,x1-x0,y1-y0).data,W=x1-x0,H=y1-y0;
    // find the inked area quickly: scan rows from the top and bottom, then columns, stopping at the first ink
    var u32=new Uint32Array(d.buffer,d.byteOffset,W*H);
    function ink(v){return (v&255)<235||((v>>8)&255)<235||((v>>16)&255)<235;}
    function rowInk(y){var b=y*W;for(var x=0;x<W;x++)if(ink(u32[b+x]))return true;return false;}
    var firstRow=-1,lastRow=-1,y;
    for(y=0;y<H;y++)if(rowInk(y)){firstRow=y;break;}
    if(firstRow<0)return null;
    for(y=H-1;y>=firstRow;y--)if(rowInk(y)){lastRow=y;break;}
    function colInk(x){for(var yy=firstRow;yy<=lastRow;yy++)if(ink(u32[yy*W+x]))return true;return false;}
    var firstCol=0,lastCol=W-1,x;
    for(x=0;x<W;x++)if(colInk(x)){firstCol=x;break;}
    for(x=W-1;x>=firstCol;x--)if(colInk(x)){lastCol=x;break;}
    var pad=Math.round(4*s/2);
    var cy0=Math.max(0,firstRow-pad),cy1=Math.min(H,lastRow+pad+1),cx0=Math.max(0,firstCol-pad),cx1=Math.min(W,lastCol+pad+1);
    var out=document.createElement('canvas');out.width=cx1-cx0;out.height=cy1-cy0;
    var oc=out.getContext('2d');oc.fillStyle='#fff';oc.fillRect(0,0,out.width,out.height);
    oc.drawImage(cv,x0+cx0,y0+cy0,out.width,out.height,0,0,out.width,out.height);
    return {url:out.toDataURL('image/png'),wIn:out.width/s/72,bottom:(y0+lastRow)/s,top:(y0+firstRow)/s};
  }
  function imgHtml(c){return c?'<img class="q-img" src="'+c.url+'" style="width:'+c.wIn.toFixed(3)+'in">':'';}

  function rest(){return new Promise(function(r){setTimeout(r,0);});}
  /* ---------- main entry ---------- */
  function open(data,progress){
    return loadLib().then(function(lib){
      return lib.getDocument({data:data,isEvalSupported:false,disableFontFace:false}).promise.then(function(pdf){
        var pages=[],n=pdf.numPages,chain=Promise.resolve();
        for(var i=1;i<=n;i++)(function(i){chain=chain.then(function(){progress&&progress('Reading page '+i+' of '+n+'…');return rest();}).then(function(){return pdf.getPage(i).then(function(pg){return pageText(lib,pg).then(function(t){pages.push(t);});});});})(i);
        return chain.then(function(){return {pdf:pdf,pages:pages,found:analyze(pages)};});
      });
    });
  }
  // produce pictures for every found question (one page render at a time)
  function cropAll(doc,progress){
    var byPage={};doc.found.forEach(function(r){(byPage[r.page]=byPage[r.page]||[]).push(r);});
    var keys=Object.keys(byPage).map(Number).sort(function(a,b){return a-b;}),chain=Promise.resolve();
    keys.forEach(function(pi,k){
      chain=chain.then(function(){progress&&progress('Making pictures… page '+(pi+1));return rest();}).then(function(){return doc.pdf.getPage(pi+1).then(function(pg){return renderPage(pg,SCALE);}).then(function(cv){
        byPage[pi].forEach(function(r){
          r.stemImg=crop(cv,r.stemBox);
          if(r.stemImg&&r.stemTextBot&&r.stemImg.bottom>r.stemTextBot+r.lineH*1.6){r.diagram=true;if(r.suggest==='text'){r.suggest='pic';r.warn.push('has a diagram');}}
          if(r.choices)r.choices.forEach(function(c){c.img=crop(cv,c.box);});
          if(r.choices){var whole={x0:r.stemBox.x0-(r.textX-r.left)-30,x1:r.right,y0:r.stemBox.y0,y1:r.limitBottom};r.wholeImg=crop(cv,whole);}
        });
        cv.width=cv.height=0;
      });});
    });
    return chain;
  }
  function clip(doc,pageIndex,box){
    return doc.pdf.getPage(pageIndex+1).then(function(pg){return renderPage(pg,SCALE);}).then(function(cv){var c=crop(cv,box);cv.width=cv.height=0;return c;});
  }
  function thumb(doc,pageIndex,widthPx){
    return doc.pdf.getPage(pageIndex+1).then(function(pg){var vp=pg.getViewport({scale:1});return renderPage(pg,widthPx/vp.width).then(function(cv){return {canvas:cv,scale:widthPx/vp.width};});});
  }
  return {open:open,cropAll:cropAll,clip:clip,thumb:thumb,imgHtml:imgHtml,_analyze:analyze,_toLines:toLines,_pageText:pageText};
})();
if(typeof module!=='undefined')module.exports=PDFIMP;
