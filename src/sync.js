/* Cloud accounts and sync (Supabase). Active only when config.js provides a project URL and key. */
var CLOUD=(function(){
  "use strict";
  var cfg=window.ALCTB_CONFIG||{};
  var URL_=String(cfg.supabaseUrl||'').replace(/\/+$/,''),KEY=cfg.supabaseAnonKey||'';
  var enabled=!!(URL_&&KEY&&!/YOUR-PROJECT|PASTE/i.test(URL_+KEY));
  var SKEY='alctb-session';
  var session=null;
  try{session=JSON.parse(localStorage.getItem(SKEY)||'null');}catch(e){}
  function saveSession(s){session=s;try{if(s)localStorage.setItem(SKEY,JSON.stringify(s));else localStorage.removeItem(SKEY);}catch(e){}}
  function fromAuth(r){return {access:r.access_token,refresh:r.refresh_token,exp:Date.now()+(r.expires_in||3600)*1000,user:{id:r.user&&r.user.id,email:r.user&&r.user.email,admin:!!(r.user&&(r.user.admin||(r.user.app_metadata&&r.user.app_metadata.role==='admin')))}};}
  function errMsg(j,status){var m=j&&(j.error_description||j.msg||j.message||j.error);if(/invalid login/i.test(m||''))return 'That email and password don’t match an account.';if(/email not confirmed/i.test(m||''))return 'This account hasn’t been confirmed yet. Ask whoever set it up to confirm it.';return m||('The server answered '+status+'.');}
  function req(method,path,body,opts){
    opts=opts||{};
    var h={'apikey':KEY};
    if(opts.auth!==false&&session)h['Authorization']='Bearer '+session.access;
    if(body!=null&&!(body instanceof Blob))h['Content-Type']='application/json';
    if(opts.headers)Object.keys(opts.headers).forEach(function(k){h[k]=opts.headers[k];});
    return fetch(URL_+path,{method:method,headers:h,body:body==null?undefined:(body instanceof Blob?body:JSON.stringify(body))}).then(function(r){
      return r.text().then(function(t){var j=null;try{j=t?JSON.parse(t):null;}catch(e){}if(!r.ok){var e=new Error(errMsg(j,r.status));e.status=r.status;throw e;}return j;});
    });
  }
  function fresh(){
    if(!session)return Promise.reject(new Error('Not signed in.'));
    if(session.exp-Date.now()>90000)return Promise.resolve(session);
    return req('POST','/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh},{auth:false}).then(function(r){saveSession(fromAuth(r));return session;},function(e){if(e.status===400||e.status===401){saveSession(null);if(api.onSignedOut)api.onSignedOut();}throw e;});
  }
  function call(method,path,body,opts){return fresh().then(function(){return req(method,path,body,opts);});}

  /* ---------- auth ---------- */
  function signIn(email,password){return req('POST','/auth/v1/token?grant_type=password',{email:email,password:password},{auth:false}).then(function(r){saveSession(fromAuth(r));return session.user;});}
  function signOut(){var s=session;saveSession(null);if(s)req('POST','/auth/v1/logout',{},{headers:{'Authorization':'Bearer '+s.access}}).catch(function(){});}
  function changePassword(pw){return call('PUT','/auth/v1/user',{password:pw});}
  function sendReset(email){return req('POST','/auth/v1/recover',{email:email},{auth:false});}
  function takeRecoveryFromUrl(){
    var h=location.hash||'';if(!/access_token=/.test(h))return false;
    var p={};h.replace(/^#/,'').split('&').forEach(function(kv){var i=kv.indexOf('=');if(i>0)p[decodeURIComponent(kv.slice(0,i))]=decodeURIComponent(kv.slice(i+1));});
    try{history.replaceState(null,'',location.pathname+location.search);}catch(e){location.hash='';}
    var s={access:p.access_token,refresh:p.refresh_token,exp:Date.now()+(+p.expires_in||3600)*1000,user:{id:null,email:''}};
    saveSession(s);
    return req('GET','/auth/v1/user').then(function(u){s.user={id:u.id,email:u.email,admin:!!(u.admin||(u.app_metadata&&u.app_metadata.role==='admin'))};saveSession(s);return p.type||'login';});
  }

  /* ---------- change detection ---------- */
  function fnv(str){var h=0x811c9dc5;for(var i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0).toString(36);}
  function canon(v){if(Array.isArray(v))return '['+v.map(canon).join(',')+']';if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(function(k){return JSON.stringify(k)+':'+canon(v[k]);}).join(',')+'}';return JSON.stringify(v===undefined?null:v);}
  function lite(html){return String(html||'').replace(/data:image\/[a-z]+;base64,([A-Za-z0-9+\/=]{0,60})[A-Za-z0-9+\/=]*/g,function(m,a){return 'D'+m.length+a;});}
  function sigQ(q){
    var o={};Object.keys(q).sort().forEach(function(k){var v=q[k];if(k==='html'||k==='choices'||v===''||v==null||v===false)return;o[k]=v;});
    return fnv(canon(o)+'|'+lite(q.html)+'|'+(q.choices||[]).map(lite).join('¦'));
  }
  function statePart(st){return {course:st.course,courses:st.courses,courseTests:st.courseTests,settings:st.settings,selected:st.selected};}
  function sigState(st){return fnv(canon(statePart(st)));}

  /* ---------- pictures ---------- */
  var uploaded={};
  function b64ToBlob(b64,type){var bin=atob(b64),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type:type});}
  function hashOf(b64){
    if(window.crypto&&crypto.subtle){var bin=atob(b64),u=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
      return crypto.subtle.digest('SHA-256',u).then(function(d){return Array.prototype.map.call(new Uint8Array(d),function(x){return ('0'+x.toString(16)).slice(-2);}).join('').slice(0,40);});}
    return Promise.resolve(fnv(b64)+fnv(b64.split('').reverse().join(''))+b64.length.toString(36));
  }
  // moves embedded pictures into online storage and returns html that points at them
  function hostImages(html){
    var re=/src="data:image\/(png|jpeg|jpg|gif|webp);base64,([^"]+)"/g,m,jobs=[],out=html;
    if(!html||html.indexOf('data:image/')<0)return Promise.resolve(html);
    while((m=re.exec(html)))jobs.push({full:m[0],ext:m[1]==='jpeg'?'jpg':m[1],type:'image/'+(m[1]==='jpg'?'jpeg':m[1]),b64:m[2]});
    return jobs.reduce(function(p,j){return p.then(function(){
      return hashOf(j.b64).then(function(h){
        var path=session.user.id+'/'+h+'.'+j.ext,pub=URL_+'/storage/v1/object/public/images/'+path;
        var up=uploaded[path]?Promise.resolve():call('POST','/storage/v1/object/images/'+path,b64ToBlob(j.b64,j.type),{headers:{'x-upsert':'true','Content-Type':j.type,'cache-control':'31536000'}}).then(function(){uploaded[path]=1;});
        return up.then(function(){out=out.split(j.full).join('src="'+pub+'"');});
      });
    });},Promise.resolve()).then(function(){return out;});
  }

  /* ---------- sync ---------- */
  var meta=null,busy=false,again=false,timer=null,status='',hooks=null;
  function setStatus(s){status=s;if(hooks&&hooks.status)hooks.status(s);}
  function metaKey(){return 'meta:'+session.user.id;}
  function loadMeta(){return hooks.idbGet(metaKey()).then(function(m){meta=m||{synced:{},stateSig:null,lastPull:null};uploaded=meta.uploaded||{};});}
  function saveMeta(){meta.uploaded=uploaded;return hooks.idbPut(metaKey(),meta);}
  function pullAll(since){
    var rows=[],page=0,size=200;
    function next(){
      var q='/rest/v1/questions?select=id,data,deleted,updated_at&order=updated_at.asc,id.asc&limit='+size+'&offset='+(page*size)+(since?'&updated_at=gt.'+encodeURIComponent(since):'');
      return call('GET',q).then(function(r){rows=rows.concat(r||[]);if(r&&r.length===size){page++;return next();}return rows;});
    }
    return next();
  }
  function pull(){
    var st=hooks.getState(),changed=false,maxSeen=meta.lastPull||null;
    return pullAll(meta.lastPull).then(function(rows){
      var byId={};st.questions.forEach(function(q,i){byId[q.id]=i;});
      rows.forEach(function(r){
        if(!maxSeen||r.updated_at>maxSeen)maxSeen=r.updated_at;
        var i=byId[r.id],local=i!=null?st.questions[i]:null,localSig=local?sigQ(local):null,synced=meta.synced[r.id];
        if(r.deleted){
          if(local&&localSig===synced){st.questions.splice(i,1);st.questions.forEach(function(q,k){byId[q.id]=k;});delete byId[r.id];st.selected=st.selected.filter(function(x){return x!==r.id;});changed=true;}
          delete meta.synced[r.id];return;
        }
        var data=r.data;if(!data||!data.id)return;
        if(!local&&synced!=null)return; // deleted here, not yet pushed
        if(!local){st.questions.push(data);byId[data.id]=st.questions.length-1;meta.synced[r.id]=sigQ(data);changed=true;}
        else if(localSig===synced||synced==null&&localSig===sigQ(data)){if(localSig!==sigQ(data)){st.questions[i]=data;changed=true;}meta.synced[r.id]=sigQ(data);}
      });
      return call('GET','/rest/v1/app_state?select=data,updated_at');
    }).then(function(rows){
      var row=rows&&rows[0];
      if(row&&row.data&&row.data.courses){
        var remoteSig=sigState(row.data);
        var localUnchanged=meta.stateSig===null||sigState(st)===meta.stateSig;
        if(remoteSig!==meta.stateSig&&localUnchanged){var d=row.data;['course','courses','courseTests','settings','selected'].forEach(function(k){if(d[k]!==undefined)st[k]=d[k];});meta.stateSig=sigState(st);changed=true;}
      }
      // look back two minutes so nothing saved at the same moment is missed
      if(maxSeen){var t=Date.parse(maxSeen);meta.lastPull=isNaN(t)?maxSeen:new Date(t-120000).toISOString();}
      return changed;
    });
  }
  function push(){
    var st=hooks.getState(),ups=[],dels=[],have={},uid=session.user.id;
    st.questions.forEach(function(q){have[q.id]=1;if(meta.synced[q.id]!==sigQ(q))ups.push(q);});
    Object.keys(meta.synced).forEach(function(id){if(!have[id])dels.push(id);});
    var stateDirty=sigState(st)!==meta.stateSig;
    if(!ups.length&&!dels.length&&!stateDirty)return Promise.resolve(false);
    var total=ups.length,done=0,localChanged=false;
    setStatus('Syncing…');
    var chain=Promise.resolve();
    for(var b=0;b<ups.length;b+=20)(function(batch){
      chain=chain.then(function(){
        return Promise.all(batch.map(function(q){
          return hostImages(q.html).then(function(h){
            return Promise.all((q.choices||[]).map(hostImages)).then(function(ch){
              if(h!==q.html||(q.choices&&ch.some(function(c,i){return c!==q.choices[i];}))){q.html=h;if(q.choices)q.choices=ch;localChanged=true;}
              return q;
            });
          });
        })).then(function(qs){
          // remember exactly what was sent: an edit made while this upload is running must still count as unsynced
          var sent=qs.map(function(q){return {sig:sigQ(q),data:JSON.parse(JSON.stringify(q))};});
          return call('POST','/rest/v1/questions?on_conflict=user_id,id',sent.map(function(x){return {user_id:uid,id:x.data.id,data:x.data,deleted:false,updated_at:new Date().toISOString()};}),{headers:{'Prefer':'resolution=merge-duplicates,return=minimal'}}).then(function(){
            sent.forEach(function(x){meta.synced[x.data.id]=x.sig;});done+=qs.length;if(total>20)setStatus('Syncing… '+done+' of '+total);return saveMeta();
          });
        });
      });
    })(ups.slice(b,b+20));
    if(dels.length)chain=chain.then(function(){
      return call('POST','/rest/v1/questions?on_conflict=user_id,id',dels.map(function(id){return {user_id:uid,id:id,data:{},deleted:true,updated_at:new Date().toISOString()};}),{headers:{'Prefer':'resolution=merge-duplicates,return=minimal'}}).then(function(){dels.forEach(function(id){delete meta.synced[id];});return saveMeta();});
    });
    if(stateDirty)chain=chain.then(function(){
      var now=new Date().toISOString(),cur=hooks.getState(),body=JSON.parse(JSON.stringify(statePart(cur))),sg=sigState(cur);
      return call('POST','/rest/v1/app_state?on_conflict=user_id',[{user_id:uid,data:body,updated_at:now}],{headers:{'Prefer':'resolution=merge-duplicates,return=minimal'}}).then(function(){meta.stateSig=sg;return saveMeta();});
    });
    return chain.then(function(){return localChanged;});
  }
  function sync(){
    if(!enabled||!session||!meta)return Promise.resolve();
    if(busy){again=true;return Promise.resolve();}
    busy=true;setStatus('Syncing…');
    return pull().then(function(ch){if(ch)hooks.applied();return push();}).then(function(localCh){
      if(localCh)hooks.localChanged();
      busy=false;setStatus(navigator.onLine===false?'Offline':'Synced');
      if(again){again=false;return sync();}
    },function(e){
      busy=false;console.error(e);
      if(e.status===401||/Not signed in/.test(e.message)){setStatus('Signed out');return;}
      setStatus(navigator.onLine===false||e instanceof TypeError?'Offline — will sync later':'Sync problem — will retry');
      clearTimeout(timer);timer=setTimeout(sync,30000);
    });
  }
  function schedule(){if(!enabled||!session)return;clearTimeout(timer);if(!busy)setStatus('Changes waiting to sync');timer=setTimeout(sync,2500);}
  function start(h){
    hooks=h;
    return loadMeta().then(function(){
      window.addEventListener('focus',function(){schedule();});
      window.addEventListener('online',function(){schedule();});
      setInterval(function(){if(document.visibilityState!=='hidden')sync();},120000);
      return sync();
    });
  }
  var api={selfHosted:!!cfg.selfHosted,request:call,enabled:enabled,user:function(){return session&&session.user;},signIn:signIn,signOut:signOut,changePassword:changePassword,sendReset:sendReset,takeRecoveryFromUrl:takeRecoveryFromUrl,start:start,sync:sync,schedule:schedule,status:function(){return status;},onSignedOut:null,_sigQ:sigQ};
  return api;
})();
