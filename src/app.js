(function(){
"use strict";
/* ================= constants ================= */
var TYPES={mc:'Multiple choice',bm:'Bimodal',tf:'True / False',sa:'Short answer',es:'Open response'};
var TYPE_ORDER=['mc','bm','tf','sa','es'];
function isMC(t){return t==='mc'||t==='bm';}
var SECTION={mc:'Multiple Choice',bm:'Bimodal',tf:'True or False',sa:'Short Answer',es:'Open Response'};
var DIRECTIONS={mc:'Choose the best answer for each question.',bm:'Choose the best answer and show your work in the space provided.',tf:'Circle T if the statement is true or F if it is false.',sa:'Answer each question in the space provided.',es:'Show all your work in the space provided.'};
var ROMAN=['I','II','III','IV','V','VI','VII'];
var MONTHS={'01':'January','06':'June','08':'August'};
var MONTH_NAMES=['','January','February','March','April','May','June','July','August','September','October','November','December'];
function monthName(m){var n=parseInt(m,10);return MONTH_NAMES[n]||'';}
function parseRef(ref){var m=String(ref||'').match(/^(0[1-9]|1[0-2])(\d{2})(\d{2})/);if(m){var q=parseInt(m[3],10);if(q>=1&&q<=36)return {month:m[1],year:2000+parseInt(m[2],10),qnum:q};}var m2=String(ref||'').match(/^[A-Za-z]+(\d{2})(\d{2})/);if(m2){var q2=parseInt(m2[2],10);if(q2>=1&&q2<=36)return {month:'',year:2000+parseInt(m2[1],10),qnum:q2};}return null;}
function clusterOf(std){var first=String(std||'').split(/,\s*/)[0];if(/^[A-Z]{2,3}:/.test(first))return '';var m=first.match(/^(.+\..+)\.\d+[a-z]?$/);return m?m[1]:'';}
function fillMeta(q){if(q.month===undefined||q.year===undefined||q.qnum===undefined){var p=parseRef(q.ref);if(q.month===undefined)q.month=p?p.month:'';if(q.year===undefined)q.year=p?p.year:'';if(q.qnum===undefined)q.qnum=p?p.qnum:'';}if(q.cluster===undefined)q.cluster=clusterOf(q.standard);if(q.subtopic===undefined)q.subtopic='';}
function examLabel(q){var parts=[];if(q.month||q.year)parts.push(((q.month?monthName(q.month)+' ':'')+(q.year||'')).trim());if(q.qnum)parts.push('#'+q.qnum);return parts.join(' ');}
var LETTERS='ABCDEFGH';
var DEFAULT_SETTINGS={docType:'test',quarter:'',unitNum:'',sectionNum:'',week:'',day:'',lessonSource:'',target:'',ecTopic:'',ecDef:'',lessonNotes:'',notesSpace:1,success:'',lessonIcons:true,toolCompass:true,toolRuler:true,toolTrace:true,showRef:true,reviewSpace:'1.5',roles:{},concepts:{},bonus:{},title:'',course:'',teacher:'',date:'',instructions:'',versions:2,shuffleQ:true,shuffleC:true,keepA:true,group:true,nameLine:true,showPoints:false,blanks:false,labels:'num',keyStd:true,keyNotes:false,bmMode:'with',calc:'',calcOther:'',time:'',timeMin:'',style:'classic',headerText:'',topic:'',scoreBox:true,computeBox:true,showCredits:true,perVersion:true,partDirs:null,bmOverride:{},font:'Century Schoolbook',fontSize:12,seed:Math.floor(Math.random()*2147483647)};
var LABELS={lowerdot:function(i){return LETTERS[i].toLowerCase()+'.';},upper:function(i){return LETTERS[i]+'.';},lower:function(i){return LETTERS[i].toLowerCase()+')';},num:function(i){return '('+(i+1)+')';}};
var FONTS={'Century Schoolbook':'"Century Schoolbook","New Century Schoolbook","Century Schoolbook L","TeX Gyre Schola",C059,Georgia,serif','Times New Roman':'"Times New Roman",Times,"Liberation Serif",serif','Cambria':'Cambria,"Caladea",Georgia,serif','Georgia':'Georgia,serif','Book Antiqua':'"Book Antiqua",Palatino,"Palatino Linotype","TeX Gyre Pagella",serif','Garamond':'Garamond,"EB Garamond","Adobe Garamond Pro",serif','Arial':'Arial,Helvetica,"Liberation Sans",sans-serif','Calibri':'Calibri,Carlito,"Segoe UI",sans-serif','Verdana':'Verdana,"DejaVu Sans",sans-serif','Comic Sans MS':'"Comic Sans MS","Comic Neue",cursive','Atkinson Hyperlegible':'"Atkinson Hyperlegible Next","Cambria Math","STIX Two Math","Segoe UI Symbol",Georgia,sans-serif','OpenDyslexic':'"OpenDyslexic","Cambria Math","STIX Two Math","Segoe UI Symbol",Georgia,sans-serif'};
function ptStyle(){var s=state.settings;return '--ptf:'+(FONTS[s.font]||FONTS['Century Schoolbook']).replace(/"/g,"'")+';--pts:'+num(s.fontSize,12)+'pt';}
/* Accommodated copy: one chosen version, same questions and answer order (so its key still works),
   printed with a readable font, larger text, more spacing and/or fewer questions per page. */
var ACC_DEFAULT={on:false,font:'Atkinson Hyperlegible',size:'',spacing:false,perPage:0,version:0};
function accom(){return Object.assign({},ACC_DEFAULT,state.settings.accom||{});}
function accOn(){return !!accom().on&&state.selected.length>0;}
function accVersion(){return Math.min(accom().version|0,nVersions()-1);}
function accSize(){var a=accom();return a.size==='l'?14:a.size==='xl'?18:num(state.settings.fontSize,12);}
function accStyle(){var a=accom(),s=state.settings,f=FONTS[a.font]||FONTS[s.font]||FONTS['Century Schoolbook'],z=Math.max(1,accSize()/num(s.fontSize,12));
  return '--ptf:'+f.replace(/"/g,"'")+';--pts:'+accSize()+'pt;--accz:'+(Math.round(z*100)/100);}
function accClass(){var a=accom();return ' acc'+(accSize()>num(state.settings.fontSize,12)?' acc-z':'')+(a.spacing?' acc-sp':'');}
// Page break after every Nth question (not after the last one). Lessons keep their own flow.
function accBreaks(html){var n=accom().perPage|0;if(!n||docType()==='lesson')return html;
  var total=(html.match(/<(div|tr) class="(pt-q|rv-q)(?=[ "])/g)||[]).length,i=0;
  return html.replace(/<(div|tr) class="(pt-q|rv-q)(?=[ "])/g,function(m,tag,cls){i++;return '<'+tag+' class="'+(i%n===0&&i<total?'acc-break ':'')+cls;});}
function accHtml(opts){var v=accVersion();return accBreaks(testHtml(buildVersion(v),v,opts));}
function bmChoices(q){if(q.inImage)return true;var o=state.settings.bmOverride||{};return (o[q.id]||state.settings.bmMode)!=='without';}
var DEFAULT_COURSES=['Algebra 1','Geometry','Algebra 2','Pre-Calculus'];
function guessCourse(name){var n=String(name||'');
  if(/pre-?\s*calc/i.test(n))return 'Pre-Calculus';if(/\bcalc/i.test(n))return 'Calculus';if(/geom|\bgeo/i.test(n))return 'Geometry';
  if(/alg(ebra)?\s*(2|ii)\b|\ba2\b|\baii\b/i.test(n))return 'Algebra 2';if(/alg(ebra)?\s*(1|i)\b|\ba1\b|\bai\b|algebra/i.test(n))return 'Algebra 1';
  if(/stat/i.test(n))return 'Statistics';return '';}
function cq(){return state.questions.filter(function(q){return q.course===state.course;});}
function calcLabel(){var s=state.settings;return s.calc==='other'?String(s.calcOther||'').trim():s.calc;}
function timeLabel(){var s=state.settings;if(s.time==='1.5')return '1.5× extended time';if(s.time==='2')return '2.0× extended time';if(s.time==='min'&&num(s.timeMin,0)>0)return num(s.timeMin,0)+' minutes';return '';}
var PART_DIRS={
  short:'Answer all questions in this part. Each correct answer will receive {credits}. No partial credit will be allowed. Clearly indicate the necessary steps, including appropriate formula substitutions, diagrams, graphs, charts, etc.',
  choice:'Answer all questions in this part. Each correct answer will receive {credits}. No partial credit will be allowed. For each statement or question, choose the word or expression that, of those given, best completes the statement or answers the question.',
  open:'Answer the following questions in this part. Each correct answer will receive {credits}. Clearly indicate the necessary steps, including appropriate formula substitutions, diagrams, graphs, charts, etc. For all questions in this part, a correct numerical answer with no work shown will receive only 1 credit.'};
function partDir(kind){var d=state.settings.partDirs||{};return d[kind]!=null&&String(d[kind]).trim()?d[kind]:PART_DIRS[kind];}
function creditsText(pts){var u=pts.filter(function(p,i,a){return a.indexOf(p)===i;}).sort(function(a,b){return a-b;});var last=u[u.length-1];var w=u.length>1?u.slice(0,-1).join(', ')+' or '+last:String(u[0]);return w+' credit'+(u.length===1&&u[0]==1?'':'s');}
function romanVal(p){var m=String(p||'').match(/([IVX]+|\d+)\s*$/i);if(!m)return 999;if(/\d/.test(m[1]))return +m[1];var map={I:1,V:5,X:10},r=0,t=m[1].toUpperCase();for(var i=0;i<t.length;i++){var v=map[t[i]],nx=map[t[i+1]]||0;r+=v<nx?-v:v;}return r;}
function partKeyOf(q,useExplicit){
  if(useExplicit)return q.part;
  if(isMC(q.type)||q.type==='tf')return 'B';
  if(num(q.points,1)<=1)return 'A';
  return 'C'+String(1000+Math.round(num(q.points,1)*10));
}
function partKind(group){if(group.every(function(it){return isMC(it.q.type)&&!it.open||it.q.type==='tf';}))return 'choice';if(group.every(function(it){return num(it.q.points,1)<=1;}))return 'short';return 'open';}
function letterOf(i){var f=LABELS[state.settings.labels]||LABELS.upper;return f(i);}

/* ================= helpers ================= */
function uid(){return 'q'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function $(s,el){return (el||document).querySelector(s);}
function $$(s,el){return Array.prototype.slice.call((el||document).querySelectorAll(s));}
function num(v,d){var n=parseFloat(v);return isFinite(n)?n:d;}
function ptsLabel(p){return p+' '+(p==1?'pt':'pts');}
function textToHtml(t){return esc(String(t||'').trim()).replace(/\r?\n/g,'<br>');}
var plainCache=new Map(),qCache=new WeakMap();
function plainQ(q){var c=qCache.get(q);if(c&&c.h===q.html&&c.c===q.choices)return c;var t=plain(q.html);c={h:q.html,c:q.choices,t:t,all:t+' '+(q.choices||[]).map(plain).join(' ')};qCache.set(q,c);return c;}
function plain(html){
  if(!html)return '';
  var big=html.length>4000;var c=big?undefined:plainCache.get(html);if(c!==undefined)return c;
  var d=document.createElement('div');d.innerHTML=html.replace(/<img[^>]*>/g,' [picture] ');
  $$('.m-ov,.m-line,.m-ray',d).forEach(function(e){e.textContent=e.textContent;});
  var t=d.textContent.replace(/\s+/g,' ').trim();if(!big){if(plainCache.size>5000)plainCache.clear();plainCache.set(html,t);}return t;
}
function hasImg(html){return /<img\b/i.test(html||'');}

/* ================= sanitizing rich HTML ================= */
var OK_CLASS=/^(q-lbl|m-mat|m|m-op|m-ov|m-acc|m-line|m-ray|m-arc|m-sqrt|m-rad-sign|m-rad|m-frac|m-num|m-den|q-img)$/;
function sanitize(html){
  var tpl=document.createElement('template');tpl.innerHTML=html;
  function walk(node,out){
    node.childNodes.forEach(function(n){
      if(n.nodeType===3){out.appendChild(document.createTextNode(n.nodeValue.replace(/\u00a0/g,' ')));return;}
      if(n.nodeType!==1)return;
      var tag=n.tagName.toLowerCase();
      if(/^(script|style|template|noscript|iframe|object|embed|svg|math)$/.test(tag))return;
      if(tag==='br'){out.appendChild(document.createElement('br'));return;}
      if(tag==='img'){var src=n.getAttribute('src')||'';if(/^data:image\//.test(src)||/^https:\/\//.test(src)||(location.protocol==='http:'&&src.indexOf(location.origin+'/storage/v1/object/public/images/')===0)){var im=document.createElement('img');im.src=src;im.className='q-img'+(/\bq-float\b/.test(n.className||'')?' q-float':'');var st=n.getAttribute('style')||'';var mw=st.match(/width:\s*([\d.]+in)/);if(mw)im.style.width=mw[1];out.appendChild(im);}return;}
      if(tag==='div'||tag==='p'){if(out.lastChild&&out.lastChild.nodeName!=='BR')out.appendChild(document.createElement('br'));walk(n,out);return;}
      if(/^(sup|sub|b|i|u|strong|em)$/.test(tag)){var e=document.createElement(tag==='strong'?'b':tag==='em'?'i':tag);if(tag==='b'&&/\bq-lbl\b/.test(n.className||''))e.className='q-lbl';walk(n,e);out.appendChild(e);return;}
      if(/^(table|tbody|thead|tr|td|th)$/.test(tag)){
        if(tag==='tbody'||tag==='thead'){walk(n,out);return;}
        var te=document.createElement(tag==='th'?'td':tag);
        if(tag==='table')te.className='q-tbl';
        if(tag==='td'||tag==='th'){var cs=n.getAttribute('colspan');if(cs)te.setAttribute('colspan',cs);var st2=(n.getAttribute('style')||'').match(/border-(top|bottom|left|right)\s*:[^;]+/g);if(st2)te.setAttribute('style',st2.join(';'));}
        walk(n,te);
        if(tag==='tr'&&out.nodeName!=='TABLE'&&out.nodeName!=='TBODY'){}
        out.appendChild(te);return;}
      if(tag==='span'){
        var cls=(n.className||'').split(/\s+/).filter(function(c){return OK_CLASS.test(c);});
        if(cls.length){var s=document.createElement('span');s.className=cls.join(' ');walk(n,s);out.appendChild(s);return;}
      }
      walk(n,out);
    });
  }
  var out=document.createElement('div');walk(tpl.content,out);
  return out.innerHTML.replace(/(<br>)+$/,'').trim();
}

/* ================= state & storage ================= */
var state={settings:Object.assign({},DEFAULT_SETTINGS),questions:[],selected:[],banks:{}};
var ui={tab:'bank',q:'',bank:'',topic:'',type:'',std:'',unit:'',section:'',source:'',year:'',month:'',cluster:'',sub:'',sort:'bank',limit:40,pv:0,showAns:false,pickN:5,pickBank:'',pickTopic:'',pickType:'',pickUnit:'',pickSection:''};
try{var uu=JSON.parse(localStorage.getItem('tb-ui')||'null');if(uu)Object.assign(ui,uu,{limit:40});}catch(e){}
function saveUi(){try{localStorage.setItem('tb-ui',JSON.stringify(ui));}catch(e){}}
applyDisplay();
var db=null,storageOk=true,saveTimer=null,lastSaved=null;
function openDb(){
  return new Promise(function(res){
    try{
      var r=indexedDB.open('test-builder',1);
      r.onupgradeneeded=function(){r.result.createObjectStore('kv');};
      r.onsuccess=function(){db=r.result;res(true);};
      r.onerror=function(){res(false);};
      r.onblocked=function(){res(false);};
    }catch(e){res(false);}
  });
}
function idbGet(key){return new Promise(function(res){try{var t=db.transaction('kv').objectStore('kv').get(key);t.onsuccess=function(){res(t.result);};t.onerror=function(){res(null);};}catch(e){res(null);}});}
function idbPut(key,val){return new Promise(function(res,rej){try{var tx=db.transaction('kv','readwrite');tx.objectStore('kv').put(val,key);tx.oncomplete=function(){res();};tx.onerror=function(){rej(tx.error);};tx.onabort=function(){rej(tx.error);};}catch(e){rej(e);}});}
function normalize(s){
  s=(s&&typeof s==='object')?s:{};
  s.settings=Object.assign({},DEFAULT_SETTINGS,s.settings||{});migrateSettings(s.settings,s.course);
  s.questions=Array.isArray(s.questions)?s.questions.filter(function(q){return q&&TYPES[q.type];}):[];
  s.questions.forEach(function(q){
    if(!q.id)q.id=uid();q.points=num(q.points,1);q.bank=q.bank||'My questions';q.topic=q.topic||'';q.standard=q.standard||'';q.unit=q.unit||'';q.section=q.section||'';q.source=q.source||'';q.part=q.part||'';q.notes=q.notes||'';q.html=q.html||textToHtml(q.text||'');fillMeta(q);
    if(q.type==='bm'){q.space=q.space||2;}
    if(isMC(q.type)){q.choices=(Array.isArray(q.choices)?q.choices:[]).map(function(c){return c;});if(typeof q.answer!=='number')q.answer=-1;}
    if(q.type==='es'){q.answerArea=q.answerArea||'lines';if(q.lines==null)q.lines=8;if(q.space==null)q.space=3;}
    if(q.type==='sa'){if(q.lines==null)q.lines=1;}
  });
  s.courses=Array.isArray(s.courses)&&s.courses.length?s.courses:DEFAULT_COURSES.slice();
  if(!s.course){var cnt={};s.questions.forEach(function(q){var g=q.course||guessCourse(q.bank);if(g)cnt[g]=(cnt[g]||0)+1;});var best=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];})[0];s.course=best||s.courses[0];}
  s.questions.forEach(function(q){if(!q.course)q.course=guessCourse(q.bank)||s.course;});
  s.questions.forEach(function(q){if(s.courses.indexOf(q.course)<0)s.courses.push(q.course);});
  if(s.courses.indexOf(s.course)<0)s.courses.push(s.course);
  s.courseTests=s.courseTests||{};
  var ids={};s.questions.forEach(function(q){ids[q.id]=1;});
  s.savedTests=Array.isArray(s.savedTests)?s.savedTests.filter(function(t){return t&&t.id;}):[];
  var fz=s.settings.frozen&&s.savedTests.filter(function(t){return t.id===s.settings.savedId;})[0];if(fz)(fz.questions||[]).forEach(function(q){ids[q.id]=1;});
  s.selected=Array.isArray(s.selected)?s.selected.filter(function(id,i,a){return ids[id]&&a.indexOf(id)===i;}):[];
  s.banks=s.banks||{};
  return s;
}
var CLOUDON=!!(window.CLOUD&&CLOUD.enabled);
function stateKey(){var u=CLOUDON&&CLOUD.user();return u&&u.id?'state:'+u.id:'state';}
function persistLocal(){if(!db||!storageOk)return Promise.resolve();return idbPut(stateKey(),state).catch(function(e){console.error(e);});}
function changed(){
  setStatus('Saving…');
  clearTimeout(saveTimer);
  saveTimer=setTimeout(persist,1200);
}
function persist(){saveTimer=null;
  if(!db||!storageOk){setStatus(storageOk?'':'Not saved in this browser',true);return Promise.resolve();}
  return idbPut(stateKey(),state).then(function(){lastSaved=new Date();setStatus('Saved');if(CLOUDON)CLOUD.schedule();},function(err){
    console.error(err);setStatus('Couldn’t save — download a backup',true);
    toast('Your browser refused to save ('+(err&&err.name||'error')+'). Use Download backup on the Import tab so you don’t lose work.');
  });
}
function setStatus(t,warn){var el=$('#status');if(el)el.innerHTML=t?'<span class="dot'+(warn?' warn':'')+'"></span>'+esc(t):'';}
window.addEventListener('beforeunload',function(){saveUi();if(saveTimer){clearTimeout(saveTimer);saveTimer=null;persist();}});

/* ================= lookup ================= */
function byId(id){for(var i=0;i<state.questions.length;i++)if(state.questions[i].id===id)return state.questions[i];return null;}
function isSel(id){return state.selected.indexOf(id)>=0;}
function uniq(field){var t={};cq().forEach(function(q){var v=q[field];if(v){if(field==='standard')String(v).split(/,\s*/).forEach(function(x){if(x)t[x]=1;});else t[v]=1;}});return Object.keys(t).sort(function(a,b){return a.localeCompare(b,undefined,{numeric:true});});}
function selectedQs(){return state.selected.map(selQ).filter(Boolean);}
/* ---- Saved tests ----
   state.savedTests: [{id,name,course,created,savedAt,printedAt,settings,selected,questions}]
   questions = frozen copies of exactly what was on the test, so a reprint can match what was handed out.
   settings.savedId = the saved test the current test came from; settings.frozen = use its frozen copies. */
function savedById(id){var a=state.savedTests||[];for(var i=0;i<a.length;i++)if(a[i].id===id)return a[i];return null;}
function frozenMap(){var s=state.settings,t=s.frozen&&s.savedId&&savedById(s.savedId);if(!t)return null;var m={};(t.questions||[]).forEach(function(q){m[q.id]=q;});return m;}
function selQ(id){var m=frozenMap();return (m&&m[id])||byId(id);}
// What matters on paper: wording, pictures (by position, not address), choices, answer, space.
function paperSig(q){var lite=function(h){return String(h||'').replace(/src="[^"]*"/g,'src');};
  return JSON.stringify([q.type,lite(q.html),(q.choices||[]).map(lite),q.answer,q.points,q.lines,q.space,q.answerArea,!!q.inImage,!!q.lockChoices]);}
function savedDiff(t){var edited=0,gone=0;(t.questions||[]).forEach(function(q){var b=byId(q.id);if(!b)gone++;else if(paperSig(b)!==paperSig(q))edited++;});return {edited:edited,gone:gone};}
function testSnapshot(){var st=JSON.parse(JSON.stringify(state.settings));delete st.savedId;delete st.frozen;return {settings:st,selected:state.selected.slice()};}
function defaultTestName(){return docTitle()||DOC_TYPES[docType()];}
function saveTest(opts){opts=opts||{};
  var s=state.settings,t=!opts.asNew&&s.savedId&&savedById(s.savedId),now=new Date().toISOString(),snap=testSnapshot();
  if(!t){t={id:uid(),name:opts.name||defaultTestName(),course:state.course,created:now};state.savedTests.unshift(t);}
  t.settings=snap.settings;t.selected=snap.selected;t.questions=JSON.parse(JSON.stringify(selectedQs()));t.savedAt=now;t.course=state.course;
  if(opts.printed)t.printedAt=now;
  s.savedId=t.id;changed();return t;}
function isDirty(){var t=savedById(state.settings.savedId);if(!state.selected.length)return false;if(!t)return true;
  var a=testSnapshot();return JSON.stringify(a.settings)!==JSON.stringify(t.settings)||a.selected.join()!==(t.selected||[]).join();}
function openSaved(id,mode){var t=savedById(id);if(!t)return;
  state.settings=migrateSettings(Object.assign({},DEFAULT_SETTINGS,JSON.parse(JSON.stringify(t.settings||{})),{savedId:t.id,frozen:false}),state.course);
  state.selected=(t.selected||[]).slice();
  var d=savedDiff(t);if(d.edited||d.gone)state.settings.frozen=mode!=='latest';
  if(!state.settings.frozen){var have={};state.questions.forEach(function(q){have[q.id]=1;});state.selected=state.selected.filter(function(x){return have[x];});}
  if(ui.pv==='acc'&&!accom().on)ui.pv=0;changed();renderTabs();renderBuild();}
function fmtDay(iso){var t=Date.parse(iso);return isNaN(t)?'':new Date(t).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});}
function totalPts(){return selectedQs().reduce(function(a,q){return a+num(q.points,0);},0);}
function nVersions(){return Math.max(1,Math.min(8,parseInt(state.settings.versions,10)||1));}

/* ================= toast ================= */
var toastT;
function toast(msg,undo){
  var t=$('#toast');t.innerHTML=esc(msg)+(undo?' <button class="small" id="toastUndo" style="margin-left:8px">Undo</button>':'');
  t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(function(){t.classList.remove('show');},undo?7000:4200);
  if(undo)$('#toastUndo').onclick=function(){t.classList.remove('show');undo();};
}

/* ================= versions ================= */
function rng(seed){var a=seed>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function shuffle(arr,r){var a=arr.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(r()*(i+1));var x=a[i];a[i]=a[j];a[j]=x;}return a;}
var PIN=/^\s*(all|none|both|neither)\s+(of\s+)?(the\s+)?(above|these|answers)|^\s*(both|neither)\b.*\b(and|nor)\b/i;
var LETTER_REF=/\b[A-H]\s*(,|and|&|or)\s*[A-H]\b|\b(choices?|answers?|options?)\s+[A-H]\b|\b[I]{1,3}\s*(,|and|&)\s*[I]{1,3}\b/;
function buildVersion(v){
  var s=state.settings,r=rng(((s.seed>>>0)+(v+1)*104729)>>>0),dt=docType();
  var all=selectedQs(),original=(v===0&&s.keepA),doQ=s.shuffleQ&&!original,doC=s.shuffleC&&!original,ordered;
  var qs=all.filter(function(q){return !isBonus(q);}),bon=all.filter(isBonus);
  var explicit=qs.length&&qs.every(function(q){return q.part;});
  var keyOf=dt==='review'?reviewKind:dt==='lesson'?roleOf:function(q){return partKeyOf(q,explicit);};
  if(dt==='review'||dt==='lesson'){
    ordered=[];(dt==='review'?['open','mc']:['warmup','example','practice']).forEach(function(k){var g=qs.filter(function(q){return keyOf(q)===k;});ordered=ordered.concat(doQ?shuffle(g,r):g);});
  }else if(s.group){
    var keys=[];
    qs.forEach(function(q){var k=keyOf(q);if(keys.indexOf(k)<0)keys.push(k);});
    if(explicit)keys.sort(function(a,b){return romanVal(a)-romanVal(b);});else keys.sort();
    ordered=[];keys.forEach(function(k){var g=qs.filter(function(q){return keyOf(q)===k;});ordered=ordered.concat(doQ?shuffle(g,r):g);});
  }
  else ordered=doQ?shuffle(qs,r):qs.slice();
  ordered=ordered.concat(doQ?shuffle(bon,r):bon);
  return ordered.map(function(q){
    var it={q:q,type:q.type,pk:isBonus(q)?'bonus':keyOf(q),bonus:isBonus(q)};
    if(isMC(q.type)){
      var idx=q.choices.map(function(_,i){return i;});
      var txt=q.choices.map(plain);
      var refs=q.inImage||txt.some(function(c){return LETTER_REF.test(c);});
      if(doC&&!q.lockChoices&&!refs){
        var free=idx.filter(function(i){return !PIN.test(txt[i]);}),pinned=idx.filter(function(i){return PIN.test(txt[i]);});
        idx=shuffle(free,r).concat(pinned);
      }
      it.choices=idx.map(function(i){return q.choices[i];});it.answer=idx.indexOf(q.answer);
      if(q.type==='bm'&&!bmChoices(q))it.open=true;
    }
    return it;
  });
}

/* ================= printed test HTML ================= */
function choiceCols(chs){
  var lens=chs.map(function(c){return plain(c).length+(hasImg(c)?40:0);}),max=Math.max.apply(null,lens.concat([0]));
  if(chs.length===4&&max<=11)return 'c4';
  if(max<=34||chs.some(hasImg))return 'c2';
  return 'c1';
}
function headerText(){var s=state.settings;return (s.headerText&&s.headerText.trim())||state.course||'';}
var DOC_TYPES={test:'Test',quiz:'Quiz',review:'Review',lesson:'Lesson'};
function docType(){var t=state.settings.docType;return DOC_TYPES[t]?t:'test';}
function isExamDoc(){var t=docType();return t==='test'||t==='quiz';}
function sv(k){return String(state.settings[k]==null?'':state.settings[k]).trim();}
function pad(v,n){v=String(v||'').trim();if(!v)return Array(n+1).join('#');return /^\d+$/.test(v)?('000'+v).slice(-n):v;}
function autoTitle(){var t=docType(),u=sv('unitNum'),q=sv('quarter');
  if(t==='review')return headerText()+(u?' Unit '+u:'')+' Review';
  if(t==='lesson')return headerText()+(u?' Unit '+u:'')+(sv('sectionNum')?'-'+sv('sectionNum'):'')+' Lesson';
  return [q?'Quarter '+q:'',u?'Unit '+u:''].filter(Boolean).join(' – ')+(q||u?' ':'')+(t==='quiz'?'Quiz':'Exam');}
function docTitle(){return sv('title')||autoTitle();}
function rightLabel(){var t=docType(),u=sv('unitNum'),sc=sv('sectionNum');
  if(t==='review')return (u?'Unit '+u+' ':'')+'Review';
  if(t==='lesson')return [u,sc].filter(Boolean).join('-');
  return '';}
function lessonTools(){var s=state.settings;if(s.lessonIcons===false)return [];return [['compass','toolCompass'],['ruler','toolRuler'],['trace','toolTrace']].filter(function(x){return s[x[1]]!==false;}).map(function(x){return x[0];});}
function lessonCode(){var q=sv('quarter'),w=sv('week'),d=sv('day');if(!q&&!w&&!d)return '';return 'Q'+(q||'#')+'W'+pad(w,2)+'D'+pad(d,3);}
function lessonSource(){if(sv('lessonSource'))return sv('lessonSource');var seen=[];selectedQs().forEach(function(q){var x=String(q.source||'').trim();if(x&&seen.indexOf(x)<0)seen.push(x);});return seen.join(', ');}
function roleOf(q){var r=(state.settings.roles||{})[q.id];return r==='warmup'||r==='example'?r:'practice';}
function reviewKind(q){return q.type==='tf'||(isMC(q.type)&&(q.type!=='bm'||bmChoices(q)))?'mc':'open';}
function isBonus(q){return isExamDoc()&&!!(state.settings.bonus||{})[q.id];}
function migrateSettings(st,course){
  if(!DOC_TYPES[st.docType])st.docType='test';
  if(st.lessonIcons===false){st.toolCompass=st.toolRuler=st.toolTrace=false;st.lessonIcons=true;}
  if(st._v===2)return st;st._v=2;st.style='classic';
  if(st.instructions==='Read each question carefully.')st.instructions='';
  var t=String(st.title||'').trim();
  if(!t||t==='Test'||t===String(course||'')+' Test')st.title='';
  else{var mq=t.match(/Quarter\s*(\d+)/i),mu=t.match(/Unit\s*(\d+)/i);if(mq&&!st.quarter)st.quarter=mq[1];if(mu&&!st.unitNum)st.unitNum=mu[1];if(/quiz/i.test(t))st.docType='quiz';}
  ['roles','concepts','bonus'].forEach(function(k){if(!st[k]||typeof st[k]!=='object')st[k]={};});
  if(st.accom&&typeof st.accom!=='object')delete st.accom;
  return st;
}
/* page header / footer pictures (used in the print margins and the preview) */
function xmlEsc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function svgFont(){return (FONTS[state.settings.font]||FONTS['Century Schoolbook']).replace(/"/g,"'");}
function headerSvg(o){
  if(o.icons&&!o.icons.length)o.icons=null;var W=o.w,f=xmlEsc(svgFont()),top=o.icons?38:14,bar=top+6,H=o.right?bar+15:bar+3,b='';
  if(o.icons){var x=0;o.icons.forEach(function(k){var ic=LESSON_ICONS[k];b+='<image href="'+ic.src+'" x="'+x+'" y="'+(36-ic.h)/2+'" width="'+ic.w+'" height="'+ic.h+'"/>';x+=ic.w+6;});}
  b+='<text x="'+(W/2)+'" y="'+top+'" text-anchor="middle" font-family="'+f+'" font-size="12"'+(o.bold?' font-weight="bold"':'')+'>'+xmlEsc(o.title)+'</text>';
  b+='<line x1="0" y1="'+bar+'" x2="'+W+'" y2="'+bar+'" stroke="black" stroke-width="1.2"/>';
  if(o.right)b+='<text x="'+W+'" y="'+(bar+13)+'" text-anchor="end" font-family="'+f+'" font-size="12"'+(o.italic?' font-style="italic"':'')+'>'+xmlEsc(o.right)+'</text>';
  return {w:W,h:H,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'pt" height="'+H+'pt" viewBox="0 0 '+W+' '+H+'">'+b+'</svg>'};
}
function lessonFootSvg(){
  var code=lessonCode(),src=lessonSource(),f=xmlEsc(svgFont()),b='';if(!code&&!src)return null;
  if(code)b+='<text x="0" y="8" font-family="'+f+'" font-size="7" fill="#7f7f7f">'+xmlEsc(code)+'</text>';
  if(src)b+='<text x="0" y="'+(code?24:8)+'" font-family="'+f+'" font-size="9" fill="#7f7f7f"><tspan font-style="italic">Source</tspan>: '+xmlEsc(src)+'</text>';
  return {w:340,h:code&&src?28:12,svg:'<svg xmlns="http://www.w3.org/2000/svg" width="340pt" height="'+(code&&src?28:12)+'pt" viewBox="0 0 340 '+(code&&src?28:12)+'">'+b+'</svg>'};
}
function svgUrl(x){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(x.svg);}
function pageGeom(){var t=docType();return t==='lesson'?{m:'.8in .5in',w:540}:{m:'1in .75in',w:504};}
function headers(){var t=docType(),w=pageGeom().w,r=rightLabel();
  return {first:headerSvg({w:w,title:headerText(),bold:true,icons:t==='lesson'?lessonTools():null}),
          rest:headerSvg({w:w,title:headerText(),right:t==='review'||t==='lesson'?r:'',italic:t==='review'})};}
/* item labels: what prints next to each question, and what the answer key calls it */
function labelItems(items){
  var t=docType(),n=0,b=0,ex=0,wu=0,nwu=items.filter(function(it){return it.pk==='warmup';}).length;
  items.forEach(function(it){
    if(it.bonus){b++;it.num=b+'.';it.keyLabel='Bonus '+b;}
    else if(t==='lesson'&&it.pk==='warmup'){wu++;it.num='';it.keyLabel='Warm Up'+(nwu>1?' '+wu:'');}
    else if(t==='lesson'&&it.pk==='example'){ex++;it.num='';it.keyLabel='Example '+ex;it.exN=ex;}
    else{n++;it.num=n+'.';it.keyLabel=n+'.';}
  });
  return items;
}
/* the answer area under a question: choices, work space, lines, key notes */
function qBody(it,A,ov){
  var q=it.q,h='';
  if(ov!=null&&ov!==''&&q.type!=='tf'&&!(isMC(q.type)&&!it.open)){
    if(it.open||q.inImage);else if(isMC(q.type))h+='<ul class="pt-ch '+choiceCols(it.choices)+'">'+it.choices.map(function(c,ci){return '<li class="'+(A&&ci===it.answer?'ans':'')+'"><b>'+letterOf(ci)+'</b><span>'+c+'</span></li>';}).join('')+'</ul>';
    if(num(ov,0)>0)h+='<div class="pt-space" style="height:'+num(ov,0)+'in"></div>';
    if(A&&it.answer>=0&&isMC(q.type))h+='<div class="pt-keynote">Key: '+it.choices[it.answer]+'</div>';
    if(A&&(q.type==='sa'||q.type==='es')&&q.answer)h+='<div class="pt-keynote">Key: '+textToHtml(q.answer)+'</div>';
    return h;
  }
  if(it.open)h+='<div class="pt-space" style="height:'+Math.max(.5,num(q.space,2))+'in"></div>'+(A&&it.answer>=0?'<div class="pt-keynote">Key: '+it.choices[it.answer]+'</div>':'');
  else if(q.inImage){if(A&&it.answer>=0)h+='<div class="pt-keynote">Answer: '+esc(plain(q.choices[it.answer]))+'</div>';if(q.type==='bm')h+='<div class="pt-space" style="height:'+Math.max(.5,num(q.space,2))+'in"></div>';}
  else if(isMC(q.type))h+='<ul class="pt-ch '+choiceCols(it.choices)+'">'+it.choices.map(function(c,ci){return '<li class="'+(A&&ci===it.answer?'ans':'')+'"><b>'+letterOf(ci)+'</b><span>'+c+'</span></li>';}).join('')+'</ul>'+(q.type==='bm'?'<div class="pt-space" style="height:'+Math.max(.5,num(q.space,2))+'in"></div>':'');
  else if(q.type==='tf')h+='<div class="pt-tf"><span class="'+(A&&q.answer==='T'?'ans':'')+'">T</span><span class="'+(A&&q.answer==='F'?'ans':'')+'">F</span></div>';
  else if(q.type==='es'&&q.answerArea==='space'){var sp=Math.max(0,num(q.space,3));if(sp>0)h+='<div class="pt-space" style="height:'+sp+'in"></div>';}
  else{var nl=Math.max(0,num(q.lines,q.type==='sa'?1:8));if(nl>0)h+='<div class="pt-lines">'+Array(nl+1).join('<div></div>')+'</div>';}
  if(A&&(q.type==='sa'||q.type==='es')&&q.answer)h+='<div class="pt-keynote">Key: '+textToHtml(q.answer)+'</div>';
  return h;
}
function isTall(q){return (q.type==='bm'&&num(q.space,2)>5)||q.type==='es'&&(q.answerArea==='space'?num(q.space,3):num(q.lines,8)*0.33)>5||/<table/.test(q.html);}
function nameRow(){return '<div class="cl-row cl-name"><span>Name: <span class="cl-line" style="width:3.1in"></span></span><span>Date: <span class="cl-line" style="width:1.6in"></span></span></div>';}
function previewHead(first){var hd=headers(),x=first?hd.first:hd.rest;return '<div class="pv-head"><img src="'+svgUrl(x)+'" style="width:'+x.w+'pt;height:'+x.h+'pt" alt=""></div>';}
function testHtml(items,v,opts){
  labelItems(items);
  var t=docType(),pv=opts&&opts.preview,h=pv?previewHead(true):'';
  if(t==='review')h+=reviewHtml(items,v,opts);
  else if(t==='lesson')h+=lessonHtml(items,v,opts);
  else h+=examHtml(items,v,opts);
  if(pv){
    if(isExamDoc())h+='<div class="cl-runfoot">v. '+(v+1)+'</div>';
    else if(t==='lesson'){var lf=lessonFootSvg();if(lf)h+='<div class="cl-runfoot"><span class="hint" style="font-family:system-ui,sans-serif;font-size:10px;display:block;margin-bottom:3pt">Footer on pages 2+:</span><img src="'+svgUrl(lf)+'" style="width:'+lf.w+'pt;height:'+lf.h+'pt" alt=""></div>';}
  }
  return h;
}
function examHtml(items,v,opts){
  var s=state.settings,A=opts&&opts.answers,h='';
  if(s.nameLine)h+=nameRow();
  h+='<div class="cl-row cl-title"><b>'+esc(docTitle())+'</b><i>'+esc(s.topic||'')+'</i></div>';
  var cl=calcLabel(),tl=timeLabel(),te=sv('teacher');
  if(cl||tl||te)h+='<div class="cl-acc"><i>'+esc(te)+'</i><i>'+esc(cl)+'</i><i>'+esc(tl)+'</i></div>';
  if(s.instructions&&s.instructions.trim())h+='<p class="pt-ins">'+textToHtml(s.instructions)+'</p>';
  var main=items.filter(function(it){return !it.bonus;}),last=null,part=0,curKind=null,bonusShown=false;
  items.forEach(function(it){
    var q=it.q;
    if(it.bonus&&!bonusShown){h+='<div class="cl-bonus">Bonus</div>';bonusShown=true;curKind='bonus';}
    else if(!it.bonus&&s.group&&it.pk!==last){
      var grp=main.filter(function(x){return x.pk===it.pk;}),kind=partKind(grp),tot=grp.reduce(function(a,x){return a+num(x.q.points,0);},0);
      var name=(grp[0].q.part&&main.every(function(x){return x.q.part;}))?grp[0].q.part:'Part '+ROMAN[part];part++;
      var dir=partDir(kind).replace(/\{credits\}/g,creditsText(grp.map(function(x){return num(x.q.points,1);})));
      h+='<div class="cl-part"><div class="cl-pname">'+esc(name)+'</div><div class="cl-dir">'+esc(dir)+'<span class="cl-tot">['+(Math.round(tot*100)/100)+']</span></div></div>';
      if(kind==='choice'&&s.computeBox)h+='<div class="cl-comp">Use this space for computations.</div>';
      last=it.pk;curKind=kind;
    }
    var bl=s.blanks&&((isMC(q.type)&&!it.open)||q.type==='tf');
    var cred=s.showCredits&&!it.bonus&&!(isMC(q.type)&&!it.open)&&q.type!=='tf'&&(curKind==='open'||!s.group)?'<div class="cl-cred">['+num(q.points,1)+']</div>':'';
    h+='<div class="pt-q cl-q'+(isTall(q)?' long':'')+'"><div class="pt-num">'+(bl?'<span class="pt-blank"></span>':'')+it.num+'</div><div><div class="pt-qt">'+q.html+(s.showPoints?' <span class="pt-pts">('+ptsLabel(q.points)+')</span>':'')+'</div>'+cred+qBody(it,A)+'</div></div>';
  });
  if(s.scoreBox&&main.length){var total=main.reduce(function(a,x){return a+num(x.q.points,0);},0);h+='<div class="cl-scorewrap"><div class="cl-score"><div>Score:</div><div class="cl-score-n">/'+(Math.round(total*100)/100)+'</div></div></div>';}
  return h;
}
function refText(q){return [q.source,examLabel(q)||q.ref].filter(function(x){return x&&String(x).trim();}).join(' ');}
function reviewHtml(items,v,opts){
  var s=state.settings,A=opts&&opts.answers,h='';
  if(s.nameLine)h+=nameRow();
  h+='<div class="rv-title">'+esc(docTitle())+'</div>';
  if(s.instructions&&s.instructions.trim())h+='<p class="pt-ins">'+textToHtml(s.instructions)+'</p>';
  h+='<table class="rv"><colgroup><col style="width:.45in"><col></colgroup>';
  var last=null;
  items.forEach(function(it){
    if(it.pk!==last){h+='<tr class="rv-h'+(it.pk==='mc'?' mc':'')+'"><td colspan="2">'+(it.pk==='mc'?'Multiple Choice Questions':'Short/Extended Response Questions')+'</td></tr>';last=it.pk;}
    var q=it.q,ref=s.showRef?refText(q):'';
    h+='<tr class="rv-q"><td class="rv-n">'+it.num+'</td><td><div class="pt-qt">'+q.html+(s.showPoints?' <span class="pt-pts">('+ptsLabel(q.points)+')</span>':'')+'</div>'+qBody(it,A,s.reviewSpace)+(ref?'<div class="rv-ref">'+esc(ref)+'</div>':'<div class="rv-pad"></div>')+'</td></tr>';
  });
  return h+'</table>';
}
function lessonHtml(items,v,opts){
  var s=state.settings,A=opts&&opts.answers,h='',by=function(k){return items.filter(function(it){return it.pk===k;});};
  var qBlock=function(it,lbl){var q=it.q;return '<div class="pt-q ls-q'+(isTall(q)?' long':'')+(lbl?'':' nonum')+'">'+(lbl?'<div class="pt-num">'+lbl+'</div>':'')+'<div><div class="pt-qt">'+q.html+'</div>'+qBody(it,A)+'</div></div>';};
  if(s.nameLine)h+=nameRow();
  var rl=rightLabel();if(rl)h+='<div class="ls-unit">'+esc(rl)+'</div>';
  h+='<div class="ls-target"><span class="ls-tl">I am learning to</span><span class="ls-tline">'+esc(sv('target'))+'</span></div>';
  var wu=by('warmup');if(wu.length){h+='<div class="ls-h ls-warm">Warm Up!</div>';wu.forEach(function(it){h+=qBlock(it,'');});}
  if(sv('lessonNotes')||num(s.notesSpace,0)>0){h+='<div class="ls-notes">Notes</div>';if(sv('lessonNotes'))h+='<div class="ls-ntext">'+textToHtml(s.lessonNotes)+'</div>';if(num(s.notesSpace,0)>0)h+='<div style="height:'+num(s.notesSpace,0)+'in"></div>';}
  if(sv('ecTopic')||sv('ecDef')){h+='<div class="ls-h ls-ec">Essential Concept</div><div class="ls-box">'+(sv('ecTopic')?'<div class="ls-bt">'+esc(sv('ecTopic'))+'</div>':'')+(sv('ecDef')?'<div>'+textToHtml(s.ecDef)+'</div>':'')+'</div>';}
  by('example').forEach(function(it){var c=String((s.concepts||{})[it.q.id]||'').trim();h+='<div class="ls-ex"><span class="ls-exn">Example '+it.exN+'</span>'+(c?' <i>'+esc(c)+'</i>':'')+'</div>'+qBlock(it,'');});
  var sc=String(s.success||'').split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean);
  if(sc.length)h+='<div class="ls-h ls-sc">Success Criteria</div><ul class="ls-ul">'+sc.map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>';
  var pr=by('practice');if(pr.length){h+='<div class="ls-h ls-pr">Practice</div>';pr.forEach(function(it){h+=qBlock(it,it.num);});}
  return h;
}
function keyHtml(items,v){
  var s=state.settings,n=nVersions(),tp=items.reduce(function(a,it){return a+(it.bonus?0:num(it.q.points,0));},0);
  labelItems(items);
  var h='<div class="pt-head"><div><h1>Answer Key'+(n>1?' — Version '+LETTERS[v]:'')+'</h1><div class="pt-sub">'+esc(headerText())+' &nbsp;|&nbsp; '+esc(docTitle())+' &nbsp;|&nbsp; '+items.length+' questions'+(isExamDoc()?' &nbsp;|&nbsp; '+ptsLabel(tp):'')+'</div></div></div><hr class="pt-rule">';
  h+='<table class="pt-key"><thead><tr><th>#</th><th>Answer</th><th></th><th>Points</th>'+(s.keyStd?'<th>Unit · standard · exam</th>':'')+'</tr></thead><tbody>';
  items.forEach(function(it,i){
    var q=it.q,l='',a='';
    if(q.inImage){if(it.answer>=0){l=plain(q.choices[it.answer]);a='<i style="color:#666">choice shown in the question picture</i>';}else a='<i>(no answer set)</i>';}
    else if(isMC(q.type)){if(it.answer>=0){l=it.open?'':letterOf(it.answer);a=it.choices[it.answer]+(it.open?' <i style="color:#666;font-size:9pt">(asked without choices)</i>':'');}else a='<i>(no answer set)</i>';}
    else if(q.type==='tf'){l=q.answer==='T'?'T':q.answer==='F'?'F':'';a=q.answer==='T'?'True':q.answer==='F'?'False':'<i>(no answer set)</i>';}
    else if(q.type==='sa'){a=q.answer?textToHtml(q.answer):'<i>(no key)</i>';}
    else{a=q.answer?textToHtml(q.answer):'<i>Score with your rubric</i>';}
    var ref=[[q.unit,q.section].filter(Boolean).join(', '),q.standard,[q.source,examLabel(q)||(q.source?'':q.ref)].filter(Boolean).join(' ')].filter(Boolean).map(esc).join(' · ');
    if(s.keyNotes&&q.notes)a+='<div class="pt-mynote">Note: '+textToHtml(q.notes)+'</div>';
    h+='<tr><td class="n">'+esc(it.keyLabel)+'</td><td class="l">'+esc(l)+'</td><td>'+a+'</td><td class="p">'+ptsLabel(q.points)+'</td>'+(s.keyStd?'<td class="s">'+ref+'</td>':'')+'</tr>';
  });
  return h+'</tbody></table>';
}
function cssStr(t){return '"'+String(t).replace(/["\\]/g,'').replace(/\n/g,' ')+'"';}
function waitImgs(root){var imgs=$$('img',root).filter(function(i){return !i.complete;});if(!imgs.length)return Promise.resolve();return new Promise(function(res){var left=imgs.length;imgs.forEach(function(i){i.onload=i.onerror=function(){if(--left===0)res();};});setTimeout(res,3000);});}
var printQueue=[];
function printStrip(i,total,label){var st=$('#printStrip');if(!st){st=document.createElement('div');st.id='printStrip';st.className='printstrip';st.setAttribute('role','status');document.body.appendChild(st);}
  if(i==null){st.remove();return;}
  st.innerHTML='<span><b>Printing '+i+' of '+total+':</b> '+esc(label)+'.'+(i<total?' The next print window opens when you close this one.':'')+'</span>'+(i<total?'<button type="button" class="small" id="stopPrint">Stop after this one</button>':'');
  var b=$('#stopPrint');if(b)b.onclick=function(){printQueue=[];st.innerHTML='<span>Stopping after this print window.</span>';};}
function runJobs(jobs){
  printQueue=jobs.slice();
  var root=$('#printRoot'),total=jobs.length,i=0;
  (function next(){
    var j=printQueue.shift();
    if(!j){root.innerHTML='';if(total>1)printStrip(null);return;}
    i++;if(total>1)printStrip(i,total,j.label||'');
    root.innerHTML='<style>'+j.css+'</style>'+j.html+(j.imgs||[]).map(function(u){return '<img class="pre-img" alt="" src="'+u.replace(/"/g,'&quot;')+'">';}).join('');
    var pre=$$('img.pre-img',root).map(function(i){return i.decode?i.decode().catch(function(){}):Promise.resolve();});
    Promise.all(pre).then(function(){return waitImgs(root);}).then(function(){return new Promise(function(r){setTimeout(r,150);});}).then(function(){
      setTimeout(function(){
        var done=false,after=function(){if(done)return;done=true;window.removeEventListener('afterprint',after);setTimeout(next,250);};
        window.addEventListener('afterprint',after);
        window.print();
      },60);
    });
  })();
}
function printJobs(kind){
  var n=nVersions(),s=state.settings,dt=docType(),font=svgFont();
  var versions=[];for(var v=0;v<n;v++)versions.push(buildVersion(v));
  var jobs=[],cur={css:'',html:''},g=pageGeom(),hd=headers();
  var stdFooter=function(name,label){return '@page '+name+'{size:letter;margin:.6in .65in .7in;@bottom-left{content:'+cssStr(label)+';font:9pt Arial,sans-serif;color:#666}@bottom-right{content:"Page " counter(page);font:9pt Arial,sans-serif;color:#666}}';};
  var top=function(x){return '@top-center{content:url("'+svgUrl(x)+'");vertical-align:bottom;padding-bottom:6pt}';};
  var docPage=function(name,v){
    var pn='@bottom-right{content:counter(page);font:11pt '+font+'}',lf=dt==='lesson'?lessonFootSvg():null;
    var first=isExamDoc()?'@bottom-left{content:'+cssStr('v. '+(v+1))+';font:8pt '+font+';color:#777}':'';
    return '@page '+name+'{size:letter;margin:'+g.m+';'+top(hd.rest)+pn+(lf?'@bottom-left{content:url("'+svgUrl(lf)+'");vertical-align:middle}':'')+'}'+
      '@page '+name+':first{'+top(hd.first)+'@bottom-right{content:none}'+(lf?'@bottom-left{content:none}':'')+first+'}';};
  if(kind!=='keys'&&kind!=='acc')versions.forEach(function(items,v){
    var nm='v'+v,sec='<section class="pt pt-version pt-classic pt-'+dt+'" style="page:'+nm+';'+ptStyle()+'">'+testHtml(items,v)+'</section>';
    var css=docPage(nm,v),lf=dt==='lesson'?lessonFootSvg():null,imgs=[svgUrl(hd.first),svgUrl(hd.rest)].concat(lf?[svgUrl(lf)]:[]);
    if(s.perVersion||n===1)jobs.push({css:css,html:sec,imgs:imgs,label:n>1?'Version '+LETTERS[v]:DOC_TYPES[dt]});
    else{cur.css+=css;cur.html+=sec;cur.imgs=imgs;}
  });
  if(cur.html){cur.label='All '+n+' versions';jobs.push(cur);cur={css:'',html:''};}
  if((kind==='acc'||(kind!=='keys'&&accOn()))&&state.selected.length){
    var av=accVersion(),alf=dt==='lesson'?lessonFootSvg():null;
    jobs.push({css:docPage('acc',av),html:'<section class="pt pt-version pt-classic pt-'+dt+accClass()+'" style="page:acc;'+accStyle()+'">'+accHtml()+'</section>',
      imgs:[svgUrl(hd.first),svgUrl(hd.rest)].concat(alf?[svgUrl(alf)]:[]),label:'Accommodated copy'+(n>1?' (Version '+LETTERS[av]+')':'')});
  }
  if(kind==='acc')return jobs;
  if(kind!=='tests'){
    versions.forEach(function(items,v){var nm='k'+v;cur.css+=stdFooter(nm,headerText()+'  —  '+docTitle()+'  —  Answer Key'+(n>1?'  —  Version '+LETTERS[v]:'')+(accOn()&&v===accVersion()?'  (also the accommodated copy)':''));cur.html+='<section class="pt pt-version" style="page:'+nm+';'+ptStyle()+'">'+keyHtml(items,v)+'</section>';});
    cur.label='Answer key'+(n>1?'s':'');jobs.push(cur);
  }
  return jobs;
}
/* Output format: PDF (the print window until the built-in PDF arrives), Word, or Print… */
function outFmt(){return ui.fmt==='docx'||ui.fmt==='tex'||ui.fmt==='print'?ui.fmt:'pdf';}
function fmtNote(){var f=outFmt();
  if(f==='docx')return 'Downloads one Word file you can edit. Each version starts on a new page with its own page numbers.';
  if(f==='tex')return 'Downloads a .zip with the LaTeX file (exam class) and its pictures. Upload the .zip to Overleaf, or compile it with pdfLaTeX.';
  if(f==='pdf')return 'For now, PDF opens your browser’s print window: choose “Save as PDF” as the printer. With several versions, one window opens after another.';
  return 'Opens your browser’s print window. With several versions, one window opens after another.';}
function printNow(kind){
  if(!state.selected.length){toast('Add some questions to the test first.');return;}
  saveTest({printed:true});drawSaved();
  var f=outFmt(),what={docx:'Word file',tex:'LaTeX file'}[f];
  if(what){toast('Making the '+what+'…');
    return EXP.download(f,kind).then(function(r){toast('Downloaded “'+r.name+'” ('+Math.max(1,Math.round(r.size/1024))+' KB).');})
      .catch(function(e){console.error(e);toast('Couldn’t make the '+what+': '+(e&&e.message||e));});}
  runJobs(printJobs(kind));
}
window.__printJobs=printJobs;
var EXP=makeExporter({state:function(){return state;},nVersions:nVersions,testHtml:testHtml,buildVersion:buildVersion,LETTERS:LETTERS,accOn:accOn,accom:accom,accVersion:accVersion,accHtml:accHtml,accSize:accSize,keyHtml:keyHtml,docType:docType,headerText:headerText,docTitle:docTitle,rightLabel:rightLabel,isExamDoc:isExamDoc,lessonTools:lessonTools,lessonCode:lessonCode,lessonSource:lessonSource,num:num,saveFile:saveFile});
window.__tb={version:APP_VERSION,get state(){return state;},set state(v){state=v;},normalize:function(x){return normalize(x);},uid:function(){return uid();},render:function(){render();},ui:function(){return ui;},printJobs:function(k){return printJobs(k);},fn:{parseRef:parseRef,clusterOf:clusterOf,fillMeta:fillMeta,examLabel:examLabel,monthName:monthName,sanitize:sanitize,plain:plain,textToHtml:textToHtml,esc:esc,num:num,ptsLabel:ptsLabel,guessCourse:guessCourse,calcLabel:calcLabel,timeLabel:timeLabel,creditsText:creditsText,partKeyOf:partKeyOf,partKind:partKind,romanVal:romanVal,partDir:partDir,letterOf:letterOf,bmChoices:bmChoices,rng:rng,shuffle:shuffle,buildVersion:buildVersion,labelItems:labelItems,testHtml:testHtml,keyHtml:keyHtml,qBody:qBody,printJobs:printJobs,exp:function(){return EXP;},saveTest:saveTest,openSaved:openSaved,savedDiff:savedDiff,isDirty:isDirty,selQ:selQ,accom:accom,accHtml:accHtml,accStyle:accStyle,accClass:accClass,parseCSV:parseCSV,toCSV:toCSV,fromCSV:fromCSV,parseText:parseText,migrateSettings:migrateSettings,normalize:normalize,autoTitle:autoTitle,docTitle:docTitle,rightLabel:rightLabel,headerText:headerText,lessonCode:lessonCode,lessonSource:lessonSource,lessonTools:lessonTools,roleOf:roleOf,reviewKind:reviewKind,isBonus:isBonus,headerSvg:headerSvg,lessonFootSvg:lessonFootSvg,pageGeom:pageGeom,headers:headers,switchCourse:switchCourse,selectedQs:selectedQs,nVersions:nVersions,totalPts:totalPts,docType:docType,isExamDoc:isExamDoc,persist:persist,idbGet:idbGet,stateKey:stateKey}};

/* ================= CSV ================= */
function parseCSV(text){
  text=text.replace(/^\uFEFF/,'');var rows=[],row=[],f='',q=false;
  for(var i=0;i<text.length;i++){var c=text[i];
    if(q){if(c==='"'){if(text[i+1]==='"'){f+='"';i++;}else q=false;}else f+=c;}
    else if(c==='"')q=true;else if(c===','){row.push(f);f='';}else if(c==='\n'){row.push(f);rows.push(row);row=[];f='';}else if(c!=='\r')f+=c;}
  if(f!==''||row.length){row.push(f);rows.push(row);}
  return rows.filter(function(r){return r.some(function(x){return x.trim();});});
}
var CSV_HEAD=['Course','Type','Bank','Source','Unit','Section','Topic','Subtopic','Cluster','Month','Year','Question #','Reference','Standard','Points','Question','Answer','Choice A','Choice B','Choice C','Choice D','Choice E','Choice F','Lines','Keep choice order','Notes'];
function csvCell(v){v=String(v==null?'':v);return /[",\n\r]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;}
function toCSV(qs){
  var out=[CSV_HEAD.join(',')];
  qs.forEach(function(q){
    var ans=isMC(q.type)?(q.answer>=0?LETTERS[q.answer]:''):q.type==='tf'?(q.answer==='T'?'True':q.answer==='F'?'False':''):(q.answer||'');
    var ch=isMC(q.type)?q.choices.slice(0,6).map(plain):[];while(ch.length<6)ch.push('');
    out.push([q.course||''].concat([{mc:'MC',bm:'Bimodal',tf:'TF',sa:'SA',es:'Open'}[q.type],q.bank,q.source||'',q.unit||'',q.section||'',q.topic,q.subtopic||'',q.cluster||'',q.month||'',q.year||'',q.qnum||'',q.ref||'',q.standard,q.points,plain(q.html),ans].concat(ch).concat([q.type==='sa'||q.type==='es'?(q.lines||''):'',q.lockChoices?'Yes':'',q.notes||''])).map(csvCell).join(','));
  });
  return '\uFEFF'+out.join('\r\n')+'\r\n';
}
function typeFrom(v){v=String(v||'').trim().toLowerCase().replace(/[^a-z]/g,'');
  if(/^(mc|multiplechoice|multiple|m)$/.test(v))return 'mc';if(/^(bm|bimodal|bi)$/.test(v))return 'bm';if(/^(tf|truefalse|true|t)$/.test(v))return 'tf';
  if(/^(sa|shortanswer|short|fillin|fillintheblank|fib|completion|s)$/.test(v))return 'sa';
  if(/^(es|essay|e|open|openresponse|longanswer|extendedresponse|constructedresponse|cr)$/.test(v))return 'es';return null;}
function fromCSV(text,defBank){
  var rows=parseCSV(text);if(!rows.length)return{qs:[],errors:['The file is empty.']};
  var head=rows[0].map(function(h){return h.trim().toLowerCase();});
  function col(names){for(var i=0;i<names.length;i++){var k=head.indexOf(names[i]);if(k>=0)return k;}return -1;}
  var C={type:col(['type','question type']),bank:col(['bank']),topic:col(['topic','chapter','category','tag']),unit:col(['unit']),section:col(['section']),source:col(['source']),course:col(['course']),notes:col(['notes','note','my notes']),sub:col(['subtopic']),cl:col(['cluster']),mo:col(['month']),yr:col(['year']),qn:col(['question #','question number','qnum','q#']),ref:col(['reference','ref']),std:col(['standard','standards']),points:col(['points','pts']),text:col(['question','question text','text','prompt']),answer:col(['answer','correct answer','correct','key']),lines:col(['lines','answer lines']),lock:col(['keep choice order','lock'])};
  var chCols=[];'abcdef'.split('').forEach(function(l){var k=col(['choice '+l,'option '+l,'answer '+l,l]);if(k>=0)chCols.push(k);});
  if(C.text<0)return{qs:[],errors:['Couldn’t find a “Question” column. Download the template to see the expected columns.']};
  var qs=[],errors=[];
  rows.slice(1).forEach(function(r,ri){
    function g(k){return k>=0&&r[k]!=null?String(r[k]).trim():'';}
    var text=g(C.text);if(!text)return;
    var choices=chCols.map(g).filter(Boolean),type=typeFrom(g(C.type)),ans=g(C.answer);
    if(!type)type=choices.length>=2?'mc':/^(t|f|true|false)$/i.test(ans)?'tf':ans?'sa':'es';
    var q={id:uid(),source:g(C.source),course:g(C.course),type:type,unit:g(C.unit),section:g(C.section),notes:g(C.notes),subtopic:g(C.sub),cluster:g(C.cl),ref:g(C.ref),month:g(C.mo)?String(g(C.mo)).padStart(2,'0'):undefined,year:g(C.yr)?(parseInt(g(C.yr),10)<100?2000+parseInt(g(C.yr),10):parseInt(g(C.yr),10)):undefined,qnum:g(C.qn)?parseInt(g(C.qn),10):undefined,bank:g(C.bank)||defBank,topic:g(C.topic),standard:g(C.std),points:num(g(C.points),1),html:textToHtml(text)};
    if(isMC(type)){
      q.choices=choices.map(textToHtml);var a=-1;
      if(/^[A-Ha-h]$/.test(ans))a=ans.toUpperCase().charCodeAt(0)-65;else if(/^\d+$/.test(ans))a=parseInt(ans,10)-1;
      else if(ans)a=choices.findIndex(function(c){return c.toLowerCase()===ans.toLowerCase();});
      if(a>=choices.length)a=-1;q.answer=a;if(type==='bm')q.space=2;q.lockChoices=/^(y|yes|true|1|x)$/i.test(g(C.lock));
      if(choices.length<2)errors.push('Row '+(ri+2)+': multiple choice needs at least 2 choices.');
      if(a<0)errors.push('Row '+(ri+2)+': no correct answer recognized.');
    }else if(type==='tf'){q.answer=/^t/i.test(ans)?'T':/^f/i.test(ans)?'F':'';if(!q.answer)errors.push('Row '+(ri+2)+': answer should be True or False.');}
    else{q.answer=ans;q.lines=Math.max(1,Math.min(40,parseInt(g(C.lines),10)||(type==='sa'?1:8)));if(type==='es')q.answerArea='lines';}
    fillMeta(q);qs.push(q);
  });
  return{qs:qs,errors:errors};
}

/* ================= plain-text import ================= */
function parseText(txt,bank,topic){
  var blocks=txt.replace(/\r/g,'').split(/\n\s*\n/).map(function(b){return b.trim();}).filter(Boolean),qs=[],errors=[];
  blocks.forEach(function(b,bi){
    var ls=b.split('\n').map(function(l){return l.trim();}).filter(Boolean),qText=[],choices=[],ans=-1,answerLine=null,tp=topic||'',points=1,m;
    ls.forEach(function(l){
      if(qText.length&&(m=l.match(/^(\*?)\s*\(?([A-Ha-h1-8])[\.\)]\s+(.*)$/))){
        var idx=/\d/.test(m[2])?parseInt(m[2],10)-1:m[2].toUpperCase().charCodeAt(0)-65;
        if(idx===choices.length){var t=m[3];if(m[1]||/\s\*$/.test(t)||/^\*/.test(t)){ans=choices.length;t=t.replace(/\s*\*$/,'').replace(/^\*\s*/,'');}choices.push(t);return;}
      }
      if((m=l.match(/^(answer|ans|key)\s*[:\-]\s*(.*)$/i)))answerLine=m[2].trim();
      else if((m=l.match(/^(topic|chapter|unit)\s*[:\-]\s*(.*)$/i)))tp=m[2].trim();
      else if((m=l.match(/^(points?|pts)\s*[:\-]\s*([\d.]+)/i)))points=num(m[2],1);
      else if(!choices.length)qText.push(l);
      else choices[choices.length-1]+=' '+l;
    });
    var text=qText.join('\n').replace(/^(q(uestion)?\s*)?\d+\s*[\.\):]\s*/i,'').trim();
    if(!text){errors.push('Block '+(bi+1)+': no question text found.');return;}
    var q={id:uid(),bank:bank,topic:tp,standard:'',points:points,html:textToHtml(text)};
    if(choices.length>=2){
      var tfc=choices.length===2&&/^true$/i.test(choices[0])&&/^false$/i.test(choices[1]);
      if(ans<0&&answerLine){var a=answerLine.match(/^\(?([A-Ha-h1-8])\)?[\.\)]?(\s|$)/);if(a)ans=/\d/.test(a[1])?parseInt(a[1],10)-1:a[1].toUpperCase().charCodeAt(0)-65;else ans=choices.findIndex(function(c){return c.toLowerCase()===answerLine.toLowerCase();});}
      if(tfc){q.type='tf';q.answer=ans===0?'T':ans===1?'F':(answerLine&&/^t/i.test(answerLine)?'T':answerLine&&/^f/i.test(answerLine)?'F':'');}
      else{q.type='mc';q.choices=choices.map(textToHtml);q.answer=ans<choices.length?ans:-1;q.lockChoices=false;if(q.answer<0)errors.push('“'+text.slice(0,40)+'…”: no correct answer marked.');}
    }else if(answerLine&&/^(t|f|true|false)$/i.test(answerLine)){q.type='tf';q.answer=/^t/i.test(answerLine)?'T':'F';}
    else if(answerLine){q.type='sa';q.answer=answerLine;q.lines=1;}
    else{q.type='es';q.answer='';q.lines=8;q.answerArea='lines';}
    qs.push(q);
  });
  return{qs:qs,errors:errors};
}

/* ================= downloads ================= */
function saveFile(name,data,type){
  var blob=data instanceof Blob?data:new Blob([data],{type:type||'application/octet-stream'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(function(){URL.revokeObjectURL(a.href);a.remove();},2000);
}
function fileBase(t){return String(t||'Test').replace(/[\\\/:*?"<>|]+/g,'').replace(/\s+/g,' ').trim().slice(0,80)||'Test';}

/* ================= shell ================= */
var root=document.getElementById('root');
function shell(){
  root.innerHTML='<header class="top"><div class="brand"><span class="mark" aria-hidden="true">'+BRAND_SVG+'</span>ALittleCandleTestBuilder<span class="ver" title="Version">v'+esc(APP_VERSION)+'</span></div><label class="coursesel"><span>Course</span><select id="courseSel"></select></label><nav class="tabs" id="tabs" aria-label="Sections"></nav><button type="button" class="ghost small dispbtn" popovertarget="dispPop" title="Display settings: font, text size, contrast"><span aria-hidden="true" class="aa">Aa</span> Display</button><div popover id="dispPop" class="disp"></div><button type="button" class="ghost small helpbtn" popovertarget="helpPop">Help</button><div popover id="helpPop" class="disp helppop" role="dialog" aria-labelledby="helpT">'+HELP_HTML+'</div><div class="savebox"><span id="status"></span><span id="cloud"></span></div></header><div id="bannerSlot"></div><main id="main"></main><div class="toast" id="toast" role="status" aria-live="polite"></div><div id="modal"></div>';
}
function renderCourses(){
  var cs=$('#courseSel');if(!cs)return;
  cs.innerHTML=state.courses.map(function(c){var n=state.questions.filter(function(q){return q.course===c;}).length;return '<option value="'+esc(c)+'"'+(c===state.course?' selected':'')+'>'+esc(c)+(n?' ('+n+')':'')+'</option>';}).join('')+'<option value="__manage">Add or rename courses…</option>';
  cs.onchange=function(){if(this.value==='__manage'){this.value=state.course;ui.tab='io';render();setTimeout(function(){var c=$('#coursesCard');if(c)c.scrollIntoView({behavior:'smooth'});},50);return;}switchCourse(this.value);};
}
function switchCourse(name){
  if(name===state.course)return;
  state.courseTests[state.course]={settings:state.settings,selected:state.selected};
  var t=state.courseTests[name];
  state.course=name;
  state.settings=migrateSettings(Object.assign({},DEFAULT_SETTINGS,{course:name,roles:{},concepts:{},bonus:{},seed:Math.floor(Math.random()*2147483647)},t?t.settings:{}),name);
  state.selected=t&&Array.isArray(t.selected)?t.selected.filter(function(id){var q=selQ(id);return q&&(q.course===name||!byId(id));}):[];
  ['q','bank','topic','type','std','unit','section','source','year','month','cluster','sub','pickBank','pickTopic','pickType','pickUnit','pickSection'].forEach(function(k){ui[k]='';});
  ui.limit=40;saveUi();changed();render();toast('Switched to '+name+'.');
}
function renderTabs(){
  renderCourses();
  var t=[['bank','Question bank',cq().length],['build','Build & print',state.selected.length],['io','Import & backup',null]];
  $('#tabs').innerHTML=t.map(function(x){return '<button data-tab="'+x[0]+'" class="'+(ui.tab===x[0]?'on':'')+'"'+(ui.tab===x[0]?' aria-current="page"':'')+'>'+esc(x[1])+(x[2]!=null?'<span class="count">'+x[2]+'</span>':'')+'</button>';}).join('');
  $$('#tabs button').forEach(function(b){b.onclick=function(){ui.tab=b.dataset.tab;ui.limit=40;saveUi();render();window.scrollTo(0,0);};});
}
function render(){renderTabs();if(ui.tab==='build')renderBuild();else if(ui.tab==='io')renderIO();else renderBank();}

/* ================= bank tab ================= */
function opts(list,sel,allLabel){return '<option value="">'+esc(allLabel)+'</option>'+list.map(function(x){return '<option value="'+esc(x)+'"'+(sel===x?' selected':'')+'>'+esc(x)+'</option>';}).join('');}
function typeOpts(sel,allLabel){return '<option value="">'+allLabel+'</option>'+TYPE_ORDER.map(function(t){return '<option value="'+t+'"'+(sel===t?' selected':'')+'>'+TYPES[t]+'</option>';}).join('');}
/* Filters: search + unit/section/topic/standard always; the rest behind "More filters". */
var MORE_F=['bank','type','year','month','cluster','sub','source'];
var F_LABEL={q:'Search',unit:'Unit',section:'Section',topic:'Topic',std:'Standard',bank:'Bank',type:'Type',year:'Year',month:'Month',cluster:'Cluster',sub:'Subtopic',source:'Source'};
function fValue(k,v){if(v==='__none')return '(none)';if(k==='type')return TYPES[v]||v;if(k==='month')return monthName(v)||v;if(k==='q')return '“'+v+'”';return v;}
function activeFilters(){return Object.keys(F_LABEL).filter(function(k){return ui[k]!==''&&ui[k]!=null;});}
function moreCount(){return MORE_F.filter(function(k){return ui[k];}).length;}
function moreFilters(){
  if(!ui.moreF)return '';
  var yrs=uniq('year'),mos=uniq('month'),cls=uniq('cluster'),subs=uniq('subtopic'),banks=uniq('bank'),srcs=uniq('source');
  var h='<div class="toolbar morebar" id="moreBar">';
  if(banks.length>1)h+='<select id="fb" aria-label="Bank">'+opts(banks,ui.bank,'All banks')+'</select>';
  h+='<select id="fy" aria-label="Type">'+typeOpts(ui.type,'All types')+'</select>';
  if(yrs.length)h+='<select id="fyr" aria-label="Year"><option value="">All years</option>'+yrs.map(function(y){return '<option value="'+esc(y)+'"'+(String(ui.year)===String(y)?' selected':'')+'>'+esc(y)+'</option>';}).join('')+'</select>';
  if(mos.length)h+='<select id="fmo" aria-label="Month"><option value="">All months</option>'+mos.map(function(m){return '<option value="'+esc(m)+'"'+(ui.month===m?' selected':'')+'>'+esc(monthName(m)||m)+'</option>';}).join('')+'</select>';
  if(cls.length)h+='<select id="fcl" aria-label="Cluster">'+opts(cls,ui.cluster,'All clusters')+'</select>';
  if(subs.length)h+='<select id="fsub" aria-label="Subtopic">'+opts(subs,ui.sub,'All subtopics')+'</select>';
  if(srcs.length)h+='<select id="fsrc" aria-label="Source">'+opts(srcs,ui.source,'All sources')+'</select>';
  return h+'</div>';
}
function chipsHtml(){var a=activeFilters();if(!a.length)return '';
  return '<div class="chips" aria-label="Active filters">'+a.map(function(k){return '<button type="button" class="chip" data-unf="'+k+'" aria-label="Remove filter '+esc(F_LABEL[k])+': '+esc(fValue(k,ui[k]))+'"><span>'+esc(F_LABEL[k])+':</span> '+esc(fValue(k,ui[k]))+' <span aria-hidden="true">✕</span></button>';}).join('')+'<button type="button" class="small ghost" id="clearF">Clear filters</button></div>';}
function monthOrder(m){var n=parseInt(m,10);return isNaN(n)?0:n;}
function sortList(list){
  if(ui.sort==='exam')return list.slice().sort(function(a,b){return (num(a.year,0)-num(b.year,0))||(monthOrder(a.month)-monthOrder(b.month))||(num(a.qnum,0)-num(b.qnum,0));});
  if(ui.sort==='std')return list.slice().sort(function(a,b){return String(a.standard).localeCompare(String(b.standard),undefined,{numeric:true})||(num(a.year,0)-num(b.year,0));});
  if(ui.sort==='unit')return list.slice().sort(function(a,b){return String(a.unit||'~').localeCompare(String(b.unit||'~'),undefined,{numeric:true})||String(a.section||'~').localeCompare(String(b.section||'~'),undefined,{numeric:true});});
  return list;
}
function unitSelect(id,sel,allLabel,field){field=field||'unit';var u=uniq(field);if(!u.length)return '';return '<select id="'+id+'" aria-label="'+(field==='section'?'Section':'Unit')+'"><option value="">'+esc(allLabel)+'</option>'+u.map(function(x){return '<option value="'+esc(x)+'"'+(sel===x?' selected':'')+'>'+esc(/^\d/.test(x)?(field==='section'?'Section ':'Unit ')+x:x)+'</option>';}).join('')+(state.questions.some(function(q){return !q[field];})?'<option value="__none"'+(sel==='__none'?' selected':'')+'>(no '+field+')</option>':'')+'</select>';}
function matches(q,f){
  if(f.bank&&q.bank!==f.bank)return false;
  if(f.topic&&q.topic!==f.topic)return false;
  if(f.unit&&(f.unit==='__none'?q.unit:q.unit!==f.unit))return false;
  if(f.section&&(f.section==='__none'?q.section:q.section!==f.section))return false;
  if(f.year&&String(q.year)!==String(f.year))return false;
  if(f.month&&q.month!==f.month)return false;
  if(f.cluster&&q.cluster!==f.cluster)return false;
  if(f.sub&&q.subtopic!==f.sub)return false;
  if(f.source&&q.source!==f.source)return false;
  if(f.type&&q.type!==f.type)return false;
  if(f.std&&String(q.standard).split(/,\s*/).indexOf(f.std)<0)return false;
  if(f.q){var hay=(plainQ(q).all+' '+q.topic+' '+q.standard+' '+(q.ref||'')+' '+(q.subtopic||'')+' '+(q.unit||'')+' '+(q.section||'')+' '+(q.notes||'')+' '+(q.cluster||'')+' '+examLabel(q)+' '+(q.source||'')+' '+(q.searchText||'')).toLowerCase();var words=f.q.toLowerCase().split(/\s+/).filter(Boolean);for(var i=0;i<words.length;i++)if(hay.indexOf(words[i])<0)return false;}
  return true;
}
function filtered(){return cq().filter(function(q){return matches(q,ui);});}
function qCard(q){
  var body='<div class="qbody">'+q.html+'</div>';
  if(q.inImage)body+='<div class="keyline">Choices are in the picture · Answer: <b>'+(q.answer>=0?esc(plain(q.choices[q.answer])):'not set')+'</b></div>';
  else if(isMC(q.type))body+='<ol class="choices qbody">'+q.choices.map(function(c,i){return '<li class="'+(i===q.answer?'correct':'')+'"><b>'+LETTERS[i]+'.</b><span>'+c+'</span></li>';}).join('')+'</ol>'+(q.answer<0?'<div class="keyline" style="color:var(--danger)">No correct answer set</div>':'');
  else if(q.type==='tf')body+='<div class="keyline">Answer: <b>'+(q.answer==='T'?'True':q.answer==='F'?'False':'—')+'</b></div>';
  else if(q.answer)body+='<div class="keyline">'+(q.type==='es'?'Key notes':'Answer')+': <b>'+esc(q.answer)+'</b></div>';
  if(q.notes)body+='<div class="mynote"><b>My note:</b> '+textToHtml(q.notes)+'</div>';
  var meta='<span class="badge '+q.type+'">'+TYPES[q.type]+'</span>'+(q.unit||q.section?'<span class="tag unit">'+esc([q.unit&&(/^\d/.test(q.unit)?'Unit '+q.unit:q.unit),q.section&&(/^\d/.test(q.section)?'Sec '+q.section:q.section)].filter(Boolean).join(' · '))+'</span>':'')+(q.bank?'<span class="tag" title="Bank">'+esc(q.bank)+'</span>':'')+(q.topic?'<span class="tag" title="Topic">'+esc(q.topic)+'</span>':'')+(q.source?'<span class="tag src" title="Source">'+esc(q.source)+'</span>':'')+(q.subtopic?'<span class="tag" title="Subtopic">'+esc(q.subtopic)+'</span>':'')+(q.standard?'<span title="Standard">'+esc(q.standard)+'</span>':'')+(q.cluster?'<span title="Cluster">'+esc(q.cluster)+'</span>':'')+(examLabel(q)?'<span class="tag exam" title="Exam and question number">'+esc(examLabel(q))+'</span>':'')+(q.ref?'<span title="Reference">'+esc(q.ref)+'</span>':'')+'<span>'+ptsLabel(q.points)+'</span>';
  return '<li class="qcard'+(isSel(q.id)?' on':'')+'"><label class="pick" title="Put on test"><input type="checkbox" data-pick="'+q.id+'"'+(isSel(q.id)?' checked':'')+' aria-label="Put on test: '+esc(plainQ(q).t.slice(0,80))+'"></label><div><div class="qmeta">'+meta+'</div>'+body+'</div><div class="qactions"><button class="small ghost" data-edit="'+q.id+'">Edit</button><button class="small ghost" data-dup="'+q.id+'">Copy</button><button class="small ghost" data-del="'+q.id+'">Delete</button></div></li>';
}
function renderBank(){
  var main=$('#main');
  if(!cq().length){
    main.innerHTML='<div class="empty"><b>No '+esc(state.course)+' questions yet</b>Bring them in from ExamView banks (.bnk), a Word test (.docx), a PDF, a spreadsheet, or by pasting text, or write them one at a time.<div class="actions" style="justify-content:center;margin-top:14px"><button class="primary" id="goImport">Import questions</button><button id="newQ">+ New question</button></div></div>';
    $('#newQ').onclick=function(){openEditor(null);};$('#goImport').onclick=function(){ui.tab='io';render();};return;
  }
  var banks=uniq('bank');
  var mc=moreCount();
  main.innerHTML='<div class="toolbar"><input type="search" id="fq" placeholder="Search questions…" aria-label="Search questions" value="'+esc(ui.q)+'">'+unitSelect('fu',ui.unit,'All units')+unitSelect('fsec',ui.section,'All sections','section')+'<select id="ft" aria-label="Topic">'+opts(uniq('topic'),ui.topic,'All topics')+'</select><select id="fs" aria-label="Standard">'+opts(uniq('standard'),ui.std,'All standards')+'</select><button type="button" class="ghost" id="moreF" aria-expanded="'+(ui.moreF?'true':'false')+'" aria-controls="moreBar">More filters'+(mc?' <span class="count">'+mc+'</span>':'')+'</button><span class="spacer"></span><button class="primary" id="newQ">+ New question</button></div>'+moreFilters()+'<div id="chips"></div><div class="subbar" id="subbar"></div><ul class="qlist" id="qlist"></ul><div class="more" id="more"></div>';
  $('#moreF').onclick=function(){ui.moreF=!ui.moreF;saveUi();renderBank();var b=$('#moreF');if(b)b.focus();};
  $('#fq').oninput=function(){ui.q=this.value;ui.limit=40;saveUi();drawList();};
  if($('#fb'))$('#fb').onchange=function(){ui.bank=this.value;ui.limit=40;saveUi();drawList();};
  if($('#fu'))$('#fu').onchange=function(){ui.unit=this.value;ui.limit=40;saveUi();drawList();};
  if($('#fsec'))$('#fsec').onchange=function(){ui.section=this.value;ui.limit=40;saveUi();drawList();};
  $('#ft').onchange=function(){ui.topic=this.value;ui.limit=40;saveUi();drawList();};
  $('#fs').onchange=function(){ui.std=this.value;ui.limit=40;saveUi();drawList();};
  if($('#fy'))$('#fy').onchange=function(){ui.type=this.value;ui.limit=40;saveUi();drawList();};
  $('#newQ').onclick=function(){openEditor(null);};
  [['fyr','year'],['fmo','month'],['fcl','cluster'],['fsub','sub'],['fsrc','source']].forEach(function(p){var el=$('#'+p[0]);if(el)el.onchange=function(){ui[p[1]]=this.value;ui.limit=40;saveUi();drawList();};});
  drawList();
}
function drawList(){
  var list=sortList(filtered()),on=list.filter(function(q){return isSel(q.id);}).length;
  var ch=$('#chips');if(ch){ch.innerHTML=chipsHtml();
    $$('[data-unf]',ch).forEach(function(b){b.onclick=function(){ui[b.dataset.unf]='';ui.limit=40;saveUi();renderBank();var f=$('#fq');if(f)f.focus();};});
    if($('#clearF'))$('#clearF').onclick=function(){activeFilters().forEach(function(k){ui[k]='';});ui.limit=40;saveUi();renderBank();var f=$('#fq');if(f)f.focus();};
    var mb=$('#moreF'),mc=moreCount();if(mb)mb.innerHTML='More filters'+(mc?' <span class="count">'+mc+'</span>':'');}
  $('#subbar').innerHTML='<span>Showing '+list.length+' of '+cq().length+'</span><span>·</span><span id="onCount">'+state.selected.length+' on the test</span><label class="sortby">Sort <select id="fsort"><option value="bank"'+(ui.sort==='bank'?' selected':'')+'>Bank order</option><option value="exam"'+(ui.sort==='exam'?' selected':'')+'>Exam date, then question #</option><option value="std"'+(ui.sort==='std'?' selected':'')+'>Standard</option><option value="unit"'+(ui.sort==='unit'?' selected':'')+'>Unit, then section</option></select></label>'+(list.length?'<span class="spacer"></span><span id="unitBox"><button class="small" id="setUnit">Set unit / section for these '+list.length+'…</button></span><button class="small" id="addShown">'+(on===list.length?'Take shown off test':'Add all '+list.length+' shown to test')+'</button>':'');
  $('#fsort').onchange=function(){ui.sort=this.value;ui.limit=40;saveUi();drawList();};
  var su=$('#setUnit');if(su)su.onclick=function(){
    var box=$('#unitBox');box.innerHTML='<input type="text" id="unitIn" list="unitList" placeholder="Unit (blank = keep)" style="width:150px;padding:4px 8px"><datalist id="unitList">'+uniq('unit').map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist> <input type="text" id="secIn" list="secList" placeholder="Section (blank = keep)" style="width:160px;padding:4px 8px"><datalist id="secList">'+uniq('section').map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist> <button class="small primary" id="unitGo">Apply to '+list.length+'</button> <button class="small ghost" id="unitX">Cancel</button>';
    var inp=$('#unitIn');inp.focus();
    var go=function(){var v=inp.value.trim(),sv=$('#secIn').value.trim();if(!v&&!sv){toast('Type a unit, a section, or both.');return;}
      var prev=list.map(function(q){return [q,q.unit,q.section];});list.forEach(function(q){if(v)q.unit=v;if(sv)q.section=sv;});changed();renderBank();
      toast('Updated '+list.length+' question'+(list.length>1?'s':'')+': '+[v&&('unit “'+v+'”'),sv&&('section “'+sv+'”')].filter(Boolean).join(', ')+'.',function(){prev.forEach(function(p){p[0].unit=p[1];p[0].section=p[2];});changed();renderBank();});};
    $('#unitGo').onclick=go;$('#unitX').onclick=drawList;inp.onkeydown=$('#secIn').onkeydown=function(e){if(e.key==='Enter')go();if(e.key==='Escape')drawList();};
  };
  var as=$('#addShown');if(as)as.onclick=function(){
    if(on===list.length){var ids={};list.forEach(function(q){ids[q.id]=1;});state.selected=state.selected.filter(function(id){return !ids[id];});}
    else list.forEach(function(q){if(!isSel(q.id))state.selected.push(q.id);});
    changed();renderTabs();drawList();
  };
  var ql=$('#qlist'),shown=list.slice(0,ui.limit);
  ql.innerHTML=list.length?shown.map(qCard).join(''):'<div class="empty"><b>No matches</b>Try a different search or filter.</div>';
  $('#more').innerHTML=list.length>ui.limit?'<button id="moreBtn">Show more ('+(list.length-ui.limit)+' left)</button>':'';
  if($('#moreBtn'))$('#moreBtn').onclick=function(){ui.limit+=60;drawList();};
  $$('[data-pick]',ql).forEach(function(cb){cb.onchange=function(){var id=cb.dataset.pick;if(cb.checked){if(!isSel(id))state.selected.push(id);}else state.selected=state.selected.filter(function(x){return x!==id;});cb.closest('.qcard').classList.toggle('on',cb.checked);changed();renderTabs();$('#onCount').textContent=state.selected.length+' on the test';};});
  $$('[data-edit]',ql).forEach(function(b){b.onclick=function(){openEditor(byId(b.dataset.edit));};});
  $$('[data-dup]',ql).forEach(function(b){b.onclick=function(){var q=byId(b.dataset.dup);var c=JSON.parse(JSON.stringify(q));c.id=uid();state.questions.splice(state.questions.indexOf(q)+1,0,c);changed();renderTabs();drawList();toast('Copied. Edit the copy to make a variation.');};});
  $$('[data-del]',ql).forEach(function(b){b.onclick=function(){
    if(!b.classList.contains('danger')){b.classList.add('danger');b.textContent='Confirm';setTimeout(function(){if(document.body.contains(b)){b.classList.remove('danger');b.textContent='Delete';}},3000);return;}
    var id=b.dataset.del,q=byId(id),idx=state.questions.indexOf(q),si=state.selected.indexOf(id);
    state.questions.splice(idx,1);if(si>=0)state.selected.splice(si,1);changed();renderTabs();drawList();
    toast('Question deleted.',function(){state.questions.splice(idx,0,q);if(si>=0)state.selected.splice(si,0,id);changed();render();});
  };});
}

/* ================= editor ================= */
var ed=null,edIsNew=false,lastNew={};
var SYMS=['∠','△','≅','∼','⊥','∥','°','π','√','≠','≤','≥','±','×','÷','θ','′'];
var SYM_NAMES={'∠':'angle','△':'triangle','≅':'congruent','∼':'similar','⊥':'perpendicular','∥':'parallel','°':'degree','π':'pi','√':'square root','≠':'not equal','≤':'less than or equal','≥':'greater than or equal','±':'plus or minus','×':'times','÷':'divided by','θ':'theta','′':'prime'};
function symbar(){var first=true;function ti(){var t=first?'0':'-1';first=false;return ' tabindex="'+t+'"';}
  return '<div class="symbar" role="toolbar" aria-label="Symbols and math formatting (use the arrow keys)">'+SYMS.map(function(s){return '<button type="button" data-sym="'+s+'"'+ti()+' aria-label="'+(SYM_NAMES[s]||s)+'" title="'+(SYM_NAMES[s]||s)+'">'+s+'</button>';}).join('')+'<span class="sep"></span>'+
  [['m-ov','Segment: select letters first','<span class="m-ov">AB</span>'],['m-line','Line: select letters first','<span class="m-acc m-line">AB</span>'],['m-ray','Ray: select letters first','<span class="m-acc m-ray">AB</span>'],['m-arc','Arc: select letters first','<span class="m-acc m-arc">AB</span>'],['sup','Exponent: select text first','x²'],['sub','Subscript: select text first','x₂']].map(function(w){return '<button type="button" data-wrap="'+w[0]+'" title="'+w[1]+'" aria-label="'+w[1]+'"'+ti()+'>'+w[2]+'</button>';}).join('')+
  '<span class="sep"></span><span class="filebtn"><button type="button" tabindex="-1" aria-hidden="true">Picture…</button><input type="file" accept="image/*" data-pic tabindex="-1" aria-label="Insert a picture"></span></div>';}
function wireToolbar(bar){var items=$$('[data-sym],[data-wrap],[data-pic]',bar);
  bar.addEventListener('keydown',function(e){var i=items.indexOf(document.activeElement);if(i<0)return;var j={ArrowRight:i+1,ArrowLeft:i-1,Home:0,End:items.length-1}[e.key];if(j==null)return;e.preventDefault();j=(j+items.length)%items.length;items[i].tabIndex=-1;items[j].tabIndex=0;items[j].focus();});
  items.forEach(function(it){it.addEventListener('focus',function(){items.forEach(function(x){x.tabIndex=x===it?0:-1;});});});}
var lastRich=null;
function wireRich(container){
  $$('.rich',container).forEach(function(el){
    el.addEventListener('focus',function(){lastRich=el;});
    el.addEventListener('paste',function(e){
      var cd=e.clipboardData;if(!cd)return;
      var files=Array.prototype.filter.call(cd.files||[],function(f){return /^image\//.test(f.type);});
      e.preventDefault();
      if(files.length){insertPicture(files[0],el);return;}
      var t=cd.getData('text/plain');document.execCommand('insertText',false,t);
    });
    el.addEventListener('drop',function(e){var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];if(f&&/^image\//.test(f.type)){e.preventDefault();insertPicture(f,el);}});
  });
  $$('[data-sym]',container).forEach(function(b){b.onmousedown=function(e){e.preventDefault();};b.onclick=function(){var el=targetRich(b);if(!el)return;el.focus();document.execCommand('insertText',false,b.dataset.sym);};});
  $$('[data-wrap]',container).forEach(function(b){b.onmousedown=function(e){e.preventDefault();};b.onclick=function(){
    var el=targetRich(b),sel=window.getSelection();if(!el||!sel.rangeCount)return;
    var r=sel.getRangeAt(0);if(!el.contains(r.commonAncestorContainer)||r.collapsed){toast('Select the text first, then click the button.');return;}
    var w=b.dataset.wrap,node=(w==='sup'||w==='sub')?document.createElement(w):document.createElement('span');
    if(w!=='sup'&&w!=='sub')node.className=(w==='m-ov'?'m-ov':'m-acc '+w);
    node.appendChild(r.extractContents());r.insertNode(node);sel.removeAllRanges();
  };});
  $$('.symbar',container).forEach(wireToolbar);
  $$('[data-pic]',container).forEach(function(inp){inp.onchange=function(){var f=inp.files&&inp.files[0];var el=targetRich(inp);inp.value='';if(f&&el)insertPicture(f,el);};});
}
function targetRich(btn){var box=btn.closest('[data-richbox]');var el=box?$('.rich',box):null;if(!el&&lastRich&&document.body.contains(lastRich))el=lastRich;return el;}
function insertPicture(file,el){
  var rd=new FileReader();rd.onload=function(){
    var im=new Image();im.onload=function(){
      var maxW=1400,w=im.width,h=im.height;if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
      var cv=document.createElement('canvas');cv.width=w;cv.height=h;var cx=cv.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,w,h);cx.drawImage(im,0,0,w,h);
      var url=/png|gif/.test(file.type)?cv.toDataURL('image/png'):cv.toDataURL('image/jpeg',.88);
      var inches=Math.min(6.5,w/150);
      el.focus();document.execCommand('insertHTML',false,'<img class="q-img" src="'+url+'" style="width:'+inches.toFixed(2)+'in">');
    };im.src=rd.result;
  };rd.readAsDataURL(file);
}
function richBox(id,html,ph,big){return '<div data-richbox>'+symbar()+'<div class="rich'+(big?' big':'')+'" contenteditable="true" id="'+id+'" data-ph="'+esc(ph)+'">'+(html||'')+'</div></div>';}
function openEditor(q){
  edIsNew=!q;
  ed=q?JSON.parse(JSON.stringify(q)):{id:uid(),type:lastNew.type||'mc',bank:lastNew.bank||ui.bank||'My questions',unit:lastNew.unit||(ui.unit&&ui.unit!=='__none'?ui.unit:''),section:lastNew.section||(ui.section&&ui.section!=='__none'?ui.section:''),topic:lastNew.topic||'',standard:lastNew.standard||'',points:lastNew.points||1,html:'',choices:['','','',''],answer:-1,lockChoices:false,lines:1,answerArea:'lines',space:3};
  if(isMC(ed.type)&&!ed.choices)ed.choices=['','','',''];
  $('#modal').innerHTML='<div class="overlay" id="ov"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlgT"><h2 id="dlgT">'+(edIsNew?'New question':'Edit question')+'</h2>'+
    '<div class="row4 ed-main"><label><span class="lbl">Type</span><select id="e-type">'+TYPE_ORDER.map(function(t){return '<option value="'+t+'"'+(ed.type===t?' selected':'')+'>'+TYPES[t]+'</option>';}).join('')+'</select></label><label><span class="lbl">Points</span><input type="number" id="e-pts" min="0" step="0.5" value="'+esc(ed.points)+'"></label><label><span class="lbl">Unit</span><input type="text" id="e-unit" list="unitList2" value="'+esc(ed.unit||'')+'" placeholder="e.g. Unit 3"><datalist id="unitList2">'+uniq('unit').map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label><label><span class="lbl">Section</span><input type="text" id="e-sec" list="secList2" value="'+esc(ed.section||'')+'" placeholder="e.g. 3.2"><datalist id="secList2">'+uniq('section').map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label><label><span class="lbl">Standard</span><input type="text" id="e-std" value="'+esc(ed.standard)+'" placeholder="e.g. G.CO.A.2"></label></div>'+
    '<span class="lbl">Question</span>'+richBox('e-text',ed.html,'Type the question. Use the buttons for symbols, segments and pictures.',true)+
    '<div id="e-spec" style="margin-top:14px"></div>'+
    '<details class="fold ed-more" id="e-moreD"'+(edMoreOpen(ed)?' open':'')+'><summary>More details <span class="hint">course, bank, topic, part, my notes, reference, source…</span></summary>'+
    '<div class="row4" style="grid-template-columns:1fr 1.2fr 1.2fr .8fr"><label><span class="lbl">Course</span><select id="e-course">'+state.courses.map(function(c){return '<option'+((ed.course||state.course)===c?' selected':'')+'>'+esc(c)+'</option>';}).join('')+'</select></label><label><span class="lbl">Bank</span><input type="text" id="e-bank" list="bankList" value="'+esc(ed.bank)+'"><datalist id="bankList">'+uniq('bank').map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label><label><span class="lbl">Topic</span><input type="text" id="e-topic" list="topicList" value="'+esc(ed.topic)+'"><datalist id="topicList">'+uniq('topic').map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label><label><span class="lbl">Part</span><input type="text" id="e-part" list="partList" value="'+esc(ed.part||'')+'" placeholder="e.g. Part II"><datalist id="partList">'+uniq('part').map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label></div>'+
    '<div class="row4" style="grid-template-columns:1fr 1fr 2fr"><label><span class="lbl">Subtopic</span><input type="text" id="e-sub" list="subList" value="'+esc(ed.subtopic||'')+'"><datalist id="subList">'+uniq('subtopic').map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label><label><span class="lbl">Cluster</span><input type="text" id="e-cl" list="clList" value="'+esc(ed.cluster||'')+'" placeholder="e.g. G.CO.A"><datalist id="clList">'+uniq('cluster').map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label><label><span class="lbl">My notes <span class="hint" style="font-weight:400">— never printed on tests</span></span><input type="text" id="e-notes" value="'+esc(ed.notes||'')+'" placeholder="e.g. good warm-up; students mix up arcs"></label></div>'+
    '<div class="row4" style="grid-template-columns:1fr 1.5fr .9fr .7fr .7fr auto"><label><span class="lbl">Reference</span><input type="text" id="e-ref" value="'+esc(ed.ref||'')+'" placeholder="MMYYQQ, e.g. 062504"></label><label><span class="lbl">Source</span><input type="text" id="e-src" list="srcList" value="'+esc(ed.source||'')+'" placeholder="e.g. June 2025 Regents"><datalist id="srcList">'+uniq('source').map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label><label><span class="lbl">Month</span><select id="e-mo"><option value="">—</option>'+['01','06','08'].concat(ed.month&&['01','06','08'].indexOf(ed.month)<0?[ed.month]:[]).map(function(m){return '<option value="'+m+'"'+(ed.month===m?' selected':'')+'>'+m+' · '+monthName(m)+'</option>';}).join('')+'</select></label><label><span class="lbl">Year</span><input type="number" id="e-yr" min="1990" max="2099" value="'+esc(ed.year||'')+'" placeholder="2026"></label><label><span class="lbl">Question #</span><input type="number" id="e-qn" min="1" max="36" value="'+esc(ed.qnum||'')+'"></label><div style="align-self:end"><button type="button" class="small" id="e-fromref">Fill from reference</button></div></div></details>'+
    '<p class="err" id="e-err"></p><div id="e-confirm" class="confirm-bar" role="alert" hidden></div><div class="dlg-actions"><span class="hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> saves</span><span class="spacer"></span><button id="e-cancel">Cancel</button>'+(edIsNew?'<button id="e-more">Save &amp; add another</button>':'')+'<button class="primary" id="e-save">Save</button></div></div></div>';
  wireRich($('#modal'));
  $('#e-type').onchange=function(){collect();var t=this.value;ed.type=t;
    if(isMC(t)){if(t==='bm')ed.space=ed.space&&ed.space<=6?ed.space:2;if(!Array.isArray(ed.choices)||!ed.choices.length)ed.choices=['','','',''];if(typeof ed.answer!=='number')ed.answer=-1;}
    else if(t==='tf'){if(ed.answer!=='T'&&ed.answer!=='F')ed.answer='';}
    else{if(typeof ed.answer!=='string')ed.answer='';if(t==='sa')ed.lines=ed.lines&&ed.lines<=4?ed.lines:1;else{ed.lines=ed.lines&&ed.lines>=3?ed.lines:8;ed.answerArea=ed.answerArea||'lines';}}
    drawSpec();};
  $('#e-fromref').onclick=function(){var p=parseRef($('#e-ref').value);if(!p){toast('The reference doesn’t start with MMYYQQ (like 062504), so there’s nothing to read.');return;}if(p.month)$('#e-mo').value=p.month;$('#e-yr').value=p.year;$('#e-qn').value=p.qnum;};
  $('#e-std').addEventListener('change',function(){var c=$('#e-cl');if(!c.value.trim())c.value=clusterOf(this.value);});
  $('#e-ref').addEventListener('change',function(){var p=parseRef(this.value);if(!p)return;if(!$('#e-mo').value&&p.month)$('#e-mo').value=p.month;if(!$('#e-yr').value)$('#e-yr').value=p.year;if(!$('#e-qn').value)$('#e-qn').value=p.qnum;});
  $('#e-cancel').onclick=requestClose;$('#e-save').onclick=function(){commitEditor(false);};
  if($('#e-more'))$('#e-more').onclick=function(){commitEditor(true);};
  $('#ov').onmousedown=function(e){if(e.target.id==='ov'){e.preventDefault();requestClose();}};
  $('#ov').onkeydown=function(e){if(e.key==='Tab'){var f=$$('.dialog button:not([disabled]),.dialog input:not([tabindex="-1"]),.dialog select,.dialog textarea,.dialog [contenteditable="true"],.dialog [tabindex="0"]').filter(function(x){return x.offsetParent!==null;});if(f.length){var a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus();}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus();}}}if(e.key==='Escape'){e.preventDefault();if(!$('#e-confirm').hidden)hideDiscard();else requestClose();}if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();commitEditor(false);}};
  drawSpec();collect();edSnap=JSON.stringify(ed);edReturn=q?q.id:null;caretToEnd($('#e-text'));
}
function caretToEnd(el){el.focus();var r=document.createRange();r.selectNodeContents(el);r.collapse(false);var sl=window.getSelection();sl.removeAllRanges();sl.addRange(r);}
/* "More details" starts open when any of its fields has something in it. */
function edMoreOpen(q){return !!(q.topic||q.part||q.subtopic||q.cluster||q.notes||q.ref||q.source||q.month||q.year||q.qnum||(q.course&&q.course!==state.course)||(q.bank&&q.bank!=='My questions'));}
/* Closing the editor never throws away typing without asking. */
var edSnap='',edReturn=null;
function requestClose(){collect();if(JSON.stringify(ed)===edSnap){closeEditor();return;}
  var c=$('#e-confirm');c.innerHTML='<span>You have changes that aren’t saved.</span><span class="spacer"></span><button type="button" id="e-keep">Keep editing</button><button type="button" class="danger" id="e-discard">Discard changes</button>';c.hidden=false;
  $('#e-keep').onclick=hideDiscard;$('#e-discard').onclick=function(){closeEditor();};$('#e-keep').focus();}
function hideDiscard(){var c=$('#e-confirm');c.hidden=true;c.innerHTML='';$('#e-text').focus();}
function collect(){
  if(!ed)return;
  ed.html=$('#e-text').innerHTML;ed.bank=$('#e-bank').value;ed.topic=$('#e-topic').value;ed.points=num($('#e-pts').value,1);ed.part=$('#e-part').value;ed.standard=$('#e-std').value;ed.course=$('#e-course').value;ed.unit=$('#e-unit').value;ed.section=$('#e-sec').value;ed.subtopic=$('#e-sub').value;ed.cluster=$('#e-cl').value;ed.month=$('#e-mo').value;ed.source=$('#e-src').value;ed.year=$('#e-yr').value;ed.qnum=$('#e-qn').value;ed.notes=$('#e-notes').value;ed.ref=$('#e-ref').value;
  if(isMC(ed.type))$$('[data-ct]').forEach(function(el){ed.choices[+el.dataset.ct]=el.innerHTML;});
  var a=$('#e-ans');if(a)ed.answer=a.value;
  var l=$('#e-lines');if(l){var lv=parseInt(l.value,10);ed.lines=Math.max(0,Math.min(40,isNaN(lv)?1:lv));}
  var sp=$('#e-space');if(sp)ed.space=Math.max(0,Math.min(9,num(sp.value,3)));
  var aa=$('input[name=area]:checked');if(aa)ed.answerArea=aa.value;
}
function drawSpec(){
  var sp=$('#e-spec'),h='';
  if(isMC(ed.type)){
    h='<span class="lbl">Answer choices <span class="hint" style="font-weight:400">— click the circle next to the correct one</span></span>'+symbar()+'<div id="chs">'+ed.choices.map(function(c,i){return '<div class="chrow'+(i===ed.answer?' correct':'')+'"><input type="radio" name="corr" data-ci="'+i+'"'+(i===ed.answer?' checked':'')+' aria-label="Correct answer '+LETTERS[i]+'"><span class="letter">'+LETTERS[i]+'.</span><div class="rich" contenteditable="true" data-ct="'+i+'" data-ph="Choice '+LETTERS[i]+'">'+(c||'')+'</div><button class="small ghost" data-cr="'+i+'" title="Remove choice"'+(ed.choices.length<=2?' disabled':'')+'>✕</button></div>';}).join('')+'</div>'+(ed.choices.length<8?'<button class="small" id="addCh">+ Add choice</button>':'')+'<div class="checks" style="margin-top:12px"><label><input type="checkbox" id="e-inimg"'+(ed.inImage?' checked':'')+'><span>The choices are part of the question picture<small>They won’t be printed again or shuffled. Keep the labels above matching the picture, like (1) (2) (3) (4).</small></span></label><label><input type="checkbox" id="e-lock"'+(ed.lockChoices?' checked':'')+'><span>Keep these choices in this order<small>For choices like “1, 2, 3, 4” or “I and II”. “All/None of the above” always stays last automatically.</small></span></label></div>'+(ed.type==='bm'?'<p class="hint" style="margin:10px 0 0">Bimodal: prints with these choices, or as an open question without them. Choose on Build &amp; print.</p><label style="margin-top:12px"><span class="lbl">Space for the student’s work</span><span style="display:flex;gap:6px;align-items:center"><input type="number" id="e-space" min="0.5" max="9" step="0.25" value="'+esc(ed.space||2)+'" style="width:80px"> inches</span></label>':'');
  }else if(ed.type==='tf'){
    h='<span class="lbl">Correct answer</span><div class="tfpick"><label class="'+(ed.answer==='T'?'on':'')+'"><input type="radio" name="tf" value="T"'+(ed.answer==='T'?' checked':'')+'>True</label><label class="'+(ed.answer==='F'?'on':'')+'"><input type="radio" name="tf" value="F"'+(ed.answer==='F'?' checked':'')+'>False</label></div>';
  }else if(ed.type==='sa'){
    h='<div class="fields"><label><span class="lbl">Answer for the key</span><input type="text" id="e-ans" value="'+esc(ed.answer)+'"></label><label style="max-width:220px"><span class="lbl">Writing lines on the test</span><select id="e-lines">'+[[0,'None (blanks are in the question)'],[1,'1'],[2,'2'],[3,'3'],[4,'4']].map(function(n){return '<option value="'+n[0]+'"'+(n[0]==ed.lines?' selected':'')+'>'+n[1]+'</option>';}).join('')+'</select></label></div>';
  }else{
    h='<div class="fields"><label><span class="lbl">Notes for the answer key <span class="hint" style="font-weight:400">(optional)</span></span><textarea id="e-ans" rows="2">'+esc(ed.answer)+'</textarea></label><div><span class="lbl">Space for the student’s work</span><div class="checks" style="grid-template-columns:auto auto;justify-content:start;gap:8px 22px"><label><input type="radio" name="area" value="space"'+(ed.answerArea==='space'?' checked':'')+'><span>Blank space, <input type="number" id="e-space" min="0" max="9" step="0.25" value="'+esc(ed.space!=null?ed.space:3)+'" style="width:70px"> inches</span></label><label><input type="radio" name="area" value="lines"'+(ed.answerArea!=='space'?' checked':'')+'><span>Lines, <input type="number" id="e-lines" min="1" max="40" value="'+esc(ed.lines||8)+'" style="width:64px"> of them</span></label></div></div></div>';
  }
  sp.innerHTML=h;wireRich(sp);
  if(isMC(ed.type)){
    $$('.chrow .rich',sp).forEach(function(el){el.closest('.chrow').setAttribute('data-richbox','');});
    $$('[data-ci]',sp).forEach(function(r){r.onchange=function(){ed.answer=+r.dataset.ci;$$('.chrow',sp).forEach(function(row,i){row.classList.toggle('correct',i===ed.answer);});};});
    $$('[data-cr]',sp).forEach(function(b){b.onclick=function(){collect();var i=+b.dataset.cr;ed.choices.splice(i,1);if(ed.answer===i)ed.answer=-1;else if(ed.answer>i)ed.answer--;drawSpec();};});
    if($('#addCh'))$('#addCh').onclick=function(){collect();ed.choices.push('');drawSpec();$('[data-ct="'+(ed.choices.length-1)+'"]').focus();};
    $('#e-lock').onchange=function(){ed.lockChoices=this.checked;};
    $('#e-inimg').onchange=function(){ed.inImage=this.checked;};
  }else if(ed.type==='tf'){
    $$('input[name=tf]',sp).forEach(function(r){r.onchange=function(){collect();ed.answer=r.value;drawSpec();};});
  }
}
function isBlank(html){return !plain(html)&&!hasImg(html);}
function commitEditor(another){
  collect();var err=$('#e-err');
  var html=sanitize(ed.html);
  if(isBlank(html)){err.textContent='Type the question first.';$('#e-text').focus();return;}
  var out={id:ed.id,part:(ed.part||'').trim(),type:ed.type,bank:(ed.bank||'').trim()||'My questions',topic:(ed.topic||'').trim(),standard:(ed.standard||'').trim(),ref:(ed.ref||'').trim(),course:ed.course||state.course,unit:(ed.unit||'').trim(),section:(ed.section||'').trim(),notes:(ed.notes||'').trim(),subtopic:(ed.subtopic||'').trim(),cluster:(ed.cluster||'').trim(),month:ed.month||'',source:(ed.source||'').trim(),searchText:ed.searchText||'',year:ed.year?parseInt(ed.year,10)||'':'',qnum:ed.qnum?parseInt(ed.qnum,10)||'':'',points:num(ed.points,1),html:html};
  if(out.qnum&&(out.qnum<1||out.qnum>36)){err.textContent='Question # should be between 1 and 36.';return;}
  if(isMC(ed.type)){
    var ch=[],ans=-1;ed.choices.forEach(function(c,i){var s=sanitize(c||'');if(!isBlank(s)){if(i===ed.answer)ans=ch.length;ch.push(s);}});
    if(ch.length<2){err.textContent='Add at least two answer choices.';return;}
    if(ans<0){err.textContent='Click the circle next to the correct answer.';return;}
    out.choices=ch;out.answer=ans;out.lockChoices=!!ed.lockChoices;if(ed.inImage){out.inImage=true;out.lockChoices=true;}if(ed.type==='bm')out.space=Math.max(.5,Math.min(9,num(ed.space,2)));
  }else if(ed.type==='tf'){if(ed.answer!=='T'&&ed.answer!=='F'){err.textContent='Choose True or False as the correct answer.';return;}out.answer=ed.answer;}
  else{out.answer=(ed.answer||'').trim();var lv2=parseInt(ed.lines,10);out.lines=Math.max(0,Math.min(40,isNaN(lv2)?(ed.type==='sa'?1:8):lv2));if(ed.type==='es'){out.answerArea=ed.answerArea||'lines';out.space=num(ed.space,3);}}
  var existing=byId(out.id);
  if(existing)state.questions[state.questions.indexOf(existing)]=out;else{state.questions.push(out);if(out.course===state.course)state.selected.push(out.id);}
  if(out.course!==state.course){state.selected=state.selected.filter(function(x){return x!==out.id;});toast('Moved to '+out.course+'.');}
  lastNew={type:out.type,unit:out.unit,section:out.section,bank:out.bank,topic:out.topic,standard:out.standard,points:out.points};
  changed();
  if(another){closeEditor(true);openEditor(null);toast('Saved. It’s on the test too.');}
  else{closeEditor();if(!existing)toast('Saved and added to the test.');}
}
function closeEditor(keep){$('#modal').innerHTML='';lastRich=null;if(!keep){ed=null;render();var b=edReturn&&$('[data-edit="'+edReturn+'"]');if(b)b.focus();}}

/* ================= build tab ================= */
function renderBuild(){
  var s=state.settings,main=$('#main');
  function cb(key,label,small){return '<label><input type="checkbox" data-set="'+key+'"'+(s[key]?' checked':'')+'><span>'+label+(small?'<small>'+small+'</small>':'')+'</span></label>';}
  var banks=uniq('bank');
  var dt=docType(),exam=isExamDoc(),T=DOC_TYPES[dt].toLowerCase();
  function tf(key,label,ph,w){return '<label'+(w?' style="max-width:'+w+'"':'')+'><span class="lbl">'+label+'</span><input type="text" data-set="'+key+'" value="'+esc(s[key])+'"'+(ph?' placeholder="'+esc(ph)+'"':'')+'></label>';}
  function ta(key,label,ph,rows,hint){return '<label><span class="lbl">'+label+(hint?' <span class="hint" style="font-weight:400">— '+hint+'</span>':'')+'</span><textarea data-set="'+key+'" rows="'+(rows||2)+'"'+(ph?' placeholder="'+esc(ph)+'"':'')+'>'+esc(s[key])+'</textarea></label>';}
  var calcSel='<label><span class="lbl">Calculator</span><select data-set="calc">'+[['','(don’t show)'],['Desmos','Desmos'],['TI-84','TI-84'],['No calculator','No calculator'],['Scientific calculator','Scientific calculator'],['other','Other…']].map(function(o){return '<option value="'+esc(o[0])+'"'+(s.calc===o[0]?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select>'+(s.calc==='other'?'<input type="text" data-set="calcOther" value="'+esc(s.calcOther)+'" placeholder="e.g. TI-30XS" style="margin-top:6px;width:100%">':'')+'</label>';
  var timeSel='<label><span class="lbl">Time accommodation</span><select data-set="time">'+[['','(don’t show)'],['1.5','1.5× extended time'],['2','2.0× extended time'],['min','Number of minutes…']].map(function(o){return '<option value="'+o[0]+'"'+(s.time===o[0]?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select>'+(s.time==='min'?'<span style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="number" data-set="timeMin" min="1" max="600" value="'+esc(s.timeMin)+'" style="width:90px"> minutes</span>':'')+'</label>';
  var details='';
  if(exam)details=
    '<div class="row3">'+tf('quarter','Quarter #','1')+tf('unitNum','Unit #','3')+'</div>'+
    tf('topic','Unit title <span class="hint" style="font-weight:400">— right side, in italics</span>','e.g. Parallel & Perpendicular Lines')+
    tf('title','Title line','auto: '+autoTitle())+
    '<div class="row">'+tf('teacher','Teacher','e.g. Ms. Candalino')+calcSel+'</div>'+
    '<div class="row">'+timeSel+'<span></span></div>'+
    ta('instructions','Instructions','optional',2,'printed above Part I');
  else if(dt==='review')details=
    '<div class="row3">'+tf('unitNum','Unit #','3')+'</div>'+
    tf('title','Title','auto: '+autoTitle())+
    '<label><span class="lbl">Work space under each short/extended response question</span><select data-set="reviewSpace">'+[['','Each question’s own setting'],['0','None'],['0.5','½ inch'],['1','1 inch'],['1.5','1½ inches'],['2','2 inches'],['3','3 inches'],['4','4 inches']].map(function(o){return '<option value="'+o[0]+'"'+(String(s.reviewSpace)===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label>'+
    ta('instructions','Instructions','optional',2,'printed above the questions');
  else details=
    '<div class="row3">'+tf('unitNum','Unit #','3')+tf('sectionNum','Section #','2')+'</div>'+
    '<div class="row3">'+tf('quarter','Quarter #','1')+tf('week','Week #','03')+tf('day','Day #','012')+'</div>'+
    '<p class="hint" style="margin:-4px 0 0">The footer code on pages 2+ reads <b id="lcode">'+esc(lessonCode()||'Q#W##D###')+'</b>.</p>'+
    tf('lessonSource','Source <span class="hint" style="font-weight:400">— footer, pages 2+</span>',lessonSource()||'e.g. Big Ideas Geometry')+
    tf('target','I am learning to…','e.g. prove triangles congruent using SSS and SAS')+
    '<h3 style="margin:8px 0 0">Essential Concept</h3>'+tf('ecTopic','Topic','e.g. Triangle Congruence')+ta('ecDef','Definition or concept','Type the definition. Leave both empty to skip the box.',3)+
    '<h3 style="margin:8px 0 0">Notes</h3>'+ta('lessonNotes','Notes text','optional',2)+
    '<label style="max-width:220px"><span class="lbl">Space for notes</span><span style="display:flex;gap:6px;align-items:center"><input type="number" data-set="notesSpace" min="0" max="8" step=".25" value="'+esc(s.notesSpace)+'" style="width:80px"> inches</span></label>'+
    '<h3 style="margin:8px 0 0">Success Criteria</h3>'+ta('success','One per line','I can …\nI can …',3)+
    '<div><h3 style="margin:8px 0 0">Students need</h3><p class="hint" style="margin:2px 0 8px">Pictures in the top-left corner of the first page.</p><div class="checks">'+cb('toolCompass','Compass')+cb('toolRuler','Ruler')+cb('toolTrace','Tracing paper')+'</div></div>'+
    '<p class="hint">Mark each question as Warm Up, Example or Practice in the list on the right.</p>';
  main.innerHTML='<div class="grid2"><div class="card"><h2>Document</h2><div class="doctypes">'+Object.keys(DOC_TYPES).map(function(k){return '<button type="button" data-doctype="'+k+'" class="'+(k===dt?'on':'')+'">'+DOC_TYPES[k]+'</button>';}).join('')+'</div><div class="fields">'+
    '<label><span class="lbl">Course name <span class="hint" style="font-weight:400">— centered above the bar on every page</span></span><input type="text" data-set="headerText" value="'+esc(s.headerText)+'" placeholder="'+esc(state.course)+'"></label>'+
    details+
    '<div class="row"><label><span class="lbl">Versions</span><select data-set="versions">'+[1,2,3,4,5,6,7,8].map(function(n){return '<option value="'+n+'"'+(n==s.versions?' selected':'')+'>'+n+(n===1?' (no scrambling)':' — A to '+LETTERS[n-1])+'</option>';}).join('')+'</select></label><span></span></div>'+
    '</div>'+accSection()+'<details class="fold" id="pageStyle"'+(ui.pageStyle?' open':'')+'><summary>Page style <span class="hint">font, size, answer labels, scrambling, layout</span></summary><div class="fields">'+
    '<div class="row"><label><span class="lbl">Font</span><select data-set="font">'+Object.keys(FONTS).map(function(f){return '<option value="'+esc(f)+'"'+(s.font===f?' selected':'')+' style="font-family:'+esc(FONTS[f])+'">'+esc(f)+'</option>';}).join('')+'</select></label><label><span class="lbl">Size</span><select data-set="fontSize">'+[10,10.5,11,11.5,12,13,14].map(function(z){return '<option value="'+z+'"'+(num(s.fontSize,12)==z?' selected':'')+'>'+z+' pt</option>';}).join('')+'</select></label></div>'+
    '<label><span class="lbl">Bimodal questions</span><select data-set="bmMode"><option value="with"'+(s.bmMode!=='without'?' selected':'')+'>Print with the answer choices</option><option value="without"'+(s.bmMode==='without'?' selected':'')+'>Print without choices (open-ended)</option></select><span class="hint">You can switch single questions in the list on the right.</span></label>'+
    '<label><span class="lbl">Answer choice labels</span><select data-set="labels"><option value="lowerdot"'+(s.labels==='lowerdot'?' selected':'')+'>a.  b.  c.  d.</option><option value="upper"'+(s.labels==='upper'?' selected':'')+'>A.  B.  C.  D.</option><option value="lower"'+(s.labels==='lower'?' selected':'')+'>a)  b)  c)  d)</option><option value="num"'+(s.labels==='num'?' selected':'')+'>(1)  (2)  (3)  (4)  — Regents style</option></select></label>'+
    '</div><h3>Scrambling</h3><div class="checks">'+cb('shuffleQ','Shuffle question order',exam?'Within each part.':'Within each section.')+cb('shuffleC','Shuffle answer choices','“All/None of the above” stays last.')+cb('keepA','Keep Version A in the original order','Handy as your master copy.')+'</div>'+
    '<h3>Layout</h3><div class="checks">'+
    (exam?cb('group','Group into parts','Part I, Part II… with directions and totals like [14].')+cb('computeBox','“Use this space for computations.” box','At the start of each multiple-choice part.')+cb('showCredits','Show credits like [2] under each open-response question')+cb('scoreBox','Score box at the end','Shows the total, like  /33. Bonus questions don’t count.'):'')+
    (dt==='review'?cb('showRef','Show the reference under each question','Source and exam, like “Regents June 2024 #12”, in small gray type.'):'')+
    cb('nameLine','Name and date line')+
    (nVersions()>1?cb('perVersion','Print each version separately','Page numbers start at 1 and the first-page header prints on each version.'):'')+
    (exam?cb('showPoints','Show points next to each question')+cb('blanks','Answer blank before each number','For multiple choice and true/false.'):'')+
    cb('keyStd','Show unit and standards on the answer key')+cb('keyNotes','Show my notes on the answer key','Never on the student copies.')+'</div></details></div>'+
'<div style="display:grid;gap:18px;min-width:0"><div class="card savedcard" id="savedCard"></div><div class="card"><h2>Questions on this '+T+'</h2><div class="stat"><div><b id="stN">'+state.selected.length+'</b>questions</div><div><b id="stP">'+totalPts()+'</b>points</div></div>'+
    '<ul class="sel" id="selList"></ul>'+
    '<div class="pickrow"><span>Add</span><input type="number" id="pkN" min="1" max="500" value="'+esc(ui.pickN)+'"><span>random questions from</span>'+(banks.length>1?'<select id="pkB">'+opts(banks,ui.pickBank,'any bank')+'</select>':'')+unitSelect('pkU',ui.pickUnit,'any unit')+unitSelect('pkS',ui.pickSection,'any section','section')+'<select id="pkT">'+opts(uniq('topic'),ui.pickTopic,'any topic')+'</select><select id="pkY">'+typeOpts(ui.pickType,'any type')+'</select><button class="small" id="pkGo">Add</button><span class="spacer"></span><button class="small ghost" id="clr"'+(state.selected.length?'':' disabled')+'>Clear all</button></div>'+
    '<p class="note">Pick individual questions on the Question bank tab. Questions print in this order unless you shuffle or group them.</p></div>'+
    (exam&&s.group?'<div class="card"><details><summary style="cursor:pointer;font-weight:600">Part directions</summary><p class="note">Printed under each part heading. {credits} becomes “2 credits”, “2 or 3 credits”… from the questions in that part. The part total like [14] is added at the end.</p><div class="fields">'+[['short','Short-answer parts (1 credit each)'],['choice','Multiple-choice parts'],['open','Open-response parts']].map(function(p){return '<label><span class="lbl">'+p[1]+'</span><textarea rows="3" data-pdir="'+p[0]+'">'+esc(partDir(p[0]))+'</textarea></label>';}).join('')+'<div><button class="small ghost" id="pdirReset">Reset to the original wording</button></div></div></details></div>':'')+
    '<div class="card pvcard"><h2 style="display:flex;align-items:center;gap:10px">Preview<span class="spacer"></span><label class="checks" style="font-size:13px;font-family:system-ui,sans-serif;font-weight:400"><span style="display:flex;gap:7px;align-items:center"><input type="checkbox" id="showAns"'+(ui.showAns?' checked':'')+'>Show answers</span></label></h2>'+
    '<div class="pvtop"><div class="vtabs" id="vtabs"></div><span class="spacer"></span><button class="small ghost" id="reshuf"'+(nVersions()>1?'':' disabled')+' title="Versions stay the same until you press this, so a key always matches copies you’ve already printed.">↻ New scramble</button></div>'+
    '<div class="paperwrap"><div class="sheet pt" id="paper"></div></div>'+
    '<div class="printbar"><div id="pbWarn" class="pb-warnrow"></div><span class="pb-sum" id="pbSum"></span><span class="hint" id="pbNone" hidden>Add questions to print.</span>'+(accom().on?'<button data-print="acc">Accommodated only</button>':'')+'<button data-print="tests">'+DOC_TYPES[dt]+(nVersions()>1?'s':'')+' only</button><button data-print="keys">Answer keys only</button><button class="primary" data-print="both">'+(outFmt()==='docx'||outFmt()==='tex'?'Download ':'Print ')+T+(nVersions()>1?'s':'')+' + answer keys</button>'+
    '<label class="fmtsel">Format <select id="fmtSel">'+[['pdf','PDF'],['docx','Word (.docx)'],['tex','LaTeX (.tex)'],['print','Print…']].map(function(o){return '<option value="'+o[0]+'"'+(outFmt()===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label></div>'+
    '<p class="note" id="fmtNote" style="margin-bottom:0">'+fmtNote()+'</p></div>'+
    '</div></div>';
  $$('[data-set]',main).forEach(function(el){
    var k=el.dataset.set;
    var h=function(){s[k]=el.type==='checkbox'?el.checked:(k==='versions'?parseInt(el.value,10):k==='fontSize'?num(el.value,12):el.value);changed();if(k==='bmMode'){s.bmOverride={};drawSel();}if(k==='versions'||k==='calc'||k==='time'||k==='group'){if(ui.pv>=nVersions())ui.pv=0;renderBuild();}else{refreshAuto();drawPreviewSoon();}};
    if(el.type==='checkbox'||el.tagName==='SELECT')el.onchange=h;else el.oninput=h;
  });
  $('#pageStyle').ontoggle=function(){ui.pageStyle=this.open;saveUi();};
  $('#accFold').ontoggle=function(){ui.accFold=this.open;saveUi();};
  $$('[data-acc]',main).forEach(function(el){el.onchange=function(){var k=el.dataset.acc,v=el.type==='checkbox'?el.checked:(k==='perPage'||k==='version'?parseInt(el.value,10)||0:el.value);
    s.accom=Object.assign({},accom());s.accom[k]=v;changed();
    if(k==='on'){if(v)ui.pv='acc';renderBuild();var f=$('[data-acc="on"]');if(f)f.focus();}else{if(ui.pv!=='acc'){ui.pv='acc';saveUi();}drawPreview();drawPrintBar();}};});
  $$('[data-doctype]',main).forEach(function(b){b.onclick=function(){s.docType=b.dataset.doctype;changed();renderBuild();renderTabs();};});
  drawSel();
  $('#pkN').oninput=function(){ui.pickN=parseInt(this.value,10)||1;saveUi();};
  if($('#pkB'))$('#pkB').onchange=function(){ui.pickBank=this.value;saveUi();};
  $('#pkT').onchange=function(){ui.pickTopic=this.value;saveUi();};
  if($('#pkU'))$('#pkU').onchange=function(){ui.pickUnit=this.value;saveUi();};
  if($('#pkS'))$('#pkS').onchange=function(){ui.pickSection=this.value;saveUi();};
  $('#pkY').onchange=function(){ui.pickType=this.value;saveUi();};
  $('#pkGo').onclick=function(){
    var pool=cq().filter(function(q){return !isSel(q.id)&&matches(q,{unit:ui.pickUnit,section:ui.pickSection,bank:ui.pickBank,topic:ui.pickTopic,type:ui.pickType});});
    if(!pool.length){toast('No more questions match that choice.');return;}
    var take=shuffle(pool,Math.random).slice(0,Math.max(1,ui.pickN));take.forEach(function(q){state.selected.push(q.id);});
    changed();renderBuild();renderTabs();toast('Added '+take.length+' question'+(take.length>1?'s':'')+(take.length<ui.pickN?' (that’s all that matched)':'')+'.');
  };
  $('#clr').onclick=function(){var b=this;if(!b.classList.contains('danger')){b.classList.add('danger');b.textContent='Remove all?';setTimeout(function(){if(document.body.contains(b)){b.classList.remove('danger');b.textContent='Clear all';}},3000);return;}
    var prev=state.selected.slice();state.selected=[];changed();renderBuild();renderTabs();toast('Test cleared.',function(){state.selected=prev;changed();render();});};
  $$('[data-pdir]',main).forEach(function(t){t.oninput=function(){s.partDirs=Object.assign({},s.partDirs||{});s.partDirs[t.dataset.pdir]=t.value;changed();drawPreviewSoon();};});
  if($('#pdirReset'))$('#pdirReset').onclick=function(){s.partDirs=null;changed();renderBuild();};
  $$('[data-print]',main).forEach(function(b){b.onclick=function(){printNow(b.dataset.print);};});
  $('#fmtSel').onchange=function(){ui.fmt=this.value;saveUi();renderBuild();var f=$('#fmtSel');if(f)f.focus();};
  $('#reshuf').onclick=function(){var b=this;
    if(!b.classList.contains('danger')){b.classList.add('danger');b.textContent='Make new versions?';setTimeout(function(){if(document.body.contains(b)){b.classList.remove('danger');b.textContent='↻ New scramble';}},4000);return;}
    var prev=s.seed;s.seed=Math.floor(Math.random()*2147483647);changed();b.classList.remove('danger');b.textContent='↻ New scramble';drawPreview();
    toast('New versions made. Print new answer keys too.',function(){s.seed=prev;changed();drawPreview();});};
  $('#showAns').onchange=function(){ui.showAns=this.checked;saveUi();drawPreview();};
  drawPreview();drawPrintBar();drawSaved();
}
function accSection(){var a=accom(),n=nVersions(),dis=a.on?'':' disabled';
  function sel(k,label,opts,hint){return '<label><span class="lbl">'+label+'</span><select data-acc="'+k+'"'+dis+'>'+opts.map(function(o){return '<option value="'+o[0]+'"'+(String(a[k])===String(o[0])?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>'+(hint?'<span class="hint">'+hint+'</span>':'')+'</label>';}
  return '<details class="fold" id="accFold"'+(a.on||ui.accFold?' open':'')+'><summary>Accommodations <span class="hint">dyslexia-friendly font, large print, spacing</span></summary>'+
    '<div class="checks"><label><input type="checkbox" data-acc="on"'+(a.on?' checked':'')+'><span>Also print an accommodated copy<small>Same questions and answer order as its version, so that version’s answer key works for it. Nothing on the student’s copy says “accommodated”.</small></span></label></div>'+
    '<div class="fields acc-fields">'+
    '<div class="row">'+sel('font','Font',[['Atkinson Hyperlegible','Atkinson Hyperlegible'],['OpenDyslexic','OpenDyslexic'],['','Same as the test']])+sel('size','Text size',[['','Same as the test'],['l','Large (14 pt)'],['xl','Extra large (18 pt)']])+'</div>'+
    '<div class="row">'+sel('perPage','Questions per page',[[0,'As many as fit'],[1,'1 per page'],[2,'2 per page']],docType()==='lesson'?'Lessons keep their own layout.':'')+(n>1?sel('version','Make it from',Array.apply(null,Array(n)).map(function(_,v){return [v,'Version '+LETTERS[v]];})):'<span></span>')+'</div>'+
    '<div class="checks"><label><input type="checkbox" data-acc="spacing"'+(a.spacing?' checked':'')+dis+'><span>Extra spacing<small>More space between lines, answer choices and questions.</small></span></label></div>'+
    '</div></details>';}
function drawSaved(){var box=$('#savedCard');if(!box)return;var s=state.settings,cur=savedById(s.savedId),mine=state.savedTests.filter(function(t){return t.course===state.course;});
  var q=(ui.svQ||'').toLowerCase(),list=mine.filter(function(t){return !q||t.name.toLowerCase().indexOf(q)>=0;});
  var status=cur?'<b>'+esc(cur.name)+'</b> · saved '+fmtDay(cur.savedAt)+(cur.printedAt?' · printed '+fmtDay(cur.printedAt):'')+(isDirty()?' · <span class="sv-dirty">changed since</span>':''):(state.selected.length?'Not saved yet. Printing saves it for you.':'Pick questions to start a test, or open a saved one.');
  var h='<div class="sv-head"><div class="sv-now"><h2>Saved tests</h2><p class="hint" id="svStatus">'+status+'</p></div><span class="spacer"></span>'+
    '<button class="small" id="svSave"'+(state.selected.length?'':' disabled')+'>'+(cur?'Save changes':'Save test')+'</button>'+(cur?'<button class="small ghost" id="svNew">Save as new</button>':'')+'</div>';
  if(s.frozen&&cur){var d=savedDiff(cur);h+='<div class="sv-frozen" role="status"><span>'+(d.edited?d.edited+' question'+(d.edited>1?'s were':' was')+' edited':'')+(d.edited&&d.gone?' and ':'')+(d.gone?d.gone+' question'+(d.gone>1?'s were':' was')+' deleted from the bank':'')+' since you saved this. You’re using the questions <b>as printed</b>, so copies and keys match what you handed out.</span><button class="small" id="svLatest">Use the latest versions</button></div>';}
  if(mine.length)h+='<details class="fold sv-list" id="svList"'+(ui.svOpen?' open':'')+'><summary>All saved tests <span class="hint">('+mine.length+')</span></summary>'+
    (mine.length>5?'<input type="search" id="svQ" placeholder="Find a saved test…" aria-label="Find a saved test" value="'+esc(ui.svQ||'')+'">':'')+
    '<ul class="svl">'+list.map(function(t){return '<li data-sv="'+t.id+'"'+(cur&&cur.id===t.id?' class="cur"':'')+'><span class="svn"><b>'+esc(t.name)+'</b><small>'+(t.selected||[]).length+' questions · saved '+fmtDay(t.savedAt)+(t.printedAt?' · printed '+fmtDay(t.printedAt):'')+'</small></span>'+
      '<button class="small" data-svopen="'+t.id+'">'+(cur&&cur.id===t.id?'Reopen':'Open')+'</button><button class="small ghost" data-svren="'+t.id+'">Rename</button><button class="small ghost" data-svdup="'+t.id+'">Duplicate</button><button class="small ghost" data-svdel="'+t.id+'">Delete</button></li>';}).join('')+(list.length?'':'<li class="hint">No saved test matches.</li>')+'</ul></details>';
  box.innerHTML=h+'<div id="svAsk"></div>';
  var refresh=function(){drawSaved();};
  $('#svSave').onclick=function(){var t=saveTest();toast('Saved “'+t.name+'”.');refresh();};
  if($('#svNew'))$('#svNew').onclick=function(){var t=saveTest({asNew:true,name:(cur?cur.name+' (new)':defaultTestName())});state.settings.frozen=false;toast('Saved as “'+t.name+'”.');renderBuild();};
  if($('#svLatest'))$('#svLatest').onclick=function(){openSaved(cur.id,'latest');toast('Using the latest versions. Print new answer keys too.');};
  if($('#svList'))$('#svList').ontoggle=function(){ui.svOpen=this.open;saveUi();};
  if($('#svQ'))$('#svQ').oninput=function(){ui.svQ=this.value;var pos=this.selectionStart;drawSaved();var f=$('#svQ');f.focus();f.setSelectionRange(pos,pos);};
  $$('[data-svopen]',box).forEach(function(b){b.onclick=function(){var id=b.dataset.svopen,t=savedById(id);
    var go=function(){openSaved(id);var d=savedDiff(t);toast('Opened “'+t.name+'”.'+(d.edited||d.gone?' Some questions changed since; see the note above.':''));};
    if(!isDirty()||(cur&&cur.id===id&&!isDirty()))return go();
    var ask=$('#svAsk');ask.innerHTML='<div class="confirm-bar" role="alert"><span>Your current test has changes that aren’t saved.</span><span class="spacer"></span><button type="button" class="small" id="svAskSave">Save it, then open</button><button type="button" class="small danger" id="svAskDrop">Open without saving</button><button type="button" class="small ghost" id="svAskNo">Cancel</button></div>';
    $('#svAskSave').focus();$('#svAskSave').onclick=function(){saveTest();go();};$('#svAskDrop').onclick=go;$('#svAskNo').onclick=function(){ask.innerHTML='';b.focus();};};});
  $$('[data-svren]',box).forEach(function(b){b.onclick=function(){var t=savedById(b.dataset.svren),li=b.closest('li');
    li.innerHTML='<input type="text" value="'+esc(t.name)+'" aria-label="New name" style="flex:1"><button class="small primary">Save</button><button class="small ghost">Cancel</button>';
    var inp=$('input',li),bs=$$('button',li);inp.focus();inp.select();
    var done=function(){var nn=inp.value.trim();if(nn){t.name=nn;changed();}refresh();};bs[0].onclick=done;bs[1].onclick=refresh;inp.onkeydown=function(e){if(e.key==='Enter')done();if(e.key==='Escape')refresh();};};});
  $$('[data-svdup]',box).forEach(function(b){b.onclick=function(){var t=savedById(b.dataset.svdup),c=JSON.parse(JSON.stringify(t)),now=new Date().toISOString();
    c.id=uid();c.name=t.name+' (copy)';c.created=c.savedAt=now;delete c.printedAt;state.savedTests.splice(state.savedTests.indexOf(t),0,c);changed();ui.svOpen=true;refresh();toast('Duplicated. Open the copy to change it.');};});
  $$('[data-svdel]',box).forEach(function(b){b.onclick=function(){
    if(!b.classList.contains('danger')){b.classList.add('danger');b.textContent='Confirm';setTimeout(function(){if(document.body.contains(b)){b.classList.remove('danger');b.textContent='Delete';}},3000);return;}
    var t=savedById(b.dataset.svdel),i=state.savedTests.indexOf(t),wasCur=state.settings.savedId===t.id,wasFrozen=state.settings.frozen;
    state.savedTests.splice(i,1);if(wasCur){state.settings.savedId=null;state.settings.frozen=false;}changed();renderBuild();
    toast('Deleted “'+t.name+'”.',function(){state.savedTests.splice(i,0,t);if(wasCur){state.settings.savedId=t.id;state.settings.frozen=wasFrozen;}changed();renderBuild();});};});
}
function refreshAuto(){var t=$('#main [data-set=title]');if(t)t.placeholder='auto: '+autoTitle();var c=$('#lcode');if(c)c.textContent=lessonCode()||'Q#W##D###';var src=$('#main [data-set=lessonSource]');if(src)src.placeholder=lessonSource()||'e.g. Big Ideas Geometry';}
function drawSel(){
  var ul=$('#selList'),qs=selectedQs(),dt=docType(),st=state.settings;
  if(!qs.length){ul.innerHTML='<li style="display:block;text-align:center;color:var(--muted);padding:18px">No questions yet. Tick questions on the Question bank tab or add random ones below.</li>';return;}
  ul.innerHTML=qs.map(function(q,i){return '<li><span class="n">'+(i+1)+'</span><span class="t" title="'+esc(plainQ(q).t)+'"><span class="badge '+q.type+'" style="margin-right:6px">'+{mc:'MC',bm:'Bimodal',tf:'T/F',sa:'SA',es:'Open'}[q.type]+'</span>'+esc(plainQ(q).t)+(q.topic?'<small>'+esc(q.topic)+'</small>':'')+(dt==='lesson'&&roleOf(q)==='example'?'<input type="text" class="exc" data-exc="'+q.id+'" value="'+esc((st.concepts||{})[q.id]||'')+'" placeholder="Example concept, e.g. SAS">':'')+'</span><span>'+(dt==='lesson'?'<select class="rolesel" data-role="'+q.id+'" title="Where this goes in the lesson"><option value="warmup"'+(roleOf(q)==='warmup'?' selected':'')+'>Warm Up</option><option value="example"'+(roleOf(q)==='example'?' selected':'')+'>Example</option><option value="practice"'+(roleOf(q)==='practice'?' selected':'')+'>Practice</option></select>':'')+(isExamDoc()?'<button class="ghost bmt'+(isBonus(q)?' on':'')+'" data-bonus="'+q.id+'" title="Bonus questions print at the end and don’t count toward the score">'+(isBonus(q)?'bonus ✓':'bonus')+'</button>':'')+(q.type==='bm'?'<button class="ghost bmt" data-bm="'+q.id+'" title="Switch between printing with and without answer choices">'+(bmChoices(q)?'with choices':'no choices')+'</button>':'')+'<button class="ghost" data-up="'+i+'" title="Move up"'+(i?'':' disabled')+'>↑</button><button class="ghost" data-dn="'+i+'" title="Move down"'+(i<qs.length-1?'':' disabled')+'>↓</button><button class="ghost" data-rm="'+q.id+'" title="Take off test">✕</button></span></li>';}).join('');
  function after(){changed();$('#stN').textContent=state.selected.length;$('#stP').textContent=totalPts();drawPrintBar();drawSel();drawPreview();renderTabs();}
  $$('[data-up]',ul).forEach(function(b){b.onclick=function(){var i=+b.dataset.up,a=state.selected,x=a[i-1];a[i-1]=a[i];a[i]=x;after();};});
  $$('[data-dn]',ul).forEach(function(b){b.onclick=function(){var i=+b.dataset.dn,a=state.selected,x=a[i+1];a[i+1]=a[i];a[i]=x;after();};});
  $$('[data-rm]',ul).forEach(function(b){b.onclick=function(){state.selected=state.selected.filter(function(x){return x!==b.dataset.rm;});after();};});
  $$('[data-role]',ul).forEach(function(x){x.onchange=function(){st.roles=Object.assign({},st.roles);st.roles[x.dataset.role]=x.value;after();};});
  $$('[data-exc]',ul).forEach(function(x){x.oninput=function(){st.concepts=Object.assign({},st.concepts);st.concepts[x.dataset.exc]=x.value;changed();drawPreviewSoon();};});
  $$('[data-bonus]',ul).forEach(function(b){b.onclick=function(){st.bonus=Object.assign({},st.bonus);if(st.bonus[b.dataset.bonus])delete st.bonus[b.dataset.bonus];else st.bonus[b.dataset.bonus]=true;after();};});
  $$('[data-bm]',ul).forEach(function(b){b.onclick=function(){var s=state.settings,q=selQ(b.dataset.bm);s.bmOverride=s.bmOverride||{};var next=bmChoices(q)?'without':'with';if(next===s.bmMode)delete s.bmOverride[q.id];else s.bmOverride[q.id]=next;after();};});
}
function noAnswer(){return selectedQs().filter(function(q){return (isMC(q.type)&&!q.inImage&&(q.answer<0||q.answer>=q.choices.length))||(q.inImage&&q.answer<0)||(q.type==='tf'&&q.answer!=='T'&&q.answer!=='F');});}
function printCheck(){var m=noAnswer();if(!m.length)return '';return '<span class="pb-warn" role="status"><b>'+m.length+' question'+(m.length>1?'s have':' has')+' no correct answer,</b> so the answer key will be blank there. <button type="button" class="small" id="fixAns" data-fix="'+m[0].id+'">Fix'+(m.length>1?' the first one':'')+'</button></span>';}
function drawPrintBar(){var b=$('#pbSum');if(!b)return;var svs=$('#svStatus');if(svs&&savedById(state.settings.savedId)){var c=savedById(state.settings.savedId);svs.innerHTML='<b>'+esc(c.name)+'</b> · saved '+fmtDay(c.savedAt)+(c.printedAt?' · printed '+fmtDay(c.printedAt):'')+(isDirty()?' · <span class="sv-dirty">changed since</span>':'');}b.textContent=printSummary();var w=$('#pbWarn');w.innerHTML=printCheck();var f=$('#fixAns');if(f)f.onclick=function(){var q=byId(f.dataset.fix);if(q)openEditor(q);else toast('That question was deleted from the bank. Use the latest versions to take it off the test.');};
  var none=!state.selected.length;$$('[data-print]').forEach(function(x){x.disabled=none;});var nm=$('#pbNone');if(nm)nm.hidden=!none;}
function printSummary(){var n=nVersions(),q=state.selected.length,p=totalPts();return n+' version'+(n===1?'':'s')+(accOn()?' + accommodated copy':'')+' · '+q+' question'+(q===1?'':'s')+' · '+p+' point'+(p===1?'':'s');}
var pvT;function drawPreviewSoon(){clearTimeout(pvT);pvT=setTimeout(drawPreview,250);}
function drawPreview(){
  var n=nVersions(),acc=accom().on;if(ui.pv==='acc'&&!acc)ui.pv=0;if(ui.pv!=='acc'&&ui.pv>=n)ui.pv=0;var vt=$('#vtabs');if(!vt)return;
  vt.innerHTML=(n>1?'<span class="hint" style="margin-right:4px">Version</span>'+Array.apply(null,Array(n)).map(function(_,v){return '<button class="'+(v===ui.pv?'on':'')+'" data-v="'+v+'">'+LETTERS[v]+'</button>';}).join(''):'')+
    (acc?'<button class="'+(ui.pv==='acc'?'on':'')+'" data-v="acc" title="The accommodated copy">Accommodated</button>':'');
  $$('[data-v]',vt).forEach(function(b){b.onclick=function(){ui.pv=b.dataset.v==='acc'?'acc':+b.dataset.v;saveUi();drawPreview();};});
  var isAcc=ui.pv==='acc',pv=isAcc?accVersion():ui.pv,items=buildVersion(pv),p=$('#paper');p.setAttribute('style',isAcc?accStyle():ptStyle());
  p.className='sheet pt pt-classic pt-'+docType()+(isAcc?accClass():'');p.innerHTML=items.length?(isAcc?accHtml({answers:ui.showAns,preview:true}):testHtml(items,ui.pv,{answers:ui.showAns,preview:true})):'<p style="color:#888;text-align:center;font-family:system-ui,sans-serif">Your '+DOC_TYPES[docType()].toLowerCase()+' will appear here.</p>';
}

/* ================= import / backup tab ================= */
function bankCounts(){var c={};cq().forEach(function(q){c[q.bank]=(c[q.bank]||0)+1;});return c;}
function daysAgo(iso){var t=Date.parse(iso);return isNaN(t)?null:Math.floor((Date.now()-t)/864e5);}
function lastBackupText(){var n=daysAgo(ui.lastBackup);if(n==null)return 'No backup downloaded from this browser yet.';return 'Last backup: '+(n<1?'today':n===1?'yesterday':n+' days ago')+'.';}
function backupStale(){var n=daysAgo(ui.lastBackup);return n==null||n>=14;}
/* Restoring into a bank that already has questions asks: replace everything, or add only what's missing. */
function restoreChoice(incoming,saved){
  var res=$('#bkRes'),n=incoming.questions.length,have={};state.questions.forEach(function(q){have[q.id]=q;});
  var added=incoming.questions.filter(function(q){return !have[q.id];});
  if(!state.questions.length){state=incoming;changed();render();var r=$('#bkRes');r.className='result ok';r.textContent='Restored '+n+' question'+(n===1?'':'s')+' and your test settings.';return;}
  var inBk={};incoming.questions.forEach(function(q){inBk[q.id]=1;});
  var edited=incoming.questions.filter(function(q){return have[q.id]&&JSON.stringify(have[q.id])!==JSON.stringify(q);}).length;
  var gone=state.questions.filter(function(q){return !inBk[q.id];}).length;
  var when=saved&&!isNaN(Date.parse(saved))?' from '+new Date(saved).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'}):'';
  var what=[];if(edited)what.push(edited+' edited question'+(edited===1?' goes':'s go')+' back to the backup’s version');if(gone)what.push(gone+' question'+(gone===1?'':'s')+' not in the backup '+(gone===1?'is':'are')+' removed');
  res.className='result choose';
  res.innerHTML='<p>This backup'+esc(when)+' has <b>'+n+'</b> question'+(n===1?'':'s')+'. You have '+state.questions.length+' now.</p>'+
    '<div class="restore-opt"><button class="primary" id="rsReplace">Replace everything with this backup</button><span class="hint">Questions, courses and test settings become exactly what’s in the backup'+(what.length?': '+esc(what.join('; ')):'')+'. You can undo this.</span></div>'+
    '<div class="restore-opt"><button id="rsAdd"'+(added.length?'':' disabled')+'>'+(added.length?'Add the '+added.length+' missing question'+(added.length===1?'':'s'):'Nothing missing to add')+'</button><span class="hint">Keeps everything you have now and only adds questions you don’t have.</span></div>'+
    '<button class="ghost small" id="rsCancel">Cancel</button>';
  $('#rsCancel').onclick=function(){res.className='result';res.innerHTML='';};
  $('#rsReplace').onclick=function(){var prev=state;state=incoming;changed();render();var r=$('#bkRes');r.className='result ok';r.textContent='Replaced everything with the backup ('+n+' question'+(n===1?'':'s')+').';
    toast('Replaced everything with the backup.',function(){state=prev;changed();render();});};
  $('#rsAdd').onclick=function(){var prevQ=state.questions,prevC=state.courses,prevT=state.savedTests;state.questions=state.questions.concat(added);
    state.courses=state.courses.concat(incoming.courses.filter(function(c){return state.courses.indexOf(c)<0;}));var haveT={};state.savedTests.forEach(function(t){haveT[t.id]=1;});state.savedTests=state.savedTests.concat((incoming.savedTests||[]).filter(function(t){return !haveT[t.id];}));
    changed();render();var r=$('#bkRes');r.className='result ok';r.textContent='Added '+added.length+' question'+(added.length===1?'':'s')+'. Nothing you had was changed.';
    toast('Added '+added.length+' question'+(added.length===1?'':'s')+' from the backup.',function(){state.questions=prevQ;state.courses=prevC;state.savedTests=prevT;changed();render();});};
  $('#rsReplace').focus();
}
function renderIO(){
  var main=$('#main'),bc=bankCounts(),bnames=Object.keys(bc).sort();
  main.innerHTML='<div class="import-grid"><div style="display:grid;gap:18px;min-width:0">'+
  '<div class="card"><h2>Backup</h2><p class="note" style="margin-top:0">Everything is saved in this browser on this computer. Download a backup now and then — it’s one file with all your banks, pictures and test settings, and it’s how you move your work to another computer or browser.</p>'+(state.questions.length?'<p class="last-bk'+(backupStale()?' stale':'')+'">'+esc(lastBackupText())+'</p>':'')+'<div class="actions"><button class="primary" id="bkOut"'+(state.questions.length?'':' disabled')+'>Download backup</button><span class="filebtn"><button>Restore a backup…</button><input type="file" id="bkIn" accept=".json,application/json"></span></div><div id="bkRes" class="result"></div></div>'+
  '<div class="card"><h2>ExamView banks</h2><p class="note" style="margin-top:0">Choose one or more ExamView question bank files (<b>.bnk</b>). Questions, answer choices, correct answers, points, standards, topics, math and pictures come across.</p><div class="actions"><span class="filebtn"><button class="primary">Import .bnk files…</button><input type="file" id="bnkFile" accept=".bnk" multiple></span></div><div id="bnkRes" class="result"></div></div>'+
  '<div class="card"><h2>Your banks</h2>'+(bnames.length?'<ul class="banks">'+bnames.map(function(b){return '<li><span>'+esc(b)+' <small>· '+bc[b]+' question'+(bc[b]>1?'s':'')+'</small></span><button class="small ghost" data-rename="'+esc(b)+'">Rename</button><button class="small ghost" data-delbank="'+esc(b)+'">Delete</button></li>';}).join('')+'</ul>':'<p class="note" style="margin:0">No questions yet.</p>')+'</div>'+
  '<div class="card" id="coursesCard"><h2>Courses</h2><p class="note" style="margin-top:0">Each course has its own banks and its own test. Switch courses with the menu at the top.</p><ul class="banks">'+state.courses.map(function(c){var n=state.questions.filter(function(q){return q.course===c;}).length;return '<li><span>'+esc(c)+(c===state.course?' <small>· current</small>':'')+' <small>· '+n+' question'+(n!==1?'s':'')+'</small></span><button class="small ghost" data-crename="'+esc(c)+'">Rename</button>'+(state.courses.length>1?'<button class="small ghost" data-cdel="'+esc(c)+'">Delete</button>':'')+'</li>';}).join('')+'</ul><div class="pickrow"><input type="text" id="newCourse" placeholder="New course, e.g. AP Statistics" style="flex:1"><button class="small" id="addCourse">Add course</button></div></div>'+
  '</div><div style="display:grid;gap:18px;min-width:0">'+
  '<div class="card"><h2>From Word</h2><p class="note" style="margin-top:0">Choose a Word test (.docx). Numbered questions, lettered answer choices, equations, pictures, proof tables, parts and credits like [2] come across. You can also use the file’s page header for your printed tests.</p><div class="actions"><span class="filebtn"><button class="primary">Import a Word file…</button><input type="file" id="docxFile" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></span></div></div>'+
  '<div class="card"><h2>From a PDF</h2><p class="note" style="margin-top:0">Choose a PDF of a test or worksheet. Numbered questions and their answer choices are found for you; each one comes in as text you can edit, or as a picture when it has diagrams or math that text can’t hold. Anything missed, you can draw a box around.</p><div class="actions"><span class="filebtn"><button class="primary">Import a PDF…</button><input type="file" id="pdfFile" accept=".pdf,application/pdf"></span></div><div id="pdfRes" class="result"></div></div>'+
  '<div class="card"><h2>Paste questions</h2><p class="note" style="margin-top:0">Copy questions from a Word document or old test and paste them here. Leave a blank line between questions and put a <b>*</b> before the correct choice.</p><pre class="fmt">1. What is the slope of the line y = 3x − 5?\nA. −5\n*B. 3\nC. 5\nD. −3\n\n2. Every square is a rectangle.\nAnswer: True\n\n3. Explain why the triangles are congruent.</pre><textarea id="pasteBox" rows="8" placeholder="Paste your questions here…"></textarea><div class="pickrow"><label style="display:flex;gap:6px;align-items:center">Bank <input type="text" id="pasteBank" list="bankList2" value="My questions" style="width:150px"><datalist id="bankList2">'+bnames.map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label><label style="display:flex;gap:6px;align-items:center">Topic <input type="text" id="pasteTopic" placeholder="optional" style="width:140px"></label><span class="spacer"></span><button class="primary" id="pasteGo">Import</button></div><div id="pasteRes" class="result"></div></div>'+
  '<div class="card"><h2>Spreadsheet (CSV)</h2><p class="note" style="margin-top:0">Columns: Course, Type (MC, Bimodal, TF, SA, Open), Bank, Source, Unit, Section, Topic, Subtopic, Cluster, Month, Year, Question #, Reference, Standard, Points, Question, Answer (a letter for MC), Choice A–F, Lines, Notes. Math and pictures don’t go into a CSV, so use the backup file to keep everything.</p><div class="actions"><span class="filebtn"><button>Import CSV…</button><input type="file" id="csvFile" accept=".csv,text/csv"></span><button id="csvOut"'+(state.questions.length?'':' disabled')+'>Export CSV</button><button class="ghost" id="csvTpl">Blank template</button></div><div id="csvRes" class="result"></div></div>'+
  '</div></div>';
  $('#bnkFile').onchange=function(){var files=Array.prototype.slice.call(this.files||[]);this.value='';if(files.length)importBnks(files);};
  $$('[data-delbank]').forEach(function(b){b.onclick=function(){
    var name=b.dataset.delbank;if(!b.classList.contains('danger')){b.classList.add('danger');b.textContent='Delete '+bc[name]+'?';setTimeout(function(){if(document.body.contains(b)){b.classList.remove('danger');b.textContent='Delete';}},3500);return;}
    var prevQ=state.questions.slice(),prevS=state.selected.slice();
    state.questions=state.questions.filter(function(q){return q.bank!==name||q.course!==state.course;});var ids={};state.questions.forEach(function(q){ids[q.id]=1;});state.selected=state.selected.filter(function(id){return ids[id];});
    if(ui.bank===name)ui.bank='';changed();render();toast('Deleted “'+name+'”.',function(){state.questions=prevQ;state.selected=prevS;changed();render();});
  };});
  $$('[data-rename]').forEach(function(b){b.onclick=function(){
    var li=b.closest('li'),name=b.dataset.rename;li.innerHTML='<input type="text" value="'+esc(name)+'" style="flex:1"><button class="small primary">Save</button><button class="small ghost">Cancel</button>';
    var inp=$('input',li);inp.focus();inp.select();var bs=$$('button',li);
    var done=function(){var nn=inp.value.trim();if(nn&&nn!==name){state.questions.forEach(function(q){if(q.bank===name&&q.course===state.course)q.bank=nn;});if(ui.bank===name)ui.bank=nn;changed();}renderIO();};
    bs[0].onclick=done;bs[1].onclick=renderIO;inp.onkeydown=function(e){if(e.key==='Enter')done();if(e.key==='Escape')renderIO();};
  };});
  $('#addCourse').onclick=function(){var v=$('#newCourse').value.trim();if(!v)return;if(state.courses.indexOf(v)>=0){toast('You already have '+v+'.');return;}state.courses.push(v);changed();switchCourse(v);};
  $('#newCourse').onkeydown=function(e){if(e.key==='Enter')$('#addCourse').click();};
  $$('[data-crename]').forEach(function(b){b.onclick=function(){
    var li=b.closest('li'),name=b.dataset.crename;li.innerHTML='<input type="text" value="'+esc(name)+'" style="flex:1"><button class="small primary">Save</button><button class="small ghost">Cancel</button>';
    var inp=$('input',li);inp.focus();inp.select();var bs=$$('button',li);
    var done=function(){var nn=inp.value.trim();if(nn&&nn!==name){if(state.courses.indexOf(nn)>=0){toast('You already have '+nn+'.');return;}state.courses[state.courses.indexOf(name)]=nn;state.questions.forEach(function(q){if(q.course===name)q.course=nn;});state.savedTests.forEach(function(t){if(t.course===name)t.course=nn;});if(state.courseTests[name]){state.courseTests[nn]=state.courseTests[name];delete state.courseTests[name];}if(state.course===name){state.course=nn;if(state.settings.course===name)state.settings.course=nn;}changed();}render();};
    bs[0].onclick=done;bs[1].onclick=renderIO;inp.onkeydown=function(e){if(e.key==='Enter')done();if(e.key==='Escape')renderIO();};
  };});
  $$('[data-cdel]').forEach(function(b){b.onclick=function(){
    var name=b.dataset.cdel,n=state.questions.filter(function(q){return q.course===name;}).length;
    if(!b.classList.contains('danger')){b.classList.add('danger');b.textContent=n?'Delete with '+n+' questions?':'Delete?';setTimeout(function(){if(document.body.contains(b)){b.classList.remove('danger');b.textContent='Delete';}},3500);return;}
    var prev=JSON.parse(JSON.stringify({questions:state.questions,courses:state.courses,courseTests:state.courseTests,savedTests:state.savedTests}));
    if(state.course===name){var other=state.courses.filter(function(c){return c!==name;})[0];switchCourse(other);}
    state.questions=state.questions.filter(function(q){return q.course!==name;});state.courses=state.courses.filter(function(c){return c!==name;});delete state.courseTests[name];state.savedTests=state.savedTests.filter(function(t){return t.course!==name;});
    changed();render();toast('Deleted '+name+'.',function(){state.questions=prev.questions;state.courses=prev.courses;state.courseTests=prev.courseTests;state.savedTests=prev.savedTests;changed();render();});
  };});
  $('#bkOut').onclick=function(){var d=new Date(),stamp=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');saveFile('ALittleCandleTestBuilder backup '+stamp+'.json',JSON.stringify({app:'test-builder',version:1,saved:d.toISOString(),state:state}),'application/json');ui.lastBackup=d.toISOString();saveUi();renderIO();};
  $('#bkIn').onchange=function(){
    var f=this.files&&this.files[0],res=$('#bkRes'),inp=this;if(!f)return;
    var rd=new FileReader();rd.onload=function(){
      inp.value='';var data;try{data=JSON.parse(rd.result);}catch(e){res.className='result bad';res.textContent='That isn’t an ALittleCandleTestBuilder backup file.';return;}
      var st=data&&data.state;if(!st||!Array.isArray(st.questions)){res.className='result bad';res.textContent='That isn’t an ALittleCandleTestBuilder backup file.';return;}
      restoreChoice(normalize(st),data.saved);
    };rd.readAsText(f);
  };
  $('#docxFile').onchange=function(){var f=this.files&&this.files[0];this.value='';if(f)wordImport(f);};
  $('#pdfFile').onchange=function(){var f=this.files&&this.files[0];this.value='';if(f)pdfImport(f);};
  $('#pasteGo').onclick=function(){
    var r=parseText($('#pasteBox').value,$('#pasteBank').value.trim()||'My questions',$('#pasteTopic').value.trim()),res=$('#pasteRes');
    if(!r.qs.length){res.className='result bad';res.textContent=r.errors[0]||'Nothing to import. Paste some questions first.';return;}
    r.qs.forEach(function(q){q.course=state.course;});state.questions=state.questions.concat(r.qs);changed();renderTabs();$('#pasteBox').value='';
    res.className='result ok';res.innerHTML='Imported '+r.qs.length+' question'+(r.qs.length>1?'s':'')+'. Find them on the Question bank tab.'+(r.errors.length?'<div style="color:var(--danger);margin-top:6px">Check: '+r.errors.slice(0,6).map(esc).join(' · ')+'</div>':'');
  };
  $('#csvFile').onchange=function(){
    var f=this.files&&this.files[0],inp=this;if(!f)return;
    var rd=new FileReader();rd.onload=function(){
      inp.value='';var r=fromCSV(String(rd.result||''),f.name.replace(/\.csv$/i,'')),res=$('#csvRes');
      if(!r.qs.length){res.className='result bad';res.textContent=r.errors[0]||'No questions found in that file.';return;}
      r.qs.forEach(function(q){if(!q.course)q.course=state.course;else if(state.courses.indexOf(q.course)<0)state.courses.push(q.course);});state.questions=state.questions.concat(r.qs);changed();renderTabs();
      res.className='result ok';res.innerHTML='Imported '+r.qs.length+' question'+(r.qs.length>1?'s':'')+'.'+(r.errors.length?'<div style="color:var(--danger);margin-top:6px">'+r.errors.slice(0,6).map(esc).join(' · ')+'</div>':'');
    };rd.readAsText(f);
  };
  $('#csvOut').onclick=function(){saveFile(fileBase(state.course)+' question bank.csv',toCSV(cq()),'text/csv');};
  $('#csvTpl').onclick=function(){saveFile('Question bank template.csv','\uFEFF'+CSV_HEAD.join(',')+'\r\n'+state.course+',MC,My questions,,Unit 1,1.1,Chapter 1,,,,,,,,1,Which planet is closest to the sun?,A,Mercury,Venus,Earth,Mars,,,,\r\n'+state.course+',TF,My questions,,Unit 1,1.1,Chapter 1,,,,,,,,1,The moon makes its own light.,False,,,,,,,,\r\n'+state.course+',Open,My questions,,Unit 1,1.1,Chapter 1,,,,,,,,4,Explain why we have seasons.,Tilt of Earth\'s axis,,,,,,,8,\r\n','text/csv');};
}
function importBnks(files){
  var res=$('#bnkRes');res.className='result';res.textContent='Reading '+files.length+' file'+(files.length>1?'s':'')+'…';
  var msgs=[],total=0,i=0;
  function next(){
    if(i>=files.length){
      if(total)changed();renderTabs();if(ui.tab==='io')renderIO();
      var r=$('#bnkRes');if(r){r.className='result '+(total?'ok':'bad');r.innerHTML=msgs.join('<br>')+(total?'<div style="margin-top:6px"><button class="small" id="goBank">See the questions</button></div>':'');var gb=$('#goBank');if(gb)gb.onclick=function(){ui.tab='bank';render();};}
      return;
    }
    var f=files[i++];
    f.arrayBuffer().then(function(buf){return BNK.parse(buf,f.name);}).then(function(out){
      var g=guessCourse(out.title),course=(g&&state.courses.indexOf(g)>=0)?g:state.course;
      var name=out.title,existing=state.questions.filter(function(q){return q.bank===name&&q.course===course;}).length;
      if(existing){var k=2;while(state.questions.some(function(q){return q.bank===name+' ('+k+')'&&q.course===course;}))k++;name=name+' ('+k+')';}
      out.questions.forEach(function(q){q.id=uid();q.bank=name;q.course=course;fillMeta(q);});
      state.questions=state.questions.concat(out.questions);total+=out.questions.length;
      var types={};out.questions.forEach(function(q){types[q.type]=(types[q.type]||0)+1;});
      var parts=TYPE_ORDER.filter(function(t){return types[t];}).map(function(t){return types[t]+' '+TYPES[t].toLowerCase();}).join(', ');
      var miss=out.found-out.questions.length;
      msgs.push('<b>'+esc(name)+'</b> → '+esc(course)+': imported '+out.questions.length+' question'+(out.questions.length!==1?'s':'')+(parts?' ('+parts+')':'')+'.'+(existing?' You already had a bank with this name, so this copy is “'+esc(name)+'”.':'')+(miss>0?' <span style="color:var(--danger)">'+miss+' couldn’t be read.</span>':''));
      if(out.warnings.length)console.warn(f.name,out.warnings);
    }).catch(function(e){console.error(e);msgs.push('<span style="color:var(--danger)"><b>'+esc(f.name)+'</b>: '+esc(e&&e.message||e)+'</span>');}).then(function(){var r=$('#bnkRes');if(r)r.textContent='Reading… ('+i+' of '+files.length+')';setTimeout(next,0);});
  }
  next();
}

/* ================= PDF import ================= */
var imp=null;
function pdfImport(file){
  if(!window.PDFIMP){toast('PDF import isn’t available in this copy.');return;}
  var src=file.name.replace(/\.pdf$/i,'').replace(/[_]+/g,' ').trim();
  var g=parseRef(file.name);
  imp={file:file,doc:null,cards:[],source:src,bank:src,unit:'',section:'',month:g&&g.month||'',year:g&&g.year||'',mcPts:2,otherPts:2,seq:0};
  $('#modal').innerHTML='<div class="imp" id="imp"><div class="imp-top"><div><b>Import from PDF</b> <span class="hint">'+esc(file.name)+'</span></div><span class="spacer"></span><span id="impCount" class="hint"></span><button id="impCancel">Cancel</button><button class="primary" id="impAdd" disabled>Add questions</button></div>'+
    '<div class="imp-bar"><label>Source<input type="text" id="impSrc" value="'+esc(imp.source)+'" style="width:220px"></label><label>Bank<input type="text" id="impBank" list="impBanks" value="'+esc(imp.bank)+'" style="width:200px"><datalist id="impBanks">'+uniq('bank').map(function(b){return '<option value="'+esc(b)+'">';}).join('')+'</datalist></label><label>Unit<input type="text" id="impUnit" list="impUnits" style="width:110px"><datalist id="impUnits">'+uniq('unit').map(function(b){return '<option value="'+esc(b)+'">';}).join('')+'</datalist></label><label>Section<input type="text" id="impSec" style="width:80px"></label>'+
    '<label>Month<select id="impMo"><option value="">—</option>'+['01','02','03','04','05','06','07','08','09','10','11','12'].map(function(m){return '<option value="'+m+'"'+(imp.month===m?' selected':'')+'>'+monthName(m)+'</option>';}).join('')+'</select></label><label>Year<input type="number" id="impYr" value="'+esc(imp.year)+'" style="width:80px"></label>'+
    '<label>Points: MC<input type="number" id="impMcPts" value="2" min="0" step="0.5" style="width:56px"></label><label>others<input type="number" id="impOtPts" value="2" min="0" step="0.5" style="width:56px"></label></div>'+
    '<div class="imp-bar"><label style="flex:1">Answer key <input type="text" id="impKey" placeholder="Optional: paste answers in order, like 2 4 1 3 …  or  1-2, 2-4, 3-1" style="flex:1"></label><button class="small" id="impKeyGo">Fill in answers</button></div>'+
    '<div class="imp-body"><div class="imp-list" id="impList"><div class="imp-status" id="impStatus">Opening the PDF…</div></div><div class="imp-pages"><div class="hint" style="margin-bottom:8px">Missed something? <b>Drag a box</b> around it on the page to add it as a picture question.</div><div id="impPages"></div></div></div></div>';
  $('#impCancel').onclick=function(){if(imp&&imp.cards.length&&!confirmClose())return;closeImp();};
  ['impSrc','impBank','impUnit','impSec','impMo','impYr','impMcPts','impOtPts'].forEach(function(id){$('#'+id).addEventListener('input',function(){if(id==='impSrc'){var b=$('#impBank');if(b.value===imp.source)b.value=this.value;imp.source=this.value;}});});
  $('#impKeyGo').onclick=applyKey;
  $('#impAdd').onclick=commitImp;
  var st=function(t){var el=$('#impStatus');if(el)el.textContent=t;};
  file.arrayBuffer().then(function(buf){return PDFIMP.open(new Uint8Array(buf),st);}).then(function(doc){
    imp.doc=doc;
    if(!doc.found.length)st('No numbered questions were found. Draw boxes on the pages to clip questions as pictures.');
    return PDFIMP.cropAll(doc,st).then(function(){
      doc.found.forEach(function(r){imp.cards.push(newCard(r));});
      drawCards();drawPages();
    });
  }).catch(function(e){console.error(e);st('Couldn’t read this PDF: '+(e&&e.message||e));});
}
var confirmArmed=0;
function confirmClose(){if(Date.now()-confirmArmed<4000)return true;confirmArmed=Date.now();toast('Click Cancel again to close without adding these questions.');return false;}
function closeImp(){$('#modal').innerHTML='';imp=null;}
function newCard(r){
  var c={id:++imp.seq,r:r,num:r?r.num:null,mode:r?r.suggest:'pic',answer:-1,
    type:r?(r.choices?'mc':'es'):'es',
    stemHtml:r?textToHtml(r.stemText):'',choiceHtml:r&&r.choices?r.choices.map(function(ch){return textToHtml(ch.text);}):[],nImg:4};
  return c;
}
function cardHtml(c){
  var r=c.r,h='<div class="imp-card'+(c.mode==='skip'?' skip':'')+'" data-card="'+c.id+'"><div class="imp-head"><b>'+(c.num?'#'+c.num:'Clipped')+'</b><span class="hint">page '+((r?r.page:c.page)+1)+'</span>'+(r&&r.warn.length?'<span class="imp-warn">'+esc(r.warn.join(' · '))+'</span>':'')+'<span class="spacer"></span>';
  if(r)h+='<span class="seg">'+[['text','Text'],['pic','Picture'],['skip','Skip']].map(function(m){return '<button data-mode="'+m[0]+'" class="'+(c.mode===m[0]?'on':'')+'">'+m[1]+'</button>';}).join('')+'</span>';
  else h+='<span class="seg"><button data-mode="pic" class="'+(c.mode!=='skip'?'on':'')+'">Keep</button><button data-mode="skip" class="'+(c.mode==='skip'?'on':'')+'">Remove</button></span>';
  h+='</div>';
  if(c.mode==='skip')return h+'</div>';
  var hasCh=r&&r.choices;
  var types=hasCh?[['mc','Multiple choice'],['bm','Bimodal'],['es','Open response'],['sa','Short answer']]:[['es','Open response'],['sa','Short answer'],['mcimg','Multiple choice (choices are in the picture)']];
  h+='<div class="imp-opts"><select data-type>'+types.map(function(t){return '<option value="'+t[0]+'"'+(c.type===t[0]?' selected':'')+'>'+t[1]+'</option>';}).join('')+'</select>';
  var nch=hasCh?r.choices.length:(c.type==='mcimg'?c.nImg:0);
  if(c.type==='mcimg')h+='<label class="hint">choices <select data-nimg>'+[2,3,4,5].map(function(n){return '<option'+(n===c.nImg?' selected':'')+'>'+n+'</option>';}).join('')+'</select></label>';
  if((hasCh&&(c.type==='mc'||c.type==='bm'))||c.type==='mcimg'){
    h+='<span class="hint">Correct:</span><span class="ansbtns">';for(var i=0;i<nch;i++)h+='<button data-ans="'+i+'" class="'+(c.answer===i?'on':'')+'">'+(i+1)+'</button>';h+='</span>';
  }
  h+='</div>';
  if(c.mode==='text'){
    h+='<div class="rich imp-rich" contenteditable="true" data-stem>'+c.stemHtml+'</div>';
    if(hasCh&&(c.type==='mc'||c.type==='bm'))h+='<ol class="imp-ch">'+c.choiceHtml.map(function(x,i){return '<li><b>('+(i+1)+')</b><div class="rich imp-rich" contenteditable="true" data-ch="'+i+'">'+x+'</div></li>';}).join('')+'</ol>';
  }else{
    var img=r?r.stemImg:c.img;
    h+='<div class="imp-pic">'+(img?PDFIMP.imgHtml(img):'<i class="hint">(no picture)</i>')+'</div>';
    if(hasCh&&(c.type==='mc'||c.type==='bm'))h+='<ol class="imp-ch">'+r.choices.map(function(ch,i){return '<li><b>('+(i+1)+')</b><div class="imp-pic">'+(ch.img?PDFIMP.imgHtml(ch.img):'<i class="hint">empty</i>')+'</div></li>';}).join('')+'</ol>';
  }
  return h+'</div>';
}
function syncCard(el,c){
  var st=$('[data-stem]',el);if(st)c.stemHtml=st.innerHTML;
  $$('[data-ch]',el).forEach(function(x){c.choiceHtml[+x.dataset.ch]=x.innerHTML;});
}
function drawCards(){
  var list=$('#impList');if(!list)return;
  list.innerHTML=imp.cards.length?imp.cards.map(cardHtml).join(''):'<div class="imp-status">No questions yet. Drag a box around a question on a page to add it.</div>';
  $$('.imp-card',list).forEach(function(el){
    var c=imp.cards.filter(function(x){return x.id===+el.dataset.card;})[0];
    $$('[data-mode]',el).forEach(function(b){b.onclick=function(){syncCard(el,c);c.mode=b.dataset.mode;redrawCard(el,c);};});
    var ts=$('[data-type]',el);if(ts)ts.onchange=function(){syncCard(el,c);c.type=this.value;if(c.type!=='mc'&&c.type!=='bm'&&c.type!=='mcimg')c.answer=-1;redrawCard(el,c);};
    var ni=$('[data-nimg]',el);if(ni)ni.onchange=function(){c.nImg=+this.value;if(c.answer>=c.nImg)c.answer=-1;redrawCard(el,c);};
    $$('[data-ans]',el).forEach(function(b){b.onclick=function(){syncCard(el,c);c.answer=+b.dataset.ans;$$('[data-ans]',el).forEach(function(x){x.classList.toggle('on',x===b);});updateCount();};});
    $$('.imp-rich',el).forEach(function(r){r.addEventListener('paste',function(e){e.preventDefault();document.execCommand('insertText',false,(e.clipboardData||{getData:function(){return '';}}).getData('text/plain'));});});
  });
  updateCount();
}
function redrawCard(el,c){var tmp=document.createElement('div');tmp.innerHTML=cardHtml(c);el.replaceWith(tmp.firstChild);drawCards();}
function updateCount(){
  if(!imp)return;var n=imp.cards.filter(function(c){return c.mode!=='skip';}).length,na=imp.cards.filter(function(c){return c.mode!=='skip'&&(c.type==='mc'||c.type==='bm'||c.type==='mcimg')&&c.answer<0;}).length;
  $('#impAdd').disabled=!n;$('#impAdd').textContent='Add '+n+' question'+(n!==1?'s':'');
  $('#impCount').textContent=na?na+' multiple-choice question'+(na>1?'s still need':' still needs')+' a correct answer':'';
}
function applyKey(){
  var t=$('#impKey').value.trim();if(!t)return;
  var pairs=[],m,re=/(\d{1,2})\s*[.):\-=]\s*\(?([1-8A-Ha-h])\)?/g;
  while((m=re.exec(t)))pairs.push([+m[1],m[2]]);
  var toIdx=function(v){return /\d/.test(v)?(+v)-1:v.toUpperCase().charCodeAt(0)-65;};
  var mcs=imp.cards.filter(function(c){return c.mode!=='skip'&&(c.type==='mc'||c.type==='bm'||c.type==='mcimg');}),n=0;
  $$('.imp-card').forEach(function(el){var c=imp.cards.filter(function(x){return x.id===+el.dataset.card;})[0];if(c&&c.mode!=='skip')syncCard(el,c);});
  if(pairs.length>=2){pairs.forEach(function(p){var c=mcs.filter(function(x){return x.num===p[0];})[0];if(c){c.answer=toIdx(p[1]);n++;}});}
  else{var toks=t.split(/[\s,;]+/).filter(function(x){return /^\(?[1-8A-Ha-h]\)?$/.test(x);}).map(function(x){return x.replace(/[()]/g,'');});toks.forEach(function(v,i){if(mcs[i]){mcs[i].answer=toIdx(v);n++;}});}
  drawCards();toast(n?'Filled in '+n+' answer'+(n>1?'s':'')+'.':'Couldn’t match those answers to the questions.');
}
function drawPages(){
  var wrap=$('#impPages');if(!wrap||!imp.doc)return;
  var n=imp.doc.pages.length,W=Math.min(560,Math.max(320,(wrap.clientWidth||520)-4));
  wrap.innerHTML='';
  var chain=Promise.resolve();
  for(var i=0;i<n;i++)(function(pi){
    var box=document.createElement('div');box.className='imp-page';box.innerHTML='<div class="hint">Page '+(pi+1)+'</div>';wrap.appendChild(box);
    chain=chain.then(function(){if(!imp)return;return PDFIMP.thumb(imp.doc,pi,W).then(function(t){
      if(!imp)return;var holder=document.createElement('div');holder.className='imp-canvas';holder.appendChild(t.canvas);box.appendChild(holder);
      t.canvas.style.width=W+'px';
      imp.doc.found.forEach(function(r){if(r.page!==pi)return;var o=document.createElement('div');o.className='imp-found';o.style.left=(r.stemBox.x0-24)*t.scale+'px';o.style.top=r.stemBox.y0*t.scale+'px';o.style.width=(r.right-r.stemBox.x0+24)*t.scale+'px';var bot=r.stemImg?r.stemImg.bottom:r.stemBox.y1;if(r.choices)r.choices.forEach(function(ch){if(ch.img&&ch.img.bottom>bot)bot=ch.img.bottom;});o.style.height=Math.max(20,(bot+4-r.stemBox.y0)*t.scale)+'px';o.innerHTML='<span>#'+r.num+'</span>';holder.appendChild(o);});
      wireClip(holder,pi,t.scale);
    });});
  })(i);
}
function wireClip(holder,pi,scale){
  var start=null,rect=null;
  holder.addEventListener('mousedown',function(e){if(e.button!==0)return;e.preventDefault();var b=holder.getBoundingClientRect();start={x:e.clientX-b.left,y:e.clientY-b.top};rect=document.createElement('div');rect.className='imp-sel';holder.appendChild(rect);});
  window.addEventListener('mousemove',function(e){if(!start||!rect)return;var b=holder.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top;rect.style.left=Math.min(x,start.x)+'px';rect.style.top=Math.min(y,start.y)+'px';rect.style.width=Math.abs(x-start.x)+'px';rect.style.height=Math.abs(y-start.y)+'px';});
  window.addEventListener('mouseup',function(e){
    if(!start||!rect)return;var b=holder.getBoundingClientRect(),x=e.clientX-b.left,y=e.clientY-b.top,s0=start;start=null;
    var box={page:pi,x0:Math.min(x,s0.x)/scale,x1:Math.max(x,s0.x)/scale,y0:Math.min(y,s0.y)/scale,y1:Math.max(y,s0.y)/scale};
    var rr=rect;setTimeout(function(){rr.remove();},600);rect=null;
    if(box.x1-box.x0<12||box.y1-box.y0<8)return;
    PDFIMP.clip(imp.doc,pi,box).then(function(img){
      if(!img||!imp){toast('That box is empty.');return;}
      var c=newCard(null);c.page=pi;c.img=img;c.mode='pic';c.type='es';imp.cards.push(c);
      imp.cards.sort(function(a,b){var pa=a.r?a.r.page:a.page,pb=b.r?b.r.page:b.page;if(pa!==pb)return pa-pb;var ya=a.r?a.r.top:a.img.top,yb=b.r?b.r.top:b.img.top;return ya-yb;});
      drawCards();var el=$('[data-card="'+c.id+'"]');if(el)el.scrollIntoView({behavior:'smooth',block:'center'});
      toast('Added a picture question from page '+(pi+1)+'.');
    });
  });
}
function commitImp(){
  $$('.imp-card').forEach(function(el){var c=imp.cards.filter(function(x){return x.id===+el.dataset.card;})[0];if(c&&c.mode!=='skip')syncCard(el,c);});
  var src=$('#impSrc').value.trim(),bank=$('#impBank').value.trim()||src||'PDF import',unit=$('#impUnit').value.trim(),sec=$('#impSec').value.trim(),mo=$('#impMo').value,yr=parseInt($('#impYr').value,10)||'',mcp=num($('#impMcPts').value,2),otp=num($('#impOtPts').value,2);
  var added=[],noAns=0;
  imp.cards.forEach(function(c){
    if(c.mode==='skip')return;
    var r=c.r,q={id:uid(),course:state.course,bank:bank,source:src,unit:unit,section:sec,topic:'',standard:'',ref:'',notes:'',month:mo,year:yr,qnum:c.num&&c.num<=99?c.num:'',cluster:'',subtopic:''};
    q.searchText=r?(r.stemText+' '+(r.choices?r.choices.map(function(x){return x.text;}).join(' '):'')).replace(/\s+/g,' '):'';
    var t=c.type;
    if(t==='mcimg'){
      q.type='mc';q.inImage=true;q.lockChoices=true;q.html=c.img?PDFIMP.imgHtml(c.img):'';q.choices=[];for(var i=0;i<c.nImg;i++)q.choices.push('('+(i+1)+')');q.answer=c.answer;q.points=mcp;
    }else if(t==='mc'||t==='bm'){
      q.type=t;q.points=mcp;q.answer=c.answer;q.lockChoices=false;
      if(c.mode==='text'){q.html=sanitize(c.stemHtml);q.choices=c.choiceHtml.map(function(x){return sanitize(x);});}
      else{q.html=PDFIMP.imgHtml(r.stemImg);q.choices=r.choices.map(function(ch,i){return ch.img?PDFIMP.imgHtml(ch.img):textToHtml(ch.text||('('+(i+1)+')'));});}
      if(t==='bm')q.space=2;
    }else{
      q.type=t;q.points=otp;q.answer='';
      if(c.mode==='text'&&r)q.html=sanitize(c.stemHtml);
      else q.html=PDFIMP.imgHtml(r?(r.choices?r.wholeImg:r.stemImg):c.img);
      if(t==='es'){q.answerArea='space';var blank=r&&r.stemImg?(r.limitBottom-r.stemImg.bottom)/72:2.5;q.space=Math.max(1.5,Math.min(7,Math.round(blank*4)/4));}
      else q.lines=1;
    }
    if(!q.html){return;}
    if((q.type==='mc'||q.type==='bm')&&q.answer<0)noAns++;
    fillMeta(q);added.push(q);
  });
  if(!added.length){toast('Nothing to add.');return;}
  state.questions=state.questions.concat(added);changed();closeImp();ui.tab='bank';ui.source=src;ui.bank='';render();
  toast('Added '+added.length+' question'+(added.length>1?'s':'')+' from “'+src+'”'+(noAns?'. '+noAns+' still need a correct answer.':'.'));
}

/* ================= Word import ================= */
var wimp=null;
function wordImport(file){
  if(!window.DOCX){toast('Word import isn’t available in this copy.');return;}
  if(/\.doc$/i.test(file.name)){toast('That’s an older .doc file. In Word, use File → Save As → Word Document (.docx), then import it.');return;}
  var src=file.name.replace(/\.docx$/i,'').replace(/[_]+/g,' ').trim();
  $('#modal').innerHTML='<div class="imp"><div class="imp-top"><div><b>Import from Word</b> <span class="hint">'+esc(file.name)+'</span></div><span class="spacer"></span><span id="wCount" class="hint"></span><button id="wCancel">Cancel</button><button class="primary" id="wAdd" disabled>Add questions</button></div><div class="imp-bar" id="wBar"></div><div class="imp-one" id="wList"><div class="imp-status">Reading the Word file…</div></div></div>';
  $('#wCancel').onclick=function(){$('#modal').innerHTML='';wimp=null;};
  file.arrayBuffer().then(function(buf){return DOCX.parse(buf,file.name);}).then(function(res){
    wimp={src:src,header:res.header,cards:res.questions.map(function(q,i){var c=Object.assign({id:i+1,skip:/^bonus/i.test(q.part||''),answer:-1},q);if(c.type==='mc'&&c.choices&&c.choices.length===2&&/^true$/i.test(plain(c.choices[0]))&&/^false$/i.test(plain(c.choices[1])))c.type='tf';return c;})};
    var H=res.header||{},hdrDesc=[H.running,H.title,H.topic].filter(Boolean).join(' · ');
    $('#wBar').innerHTML='<label>Source<input type="text" id="wSrc" value="'+esc(src)+'" style="width:220px"></label><label>Bank<input type="text" id="wBank" list="wBanks" value="'+esc(src)+'" style="width:200px"><datalist id="wBanks">'+uniq('bank').map(function(b){return '<option value="'+esc(b)+'">';}).join('')+'</datalist></label><label>Unit<input type="text" id="wUnit" list="wUnits" style="width:110px"><datalist id="wUnits">'+uniq('unit').map(function(b){return '<option value="'+esc(b)+'">';}).join('')+'</datalist></label><label>Section<input type="text" id="wSec" style="width:80px"></label>'+
      '<label><input type="checkbox" id="wSel"'+(state.selected.length?'':' checked')+'> Put them on the test</label>'+
      (hdrDesc?'<label title="Sets the Classic layout on Build &amp; print"><input type="checkbox" id="wHdr" checked> Use this file’s header for my printed tests: <b style="font-weight:600">'+esc(hdrDesc)+'</b></label>':'');
    $('#wSrc').oninput=function(){var b=$('#wBank');if(b.value===wimp.src)b.value=this.value;wimp.src=this.value;};
    drawWCards();
  }).catch(function(e){console.error(e);var l=$('#wList');if(l)l.innerHTML='<div class="imp-status" style="color:var(--danger)">Couldn’t read this file: '+esc(e&&e.message||e)+'</div>';});
}
function wCardHtml(c){
  var h='<div class="imp-card'+(c.skip?' skip':'')+'" data-w="'+c.id+'"><div class="imp-head"><b>#'+c.num+'</b>'+(c.part?'<span class="hint">'+esc(c.part)+'</span>':'')+'<span class="spacer"></span><span class="seg"><button data-wk="keep" class="'+(c.skip?'':'on')+'">Keep</button><button data-wk="skip" class="'+(c.skip?'on':'')+'">Skip</button></span></div>';
  if(c.skip)return h+'</div>';
  var hasCh=c.choices&&c.choices.length>=2;
  var types=hasCh?[['mc','Multiple choice'],['bm','Bimodal'],['tf','True / False'],['es','Open response'],['sa','Short answer']]:[['es','Open response'],['sa','Short answer']];
  h+='<div class="imp-opts"><select data-wt>'+types.map(function(t){return '<option value="'+t[0]+'"'+(c.type===t[0]?' selected':'')+'>'+t[1]+'</option>';}).join('')+'</select><label class="hint">Points <input type="number" data-wp min="0" step="0.5" value="'+esc(c.points!=null?c.points:'')+'" style="width:58px"></label>';
  if(hasCh&&(c.type==='mc'||c.type==='bm')){h+='<span class="hint">Correct:</span><span class="ansbtns">'+c.choices.map(function(_,i){return '<button data-wa="'+i+'" class="'+(c.answer===i?'on':'')+'">'+LETTERS[i].toLowerCase()+'</button>';}).join('')+'</span>';}
  if(c.type==='tf')h+='<span class="hint">Correct:</span><span class="ansbtns"><button data-wa="0" class="'+(c.answer===0?'on':'')+'">True</button><button data-wa="1" class="'+(c.answer===1?'on':'')+'">False</button></span>';
  h+='</div><div class="rich imp-rich qbody" contenteditable="true" data-ws>'+c.html+'</div>';
  if(hasCh&&(c.type==='mc'||c.type==='bm'))h+='<ol class="imp-ch">'+c.choices.map(function(x,i){return '<li><b>'+LETTERS[i].toLowerCase()+'.</b><div class="rich imp-rich qbody" contenteditable="true" data-wc="'+i+'">'+x+'</div></li>';}).join('')+'</ol>';
  return h+'</div>';
}
function wSync(el,c){var st=$('[data-ws]',el);if(st)c.html=st.innerHTML;$$('[data-wc]',el).forEach(function(x){c.choices[+x.dataset.wc]=x.innerHTML;});var p=$('[data-wp]',el);if(p)c.points=p.value===''?null:num(p.value,1);}
function drawWCards(){
  var list=$('#wList');if(!list||!wimp)return;
  list.innerHTML=wimp.cards.length?wimp.cards.map(wCardHtml).join(''):'<div class="imp-status">No numbered questions were found in this file.</div>';
  $$('.imp-card',list).forEach(function(el){
    var c=wimp.cards.filter(function(x){return x.id===+el.dataset.w;})[0];
    $$('[data-wk]',el).forEach(function(b){b.onclick=function(){wSync(el,c);c.skip=b.dataset.wk==='skip';drawWCards();};});
    var t=$('[data-wt]',el);if(t)t.onchange=function(){wSync(el,c);c.type=this.value;c.answer=-1;drawWCards();};
    $$('[data-wa]',el).forEach(function(b){b.onclick=function(){wSync(el,c);c.answer=+b.dataset.wa;$$('[data-wa]',el).forEach(function(x){x.classList.toggle('on',x===b);});wCount();};});
    $$('.imp-rich',el).forEach(function(r){r.addEventListener('paste',function(e){e.preventDefault();document.execCommand('insertText',false,(e.clipboardData||{getData:function(){return '';}}).getData('text/plain'));});});
  });
  wCount();
}
function wCount(){
  if(!wimp)return;var n=wimp.cards.filter(function(c){return !c.skip;}).length,na=wimp.cards.filter(function(c){return !c.skip&&(c.type==='mc'||c.type==='bm'||c.type==='tf')&&c.answer<0;}).length;
  $('#wAdd').disabled=!n;$('#wAdd').textContent='Add '+n+' question'+(n!==1?'s':'');
  $('#wCount').textContent=na?na+' still need'+(na>1?'':'s')+' a correct answer':'';
  $('#wAdd').onclick=wCommit;
}
function wCommit(){
  $$('#wList .imp-card').forEach(function(el){var c=wimp.cards.filter(function(x){return x.id===+el.dataset.w;})[0];if(c&&!c.skip)wSync(el,c);});
  var src=$('#wSrc').value.trim(),bank=$('#wBank').value.trim()||src||'Word import',unit=$('#wUnit').value.trim(),sec=$('#wSec').value.trim(),sel=$('#wSel').checked,hdr=$('#wHdr')&&$('#wHdr').checked;
  var added=[];
  wimp.cards.forEach(function(c){
    if(c.skip)return;
    var q={id:uid(),course:state.course,bank:bank,source:src,unit:unit,section:sec,part:c.part&&!/^bonus/i.test(c.part)?c.part:(c.part||''),topic:'',standard:'',ref:'',notes:'',points:c.points!=null?c.points:1,type:c.type,html:sanitize(c.html)};
    if(c.type==='mc'||c.type==='bm'){q.choices=c.choices.map(function(x){return sanitize(x);});q.answer=c.answer;q.lockChoices=false;if(c.type==='bm')q.space=2;}
    else if(c.type==='tf'){q.answer=c.answer===0?'T':c.answer===1?'F':'';}
    else if(c.type==='sa'){q.answer='';q.lines=c.blanks?0:1;}
    else{q.answer='';q.answerArea='space';q.space=c.space!=null?c.space:2;}
    fillMeta(q);added.push(q);
  });
  if(!added.length){toast('Nothing to add.');return;}
  state.questions=state.questions.concat(added);
  if(sel)added.forEach(function(q){if(!isSel(q.id))state.selected.push(q.id);});
  if(hdr){var H=wimp.header||{},st=state.settings;st.style='classic';if(st.instructions==='Read each question carefully.')st.instructions='';if(H.running)st.headerText=H.running;if(H.title){st.title=H.title;var mq=H.title.match(/Quarter\s*(\d+)/i),mu=H.title.match(/Unit\s*(\d+)/i);if(mq)st.quarter=mq[1];if(mu)st.unitNum=mu[1];st.docType=/quiz/i.test(H.title)?'quiz':'test';if(st.title===autoTitle())st.title='';}if(H.topic)st.topic=H.topic;st.nameLine=!!H.nameLine||st.nameLine;st.group=true;if(st.labels==='num')st.labels='lowerdot';}
  changed();$('#modal').innerHTML='';var nAdded=added.length;wimp=null;ui.tab=sel?'build':'bank';ui.source=sel?ui.source:src;render();
  toast('Added '+nAdded+' question'+(nAdded>1?'s':'')+' from “'+src+'”'+(sel?' and put them on the test':'')+'.');
}

/* ================= accounts ================= */
function cloudStatus(t){
  var el=$('#cloud');if(!el)return;var u=CLOUD.user();
  var warn=/offline|problem|signed out/i.test(t||'');
  el.innerHTML='<span class="cloudchip'+(warn?' warn':'')+'" title="Your questions are saved to your account so they follow you to any computer.">☁ '+esc(t||'')+'</span><button class="small ghost" id="acctBtn">'+esc(u&&u.email||'Account')+' ▾</button>';
  $('#acctBtn').onclick=acctMenu;
}
function acctMenu(){
  var old=$('#acctMenu');if(old){old.remove();return;}
  var m=document.createElement('div');m.id='acctMenu';m.className='acctmenu';
  var u0=CLOUD.user();
  m.innerHTML='<button data-a="sync">Sync now</button><button data-a="pw">Change password</button>'+(u0&&u0.admin&&CLOUD.selfHosted?'<button data-a="users">Manage accounts</button>':'')+'<button data-a="out">Sign out</button>';
  document.body.appendChild(m);
  var b=$('#acctBtn').getBoundingClientRect();m.style.top=(b.bottom+4+window.scrollY)+'px';m.style.right=Math.max(8,window.innerWidth-b.right)+'px';
  $$('button',m).forEach(function(x){x.onclick=function(){m.remove();
    if(x.dataset.a==='sync')CLOUD.sync();
    if(x.dataset.a==='pw')pwDialog(false);
    if(x.dataset.a==='out')signOutNow();
    if(x.dataset.a==='users')usersDialog();
  };});
  setTimeout(function(){document.addEventListener('click',function close(e){if(!m.contains(e.target)&&e.target.id!=='acctBtn'){m.remove();document.removeEventListener('click',close);}});},0);
}
function pwDialog(recovery){
  $('#modal').innerHTML='<div class="overlay" id="ov"><div class="dialog" style="width:min(440px,100%)"><h2>'+(recovery?'Choose a new password':'Change your password')+'</h2><div class="fields"><label><span class="lbl">New password</span><input type="password" id="pw1" autocomplete="new-password" style="width:100%"></label><label><span class="lbl">Type it again</span><input type="password" id="pw2" autocomplete="new-password" style="width:100%"></label></div><p class="err" id="pwErr"></p><div class="dlg-actions"><span class="spacer"></span>'+(recovery?'':'<button id="pwX">Cancel</button>')+'<button class="primary" id="pwGo">Save password</button></div></div></div>';
  if($('#pwX'))$('#pwX').onclick=function(){$('#modal').innerHTML='';};
  $('#pw1').focus();
  $('#pwGo').onclick=function(){
    var a=$('#pw1').value,b=$('#pw2').value,er=$('#pwErr');
    if(a.length<8){er.textContent='Use at least 8 characters.';return;}
    if(a!==b){er.textContent='The two passwords don’t match.';return;}
    this.disabled=true;
    CLOUD.changePassword(a).then(function(){$('#modal').innerHTML='';toast('Password changed.');},function(e){er.textContent=e.message;$('#pwGo').disabled=false;});
  };
}
function signOutNow(){
  setStatus('Signing out…');
  var uid=CLOUD.user()&&CLOUD.user().id;
  Promise.resolve(saveTimer?persist():null).then(function(){return CLOUD.sync();}).catch(function(){}).then(function(){
    var dels=[];
    if(db&&uid){try{var tx=db.transaction('kv','readwrite');tx.objectStore('kv').delete('state:'+uid);tx.objectStore('kv').delete('meta:'+uid);}catch(e){}}
    CLOUD.signOut();setTimeout(function(){location.reload();},300);
  });
}
function loginScreen(msg){
  root.innerHTML='<div class="login"><div class="login-card"><div class="brand" style="justify-content:center;margin-bottom:6px"><span class="mark" aria-hidden="true">'+BRAND_SVG+'</span>ALittleCandleTestBuilder</div><p class="hint" style="text-align:center;margin:0 0 18px">Sign in to your question banks.</p>'+
    '<form id="lf"><label><span class="lbl">Email</span><input type="email" id="le" autocomplete="username" required style="width:100%"></label><label style="margin-top:10px"><span class="lbl">Password</span><input type="password" id="lp" autocomplete="current-password" required style="width:100%"></label><p class="err" id="lerr">'+esc(msg||'')+'</p><button class="primary" style="width:100%;padding:10px" id="lgo">Sign in</button></form>'+
    (CLOUD.selfHosted?'<p class="hint" style="text-align:center;margin:14px 0 0">Forgot your password? Ask your site admin to reset it.</p>':'<p style="text-align:center;margin:14px 0 0"><button class="small ghost" id="lforgot">Forgot your password?</button></p>')+'<p class="hint" style="text-align:center;margin-top:16px">No account? Ask the person who set up this site to add you.</p></div></div>';
  setTimeout(function(){$('#le').focus();},30);
  $('#lf').onsubmit=function(e){e.preventDefault();var b=$('#lgo');b.disabled=true;b.textContent='Signing in…';$('#lerr').textContent='';
    CLOUD.signIn($('#le').value.trim(),$('#lp').value).then(function(){startApp();},function(err){b.disabled=false;b.textContent='Sign in';$('#lerr').textContent=err.message||'Couldn’t sign in.';});};
  if($('#lforgot'))$('#lforgot').onclick=function(){var em=$('#le').value.trim();if(!em){$('#lerr').textContent='Type your email above first, then click “Forgot your password?” again.';return;}
    CLOUD.sendReset(em).then(function(){$('#lerr').textContent='';toastOn('If that email has an account, a reset link is on its way. It opens this site so you can choose a new password.');},function(e){$('#lerr').textContent=e.message;});};
}
function tempPw(){var c='abcdefghjkmnpqrstuvwxyz23456789',s='';var r=new Uint32Array(10);(window.crypto||{getRandomValues:function(a){for(var i=0;i<a.length;i++)a[i]=Math.random()*4e9;return a;}}).getRandomValues(r);for(var i=0;i<10;i++)s+=c[r[i]%c.length];return s.slice(0,5)+'-'+s.slice(5);}
function usersDialog(){
  $('#modal').innerHTML='<div class="overlay" id="ov"><div class="dialog" style="width:min(820px,100%)"><h2>Accounts</h2><p class="note" style="margin-top:0">Each person has their own private banks. Give new people their email and temporary password; they can change it from the menu under their email.</p><div id="uList" class="hint">Loading…</div>'+
    '<h3 style="font-size:12.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:18px 0 8px">Add someone</h3><div class="pickrow" style="margin:0"><input type="email" id="nuE" placeholder="Email" style="flex:1;min-width:200px"><input type="text" id="nuP" placeholder="Temporary password" style="width:170px"><button class="small ghost" id="nuGen">Make one up</button><label style="display:flex;gap:5px;align-items:center"><input type="checkbox" id="nuA"> Admin</label><button class="small primary" id="nuGo">Add</button></div><p class="err" id="uErr"></p><div class="dlg-actions"><span class="spacer"></span><button id="uX">Done</button></div></div></div>';
  $('#uX').onclick=function(){$('#modal').innerHTML='';};
  $('#nuGen').onclick=function(){$('#nuP').value=tempPw();};
  $('#nuGo').onclick=function(){var e=$('#nuE').value.trim(),p=$('#nuP').value;$('#uErr').textContent='';
    CLOUD.request('POST','/admin/api/users',{email:e,password:p,admin:$('#nuA').checked}).then(function(){toast('Added '+e+'. Temporary password: '+p);$('#nuE').value='';$('#nuP').value='';$('#nuA').checked=false;loadUsers();},function(err){$('#uErr').textContent=err.message;});};
  loadUsers();
}
function loadUsers(){
  var me=CLOUD.user();
  CLOUD.request('GET','/admin/api/users').then(function(list){
    var box=$('#uList');if(!box)return;
    box.className='';
    box.innerHTML='<table class="utbl"><thead><tr><th>Email</th><th>Questions</th><th>Added</th><th></th></tr></thead><tbody>'+list.map(function(u){
      return '<tr data-u="'+esc(u.id)+'"><td>'+esc(u.email)+(u.admin?' <span class="tag unit">admin</span>':'')+(u.id===me.id?' <span class="hint">(you)</span>':'')+'</td><td>'+u.questions+'</td><td class="hint">'+esc(String(u.created_at).slice(0,10))+'</td><td style="text-align:right;white-space:nowrap"><button class="small ghost" data-ua="pw">Reset password</button>'+(u.id!==me.id?'<button class="small ghost" data-ua="admin">'+(u.admin?'Remove admin':'Make admin')+'</button><button class="small ghost" data-ua="del">Delete</button>':'')+'</td></tr>';
    }).join('')+'</tbody></table>';
    $$('[data-ua]',box).forEach(function(b){b.onclick=function(){
      var tr=b.closest('tr'),id=tr.dataset.u,u=list.filter(function(x){return x.id===id;})[0],act=b.dataset.ua;
      if(act==='pw'){var np=tempPw();CLOUD.request('POST','/admin/api/users/'+id+'/password',{password:np}).then(function(){toast('New temporary password for '+u.email+': '+np);var cell=tr.lastChild;cell.insertAdjacentHTML('afterbegin','<span class="tag" style="margin-right:6px;user-select:all">'+esc(np)+'</span>');},function(e){$('#uErr').textContent=e.message;});}
      if(act==='admin')CLOUD.request('POST','/admin/api/users/'+id+'/admin',{admin:!u.admin}).then(loadUsers,function(e){$('#uErr').textContent=e.message;});
      if(act==='del'){if(!b.classList.contains('danger')){b.classList.add('danger');b.textContent='Delete '+u.questions+' questions too?';setTimeout(function(){if(document.body.contains(b)){b.classList.remove('danger');b.textContent='Delete';}},4000);return;}
        CLOUD.request('DELETE','/admin/api/users/'+id).then(function(){toast('Deleted '+u.email+'.');loadUsers();},function(e){$('#uErr').textContent=e.message;});}
    };});
  },function(e){var box=$('#uList');if(box)box.textContent=e.message;});
}
function toastOn(msg){if(!$('#toast')){var t=document.createElement('div');t.className='toast';t.id='toast';document.body.appendChild(t);}toast(msg);}

/* ================= start ================= */
/* Short in-app help; the full guide is the wiki. */
var HELP_HTML='<h2 id="helpT">Help</h2>'+
  '<h3>Bring in questions</h3><p>On <b>Import &amp; backup</b>, choose ExamView banks (.bnk), a Word test (.docx), a PDF, a spreadsheet (CSV), or paste text. Or use <b>+ New question</b> on the Question bank.</p>'+
  '<h3>Find and pick questions</h3><p>On <b>Question bank</b>, search or filter by unit, section, topic and standard (<b>More filters</b> for the rest). Tick a question to put it on the test.</p>'+
  '<h3>Build and print</h3><p>On <b>Build &amp; print</b>, choose Test, Quiz, Review or Lesson, fill in the details and pick how many <b>Versions</b>. Check the paper in the preview, then use the print bar under it. To make a PDF, choose “Save as PDF” as the printer.</p>'+
  '<h3>Answer keys always match</h3><p>Versions stay the same until you press <b>New scramble</b>, so a key matches copies you’ve already printed.</p>'+
  '<h3>Keep your work safe</h3><p>On <b>Import &amp; backup</b>, use <b>Download backup</b> now and then. Signed in on the website, your work is also saved on the server.</p>'+
  '<h3>Keyboard</h3><p><kbd>Ctrl</kbd>+<kbd>Enter</kbd> saves a question, <kbd>Esc</kbd> closes the editor. From the question box, <kbd>Shift</kbd>+<kbd>Tab</kbd> reaches the symbols; arrow keys pick one.</p>'+
  '<div class="dlg-actions" style="margin-top:12px"><a href="https://github.com/ltcandalino/alittlecandle-test-builder/wiki" target="_blank" rel="noopener">Full user guide</a><span class="spacer"></span><button type="button" class="small primary" popovertarget="helpPop" popovertargetaction="hide">Done</button></div>';
/* Personal display settings (this browser only; never change the printouts). */
var DISPLAY={font:[['','Standard'],['atkinson','Atkinson Hyperlegible'],['opendyslexic','OpenDyslexic']],size:[['','Normal'],['l','Large'],['xl','Larger']]};
function applyDisplay(){var d=ui.display||{},h=document.documentElement;h.dataset.font=d.font||'';h.dataset.size=d.size||'';h.classList.toggle('hc',!!d.contrast);h.classList.toggle('calm',!!d.calm);}
function drawDisplay(){var p=$('#dispPop');if(!p)return;var d=ui.display||{};
  function group(key,label){return '<fieldset><legend>'+label+'</legend>'+DISPLAY[key].map(function(o){return '<label class="opt"><input type="radio" name="d-'+key+'" value="'+o[0]+'"'+((d[key]||'')===o[0]?' checked':'')+'><span'+(key==='font'&&o[0]?' class="f-'+o[0]+'"':'')+'>'+o[1]+'</span></label>';}).join('')+'</fieldset>';}
  p.innerHTML='<h2>Display</h2><p class="hint" style="margin:0 0 10px">Just for you, in this browser. Printed tests don’t change.</p>'+group('font','Font')+group('size','Text size')+
    '<fieldset><legend>More</legend><label class="opt"><input type="checkbox" id="d-contrast"'+(d.contrast?' checked':'')+'><span>High contrast</span></label><label class="opt"><input type="checkbox" id="d-calm"'+(d.calm?' checked':'')+'><span>Less motion</span></label></fieldset>'+
    '<div class="dlg-actions" style="margin-top:12px"><button type="button" class="small ghost" id="d-reset">Reset</button><span class="spacer"></span><button type="button" class="small primary" popovertarget="dispPop" popovertargetaction="hide">Done</button></div>';
  function set(k,v){ui.display=Object.assign({},ui.display);if(v)ui.display[k]=v;else delete ui.display[k];saveUi();applyDisplay();}
  $$('input[type=radio]',p).forEach(function(r){r.onchange=function(){set(r.name.slice(2),r.value);};});
  $('#d-contrast').onchange=function(){set('contrast',this.checked);};$('#d-calm').onchange=function(){set('calm',this.checked);};
  $('#d-reset').onclick=function(){ui.display={};saveUi();applyDisplay();drawDisplay();$('#d-reset').focus();};}
function startApp(after){
  shell();applyDisplay();drawDisplay();
  setStatus('Loading…');
  openDb().then(function(ok){
    if(!ok){storageOk=false;$('#bannerSlot').innerHTML='<div class="banner">This browser won’t let the page save on this computer'+(CLOUDON?', so changes only stay while you’re online.':', so your work disappears when you close it. Use <b>Download backup</b> on the Import tab to keep it, or open the file in Chrome, Edge or Firefox.')+'</div>';setStatus('Not saving',true);}
    return (ok?idbGet(stateKey()):Promise.resolve(null)).then(function(s){
      if(s)state=normalize(s);else state=normalize(state);
      setStatus(s?'Saved':'');render();
      if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(function(){});
      if(CLOUDON){
        cloudStatus('Connecting…');
        CLOUD.onSignedOut=function(){loginScreen('You were signed out. Please sign in again.');};
        CLOUD.start({getState:function(){return state;},idbGet:function(k){return ok?idbGet(k):Promise.resolve(null);},idbPut:function(k,v){return ok?idbPut(k,v):Promise.resolve();},
          status:cloudStatus,
          applied:function(){state=normalize(state);persistLocal();if(!$('#modal').firstChild)render();else renderTabs();},
          localChanged:function(){persistLocal();}});
      }
      if(after)after();
    });
  });
}
if(CLOUDON){
  if(/access_token=/.test(location.hash||'')){
    CLOUD.takeRecoveryFromUrl().then(function(type){startApp(function(){if(type==='recovery'||type==='invite')pwDialog(true);});},function(){loginScreen('That link has expired. Sign in, or ask for a new link.');});
  }else if(CLOUD.user())startApp();
  else loginScreen();
}else startApp();
})();