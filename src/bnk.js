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
        if(t<0x20){i++;warn.push('tag'+t);continue;}
        i++;
        if(font===-6){var c=SYM[t];if(c===undefined){c='?';warn.push('sym'+t.toString(16));}out.push({t:'c',c:c,sym:1});}
        else out.push({t:'c',c:latin(t)});
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
        else if(k==='3,0')h+='<sub>'+s[0]+'</sub>';
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
  function textHtml(s,objHtml,start){
    var h='',oi=start;
    for(var i=0;i<s.length;i++){
      var c=s.charCodeAt(i);
      if(c===0x0f){h+=objHtml[oi++]||'';}
      else if(c===0x0d||c===0x0b){h+='<br>';}
      else if(c===9){h+='&emsp;';}
      else if(c>=0xf000&&c<=0xf0ff){var m=SYM[c-0xf000];h+=m!==undefined?esc(m):esc(String.fromCharCode(c-0xf000));}
      else if(c<0x20){}
      else h+=esc(s[i]);
    }
    return {html:h.replace(/^(<br>)+|(<br>)+$/g,''),next:oi};
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
        var fi=find(d,[0xff,0xff,0xff,0xff],Rp+52,E);if(fi<0)throw new Error('no fields');
        var points=R.i32(fi+4),LL=R.i32(fi+12);
        var strs=[],o=fi+16,sEnd=fi+16+LL;
        while(o<sEnd-1){var r=R.u16str(o);o=r.o;if(r.s&&/[A-Za-z0-9]/.test(r.s))strs.push(r.s);}
        var S=sEnd,T=R.i32(S);
        var text=null,tend=0;
        for(var q=S+4;q<S+400;q+=4){
          var a=R.i32(q),b=R.i32(q+4),c=R.i32(q+8);
          if(b===1&&c===0&&a>=0&&a<300){
            var t0=q+12,c0=d[t0],c1=d[t0+1];
            if((c0||c1)&&c1<0x30){var rr=R.u16str(t0);text=rr.s;tend=rr.o;break;}
          }
        }
        if(text===null)throw new Error('no text');
        var cps=[];for(var ci=0;ci<text.length;ci++)if(text.charCodeAt(ci)===0x0f)cps.push(ci);
        var objHtml=[],imgs=0,eqs=0;
        if(cps.length){
          var pat=int3(cps[0],0,0),tp=tend,found=-1;
          while((tp=find(d,pat,tp,S+T+8))>=0){
            var ok=true;for(var jj=0;jj<cps.length;jj++){if(R.i32(tp+72*jj)!==cps[jj]){ok=false;break;}}
            if(ok){found=tp;break;}tp++;
          }
          if(found<0)throw new Error('no object table');
          for(var oj=0;oj<cps.length;oj++){
            var e=found+72*oj,ow=R.i32(e+12),oh=R.i32(e+16),off=R.i32(e+68);
            var L=R.i32(S+off),ds=S+off+4,de=ds+L;
            if(R.i32(ds)===1&&R.i32(ds+12)===40){
              var png=dibToPng(d,ds+12,de);imgs++;
              objHtml.push(png?'<img class="q-img" src="'+png.dataUrl+'" style="width:'+(ow/1440).toFixed(3)+'in" alt="">':'<span class="q-missing">[picture]</span>');
            }else{
              var pe=parseEq(d,ds,de);eqs++;
              if(pe.warn.length)warnings.push((strs[0]||('#'+(k+1)))+': '+pe.warn.join(','));
              objHtml.push('<span class="m">'+eqHtml(pe.tree)+'</span>');
            }
          }
        }
        // split stem / choices
        var ch0=text.indexOf('\x10'),stem=ch0>=0?text.slice(0,ch0):text,rest=ch0>=0?text.slice(ch0+1):'';
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
        var ref='',std=[],topic='',sub=[];
        strs.forEach(function(s){
          if(/^\d+$/.test(s))return;
          if(/^(NY:\s*)?[A-Z0-9]{1,5}(\.[A-Za-z0-9]{1,6}){1,4}$/.test(s)||/^[A-Z]{2,3}:\s/.test(s)){std.push(s);return;}
          if(!ref&&/^[A-Za-z0-9_\-.]+$/.test(s)&&/\d/.test(s)&&!topic){ref=s;return;}
          if(!topic)topic=s;else sub.push(s);
        });
        var isMC=choices.length>=2;
        var tf=isMC&&choices.length===2&&/^true$/i.test(choices[0].replace(/<[^>]+>/g,'').trim())&&/^false$/i.test(choices[1].replace(/<[^>]+>/g,'').trim());
        var ans=hh[3];
        var qObj={
          type:tf?'tf':isMC?'mc':'es',
          html:st.html,
          choices:isMC&&!tf?choices:undefined,
          answer:tf?(ans===0?'T':ans===1?'F':''):isMC?((ans>=0&&ans<choices.length)?ans:-1):'',
          points:points>0?points:1,
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
  return {parse:parse,_parseInner:parseInner,_eqHtml:eqHtml,_parseEq:parseEq};
})();
if(typeof module!=='undefined')module.exports=BNK;
