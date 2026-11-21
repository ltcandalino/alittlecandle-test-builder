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
function parseRef(ref){var m=String(ref||'').match(/^(0[1-9]|1[0-2])(\d{2})(\d{2})/);if(m){var q=parseInt(m[3],10);if(q>=1&&q<=50)return {month:m[1],year:2000+parseInt(m[2],10),qnum:q};}var m2=String(ref||'').match(/^[A-Za-z]+(\d{2})(\d{2})/);if(m2){var q2=parseInt(m2[2],10);if(q2>=1&&q2<=50)return {month:'',year:2000+parseInt(m2[1],10),qnum:q2};}return null;}
function clusterOf(std){var first=String(std||'').split(/,\s*/)[0];if(/^[A-Z]{2,3}:/.test(first))return '';var m=first.match(/^(.+\..+)\.\d+[a-z]?$/);return m?m[1]:'';}
function fillMeta(q){if(q.ref&&q.month===''&&q.year===''&&q.qnum===''&&parseRef(q.ref)){delete q.month;delete q.year;delete q.qnum;}if(q.month===undefined||q.year===undefined||q.qnum===undefined){var p=parseRef(q.ref);if(q.month===undefined)q.month=p?p.month:'';if(q.year===undefined)q.year=p?p.year:'';if(q.qnum===undefined)q.qnum=p?p.qnum:'';}if(q.cluster===undefined)q.cluster=clusterOf(q.standard);if(q.subtopic===undefined)q.subtopic='';}
function examLabel(q){var parts=[];if(q.month||q.year)parts.push(((q.month?monthName(q.month)+' ':'')+(q.year||'')).trim());if(q.qnum)parts.push('#'+q.qnum);return parts.join(' ');}
var LETTERS='ABCDEFGH';
var DEFAULT_SETTINGS={docType:'test',quarter:'',unitNum:'',sectionNum:'',week:'',day:'',lessonSource:'',target:'',ecTopic:'',ecDef:'',lessonNotes:'',notesSpace:1,success:'',lessonIcons:true,toolCompass:true,toolRuler:true,toolTrace:true,showRef:true,spacing:{review:{sa:'1.5',es:'1.5',bm:'1.5'}},roles:{},concepts:{},bonus:{},title:'',course:'',teacher:'',date:'',instructions:'',versions:2,shuffleQ:true,shuffleC:true,keepA:true,group:true,nameLine:true,showPoints:false,blanks:false,labels:'num',keyStd:true,keyNotes:false,bmMode:'with',calc:'',calcOther:'',time:'',timeMin:'',style:'classic',headerText:'',topic:'',scoreBox:true,computeBox:true,showCredits:true,perVersion:true,partDirs:null,bmOverride:{},font:'Century Schoolbook',fontSize:12,seed:Math.floor(Math.random()*2147483647)};
var LABELS={lowerdot:function(i){return LETTERS[i].toLowerCase()+'.';},upper:function(i){return LETTERS[i]+'.';},lower:function(i){return LETTERS[i].toLowerCase()+')';},num:function(i){return '('+(i+1)+')';}};
var FONTS={'Century Schoolbook':'"Century Schoolbook","New Century Schoolbook","Century Schoolbook L","TeX Gyre Schola",C059,Georgia,serif','Times New Roman':'"Times New Roman",Times,"Liberation Serif",serif','Cambria':'Cambria,"Caladea",Georgia,serif','Georgia':'Georgia,serif','Book Antiqua':'"Book Antiqua",Palatino,"Palatino Linotype","TeX Gyre Pagella",serif','Garamond':'Garamond,"EB Garamond","Adobe Garamond Pro",serif','Arial':'Arial,Helvetica,"Liberation Sans",sans-serif','Calibri':'Calibri,Carlito,"Segoe UI",sans-serif','Verdana':'Verdana,"DejaVu Sans",sans-serif','Comic Sans MS':'"Comic Sans MS","Comic Neue",cursive','Atkinson Hyperlegible':'"Atkinson Hyperlegible Next","Cambria Math","STIX Two Math","Segoe UI Symbol",Georgia,sans-serif','OpenDyslexic':'"OpenDyslexic","Cambria Math","STIX Two Math","Segoe UI Symbol",Georgia,sans-serif'};
/* Spacing (her design 2026-11-17): each document type remembers room to answer for open response (es), short answer (sa)
   and bimodal (bm), and extra space after every question (gap). '' = each question's own setting; a number = inches of
   blank space; 'l8' = 8 answer lines. Stored as settings.spacing[docType]. */
var SPACE_OPTS={
  es:[['','Each question’s own'],['0','None'],['0.5','½ inch'],['1','1 inch'],['1.5','1½ inches'],['2','2 inches'],['3','3 inches'],['4','4 inches'],['5','5 inches'],['6','6 inches'],['l4','4 lines'],['l6','6 lines'],['l8','8 lines'],['l10','10 lines'],['l12','12 lines'],['l16','16 lines'],['l20','20 lines']],
  sa:[['','Each question’s own'],['0','None'],['l1','1 line'],['l2','2 lines'],['l3','3 lines'],['l4','4 lines'],['0.5','½ inch'],['1','1 inch'],['1.5','1½ inches'],['2','2 inches']],
  bm:[['','Each question’s own'],['0','None'],['0.5','½ inch'],['1','1 inch'],['1.5','1½ inches'],['2','2 inches'],['3','3 inches'],['4','4 inches']],
  gap:[['','Normal'],['0.25','+ ¼ inch'],['0.5','+ ½ inch'],['0.75','+ ¾ inch'],['1','+ 1 inch'],['1.5','+ 1½ inches'],['2','+ 2 inches']]};
var SPACE_LABELS={es:'Open response',sa:'Short answer',bm:'Bimodal',gap:'Space after each question'};
function spacing(){var sp=state.settings.spacing,v=sp&&typeof sp==='object'?sp[docType()]:null;return v&&typeof v==='object'?v:{};}
function spaceOf(k){var v=spacing()[k];return v==null?'':String(v);}
function areaHtml(v){if(/^l\d+$/.test(v)){var n=parseInt(v.slice(1),10);return n>0?'<div class="pt-lines">'+Array(n+1).join('<div></div>')+'</div>':'';}var x=num(v,0);return x>0?'<div class="pt-space" style="height:'+x+'in"></div>':'';}
// extra space after a question: an empty strip, so print, Word and LaTeX all keep it
function gapHtml(){var g=num(spaceOf('gap'),0);return g>0?'<div class="pt-gap" style="height:'+g+'in"></div>':'';}
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
// a question can be in several courses (one copy, shared): q.courses, with q.course = the first one
function coursesOf(q){return Array.isArray(q.courses)&&q.courses.length?q.courses:(q.course?[q.course]:[]);}
function inCourse(q,c){return coursesOf(q).indexOf(c)>=0;}
function setCourses(q,list){q.courses=list.filter(function(c,i){return c&&list.indexOf(c)===i;});q.course=q.courses[0]||'';}
// takes course c off q; true when q is left in no course (the caller deletes it)
function dropCourse(q,c){setCourses(q,coursesOf(q).filter(function(x){return x!==c;}));return !q.courses.length&&!q.owner;}
// a colleague's public question (from the website): read-only here, q.owner = their account, q.ownerName = their email.
// Taking it out of every course keeps it (dropCourse is false), so it can be added back from "Shared with you".
function own(q){return !q.owner;}
function sharing(){return !!(CLOUD.selfHosted&&CLOUD.user());}
/* ---- team banks (website): lists of questions shared with groups; from the server, kept in state.teamBanks ---- */
function myId(){var u=CLOUD.user();return u?u.id:'';}
function teams(){return Array.isArray(state.teamBanks)?state.teamBanks:[];}
function qKey(q){return (q.owner||myId())+'|'+q.id;}
var teamIdx=null,teamIdxOf=null;
function teamsOf(q){if(teamIdxOf!==state.teamBanks){teamIdx={};teamIdxOf=state.teamBanks;teams().forEach(function(b){(b.items||[]).forEach(function(it){var k=it.o+'|'+it.id;(teamIdx[k]=teamIdx[k]||[]).push(b);});});}return teamIdx[qKey(q)]||[];}
function teamById(id){return teams().filter(function(b){return b.id===id;})[0]||null;}
function canAddTo(b){return b.role===2||b.manage;}
// questions of a team bank that are here (yours, or a colleague's you may see)
function teamQs(b){var k={};(b.items||[]).forEach(function(it){k[it.o+'|'+it.id]=1;});return state.questions.filter(function(q){return k[qKey(q)];});}
function saveTeam(b,msg){
  var body={name:b.name,groups:b.groups||[],editors:b.editors||[],items:b.items||[]};
  return CLOUD.request('PUT','/team/v1/banks/'+encodeURIComponent(b.id),body).then(function(){if(msg)toast(msg);
    // show the change now: if a sync is already running, CLOUD.sync() only queues another one, and the card would redraw from the old copy
    var have=false;state.teamBanks=teams().map(function(t){if(t.id!==b.id)return t;have=true;return Object.assign({},t,body);});if(!have)state.teamBanks.push(Object.assign({id:b.id,owner:myId(),manage:true,role:2},body));render();
    return CLOUD.sync();}).then(function(){render();},function(e){toast(e.message||'Couldn’t save the team bank.');});
}
function cq(){return state.questions.filter(function(q){return inCourse(q,state.course);});}
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
        if(tag==='table')te.className='q-tbl'+(/\bq-grid\b/.test(n.className||'')?' q-grid':'');
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
var state={settings:Object.assign({},DEFAULT_SETTINGS),questions:[],selected:[],banks:{},fields:[]};
var ui={tab:'bank',q:'',bank:'',topic:'',type:'',std:'',unit:'',section:'',source:'',year:'',month:'',cluster:'',sub:'',need:'',sort:'bank',limit:40,pv:0,showAns:false,pickN:5,pickBank:'',pickTopic:'',pickType:'',pickUnit:'',pickSection:''};
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
    if(typeof BNK!=='undefined'&&BNK.repairFields&&BNK.repairFields(q))fillMeta(q); // fields mixed up by older versions
    // older imports showed ExamView's script ℓ (line ℓ, p=2ℓ+2w) as ª
    if(typeof q.html==='string'&&q.html.indexOf('ª')>=0)q.html=q.html.replace(/ª/g,'ℓ');if(Array.isArray(q.choices))q.choices=q.choices.map(function(c){return typeof c==='string'?c.replace(/ª/g,'ℓ'):c;});
    // older imports showed ExamView's parallel sign as € between two segments: AB€CD → AB∥CD
    var par=/(<span class="m-ov">[^<]*<\/span>)€(?=<span class="m-ov">)/g;if(typeof q.html==='string'&&q.html.indexOf('€')>=0)q.html=q.html.replace(par,'$1∥');if(Array.isArray(q.choices))q.choices=q.choices.map(function(c){return typeof c==='string'&&c.indexOf('€')>=0?c.replace(par,'$1∥'):c;});
    if(!q.id)q.id=uid();q.points=num(q.points,1);q.bank=q.bank||'My questions';q.topic=q.topic||'';q.standard=q.standard||'';q.unit=q.unit||'';q.section=q.section||'';q.source=q.source||'';q.part=q.part||'';q.notes=q.notes||'';q.nyStd=q.nyStd||'';if(q.visibility!=='public')delete q.visibility;if(!q.owner){delete q.owner;delete q.ownerName;}if(q.extra!==undefined&&(!q.extra||typeof q.extra!=='object'||Array.isArray(q.extra)||!Object.keys(q.extra).length))delete q.extra;q.html=q.html||textToHtml(q.text||'');fillMeta(q);
    if(q.type==='bm'){q.space=q.space||2;}
    if(isMC(q.type)){q.choices=(Array.isArray(q.choices)?q.choices:[]).map(function(c){return c;});if(typeof q.answer!=='number')q.answer=-1;}
    if(q.type==='es'){q.answerArea=q.answerArea||'lines';if(q.lines==null)q.lines=8;if(q.space==null)q.space=3;}
    if(q.type==='sa'){if(q.lines==null)q.lines=1;}
  });
  s.courses=Array.isArray(s.courses)&&s.courses.length?s.courses:DEFAULT_COURSES.slice();
  if(!s.course){var cnt={};s.questions.forEach(function(q){var g=q.course||guessCourse(q.bank);if(g)cnt[g]=(cnt[g]||0)+1;});var best=Object.keys(cnt).sort(function(a,b){return cnt[b]-cnt[a];})[0];s.course=best||s.courses[0];}
  s.questions.forEach(function(q){if(!coursesOf(q).length&&!q.owner)q.course=guessCourse(q.bank)||s.course;setCourses(q,coursesOf(q).slice());});
  s.questions.forEach(function(q){q.courses.forEach(function(c){if(s.courses.indexOf(c)<0)s.courses.push(c);});});
  if(s.courses.indexOf(s.course)<0)s.courses.push(s.course);
  s.courseTests=s.courseTests||{};
  var ids={};s.questions.forEach(function(q){ids[q.id]=1;});
  s.teamBanks=Array.isArray(s.teamBanks)?s.teamBanks:[];s.people=s.people&&Array.isArray(s.people.people)?s.people:{groups:[],people:[]};
  s.savedTests=Array.isArray(s.savedTests)?s.savedTests.filter(function(t){return t&&t.id;}):[];
  var fz=s.settings.frozen&&s.savedTests.filter(function(t){return t.id===s.settings.savedId;})[0];if(fz)(fz.questions||[]).forEach(function(q){ids[q.id]=1;});
  s.selected=Array.isArray(s.selected)?s.selected.filter(function(id,i,a){return ids[id]&&a.indexOf(id)===i;}):[];
  s.banks=s.banks||{};
  s.fields=Array.isArray(s.fields)?s.fields.filter(function(f,i,a){return f&&f.id&&f.label&&a.map(function(x){return x&&x.id;}).indexOf(f.id)===i;}).map(function(f){return {id:String(f.id),label:String(f.label)};}):[];
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
function uniq(field){var t={};cq().forEach(function(q){var v=q[field];if(v){if(field==='standard'||field==='nyStd')String(v).split(/,\s*/).forEach(function(x){if(x)t[x]=1;});else t[v]=1;}});return Object.keys(t).sort(function(a,b){return a.localeCompare(b,undefined,{numeric:true});});}
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
  if('reviewSpace' in st){var rs=st.reviewSpace==null?'':String(st.reviewSpace);st.spacing=JSON.parse(JSON.stringify(st.spacing||{}));st.spacing.review={sa:rs,es:rs,bm:rs};delete st.reviewSpace;}
  if(!st.spacing||typeof st.spacing!=='object')st.spacing={review:{sa:'1.5',es:'1.5',bm:'1.5'}};
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
// every document type: 0.5in margins all round (her choice 2026-11-15). The header sits 0.25in from the top edge and the
// questions start just under it, like Word does when a header is taller than the top margin.
function pageGeom(){return {m:'.5in',w:540,hd:18};}
function topFor(h){return Math.max(36,pageGeom().hd+h.h+6)+'pt';}
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
function qBody(it,A){
  var q=it.q,h='',ov=q.type==='es'||q.type==='sa'||q.type==='bm'?spaceOf(q.type):'';
  var bmRoom=function(){return ov!==''?areaHtml(ov):'<div class="pt-space" style="height:'+Math.max(.5,num(q.space,2))+'in"></div>';};
  var choices=function(){return '<ul class="pt-ch '+choiceCols(it.choices)+'">'+it.choices.map(function(c,ci){return '<li class="'+(A&&ci===it.answer?'ans':'')+'"><b>'+letterOf(ci)+'</b><span>'+c+'</span></li>';}).join('')+'</ul>';};
  if(it.open)h+=bmRoom()+(A&&it.answer>=0?'<div class="pt-keynote">Key: '+it.choices[it.answer]+'</div>':'');
  else if(q.inImage){if(A&&isMC(q.type)&&it.answer>=0)h+='<div class="pt-keynote">Answer: '+esc(plain(q.choices[it.answer]))+'</div>';if(q.type==='bm')h+=bmRoom();else if(ov!=='')h+=areaHtml(ov);}
  else if(isMC(q.type))h+=choices()+(q.type==='bm'?bmRoom():'');
  else if(q.type==='tf')h+='<div class="pt-tf"><span class="'+(A&&q.answer==='T'?'ans':'')+'">T</span><span class="'+(A&&q.answer==='F'?'ans':'')+'">F</span></div>';
  else if(ov!=='')h+=areaHtml(ov);
  else if(q.type==='es'&&q.answerArea==='space'){var sp=Math.max(0,num(q.space,3));if(sp>0)h+='<div class="pt-space" style="height:'+sp+'in"></div>';}
  else{var nl=Math.max(0,num(q.lines,q.type==='sa'?1:8));if(nl>0)h+='<div class="pt-lines">'+Array(nl+1).join('<div></div>')+'</div>';}
  if(A&&(q.type==='sa'||q.type==='es')&&q.answer)h+='<div class="pt-keynote">Key: '+textToHtml(q.answer)+'</div>';
  return h+gapHtml();
}
function isTall(q){return (q.type==='bm'&&num(q.space,2)>5)||q.type==='es'&&(q.answerArea==='space'?num(q.space,3):num(q.lines,8)*0.33)>5||/<table/.test(q.html);}
function nameRow(){return '<div class="cl-row cl-name"><span>Name: <span class="cl-line" style="width:3.1in"></span></span><span>Date: <span class="cl-line" style="width:1.6in"></span></span></div>';}
function testHtml(items,v,opts){
  labelItems(items);
  var t=docType(),h='';
  if(t==='review')h+=reviewHtml(items,v,opts);
  else if(t==='lesson')h+=lessonHtml(items,v,opts);
  else h+=examHtml(items,v,opts);
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
    h+='<tr class="rv-q"><td class="rv-n">'+it.num+'</td><td><div class="pt-qt">'+q.html+(s.showPoints?' <span class="pt-pts">('+ptsLabel(q.points)+')</span>':'')+'</div>'+qBody(it,A)+(ref?'<div class="rv-ref">'+esc(ref)+'</div>':'<div class="rv-pad"></div>')+'</td></tr>';
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
  var stdFooter=function(name,label){return '@page '+name+'{size:letter;margin:'+g.m+';@bottom-left{content:'+cssStr(label)+';font:9pt Arial,sans-serif;color:#666}@bottom-right{content:"Page " counter(page);font:9pt Arial,sans-serif;color:#666}}';};
  var top=function(x){return '@top-center{content:url("'+svgUrl(x)+'");vertical-align:bottom;padding-bottom:6pt}';};
  var docPage=function(name,v){
    var pn='@bottom-right{content:counter(page);font:11pt '+font+'}',lf=dt==='lesson'?lessonFootSvg():null;
    var first=isExamDoc()?'@bottom-left{content:'+cssStr('v. '+(v+1))+';font:8pt '+font+';color:#777}':'';
    return '@page '+name+'{size:letter;margin:'+g.m+';margin-top:'+topFor(hd.rest)+';'+top(hd.rest)+pn+(lf?'@bottom-left{content:url("'+svgUrl(lf)+'");vertical-align:middle}':'')+'}'+
      '@page '+name+':first{margin-top:'+topFor(hd.first)+';'+top(hd.first)+'@bottom-right{content:none}'+(lf?'@bottom-left{content:none}':'')+first+'}';};
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
  saveTest({printed:true});drawSaved();drawPrintBar();
  var f=outFmt(),what={docx:'Word file',tex:'LaTeX file'}[f];
  if(what){toast('Making the '+what+'…');
    return EXP.download(f,kind).then(function(r){toast('Downloaded “'+r.name+'” ('+Math.max(1,Math.round(r.size/1024))+' KB).');})
      .catch(function(e){console.error(e);toast('Couldn’t make the '+what+': '+(e&&e.message||e));});}
  runJobs(printJobs(kind));
}
window.__printJobs=printJobs;
var EXP=makeExporter({state:function(){return state;},nVersions:nVersions,testHtml:testHtml,buildVersion:buildVersion,LETTERS:LETTERS,accOn:accOn,accom:accom,accVersion:accVersion,accHtml:accHtml,accSize:accSize,keyHtml:keyHtml,docType:docType,headerText:headerText,docTitle:docTitle,rightLabel:rightLabel,isExamDoc:isExamDoc,lessonTools:lessonTools,lessonCode:lessonCode,lessonSource:lessonSource,num:num,saveFile:saveFile});
window.__tb={version:APP_VERSION,get state(){return state;},set state(v){state=v;},normalize:function(x){return normalize(x);},uid:function(){return uid();},render:function(){render();},ui:function(){return ui;},printJobs:function(k){return printJobs(k);},fn:{cq:cq,own:own,selGroups:selGroups,sortSel:sortSel,copyBank:copyBank,copyQ:copyQ,usersDialog:usersDialog,shareDialog:shareDialog,parseRef:parseRef,clusterOf:clusterOf,fillMeta:fillMeta,examLabel:examLabel,monthName:monthName,sanitize:sanitize,plain:plain,textToHtml:textToHtml,esc:esc,num:num,ptsLabel:ptsLabel,guessCourse:guessCourse,calcLabel:calcLabel,timeLabel:timeLabel,creditsText:creditsText,partKeyOf:partKeyOf,partKind:partKind,romanVal:romanVal,partDir:partDir,letterOf:letterOf,bmChoices:bmChoices,rng:rng,shuffle:shuffle,buildVersion:buildVersion,labelItems:labelItems,testHtml:testHtml,keyHtml:keyHtml,qBody:qBody,printJobs:printJobs,exp:function(){return EXP;},saveTest:saveTest,openSaved:openSaved,savedDiff:savedDiff,isDirty:isDirty,selQ:selQ,accom:accom,accHtml:accHtml,accStyle:accStyle,accClass:accClass,parseText:parseText,migrateSettings:migrateSettings,normalize:normalize,autoTitle:autoTitle,docTitle:docTitle,rightLabel:rightLabel,headerText:headerText,lessonCode:lessonCode,lessonSource:lessonSource,lessonTools:lessonTools,roleOf:roleOf,reviewKind:reviewKind,isBonus:isBonus,headerSvg:headerSvg,lessonFootSvg:lessonFootSvg,pageGeom:pageGeom,headers:headers,recapRows:recapRows,placeOf:placeOf,browseBanks:browseBanks,curSub:curSub,go:go,subsOf:subsOf,spacing:spacing,spaceOf:spaceOf,switchCourse:switchCourse,selectedQs:selectedQs,nVersions:nVersions,totalPts:totalPts,docType:docType,isExamDoc:isExamDoc,persist:persist,idbGet:idbGet,stateKey:stateKey,splitNY:splitNY,isMixed:isMixed,needs:needs,unitGuesses:unitGuesses,addField:addField,setF:setF,getF:getF,bankFileData:bankFileData,bankFileName:bankFileName,importBankData:importBankData,isBankFile:isBankFile}};

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
  root.innerHTML='<header class="top"><div class="brand"><img class="mark" alt="" src="'+BRAND_LOGO+'">ALittleCandleTestBuilder<span class="ver" title="Version">v'+esc(APP_VERSION)+'</span></div><label class="coursesel"><span>Course</span><select id="courseSel"></select></label><button type="button" class="ghost small dispbtn" popovertarget="dispPop" title="Display settings: font, text size, contrast"><span aria-hidden="true" class="aa">Aa</span> Display</button><div popover id="dispPop" class="disp"></div><button type="button" class="ghost small helpbtn" popovertarget="helpPop">Help</button><div popover id="helpPop" class="disp helppop" role="dialog" aria-labelledby="helpT">'+HELP_HTML+'</div><div class="savebox"><span id="status"></span><span id="cloud"></span></div></header><div id="bannerSlot"></div><div class="shell'+(ui.railMin?' rmin':'')+'" id="shell"><nav class="rail" id="tabs" aria-label="Places"></nav><main id="main"></main></div><div class="toast" id="toast" role="status" aria-live="polite"></div><div id="modal"></div>';
}
function renderCourses(){
  var cs=$('#courseSel');if(!cs)return;
  cs.innerHTML=state.courses.map(function(c){var n=state.questions.filter(function(q){return inCourse(q,c);}).length;return '<option value="'+esc(c)+'"'+(c===state.course?' selected':'')+'>'+esc(c)+(n?' ('+n+')':'')+'</option>';}).join('')+'<option value="__manage">Add or rename courses…</option>';
  cs.onchange=function(){if(this.value==='__manage'){this.value=state.course;go('io','courses');setTimeout(function(){var c=$('#coursesCard');if(c)c.scrollIntoView({behavior:'smooth'});},50);return;}switchCourse(this.value);};
}
function switchCourse(name){
  if(name===state.course)return;
  state.courseTests[state.course]={settings:state.settings,selected:state.selected};
  var t=state.courseTests[name];
  state.course=name;
  state.settings=migrateSettings(Object.assign({},DEFAULT_SETTINGS,{course:name,roles:{},concepts:{},bonus:{},seed:Math.floor(Math.random()*2147483647)},t?t.settings:{}),name);
  state.selected=t&&Array.isArray(t.selected)?t.selected.filter(function(id){var q=selQ(id);return q&&(inCourse(q,name)||!byId(id));}):[];
  ['q','bank','topic','type','std','unit','section','source','year','month','cluster','sub','pickBank','pickTopic','pickType','pickUnit','pickSection'].forEach(function(k){ui[k]='';});
  ui.limit=40;saveUi();changed();render();toast('Switched to '+name+'.');
}
/* Plan 4: one thing at a time. The rail on the left holds the four steps of making a test, then Question bank and
   Import & backup (ui.tab = the place). Each place has sub-tabs (ui.subs[place]); every panel carries data-show="place:sub"
   and only the current one shows. Old ui.tab values ('build') still open in the right place. */
var RAIL=[['pick','1','Pick questions','M4 6h2M4 12h2M4 18h2M9 6h11M9 12h11M9 18h11'],['setup','2','Set up','M4 6h16M4 12h16M4 18h16M9 4v4M15 10v4M7 16v4'],
  ['print','3','Print','M7 9V4h10v5M7 17H5V10h14v7h-2M7 14h10v6H7z'],null,
  ['bank','','Question bank','M5 4h14v16H5zM9 8h6M9 12h6M9 16h4'],['io','','Import & backup','M12 4v11M8 8l4-4 4 4M5 15v4h14v-4']];
var BUILD_PLACES={setup:1,print:1};
// older places (Plan 4 had Arrange and Format steps; before that one Build & print tab) open the matching Set up panel
var OLD_PLACE={build:['setup','questions'],arrange:['setup','questions'],format:['setup','doc']},OLD_SUB={order:'questions',parts:'page'};
function oldPlace(){var o=OLD_PLACE[ui.tab];if(!o)return;var sub=(ui.subs||{})[ui.tab];ui.tab=o[0];ui.subs=Object.assign({},ui.subs);if(sub&&ui.tab===o[0])ui.subs.setup=OLD_SUB[sub]||sub;else if(!ui.subs.setup)ui.subs.setup=o[1];}
function placeOf(){oldPlace();var t=ui.tab;return RAIL.some(function(r){return r&&r[0]===t;})?t:'bank';}
function subsOf(p){var sh=sharing(),L={
  pick:[['search','Search'],sh&&['team','Team banks'],sh&&['shared','Shared with you'],['browse','Browse banks']],
  setup:[['questions','Questions'],['doc','Document'],['versions','Versions'],['spacing','Spacing'],['acc','Accommodations'],['page','Page style']],
  print:[['preview','Preview'],['saved','Saved tests']],
  bank:[['all','All questions'],['fields','Your fields']],
  io:[['import','Import'],['banks','Your banks'],sh&&['team','Team banks'],['backup','Backup'],['courses','Courses']]}[p]||[];
  return L.filter(Boolean);}
function curSub(p){var L=subsOf(p),v=(ui.subs||{})[p];return L.some(function(x){return x[0]===v;})?v:(L[0]?L[0][0]:'');}
function go(place,sub){var o=OLD_PLACE[place];if(o){sub=OLD_SUB[sub]||sub||o[1];place=o[0];}ui.tab=place;if(sub){ui.subs=Object.assign({},ui.subs);ui.subs[place]=sub;}ui.limit=40;saveUi();render();window.scrollTo(0,0);}
function renderTabs(){
  renderCourses();
  var p=placeOf(),cnt={setup:state.selected.length,bank:cq().length},bk=state.questions.length&&backupStale();
  $('#tabs').innerHTML=(ui.railMin?'':'<div class="rail-h">Make a test</div>')+RAIL.map(function(r){if(!r)return '<hr>';
    var on=r[0]===p,c=cnt[r[0]],dot=r[0]==='io'&&bk,name=(r[1]?r[1]+' ':'')+r[2]+(c!=null?', '+plural(c,'question'):'')+(dot?', no recent backup':'');
    return '<button data-tab="'+r[0]+'" class="'+(on?'on':'')+'"'+(on?' aria-current="page"':'')+' aria-label="'+esc(name)+'" title="'+esc(name)+(r[1]?' (Alt+'+r[1]+')':'')+'">'+
      '<span class="ri"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+r[3]+'"/></svg>'+(r[1]?'<span class="rn" aria-hidden="true">'+r[1]+'</span>':'')+(dot?'<span class="rdot" aria-hidden="true"></span>':'')+'</span>'+
      '<span class="rl" aria-hidden="true">'+(r[1]?r[1]+' ':'')+esc(r[2])+'</span>'+(c!=null?'<span class="count" aria-hidden="true">'+c+'</span>':'')+'</button>';}).join('')+
    '<button class="rail-min" id="railMin" title="'+(ui.railMin?'Show the labels':'Icons only, for a wider page')+'" aria-label="'+(ui.railMin?'Show the labels':'Icons only')+'">'+(ui.railMin?'»':'« <span class="rl">Icons only</span>')+'</button>';
  $$('#tabs [data-tab]').forEach(function(b){b.onclick=function(){go(b.dataset.tab);};});
  var hd=$('.top');if(hd)document.documentElement.style.setProperty('--toph',hd.offsetHeight+'px');
  $('#railMin').onclick=function(){ui.railMin=!ui.railMin;saveUi();$('#shell').classList.toggle('rmin',!!ui.railMin);renderTabs();};
}
// after any page is drawn: the sub-tab row on top, and only the current panel showing
function showPlace(){
  var main=$('#main'),p=placeOf(),sb=curSub(p),L=subsOf(p),key=p+':'+sb;if(!main)return;
  var old=$('.subtabs',main);if(old)old.remove();
  if(L.length>1)main.insertAdjacentHTML('afterbegin','<nav class="subtabs" aria-label="'+esc(RAIL.filter(function(r){return r&&r[0]===p;})[0][2])+'">'+L.map(function(x){return '<button data-sub="'+x[0]+'" class="'+(x[0]===sb?'on':'')+'"'+(x[0]===sb?' aria-current="true"':'')+'>'+esc(x[1])+'</button>';}).join('')+'</nav>');
  $$('.subtabs [data-sub]',main).forEach(function(b){b.onclick=function(){go(p,b.dataset.sub);};});
  $$('[data-show]',main).forEach(function(el){el.hidden=!el.dataset.show.split(' ').some(function(t){return t===key||t===p+':*';});});
  var bl=$('.bleft',main),br=$('.bright',main);
  if(bl&&br){var lv=$$('.bleft>[data-show]',main).some(function(e){return !e.hidden;});main.classList.toggle('one-col',!lv||br.hidden);bl.hidden=!lv;}
  else main.classList.remove('one-col');
  main.dataset.place=p;
  // Next: the following sub-tab of Set up, or the next step on the rail
  var nx=null,steps=['pick','setup','print'],si=steps.indexOf(p);
  if(p==='setup'){var k=L.map(function(x){return x[0];}).indexOf(sb);nx=k>=0&&k<L.length-1?{p:'setup',s:L[k+1][0],t:L[k+1][1]}:{p:'print',s:'preview',t:'3 Print'};}
  else if(p==='pick')nx={p:'setup',s:'questions',t:'2 Set up'};
  var old=$('.nextbar',main);if(old)old.remove();
  if(nx&&si>=0&&state.selected.length){var host=$('.bleft',main)&&!$('.bleft',main).hidden?$('.bleft',main):main;
    host.insertAdjacentHTML('beforeend','<div class="nextbar"><button class="small" id="nextStep">Next: '+esc(nx.t)+' <span aria-hidden="true">→</span></button></div>');
    $('#nextStep').onclick=function(){go(nx.p,nx.s);};}
}
function render(){ui.tab=placeOf();renderTabs();var p=ui.tab,sb=curSub(p);
  if(BUILD_PLACES[p])renderBuild();else if(p==='pick'&&sb==='browse')renderBrowse();else if(p==='io'||(p==='pick'&&sb!=='search')||(p==='bank'&&sb==='fields'))renderIO();else renderBank();}
document.addEventListener('keydown',function(e){if(!e.altKey||e.ctrlKey||e.metaKey)return;var t=e.target;if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable))return;var m=/^Digit([1-3])$/.exec(e.code||'');if(!m)return;e.preventDefault();go(RAIL[+m[1]-1][0]);});

/* ================= bank tab ================= */
function opts(list,sel,allLabel){return '<option value="">'+esc(allLabel)+'</option>'+list.map(function(x){return '<option value="'+esc(x)+'"'+(sel===x?' selected':'')+'>'+esc(x)+'</option>';}).join('');}
function typeOpts(sel,allLabel){return '<option value="">'+allLabel+'</option>'+TYPE_ORDER.map(function(t){return '<option value="'+t+'"'+(sel===t?' selected':'')+'>'+TYPES[t]+'</option>';}).join('');}
/* Filters: search + unit/section/topic/standard always; the rest behind "More filters". */
var MORE_F=['need','bank','type','year','month','cluster','sub','source'];
var F_LABEL={q:'Search',unit:'Unit',section:'Section',topic:'Topic',std:'Standard',bank:'Bank',type:'Type',year:'Year',month:'Month',cluster:'Cluster',sub:'Subtopic',source:'Source',need:'Needs attention'};
function fLabels(){var o=Object.assign({},F_LABEL);myFields().forEach(function(f){o['x:'+f.id]=f.label;});return o;}
function fValue(k,v){if(v==='__none')return '(none)';if(k==='bank'&&String(v).indexOf('team:')===0){var tb=teamById(v.slice(5));return tb?tb.name:'Team bank';}if(k==='need')return needLabel(v);if(k==='type')return TYPES[v]||v;if(k==='month')return monthName(v)||v;if(k==='q')return '“'+v+'”';return v;}
function activeFilters(){return Object.keys(fLabels()).filter(function(k){return ui[k]!==''&&ui[k]!=null;});}
function moreCount(){return MORE_F.concat(myFields().map(function(f){return 'x:'+f.id;})).filter(function(k){return ui[k];}).length;}
function moreFilters(){
  if(!ui.moreF)return '';
  var yrs=uniq('year'),mos=uniq('month'),cls=uniq('cluster'),subs=uniq('subtopic'),banks=uniq('bank'),srcs=uniq('source');
  var h='<div class="toolbar morebar" id="moreBar">',all=cq();
  h+='<select id="fneed" aria-label="Needs attention"><option value="">Needs attention: any</option>'+NEEDS.map(function(n){var c=all.filter(function(q){return needs(q,n[0]);}).length;return '<option value="'+n[0]+'"'+(ui.need===n[0]?' selected':'')+(c||ui.need===n[0]?'':' disabled')+'>'+esc(n[1])+' ('+c+')</option>';}).join('')+'</select>';
  var tbs=teams().filter(function(b){return teamQs(b).some(function(q){return inCourse(q,state.course);});});
  if(banks.length>1||tbs.length)h+='<select id="fb" aria-label="Bank">'+opts(banks,ui.bank,'All banks')+(tbs.length?'<optgroup label="Team banks">'+tbs.map(function(b){return '<option value="team:'+esc(b.id)+'"'+(ui.bank==='team:'+b.id?' selected':'')+'>'+esc(b.name)+'</option>';}).join('')+'</optgroup>':'')+'</select>';
  h+='<select id="fy" aria-label="Type">'+typeOpts(ui.type,'All types')+'</select>';
  if(yrs.length)h+='<select id="fyr" aria-label="Year"><option value="">All years</option>'+yrs.map(function(y){return '<option value="'+esc(y)+'"'+(String(ui.year)===String(y)?' selected':'')+'>'+esc(y)+'</option>';}).join('')+'</select>';
  if(mos.length)h+='<select id="fmo" aria-label="Month"><option value="">All months</option>'+mos.map(function(m){return '<option value="'+esc(m)+'"'+(ui.month===m?' selected':'')+'>'+esc(monthName(m)||m)+'</option>';}).join('')+'</select>';
  if(cls.length)h+='<select id="fcl" aria-label="Cluster">'+opts(cls,ui.cluster,'All clusters')+'</select>';
  if(subs.length)h+='<select id="fsub" aria-label="Subtopic">'+opts(subs,ui.sub,'All subtopics')+'</select>';
  if(srcs.length)h+='<select id="fsrc" aria-label="Source">'+opts(srcs,ui.source,'All sources')+'</select>';
  myFields().forEach(function(f){var v=uniqX(f.id),k='x:'+f.id;if(!v.length&&!ui[k])return;h+='<select data-xff="'+esc(f.id)+'" aria-label="'+esc(f.label)+'">'+opts(v,ui[k],'All: '+f.label)+(all.some(function(q){return !xval(q,f.id);})?'<option value="__none"'+(ui[k]==='__none'?' selected':'')+'>(no '+esc(f.label)+')</option>':'')+'</select>';});
  return h+'</div>';
}
function chipsHtml(){var a=activeFilters();if(!a.length)return '';
  return '<div class="chips" aria-label="Active filters">'+a.map(function(k){return '<button type="button" class="chip" data-unf="'+k+'" aria-label="Remove filter '+esc(fLabels()[k])+': '+esc(fValue(k,ui[k]))+'"><span>'+esc(fLabels()[k])+':</span> '+esc(fValue(k,ui[k]))+' <span aria-hidden="true">✕</span></button>';}).join('')+'<button type="button" class="small ghost" id="clearF">Clear filters</button></div>';}
function monthOrder(m){var n=parseInt(m,10);return isNaN(n)?0:n;}
function sortList(list){
  if(ui.sort==='new')return list.slice().reverse();
  if(ui.sort==='examnew')return list.slice().sort(function(a,b){return (num(b.year,0)-num(a.year,0))||(monthOrder(b.month)-monthOrder(a.month))||(num(a.qnum,0)-num(b.qnum,0));});
  if(ui.sort==='exam')return list.slice().sort(function(a,b){return (num(a.year,0)-num(b.year,0))||(monthOrder(a.month)-monthOrder(b.month))||(num(a.qnum,0)-num(b.qnum,0));});
  if(ui.sort==='std')return list.slice().sort(function(a,b){return String(a.standard).localeCompare(String(b.standard),undefined,{numeric:true})||(num(a.year,0)-num(b.year,0));});
  if(ui.sort==='unit')return list.slice().sort(function(a,b){return String(a.unit||'~').localeCompare(String(b.unit||'~'),undefined,{numeric:true})||String(a.section||'~').localeCompare(String(b.section||'~'),undefined,{numeric:true});});
  return list;
}
function unitSelect(id,sel,allLabel,field){field=field||'unit';var u=uniq(field);if(!u.length)return '';return '<select id="'+id+'" aria-label="'+(field==='section'?'Section':'Unit')+'"><option value="">'+esc(allLabel)+'</option>'+u.map(function(x){return '<option value="'+esc(x)+'"'+(sel===x?' selected':'')+'>'+esc(/^\d/.test(x)?(field==='section'?'Section ':'Unit ')+x:x)+'</option>';}).join('')+(state.questions.some(function(q){return !q[field];})?'<option value="__none"'+(sel==='__none'?' selected':'')+'>(no '+field+')</option>':'')+'</select>';}
function matches(q,f){
  if(f.bank&&(f.bank.indexOf('team:')===0?!teamsOf(q).some(function(b){return 'team:'+b.id===f.bank;}):q.bank!==f.bank))return false;
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
  if(f.need&&!needs(q,f.need))return false;
  var xf=myFields();for(var xi=0;xi<xf.length;xi++){var xv=f['x:'+xf[xi].id];if(xv&&(xv==='__none'?xval(q,xf[xi].id):xval(q,xf[xi].id)!==xv))return false;}
  if(f.q){var hay=(plainQ(q).all+' '+q.topic+' '+q.standard+' '+(q.ref||'')+' '+(q.subtopic||'')+' '+(q.unit||'')+' '+(q.section||'')+' '+(q.notes||'')+' '+(q.cluster||'')+' '+examLabel(q)+' '+(q.source||'')+' '+(q.nyStd||'')+' '+Object.keys(q.extra||{}).map(function(k){return q.extra[k];}).join(' ')+' '+(q.searchText||'')).toLowerCase();var words=f.q.toLowerCase().split(/\s+/).filter(Boolean);for(var i=0;i<words.length;i++)if(hay.indexOf(words[i])<0)return false;}
  return true;
}
function browsing(){return placeOf()==='pick'&&curSub('pick')==='browse'&&!!ui.brBank&&!!ui.brUnit;}
function picking(){return placeOf()==='pick';}
function filtered(){var f=browsing()?{bank:ui.brBank,unit:ui.brUnit,section:ui.brSec||''}:ui;return cq().filter(function(q){return matches(q,f);});}
function qCard(q){
  var body='<div class="qbody">'+q.html+'</div>';
  if(q.inImage)body+='<div class="keyline">Choices are in the picture · Answer: <b>'+(q.answer>=0?esc(plain(q.choices[q.answer])):'not set')+'</b></div>';
  else if(isMC(q.type))body+='<ol class="choices qbody">'+q.choices.map(function(c,i){return '<li class="'+(i===q.answer?'correct':'')+'"><b>'+LETTERS[i]+'.</b><span>'+c+'</span></li>';}).join('')+'</ol>'+(q.answer<0?'<div class="keyline" style="color:var(--danger)">No correct answer set</div>':'');
  else if(q.type==='tf')body+='<div class="keyline">Answer: <b>'+(q.answer==='T'?'True':q.answer==='F'?'False':'—')+'</b></div>';
  else if(q.answer)body+='<div class="keyline">'+(q.type==='es'?'Key notes':'Answer')+': <b>'+esc(q.answer)+'</b></div>';
  if(q.notes)body+='<div class="mynote"><b>My note:</b> '+textToHtml(q.notes)+'</div>';
  var meta='<span class="badge '+q.type+'">'+TYPES[q.type]+'</span>'+(q.unit||q.section?'<span class="tag unit">'+esc([q.unit&&(/^\d/.test(q.unit)?'Unit '+q.unit:q.unit),q.section&&(/^\d/.test(q.section)?'Sec '+q.section:q.section)].filter(Boolean).join(' · '))+'</span>':'')+(q.bank&&!browsing()?'<span class="tag" title="Bank">'+esc(q.bank)+'</span>':'')+teamsOf(q).map(function(b){return '<span class="tag team" title="In this team bank">'+esc(b.name)+'</span>';}).join('')+(q.owner?'<span class="tag shared" title="Shared by a colleague. Only they can change it; Copy to mine makes your own version.">Shared by '+esc(q.ownerName||'a colleague')+'</span>':q.visibility==='public'?'<span class="tag pub" title="Everyone with an account on this site can see and use it">Public</span>':'')+(coursesOf(q).length>1?'<span class="tag also" title="This question is shared: editing it changes it in every course">Also in '+esc(coursesOf(q).filter(function(c){return c!==state.course;}).join(', '))+'</span>':'')+(q.topic?'<span class="tag" title="Topic">'+esc(q.topic)+'</span>':'')+(q.source?'<span class="tag src" title="Source">'+esc(q.source)+'</span>':'')+(q.subtopic?'<span class="tag" title="Subtopic">'+esc(q.subtopic)+'</span>':'')+(q.standard?'<span title="Standard">'+esc(q.standard)+'</span>':'')+(q.cluster?'<span title="Cluster">'+esc(q.cluster)+'</span>':'')+(q.nyStd?'<span title="Old NY standard">NY '+esc(q.nyStd)+'</span>':'')+myFields().map(function(f){var v=xval(q,f.id);return v?'<span class="tag mine" title="'+esc(f.label)+'">'+esc(f.label)+': '+esc(v)+'</span>':'';}).join('')+(examLabel(q)?'<span class="tag exam" title="Exam and question number">'+esc(examLabel(q))+'</span>':'')+(q.ref?'<span title="Reference">'+esc(q.ref)+'</span>':'')+'<span>'+ptsLabel(q.points)+'</span>';
  return '<li class="qcard'+(isSel(q.id)?' on':'')+'"><label class="pick" title="Put on test"><input type="checkbox" data-pick="'+q.id+'"'+(isSel(q.id)?' checked':'')+' aria-label="Put on test: '+esc(plainQ(q).t.slice(0,80))+'"></label><div><div class="qmeta">'+meta+'</div>'+body+'</div><div class="qactions">'+(picking()?((!q.owner||q.canEdit)?'<button class="small ghost" data-edit="'+q.id+'">Edit</button>':'')+(q.owner?'<button class="small ghost" data-dup="'+q.id+'" title="Make your own copy to change; the original stays as it was">Copy to mine</button>':''):q.owner?(q.canEdit?'<button class="small ghost" data-edit="'+q.id+'" title="You’re an editor of its team bank">Edit</button>':'')+'<button class="small ghost" data-dup="'+q.id+'">Copy to mine</button><button class="small ghost" data-del="'+q.id+'" title="Take it out of '+esc(state.course)+' (it stays shared)">Remove</button>':'<button class="small ghost" data-edit="'+q.id+'">Edit</button>'+(sharing()?'<button class="small ghost" data-share="'+q.id+'">Share</button>':'')+'<button class="small ghost" data-dup="'+q.id+'">Copy</button><button class="small ghost" data-del="'+q.id+'">Delete</button>')+'</div></li>';
}
function renderBank(){_renderBank();showPlace();}
/* Copies: a copy gets a new id and is yours (private, in this course when it came from someone else), so changing it never
   changes the original. A colleague's copy remembers where it came from (origin). */
function copyQ(q,bank){var c=JSON.parse(JSON.stringify(q));c.id=uid();
  if(q.owner){c.origin={id:q.id,owner:q.owner,ownerName:q.ownerName||''};setCourses(c,[state.course]);}
  ['owner','ownerName','canEdit','changedBy','visibility'].forEach(function(k){delete c[k];});if(bank!=null)c.bank=bank;return c;}
// a bank by key: your bank's name, 'team:<id>', or 'sh:<owner>|<bank>' for a colleague's public bank
function bankByKey(k){
  if(k.indexOf('team:')===0){var t=teamById(k.slice(5));return t?{name:t.name,qs:teamQs(t)}:null;}
  if(k.indexOf('sh:')===0){var i=k.indexOf('|'),o=k.slice(3,i),b=k.slice(i+1);return {name:b,qs:state.questions.filter(function(q){return q.owner===o&&q.bank===b;})};}
  return {name:k,mine:true,qs:state.questions.filter(function(q){return own(q)&&q.bank===k;})};}
function freeBankName(n){var have={};state.questions.forEach(function(q){if(own(q))have[q.bank]=1;});if(!have[n])return n;
  for(var i=1;;i++){var c=n+' (copy'+(i>1?' '+i:'')+')';if(!have[c])return c;}}
function copyBank(k){ui.bOpen='';var b=bankByKey(k);if(!b||!b.qs.length){toast('That bank has no questions to copy.');return;}
  var name=freeBankName(b.name),copies=b.qs.map(function(q){var c=copyQ(q,name);if(!b.mine)setCourses(c,[state.course]);return c;});
  state.questions=state.questions.concat(copies);changed();render();
  toast('Copied '+plural(copies.length,'question')+' into your bank “'+name+'”. Change them as you like; the original stays as it was.',function(){var ids={};copies.forEach(function(c){ids[c.id]=1;});
    state.questions=state.questions.filter(function(q){return !ids[q.id];});state.selected=state.selected.filter(function(id){return !ids[id];});changed();render();});}
document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-copybank]');if(b){e.preventDefault();copyBank(b.dataset.copybank);}});
/* Plan 4 stage 2: Browse banks. Bank cards → the bank's units and sections → that section's questions (the usual list,
   with + Add). ui.brBank ('team:<id>' for a team bank), ui.brUnit ('__none' = no unit), ui.brSec ('' = all of the unit). */
function renderBrowse(){_renderBrowse();showPlace();}
function unitName(u){return u==='__none'?'No unit':/^\d/.test(u)?'Unit '+u:u;}
function secName(x){return x==='__none'?'No section':/^\d/.test(x)?'Section '+x:x;}
function natSort(a){return a.sort(function(x,y){return x==='__none'?1:y==='__none'?-1:String(x).localeCompare(String(y),undefined,{numeric:true});});}
function browseBanks(){
  var by={};cq().forEach(function(q){var b=q.bank||'My questions';(by[b]=by[b]||[]).push(q);});
  var out=natSort(Object.keys(by)).map(function(b){return {key:b,name:b,qs:by[b],who:by[b].every(function(q){return q.owner;})?(by[b][0].ownerName||'a colleague'):''};});
  if(sharing())teams().forEach(function(t){var qs=teamQs(t).filter(function(q){return inCourse(q,state.course);});if(qs.length)out.push({key:'team:'+t.id,name:t.name,qs:qs,team:true});});
  return out;
}
function _renderBrowse(){
  var main=$('#main');if(!cq().length)return _renderBank();
  var all=browseBanks(),bk=all.filter(function(b){return b.key===ui.brBank;})[0];
  if(ui.brBank&&!bk){ui.brBank='';ui.brUnit='';ui.brSec='';}
  var units={};if(bk)bk.qs.forEach(function(q){var u=q.unit||'__none',x=q.section||'__none';units[u]=units[u]||{};(units[u][x]=units[u][x]||[]).push(q);});
  var flat=bk&&Object.keys(units).join()==='__none'&&Object.keys(units.__none).join()==='__none'; // no units or sections: straight to the questions
  if(flat){ui.brUnit='__none';ui.brSec='';}
  var cpy=bk&&(bk.team||bk.who)?'<button class="small ghost" data-copybank="'+esc(bk.team?bk.key:'sh:'+bk.qs[0].owner+'|'+bk.name)+'" title="Your own copy of every question, to change as you like">Copy bank to mine</button>':'';
  var onN=state.selected.length,onLine=cpy+'<span class="br-on"><b>'+onN+'</b> on this '+esc(DOC_TYPES[docType()].toLowerCase())+(onN?' · <button class="linkbtn" id="brArr">Set them up</button>':'')+'</span>';
  var crumbs=function(parts){return '<nav class="crumbs" aria-label="Where you are">'+parts.map(function(x,i){return i<parts.length-1?'<button class="linkbtn" data-crumb="'+i+'">'+esc(x)+'</button><span aria-hidden="true">›</span>':'<b>'+esc(x)+'</b>';}).join('')+'</nav>';};
  var inSel=function(qs){return qs.filter(function(q){return isSel(q.id);}).length;};
  if(!bk){
    main.innerHTML='<div class="br-top">'+crumbs(['All banks'])+'<span class="spacer"></span>'+onLine+'</div><div class="br-cards">'+all.map(function(b){var n=inSel(b.qs);
      return '<button class="br-card'+(b.team?' team':'')+'" data-brbank="'+esc(b.key)+'"><b>'+esc(b.name)+'</b><span>'+plural(b.qs.length,'question')+(n?' · <em>'+n+' on the test</em>':'')+'</span>'+(b.team?'<span class="tag team">Team bank</span>':b.who?'<span class="tag shared">Shared by '+esc(b.who)+'</span>':'')+'</button>';}).join('')+'</div>';
  }else if(!ui.brUnit&&!flat){
    main.innerHTML='<div class="br-top">'+crumbs(['All banks',bk.name])+'<span class="spacer"></span>'+onLine+'</div><div class="card br-tree">'+natSort(Object.keys(units)).map(function(u){
      var secs=natSort(Object.keys(units[u])),uq=[].concat.apply([],secs.map(function(x){return units[u][x];})),n=inSel(uq);
      return '<div class="br-unit"><button class="br-u" data-brunit="'+esc(u)+'" data-brsec=""><b>'+esc(unitName(u))+'</b><span class="hint">'+plural(uq.length,'question')+(n?' · '+n+' on the test':'')+'</span></button>'+
        (secs.length>1||secs[0]!=='__none'?'<div class="br-secs">'+secs.map(function(x){var m=inSel(units[u][x]);return '<button class="br-s" data-brunit="'+esc(u)+'" data-brsec="'+esc(x)+'">'+esc(secName(x))+' <span class="hint">'+plural(units[u][x].length,'question')+(m?', '+m+' on the test':'')+'</span></button>';}).join('')+'</div>':'')+'</div>';}).join('')+'</div>';
  }else{
    var where=[unitName(ui.brUnit)].concat(ui.brSec?[secName(ui.brSec)]:[]).join(' · ');
    main.innerHTML='<div class="br-top">'+crumbs(flat?['All banks',bk.name]:['All banks',bk.name,where])+'<span class="spacer"></span>'+onLine+'</div>'+
      '<div class="pickrow br-rand"><span>Add</span><input type="number" id="brN" min="1" max="200" value="'+esc(ui.pickN)+'" aria-label="How many"><span>at random from '+esc(flat?'this bank':ui.brSec?'this section':'this unit')+'</span><button class="small" id="brRand">Add</button></div>'+
      '<div class="subbar" id="subbar"></div><ul class="qlist" id="qlist"></ul><div class="more" id="more"></div>';
    $('#brN').onchange=function(){ui.pickN=Math.max(1,parseInt(this.value,10)||1);saveUi();};
    $('#brRand').onclick=function(){var pool=filtered().filter(function(q){return !isSel(q.id);});ui.pickN=Math.max(1,parseInt($('#brN').value,10)||1);saveUi();
      if(!pool.length){toast('Every question here is already on the test.');return;}
      var take=shuffle(pool,Math.random).slice(0,ui.pickN);take.forEach(function(q){state.selected.push(q.id);});changed();renderTabs();renderBrowse();
      toast('Added '+plural(take.length,'question')+(take.length<ui.pickN?' (that’s all that were left)':'')+'.',function(){var ids={};take.forEach(function(q){ids[q.id]=1;});state.selected=state.selected.filter(function(id){return !ids[id];});changed();render();});};
    drawList();
  }
  $$('[data-brbank]',main).forEach(function(b){b.onclick=function(){ui.brBank=b.dataset.brbank;ui.brUnit='';ui.brSec='';saveUi();renderBrowse();window.scrollTo(0,0);};});
  $$('[data-brunit]',main).forEach(function(b){b.onclick=function(){ui.brUnit=b.dataset.brunit;ui.brSec=b.dataset.brsec;ui.limit=40;saveUi();renderBrowse();window.scrollTo(0,0);};});
  $$('[data-crumb]',main).forEach(function(b){b.onclick=function(){var i=+b.dataset.crumb;if(i===0)ui.brBank='';ui.brUnit='';ui.brSec='';saveUi();renderBrowse();};});
  var ar=$('#brArr');if(ar)ar.onclick=function(){go('setup','questions');};
}
function _renderBank(){
  var main=$('#main');
  if(!cq().length){
    main.innerHTML='<div class="empty"><b>No '+esc(state.course)+' questions yet</b>Bring them in from ExamView banks (.bnk), a Word test (.docx), a PDF, a spreadsheet, or by pasting text, or write them one at a time.<div class="actions" style="justify-content:center;margin-top:14px"><button class="primary" id="goImport">Import questions</button><button id="newQ">+ New question</button></div></div>';
    $('#newQ').onclick=function(){openEditor(null);};$('#goImport').onclick=function(){go('io','import');};return;
  }
  var banks=uniq('bank');
  var mc=moreCount();
  main.innerHTML='<div class="toolbar"><input type="search" id="fq" placeholder="Search questions…" aria-label="Search questions" value="'+esc(ui.q)+'">'+unitSelect('fu',ui.unit,'All units')+unitSelect('fsec',ui.section,'All sections','section')+'<select id="ft" aria-label="Topic">'+opts(uniq('topic'),ui.topic,'All topics')+'</select><select id="fs" aria-label="Standard">'+opts(uniq('standard'),ui.std,'All standards')+'</select><button type="button" class="ghost" id="moreF" aria-expanded="'+(ui.moreF?'true':'false')+'" aria-controls="moreBar">More filters'+(mc?' <span class="count">'+mc+'</span>':'')+'</button><span class="spacer"></span>'+(picking()?'':'<button type="button" class="ghost" id="cleanBtn">Check &amp; clean up</button><button class="primary" id="newQ">+ New question</button>')+'</div>'+moreFilters()+'<div id="chips"></div><div class="subbar" id="subbar"></div><ul class="qlist" id="qlist"></ul><div class="more" id="more"></div>';
  $('#moreF').onclick=function(){ui.moreF=!ui.moreF;saveUi();renderBank();var b=$('#moreF');if(b)b.focus();};
  $('#fq').oninput=function(){ui.q=this.value;ui.limit=40;saveUi();drawList();};
  if($('#fb'))$('#fb').onchange=function(){ui.bank=this.value;ui.limit=40;saveUi();drawList();};
  if($('#fu'))$('#fu').onchange=function(){ui.unit=this.value;ui.limit=40;saveUi();drawList();};
  if($('#fsec'))$('#fsec').onchange=function(){ui.section=this.value;ui.limit=40;saveUi();drawList();};
  $('#ft').onchange=function(){ui.topic=this.value;ui.limit=40;saveUi();drawList();};
  $('#fs').onchange=function(){ui.std=this.value;ui.limit=40;saveUi();drawList();};
  if($('#fy'))$('#fy').onchange=function(){ui.type=this.value;ui.limit=40;saveUi();drawList();};
  if($('#newQ'))$('#newQ').onclick=function(){openEditor(null);};
  [['fneed','need'],['fyr','year'],['fmo','month'],['fcl','cluster'],['fsub','sub'],['fsrc','source']].forEach(function(p){var el=$('#'+p[0]);if(el)el.onchange=function(){ui[p[1]]=this.value;ui.limit=40;saveUi();drawList();};});
  $$('[data-xff]').forEach(function(el){el.onchange=function(){ui['x:'+el.dataset.xff]=this.value;ui.limit=40;saveUi();drawList();};});
  if($('#cleanBtn'))$('#cleanBtn').onclick=openCleanup;
  drawList();
}
var pickAnchor=null;
function drawList(){
  var list=sortList(filtered()),on=list.filter(function(q){return isSel(q.id);}).length;
  var ch=$('#chips');if(ch){ch.innerHTML=chipsHtml();
    $$('[data-unf]',ch).forEach(function(b){b.onclick=function(){ui[b.dataset.unf]='';ui.limit=40;saveUi();renderBank();var f=$('#fq');if(f)f.focus();};});
    if($('#clearF'))$('#clearF').onclick=function(){activeFilters().forEach(function(k){ui[k]='';});ui.limit=40;saveUi();renderBank();var f=$('#fq');if(f)f.focus();};
    var mb=$('#moreF'),mc=moreCount();if(mb)mb.innerHTML='More filters'+(mc?' <span class="count">'+mc+'</span>':'');}
  $('#subbar').innerHTML='<span>Showing '+list.length+(browsing()?'':' of '+cq().length)+'</span><span>·</span><span id="onCount">'+state.selected.length+' on the test</span><label class="sortby">Sort <select id="fsort"><option value="bank"'+(ui.sort==='bank'?' selected':'')+'>Bank order</option><option value="new"'+(ui.sort==='new'?' selected':'')+'>Newest added first</option><option value="examnew"'+(ui.sort==='examnew'?' selected':'')+'>Exam date, newest first</option><option value="exam"'+(ui.sort==='exam'?' selected':'')+'>Exam date, oldest first</option><option value="std"'+(ui.sort==='std'?' selected':'')+'>Standard</option><option value="unit"'+(ui.sort==='unit'?' selected':'')+'>Unit, then section</option></select></label>'+(list.length?'<span class="spacer"></span>'+(picking()?'<span class="hint">Click a question to add it; Shift-click to add a run of them. To delete or change many at once, use <button class="linkbtn" id="toBank">Question bank</button>.</span>':'<span id="unitBox"><button class="small" id="setUnit">Change these '+list.length+'…</button></span>')+'<span class="selbtns"><button class="small" id="selAll"'+(on===list.length?' disabled':'')+' title="Put all '+list.length+' questions shown on the test">Select all</button><button class="small" id="selNone"'+(on?'':' disabled')+' title="Take the questions shown off the test">Deselect all</button></span>':'');
  $('#fsort').onchange=function(){ui.sort=this.value;ui.limit=40;saveUi();drawList();};
  var su=$('#setUnit');if(su)su.onclick=function(){bulkBox(list);};
  var tb=$('#toBank');if(tb)tb.onclick=function(){go('bank','all');};
  var selAll=function(add){var prev=state.selected.slice(),ids={};list.forEach(function(q){ids[q.id]=1;});
    if(add)list.forEach(function(q){if(!isSel(q.id))state.selected.push(q.id);});else state.selected=state.selected.filter(function(id){return !ids[id];});
    var n=Math.abs(state.selected.length-prev.length);changed();renderTabs();drawList();
    toast((add?'Added ':'Took off ')+plural(n,'question')+'.',function(){state.selected=prev;changed();render();});};
  if($('#selAll'))$('#selAll').onclick=function(){selAll(true);};
  if($('#selNone'))$('#selNone').onclick=function(){selAll(false);};
  var ql=$('#qlist'),shown=list.slice(0,ui.limit);
  ql.innerHTML=list.length?shown.map(qCard).join(''):'<div class="empty"><b>No matches</b>Try a different search or filter.</div>';
  $('#more').innerHTML=list.length>ui.limit?'<button id="moreBtn">Show more ('+(list.length-ui.limit)+' left)</button>':'';
  if($('#moreBtn'))$('#moreBtn').onclick=function(){ui.limit+=60;drawList();};
  var ids=shown.map(function(q){return q.id;});
  var tick=function(id,on,shift){var a=shift?ids.indexOf(pickAnchor):-1,b=ids.indexOf(id),set=a>=0?ids.slice(Math.min(a,b),Math.max(a,b)+1):[id];pickAnchor=id;
    set.forEach(function(x){if(on){if(!isSel(x))state.selected.push(x);}else state.selected=state.selected.filter(function(y){return y!==x;});
      var c=$('[data-pick="'+x+'"]',ql);if(c){c.checked=on;c.closest('.qcard').classList.toggle('on',on);}});
    changed();renderTabs();$('#onCount').textContent=state.selected.length+' on the test';};
  $$('[data-pick]',ql).forEach(function(cb){cb.onclick=function(e){tick(cb.dataset.pick,cb.checked,e.shiftKey);};});
  if(picking())$$('.qcard',ql).forEach(function(li){
    li.onmousedown=function(e){if(e.shiftKey)e.preventDefault();}; // Shift-click picks a range instead of selecting text
    li.onclick=function(e){if(e.target.closest('button,a,input,label,select,textarea')||String(getSelection()).trim())return;var cb=$('[data-pick]',li);tick(cb.dataset.pick,!cb.checked,e.shiftKey);};});
  $$('[data-edit]',ql).forEach(function(b){b.onclick=function(){openEditor(byId(b.dataset.edit));};});
  $$('[data-share]',ql).forEach(function(b){b.onclick=function(){shareDialog(byId(b.dataset.share),b);};});
  $$('[data-dup]',ql).forEach(function(b){b.onclick=function(){var q=byId(b.dataset.dup),c=copyQ(q);state.questions.splice(state.questions.indexOf(q)+1,0,c);changed();renderTabs();drawList();toast(q.owner?'Copied to your questions. Edit your copy as you like.':'Copied. Edit the copy to make a variation.');};});
  $$('[data-del]',ql).forEach(function(b){b.onclick=function(){
    if(!b.classList.contains('danger')){b.classList.add('danger');b.textContent='Confirm';setTimeout(function(){if(document.body.contains(b)){b.classList.remove('danger');b.textContent='Delete';}},3000);return;}
    var id=b.dataset.del,q=byId(id),idx=state.questions.indexOf(q),si=state.selected.indexOf(id);
    if(coursesOf(q).length>1||q.owner){var was=coursesOf(q).slice();dropCourse(q,state.course);if(si>=0)state.selected.splice(si,1);changed();renderTabs();drawList();
      toast('Removed from '+state.course+'.'+(q.courses.length?' It’s still in '+q.courses.join(', ')+'.':q.owner?' Add it back under Shared with you on Import & backup.':''),function(){setCourses(q,was);if(si>=0)state.selected.splice(si,0,id);changed();render();});return;}
    state.questions.splice(idx,1);if(si>=0)state.selected.splice(si,1);changed();renderTabs();drawList();
    toast('Question deleted.',function(){state.questions.splice(idx,0,q);if(si>=0)state.selected.splice(si,0,id);changed();render();});
  };});
}

/* ---- Share one question: team banks you can add to, and public/private ---- */
function shareDialog(q,back){
  if(!q)return;
  function close(){$('#modal').innerHTML='';drawList();var b=$('[data-share="'+q.id+'"]');if(b)b.focus();else if(back&&document.body.contains(back))back.focus();}
  var mine=teams().filter(canAddTo),k=qKey(q),inB=function(b){return (b.items||[]).some(function(it){return it.o+'|'+it.id===k;});};
  $('#modal').innerHTML='<div class="overlay" id="ov"><div class="dialog" role="dialog" aria-modal="true" aria-labelledby="shT" style="width:min(520px,100%)"><h2 id="shT">Share this question</h2>'+
    '<p class="note" style="margin-top:0">'+esc(plainQ(q).t.slice(0,140))+'</p>'+
    '<h3 class="sh-h">Team banks</h3>'+(mine.length?'<div class="sh-list">'+mine.map(function(b){return '<label><input type="checkbox" data-sht="'+esc(b.id)+'"'+(inB(b)?' checked':'')+'> '+esc(b.name)+' <small class="hint">'+plural((b.items||[]).length,'question')+'</small></label>';}).join('')+'</div>':'<p class="hint">You aren’t an editor of any team bank yet. Make one under <b>Team banks</b> on Import &amp; backup.</p>')+
    '<h3 class="sh-h">Everyone on this site</h3><label><input type="checkbox" id="shPub"'+(q.visibility==='public'?' checked':'')+'> Public: every colleague can see and use it (fine for Regents questions, not for purchased textbook questions)</label>'+
    '<div class="dlg-actions"><span class="spacer"></span><button class="primary" id="shDone">Done</button></div></div></div>';
  $$('[data-sht]').forEach(function(cb){cb.onchange=function(){var b=teamById(cb.dataset.sht);if(!b)return;
    var items=(b.items||[]).filter(function(it){return it.o+'|'+it.id!==k;});if(cb.checked)items.push({o:q.owner||myId(),id:q.id});
    saveTeam(Object.assign({},b,{items:items}),cb.checked?'Added to “'+b.name+'”.':'Taken out of “'+b.name+'”.');};});
  $('#shPub').onchange=function(){if(this.checked)q.visibility='public';else delete q.visibility;changed();toast(this.checked?'Public: colleagues on this site can use it.':'Private again.');};
  $('#shDone').onclick=close;
  $('#ov').onmousedown=function(e){if(e.target.id==='ov'){e.preventDefault();close();}};
  $('#ov').onkeydown=function(e){if(e.key==='Escape'){e.preventDefault();close();}};
  ($('.dialog [data-sht]')||$('#shPub')).focus();
}

/* ---- Team banks card (Import & backup, website) ---- */
function teamCardHtml(){
  if(!sharing())return '';
  var ppl=(state.people&&state.people.people)||[],grps=(state.people&&state.people.groups)||[],mineBy={};
  state.questions.forEach(function(q){if(own(q))(mineBy[q.bank]=mineBy[q.bank]||[]).push(q.id);}); // all your banks, every course
  var bnames=Object.keys(mineBy).sort(function(a,b){return a.localeCompare(b,undefined,{numeric:true});});
  function email(id){var p=ppl.filter(function(x){return x.id===id;})[0];return p?p.email:'someone';}
  var list=teams().slice().sort(function(a,b){return a.name.localeCompare(b.name);});
  return '<div class="card" id="teamCard"><h2>Team banks</h2><p class="note" style="margin-top:0">A team bank is a list of questions shared with a group (like your Geometry team), even private ones such as a textbook bank your department bought. Its <b>editors</b> can fix the questions; everyone in the group can use them. Your own banks stay as they are.</p>'+
    (list.length?'<ul class="banks teamlist">'+list.map(function(b){
      var qs=teamQs(b),fq=qs.filter(function(q){return q.owner;}),role=b.owner===myId()?'yours':b.role===2?'you’re an editor':'shared with you';
      var who=(b.groups||[]).map(function(g){var x=grps.filter(function(y){return y.id===g;})[0];return x?x.name:'';}).filter(Boolean);
      var h='<li data-tb="'+esc(b.id)+'"><div class="tb-head"><span><b>'+esc(b.name)+'</b> <small>· '+plural((b.items||[]).length,'question')+' · '+esc(role)+(b.owner!==myId()?' · made by '+esc(b.owner_email||email(b.owner)):'')+(who.length?' · shared with '+esc(who.join(', ')):' · not shared with a group yet')+'</small></span>'+(b.owner!==myId()&&qs.length?'<button class="small ghost" data-copybank="team:'+esc(b.id)+'" title="Your own copy of every question, to change as you like">Copy to mine</button>':'')+'</div>';
      if(fq.length)h+='<div class="sh-courses"><span class="hint">Use in:</span>'+state.courses.map(function(c){var n=fq.filter(function(q){return inCourse(q,c);}).length;return '<label><input type="checkbox" data-tbuse="'+esc(b.id)+'" value="'+esc(c)+'"'+(n===fq.length?' checked':'')+(n&&n<fq.length?' data-mixed':'')+'> '+esc(c)+'</label>';}).join('')+'</div>';
      if(canAddTo(b)&&bnames.length){var have={};(b.items||[]).forEach(function(it){if(it.o===myId())have[it.id]=1;});var nIn=0;
        var rows=bnames.map(function(n){var ids=mineBy[n],k=ids.filter(function(id){return have[id];}).length;if(k)nIn++;
          return '<label><input type="checkbox" data-tbfrom="'+esc(b.id)+'" value="'+esc(n)+'"'+(k===ids.length?' checked':'')+(k&&k<ids.length?' data-mixed':'')+'> '+esc(n)+' <small class="hint">'+plural(ids.length,'question')+'</small></label>';}).join('');
        h+='<details class="tb-add" data-tbbanks="'+esc(b.id)+'"'+(ui.tbBanks===b.id?' open':'')+'><summary class="small ghost">Your banks in it… <small class="hint">'+nIn+' of '+bnames.length+'</small></summary><div class="tb-pop"><fieldset><legend class="lbl">Tick every bank to share in “'+esc(b.name)+'”</legend>'+rows+'</fieldset></div></details>';}
      if(b.manage)h+='<details class="tb-set" data-tbset="'+esc(b.id)+'"'+(ui.tbOpen===b.id?' open':'')+'><summary class="small ghost">Groups &amp; editors…</summary><div class="tb-pop">'+
        '<fieldset><legend class="lbl">Shared with</legend>'+(grps.length?grps.map(function(g){return '<label><input type="checkbox" data-tbg="'+esc(b.id)+'" value="'+esc(g.id)+'"'+((b.groups||[]).indexOf(g.id)>=0?' checked':'')+'> '+esc(g.name)+' <small class="hint">'+plural(g.members.length,'person','people')+'</small></label>';}).join(''):'<p class="hint">No groups yet. The site admin makes them under Manage accounts.</p>')+'</fieldset>'+
        '<fieldset><legend class="lbl">Editors (can change its questions)</legend>'+(function(){var ids={};grps.forEach(function(g){if((b.groups||[]).indexOf(g.id)>=0)g.members.forEach(function(m){ids[m]=1;});});(b.editors||[]).forEach(function(e){ids[e]=1;});delete ids[b.owner];var ks=Object.keys(ids);return ks.length?ks.map(function(id){return '<label><input type="checkbox" data-tbe="'+esc(b.id)+'" value="'+esc(id)+'"'+((b.editors||[]).indexOf(id)>=0?' checked':'')+'> '+esc(email(id))+'</label>';}).join(''):'<p class="hint">Share it with a group first, then pick editors from its members.</p>';})()+'</fieldset>'+
        '<div class="actions"><button class="small ghost" data-tbren="'+esc(b.id)+'">Rename</button><button class="small ghost" data-tbdel="'+esc(b.id)+'">Delete team bank</button></div></div></details>';
      return h+'</li>';}).join('')+'</ul>':'<p class="hint">No team banks yet.</p>')+
    '<div class="pickrow"><input type="text" id="tbNew" placeholder="New team bank, e.g. Geometry common assessments" style="flex:1"><button class="small" id="tbAdd">Make team bank</button></div></div>';
}
function wireTeamCard(){
  if(!$('#teamCard'))return;
  function upd(id,f,msg){var b=teamById(id);if(!b)return;var nb=JSON.parse(JSON.stringify(b));f(nb);saveTeam(nb,msg);}
  $$('[data-tbset]').forEach(function(d){d.ontoggle=function(){if(d.open)ui.tbOpen=d.dataset.tbset;else if(ui.tbOpen===d.dataset.tbset)ui.tbOpen='';};}); // stays open while ticking
  $('#tbAdd').onclick=function(){var n=$('#tbNew').value.trim();if(!n){$('#tbNew').focus();return;}saveTeam({id:'t'+Date.now().toString(36)+Math.random().toString(36).slice(2,7),name:n,groups:[],editors:[],items:[]},'Made “'+n+'”. Share it with a group under Groups & editors.');};
  $('#tbNew').onkeydown=function(e){if(e.key==='Enter')$('#tbAdd').click();};
  $$('[data-tbuse]').forEach(function(cb){if(cb.hasAttribute('data-mixed'))cb.indeterminate=true;cb.onchange=function(){var b=teamById(cb.dataset.tbuse),c=cb.value;if(!b)return;
    teamQs(b).filter(function(q){return q.owner;}).forEach(function(q){if(cb.checked)setCourses(q,coursesOf(q).concat([c]));else dropCourse(q,c);});
    if(!cb.checked){var ids={};cq().forEach(function(q){ids[q.id]=1;});state.selected=state.selected.filter(function(id){return ids[id];});}
    changed();renderIO();toast(cb.checked?'“'+b.name+'” is now in '+c+'.':'“'+b.name+'” is no longer in '+c+'.');};});
  $$('[data-tbbanks]').forEach(function(d){d.ontoggle=function(){if(d.open)ui.tbBanks=d.dataset.tbbanks;else if(ui.tbBanks===d.dataset.tbbanks)ui.tbBanks='';};}); // stays open while ticking
  $$('[data-tbfrom]').forEach(function(cb){if(cb.hasAttribute('data-mixed'))cb.indeterminate=true;cb.onchange=function(){var name=cb.value,me=myId();
    var ids={};state.questions.forEach(function(q){if(own(q)&&q.bank===name)ids[q.id]=1;});var n=Object.keys(ids).length;
    upd(cb.dataset.tbfrom,function(b){b.items=(b.items||[]).filter(function(it){return !(it.o===me&&ids[it.id]);});if(cb.checked)Object.keys(ids).forEach(function(id){b.items.push({o:me,id:id});});},
      cb.checked?'Added '+plural(n,'question')+' from “'+name+'”.':'Took “'+name+'” out ('+plural(n,'question')+').');};});
  $$('[data-tbg]').forEach(function(cb){cb.onchange=function(){upd(cb.dataset.tbg,function(b){b.groups=(b.groups||[]).filter(function(g){return g!==cb.value;});if(cb.checked)b.groups.push(cb.value);},cb.checked?'Shared with the group.':'No longer shared with that group.');};});
  $$('[data-tbe]').forEach(function(cb){cb.onchange=function(){upd(cb.dataset.tbe,function(b){b.editors=(b.editors||[]).filter(function(e){return e!==cb.value;});if(cb.checked)b.editors.push(cb.value);},cb.checked?'They can now change its questions.':'They can no longer change its questions.');};});
  $$('[data-tbren]').forEach(function(btn){btn.onclick=function(){var b=teamById(btn.dataset.tbren);if(!b)return;var li=btn.closest('li'),head=$('.tb-head',li);
    head.innerHTML='<input type="text" value="'+esc(b.name)+'" style="flex:1"><button class="small primary">Save</button><button class="small ghost">Cancel</button>';var inp=$('input',head),bs=$$('button',head);inp.focus();inp.select();
    var done=function(){var n=inp.value.trim();if(n&&n!==b.name)upd(b.id,function(x){x.name=n;},'Renamed.');else renderIO();};bs[0].onclick=done;bs[1].onclick=renderIO;inp.onkeydown=function(e){if(e.key==='Enter')done();if(e.key==='Escape')renderIO();};};});
  $$('[data-tbdel]').forEach(function(btn){btn.onclick=function(){
    if(!btn.classList.contains('danger')){btn.classList.add('danger');btn.textContent='Confirm: delete for everyone';setTimeout(function(){if(document.body.contains(btn)){btn.classList.remove('danger');btn.textContent='Delete team bank';}},4000);return;}
    var b=teamById(btn.dataset.tbdel);CLOUD.request('DELETE','/team/v1/banks/'+encodeURIComponent(b.id)).then(function(){toast('Deleted “'+b.name+'”. Everyone’s own questions are still theirs.');return CLOUD.sync();}).then(function(){render();},function(e){toast(e.message);});};});
}

/* ================= her own fields, bulk changes, clean-up, bank files ================= */
function myFields(){return Array.isArray(state.fields)?state.fields:[];}
function fieldById(id){return myFields().filter(function(f){return f.id===id;})[0]||null;}
function addField(label){
  label=String(label||'').trim();if(!label)return null;
  var have=myFields().filter(function(f){return f.label.toLowerCase()===label.toLowerCase();})[0];if(have)return have;
  if(!Array.isArray(state.fields))state.fields=[];
  var f={id:'f'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),label:label};state.fields.push(f);return f;
}
function xval(q,id){return q.extra&&q.extra[id]!=null?String(q.extra[id]):'';}
function uniqX(id){var t={};cq().forEach(function(q){var v=xval(q,id);if(v)t[v]=1;});return Object.keys(t).sort(function(a,b){return a.localeCompare(b,undefined,{numeric:true});});}
// fields that "Change these…" can set on many questions at once; her own fields are 'x:<id>'
var BULK_F=[['unit','Unit'],['section','Section'],['topic','Topic'],['subtopic','Subtopic'],['standard','Standard'],['nyStd','Old NY standard'],['cluster','Cluster'],['bank','Bank'],['source','Source'],['part','Part'],['points','Points'],['notes','My notes']];
var LIST_F={standard:', ',nyStd:', ',subtopic:'; '};
function bulkFields(){return BULK_F.concat(myFields().map(function(f){return ['x:'+f.id,f.label];}));}
function bulkLabel(k){var f=bulkFields().filter(function(x){return x[0]===k;})[0];return f?f[1]:k;}
function getF(q,k){if(k.indexOf('x:')===0)return xval(q,k.slice(2));return q[k]==null?'':String(q[k]);}
function setF(q,k,v){
  if(k.indexOf('x:')===0){var id=k.slice(2);if(v===''){if(q.extra){delete q.extra[id];if(!Object.keys(q.extra).length)delete q.extra;}return;}if(!q.extra||typeof q.extra!=='object')q.extra={};q.extra[id]=v;return;}
  if(k==='points'){q.points=num(v,q.points);return;}
  if(k==='bank'){q.bank=v||'My questions';return;}
  if(k==='standard'){var old=q.standard;q.standard=v;if(!q.cluster||q.cluster===clusterOf(old))q.cluster=clusterOf(v);return;}
  q[k]=v;
}
function snapF(qs,keys){return qs.map(function(q){var o={q:q,v:{}};keys.forEach(function(k){o.v[k]=k.indexOf('x:')===0?xval(q,k.slice(2)):q[k];});return o;});}
function restoreF(snap,keys){snap.forEach(function(o){keys.forEach(function(k){if(k.indexOf('x:')===0)setF(o.q,k,o.v[k]||'');else o.q[k]=o.v[k];});});}

/* Standards: older ExamView banks list the 2005 NY code next to the Common Core one ("A.REI.A.1, NY: A.N.1"). */
function stdParts(s){return String(s||'').split(/\s*,\s*/).filter(Boolean);}
function isNY(c){return /^NY:/i.test(c);}
function isMixed(q){var p=stdParts(q.standard);return p.some(isNY)&&p.some(function(c){return !isNY(c);});}
function splitNY(q){
  if(!isMixed(q))return false;
  var p=stdParts(q.standard),old=stdParts(q.nyStd);
  p.filter(isNY).forEach(function(c){c=c.replace(/^NY:\s*/i,'');if(c&&old.indexOf(c)<0)old.push(c);});
  q.nyStd=old.join(', ');q.standard=p.filter(function(c){return !isNY(c);}).join(', ');
  if(!q.cluster)q.cluster=clusterOf(q.standard);
  return true;
}
/* "Needs attention" checks, used by the filter and by Check & clean up */
var NEEDS=[['noans','No correct answer'],['nostd','No standard'],['nounit','No unit'],['nosec','No section'],['nocl','No cluster'],['mixed','Old NY codes in the standard']];
function needLabel(k){var n=NEEDS.filter(function(x){return x[0]===k;})[0];return n?n[1]:k;}
function hasAnswer(q){if(isMC(q.type))return typeof q.answer==='number'&&q.answer>=0&&q.answer<(q.choices||[]).length;if(q.type==='tf')return q.answer==='T'||q.answer==='F';return true;}
function needs(q,k){
  if(k==='noans')return !hasAnswer(q);if(k==='nostd')return !String(q.standard||'').trim();if(k==='nounit')return !q.unit;if(k==='nosec')return !q.section;
  if(k==='nocl')return !q.cluster&&!!clusterOf(q.standard);if(k==='mixed')return isMixed(q);return false;
}
function firstStd(q){return stdParts(q.standard).filter(function(c){return !isNY(c);})[0]||'';}
// unit/section for questions that have none, when every other question with the same standard agrees on one
function unitGuesses(qs){
  var by={};cq().forEach(function(q){var s=firstStd(q);if(!s)return;var b=by[s]||(by[s]={u:{},s:{}});if(q.unit)b.u[q.unit]=1;if(q.section)b.s[q.section]=1;});
  var out=[];qs.forEach(function(q){var s=firstStd(q),b=s&&by[s];if(!b)return;var u=Object.keys(b.u),sc=Object.keys(b.s),g={q:q};
    if(!q.unit&&u.length===1)g.unit=u[0];if(!q.section&&sc.length===1)g.section=sc[0];if(g.unit||g.section)out.push(g);});
  return out;
}
function plural(n,one,many){return n+' '+(n===1?one:(many||one+'s'));}

/* ---- Change these N… (bank tab) ---- */
function bulkBox(list){
  var box=$('#unitBox');if(!box)return;
  var ticked=list.filter(function(q){return isSel(q.id);}),fs=bulkFields();
  var k0=fs.some(function(f){return f[0]===ui.bulkF;})?ui.bulkF:'unit';
  box.className='bulkbox';
  box.innerHTML='<label>Change <select id="bkF" aria-label="Detail to change">'+fs.map(function(f){return '<option value="'+esc(f[0])+'"'+(f[0]===k0?' selected':'')+'>'+esc(f[1])+'</option>';}).join('')+'</select></label>'+
    '<select id="bkA" aria-label="How to change it"><option value="set">set to</option><option value="add">add</option><option value="replace">find and replace</option><option value="clear">clear it</option></select>'+
    '<input type="text" id="bkFind" placeholder="Find" aria-label="Text to find" hidden>'+
    '<input type="text" id="bkV" list="bkList" placeholder="New value" aria-label="New value"><datalist id="bkList"></datalist>'+
    (ticked.length&&ticked.length<list.length?'<select id="bkW" aria-label="Which questions"><option value="all">on all '+list.length+' shown</option><option value="ticked">only on the '+ticked.length+' ticked</option></select>':'<span>on '+plural(list.length,'question')+'</span>')+
    '<button class="small primary" id="bkGo">Apply</button><button class="small ghost" id="bkX">Cancel</button>';
  function sync(){
    var k=$('#bkF').value,a=$('#bkA');ui.bulkF=k;saveUi();
    $$('option',a).forEach(function(o){o.disabled=k==='points'&&o.value!=='set';});if(k==='points')a.value='set';
    var how=a.value;$('#bkFind').hidden=how!=='replace';$('#bkV').hidden=how==='clear';
    $('#bkV').placeholder=how==='replace'?'Replace with':how==='add'?'What to add':'New value';
    var vals=k.indexOf('x:')===0?uniqX(k.slice(2)):uniq(k);
    $('#bkList').innerHTML=vals.slice(0,300).map(function(v){return '<option value="'+esc(v)+'">';}).join('');
  }
  $('#bkF').onchange=sync;$('#bkA').onchange=sync;sync();$('#bkV').focus();
  function go(){
    var k=$('#bkF').value,how=$('#bkA').value,v=$('#bkV').value.trim(),fd=$('#bkFind').value,targets=$('#bkW')&&$('#bkW').value==='ticked'?ticked:list;
    var skip=targets.filter(function(q){return q.owner;}).length;targets=targets.filter(own);
    if(how==='set'&&!v){toast('Type the new value, or choose “clear it”.');$('#bkV').focus();return;}
    if(how==='add'&&!v){toast('Type what to add.');$('#bkV').focus();return;}
    if(how==='replace'&&!fd){toast('Type the text to find.');$('#bkFind').focus();return;}
    var keys=[k];if(k==='standard')keys.push('cluster');
    var snap=snapF(targets,keys),n=0;
    targets.forEach(function(q){var cur=getF(q,k),nv=cur;
      if(how==='set')nv=v;else if(how==='clear')nv='';else if(how==='replace')nv=cur.split(fd).join(v);
      else{var sep=LIST_F[k];if(sep){var p=cur.split(sep.trim()).map(function(x){return x.trim();}).filter(Boolean);if(p.indexOf(v)<0)p.push(v);nv=p.join(sep);}else nv=cur?cur+' '+v:v;}
      if(k==='points'&&String(num(nv,q.points))===String(q.points))return;
      if(nv!==cur){setF(q,k,nv);n++;}});
    if(!n){toast(skip&&!targets.length?'Those are colleagues’ shared questions: only they can change them.':'Nothing changed: those questions already have that.');return;}
    changed();renderBank();
    toast('Changed '+bulkLabel(k).toLowerCase().replace(/^my /,'')+' on '+plural(n,'question')+'.'+(skip?' Left '+plural(skip,'shared question')+' alone (only their owners can change them).':''),function(){restoreF(snap,keys);changed();renderBank();});
  }
  $('#bkGo').onclick=go;$('#bkX').onclick=drawList;
  $$('input',box).forEach(function(inp){inp.onkeydown=function(e){if(e.key==='Enter')go();if(e.key==='Escape')drawList();};});
}

/* ---- Check & clean up (bank tab) ---- */
function openCleanup(){
  var back=document.activeElement;
  function close(){$('#modal').innerHTML='';renderBank();var b=$('#cleanBtn');if(b)b.focus();else if(back&&document.body.contains(back))back.focus();}
  function show(k){activeFilters().forEach(function(f){ui[f]='';});ui.need=k;ui.moreF=true;ui.limit=40;saveUi();$('#modal').innerHTML='';go('bank','all');}
  function fix(kind){
    var qs=cq().filter(own),keys,snap,n=0,msg;
    if(kind==='mixed'){var t=qs.filter(isMixed);keys=['standard','nyStd','cluster'];snap=snapF(t,keys);t.forEach(function(q){if(splitNY(q))n++;});msg='Moved the old NY codes to “Old NY standard” on '+plural(n,'question')+'.';}
    else if(kind==='nocl'){var t2=qs.filter(function(q){return needs(q,'nocl');});keys=['cluster'];snap=snapF(t2,keys);t2.forEach(function(q){q.cluster=clusterOf(q.standard);n++;});msg='Filled in the cluster on '+plural(n,'question')+'.';}
    else if(kind==='units'){var g=unitGuesses(qs.filter(function(q){return !q.unit||!q.section;}));keys=['unit','section'];snap=snapF(g.map(function(x){return x.q;}),keys);g.forEach(function(x){if(x.unit)x.q.unit=x.unit;if(x.section)x.q.section=x.section;n++;});msg='Copied the unit and section to '+plural(n,'question')+'.';}
    if(!n)return;
    changed();draw();
    toast(msg,function(){restoreF(snap,keys);changed();if($('#cuDone'))draw();else render();});
  }
  function row(text,fixKind,fixLabel,showKey,hint){
    return '<li><div><p>'+text+'</p>'+(hint?'<p class="hint">'+hint+'</p>':'')+'</div><div class="cu-acts">'+(fixKind?'<button class="small primary" data-fix="'+fixKind+'">'+esc(fixLabel)+'</button>':'')+(showKey?'<button class="small" data-show="'+showKey+'">Show them</button>':'')+'</div></li>';
  }
  function draw(){
    var qs=cq().filter(own),c={};NEEDS.forEach(function(n){c[n[0]]=qs.filter(function(q){return needs(q,n[0]);}).length;});
    var g=unitGuesses(qs.filter(function(q){return !q.unit||!q.section;})),rows=[];
    if(c.mixed)rows.push(row('<b>'+plural(c.mixed,'question')+'</b> '+(c.mixed===1?'has':'have')+' an old NY code (like “NY: A.N.1”) mixed in with the Common Core standard.','mixed','Move them to “Old NY standard”','mixed','The Common Core code stays in Standard. The old code is kept in its own field, so you can still search for it.'));
    if(c.nocl)rows.push(row('<b>'+plural(c.nocl,'question')+'</b> '+(c.nocl===1?'has':'have')+' a standard but no cluster.','nocl','Fill in the clusters','nocl','For example, A.REI.B.4 is in cluster A.REI.B.'));
    if(g.length)rows.push(row('<b>'+plural(g.length,'question')+'</b> '+(g.length===1?'is':'are')+' missing a unit or section that other questions with the same standard all share.','units','Copy unit and section',null,'Only copied when every question with that standard has the same unit (and section).'));
    if(c.noans)rows.push(row('<b>'+plural(c.noans,'question')+'</b> '+(c.noans===1?'has':'have')+' no correct answer marked.',null,null,'noans','Open each one and click the circle next to the right answer.'));
    if(c.nostd)rows.push(row('<b>'+plural(c.nostd,'question')+'</b> '+(c.nostd===1?'has':'have')+' no standard.',null,null,'nostd','Show them, then use <b>Change these…</b> to set the standard for several at once.'));
    if(c.nounit)rows.push(row('<b>'+plural(c.nounit,'question')+'</b> '+(c.nounit===1?'has':'have')+' no unit.',null,null,'nounit','Show them, filter by standard or topic, then use <b>Change these…</b>.'));
    if(c.nosec)rows.push(row('<b>'+plural(c.nosec,'question')+'</b> '+(c.nosec===1?'has':'have')+' no section.',null,null,'nosec'));
    $('#modal').innerHTML='<div class="overlay" id="ov"><div class="dialog cleanup" role="dialog" aria-modal="true" aria-labelledby="cuT"><h2 id="cuT">Check &amp; clean up: '+esc(state.course)+'</h2>'+
      '<p class="note" style="margin-top:0">Looks through the '+plural(qs.length,'question')+' in '+esc(state.course)+'. Every fix can be undone.</p>'+
      (rows.length?'<ul class="cleanlist">'+rows.join('')+'</ul>':'<p class="result ok">Everything looks good: every question has an answer, a standard, a unit and a section.</p>')+
      '<div class="dlg-actions"><span class="spacer"></span><button class="primary" id="cuDone">Done</button></div></div></div>';
    $$('[data-fix]').forEach(function(b){b.onclick=function(){fix(b.dataset.fix);};});
    $$('[data-show]').forEach(function(b){b.onclick=function(){show(b.dataset.show);};});
    $('#cuDone').onclick=close;
    $('#ov').onmousedown=function(e){if(e.target.id==='ov'){e.preventDefault();close();}};
    $('#ov').onkeydown=function(e){if(e.key==='Escape'){e.preventDefault();close();}};
    var f=$('.dialog [data-fix]')||$('.dialog [data-show]')||$('#cuDone');f.focus();
  }
  draw();
}

/* ---- her own fields in the editor ---- */
function xfHtml(q){
  return '<label><span class="lbl">Old NY standard</span><input type="text" id="e-ny" value="'+esc(q.nyStd||'')+'" placeholder="e.g. A.A.7"></label>'+
    myFields().map(function(f){var l='xl-'+f.id;return '<label><span class="lbl">'+esc(f.label)+'</span><input type="text" data-xf="'+esc(f.id)+'" list="'+l+'" value="'+esc(xval(q,f.id))+'"><datalist id="'+l+'">'+uniqX(f.id).map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label>';}).join('')+
    '<div class="xf-add"><button type="button" class="small" id="e-addf">+ Add a field</button></div>';
}
function wireXF(){
  var b=$('#e-addf');if(!b)return;
  b.onclick=function(){var box=b.parentNode;box.innerHTML='<input type="text" id="e-newf" placeholder="Field name, e.g. DOK" aria-label="New field name"><button type="button" class="small primary" id="e-newfGo">Add</button>';
    var inp=$('#e-newf');inp.focus();
    var add=function(){var v=inp.value.trim();if(!v){inp.focus();return;}collect();var f=addField(v);changed();$('#e-xf').innerHTML=xfHtml(ed);wireXF();var el=$('[data-xf="'+f.id+'"]');if(el)el.focus();};
    $('#e-newfGo').onclick=add;inp.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();add();}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();$('#e-xf').innerHTML=xfHtml(ed);wireXF();}};};
}

/* ---- bank files: one bank per .json file, to keep on a NAS or share ---- */
var BANK_KIND='bank';
function bankFileName(name){return (String(name||'').replace(/[\\\/:*?"<>|\x00-\x1f]+/g,'-').replace(/^[\s.]+|[\s.]+$/g,'').slice(0,100)||'Bank')+'.json';}
function bankFileData(name){
  var qs=cq().filter(function(q){return q.bank===name;}).map(function(q){return JSON.parse(JSON.stringify(q));});
  var used={},cs={};qs.forEach(function(q){Object.keys(q.extra||{}).forEach(function(k){used[k]=1;});coursesOf(q).forEach(function(c){cs[c]=1;});});
  return {app:'test-builder',kind:BANK_KIND,version:1,appVersion:APP_VERSION,saved:new Date().toISOString(),bank:name,courses:Object.keys(cs),fields:myFields().filter(function(f){return used[f.id];}),questions:qs};
}
function isBankFile(d){return !!(d&&d.kind===BANK_KIND&&Array.isArray(d.questions));}
// adds the questions in bank files; a question that's already here (same id) is updated to the file's version
function importBankData(list){
  var prevQ=state.questions.slice(),prevF=JSON.parse(JSON.stringify(myFields())),byId={},added=0,updated=0,same=0,bad=[],banks=[];
  state.questions.forEach(function(q,i){byId[q.id]=i;});
  // a question you already have from the same bank and exam (same reference, like 062502geo), imported some other way
  // (an ExamView file), is updated in place: it keeps its id (saved tests, picks) and the details you set
  var refN={},byRef={};state.questions.forEach(function(q,i){if(own(q)&&q.ref){var k=q.bank+'\u0001'+q.ref;refN[k]=(refN[k]||0)+1;byRef[k]=i;}});
  list.forEach(function(it){
    var d=it.data;if(!isBankFile(d)){bad.push(it.name);return;}
    var map={};(Array.isArray(d.fields)?d.fields:[]).forEach(function(f){if(f&&f.id&&f.label){var mine=addField(f.label);if(mine)map[f.id]=mine.id;}});
    var qs=JSON.parse(JSON.stringify(d.questions)).filter(function(q){return q&&typeof q==='object'&&TYPES[q.type];});
    qs.forEach(function(q){
      q.html=sanitize(String(q.html||''));if(Array.isArray(q.choices))q.choices=q.choices.map(function(c){return sanitize(String(c||''));});
      var cs=coursesOf(q).filter(function(c){return state.courses.indexOf(c)>=0;});setCourses(q,cs.length?cs:[state.course]);
      if(q.extra&&typeof q.extra==='object'){var x={};Object.keys(q.extra).forEach(function(k){var id=map[k]||(fieldById(k)?k:null),v=q.extra[k];if(id&&v!=null&&String(v)!=='')x[id]=String(v);});if(Object.keys(x).length)q.extra=x;else delete q.extra;}else delete q.extra;
      if(!q.bank)q.bank=d.bank||'My questions';
    });
    qs=normalize({questions:qs,courses:state.courses.slice(),course:state.course}).questions;
    var fileN={};qs.forEach(function(q){if(q.ref){var k=q.bank+'\u0001'+q.ref;fileN[k]=(fileN[k]||0)+1;}});
    qs.forEach(function(q){
      var i=byId[q.id],rk=q.ref&&q.bank+'\u0001'+q.ref;
      if(i==null&&rk&&refN[rk]===1&&fileN[rk]===1){i=byRef[rk];var h=state.questions[i];q.id=h.id;
        ['unit','section','topic','subtopic','standard','cluster','nyStd','source','notes'].forEach(function(k){if(h[k])q[k]=h[k];});
        if(h.extra)q.extra=Object.assign({},q.extra||{},h.extra);if(h.visibility)q.visibility=h.visibility;}
      if(i==null){state.questions.push(q);byId[q.id]=state.questions.length-1;added++;return;}
      var have=state.questions[i];setCourses(q,coursesOf(have).concat(coursesOf(q)));
      if(JSON.stringify(have)===JSON.stringify(q)){same++;return;}
      state.questions[i]=q;updated++;
    });
    if(banks.indexOf(d.bank)<0&&d.bank)banks.push(d.bank);
  });
  if(added||updated){changed();renderTabs();}
  return {added:added,updated:updated,same:same,bad:bad,banks:banks,undo:function(){state.questions=prevQ;state.fields=prevF;changed();render();}};
}
function bankImportMsg(r){
  var parts=[];if(r.added)parts.push('added '+plural(r.added,'question'));if(r.updated)parts.push('updated '+plural(r.updated,'question'));if(r.same)parts.push(plural(r.same,'question')+' already up to date');
  var m=parts.length?parts.join(', ').replace(/^./,function(c){return c.toUpperCase();})+(r.banks.length?' ('+r.banks.map(function(b){return '“'+b+'”';}).join(', ')+')':'')+'.':'';
  if(r.bad.length)m+=(m?' ':'')+r.bad.map(function(n){return '“'+n+'”';}).join(', ')+(r.bad.length===1?' isn’t a bank file.':' aren’t bank files.')+' (A full backup goes in <b>Restore a backup…</b>.)';
  return m;
}
function saveBankFiles(names,res){
  var files=names.map(function(n){return {name:bankFileName(n),text:JSON.stringify(bankFileData(n))};});
  function done(where){res.className='result ok';res.innerHTML='Saved '+plural(files.length,'bank file')+where+'.';}
  if(window.showDirectoryPicker){
    return window.showDirectoryPicker({id:'alctb-banks',mode:'readwrite'}).then(function(dir){
      return files.reduce(function(p,f){return p.then(function(){return dir.getFileHandle(f.name,{create:true}).then(function(h){return h.createWritable();}).then(function(w){return w.write(f.text).then(function(){return w.close();});});});},Promise.resolve()).then(function(){done(' to “'+esc(dir.name)+'”');});
    },function(e){if(e&&e.name==='AbortError')return;res.className='result bad';res.textContent='Couldn’t open that folder: '+(e&&e.message||e);});
  }
  files.forEach(function(f){saveFile(f.name,f.text,'application/json');});
  done(' to your Downloads folder. Move them to your NAS folder (Chrome and Edge can save straight to a folder you choose)');
  return Promise.resolve();
}

/* ---- Import & backup cards: bank files, her own fields ---- */
/* Your banks: one list. Tick banks to save them as files; each row's ⋯ menu has Courses, Make public, Rename, Delete. */
var BANKS_SHOWN=10;
function yourBanksCard(bnames,bc){
  if(!bnames.length)return '<div class="card" id="banksCard"><h2>Your banks</h2><p class="note" style="margin:0">No questions yet.</p><div class="actions"><span class="filebtn"><button type="button" tabindex="-1" aria-hidden="true">Open bank files…</button><input type="file" id="bfIn" accept=".json,application/json" multiple aria-label="Open bank files"></span></div><div id="bfRes" class="result"></div></div>';
  var many=bnames.length>BANKS_SHOWN+2;
  return '<div class="card" id="banksCard"><h2>Your banks <small class="hint">'+bnames.length+'</small></h2>'+
    '<div class="b-tools">'+(many?'<input type="search" id="bankFind" placeholder="Find a bank" aria-label="Find a bank">':'')+
      '<label class="b-all"><input type="checkbox" id="bfAll"> All</label><span class="spacer"></span>'+
      '<button class="small" id="bfSave" title="Bank files (.json) keep everything: math, pictures, answers and your own fields. Keep them on your NAS or give them to another teacher.">Save all as files…</button>'+
      '<span class="filebtn"><button type="button" tabindex="-1" aria-hidden="true" class="small">Open bank files…</button><input type="file" id="bfIn" accept=".json,application/json" multiple aria-label="Open bank files"></span></div>'+
    '<div id="bfRes" class="result"></div>'+
    '<ul class="blist">'+bnames.map(function(b,i){
      var qs=cq().filter(function(q){return q.bank===b&&own(q);}),pub=sharing()&&qs.length&&qs.every(function(q){return q.visibility==='public';});
      var also=state.courses.filter(function(c){return c!==state.course&&qs.some(function(q){return inCourse(q,c);});});
      var crs=state.courses.length>1?'<div class="bm-sec"><span class="lbl">Also use in</span>'+state.courses.filter(function(c){return c!==state.course;}).map(function(c){var n=qs.filter(function(q){return inCourse(q,c);}).length;return '<label><input type="checkbox" data-usein="'+esc(b)+'" value="'+esc(c)+'"'+(n===qs.length?' checked':'')+(n&&n<qs.length?' data-mixed':'')+'> '+esc(c)+'</label>';}).join('')+'<p class="hint">Still one copy: an edit shows up in every course.</p></div>':'';
      return '<li data-bname="'+esc(b.toLowerCase())+'"'+(many&&!ui.allBanks&&i>=BANKS_SHOWN?' hidden':'')+'><label class="b-name"><input type="checkbox" data-bf value="'+esc(b)+'"><span>'+esc(b)+'</span></label>'+
        '<small>'+plural(bc[b],'question')+(also.length?' · also in '+esc(also.join(', ')):'')+'</small>'+(pub?'<span class="tag pub">Public</span>':'')+
        '<details class="bmenu" data-bmenu="'+esc(b)+'"'+(ui.bOpen===b?' open':'')+'><summary aria-label="More for '+esc(b)+'">⋯</summary><div class="bm-pop">'+crs+
        (sharing()?'<div class="bm-sec">'+bankPubHtml(b)+'</div>':'')+
        '<div class="bm-sec bm-row"><button class="small ghost" data-copybank="'+esc(b)+'" title="A second bank with copies of these questions, to change without touching this one">Duplicate</button><button class="small ghost" data-rename="'+esc(b)+'">Rename</button><button class="small ghost" data-delbank="'+esc(b)+'">Delete</button></div></div></details></li>';
    }).join('')+'</ul>'+
    (many?'<button class="small ghost" id="bankMore"'+(ui.allBanks?' hidden':'')+'>Show all '+bnames.length+' banks</button>':'')+'</div>';
}
function wireBanksCard(){
  var list=$('.blist');if(!list)return;
  var lis=$$('li',list),find=$('#bankFind'),more=$('#bankMore'),all=$('#bfAll'),save=$('#bfSave');
  function view(){var t=find?find.value.trim().toLowerCase():'';
    lis.forEach(function(li,i){li.hidden=t?li.dataset.bname.indexOf(t)<0:(more&&!ui.allBanks&&i>=BANKS_SHOWN);});
    if(more)more.hidden=!!t||ui.allBanks;}
  function count(){var n=$$('[data-bf]:checked',list).length;save.textContent=n?'Save '+n+' as files…':'Save all as files…';all.checked=n===lis.length;all.indeterminate=n>0&&n<lis.length;}
  if(find)find.oninput=view;
  if(more)more.onclick=function(){ui.allBanks=true;view();};
  all.onchange=function(){$$('[data-bf]',list).forEach(function(c){c.checked=all.checked;});count();};
  $$('[data-bf]',list).forEach(function(c){c.onchange=count;});
  $$('[data-bmenu]',list).forEach(function(d){d.ontoggle=function(){if(d.open){ui.bOpen=d.dataset.bmenu;$$('[data-bmenu]',list).forEach(function(o){if(o!==d)o.open=false;});}else if(ui.bOpen===d.dataset.bmenu)ui.bOpen='';};});
}
function fieldsCard(){
  var fs=myFields();
  return '<div class="card" id="fieldsCard"><h2>Your own fields</h2><p class="note" style="margin-top:0">Add details the banks don’t have, like DOK or difficulty. They show up when you edit a question (under <b>More details</b>), in <b>More filters</b>, in <b>Change these…</b>, and in backups and bank files.</p>'+
    (fs.length?'<ul class="banks">'+fs.map(function(f){var n=state.questions.filter(function(q){return xval(q,f.id);}).length;return '<li><span>'+esc(f.label)+' <small>· filled in on '+plural(n,'question')+'</small></span><button class="small ghost" data-frename="'+esc(f.id)+'">Rename</button><button class="small ghost" data-fdel="'+esc(f.id)+'">Delete</button></li>';}).join('')+'</ul>':'')+
    '<div class="pickrow"><input type="text" id="newField" placeholder="New field, e.g. DOK" style="flex:1" aria-label="New field name"><button class="small" id="addField">Add field</button></div></div>';
}
function wireToolCards(){
  var save=$('#bfSave');if(save)save.onclick=function(){var names=$$('[data-bf]:checked').map(function(x){return x.value;});if(!names.length)names=$$('[data-bf]').map(function(x){return x.value;});saveBankFiles(names,$('#bfRes'));};
  var bin=$('#bfIn');if(bin)bin.onchange=function(){
    var files=Array.prototype.slice.call(this.files||[]);this.value='';if(!files.length)return;
    Promise.all(files.map(function(f){return f.text().then(function(t){var d=null;try{d=JSON.parse(t);}catch(e){}return {name:f.name,data:d};});})).then(function(list){
      var r=importBankData(list);renderIO();var res=$('#bfRes');res.className='result '+(r.added||r.updated||r.same?'ok':'bad');res.innerHTML=bankImportMsg(r)||'No questions in '+(files.length===1?'that file':'those files')+'.';
      if(r.added||r.updated)toast(bankImportMsg(r).replace(/<[^>]+>/g,''),r.undo);
    });
  };
  var af=$('#addField'),nf=$('#newField');
  if(af){af.onclick=function(){var v=nf.value.trim();if(!v){nf.focus();return;}var had=myFields().length,f=addField(v);if(myFields().length===had){toast('You already have a field called “'+f.label+'”.');return;}changed();renderIO();toast('Added the field “'+f.label+'”.');var n=$('#newField');if(n)n.focus();};
    nf.onkeydown=function(e){if(e.key==='Enter')af.click();};}
  $$('[data-frename]').forEach(function(b){b.onclick=function(){
    var f=fieldById(b.dataset.frename),li=b.closest('li');if(!f)return;li.innerHTML='<input type="text" value="'+esc(f.label)+'" style="flex:1" aria-label="Field name"><button class="small primary">Save</button><button class="small ghost">Cancel</button>';
    var inp=$('input',li);inp.focus();inp.select();var bs=$$('button',li);
    var done=function(){var nn=inp.value.trim();if(nn&&nn!==f.label){if(myFields().some(function(x){return x!==f&&x.label.toLowerCase()===nn.toLowerCase();})){toast('You already have a field called “'+nn+'”.');return;}f.label=nn;changed();}renderIO();};
    bs[0].onclick=done;bs[1].onclick=renderIO;inp.onkeydown=function(e){if(e.key==='Enter')done();if(e.key==='Escape')renderIO();};};});
  $$('[data-fdel]').forEach(function(b){b.onclick=function(){
    var f=fieldById(b.dataset.fdel);if(!f)return;var qs=state.questions.filter(function(q){return xval(q,f.id);});
    if(!b.classList.contains('danger')){b.classList.add('danger');b.textContent=qs.length?'Delete from '+plural(qs.length,'question')+'?':'Delete?';setTimeout(function(){if(document.body.contains(b)){b.classList.remove('danger');b.textContent='Delete';}},3500);return;}
    var keys=['x:'+f.id],snap=snapF(qs,keys),prevF=myFields().slice();
    qs.forEach(function(q){setF(q,'x:'+f.id,'');});state.fields=myFields().filter(function(x){return x!==f;});changed();renderIO();
    toast('Deleted the field “'+f.label+'”.',function(){state.fields=prevF;restoreF(snap,keys);changed();render();});};});
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
    (sharing()&&!ed.owner?'<label class="e-vis"><span class="lbl">Who can see it</span><select id="e-vis"><option value="private">Only me (private)</option><option value="public"'+(ed.visibility==='public'?' selected':'')+'>Everyone on this site (public)</option></select></label>':'')+
    '<div class="row4" style="grid-template-columns:1fr 1.2fr 1.2fr .8fr"><fieldset class="e-courses" id="e-courses"><legend class="lbl">Courses</legend>'+state.courses.map(function(c){var on=coursesOf(ed).length?inCourse(ed,c):c===state.course;return '<label><input type="checkbox" value="'+esc(c)+'"'+(on?' checked':'')+'> '+esc(c)+'</label>';}).join('')+'</fieldset><label><span class="lbl">Bank</span><input type="text" id="e-bank" list="bankList" value="'+esc(ed.bank)+'"><datalist id="bankList">'+uniq('bank').map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label><label><span class="lbl">Topic</span><input type="text" id="e-topic" list="topicList" value="'+esc(ed.topic)+'"><datalist id="topicList">'+uniq('topic').map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label><label><span class="lbl">Part</span><input type="text" id="e-part" list="partList" value="'+esc(ed.part||'')+'" placeholder="e.g. Part II"><datalist id="partList">'+uniq('part').map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label></div>'+
    '<div class="row4" style="grid-template-columns:1fr 1fr 2fr"><label><span class="lbl">Subtopic</span><input type="text" id="e-sub" list="subList" value="'+esc(ed.subtopic||'')+'"><datalist id="subList">'+uniq('subtopic').map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label><label><span class="lbl">Cluster</span><input type="text" id="e-cl" list="clList" value="'+esc(ed.cluster||'')+'" placeholder="e.g. G.CO.A"><datalist id="clList">'+uniq('cluster').map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label><label><span class="lbl">My notes <span class="hint" style="font-weight:400">— never printed on tests</span></span><input type="text" id="e-notes" value="'+esc(ed.notes||'')+'" placeholder="e.g. good warm-up; students mix up arcs"></label></div>'+
    '<div class="row4" style="grid-template-columns:1fr 1.5fr .9fr .7fr .7fr auto"><label><span class="lbl">Reference</span><input type="text" id="e-ref" value="'+esc(ed.ref||'')+'" placeholder="MMYYQQ, e.g. 062504"></label><label><span class="lbl">Source</span><input type="text" id="e-src" list="srcList" value="'+esc(ed.source||'')+'" placeholder="e.g. June 2025 Regents"><datalist id="srcList">'+uniq('source').map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label><label><span class="lbl">Month</span><select id="e-mo"><option value="">—</option>'+['01','06','08'].concat(ed.month&&['01','06','08'].indexOf(ed.month)<0?[ed.month]:[]).map(function(m){return '<option value="'+m+'"'+(ed.month===m?' selected':'')+'>'+m+' · '+monthName(m)+'</option>';}).join('')+'</select></label><label><span class="lbl">Year</span><input type="number" id="e-yr" min="1990" max="2099" value="'+esc(ed.year||'')+'" placeholder="2026"></label><label><span class="lbl">Question #</span><input type="number" id="e-qn" min="1" max="50" value="'+esc(ed.qnum||'')+'"></label><div style="align-self:end"><button type="button" class="small" id="e-fromref">Fill from reference</button></div></div>'+
    '<div class="row4 xfields" id="e-xf">'+xfHtml(ed)+'</div></details>'+
    '<p class="err" id="e-err"></p><div id="e-confirm" class="confirm-bar" role="alert" hidden></div><div class="dlg-actions"><span class="hint"><kbd>Ctrl</kbd>+<kbd>Enter</kbd> saves</span><span class="spacer"></span><button id="e-cancel">Cancel</button>'+(edIsNew?'<button id="e-more">Save &amp; add another</button>':'')+'<button class="primary" id="e-save">Save</button></div></div></div>';
  wireRich($('#modal'));wireXF();
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
function edMoreOpen(q){return !!(q.nyStd||Object.keys(q.extra||{}).length||q.topic||q.part||q.subtopic||q.cluster||q.notes||q.ref||q.source||q.month||q.year||q.qnum||coursesOf(q).some(function(c){return c!==state.course;})||(q.bank&&q.bank!=='My questions'));}
/* Closing the editor never throws away typing without asking. */
var edSnap='',edReturn=null;
function requestClose(){collect();if(JSON.stringify(ed)===edSnap){closeEditor();return;}
  var c=$('#e-confirm');c.innerHTML='<span>You have changes that aren’t saved.</span><span class="spacer"></span><button type="button" id="e-keep">Keep editing</button><button type="button" class="danger" id="e-discard">Discard changes</button>';c.hidden=false;
  $('#e-keep').onclick=hideDiscard;$('#e-discard').onclick=function(){closeEditor();};$('#e-keep').focus();}
function hideDiscard(){var c=$('#e-confirm');c.hidden=true;c.innerHTML='';$('#e-text').focus();}
function collect(){
  if(!ed)return;
  ed.html=$('#e-text').innerHTML;ed.bank=$('#e-bank').value;ed.topic=$('#e-topic').value;ed.points=num($('#e-pts').value,1);ed.part=$('#e-part').value;ed.standard=$('#e-std').value;setCourses(ed,$$('#e-courses input:checked').map(function(x){return x.value;}));ed.unit=$('#e-unit').value;ed.section=$('#e-sec').value;ed.subtopic=$('#e-sub').value;ed.cluster=$('#e-cl').value;ed.month=$('#e-mo').value;ed.source=$('#e-src').value;ed.year=$('#e-yr').value;ed.qnum=$('#e-qn').value;ed.notes=$('#e-notes').value;ed.ref=$('#e-ref').value;
  var ny=$('#e-ny');if(ny)ed.nyStd=ny.value;var vs=$('#e-vis');if(vs){if(vs.value==='public')ed.visibility='public';else delete ed.visibility;}var x={};Object.keys(ed.extra||{}).forEach(function(k){if(!fieldById(k))x[k]=ed.extra[k];});$$('[data-xf]').forEach(function(el){if(el.value.trim())x[el.dataset.xf]=el.value.trim();});ed.extra=x;
  if(isMC(ed.type))$$('[data-ct]').forEach(function(el){ed.choices[+el.dataset.ct]=el.innerHTML;});
  var a=$('#e-ans');if(a)ed.answer=a.value;
  var l=$('#e-lines');if(l){var lv=parseInt(l.value,10);ed.lines=Math.max(0,Math.min(40,isNaN(lv)?1:lv));}
  var sp=$('#e-space');if(sp)ed.space=Math.max(0,Math.min(9,num(sp.value,3)));
  var aa=$('input[name=area]:checked');if(aa)ed.answerArea=aa.value;
}
function drawSpec(){
  var sp=$('#e-spec'),h='';
  if(isMC(ed.type)){
    h='<span class="lbl">Answer choices <span class="hint" style="font-weight:400">— click the circle next to the correct one</span></span>'+symbar()+'<div id="chs">'+ed.choices.map(function(c,i){return '<div class="chrow'+(i===ed.answer?' correct':'')+'"><input type="radio" name="corr" data-ci="'+i+'"'+(i===ed.answer?' checked':'')+' aria-label="Correct answer '+LETTERS[i]+'"><span class="letter">'+LETTERS[i]+'.</span><div class="rich" contenteditable="true" data-ct="'+i+'" data-ph="Choice '+LETTERS[i]+'">'+(c||'')+'</div><button class="small ghost" data-cr="'+i+'" title="Remove choice"'+(ed.choices.length<=2?' disabled':'')+'>✕</button></div>';}).join('')+'</div>'+(ed.choices.length<8?'<button class="small" id="addCh">+ Add choice</button>':'')+'<div class="checks" style="margin-top:12px"><label><input type="checkbox" id="e-inimg"'+(ed.inImage?' checked':'')+'><span>The choices are part of the question picture<small>They won’t be printed again or shuffled. Keep the labels above matching the picture, like (1) (2) (3) (4).</small></span></label><label><input type="checkbox" id="e-lock"'+(ed.lockChoices?' checked':'')+'><span>Keep these choices in this order<small>For choices like “1, 2, 3, 4” or “I and II”. “All/None of the above” always stays last automatically.</small></span></label></div>'+(ed.type==='bm'?'<p class="hint" style="margin:10px 0 0">Bimodal: prints with these choices, or as an open question without them. Choose on Set up › Spacing.</p><label style="margin-top:12px"><span class="lbl">Space for the student’s work</span><span style="display:flex;gap:6px;align-items:center"><input type="number" id="e-space" min="0.5" max="9" step="0.25" value="'+esc(ed.space||2)+'" style="width:80px"> inches</span></label>':'');
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
  var out={id:ed.id,part:(ed.part||'').trim(),type:ed.type,bank:(ed.bank||'').trim()||'My questions',topic:(ed.topic||'').trim(),standard:(ed.standard||'').trim(),ref:(ed.ref||'').trim(),courses:coursesOf(ed).length?coursesOf(ed).slice():[state.course],unit:(ed.unit||'').trim(),section:(ed.section||'').trim(),notes:(ed.notes||'').trim(),subtopic:(ed.subtopic||'').trim(),cluster:(ed.cluster||'').trim(),month:ed.month||'',source:(ed.source||'').trim(),nyStd:(ed.nyStd||'').trim(),searchText:ed.searchText||'',year:ed.year?parseInt(ed.year,10)||'':'',qnum:ed.qnum?parseInt(ed.qnum,10)||'':'',points:num(ed.points,1),html:html};
  if(out.qnum&&(out.qnum<1||out.qnum>50)){err.textContent='Question # should be between 1 and 50.';return;}
  if(isMC(ed.type)){
    var ch=[],ans=-1;ed.choices.forEach(function(c,i){var s=sanitize(c||'');if(!isBlank(s)){if(i===ed.answer)ans=ch.length;ch.push(s);}});
    if(ch.length<2){err.textContent='Add at least two answer choices.';return;}
    if(ans<0){err.textContent='Click the circle next to the correct answer.';return;}
    out.choices=ch;out.answer=ans;out.lockChoices=!!ed.lockChoices;if(ed.inImage){out.inImage=true;out.lockChoices=true;}if(ed.type==='bm')out.space=Math.max(.5,Math.min(9,num(ed.space,2)));
  }else if(ed.type==='tf'){if(ed.answer!=='T'&&ed.answer!=='F'){err.textContent='Choose True or False as the correct answer.';return;}out.answer=ed.answer;}
  else{out.answer=(ed.answer||'').trim();var lv2=parseInt(ed.lines,10);out.lines=Math.max(0,Math.min(40,isNaN(lv2)?(ed.type==='sa'?1:8):lv2));if(ed.type==='es'){out.answerArea=ed.answerArea||'lines';out.space=num(ed.space,3);}}
  if(ed.extra&&Object.keys(ed.extra).length)out.extra=JSON.parse(JSON.stringify(ed.extra));
  if(ed.visibility==='public'&&!ed.owner)out.visibility='public';if(ed.origin)out.origin=ed.origin;
  if(ed.owner){out.owner=ed.owner;out.ownerName=ed.ownerName||'';if(ed.canEdit)out.canEdit=true;if(ed.changedBy)out.changedBy=ed.changedBy;} // stays the owner's; sync sends the change to them
  var existing=byId(out.id);
  setCourses(out,out.courses);
  if(existing)state.questions[state.questions.indexOf(existing)]=out;else{state.questions.push(out);if(inCourse(out,state.course))state.selected.push(out.id);}
  if(!inCourse(out,state.course)){state.selected=state.selected.filter(function(x){return x!==out.id;});toast('Moved to '+out.courses.join(', ')+'.');}
  lastNew={type:out.type,unit:out.unit,section:out.section,bank:out.bank,topic:out.topic,standard:out.standard,points:out.points};
  changed();
  if(another){closeEditor(true);openEditor(null);toast('Saved. It’s on the test too.');}
  else{closeEditor();if(!existing)toast('Saved and added to the test.');}
}
function closeEditor(keep){$('#modal').innerHTML='';lastRich=null;if(!keep){ed=null;render();var b=edReturn&&$('[data-edit="'+edReturn+'"]');if(b)b.focus();}}

/* ================= build tab ================= */
function renderBuild(){_renderBuild();showPlace();}
function _renderBuild(){
  var s=state.settings,main=$('#main');
  function cb(key,label,small){return '<label><input type="checkbox" data-set="'+key+'"'+(s[key]?' checked':'')+'><span>'+label+(small?'<small>'+small+'</small>':'')+'</span></label>';}
  var banks=uniq('bank');
  var dt=docType(),exam=isExamDoc(),T=DOC_TYPES[dt].toLowerCase();
  function tf(key,label,ph,w){return '<label'+(w?' style="max-width:'+w+'"':'')+'><span class="lbl">'+label+'</span><input type="text" data-set="'+key+'" value="'+esc(s[key])+'"'+(ph?' placeholder="'+esc(ph)+'"':'')+'></label>';}
  function ta(key,label,ph,rows,hint){return '<label><span class="lbl">'+label+(hint?' <span class="hint" style="font-weight:400">— '+hint+'</span>':'')+'</span><textarea data-set="'+key+'" rows="'+(rows||2)+'"'+(ph?' placeholder="'+esc(ph)+'"':'')+'>'+esc(s[key])+'</textarea></label>';}
  var calcSel='<label><span class="lbl">Calculator</span><select data-set="calc">'+[['','(don’t show)'],['Desmos','Desmos'],['TI-84','TI-84'],['No calculator','No calculator'],['Scientific calculator','Scientific calculator'],['other','Other…']].map(function(o){return '<option value="'+esc(o[0])+'"'+(s.calc===o[0]?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select>'+(s.calc==='other'?'<input type="text" data-set="calcOther" value="'+esc(s.calcOther)+'" placeholder="e.g. TI-30XS" style="margin-top:6px;width:100%">':'')+'</label>';
  var timeSel='<label><span class="lbl">Time accommodation <span class="hint" style="font-weight:400">— printed on every copy</span></span><select data-set="time">'+[['','(don’t show)'],['1.5','1.5× extended time'],['2','2.0× extended time'],['min','Number of minutes…']].map(function(o){return '<option value="'+o[0]+'"'+(s.time===o[0]?' selected':'')+'>'+esc(o[1])+'</option>';}).join('')+'</select>'+(s.time==='min'?'<span style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="number" data-set="timeMin" min="1" max="600" value="'+esc(s.timeMin)+'" style="width:90px"> minutes</span>':'')+'</label>';
  var details='';
  if(exam)details=
    '<div class="row3">'+tf('quarter','Quarter #','1')+tf('unitNum','Unit #','3')+'</div>'+
    tf('topic','Unit title <span class="hint" style="font-weight:400">— right side, in italics</span>','e.g. Parallel & Perpendicular Lines')+
    tf('title','Title line','auto: '+autoTitle())+
    '<div class="row">'+tf('teacher','Teacher','e.g. Ms. Candalino')+calcSel+'</div>'+
    ta('instructions','Instructions','optional',2,'printed above Part I');
  else if(dt==='review')details=
    '<div class="row3">'+tf('unitNum','Unit #','3')+'</div>'+
    tf('title','Title','auto: '+autoTitle())+
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
    '<p class="hint">Mark each question as Warm Up, Example or Practice under Set up › Questions.</p>';
  main.innerHTML='<div class="bgrid"><div class="bleft"><div class="card" data-show="setup:doc"><h2>Document</h2><div class="doctypes">'+Object.keys(DOC_TYPES).map(function(k){return '<button type="button" data-doctype="'+k+'" class="'+(k===dt?'on':'')+'">'+DOC_TYPES[k]+'</button>';}).join('')+'</div><div class="fields">'+
    '<label><span class="lbl">Course name <span class="hint" style="font-weight:400">— centered above the bar on every page</span></span><input type="text" data-set="headerText" value="'+esc(s.headerText)+'" placeholder="'+esc(state.course)+'"></label>'+
    details+
    '</div></div>'+
    '<div class="card" data-show="setup:spacing"><h2>Spacing</h2>'+spacingSection()+'<div class="fields sp-bm">'+'<label><span class="lbl">Bimodal questions</span><select data-set="bmMode"><option value="with"'+(s.bmMode!=='without'?' selected':'')+'>Print with the answer choices</option><option value="without"'+(s.bmMode==='without'?' selected':'')+'>Print without choices (open-ended)</option></select><span class="hint">Switch single questions under Set up › Questions.</span></label>'+'</div></div>'+
    '<div class="card" data-show="setup:acc"><h2>Accommodations</h2>'+(exam?'<div class="fields acc-time">'+timeSel+'</div>':'')+accSection()+'</div>'+
    '<div class="card" id="pageStyle" data-show="setup:page"><h2>Page style</h2><div class="fields">'+
    '<div class="row"><label><span class="lbl">Font</span><select data-set="font">'+Object.keys(FONTS).map(function(f){return '<option value="'+esc(f)+'"'+(s.font===f?' selected':'')+' style="font-family:'+esc(FONTS[f])+'">'+esc(f)+'</option>';}).join('')+'</select></label><label><span class="lbl">Size</span><select data-set="fontSize">'+[10,10.5,11,11.5,12,13,14].map(function(z){return '<option value="'+z+'"'+(num(s.fontSize,12)==z?' selected':'')+'>'+z+' pt</option>';}).join('')+'</select></label></div>'+
    '<label><span class="lbl">Answer choice labels</span><select data-set="labels"><option value="lowerdot"'+(s.labels==='lowerdot'?' selected':'')+'>a.  b.  c.  d.</option><option value="upper"'+(s.labels==='upper'?' selected':'')+'>A.  B.  C.  D.</option><option value="lower"'+(s.labels==='lower'?' selected':'')+'>a)  b)  c)  d)</option><option value="num"'+(s.labels==='num'?' selected':'')+'>(1)  (2)  (3)  (4)  — Regents style</option></select></label>'+
    '</div>'+
    '<h3>Layout</h3><div class="checks">'+
    (exam?cb('group','Group into parts','Part I, Part II… with directions and totals like [14].')+cb('computeBox','“Use this space for computations.” box','At the start of each multiple-choice part.')+cb('showCredits','Show credits like [2] under each open-response question')+cb('scoreBox','Score box at the end','Shows the total, like  /33. Bonus questions don’t count.'):'')+
    (dt==='review'?cb('showRef','Show the reference under each question','Source and exam, like “Regents June 2024 #12”, in small gray type.'):'')+
    cb('nameLine','Name and date line')+
    (exam?cb('showPoints','Show points next to each question')+cb('blanks','Answer blank before each number','For multiple choice and true/false.'):'')+
    cb('keyStd','Show unit and standards on the answer key')+cb('keyNotes','Show my notes on the answer key','Never on the student copies.')+'</div></div>'+
    '<div class="card" data-show="setup:versions"><h2>Versions</h2><div class="fields">'+'<div class="row"><label><span class="lbl">Versions</span><select data-set="versions">'+[1,2,3,4,5,6,7,8].map(function(n){return '<option value="'+n+'"'+(n==s.versions?' selected':'')+'>'+n+(n===1?' (no scrambling)':' — A to '+LETTERS[n-1])+'</option>';}).join('')+'</select></label><span></span></div>'+'</div>'+
    '<h3>Scrambling</h3><div class="checks">'+cb('shuffleQ','Shuffle question order',exam?'Within each part.':'Within each section.')+cb('shuffleC','Shuffle answer choices','“All/None of the above” stays last.')+cb('keepA','Keep Version A in the original order','Handy as your master copy.')+(nVersions()>1?cb('perVersion','Print each version separately','Page numbers start at 1 and the first-page header prints on each version.'):'')+'</div></div>'+
'<div class="card savedcard" id="savedCard" data-show="print:saved"></div><div class="card" data-show="setup:questions"><h2>Questions on this '+T+'</h2><div class="stat"><div><b id="stN">'+state.selected.length+'</b>questions</div><div><b id="stP">'+totalPts()+'</b>points</div></div>'+
    '<div class="sel-tools"><label>Sort <select id="selSort"'+(state.selected.length>1?'':' disabled')+'><option value="">Choose…</option>'+SEL_SORTS.map(function(o){return '<option value="'+o[0]+'">'+esc(o[1])+'</option>';}).join('')+'</select></label><span class="hint">Drag ⠿ or type a number to move a question.</span></div>'+
    '<ul class="sel" id="selList"></ul>'+
    '<div class="pickrow"><span>Add</span><input type="number" id="pkN" min="1" max="500" value="'+esc(ui.pickN)+'"><span>random questions from</span>'+(banks.length>1?'<select id="pkB">'+opts(banks,ui.pickBank,'any bank')+'</select>':'')+unitSelect('pkU',ui.pickUnit,'any unit')+unitSelect('pkS',ui.pickSection,'any section','section')+'<select id="pkT">'+opts(uniq('topic'),ui.pickTopic,'any topic')+'</select><select id="pkY">'+typeOpts(ui.pickType,'any type')+'</select><button class="small" id="pkGo">Add</button><span class="spacer"></span><button class="small ghost" id="clr"'+(state.selected.length?'':' disabled')+'>Clear all</button></div>'+
    '<p class="note">Pick individual questions under 1 Pick questions. Questions print in this order unless you shuffle or group them.</p></div>'+
    (exam&&s.group?'<div class="card" data-show="setup:page"><h2>Part directions</h2><div><p class="note">Printed under each part heading. {credits} becomes “2 credits”, “2 or 3 credits”… from the questions in that part. The part total like [14] is added at the end.</p><div class="fields">'+[['short','Short-answer parts (1 credit each)'],['choice','Multiple-choice parts'],['open','Open-response parts']].map(function(p){return '<label><span class="lbl">'+p[1]+'</span><textarea rows="3" data-pdir="'+p[0]+'">'+esc(partDir(p[0]))+'</textarea></label>';}).join('')+'<div><button class="small ghost" id="pdirReset">Reset to the original wording</button></div></div></div></div>':'')+
    '</div><div class="bright" data-show="setup:* print:preview"><div class="card recap" id="recap" data-show="print:preview"></div><div class="card pvcard"><div class="pv-h"><h2>Preview</h2><label class="pv-ans"><input type="checkbox" id="showAns"'+(ui.showAns?' checked':'')+'>Show answers</label></div>'+
    '<div class="pvtop"><div class="vtabs" id="vtabs"></div><span class="spacer"></span><button class="small ghost" id="reshuf"'+(nVersions()>1?'':' disabled')+' title="Versions stay the same until you press this, so a key always matches copies you’ve already printed.">↻ New scramble</button></div>'+
    '<div class="paperwrap"><div class="sheet pt" id="paper"></div></div>'+
    '<div class="pv-go" data-show="setup:*"><button class="primary" id="toPrint">Review &amp; print <span aria-hidden="true">→</span></button></div>'+
    '<div class="printbar" data-show="print:preview"><div id="pbWarn" class="pb-warnrow"></div><span class="pb-sum" id="pbSum"></span><span class="hint" id="pbNone" hidden>Add questions to print.</span>'+(accom().on?'<button data-print="acc">Accommodated only</button>':'')+'<button data-print="tests">'+DOC_TYPES[dt]+(nVersions()>1?'s':'')+' only</button><button data-print="keys">Answer keys only</button><button class="primary" data-print="both">'+(outFmt()==='docx'||outFmt()==='tex'?'Download ':'Print ')+T+(nVersions()>1?'s':'')+' + answer keys</button>'+
    '<label class="fmtsel">Format <select id="fmtSel">'+[['pdf','PDF'],['docx','Word (.docx)'],['tex','LaTeX (.tex)'],['print','Print…']].map(function(o){return '<option value="'+o[0]+'"'+(outFmt()===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label></div>'+
    '<p class="note" id="fmtNote" data-show="print:preview" style="margin-bottom:0">'+fmtNote()+'</p></div>'+
    '</div></div>';
  $$('[data-set]',main).forEach(function(el){
    var k=el.dataset.set;
    var h=function(){s[k]=el.type==='checkbox'?el.checked:(k==='versions'?parseInt(el.value,10):k==='fontSize'?num(el.value,12):el.value);changed();if(k==='bmMode'){s.bmOverride={};drawSel();}if(k==='versions'||k==='calc'||k==='time'||k==='group'){if(ui.pv>=nVersions())ui.pv=0;renderBuild();}else{refreshAuto();drawPreviewSoon();}};
    if(el.type==='checkbox'||el.tagName==='SELECT')el.onchange=h;else el.oninput=h;
  });
  $$('[data-sp]',main).forEach(function(el){el.onchange=function(){var dt=docType(),sp=JSON.parse(JSON.stringify(s.spacing||{}));sp[dt]=sp[dt]||{};
    if(el.value==='')delete sp[dt][el.dataset.sp];else sp[dt][el.dataset.sp]=el.value;s.spacing=sp;changed();
    drawPreviewSoon();};});
  $$('[data-acc]',main).forEach(function(el){el.onchange=function(){var k=el.dataset.acc,v=el.type==='checkbox'?el.checked:(k==='perPage'||k==='version'?parseInt(el.value,10)||0:el.value);
    s.accom=Object.assign({},accom());s.accom[k]=v;changed();
    if(k==='on'){if(v)ui.pv='acc';renderBuild();var f=$('[data-acc="on"]');if(f)f.focus();}else{if(ui.pv!=='acc'){ui.pv='acc';saveUi();}drawPreview();drawPrintBar();}};});
  $$('[data-doctype]',main).forEach(function(b){b.onclick=function(){s.docType=b.dataset.doctype;changed();renderBuild();renderTabs();};});
  drawSel();
  $('#selSort').onchange=function(){var k=this.value;if(!k)return;var prev=sortSel(k);changed();renderBuild();renderTabs();
    toast('Sorted: '+SEL_SORTS.filter(function(o){return o[0]===k;})[0][1].toLowerCase()+'.',function(){state.selected=prev;changed();render();});};
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
  $('#toPrint').onclick=function(){go('print','preview');};
  $('#fmtSel').onchange=function(){ui.fmt=this.value;saveUi();renderBuild();var f=$('#fmtSel');if(f)f.focus();};
  $('#reshuf').onclick=function(){var b=this;
    if(!b.classList.contains('danger')){b.classList.add('danger');b.textContent='Make new versions?';setTimeout(function(){if(document.body.contains(b)){b.classList.remove('danger');b.textContent='↻ New scramble';}},4000);return;}
    var prev=s.seed;s.seed=Math.floor(Math.random()*2147483647);changed();b.classList.remove('danger');b.textContent='↻ New scramble';drawPreview();
    toast('New versions made. Print new answer keys too.',function(){s.seed=prev;changed();drawPreview();});};
  $('#showAns').onchange=function(){ui.showAns=this.checked;saveUi();drawPreview();};
  drawPreview();drawPrintBar();drawSaved();
}
function spacingSection(){
  var dt=docType(),sp=spacing(),set=['es','sa','bm','gap'].some(function(k){return sp[k];});
  return '<div id="spaceFold"><div class="fields">'+
    '<p class="hint" style="margin:0">For this '+esc(DOC_TYPES[dt])+'; each document type keeps its own. Room to answer, by question type. <b>Each question’s own</b> uses the size set in each question’s editor.</p>'+
    '<div class="sp-grid">'+['es','sa','bm'].map(function(k){return '<label><span class="lbl">'+SPACE_LABELS[k]+'</span><select data-sp="'+k+'">'+SPACE_OPTS[k].map(function(o){return '<option value="'+o[0]+'"'+(String(sp[k]==null?'':sp[k])===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label>';}).join('')+'</div>'+
    '<div class="row"><label><span class="lbl">'+SPACE_LABELS.gap+'</span><select data-sp="gap">'+SPACE_OPTS.gap.map(function(o){return '<option value="'+o[0]+'"'+(String(sp.gap==null?'':sp.gap)===o[0]?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select></label><span></span></div>'+
    '</div></div>';
}
function accSection(){var a=accom(),n=nVersions(),dis=a.on?'':' disabled';
  function sel(k,label,opts,hint){return '<label><span class="lbl">'+label+'</span><select data-acc="'+k+'"'+dis+'>'+opts.map(function(o){return '<option value="'+o[0]+'"'+(String(a[k])===String(o[0])?' selected':'')+'>'+o[1]+'</option>';}).join('')+'</select>'+(hint?'<span class="hint">'+hint+'</span>':'')+'</label>';}
  return '<div id="accFold">'+
    '<div class="checks"><label><input type="checkbox" data-acc="on"'+(a.on?' checked':'')+'><span>Also print an accommodated copy<small>Same questions and answer order as its version, so that version’s answer key works for it. Nothing on the student’s copy says “accommodated”.</small></span></label></div>'+
    '<div class="fields acc-fields">'+
    '<div class="row">'+sel('font','Font',[['Atkinson Hyperlegible','Atkinson Hyperlegible'],['OpenDyslexic','OpenDyslexic'],['','Same as the test']])+sel('size','Text size',[['','Same as the test'],['l','Large (14 pt)'],['xl','Extra large (18 pt)']])+'</div>'+
    '<div class="row">'+sel('perPage','Questions per page',[[0,'As many as fit'],[1,'1 per page'],[2,'2 per page']],docType()==='lesson'?'Lessons keep their own layout.':'')+(n>1?sel('version','Make it from',Array.apply(null,Array(n)).map(function(_,v){return [v,'Version '+LETTERS[v]];})):'<span></span>')+'</div>'+
    '<div class="checks"><label><input type="checkbox" data-acc="spacing"'+(a.spacing?' checked':'')+dis+'><span>Extra spacing<small>More space between lines, answer choices and questions.</small></span></label></div>'+
    '</div></div>';}
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
  if(!qs.length){ul.innerHTML='<li class="sel-empty">No questions yet. <button class="small" id="selPick">Go to 1 Pick questions</button> or add random ones below.</li>';$('#selPick').onclick=function(){go('pick');};return;}
  var G=selGroups(),total=qs.length,n=0,heads=G.length>1;
  ul.innerHTML=G.map(function(g,gi){var pts=g.qs.reduce(function(a,q){return a+num(q.points,1);},0);
    return (heads?'<li class="sel-h" role="presentation"><b>'+esc(g.label)+'</b> <span>'+plural(g.qs.length,'question')+' · '+plural(pts,'point')+'</span></li>':'')+g.qs.map(function(q){n++;var i=n-1;
    return '<li data-sq="'+q.id+'" data-g="'+gi+'"><button class="ghost drag" data-drag="'+q.id+'" title="Drag to move (or press ↑ ↓)" aria-label="Move question '+n+'">⠿</button><input class="selnum" data-num="'+q.id+'" value="'+n+'" inputmode="numeric" aria-label="Question '+n+': type a new number to move it" title="Type a number and press Enter to move it there"><span class="t" title="'+esc(plainQ(q).t)+'"><span class="badge '+q.type+'" style="margin-right:6px">'+{mc:'MC',bm:'Bimodal',tf:'T/F',sa:'SA',es:'Open'}[q.type]+'</span>'+esc(plainQ(q).t)+(q.topic?'<small>'+esc(q.topic)+'</small>':'')+(dt==='lesson'&&roleOf(q)==='example'?'<input type="text" class="exc" data-exc="'+q.id+'" value="'+esc((st.concepts||{})[q.id]||'')+'" placeholder="Example concept, e.g. SAS">':'')+'</span><span>'+(dt==='lesson'?'<select class="rolesel" data-role="'+q.id+'" title="Where this goes in the lesson"><option value="warmup"'+(roleOf(q)==='warmup'?' selected':'')+'>Warm Up</option><option value="example"'+(roleOf(q)==='example'?' selected':'')+'>Example</option><option value="practice"'+(roleOf(q)==='practice'?' selected':'')+'>Practice</option></select>':'')+(isExamDoc()?'<button class="ghost bmt'+(isBonus(q)?' on':'')+'" data-bonus="'+q.id+'" title="Bonus questions print at the end and don’t count toward the score">'+(isBonus(q)?'bonus ✓':'bonus')+'</button>':'')+(q.type==='bm'?'<button class="ghost bmt" data-bm="'+q.id+'" title="Switch between printing with and without answer choices">'+(bmChoices(q)?'with choices':'no choices')+'</button>':'')+'<button class="ghost" data-rm="'+q.id+'" title="Take off test">✕</button></span></li>';}).join('');}).join('');
  function after(){changed();$('#stN').textContent=state.selected.length;$('#stP').textContent=totalPts();drawPrintBar();drawSel();drawPreview();renderTabs();}
  wireOrder(ul,G,after);
  $$('[data-rm]',ul).forEach(function(b){b.onclick=function(){state.selected=state.selected.filter(function(x){return x!==b.dataset.rm;});after();};});
  $$('[data-role]',ul).forEach(function(x){x.onchange=function(){st.roles=Object.assign({},st.roles);st.roles[x.dataset.role]=x.value;after();};});
  $$('[data-exc]',ul).forEach(function(x){x.oninput=function(){st.concepts=Object.assign({},st.concepts);st.concepts[x.dataset.exc]=x.value;changed();drawPreviewSoon();};});
  $$('[data-bonus]',ul).forEach(function(b){b.onclick=function(){st.bonus=Object.assign({},st.bonus);if(st.bonus[b.dataset.bonus])delete st.bonus[b.dataset.bonus];else st.bonus[b.dataset.bonus]=true;after();};});
  $$('[data-bm]',ul).forEach(function(b){b.onclick=function(){var s=state.settings,q=selQ(b.dataset.bm);s.bmOverride=s.bmOverride||{};var next=bmChoices(q)?'without':'with';if(next===s.bmMode)delete s.bmOverride[q.id];else s.bmOverride[q.id]=next;after();};});
}
/* 2 Set up › Questions lists the questions the way they print (before any shuffling): a Review prints open response, then
   multiple choice; a Lesson Warm Up, Examples, Practice; a grouped Test its parts; bonus questions last. A question moves
   only inside its own group (it would print back there anyway): drag the ⠿ handle, press ↑ ↓ on it, or type a number. */
function selGroups(){
  var dt=docType(),qs=selectedQs(),main=qs.filter(function(q){return !isBonus(q);}),bon=qs.filter(isBonus),out=[];
  var add=function(key,label,g){if(g.length)out.push({key:key,label:label,qs:g});};
  if(dt==='review')[['open','Open response'],['mc','Multiple choice']].forEach(function(k){add(k[0],k[1],main.filter(function(q){return reviewKind(q)===k[0];}));});
  else if(dt==='lesson')[['warmup','Warm Up'],['example','Examples'],['practice','Practice']].forEach(function(k){add(k[0],k[1],main.filter(function(q){return roleOf(q)===k[0];}));});
  else if(state.settings.group){
    var explicit=main.length&&main.every(function(q){return q.part;}),keys=[];
    main.forEach(function(q){var k=partKeyOf(q,explicit);if(keys.indexOf(k)<0)keys.push(k);});
    if(explicit)keys.sort(function(a,b){return romanVal(a)-romanVal(b);});else keys.sort();
    keys.forEach(function(k,i){add(k,explicit?k:'Part '+ROMAN[i],main.filter(function(q){return partKeyOf(q,explicit)===k;}));});
  }else add('','',main);
  add('bonus','Bonus',bon);
  return out;
}
// puts question id at place `to` (0-based) inside group gi and saves the new order; the old order can be undone
function moveSel(G,gi,id,to){
  var g=G[gi].qs.map(function(q){return q.id;}),from=g.indexOf(id);
  to=Math.max(0,Math.min(g.length-1,to));if(from<0||from===to)return false;
  g.splice(from,1);g.splice(to,0,id);
  var ids=[];G.forEach(function(x,k){ids=ids.concat(k===gi?g:x.qs.map(function(q){return q.id;}));});
  var prev=state.selected.slice();state.selected=ids.concat(prev.filter(function(x){return ids.indexOf(x)<0;}));
  return prev;
}
function wireOrder(ul,G,after){
  var start=[],k=0;G.forEach(function(g){start.push(k);k+=g.qs.length;});
  var moved=function(prev,id,focus,note){if(!prev)return;after();toast((note||'')+'Moved to number '+(selGroups().reduce(function(a,g){return a.concat(g.qs.map(function(q){return q.id;}));},[]).indexOf(id)+1)+'.',function(){state.selected=prev;after();});
    var f=$('[data-'+focus+'="'+id+'"]',$('#selList'));if(f)f.focus();};
  // the number box: Enter (or leaving it) moves the question there, within its group
  $$('[data-num]',ul).forEach(function(inp){var li=inp.closest('li'),gi=+li.dataset.g,id=inp.dataset.num,was=inp.value;
    var go2=function(){var t=parseInt(inp.value,10);if(!t||String(t)===was){inp.value=was;return;}
      var g=G[gi],lo=start[gi]+1,hi=start[gi]+g.qs.length,c=Math.max(lo,Math.min(hi,t));
      var prev=moveSel(G,gi,id,c-lo);
      var note=c!==t?(g.label||'These questions')+' are numbers '+lo+'–'+hi+'. ':'';
      if(prev)moved(prev,id,'num',note);else{inp.value=was;if(note)toast(note+'It’s already number '+c+'.');}};
    inp.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();go2();}else if(e.key==='Escape'){inp.value=was;inp.blur();}};
    inp.onchange=go2;inp.onfocus=function(){inp.select();};});
  // the handle: ↑ ↓ move one place; drag moves anywhere in the same group
  $$('[data-drag]',ul).forEach(function(h){var li=h.closest('li'),gi=+li.dataset.g,id=h.dataset.drag;
    h.onkeydown=function(e){if(e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();
      var at=G[gi].qs.map(function(q){return q.id;}).indexOf(id);moved(moveSel(G,gi,id,at+(e.key==='ArrowUp'?-1:1)),id,'drag');};
    h.onmousedown=function(){li.draggable=true;};h.onmouseup=function(){li.draggable=false;};});
  var dragId=null,dragG=-1;
  $$('li[data-sq]',ul).forEach(function(li){
    li.ondragstart=function(e){dragId=li.dataset.sq;dragG=+li.dataset.g;li.classList.add('dragging');e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',dragId);}catch(x){}};
    li.ondragend=function(){li.draggable=false;li.classList.remove('dragging');$$('.drop-a,.drop-b',ul).forEach(function(x){x.classList.remove('drop-a','drop-b');});dragId=null;};
    li.ondragover=function(e){if(!dragId||+li.dataset.g!==dragG)return;e.preventDefault();var r=li.getBoundingClientRect(),below=e.clientY>r.top+r.height/2;
      $$('.drop-a,.drop-b',ul).forEach(function(x){x.classList.remove('drop-a','drop-b');});li.classList.add(below?'drop-b':'drop-a');};
    li.ondrop=function(e){if(!dragId||+li.dataset.g!==dragG)return;e.preventDefault();
      var ids=G[dragG].qs.map(function(q){return q.id;}),from=ids.indexOf(dragId),to=ids.indexOf(li.dataset.sq)+(li.classList.contains('drop-b')?1:0);if(from<to)to--;
      var id=dragId;moved(moveSel(G,dragG,id,to),id,'drag');};
  });
}
// Sort (2 Set up › Questions): reorders the list once; ↑ ↓ / drag still work after it, Undo puts the old order back
var SEL_SORTS=[['type','Type (multiple choice first)'],['unit','Unit, then section'],['std','Standard'],['exam','Exam date, oldest first'],['examnew','Exam date, newest first'],['rev','Reverse the order']];
function sortSel(kind){
  var qs=selectedQs(),prev=state.selected.slice(),out;
  if(kind==='rev')out=qs.slice().reverse();
  else if(kind==='type')out=qs.slice().sort(function(a,b){return TYPE_ORDER.indexOf(a.type)-TYPE_ORDER.indexOf(b.type);});
  else{var keep=ui.sort;ui.sort=kind;out=sortList(qs);ui.sort=keep;}
  var ids=out.map(function(q){return q.id;});
  state.selected=ids.concat(prev.filter(function(x){return ids.indexOf(x)<0;}));
  return prev;
}
function noAnswer(){return selectedQs().filter(function(q){return (isMC(q.type)&&!q.inImage&&(q.answer<0||q.answer>=q.choices.length))||(q.inImage&&q.answer<0)||(q.type==='tf'&&q.answer!=='T'&&q.answer!=='F');});}
function printCheck(){var m=noAnswer();if(!m.length)return '';return '<span class="pb-warn" role="status"><b>'+m.length+' question'+(m.length>1?'s have':' has')+' no correct answer,</b> so the answer key will be blank there. <button type="button" class="small" id="fixAns" data-fix="'+m[0].id+'">Fix'+(m.length>1?' the first one':'')+'</button></span>';}
function drawPrintBar(){var b=$('#pbSum');if(!b)return;var svs=$('#svStatus');if(svs&&savedById(state.settings.savedId)){var c=savedById(state.settings.savedId);svs.innerHTML='<b>'+esc(c.name)+'</b> · saved '+fmtDay(c.savedAt)+(c.printedAt?' · printed '+fmtDay(c.printedAt):'')+(isDirty()?' · <span class="sv-dirty">changed since</span>':'');}b.textContent=printSummary();var w=$('#pbWarn');w.innerHTML=printCheck();var f=$('#fixAns');if(f)f.onclick=function(){var q=byId(f.dataset.fix);if(q)openEditor(q);else toast('That question was deleted from the bank. Use the latest versions to take it off the test.');};
  var none=!state.selected.length;$$('[data-print]').forEach(function(x){x.disabled=none;});var nm=$('#pbNone');if(nm)nm.hidden=!none;drawRecap();}
/* 3 Print is the finish line: what will come out, each line a link to its setting, the warnings, and a receipt once printed. */
function whenPrinted(iso){var t=Date.parse(iso);if(isNaN(t))return '';var d=new Date(t),today=new Date().toDateString()===d.toDateString();
  return (today?'today at ':fmtDay(iso)+' at ')+d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});}
function recapRows(){
  var s=state.settings,n=nVersions(),q=state.selected.length,p=totalPts(),dt=docType(),a=accom(),sp=spacing(),cur=savedById(s.savedId),f=outFmt();
  var vers=n===1?'1 version (no scrambling)':n+' versions ('+LETTERS.slice(0,n).split('').join(', ')+')'+([s.shuffleQ&&'questions shuffled',s.shuffleC&&'choices shuffled',s.keepA&&'A in the original order'].filter(Boolean).map(function(x){return ', '+x;}).join(''));
  var spc=['es','sa','bm','gap'].filter(function(k){return sp[k];}).map(function(k){var o=SPACE_OPTS[k].filter(function(x){return x[0]===String(sp[k]);})[0];return SPACE_LABELS[k]+': '+(o?o[1]:sp[k]);});
  var acc=!accOn()?'Off':'From Version '+LETTERS[accVersion()]+', '+(a.font||s.font||'same font')+' '+accSize()+' pt'+(a.perPage?', '+a.perPage+' per page':'')+(a.spacing?', extra spacing':'');
  var key=(n===1?'1 answer key':n+' answer keys')+(s.keyStd?', with unit and standards':'')+(s.keyNotes?', with your notes':'');
  return [
    ['setup','doc','Document',DOC_TYPES[dt]+' · “'+docTitle()+'”'],
    ['setup','questions','Questions',plural(q,'question')+' · '+plural(p,'point')],
    ['setup','versions','Versions',vers],
    ['setup','versions','Answer keys',key],
    ['setup','acc','Accommodated copy',acc],
    ['setup','spacing','Spacing',spc.length?spc.join(' · '):'Each question’s own'],
    ['setup','page','Paper',(s.font||'Century Schoolbook')+', '+num(s.fontSize,12)+' pt · choices '+[0,1,2,3].map(letterOf).join(' ')],
    ['print','preview','Format',{pdf:'PDF (print window → Save as PDF)',docx:'Word file (.docx)',tex:'LaTeX (.zip)',print:'Print'}[f]||f],
    ['print','saved','Saved',cur?'“'+cur.name+'”'+(cur.printedAt?' · printed '+whenPrinted(cur.printedAt):'')+(isDirty()?' · changed since':''):'Not yet. Printing saves it for you.']];
}
function drawRecap(){
  var box=$('#recap');if(!box)return;
  if(!state.selected.length){box.innerHTML='<h2>Nothing to print yet</h2><p class="note" style="margin:0 0 12px">Pick questions for this '+esc(DOC_TYPES[docType()].toLowerCase())+' first.</p><button class="primary" id="rcPick">Go to 1 Pick questions</button>';$('#rcPick').onclick=function(){go('pick');};return;}
  var cur=savedById(state.settings.savedId),fresh=cur&&cur.printedAt&&Date.now()-Date.parse(cur.printedAt)<12*3600e3&&!isDirty();
  var warn=printCheck()+(backupStale()?'<span class="pb-warn" role="status"><b>'+esc(lastBackupText())+'</b> Keep a copy of your banks somewhere safe. <button type="button" class="small" id="rcBackup">Download backup</button></span>':'');
  box.innerHTML=(fresh?'<p class="rc-done" role="status"><b>Printed '+esc(whenPrinted(cur.printedAt))+'</b> and saved as “'+esc(cur.name)+'”. You can print again any time; the versions and keys stay the same until you press New scramble.</p>':'')+
    '<h2>What will print</h2><dl class="rc-list">'+recapRows().map(function(r){return '<div><dt>'+esc(r[2])+'</dt><dd><button class="linkbtn" data-rc="'+r[0]+':'+r[1]+'" title="Change: '+esc(r[2])+'">'+esc(r[3])+'</button></dd></div>';}).join('')+'</dl>'+
    (warn?'<div class="rc-warn">'+warn+'</div>':'');
  $$('[data-rc]',box).forEach(function(b){b.onclick=function(){var x=b.dataset.rc.split(':');if(x[0]==='print'&&x[1]==='preview'){var f=$('#fmtSel');if(f){f.focus();f.scrollIntoView({block:'center'});}return;}go(x[0],x[1]);};});
  var fx=$('#fixAns',box);if(fx)fx.onclick=function(){var q=byId(fx.dataset.fix);if(q)openEditor(q);};
  var bk=$('#rcBackup');if(bk)bk.onclick=function(){downloadBackup();drawRecap();toast('Backup downloaded. Keep it on your NAS or Google Drive.');};
}
function printSummary(){var n=nVersions(),q=state.selected.length,p=totalPts();return n+' version'+(n===1?'':'s')+(accOn()?' + accommodated copy':'')+' · '+q+' question'+(q===1?'':'s')+' · '+p+' point'+(p===1?'':'s');}
var pvT;function drawPreviewSoon(){clearTimeout(pvT);pvT=setTimeout(drawPreview,250);}
var pvRO=window.ResizeObserver&&new ResizeObserver(function(){var p=$('#paper');if(p&&p.classList.contains('pv-pages'))pvFit(p);});
function drawPreview(){
  var n=nVersions(),acc=accom().on;if(ui.pv==='acc'&&!acc)ui.pv=0;if(ui.pv!=='acc'&&ui.pv>=n)ui.pv=0;var vt=$('#vtabs');if(!vt)return;if(pvRO&&$('.paperwrap'))pvRO.observe($('.paperwrap'));
  vt.innerHTML=(n>1?'<span class="hint" style="margin-right:4px">Version</span>'+Array.apply(null,Array(n)).map(function(_,v){return '<button class="'+(v===ui.pv?'on':'')+'" data-v="'+v+'">'+LETTERS[v]+'</button>';}).join(''):'')+
    (acc?'<button class="'+(ui.pv==='acc'?'on':'')+'" data-v="acc" title="The accommodated copy">Accommodated</button>':'');
  $$('[data-v]',vt).forEach(function(b){b.onclick=function(){ui.pv=b.dataset.v==='acc'?'acc':+b.dataset.v;saveUi();drawPreview();};});
  var isAcc=ui.pv==='acc',pv=isAcc?accVersion():ui.pv,items=buildVersion(pv),p=$('#paper');p.setAttribute('style',isAcc?accStyle():ptStyle());
  var cls='pt pt-classic pt-'+docType()+(isAcc?accClass():'');
  var pc=$('.pvcard'),pt=$('.pvtop');if(pt)pt.hidden=!items.length;if(pc)pc.hidden=!items.length&&placeOf()==='print'; // 3 Print's recap already says "Nothing to print yet"
  if(!items.length){p.className='sheet '+cls;p.innerHTML='<div class="pv-empty"><p>Your '+DOC_TYPES[docType()].toLowerCase()+' will appear here.</p><button class="small" id="pvPick">Pick questions</button></div>';$('#pvPick').onclick=function(){go('pick');};return;}
  p.className='pv-pages '+cls;
  drawSheets(p,isAcc?accHtml({answers:ui.showAns}):testHtml(items,ui.pv,{answers:ui.showAns}),pv);
}
/* The preview as letter-size pages. The document is laid out once, off screen, at its printed width (7.5 in); page breaks go
   where printing puts them (questions and part headings aren't split, "page break after" is kept), then each page shows its
   slice of that layout between the same header and footer the print margins get. */
var PT=96/72,pvJob=0;
function pvBlocks(root){
  var out=[],top=root.getBoundingClientRect().top;
  (function walk(el){Array.prototype.forEach.call(el.children,function(c){
    var cs=getComputedStyle(c);if(cs.display==='none'||/^table-column/.test(cs.display)||cs.position==='absolute'||cs.position==='fixed')return;
    var kids=Array.prototype.some.call(c.children,function(k){var d=getComputedStyle(k).display;return d!=='inline'&&d!=='inline-block'&&d!=='none';});
    if(cs.breakInside==='avoid'||c.tagName==='TR'||!kids){var r=c.getBoundingClientRect();
      if(r.height)out.push({top:r.top-top,bot:r.bottom-top,avoidAfter:cs.breakAfter==='avoid',avoidBefore:cs.breakBefore==='avoid',force:cs.breakAfter==='page'});}
    else walk(c);});})(root);
  return out;
}
function pvBreaks(b,cap1,cap){
  var segs=[],start=0,cap0=cap1,i=0;
  var cut=function(at){segs.push([start,at]);start=at;cap0=cap;};
  for(i=0;i<b.length;i++){
    if(i&&b[i-1].force&&b[i].top>start)cut(b[i].top);
    while(b[i].bot-start>cap0){
      if(b[i].top>start+1){var j=i;while(j>0&&(b[j-1].avoidAfter||b[j].avoidBefore)&&b[j-1].top>start+1)j--;cut(b[j].top);}
      else cut(start+cap0); // taller than a page: printing splits it too
    }
  }
  segs.push([start,Math.max(start,b.length?b[b.length-1].bot:0)]);
  return segs;
}
function drawSheets(p,html,v){
  var job=++pvJob,m=$('#pvMeasure');
  if(!m){m=document.createElement('div');m.id='pvMeasure';m.setAttribute('aria-hidden','true');document.body.appendChild(m);}
  m.className=p.className.replace('pv-pages','');m.setAttribute('style',p.getAttribute('style')||'');m.innerHTML=html;
  var build=function(){if(job!==pvJob)return;
    var hd=headers(),g=pageGeom(),t1=parseFloat(topFor(hd.first)),t2=parseFloat(topFor(hd.rest)),font=svgFont(),lf=docType()==='lesson'?lessonFootSvg():null;
    var segs=pvBreaks(pvBlocks(m),(792-t1-36)*PT,(792-t2-36)*PT),n=segs.length,wrap=p.parentNode,sc=wrap.scrollTop;
    p.innerHTML=segs.map(function(sg,k){var x=k?hd.rest:hd.first,tp=k?t2:t1,
      foot=!k?(isExamDoc()?'<span class="pv-fl" style="font:8pt '+font+';color:#777">v. '+(v+1)+'</span>':''):
        (lf?'<img class="pv-fl" src="'+svgUrl(lf)+'" style="width:'+lf.w+'pt;height:'+lf.h+'pt" alt="">':'')+'<span class="pv-fr" style="font:11pt '+font+'">'+(k+1)+'</span>';
      return '<div class="pv-page"><div class="pv-head" style="top:'+(tp-6-x.h)+'pt"><img src="'+svgUrl(x)+'" style="width:'+x.w+'pt;height:'+x.h+'pt" alt=""></div>'+
        '<div class="pv-win" style="top:'+tp+'pt;height:'+(sg[1]-sg[0])+'px"><div class="pv-flow" style="margin-top:'+(-sg[0])+'px">'+html+'</div></div>'+
        '<div class="pv-foot">'+foot+'</div></div><div class="pv-pn">Page '+(k+1)+' of '+n+'</div>';}).join('');
    p.dataset.pages=n;pvFit(p);wrap.scrollTop=sc;};
  build();
  // pictures and fonts can still be loading: lay it out again once they're in
  var wait=Array.prototype.filter.call(m.querySelectorAll('img'),function(i){return !i.complete;}).map(function(i){return new Promise(function(r){i.onload=i.onerror=r;});});
  if(wait.length||document.fonts.status!=='loaded')Promise.all(wait.concat([document.fonts.ready])).then(build);
}
// fit the 8.5-inch pages to the width of the preview card
function pvFit(p){var w=p.parentNode.clientWidth-44;p.style.zoom=Math.min(1,w/(8.5*96));}


/* ================= import / backup tab ================= */
// courses a bank (as seen from this course) is also in: on = every question, mixed = some
function bankPubHtml(b){if(!sharing())return '';var qs=cq().filter(function(q){return q.bank===b&&own(q);}),np=qs.filter(function(q){return q.visibility==='public';}).length;
  var regents=qs.filter(function(q){return q.ref;}).length>=qs.length*0.8;
  return np===qs.length?'<button class="small ghost" data-pub="'+esc(b)+'" data-to="private" title="Only you will see these questions again">Public · make private</button>':
    '<button class="small ghost" data-pub="'+esc(b)+'" data-to="public" title="'+(regents?'These look like Regents questions, which are fine to share. ':'')+'Everyone with an account on this site will see and use them. Don’t make purchased textbook banks public.">'+(np?'Partly public · make all public':'Make public')+'</button>';}
// colleagues' public banks, grouped by owner and bank name, with the courses you use them in
function sharedBanks(){var g={},out=[];state.questions.forEach(function(q){if(!q.owner||teamsOf(q).length)return;var k=q.owner+'\u0001'+q.bank;if(!g[k]){g[k]={owner:q.ownerName||'a colleague',bank:q.bank,qs:[]};out.push(g[k]);}g[k].qs.push(q);});
  return out.sort(function(a,b){return a.bank.localeCompare(b.bank)||a.owner.localeCompare(b.owner);});}
function sharedCardHtml(){if(!sharing())return '';var sb=sharedBanks();
  return '<div class="card" id="sharedCard"><h2>Shared with you</h2><p class="note" style="margin-top:0">Banks your colleagues made public. Tick the courses where you want to use them. Only the person who shared a bank can change its questions; <b>Copy to mine</b> makes your own copy of the bank (or of one question) that you can change.</p>'+
    (sb.length?'<ul class="banks">'+sb.map(function(x,i){return '<li><span>'+esc(x.bank)+' <small>· '+plural(x.qs.length,'question')+' · shared by '+esc(x.owner)+'</small></span><button class="small ghost" data-copybank="'+esc('sh:'+x.qs[0].owner+'|'+x.bank)+'" title="Your own copy of every question, to change as you like">Copy to mine</button><span class="sh-courses">'+state.courses.map(function(c){var n=x.qs.filter(function(q){return inCourse(q,c);}).length;return '<label><input type="checkbox" data-shuse="'+i+'" value="'+esc(c)+'"'+(n===x.qs.length?' checked':'')+(n&&n<x.qs.length?' data-mixed':'')+'> '+esc(c)+'</label>';}).join('')+'</span></li>';}).join('')+'</ul>':'<p class="hint">Nothing shared yet. When a colleague makes a bank public, it shows up here.</p>')+'</div>';}
function bankCounts(){var c={};cq().filter(own).forEach(function(q){c[q.bank]=(c[q.bank]||0)+1;});return c;}
function daysAgo(iso){var t=Date.parse(iso);return isNaN(t)?null:Math.floor((Date.now()-t)/864e5);}
function lastBackupText(){var n=daysAgo(ui.lastBackup);if(n==null)return 'No backup downloaded from this browser yet.';return 'Last backup: '+(n<1?'today':n===1?'yesterday':n+' days ago')+'.';}
function downloadBackup(){var d=new Date(),stamp=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');saveFile('ALittleCandleTestBuilder backup '+stamp+'.json',JSON.stringify({app:'test-builder',version:1,saved:d.toISOString(),state:state}),'application/json');ui.lastBackup=d.toISOString();saveUi();}
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
function renderIO(){_renderIO();showPlace();}
function _renderIO(){
  var main=$('#main'),bc=bankCounts(),bnames=Object.keys(bc).sort();
  main.innerHTML='<div class="place-cards">'+
  '<div class="card" data-show="io:backup"><h2>Backup</h2><p class="note" style="margin-top:0">Everything is saved in this browser on this computer. Download a backup now and then — it’s one file with all your banks, pictures and test settings, and it’s how you move your work to another computer or browser.</p>'+(state.questions.length?'<p class="last-bk'+(backupStale()?' stale':'')+'">'+esc(lastBackupText())+'</p>':'')+'<div class="actions"><button class="primary" id="bkOut"'+(state.questions.length?'':' disabled')+'>Download backup</button><span class="filebtn"><button type="button" tabindex="-1" aria-hidden="true">Restore a backup…</button><input type="file" id="bkIn" accept=".json,application/json" aria-label="Restore a backup"></span></div><div id="bkRes" class="result"></div></div>'+
  '<div data-show="io:banks">'+yourBanksCard(bnames,bc)+'</div>'+
  '<div data-show="bank:fields">'+fieldsCard()+'</div>'+
  '<div data-show="pick:shared">'+sharedCardHtml()+'</div><div data-show="pick:team io:team">'+teamCardHtml()+'</div>'+
  '<div class="card" data-show="io:import"><h2>ExamView banks</h2><p class="note" style="margin-top:0">Choose one or more ExamView question bank files (<b>.bnk</b>). Questions, answer choices, correct answers, points, standards, topics, math and pictures come across.</p><div class="actions"><span class="filebtn"><button type="button" tabindex="-1" aria-hidden="true" class="primary">Import .bnk files…</button><input type="file" id="bnkFile" accept=".bnk" multiple aria-label="Import .bnk files"></span></div><div id="bnkRes" class="result"></div></div>'+
  '<div class="card" data-show="io:import"><h2>From Word</h2><p class="note" style="margin-top:0">Choose a Word test (.docx). Numbered questions, lettered answer choices, equations, pictures, proof tables, parts and credits like [2] come across. You can also use the file’s page header for your printed tests.</p><div class="actions"><span class="filebtn"><button type="button" tabindex="-1" aria-hidden="true" class="primary">Import a Word file…</button><input type="file" id="docxFile" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-label="Import a Word file"></span></div></div>'+
  '<div class="card" data-show="io:import"><h2>From a PDF</h2><p class="note" style="margin-top:0">Choose a PDF of a test or worksheet. Numbered questions and their answer choices are found for you; each one comes in as text you can edit, or as a picture when it has diagrams or math that text can’t hold. Anything missed, you can draw a box around.</p><div class="actions"><span class="filebtn"><button type="button" tabindex="-1" aria-hidden="true" class="primary">Import a PDF…</button><input type="file" id="pdfFile" accept=".pdf,application/pdf" aria-label="Import a PDF"></span></div><div id="pdfRes" class="result"></div></div>'+
  '<div class="card wide" data-show="io:import"><h2>Paste questions</h2><p class="note" style="margin-top:0">Copy questions from a Word document or old test and paste them here. Leave a blank line between questions and put a <b>*</b> before the correct choice.</p><pre class="fmt">1. What is the slope of the line y = 3x − 5?\nA. −5\n*B. 3\nC. 5\nD. −3\n\n2. Every square is a rectangle.\nAnswer: True\n\n3. Explain why the triangles are congruent.</pre><textarea id="pasteBox" rows="8" placeholder="Paste your questions here…"></textarea><div class="pickrow"><label style="display:flex;gap:6px;align-items:center">Bank <input type="text" id="pasteBank" list="bankList2" value="My questions" style="width:150px"><datalist id="bankList2">'+bnames.map(function(t){return '<option value="'+esc(t)+'">';}).join('')+'</datalist></label><label style="display:flex;gap:6px;align-items:center">Topic <input type="text" id="pasteTopic" placeholder="optional" style="width:140px"></label><span class="spacer"></span><button class="primary" id="pasteGo">Import</button></div><div id="pasteRes" class="result"></div></div>'+
  '<div class="card" id="coursesCard" data-show="io:courses"><h2>Courses</h2><p class="note" style="margin-top:0">Each course has its own banks and its own test. Switch courses with the menu at the top. A bank can be used in several courses: open its <b>⋯</b> menu under <b>Your banks</b>.</p><ul class="banks">'+state.courses.map(function(c){var n=state.questions.filter(function(q){return inCourse(q,c);}).length;return '<li><span>'+esc(c)+(c===state.course?' <small>· current</small>':'')+' <small>· '+n+' question'+(n!==1?'s':'')+'</small></span><button class="small ghost" data-crename="'+esc(c)+'">Rename</button>'+(state.courses.length>1?'<button class="small ghost" data-cdel="'+esc(c)+'">Delete</button>':'')+'</li>';}).join('')+'</ul><div class="pickrow"><input type="text" id="newCourse" placeholder="New course, e.g. AP Statistics" style="flex:1"><button class="small" id="addCourse">Add course</button></div></div>'+
  '</div>';
  wireToolCards();wireBanksCard();
  $('#bnkFile').onchange=function(){var files=Array.prototype.slice.call(this.files||[]);this.value='';if(files.length)importBnks(files);};
  $$('[data-usein]').forEach(function(cb){if(cb.hasAttribute('data-mixed'))cb.indeterminate=true;cb.onchange=function(){
    var name=cb.dataset.usein,c=cb.value,qs=cq().filter(function(q){return q.bank===name&&own(q);});
    qs.forEach(function(q){if(cb.checked)setCourses(q,coursesOf(q).concat([c]));else dropCourse(q,c);});
    ui.bOpen=name;changed();renderIO();
    toast(cb.checked?'“'+name+'” is now in '+c+' too.':'“'+name+'” is no longer in '+c+'.');};});
  $$('[data-pub]').forEach(function(b){b.onclick=function(){
    var name=b.dataset.pub,to=b.dataset.to,qs=cq().filter(function(q){return q.bank===name&&own(q);});
    if(to==='public'&&!b.classList.contains('danger')){b.classList.add('danger');b.textContent='Confirm: everyone on this site sees it';setTimeout(function(){if(document.body.contains(b))renderIO();},4000);return;}
    var was=qs.map(function(q){return q.visibility;});qs.forEach(function(q){if(to==='public')q.visibility='public';else delete q.visibility;});changed();renderIO();
    toast(to==='public'?'“'+name+'” is public: colleagues on this site can use it.':'“'+name+'” is private again.',function(){qs.forEach(function(q,i){if(was[i])q.visibility=was[i];else delete q.visibility;});changed();renderIO();});
  };});
  wireTeamCard();
  var sbs=sharedBanks();
  $$('[data-shuse]').forEach(function(cb){if(cb.hasAttribute('data-mixed'))cb.indeterminate=true;cb.onchange=function(){var x=sbs[+cb.dataset.shuse],c=cb.value;
    x.qs.forEach(function(q){if(cb.checked)setCourses(q,coursesOf(q).concat([c]));else dropCourse(q,c);});
    if(!cb.checked){var ids={};cq().forEach(function(q){ids[q.id]=1;});state.selected=state.selected.filter(function(id){return ids[id];});}
    changed();renderIO();toast(cb.checked?'“'+x.bank+'” is now in '+c+'.':'“'+x.bank+'” is no longer in '+c+'.');};});
  $$('[data-delbank]').forEach(function(b){b.onclick=function(){
    var name=b.dataset.delbank;if(!b.classList.contains('danger')){b.classList.add('danger');b.textContent='Delete '+bc[name]+'?';setTimeout(function(){if(document.body.contains(b)){b.classList.remove('danger');b.textContent='Delete';}},3500);return;}
    var prevQ=JSON.parse(JSON.stringify(state.questions)),prevS=state.selected.slice();
    state.questions=state.questions.filter(function(q){return q.bank!==name||q.owner||!inCourse(q,state.course)||!dropCourse(q,state.course);});var ids={};cq().forEach(function(q){ids[q.id]=1;});state.selected=state.selected.filter(function(id){return ids[id];});
    if(ui.bank===name)ui.bank='';changed();render();toast('Deleted “'+name+'”.',function(){state.questions=prevQ;state.selected=prevS;changed();render();});
  };});
  $$('[data-rename]').forEach(function(b){b.onclick=function(){
    var li=b.closest('li'),name=b.dataset.rename;li.innerHTML='<input type="text" value="'+esc(name)+'" style="flex:1"><button class="small primary">Save</button><button class="small ghost">Cancel</button>';
    var inp=$('input',li);inp.focus();inp.select();var bs=$$('button',li);
    var done=function(){var nn=inp.value.trim();if(nn&&nn!==name){state.questions.forEach(function(q){if(q.bank===name&&own(q)&&inCourse(q,state.course))q.bank=nn;});if(ui.bank===name)ui.bank=nn;changed();}renderIO();};
    bs[0].onclick=done;bs[1].onclick=renderIO;inp.onkeydown=function(e){if(e.key==='Enter')done();if(e.key==='Escape')renderIO();};
  };});
  $('#addCourse').onclick=function(){var v=$('#newCourse').value.trim();if(!v)return;if(state.courses.indexOf(v)>=0){toast('You already have '+v+'.');return;}state.courses.push(v);changed();switchCourse(v);};
  $('#newCourse').onkeydown=function(e){if(e.key==='Enter')$('#addCourse').click();};
  $$('[data-crename]').forEach(function(b){b.onclick=function(){
    var li=b.closest('li'),name=b.dataset.crename;li.innerHTML='<input type="text" value="'+esc(name)+'" style="flex:1"><button class="small primary">Save</button><button class="small ghost">Cancel</button>';
    var inp=$('input',li);inp.focus();inp.select();var bs=$$('button',li);
    var done=function(){var nn=inp.value.trim();if(nn&&nn!==name){if(state.courses.indexOf(nn)>=0){toast('You already have '+nn+'.');return;}state.courses[state.courses.indexOf(name)]=nn;state.questions.forEach(function(q){if(inCourse(q,name))setCourses(q,coursesOf(q).map(function(c){return c===name?nn:c;}));});state.savedTests.forEach(function(t){if(t.course===name)t.course=nn;});if(state.courseTests[name]){state.courseTests[nn]=state.courseTests[name];delete state.courseTests[name];}if(state.course===name){state.course=nn;if(state.settings.course===name)state.settings.course=nn;}changed();}render();};
    bs[0].onclick=done;bs[1].onclick=renderIO;inp.onkeydown=function(e){if(e.key==='Enter')done();if(e.key==='Escape')renderIO();};
  };});
  $$('[data-cdel]').forEach(function(b){b.onclick=function(){
    var name=b.dataset.cdel,n=state.questions.filter(function(q){return inCourse(q,name);}).length;
    if(!b.classList.contains('danger')){b.classList.add('danger');b.textContent=n?'Delete with '+n+' questions?':'Delete?';setTimeout(function(){if(document.body.contains(b)){b.classList.remove('danger');b.textContent='Delete';}},3500);return;}
    var prev=JSON.parse(JSON.stringify({questions:state.questions,courses:state.courses,courseTests:state.courseTests,savedTests:state.savedTests}));
    if(state.course===name){var other=state.courses.filter(function(c){return c!==name;})[0];switchCourse(other);}
    state.questions=state.questions.filter(function(q){return !inCourse(q,name)||!dropCourse(q,name);});state.courses=state.courses.filter(function(c){return c!==name;});delete state.courseTests[name];state.savedTests=state.savedTests.filter(function(t){return t.course!==name;});
    changed();render();toast('Deleted '+name+'.',function(){state.questions=prev.questions;state.courses=prev.courses;state.courseTests=prev.courseTests;state.savedTests=prev.savedTests;changed();render();});
  };});
  $('#bkOut').onclick=function(){downloadBackup();renderIO();};
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
}
/* Older versions cut ExamView questions off at a table (the table, the text after it and sometimes answer choices were lost).
   Importing the same bank again repairs those questions in place and keeps everything else you changed. Returns a message, or
   '' when the file isn't the bank you already have (then it's imported as a copy, as before). */
function tblKey(q){return q.ref?'r:'+q.ref:'t:'+plain(String(q.html||'').split('<table')[0]).replace(/\s+/g,' ').trim().slice(0,160);}
function repairTables(out,name,course){
  var by={};state.questions.forEach(function(q){if(q.bank===name&&inCourse(q,course)&&own(q))by[tblKey(q)]=q;});
  var pairs=out.questions.map(function(n){return [n,by[tblKey(n)]];}).filter(function(p){return p[1];});
  if(pairs.length<out.questions.length*0.8)return '';
  var undo=[];
  pairs.forEach(function(p){var n=p[0],o=p[1];if(!/q-grid/.test(n.html)||/q-grid/.test(o.html))return;
    undo.push([o,{html:o.html,choices:o.choices,answer:o.answer,type:o.type}]);
    o.html=n.html;o.type=n.type;o.answer=n.answer;if(n.choices)o.choices=n.choices;else delete o.choices;});
  if(undo.length){changed();toast('Fixed '+plural(undo.length,'question')+' with a table in “'+name+'”.',function(){undo.forEach(function(u){Object.assign(u[0],u[1]);if(!u[1].choices)delete u[0].choices;});changed();render();});}
  return '<b>'+esc(name)+'</b>: you already have this bank, so nothing was added. '+(undo.length?'Fixed '+plural(undo.length,'question')+' with a table: the table and anything after it were missing before. Your other changes are kept.':'Its questions are all up to date.');
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
      var name=out.title,existing=state.questions.filter(function(q){return q.bank===name&&inCourse(q,course);}).length;
      if(existing){var rp=repairTables(out,name,course);if(rp){msgs.push(rp);return;}}
      if(existing){var k=2;while(state.questions.some(function(q){return q.bank===name+' ('+k+')'&&inCourse(q,course);}))k++;name=name+' ('+k+')';}
      out.questions.forEach(function(q){q.id=uid();q.bank=name;q.course=course;splitNY(q);fillMeta(q);});
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
      (hdrDesc?'<label title="Sets the Classic layout on Set up"><input type="checkbox" id="wHdr" checked> Use this file’s header for my printed tests: <b style="font-weight:600">'+esc(hdrDesc)+'</b></label>':'');
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
  changed();$('#modal').innerHTML='';var nAdded=added.length;wimp=null;ui.tab=sel?'setup':'bank';if(sel){ui.subs=Object.assign({},ui.subs,{setup:'questions'});}ui.source=sel?ui.source:src;render();
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
  root.innerHTML='<div class="login"><div class="login-card"><div class="brand" style="justify-content:center;margin-bottom:6px"><img class="mark" alt="" src="'+BRAND_LOGO+'">ALittleCandleTestBuilder</div><p class="hint" style="text-align:center;margin:0 0 18px">Sign in to your question banks.</p>'+
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
function loadUsers(){loadGroups();
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
// Groups (admin): name + members; team banks are shared with groups
function loadGroups(){
  if(!$('#gBox')){var ul=$('#uList');if(!ul)return;ul.insertAdjacentHTML('afterend','<h3 class="sh-h" style="margin-top:18px">Groups</h3><p class="hint" style="margin-top:0">Groups (like a Geometry team) decide who sees a team bank. Tick who is in each group.</p><div id="gBox" class="hint">Loading…</div><div class="pickrow"><input type="text" id="gNew" placeholder="New group, e.g. Geometry team" style="flex:1"><button class="small" id="gAdd">Add group</button></div>');
    $('#gAdd').onclick=function(){var n=$('#gNew').value.trim();if(!n){$('#gNew').focus();return;}CLOUD.request('POST','/admin/api/groups',{name:n}).then(function(){$('#gNew').value='';loadGroups();},function(e){$('#uErr').textContent=e.message;});};
    $('#gNew').onkeydown=function(e){if(e.key==='Enter')$('#gAdd').click();};}
  CLOUD.request('GET','/admin/api/groups').then(function(r){
    var box=$('#gBox');if(!box)return;box.className='';
    box.innerHTML=r.groups.length?'<ul class="glist">'+r.groups.map(function(g){return '<li data-g="'+esc(g.id)+'"><div class="g-head"><b>'+esc(g.name)+'</b><span class="spacer"></span><button class="small ghost" data-ga="ren">Rename</button><button class="small ghost" data-ga="del">Delete</button></div><div class="g-mem">'+r.people.map(function(p){return '<label><input type="checkbox" value="'+esc(p.id)+'"'+(g.members.indexOf(p.id)>=0?' checked':'')+'> '+esc(p.email)+'</label>';}).join('')+'</div></li>';}).join('')+'</ul>':'<p class="hint">No groups yet.</p>';
    $$('.glist li',box).forEach(function(li){var id=li.dataset.g,g=r.groups.filter(function(x){return x.id===id;})[0];
      $$('.g-mem input',li).forEach(function(cb){cb.onchange=function(){CLOUD.request('PUT','/admin/api/groups/'+id,{members:$$('.g-mem input:checked',li).map(function(x){return x.value;})}).then(function(){toast('Saved who is in '+g.name+'.');},function(e){$('#uErr').textContent=e.message;});};});
      $('[data-ga="ren"]',li).onclick=function(){var n=prompt('New name for the group',g.name);if(n&&n.trim()&&n.trim()!==g.name)CLOUD.request('PUT','/admin/api/groups/'+id,{name:n.trim()}).then(loadGroups,function(e){$('#uErr').textContent=e.message;});};
      var del=$('[data-ga="del"]',li);del.onclick=function(){if(!del.classList.contains('danger')){del.classList.add('danger');del.textContent='Confirm';setTimeout(function(){if(document.body.contains(del)){del.classList.remove('danger');del.textContent='Delete';}},3000);return;}
        CLOUD.request('DELETE','/admin/api/groups/'+id).then(function(){toast('Deleted the group '+g.name+'. Team banks shared with it aren’t shared with them any more.');loadGroups();},function(e){$('#uErr').textContent=e.message;});};
    });
  },function(e){var box=$('#gBox');if(box)box.textContent=e.message;});
}
function toastOn(msg){if(!$('#toast')){var t=document.createElement('div');t.className='toast';t.id='toast';document.body.appendChild(t);}toast(msg);}

/* ================= start ================= */
/* Short in-app help; the full guide is the wiki. */
var HELP_HTML='<h2 id="helpT">Help</h2>'+
  '<h3>The rail on the left</h3><p>Making a test is three steps: <b>1 Pick questions</b>, <b>2 Set up</b>, <b>3 Print</b>. Below them are <b>Question bank</b> and <b>Import &amp; backup</b>. The buttons across the top of each one (like <b>Spacing</b> or <b>Backup</b>) show one panel at a time. <kbd>Alt</kbd>+<kbd>1</kbd>…<kbd>3</kbd> jump to the steps; <b>Next</b> at the bottom moves you along.</p>'+
  '<h3>Bring in questions</h3><p>On <b>Import &amp; backup › Import</b>, choose ExamView banks (.bnk), a Word test (.docx), a PDF, or paste text. Or use <b>+ New question</b> on the Question bank.</p>'+
  '<h3>Pick questions</h3><p><b>Select all</b> / <b>Deselect all</b> pick every question shown. In <b>1 Pick questions › Browse banks</b>, click a bank, then a unit or section, and click questions to add them (<b>Shift</b>-click adds a run; or <b>Add 5 at random</b>). <b>Search</b> finds questions by words, unit, topic and standard (<b>More filters</b> for the rest).</p>'+
  '<h3>Set up and print</h3><p><b>2 Set up</b> has the order of the questions (drag ⠿, type a number, or <b>Sort</b>), the document type (Test, Quiz, Review, Lesson) and its details, <b>Versions</b> and scrambling, <b>Spacing</b>, <b>Accommodations</b> and <b>Page style</b>, with the preview beside them (letter-size pages, so you can see where each page breaks). <b>Review &amp; print</b> under the preview goes to <b>3 Print</b>: what will print, the preview, the print buttons, and your <b>Saved tests</b>. To make a PDF, choose “Save as PDF” as the printer.</p>'+
  '<h3>Your own copies</h3><p><b>Duplicate</b> (a bank’s ⋯ menu on Your banks) and <b>Copy to mine</b> (a colleague’s question or bank) make copies you can change without touching the original.</p><h3>Answer keys always match</h3><p>Versions stay the same until you press <b>New scramble</b>, so a key matches copies you’ve already printed.</p>'+
  '<h3>Keep your work safe</h3><p>On <b>Import &amp; backup › Backup</b>, use <b>Download backup</b> now and then. Signed in on the website, your work is also saved on the server.</p>'+
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