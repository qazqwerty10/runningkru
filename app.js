/* ---------- storage (per-browser conveniences only) ---------- */
const store={get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

/* ---------- dates ---------- */
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const dayNum=d=>Math.round(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5);
const mondayOf=d=>addDays(d,-((d.getDay()+6)%7));
const DOW=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const fmtDate=d=>d.toLocaleDateString(undefined,{month:'short',day:'numeric'});
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};

/* ---------- race ---------- */
const RACE='2027-05-15';
const RACE_MON=mondayOf(parse(RACE));

/* ---------- program data ---------- */
const PHASES=[
  {name:'Couch → 5K',short:'Couch → 5K',weeks:9,goal:'Run 30 minutes (about 5K) without stopping'},
  {name:'5K → 10K',short:'5K → 10K',weeks:8,goal:'Run a 10K (6.2 mi)'},
  {name:'10K → 10 Mile',short:'10K → 10 mi',weeks:10,goal:'Run 10 miles on race day'}
];
const STARTS=[0,9,17]; const TOTAL=27;
const R=s=>['run',s],W=s=>['walk',s];
const rep=(n,a,drop)=>{let o=[];for(let i=0;i<n;i++)o.push(...a);if(drop)o.pop();return o};
const I=(d,seg)=>({kind:'interval',d,seg});
const same=x=>[x,x,x];
const C25K=[
  same(I('8 × (1 min run · 1½ min walk)',rep(8,[R(60),W(90)]))),
  same(I('6 × (1½ min run · 2 min walk)',rep(6,[R(90),W(120)]))),
  same(I('2 × (1½ run · 1½ walk · 3 run · 3 walk)',rep(2,[R(90),W(90),R(180),W(180)]))),
  same(I('3 run · 1½ walk · 5 run · 2½ walk · 3 run · 1½ walk · 5 run',[R(180),W(90),R(300),W(150),R(180),W(90),R(300)])),
  [I('3 × 5 min run, 3 min walk between',rep(3,[R(300),W(180)],true)),I('8 min run · 5 min walk · 8 min run',[R(480),W(300),R(480)]),I('20 min continuous run',[R(1200)])],
  [I('5 run · 3 walk · 8 run · 3 walk · 5 run',[R(300),W(180),R(480),W(180),R(300)]),I('10 min run · 3 min walk · 10 min run',[R(600),W(180),R(600)]),I('25 min continuous run',[R(1500)])],
  same(I('25 min continuous run',[R(1500)])),
  same(I('28 min continuous run',[R(1680)])),
  [I('30 min continuous run',[R(1800)]),I('30 min continuous run',[R(1800)]),I('30 min run — or your first 5K',[R(1800)])]
];
const P2=[[2,2,3],[2,2.5,3.5],[2.5,2.5,4],[2,2,3],[2.5,3,4.5],[3,3,5],[3,3.5,5.5],[2,1.5,6.2]];
const P3=[[3,3,5],[3,3.5,6],[3.5,3.5,6.5],[3,3,5],[3.5,4,7],[4,4,8],[4,4.5,8.5],[3,3.5,6],[4,4,9],[3,2,10]];
const CUTBACK={'1-4':1,'2-4':1,'2-8':1};

function weekInfo(w){
  let ph=w<9?0:w<17?1:2, wip=w-STARTS[ph]+1, runs, note='';
  if(ph===0){runs=C25K[wip-1];}
  else{
    const arr=(ph===1?P2:P3)[wip-1], last=wip===PHASES[ph].weeks;
    runs=[{kind:'easy',mi:arr[0]},{kind:'easy',mi:arr[1],strides:wip>=3&&!last},{kind:last?(ph===2?'race':'goal'):'long',mi:arr[2]}];
  }
  if(CUTBACK[ph+'-'+wip]) note='Cutback week: lower volume so tissues can adapt before the next build.';
  if(ph===0&&wip===5) note='Big week: first continuous run. Repeat week 4 or 5 if run 3 is out of reach.';
  if(wip===PHASES[ph].weeks) note=ph===0?'Finish line for phase 1. A local 5K or a solo time trial both count.':ph===1?'Taper and 10K goal run. Keep the early runs short and easy.':'Race week. Two short easy runs, then 10 miles on Saturday.';
  return {ph,wip,runs,note};
}
const pickRuns=(runs,n)=>n===3?runs:[runs[0],runs[2]];

let UNITS='mi';
function fmtD(mi){return UNITS==='km'?(mi*1.609).toFixed(1)+' km':(+mi.toFixed(1))+' mi'}
function runSeconds(seg){return seg.filter(s=>s[0]==='run').reduce((a,s)=>a+s[1],0)}
function fullSegs(r){return [['warm',300],...r.seg,['cool',300]]}
function runTitle(r){
  if(r.kind==='interval') return r.d;
  if(r.kind==='race') return fmtD(r.mi)+': race day';
  if(r.kind==='goal') return fmtD(r.mi)+' goal run';
  if(r.kind==='long') return fmtD(r.mi)+' long run';
  return fmtD(r.mi)+' easy'+(r.strides?' + strides':'');
}
function runShort(r){
  if(r.kind==='interval'){const m=runSeconds(r.seg)/60;return /continuous|first 5K/.test(r.d)?`${m}′ continuous`:`${+m.toFixed(1)}′ run/walk`}
  return fmtD(r.mi)+(r.kind==='long'?' long':r.kind==='race'?' race':r.kind==='goal'?' goal':'');
}
function runDetail(r){
  if(r.kind==='interval') return 'Start with a 5 min brisk walk and finish with a 5 min walk. Run slowly enough to talk in short sentences (RPE 4–5/10). The timer cues every switch.';
  if(r.kind==='race') return 'Race day. Start slower than feels right for the first two miles, settle in, and only pick it up after mile 8. Planned walk breaks are fine.';
  if(r.kind==='goal') return 'Goal run. Start slower than feels right for the first mile, settle in, and only pick it up in the final stretch. Walk breaks are allowed.';
  if(r.kind==='long') return 'Long run at easy, conversational pace (RPE 3–4/10). Planned walk breaks, such as 1 min every 8–10 min, are a legitimate strategy and do not count against you.';
  return 'Easy pace (RPE 3–4/10): you can speak in full sentences.'+(r.strides?' Finish with 4 × 20 s relaxed strides, walking back to recover.':'');
}

/* ---------- schedule: which weekday holds which session ---------- */
const DOW_LONG=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const defaultSched=n=>n===3?{run:[1,3,5],cross:[2],strength:[4]}:{run:[1,5],cross:[2,3],strength:[4]};
function schedProblem(s,n){
  const all=[...s.run,...s.cross,...s.strength];
  if(s.run.length!==n) return `Pick exactly ${n} run days.`;
  if(new Set(all).size!==all.length) return 'Each day can hold only one session.';
  const rs=[...s.run].sort((a,b)=>a-b);
  for(let i=0;i<rs.length;i++){const a=rs[i],b=rs[(i+1)%rs.length];if(rs.length>1&&((b-a+7)%7===1))return `${DOW_LONG[a]} and ${DOW_LONG[b]} are back to back. Leave at least one day between runs so tissues can recover.`}
  if(!s.strength.length) return 'Pick at least one strength day.';
  if(s.strength.length>2) return 'Pick one or two strength days. A third adds fatigue without much extra benefit for this plan.';
  if(all.length>6) return 'Keep at least one full rest day.';
  return '';
}
const okSched=(s,n)=>s&&Array.isArray(s.run)&&!schedProblem(s,n);
// r.sched applies from r.schedFrom (a Monday); earlier weeks keep r.schedPrev so logged days don't change meaning.
const schedOf=(r,mon)=>{if(!r)return defaultSched(3);
  if(mon&&r.schedFrom&&iso(mon)<r.schedFrom) return okSched(r.schedPrev,r.runDays)?r.schedPrev:defaultSched(r.runDays);
  return okSched(r.sched,r.runDays)?r.sched:defaultSched(r.runDays)};
const runDaysOf=r=>[...schedOf(r).run].sort((a,b)=>a-b);

function weekDays(w,r,mon){
  const n=r.runDays, wk=weekInfo(w), mins=['20–30','30–40','40–50'][wk.ph];
  const cross={type:'cross',title:'Cross-train',detail:`${mins} min low-impact cardio: bike, elliptical, swim, rower, or incline walk at an easy-moderate effort (RPE 4–5/10). Builds the aerobic engine without extra impact load.`};
  const strength={type:'strength',title:'Strength',detail:'Full-body strength, about 45–55 minutes with rest: squat, row, hinge, push, calves and side plank. Dumbbells, a chair or bench, and an optional band.'};
  const rest={type:'rest',title:'Rest',detail:'Rest, or 10 min of easy mobility: calves, hip flexors, hamstrings.'};
  const k=wk.runs[2].kind, raceWeek=k==='race';
  const keyLabel=k==='race'?'Race day':k==='goal'?'Goal run':wk.ph===0?`Run ${n}`:'Long run';
  const runs=pickRuns(wk.runs,n);
  const days=Array.from({length:7},()=>({...rest}));
  if(raceWeek){
    // Race week is the same for everyone so the race lands on Saturday, May 15.
    const rd=n===3?[1,3,5]:[1,5];
    rd.forEach((d,i)=>{days[d]={type:'run',title:i===rd.length-1?keyLabel:`Run ${i+1}`,run:runs[i]}});
    days[4]={type:'rest',title:'Rest',detail:'Full rest before race day. Hydrate and eat a familiar dinner.'};
    days[6]={type:'rest',title:'Recovery',detail:'Easy walk, mobility, celebrate.'};
    return {wk,days,raceWeek,moved:false};
  }
  const s=schedOf(r,mon), rd=[...s.run].sort((a,b)=>a-b);
  rd.forEach((d,i)=>{days[d]={type:'run',title:i===rd.length-1?keyLabel:`Run ${i+1}`,run:runs[i]}});
  s.cross.forEach(d=>{days[d]={...cross}});
  s.strength.forEach(d=>{days[d]={...strength}});
  const sw=mon&&r.swaps&&r.swaps[iso(mon)];
  if(sw&&sw.length){sw.forEach(([a,b])=>{const t=days[a];days[a]={...days[b],movedFrom:days[b].movedFrom??b};days[b]={...t,movedFrom:t.movedFrom??a}});
    days.forEach((d,i)=>{if(d.movedFrom===i)delete d.movedFrom});}
  return {wk,days,raceWeek,moved:!!(sw&&sw.length)};
}
function backToBack(days){const r=days.map(d=>d.type==='run');for(let i=0;i<7;i++)if(r[i]&&r[(i+1)%7]&&i!==6)return [i,i+1];return null}

/* ---------- runner helpers ---------- */
const defaultStart=entry=>iso(addDays(RACE_MON,-(TOTAL-1-STARTS[entry])*7));
const startMonR=r=>mondayOf(parse(r.start));
const calWeekR=(r,d)=>Math.floor((dayNum(d)-dayNum(startMonR(r)))/7);
const progWeekR=(r,cw)=>STARTS[r.entry]+cw-(r.holds||[]).filter(h=>h<cw).length;
function newRunner(name,entry,runDays,mode){
  return {name,entry,runDays,mode,units:'mi',start:defaultStart(entry),holds:[],logs:{},ready:{},joined:iso(today())};
}
function scheduleDiff(r){
  const endMon=addDays(startMonR(r),(TOTAL-1-STARTS[r.entry]+(r.holds||[]).length)*7);
  return Math.round((dayNum(endMon)-dayNum(RACE_MON))/7);
}
function runnerNow(r){
  const t=today(), cw=calWeekR(r,t), notStarted=cw<0;
  const pw=notStarted?STARTS[r.entry]:progWeekR(r,cw);
  const mon=notStarted?startMonR(r):addDays(startMonR(r),cw*7);
  return {t,cw,pw,notStarted,mon,finished:pw>=TOTAL};
}

/* ---------- shared state (Google Sheet via Apps Script) ---------- */
const API=(window.C10_API||'').trim();
let ME=null, RUNNERS={}, LOADED=false, LOCAL=false, ERR='', LASTSYNC=null;
let UI={tab:store.get('c10-tab','today'),sel:null,who:null,join:{name:'',entry:0,runDays:3},confirmLeave:false,newRunner:false,codeFor:null,moving:false};
const mine=()=>RUNNERS[ME]||null;
const viewing=()=>RUNNERS[UI.who]||null;
const isMine=()=>UI.who===ME&&!!mine();
const nameOf=id=>(RUNNERS[id]&&RUNNERS[id].name)||'Runner';
const PALETTE=['#1F57D6','#0D836A','#A9661A','#7A4BC2','#C3372C','#0E7C99'];
const colorOf=id=>{const ids=Object.keys(RUNNERS).sort();const i=ids.indexOf(id);return PALETTE[(i<0?0:i)%PALETTE.length]};
const initial=s=>(s||'?').trim().charAt(0).toUpperCase();
const orderedIds=()=>Object.keys(RUNNERS).sort((a,b)=>(a===ME?-1:b===ME?1:nameOf(a).localeCompare(nameOf(b))));
const newId=()=>Array.from(crypto.getRandomValues(new Uint8Array(8)),b=>(b%36).toString(36)).join('')+Date.now().toString(36).slice(-4);

function deepMerge(t,p){for(const k in p){if(p[k]&&typeof p[k]==='object'&&!Array.isArray(p[k])){t[k]=deepMerge(t[k]&&typeof t[k]==='object'?{...t[k]}:{},p[k])}else t[k]=p[k]}return t}

/* network */
const TIMEOUT_MS=15000;
class SyncError extends Error{constructor(msg,kind){super(msg);this.kind=kind}}
async function call(url,opts){
  const ctl=new AbortController(), t=setTimeout(()=>ctl.abort(),TIMEOUT_MS);
  let res, text;
  try{res=await fetch(url,{...opts,redirect:'follow',signal:ctl.signal});text=await res.text()}
  catch(e){
    if(e&&e.name==='AbortError') throw new SyncError('The Kru sheet took longer than 15 seconds to answer. Google is probably slow right now.','timeout');
    if(!navigator.onLine) throw new SyncError("This phone is offline. Changes stay here and upload when you're back online.",'offline');
    throw new SyncError("Couldn't reach Google. This is usually a brief network problem.",'network');
  }finally{clearTimeout(t)}
  if(!res.ok) throw new SyncError(`Google returned an error (HTTP ${res.status}). Try again in a minute.`,'http');
  let j;
  try{j=JSON.parse(text)}catch(e){
    if(/accounts\.google\.com|ServiceLogin|Sign in/i.test(text)) throw new SyncError('Google asked for a sign-in. In Apps Script, set "Who has access" to Anyone and deploy a new version.','auth');
    if(/Script function not found/i.test(text)) throw new SyncError('The Google script is missing doGet/doPost. Paste Code.gs again, save, and deploy a new version.','script');
    throw new SyncError('The Google script sent back a web page instead of data. Check that it is deployed as a Web app.','badresponse');
  }
  if(j&&j.ok&&!(j.version>=3)) throw new SyncError('The Google script is the old version. Paste in the new Code.gs, then Deploy → Manage deployments → Edit → New version.','oldscript');
  if(!j||!j.ok){
    if(j&&j.error==='Unknown action') throw new SyncError('The Google script is the old version. Paste in the new Code.gs, then Deploy → Manage deployments → Edit → New version.','oldscript');
    throw new SyncError((j&&j.error)||'The sheet script reported an unknown error.',(j&&j.code)||'script');
  }
  return j;
}
// text/plain keeps this a "simple" request, which Apps Script accepts without a CORS preflight
const apiPost=body=>call(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)});
const apiAll=()=>apiPost({action:'all',id:ME||'',token:keyFor(ME)});

/* profile keys: each phone holds a secret key per profile; the sheet stores only its fingerprint */
const B32='ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const newKey=()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>B32[b%B32.length]).join('');
const fmtKey=k=>(k||'').match(/.{1,4}/g).join('-');
const normKey=k=>String(k||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
const keys=()=>store.get('c10-keys',{})||{};
const keyFor=id=>id?keys()[id]||'':'';
const setKey=(id,k)=>{const all=keys();if(k)all[id]=k;else delete all[id];store.set('c10-keys',all)};
const linkFor=id=>location.origin+location.pathname+'#link='+id+'.'+keyFor(id);

/* Unsent edits are kept as a queue of small patches on top of the last copy the sheet confirmed.
   A patch leaves the queue only once a save that included it is acknowledged, so a reopened
   phone replays just the edits that never reached the sheet, never an old full copy. */
let SERVER={}, QUEUE=[], REV=0, inflight=false, pushTimer=null, retryTimer=null, retryDelay=15000;
let LOADERR=null, SAVEERR=null, AUTHED=false, LINKLOST=null;
const persistQueue=()=>store.set('c10-queue',{id:ME,rev:REV,patches:QUEUE});
const clone=o=>JSON.parse(JSON.stringify(o));
function rebuild(){
  RUNNERS={...SERVER};
  if(ME&&QUEUE.length){let r=SERVER[ME]?clone(SERVER[ME]):null;if(r){QUEUE.forEach(q=>{r=deepMerge(r,q.p)});RUNNERS[ME]=r}}
  if(mine())UNITS=mine().units||'mi';
  if(!UI.who||!RUNNERS[UI.who]) UI.who=mine()?ME:(orderedIds()[0]||null);
}
function setMe(id){ME=id;store.set('c10-me',id);const q=store.get('c10-queue',null);if(q&&q.id===id&&Array.isArray(q.patches)){QUEUE=q.patches;REV=q.rev||0}else{QUEUE=[];REV=0}}
let claiming=false;
let CACHED_AT=null; // when the plan on screen came from this phone's saved copy
function saveCache(){store.set('c10-cache',{at:Date.now(),me:ME,authed:AUTHED,runners:SERVER})}
function loadCache(){
  const c=store.get('c10-cache',null);
  if(!c||!c.runners) return false;
  SERVER=c.runners;AUTHED=!!(c.authed&&c.me===ME);LOADED=true;CACHED_AT=c.at;
  if(ME&&!SERVER[ME]) setMe(null);
  rebuild();return true;
}
function applyServer(j){
  SERVER=j.runners||{};AUTHED=!!j.authed;LOADED=true;LASTSYNC=new Date();LOADERR=null;CACHED_AT=null;
  if(ME){
    const r=SERVER[ME];
    if(!r){if(!QUEUE.length){setKey(ME,null);setMe(null)}}
    else if(!r.locked&&!claiming){claim(ME)}            // unclaimed profile on this phone: take it
    else if(r.locked&&!AUTHED){LINKLOST=ME;setMe(null)} // key missing or replaced
  }
  rebuild();
  saveCache();
}
async function claim(id,code){
  claiming=true;
  const prevMe=ME, token=code||keyFor(id)||newKey();
  try{
    const prev=keyFor(id); setKey(id,token); ME=id;
    const j=await apiPost({action:code?'all':'claim',id,token});
    if(!j.authed){setKey(id,prev||null);ME=prevMe;throw new SyncError(code?"That code doesn't match. Check it on your other phone under Setup → Use on another phone.":'Could not link this phone.','forbidden')}
    setMe(id);LINKLOST=null;applyServer(j);UI.who=id;ERR='';return true;
  }catch(e){if(ME!==id||!AUTHED)ME=prevMe;ERR=e.message||String(e);render();return false}
  finally{claiming=false}
}
async function refresh(){
  if(LOCAL||!API||document.hidden) return;
  try{applyServer(await apiAll())}
  catch(e){LOADERR=e.message||String(e);if(!LOADED)LOADED=true}
  render();
}
function schedulePush(ms){clearTimeout(pushTimer);pushTimer=setTimeout(push,ms==null?700:ms)}
async function push(){
  if(inflight||!QUEUE.length||!mine()||!SERVER[ME]) return;
  inflight=true; clearTimeout(retryTimer); paintSync();
  const sentRev=QUEUE[QUEUE.length-1].rev, id=ME;
  try{
    // send just the edits; the sheet merges them field by field into the stored record
    const all=await apiPost({action:'patch',id,token:keyFor(id),patches:QUEUE.filter(q=>q.rev<=sentRev).map(q=>q.p)});
    if(ME===id){QUEUE=QUEUE.filter(q=>q.rev>sentRev); persistQueue();}
    SAVEERR=null; retryDelay=15000; applyServer(all);
  }catch(e){
    SAVEERR=e.message||String(e);
    if(e.kind==='forbidden'){LINKLOST=id;setMe(null);rebuild()}
    else{retryTimer=setTimeout(push,retryDelay); retryDelay=Math.min(retryDelay*2,120000);}
  }finally{inflight=false}
  render();
  if(QUEUE.length&&!SAVEERR) schedulePush(200);
}
function retryNow(){SAVEERR=null;LOADERR=null;retryDelay=15000;render();if(QUEUE.length)push();refresh()}
function saveMine(patch){
  if(!mine())return;
  if(LOCAL){RUNNERS[ME]=deepMerge(clone(mine()),patch);store.set('c10-local',RUNNERS[ME]);render();return}
  QUEUE.push({rev:++REV,p:patch}); persistQueue(); rebuild(); render(); schedulePush();
}
const savedAgo=t=>{const m=Math.round((Date.now()-t)/60000);if(m<1)return 'just now';if(m<60)return m+' min ago';const d=new Date(t);return (dayNum(d)===dayNum(new Date())?'today':fmtDate(d))+' at '+d.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})};
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
function syncState(){
  if(LOCAL) return {s:'local',t:'This device only'};
  if(!LOADED) return {s:'idle',t:'Connecting…'};
  if(inflight) return {s:'saving',t:'Saving…'};
  if(QUEUE.length&&SAVEERR) return {s:'offline',t:plural(QUEUE.length,'change')+' waiting to upload'};
  if(QUEUE.length) return {s:'saving',t:'Saving…'};
  if(LOADERR&&CACHED_AT) return {s:'offline',t:'Offline · saved copy'};
  if(LOADERR&&!LASTSYNC) return {s:'offline',t:'Not connected'};
  if(LOADERR) return {s:'offline',t:'Connection lost'};
  return {s:'idle',t:mine()?'All changes saved':'Connected'};
}
function paintSync(){const el=document.getElementById('sync');if(!el)return;
  const st=syncState(); el.textContent=st.t; el.dataset.state=st.s;
  el.title=LASTSYNC?'Last synced '+LASTSYNC.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):'';}

function goLocal(){
  LOCAL=true;ME='local';
  let r=store.get('c10-local',null);
  if(!r){const old=store.get('c10-settings',{});r=newRunner('You',old.entry||0,old.runDays||3,old.mode||'std');r.logs=store.get('c10-logs',{});r.ready=store.get('c10-ready',{});}
  RUNNERS={local:r};UI.who='local';LOADED=true;UNITS=r.units||'mi';render();
}

async function boot(){
  if('serviceWorker' in navigator&&window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(()=>{});
  if(!API){goLocal();return}
  store.set('c10-pending',null); // v1 full-copy format: replaying it could overwrite newer data
  // device link: #link=<id>.<key>
  const m=location.hash.match(/^#link=([a-z0-9]{6,32})\.([A-Z0-9]{12,})$/);
  if(m){setKey(m[1],m[2]);store.set('c10-me',m[1]);history.replaceState(null,'',location.pathname+location.search)}
  setMe(store.get('c10-me',null));
  loadCache();
  render();
  await refresh();
  if(!mine()&&UI.tab==='today') UI.tab='crew';
  render();
  if(QUEUE.length) push();
  setInterval(refresh,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh();if(QUEUE.length)push()}});
  window.addEventListener('online',retryNow);
}

/* ---------- render ---------- */
const view=document.getElementById('view');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CHECK='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';

function render(){
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===UI.tab));
  ({today:renderToday,crew:renderCrew,plan:renderPlan,guide:renderGuide,setup:renderSetup})[UI.tab]();
  const rb=document.getElementById('retrySync'); if(rb) rb.onclick=retryNow;
  paintSync();
}

function ladder(pw){
  return `<div class="ladder">${PHASES.map((p,i)=>{
    const done=Math.max(0,Math.min(p.weeks,pw-STARTS[i]));
    const now=pw>=STARTS[i]&&pw<STARTS[i]+p.weeks;
    return `<div class="lane ${now?'now':''}" style="flex:${p.weeks}"><div class="bar"><i style="width:${done/p.weeks*100}%"></i></div><div class="lbl">${p.short}</div></div>`}).join('')}</div>`;
}
function banners(){
  let h='';
  if(LOCAL) h+=`<div class="banner">Saving on this device only. The Kru sheet isn't connected yet (see README step 2).</div>`;
  const e=SAVEERR||LOADERR;
  if(!LOCAL&&e&&(QUEUE.length||LOADERR)) h+=`<div class="banner err" role="alert"><div><b>${QUEUE.length?plural(QUEUE.length,'change')+' waiting to upload.':"Can't load the latest Kru data."}</b> ${esc(e)}${QUEUE.length?' Your changes are safe on this phone.':''}${CACHED_AT?` Showing the plan saved on this phone ${savedAgo(CACHED_AT)}.`:''}</div><button class="btn small" id="retrySync" type="button">Retry now</button></div>`;
  if(ERR) h+=`<div class="banner" role="alert">${esc(ERR)}</div>`;
  return h;
}
function whoBar(){
  const ids=orderedIds(); if(ids.length<2&&isMine())return '';
  return `<div class="who" aria-label="Whose plan">${ids.map(id=>`<button type="button" data-who="${esc(id)}" aria-pressed="${id===UI.who}"><span class="av" style="--c:${colorOf(id)}">${esc(initial(nameOf(id)))}</span>${esc(nameOf(id))}${id===ME?' (you)':''}</button>`).join('')}</div>`;
}
function bindWho(){view.querySelectorAll('[data-who]').forEach(b=>b.onclick=()=>{UI.who=b.dataset.who;UI.sel=null;render()})}

function joinCard(){
  if(LOCAL||!LOADED||mine()) return '';
  const ids=Object.keys(RUNNERS).sort((a,b)=>nameOf(a).localeCompare(nameOf(b)));
  if(UI.codeFor){
    const id=UI.codeFor;
    return `<section class="card join">
      <div><h2>Link this phone to ${esc(nameOf(id))}</h2><p class="muted">On the phone ${esc(nameOf(id))} already uses, open <b>Setup → Use on another phone</b>. Either open the link it shows on this phone, or type its 16-character code here.</p></div>
      <label class="field" for="j-code"><span>Device code</span><input type="text" id="j-code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX" style="font-family:var(--f-mono);letter-spacing:.06em"></label>
      <div class="actions"><button class="btn primary" id="codeBtn">Link this phone</button><button class="btn" id="codeBack">Back</button></div>
      <p class="muted" style="font-size:.82rem">Lost the other phone? The Sheet owner can clear ${esc(nameOf(id))}'s cell in column F of the Runners tab; then tap the name again here.</p>
    </section>`;
  }
  const lost=LINKLOST&&RUNNERS[LINKLOST]?`<div class="banner">This phone is no longer linked to ${esc(nameOf(LINKLOST))}. That usually means the profile was linked again on another phone. Tap the name below to enter a device code.</div>`:'';
  const pick=ids.length&&!UI.newRunner?`${lost}<section class="card join">
    <div><h2>Who's on this phone?</h2><p class="muted">Pick your name to log your own workouts here. A name with a lock is already linked to someone's phone and needs that phone's device code.</p></div>
    <div class="who">${ids.map(id=>{const lk=RUNNERS[id].locked&&!keyFor(id);return `<button type="button" data-iam="${esc(id)}"><span class="av" style="--c:${colorOf(id)}">${esc(initial(nameOf(id)))}</span>I'm ${esc(nameOf(id))}${lk?' <span aria-label="linked to another phone">🔒</span>':''}</button>`}).join('')}</div>
    <div class="actions"><button class="btn small" id="newRunnerBtn">I'm new: join the Kru</button></div>
  </section>`:'';
  if(pick) return pick;
  const J=UI.join;
  const seg=(k,opts)=>`<div class="seg">${opts.map(([v,l])=>`<button type="button" data-j="${k}" data-v="${v}" aria-pressed="${J[k]==v}">${l}</button>`).join('')}</div>`;
  return `<section class="card join">
    <div><h2>Join the Kru</h2><p class="muted">Get your own plan aimed at May 15. Everyone with the link sees your plan and completed workouts; your pain ratings stay private to you.</p></div>
    <label class="field" for="j-name"><span>Your first name</span><input type="text" id="j-name" maxlength="24" value="${esc(J.name)}" placeholder="First name" autocomplete="given-name"></label>
    <div class="field"><span>Where are you starting?</span>${seg('entry',[[0,'Not running yet'],[1,'Can run 30 min'],[2,'Can run a 10K']])}<small>Your start date: ${fmtDate(parse(defaultStart(J.entry)))}, timed so the plan ends on race day.</small></div>
    <div class="field"><span>Run days per week</span>${seg('runDays',[[3,'3 runs + 2 cross'],[2,'2 runs + 3 cross']])}<small>You can choose which days in Setup after joining.</small></div>
    <div class="actions"><button class="btn primary" id="joinBtn">Join</button>${ids.length?'<button class="btn" id="backPick">Back</button>':''}</div>
  </section>`;
}
function bindJoin(){
  view.querySelectorAll('[data-iam]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.iam, r=RUNNERS[id];
    if(r.locked&&!keyFor(id)){UI.codeFor=id;ERR='';render();return}
    b.disabled=true;
    if(await claim(id)){UI.tab='today';UI.sel=null}
    render();
  });
  const cb=document.getElementById('codeBtn'); if(cb){
    const inp=document.getElementById('j-code');
    cb.onclick=async()=>{const k=normKey(inp.value);if(k.length<12){inp.focus();return}cb.disabled=true;cb.textContent='Linking…';
      if(await claim(UI.codeFor,k)){UI.codeFor=null;UI.tab='today';UI.sel=null}render()};
    document.getElementById('codeBack').onclick=()=>{UI.codeFor=null;ERR='';render()};
  }
  const nb=document.getElementById('newRunnerBtn'); if(nb) nb.onclick=()=>{UI.newRunner=true;render()};
  const bp=document.getElementById('backPick'); if(bp) bp.onclick=()=>{UI.newRunner=false;render()};
  const n=document.getElementById('j-name'); if(!n)return;
  n.oninput=()=>{UI.join.name=n.value};
  view.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>{UI.join[b.dataset.j]=+b.dataset.v;render()});
  document.getElementById('joinBtn').onclick=async()=>{
    const nm=(UI.join.name||'').trim(); if(!nm){n.focus();return}
    if(Object.values(RUNNERS).some(r=>(r.name||'').toLowerCase()===nm.toLowerCase())){ERR=`${nm} is already in the Kru. Tap Back and pick that name instead.`;render();return}
    const id=newId(), token=newKey(), r=newRunner(nm,UI.join.entry,UI.join.runDays,'std');
    const btn=document.getElementById('joinBtn');btn.disabled=true;btn.textContent='Joining…';
    try{setKey(id,token);ME=id;const all=await apiPost({action:'save',id,token,runner:r});setMe(id);applyServer(all);UI.who=ME;UI.tab='today';UI.sel=null;UI.newRunner=false;ERR=''}
    catch(e){setKey(id,null);ME=null;ERR='Could not join. '+(e.message||'Try again in a moment.')}
    render();
  };
}

/* ---------- log helpers ---------- */
const statusOf=L=>L&&(L.status||(L.done?'done':null))||null;
const isDone=L=>{const s=statusOf(L);return s==='done'||s==='modified'};
const fmtMin=s=>{const m=s/60, w=Math.floor(m), f=m-w;return (f===0.5?(w?w+'½':'½'):(+m.toFixed(1)))+' min'};
function describeIntervals(seg){
  const runs=seg.filter(s=>s[0]==='run');
  if(runs.length===1&&seg.length===1) return `Run ${fmtMin(seg[0][1]).replace(' min',' minutes')} without stopping`;
  const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
  for(let p=2;p<=seg.length/2;p+=2){
    let ok=true;for(let i=0;i<seg.length;i++){if(!same(seg[i],seg[i%p])){ok=false;break}}
    const full=seg.length%p===0, dropped=(seg.length+1)%p===0&&seg[seg.length-1][0]==='run';
    if(ok&&(full||dropped)){
      const rounds=Math.ceil(seg.length/p), parts=seg.slice(0,p).map(s=>`${s[0]} ${fmtMin(s[1])}`).join(', ');
      return `${rounds} rounds: ${parts}${dropped?' (no walk after the last run)':''}`;
    }
  }
  const t=seg.map(s=>`${s[0]} ${fmtMin(s[1])}`).join(', ');return t.charAt(0).toUpperCase()+t.slice(1);
}
function sessionTitle(r){
  if(r.kind!=='interval') return runTitle(r);
  const tot=Math.round(fullSegs(r).reduce((a,s)=>a+s[1],0)/60), run=runSeconds(r.seg)/60;
  return r.seg.length===1?`${run}-minute continuous run`:`${tot}-minute run/walk`;
}
const sessMin=r=>Math.round(fullSegs(r).reduce((a,s)=>a+s[1],0)/60);
// One wording everywhere: running time first, then the whole session including walks.
const timeLabel=r=>r.kind==='interval'?`${+(runSeconds(r.seg)/60).toFixed(1)} min running · ${sessMin(r)} min total`:runShort(r);
const EFFORT={easy:'Easy: you can speak in full sentences',goal:'Steady: start easy, finish strong',interval:'Easy jog: you can talk in short sentences'};
/* ---------- targets: time or distance, from each runner's settings ---------- */
const MI_M=1609.344;
const KIND_WORD={easy:'easy run',long:'long run',goal:'goal run',race:'race'};
const paceOf=r=>(r&&r.pace>0)?r.pace:null;                       // seconds per mile, canonical
const paceIn=(r)=>{const p=paceOf(r);return p?(UNITS==='km'?p/1.609344:p):null}; // per display unit
const fmtClock=s=>{s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60;return h?`${h}:${pad(m)}:${pad(x)}`:`${m}:${pad(x)}`};
const fmtPace=r=>`${fmtClock(paceIn(r))}/${UNITS==='km'?'km':'mile'}`;
const fmtDur=s=>{const m=Math.round(s/60);return m>=60?`${Math.floor(m/60)} h ${m%60?m%60+' min':''}`.trim():`${m} minute${m===1?'':'s'}`};
const fmtDurShort=s=>{const m=Math.round(s/60);return m>=60?`${Math.floor(m/60)} h ${pad(m%60)} min`:`${m} min`};
const unitNum=mi=>UNITS==='km'?mi*1.609344:mi;
const distAdj=mi=>{const v=+unitNum(mi).toFixed(UNITS==='km'?1:2);return UNITS==='km'?`${+v.toFixed(1)}-km`:`${+v.toFixed(2)}-mile`};
const fmtSegM=m=>m<800?`${m} m`:fmtD(m/MI_M);
const segMeters=(sec,pace)=>Math.max(50,Math.round(sec/pace*MI_M/10)*10);
const roundTo=(x,n)=>Math.round(x/n)*n;

function describeSegs(seg){ // seg: [type, sec, meters?]; walks stay timed
  const lab=s=>s[2]!=null?`${s[0]} ${fmtSegM(s[2])}`:`${s[0]} ${fmtMin(s[1])}`;
  const runs=seg.filter(s=>s[0]==='run');
  if(runs.length===1&&seg.length===1) return seg[0][2]!=null?`Run ${fmtSegM(seg[0][2])} without stopping`:`Run ${fmtMin(seg[0][1]).replace(' min',' minutes')} without stopping`;
  const same=(a,b)=>a[0]===b[0]&&a[1]===b[1]&&a[2]===b[2];
  for(let p=2;p<=seg.length/2;p+=2){
    let ok=true;for(let i=0;i<seg.length;i++){if(!same(seg[i],seg[i%p])){ok=false;break}}
    const full=seg.length%p===0, dropped=(seg.length+1)%p===0&&seg[seg.length-1][0]==='run';
    if(ok&&(full||dropped)){const rounds=Math.ceil(seg.length/p);return `${rounds} rounds: ${seg.slice(0,p).map(lab).join(', ')}${dropped?' (no walk after the last run)':''}`}
  }
  const t=seg.map(lab).join(', ');return t.charAt(0).toUpperCase()+t.slice(1);
}

// Everything the app shows about one run, for one runner on one date.
function planFor(run,r,date){
  const adj=(date&&r.adj&&r.adj[date])||{}, pace=paceOf(r);
  const want=adj.mode||r.target||'time';
  const P={want,mode:want,fallback:'',est:'',adjusted:!!(adj.scale||adj.amount)};
  const WU=' Add a 5-minute warm-up walk and a 5-minute cool-down walk.';
  if(run.kind==='interval'){
    const single=run.seg.length===1, scale=(adj.scale||100)/100;
    let seg=run.seg.map(s=>s[0]==='run'?[s[0],Math.max(15,roundTo(s[1]*scale,5))]:[s[0],s[1]]);
    if(single&&adj.amount&&adj.amountMode==='time') seg=[['run',Math.round(adj.amount)]];
    if(want==='distance'&&!pace){P.mode='time';P.fallback='Add your comfortable pace in Setup to see this workout as distance.'}
    if(P.mode==='distance'){
      if(single&&adj.amount&&adj.amountMode==='distance') seg=[['run',Math.round(adj.amount*pace),Math.round(adj.amount*MI_M)]];
      else seg=seg.map(s=>s[0]==='run'?[s[0],s[1],single?roundTo(s[1]/pace*MI_M,UNITS==='km'?100:80.4672):segMeters(s[1],pace)]:s);
      // estimated seconds follow the rounded distance
      seg=seg.map(s=>s[2]!=null?[s[0],Math.round(s[2]/MI_M*pace),s[2]]:s);
    }
    const runSec=seg.filter(s=>s[0]==='run').reduce((a,s)=>a+s[1],0), runM=seg.filter(s=>s[0]==='run').reduce((a,s)=>a+(s[2]||0),0);
    const tot=runSec+seg.filter(s=>s[0]!=='run').reduce((a,s)=>a+s[1],0)+600;
    P.segs=[['warm',300],...seg,['cool',300]];P.runSec=runSec;P.totSec=tot;P.single=single;
    if(P.mode==='distance'){
      P.title=single?`${distAdj(runM/MI_M)} continuous run`:`Run/walk: ${fmtSegM(runM)} of running`;
      P.sub=describeSegs(seg)+'. Starts and ends with a 5-minute brisk walk.';
      P.est=`Estimated running time: ${fmtDur(runSec)} at your saved ${fmtPace(r)} pace. Walks stay timed.`;
      P.label=`${fmtSegM(runM)} running · ~${Math.round(tot/60)} min total`;
      P.meta=[['Running',fmtSegM(runM)],['Est. total',`~${Math.round(tot/60)} min`]];
    } else {
      P.title=single?`${Math.round(runSec/60)}-minute continuous run`:`${Math.round(tot/60)}-minute run/walk`;
      P.sub=describeSegs(seg)+'. Starts and ends with a 5-minute brisk walk.';
      if(pace) P.est=`About ${fmtD(runSec/pace)} of running at your saved ${fmtPace(r)} pace. Every runner's distance differs; time is the target.`;
      P.label=`${+(runSec/60).toFixed(1)} min running · ${Math.round(tot/60)} min total`;
      P.meta=[['Running',`${+(runSec/60).toFixed(1)} min`],['Total',`${Math.round(tot/60)} min`]];
    }
    return P;
  }
  // distance-based runs (5K → 10K, 10K → 10 mi). The goal run and race stay distance.
  const fixed=run.kind==='race'||run.kind==='goal';
  let mi=run.mi;
  if(adj.amount&&adj.amountMode==='distance') mi=adj.amount;
  if(want==='time'&&!fixed&&!pace){P.mode='distance';P.fallback='Add your comfortable pace in Setup to see this workout as time.'}
  if(fixed) P.mode='distance';
  if(P.mode==='time'){
    const sec=adj.amount&&adj.amountMode==='time'?adj.amount:roundTo(mi*pace,60);
    P.runSec=sec;P.title=`${Math.round(sec/60)}-minute ${KIND_WORD[run.kind]}`+(run.strides?' + strides':'');
    P.est=`About ${fmtD(sec/pace)} at your saved ${fmtPace(r)} pace.`;
    P.label=`${Math.round(sec/60)} min running · ${Math.round(sec/60)+10} min total`;
    P.meta=[['Running',`${Math.round(sec/60)} min`],['Total',`${Math.round(sec/60)+10} min`]];
  } else {
    P.runSec=pace?mi*pace:null;P.mi=mi;
    P.title=`${distAdj(mi)} ${KIND_WORD[run.kind]}`+(run.strides?' + strides':'');
    if(pace) P.est=`Estimated running time: ${fmtDur(mi*pace)} at your saved ${fmtPace(r)} pace.`;
    P.label=`${fmtD(mi)} running`+(pace?` · ~${Math.round(mi*pace/60)+10} min total`:'');
    P.meta=[['Distance',fmtD(mi)],...(pace?[['Est. running',fmtDurShort(mi*pace)]]:[])];
    if(fixed&&want==='time') P.fallback=run.kind==='race'?'Race day is always the full 10 miles.':'The goal run is set by distance.';
  }
  P.sub=runDetail(run)+WU;P.mi=P.mi||mi;
  return P;
}

// Which session sits on a given date for this runner (used when logging).
function sessionOn(r,k){
  const d=parse(k), cw=calWeekR(r,d); if(cw<0) return null;
  const w=progWeekR(r,cw); if(w>=TOTAL) return null;
  return weekDays(w,r,mondayOf(d)).days[(d.getDay()+6)%7];
}
const STR_TITLE='Full-body strength';
function plannedSnapshot(r,k){
  const day=sessionOn(r,k); if(!day) return null;
  if(day.type==='run'){const P=planFor(day.run,r,k);return {title:P.title,label:P.label}}
  if(day.type==='strength') return {title:STR_TITLE,label:'45–55 min'};
  return {title:day.title,label:''};
}

/* ---------- full-body strength session (about 45–55 min) ---------- */
const STRENGTH=[
  {block:'Warm-up',time:'5–7 min',note:'Easy walk or bike, then unloaded squats, hip hinges and calf raises, plus a light practice set of the first exercises.'},
  {block:'A',time:'13–15 min',pair:true,ex:[
    {id:'squat',sets:3,reps:'8–12',top:12,opts:['Goblet squat','Split squat','Leg press'],w:true},
    {id:'row',sets:3,reps:'8–12 per side',top:12,opts:['Supported dumbbell row','Band row'],w:true}]},
  {block:'B',time:'13–15 min',pair:true,ex:[
    {id:'hinge',sets:3,reps:'8–12',top:12,opts:['Dumbbell Romanian deadlift'],w:true},
    {id:'push',sets:3,reps:'8–12',top:12,opts:['Incline push-up','Dumbbell floor press'],w:true}]},
  {block:'C',time:'11–13 min',ex:[
    {id:'calfS',sets:2,reps:'12–15',top:15,opts:['Straight-knee calf raise','Bilateral calf raise','Supported single-leg calf raise'],w:true},
    {id:'calfB',sets:2,reps:'12–15',top:15,opts:['Seated bent-knee calf raise'],w:true},
    {id:'plank',sets:2,reps:'20–30 sec per side',top:30,opts:['Side plank'],w:false,unit:'sec'}]},
  {block:'Finish',time:'3–5 min',note:'Easy walking, then record your weights and reps.'}
];
const exSets=(r,ex,b)=>(r.strSets===2&&b.pair)?2:ex.sets;
const wUnit=r=>r.wUnit==='kg'?'kg':'lb';
function lastEx(r,k,id){
  const logs=r.logs||{};
  const prev=Object.keys(logs).filter(d=>d<k&&logs[d]&&logs[d].ex&&logs[d].ex[id]&&(logs[d].ex[id].w!=null||logs[d].ex[id].r!=null)).sort();
  if(!prev.length) return null;
  const d=prev[prev.length-1];return {date:d,...logs[d].ex[id]};
}
function strengthCard(r,k,own){
  const L=(r.logs||{})[k]||{}, E=L.ex||{}, wu=wUnit(r);
  const blocks=STRENGTH.map(b=>{
    if(!b.ex) return `<div class="sblock"><div class="sb-h"><b>${b.block}</b><span class="muted">${b.time}</span></div><p class="muted">${b.note}</p></div>`;
    const rows=b.ex.map(ex=>{
      const e=E[ex.id]||{}, v=e.v||0, sets=exSets(r,ex,b), last=lastEx(r,k,ex.id);
      const ready=last&&last.r>=ex.top&&last.s>=sets&&ex.w&&(last.v||0)===v;
      const lastTxt=last?`Last (${fmtDate(parse(last.date))}): ${last.w!=null&&ex.w?last.w+' '+wu+' × ':''}${last.r!=null?last.r+(ex.unit==='sec'?' sec':''):'–'}${last.s!=null?` · ${last.s}/${sets} sets`:''}`:'';
      const name=ex.opts[v];
      if(!own) return `<div class="exr"><div class="ex-n"><b>${esc(name)}</b><small>${sets} × ${ex.reps}</small></div>${e.r!=null||e.w!=null?`<small class="muted">Logged: ${e.w!=null&&ex.w?e.w+' '+wu+' × ':''}${e.r??'–'}${e.s!=null?` · ${e.s}/${sets} sets`:''}</small>`:''}</div>`;
      return `<div class="exr">
        <div class="ex-n"><b>${esc(name)}</b><small>${sets} × ${ex.reps}</small></div>
        ${ex.opts.length>1?`<label class="ex-sub"><small>Swap for</small><select data-exv="${ex.id}" id="exv-${ex.id}">${ex.opts.map((o,i)=>`<option value="${i}" ${i===v?'selected':''}>${esc(o)}</option>`).join('')}</select></label>`:''}
        ${last?`<small class="ex-last ${ready?'ready':''}">${esc(lastTxt)}${ready?' · Ready to add the smallest weight step':''}</small>`:''}
        <div class="ex-in">
          ${ex.w?`<label for="exw-${ex.id}"><small>Weight (${wu})</small><input type="number" inputmode="decimal" step="0.5" min="0" id="exw-${ex.id}" data-exw="${ex.id}" value="${e.w??''}" placeholder="${last&&last.w!=null?last.w:''}"></label>`:''}
          <label for="exr-${ex.id}"><small>${ex.unit==='sec'?'Seconds':'Reps'}${ex.unit!=='sec'&&/side/.test(ex.reps)?' per side':''}</small><input type="number" inputmode="numeric" min="0" id="exr-${ex.id}" data-exr="${ex.id}" value="${e.r??''}" placeholder="${last&&last.r!=null?last.r:''}"></label>
          <div class="ex-sets"><small>Sets done</small><div class="rts">${Array.from({length:sets+1},(_,i)=>`<button type="button" class="rt" data-exs="${ex.id}" data-v="${i}" aria-pressed="${e.s===i}">${i}</button>`).join('')}</div></div>
        </div>
      </div>`;
    }).join('');
    return `<div class="sblock"><div class="sb-h"><b>Block ${b.block}${b.pair?' · alternate':''}</b><span class="muted">${b.time}</span></div>${rows}</div>`;
  }).join('');
  return `<div class="strength">${blocks}
    <details class="more"><summary>Rest, effort and progression</summary><div class="muted" style="font-size:.9rem;display:flex;flex-direction:column;gap:6px;margin-top:6px">
      <p>Alternate the two exercises in blocks A and B. Take about 30–45 seconds to switch exercises and 60–90 seconds after each pair; rest longer if your form slips.</p>
      <p>Effort: start around RPE 6–7/10 and build toward 7–8, which is about 2–4 good reps left in the tank.</p>
      <p>Progression: when every set reaches the top of the rep range with good control at that effort, add the smallest weight step you have.</p>
      <p>Learning the moves? Switch to 2 sets in Setup; the session finishes a few minutes sooner.</p>
      <p>Equipment: dumbbells, a chair or bench, and an optional resistance band.</p></div></details>
  </div>`;
}
function bindStrength(r,k){
  const put=(id,f,v)=>saveMine({logs:{[k]:{ex:{[id]:{[f]:v}}}}});
  view.querySelectorAll('[data-exv]').forEach(s=>s.onchange=()=>put(s.dataset.exv,'v',+s.value));
  view.querySelectorAll('[data-exw]').forEach(i=>i.onchange=()=>put(i.dataset.exw,'w',i.value===''?null:+i.value));
  view.querySelectorAll('[data-exr]').forEach(i=>i.onchange=()=>put(i.dataset.exr,'r',i.value===''?null:+i.value));
  view.querySelectorAll('[data-exs]').forEach(b=>b.onclick=()=>{const id=b.dataset.exs,v=+b.dataset.v,cur=(((r.logs||{})[k]||{}).ex||{})[id]||{};put(id,'s',cur.s===v?null:v)});
}

function ratingRow(k,label,min,max,val,hint){
  let b='';for(let v=min;v<=max;v++){const z=k==='rpe'?'':v<=2?'g':v<=4?'a':'r';b+=`<button type="button" class="rt ${z}" data-rate="${k}" data-v="${v}" aria-pressed="${val===v}">${v}</button>`}
  return `<div class="rate"><div class="rate-h"><span>${label}</span><span class="${val==null?'need':''}">${val==null?'Not entered':val+'/10'}</span></div><div class="rts" role="group" aria-label="${label}">${b}</div>${hint?`<small class="muted">${hint}</small>`:''}</div>`;
}

function schedulePill(r){
  const d=scheduleDiff(r);
  if(d===0) return {c:'g',t:'Plan ends on race day'};
  if(d<0) return {c:'g',t:`Plan ends ${-d} wk before race`};
  return {c:'a',t:`Plan ends ${d} wk after race`};
}
function weekStatus(r,mon,days,others){
  const logs=r.logs||{}, t=today();
  const runs=[];days.forEach((d,i)=>{if(d.type!=='run')return;const dt=addDays(mon,i),L=logs[iso(dt)];runs.push({i,dt,L})});
  const done=runs.filter(x=>isDone(x.L)), skipped=runs.filter(x=>statusOf(x.L)==='skipped');
  const skipNote=skipped.length?` ${plural(skipped.length,'run')} skipped.`:'';
  if(!done.length) return {c:'',t:skipped.length?'No runs completed yet':'No runs logged yet this week',d:(r.mode==='rtr'?'Log pain during each run and again the next morning.':'Log effort after each run.')+skipNote};
  if(r.mode==='rtr'&&others) return {c:'',t:`${plural(done.length,'run')} completed`,d:'Pain check-ins are private to each runner.'+skipNote};
  if(r.mode==='rtr'){
    const vals=[];const missing=[];let pendingMorning=false;
    done.forEach(x=>{const L=x.L;
      if(L.pain!=null)vals.push(L.pain);else missing.push(`${DOW[x.i]} during`);
      if(L.morning!=null)vals.push(L.morning);else if(dayNum(x.dt)<dayNum(t))missing.push(`${DOW[x.i]} next morning`);else pendingMorning=true;});
    const worst=vals.length?Math.max(...vals):null;
    if(worst!=null&&worst>=5) return {c:'r',t:'Red: step back',d:'Pain reached 5/10 or higher. Stop running this week, drop back one week, and get it assessed if it persists.'};
    if(missing.length) return {c:'',t:'Check-in incomplete',d:`Add pain ratings for: ${missing.join(', ')}. The traffic light needs both ratings for every completed run.`+skipNote};
    if(pendingMorning) return {c:worst>=3?'a':'',t:'Awaiting next-morning check-in',d:`So far: ${worst==null?'no':'worst'} pain ${worst==null?'':worst+'/10 '}during the run${worst>=3?' (caution range)':''}. Rate how it feels tomorrow morning to finish the check-in.`+skipNote};
    const later='';
    if(worst>=3) return {c:'a',t:'Amber: repeat this week',d:'Pain of 3–4/10 is acceptable if it settles within 24 hours, but hold here rather than progressing.'+later+skipNote};
    return {c:'g',t:'Green: on track',d:'Pain 0–2/10 and not worse the next morning. Progress as planned.'+later+skipNote};
  }
  const rp=done.map(x=>x.L.rpe).filter(v=>v!=null);
  if(rp.length&&Math.max(...rp)>=8) return {c:'a',t:'Hard week: consider repeating',d:'At least one run felt very hard (RPE 8+). Repeating a week is normal; check the race-day buffer before you do.'+skipNote};
  const noEff=done.length-rp.length;
  return {c:'g',t:'On track',d:(rp.length?'Runs felt manageable. Progress as planned.':'Runs completed. Progress as planned.')+(noEff?` Effort not entered for ${plural(noEff,'run')}.`:'')+skipNote};
}

function renderToday(){
  if(!LOADED){view.innerHTML=`<p class="muted">Loading the Kru…</p>`;return}
  const r=viewing();
  if(!r){view.innerHTML=`<div class="stack">${banners()}${joinCard()||'<p class="muted">Nobody has joined yet.</p>'}</div>`;bindJoin();return}
  const own=isMine(), n=r.runDays, logs=r.logs||{};
  const N=runnerNow(r), {t,cw,pw,notStarted,mon}=N;
  const head=`${banners()}${!mine()?joinCard():''}${whoBar()}`;
  if(N.finished){
    view.innerHTML=`<div class="stack">${head}<div class="card session t-run"><span class="chip">Program complete</span><h2>10 miles: done</h2><p class="muted">All 27 weeks finished. Keep 2–3 easy runs a week plus strength to hold your fitness.</p></div>${timeline(r,TOTAL)}</div>`;
    bindWho();bindJoin();return;
  }
  const {wk,days,raceWeek,moved}=weekDays(pw,r,mon);
  const tDow=(t.getDay()+6)%7;
  if(UI.sel===null) UI.sel=notStarted?1:tDow;
  const day=days[UI.sel], date=addDays(mon,UI.sel), key=iso(date), L=logs[key]||{}, S=statusOf(L);
  const ph=PHASES[wk.ph], st=weekStatus(r,mon,days,!own), held=(r.holds||[]).filter(h=>h===cw).length;
  const isRace=key===RACE&&day.type==='run', isToday=UI.sel===tDow&&!notStarted;
  const past=dayNum(date)<dayNum(t);

  let title=day.title, sub=day.detail, body='', primary='', P=null;
  const snap=L.planned;
  if(day.type==='run'){
    const ru=day.run; P=planFor(ru,r,key);
    title=snap&&statusOf(L)?snap.title:P.title; sub=P.sub;
    const effort=ru.kind==='interval'?EFFORT.interval:ru.kind==='race'||ru.kind==='goal'?EFFORT.goal:EFFORT.easy;
    body=`<div class="meta">${P.meta.map(([a,b])=>`<div><span class="eyebrow">${a}</span><b>${esc(b)}</b></div>`).join('')}<div><span class="eyebrow">Effort</span><b class="word">${effort}</b></div></div>
      ${P.est&&!(snap&&statusOf(L)&&snap.title!==P.title)?`<p class="est">${esc(P.est)}</p>`:''}${P.fallback?`<p class="hint">${esc(P.fallback)}</p>`:''}
      ${snap&&statusOf(L)&&snap.title!==P.title?`<p class="hint">Target saved when you logged this. Current settings would show: ${esc(P.title)}.</p>`:''}`;
    if(ru.kind==='interval'){
      body+=`<div class="segbar" aria-hidden="true">${P.segs.map(s=>`<span class="s-${s[0]}" style="flex:${s[1]}"></span>`).join('')}</div>
      <div class="legend"><span><i class="s-run"></i>Run</span><span><i class="s-walk"></i>Walk</span><span><i class="s-warm"></i>Warm-up / cool-down</span></div>
      <details class="more"><summary>How to run it</summary><p class="muted">${esc(runDetail(ru))}${P.mode==='distance'?' Distance segments: tap "Done with this run" in the timer when you reach the distance; walks are timed.':''}</p></details>`;
      if(own) primary=`<button class="btn primary big" id="startTimer">${S?'Start workout again':'Start workout'}</button>`;
    }
  } else if(day.type==='strength'){
    title=STR_TITLE; sub='About 45–55 minutes including rest. Dumbbells, a chair or bench, and an optional resistance band.';
    body=`<div class="meta"><div><span class="eyebrow">Time</span><b>45–55 min</b></div><div><span class="eyebrow">Effort</span><b class="word">RPE 6–7, building to 7–8 (2–4 good reps left)</b></div></div>${strengthCard(r,key,own)}`;
  }
  const statusBtns=own&&day.type!=='rest'?`<div class="field"><span class="eyebrow">${S?'Logged as':'Log this '+(day.type==='run'?'run':'session')}</span><div class="seg status-seg">
      <button type="button" data-st="done" aria-pressed="${S==='done'}">Done as planned</button>
      <button type="button" data-st="modified" aria-pressed="${S==='modified'}">Done, modified</button>
      <button type="button" data-st="skipped" aria-pressed="${S==='skipped'}">Skipped</button></div>
      ${S==='modified'?`<label class="field" for="f-note"><small>What changed? (optional)</small><input type="text" id="f-note" maxlength="80" value="${esc(L.note||'')}" placeholder="e.g. walked the last 2 intervals"></label>`:''}</div>`:'';
  const b2b=backToBack(days);
  const canMove=own&&!raceWeek&&!S&&day.type!=='rest';
  const moveUI=own&&!raceWeek?`<div class="move">
      ${canMove?(UI.moving?`<span class="eyebrow">Move ${esc(day.title.toLowerCase())} to</span><div class="seg">${days.map((d,i)=>{if(i===UI.sel)return '';const lg=statusOf(logs[iso(addDays(mon,i))]);return `<button type="button" data-mv="${i}" ${lg?'disabled':''} title="${lg?'Already logged':''}">${DOW[i]} <small>${esc(d.type==='rest'?'rest':d.title)}</small></button>`}).join('')}</div><small class="muted">The two days swap. Days you've already logged can't be swapped.</small><button class="btn small" id="mvCancel" type="button">Cancel</button>`:`<button class="btn small" id="mvStart" type="button">Move to another day</button>`):''}
      ${moved&&!((r.swaps||{})[iso(mon)]||[]).flat().some(i=>statusOf(logs[iso(addDays(mon,i))]))?`<button class="btn small" id="mvReset" type="button">Undo this week's moves</button>`:''}
    </div>`:'';
  const adjNow=(r.adj||{})[key]||null;
  let adjUI='';
  if(own&&day.type==='run'&&!S&&!isRace){
    if(UI.adjusting===key){
      const D=UI.adjDraft, ru=day.run, single=ru.kind!=='interval'||ru.seg.length===1;
      const unit=D.mode==='distance'?(UNITS==='km'?'km':'mi'):'min';
      const fixed=ru.kind==='goal';
      adjUI=`<div class="adjust"><span class="eyebrow">Adjust this run</span>
        ${fixed?'<small class="muted">The goal run is measured by distance.</small>':`<div class="field"><small>Show as</small><div class="seg">${[['time','Time'],['distance','Distance']].map(([v,l])=>`<button type="button" data-ad="mode" data-v="${v}" aria-pressed="${D.mode===v}">${l}</button>`).join('')}</div>${D.mode==='distance'&&!paceOf(r)&&ru.kind==='interval'?'<small class="hint">Add your comfortable pace in Setup first; distance segments are estimated from it.</small>':''}${D.mode==='time'&&!paceOf(r)&&ru.kind!=='interval'?'<small class="hint">Add your comfortable pace in Setup first; time is estimated from it.</small>':''}</div>`}
        ${single?`<label class="field" for="ad-amt"><small>Running target for this workout (${unit})</small><input type="number" inputmode="decimal" step="${unit==='min'?1:0.1}" min="0" id="ad-amt" value="${D.amount??''}" placeholder="${D.ph??''}"></label>`:`<div class="field"><small>Run segments for this workout</small><div class="seg">${[75,90,100,110,125].map(v=>`<button type="button" data-ad="scale" data-v="${v}" aria-pressed="${(D.scale||100)===v}">${v}%</button>`).join('')}</div><small class="muted">Walk recoveries stay the same.</small></div>`}
        <div class="field"><small>Apply</small><div class="seg">${[['this','This workout only'],['future','This and future workouts']].map(([v,l])=>`<button type="button" data-ad="scope" data-v="${v}" aria-pressed="${D.scope===v}">${l}</button>`).join('')}</div>
          <small class="muted">${D.scope==='future'?'Future workouts switch to '+(D.mode==='time'?'time':'distance')+' targets. The amount above applies to this workout only; completed logs keep the target they had.':'Only this date changes.'}</small></div>
        <div class="actions"><button class="btn primary small" id="adSave" type="button">Save</button><button class="btn small" id="adCancel" type="button">Cancel</button>${adjNow?'<button class="btn small" id="adReset" type="button">Reset to plan</button>':''}</div>
      </div>`;
    } else adjUI=`<div class="actions"><button class="btn small" id="adStart" type="button">Adjust this run</button>${adjNow?'<span class="muted" style="font-size:.82rem">Adjusted for this date</span>':''}</div>`;
  }
  const actuals=own&&day.type==='run'&&isDone(L)?`<div class="actuals"><span class="eyebrow">What you actually did</span>
      <div class="ex-in">
        <label for="f-dist"><small>Distance (${UNITS==='km'?'km':'mi'})</small><input type="number" inputmode="decimal" step="0.01" min="0" id="f-dist" value="${L.dist!=null?+unitNum(L.dist).toFixed(2):''}" placeholder="from watch, treadmill or route"></label>
        <label for="f-dur"><small>Running time (min or h:mm:ss)</small><input type="text" inputmode="decimal" id="f-dur" value="${L.dur!=null?fmtClock(L.dur):''}" placeholder="e.g. 24:30"></label>
      </div>
      ${L.dist>0&&L.dur>0?`<small class="muted">Your pace: ${fmtClock(UNITS==='km'?L.dur/(L.dist*1.609344):L.dur/L.dist)}/${UNITS==='km'?'km':'mile'}${Math.abs((paceOf(r)||0)-L.dur/L.dist)>3?` · <button type="button" class="linkbtn" id="usePace">Save as my comfortable pace</button>`:' · matches your saved pace'}</small>`:'<small class="muted">Optional. Measure with a watch, treadmill, or a route of known length.</small>'}
    </div>`:'';
  const ro=!own&&day.type!=='rest'?`<p class="ro">${S==='skipped'?'Skipped':S==='modified'?'Done, modified'+(L.note?`: ${esc(L.note)}`:''):S?'Completed':'Not logged yet'}${L.dist!=null?` · ${fmtD(L.dist)}`:''}${L.dur!=null?` in ${fmtDurShort(L.dur)}`:''}${L.rpe!=null?` · effort ${L.rpe}/10`:''}${L.pain!=null?` · pain ${L.pain}/10`:''}${L.morning!=null?` · next morning ${L.morning}/10`:''}</p>`:'';
  const ratings=own&&day.type==='run'&&isDone(L)?`<div class="logs">
      ${ratingRow('rpe','Effort (RPE)',1,10,L.rpe??null,'1 = very easy, 4 = easy talking pace, 8+ = can\'t talk')}
      ${r.mode==='rtr'?ratingRow('pain','Pain during the run',0,10,L.pain??null,'0–2 fine · 3–4 caution · 5+ stop')+ratingRow('morning','Pain the next morning',0,10,L.morning??null,past?'':'Come back tomorrow morning to enter this.'):''}
    </div>`:'';

  view.innerHTML=`<div class="stack">
    ${head}
    <p class="where">${own?'':esc(nameOf(UI.who))+' · '}Week ${pw+1} of ${TOTAL} · ${ph.name}, week ${wk.wip}${notStarted?` · starts ${fmtDate(mon)}`:''}</p>
    <section class="card session t-${day.type}">
      <span class="chip">${DOW[UI.sel]} ${fmtDate(date)} · ${isRace?'Race day':day.title}${isToday?' · today':''}${day.movedFrom!=null?' · moved from '+DOW[day.movedFrom]:''}</span>
      <h2>${esc(title)}</h2>
      <p class="sub">${esc(sub)}</p>
      ${primary?`<div class="actions">${primary}</div>`:''}
      ${body}
      ${adjUI}
      ${statusBtns}${ro}
      ${actuals}
      ${ratings}
      ${b2b&&own?`<p class="warnline">Heads up: ${DOW[b2b[0]]} and ${DOW[b2b[1]]} are back-to-back run days this week. Keep both easy, or move one.</p>`:''}
      ${moveUI}
    </section>
    ${wk.note?`<p class="muted" style="font-size:.9rem">${wk.note}</p>`:''}
    <div class="stack" style="gap:8px">
      <h3>${own?'This week':esc(nameOf(UI.who))+"'s week"}</h3>
      <div class="week">${days.map((d,i)=>{const dd=addDays(mon,i),k=iso(dd),Ld=logs[k],s=statusOf(Ld);
        const mark=s==='skipped'?'<span aria-hidden="true">–</span>':s?CHECK:'';
        const cls=s==='skipped'?'skip':s?'on':'';
        return `<div class="day t-${d.type} ${i===UI.sel?'sel':''} ${i===tDow&&!notStarted?'today':''}" role="button" tabindex="0" data-sel="${i}">
          <div class="dn">${DOW[i]}<small>${fmtDate(dd)}</small></div>
          <div class="what"><span class="chip">${k===RACE&&d.type==='run'?'Race day':d.title}</span><span>${esc(d.type==='run'?((Ld&&Ld.planned&&s)?Ld.planned.label:planFor(d.run,r,k).label):d.type==='rest'?d.detail.split(/[,.]/)[0]:d.type==='cross'?['20–30','30–40','40–50'][wk.ph]+' min low-impact cardio':'Full-body strength · 45–55 min')}</span></div>
          ${d.type==='rest'?'<span></span>':own?`<button class="check ${cls}" data-done="${k}" aria-label="${s?DOW[i]+' logged as '+s+'; tap to clear':'Mark '+DOW[i]+' done'}">${mark}</button>`:`<span class="check ${cls}" aria-label="${s||'Not logged'}">${mark}</span>`}</div>`}).join('')}</div>
    </div>
    <section class="card">
      <h3>Weekly check-in</h3>
      <div class="light"><span class="dot ${st.c}"></span><div><b>${st.t}</b><p class="muted" style="font-size:.9rem">${st.d}</p></div></div>
      ${own&&!notStarted?`<div class="actions">
        <button class="btn small" id="holdRepeat">Repeat this week next week</button>
        <button class="btn small" id="holdBack">Step back one week</button>
        ${held?`<button class="btn small" id="holdUndo">Undo (${held} held)</button>`:''}
      </div><p class="muted" style="font-size:.82rem">Each repeat pushes your finish one week later. ${scheduleDiff(r)<0?`You have ${plural(-scheduleDiff(r),'spare week')} before May 15.`:'You have no spare weeks before May 15; start earlier in Setup to build some.'}</p>`:''}
    </section>
    ${timeline(r,pw)}
  </div>`;

  bindWho();bindJoin();
  view.querySelectorAll('[data-sel]').forEach(el=>{
    const go=()=>{UI.sel=+el.dataset.sel;UI.moving=false;render()};
    el.addEventListener('click',go);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
  });
  if(!own)return;
  view.querySelectorAll('[data-done]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();toggle(b.dataset.done)}));
  view.querySelectorAll('[data-st]').forEach(b=>b.onclick=()=>setStatus(key,b.dataset.st));
  view.querySelectorAll('[data-rate]').forEach(b=>b.onclick=()=>{const k=b.dataset.rate,v=+b.dataset.v;saveMine({logs:{[key]:{[k]:L[k]===v?null:v}}})});
  const sk=iso(mon), cur=()=>((r.swaps||{})[sk]||[]).map(x=>[...x]);
  const ms=document.getElementById('mvStart'); if(ms) ms.onclick=()=>{UI.moving=true;render()};
  const mc=document.getElementById('mvCancel'); if(mc) mc.onclick=()=>{UI.moving=false;render()};
  view.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{const to=+b.dataset.mv;UI.moving=false;const from=UI.sel;UI.sel=to;saveMine({swaps:{[sk]:[...cur(),[from,to]]}})});
  const mr=document.getElementById('mvReset'); if(mr) mr.onclick=()=>{UI.moving=false;saveMine({swaps:{[sk]:[]}})};
  const nt=document.getElementById('f-note'); if(nt) nt.onchange=()=>saveMine({logs:{[key]:{note:nt.value.trim()}}});
  const tb=document.getElementById('startTimer'); if(tb) tb.onclick=()=>openTimer(P.segs,P.title,key);
  if(day.type==='strength') bindStrength(r,key);
  const fd=document.getElementById('f-dist'); if(fd) fd.onchange=()=>{const v=parseFloat(fd.value);saveMine({logs:{[key]:{dist:isFinite(v)&&v>0?(UNITS==='km'?v/1.609344:v):null}}})};
  const fu=document.getElementById('f-dur'); if(fu) fu.onchange=()=>{saveMine({logs:{[key]:{dur:parseDur(fu.value)}}})};
  const up=document.getElementById('usePace'); if(up) up.onclick=()=>saveMine({pace:Math.round(L.dur/L.dist)});
  const as=document.getElementById('adStart'); if(as) as.onclick=()=>{const ru=day.run,a=(r.adj||{})[key]||{},Pp=planFor(ru,r,key);
    const mode=Pp.mode;UI.adjusting=key;UI.adjDraft={mode,scope:'this',scale:a.scale||100,amount:a.amount?(a.amountMode==='distance'?+unitNum(a.amount).toFixed(2):Math.round(a.amount/60)):null,ph:mode==='distance'?(Pp.mi?+unitNum(Pp.mi).toFixed(2):(Pp.segs?+unitNum(Pp.segs.reduce((x,s)=>x+(s[0]==='run'&&s[2]?s[2]:0),0)/MI_M).toFixed(2):'')):Math.round(Pp.runSec/60)};render()};
  const ac=document.getElementById('adCancel'); if(ac) ac.onclick=()=>{UI.adjusting=null;render()};
  const ar=document.getElementById('adReset'); if(ar) ar.onclick=()=>{UI.adjusting=null;saveMine({adj:{[key]:null}})};
  view.querySelectorAll('[data-ad]').forEach(b=>b.onclick=()=>{const f=b.dataset.ad,v=b.dataset.v;const amt=document.getElementById('ad-amt');if(amt)UI.adjDraft.amount=amt.value===''?null:+amt.value;
    if(f==='mode'&&v!==UI.adjDraft.mode){UI.adjDraft.amount=null;const Pp=planFor(day.run,{...r,target:v,adj:{}},null);UI.adjDraft.ph=v==='distance'?(Pp.mi?+unitNum(Pp.mi).toFixed(2):''):Math.round(Pp.runSec/60)}
    UI.adjDraft[f]=f==='scale'?+v:v;render()});
  const asv=document.getElementById('adSave'); if(asv) asv.onclick=()=>{
    const D=UI.adjDraft, amtEl=document.getElementById('ad-amt'), raw=amtEl&&amtEl.value!==''?+amtEl.value:null;
    const a={mode:D.scope==='future'?null:D.mode};
    if(raw>0){a.amountMode=D.mode;a.amount=D.mode==='distance'?(UNITS==='km'?raw/1.609344:raw):raw*60}else{a.amount=null;a.amountMode=null}
    a.scale=D.scale&&D.scale!==100?D.scale:null;
    const empty=!a.mode&&!a.amount&&!a.scale;
    UI.adjusting=null;
    saveMine(D.scope==='future'?{target:D.mode,adj:{[key]:empty?null:a}}:{adj:{[key]:empty?null:a}});
  };
  const holds=()=>[...(r.holds||[])];
  const hr=document.getElementById('holdRepeat'); if(hr) hr.onclick=()=>saveMine({holds:[...holds(),cw]});
  const hb=document.getElementById('holdBack'); if(hb) hb.onclick=()=>saveMine({holds:[...holds(),cw,cw]});
  const hu=document.getElementById('holdUndo'); if(hu) hu.onclick=()=>{const h=holds(),i=h.lastIndexOf(cw);if(i>-1)h.splice(i,1);saveMine({holds:h})};
}
function setStatus(k,s){const cur=statusOf((mine().logs||{})[k]);const next=cur===s?null:s;saveMine({logs:{[k]:{status:next,done:next==='done'||next==='modified',planned:next?plannedSnapshot(mine(),k):null}}})}
function toggle(k){const s=statusOf((mine().logs||{})[k]);saveMine({logs:{[k]:s?{status:null,done:false,planned:null}:{status:'done',done:true,planned:plannedSnapshot(mine(),k)}}})}
function parseDur(v){v=String(v||'').trim();if(!v)return null;if(/^\d+(\.\d+)?$/.test(v))return Math.round(parseFloat(v)*60);const p=v.split(':').map(Number);if(p.some(x=>!isFinite(x)))return null;return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+(p[1]||0)}
function timeline(r,pw){
  const sp=schedulePill(r);
  return `<section class="stack" style="gap:8px"><div class="tl-h"><span class="eyebrow">Plan timeline · moves with the calendar</span><span class="pill ${sp.c}">${sp.t}</span></div>${ladder(pw)}</section>`;
}

function renderCrew(){
  const t=today(), days=Math.max(0,dayNum(parse(RACE))-dayNum(t));
  const ids=orderedIds();
  const cards=ids.map(id=>{
    const r=RUNNERS[id], N=runnerNow(r), sp=schedulePill(r);
    let weekHtml='', summary='', counts='', st={c:'',t:''};
    if(N.finished){summary='Program complete';}
    else{
      const {wk,days:ds}=weekDays(N.pw,r,N.mon), logs=r.logs||{};
      const tDow=(t.getDay()+6)%7;
      const c={run:[0,0],cross:[0,0],strength:[0,0]};
      ds.forEach((d,j)=>{if(!c[d.type])return;c[d.type][1]++;if(isDone(logs[iso(addDays(N.mon,j))]))c[d.type][0]++});
      weekHtml=`<div class="sq">${ds.map((d,j)=>{const k=iso(addDays(N.mon,j)),s=statusOf(logs[k]);return `<span class="t-${d.type} ${d.type==='rest'?'rest':''} ${s==='skipped'?'skip':s?'on':''} ${j===tDow&&!N.notStarted?'tod':''}" title="${DOW[j]}: ${esc(d.type==='run'?sessionTitle(d.run):d.title)}${s?' ('+s+')':''}">${DOW[j].charAt(0)}</span>`}).join('')}</div>`;
      const wkMi=ds.reduce((a,d,j)=>{const Lg=logs[iso(addDays(N.mon,j))];return a+(d.type==='run'&&Lg&&Lg.dist?Lg.dist:0)},0);
      counts=`<div class="counts"><span><b>${c.run[0]} of ${c.run[1]}</b> runs</span>${wkMi?`<span><b>${fmtD(wkMi)}</b> logged</span>`:''}<span><b>${c.cross[0]} of ${c.cross[1]}</b> cross</span><span><b>${c.strength[0]} of ${c.strength[1]}</b> strength</span></div>`;
      st=weekStatus(r,N.mon,ds,id!==ME);
      summary=N.notStarted?`Starts ${fmtDate(N.mon)} · ${PHASES[wk.ph].name}`:`This week · ${PHASES[wk.ph].name}, week ${wk.wip} of ${PHASES[wk.ph].weeks}`;
    }
    const all=Object.values(r.logs||{}).filter(isDone).length;
    const ms=milestone(r);
    return `<button type="button" class="rc" data-open="${esc(id)}">
      <div class="rc-h"><span class="nm"><span class="av" style="--c:${colorOf(id)}">${esc(initial(nameOf(id)))}</span><b>${esc(nameOf(id))}</b>${id===ME?'<span class="muted" style="font-size:.8rem">you</span>':''}</span><span class="mono muted" style="font-size:.8rem">${plural(all,'session')} done</span></div>
      <span class="muted" style="font-size:.86rem">${summary}</span>
      ${counts}
      ${weekHtml}
      ${ms?`<span class="ms">${esc(ms)}</span>`:''}
      ${st.t?`<span class="muted" style="font-size:.82rem"><span class="dot ${st.c}" style="display:inline-block;width:9px;height:9px;margin:0 6px 0 0;vertical-align:0"></span>${esc(st.t)}</span>`:''}
      <div class="tl-h"><span class="eyebrow">Plan timeline</span><span class="pill ${sp.c}">${sp.t}</span></div>
      ${ladder(Math.min(TOTAL,N.pw))}
    </button>`;
  }).join('');
  view.innerHTML=`<div class="stack">
    ${banners()}
    <section class="card race">
      <div><span class="eyebrow">Race day</span><h2 style="font-size:2rem">Sat, May 15, 2027</h2><p class="muted">10 miles. Plans that start Nov 9 finish on race morning.</p></div>
      <div class="count">${days}<small>days to go</small></div>
    </section>
    ${joinCard()}
    ${!LOADED?'<p class="muted">Loading the Kru…</p>':ids.length?`<div class="crew">${cards}</div>`:'<p class="muted">Nobody has joined yet. Join above, then share this page with your Kru.</p>'}
    ${LOADED&&!LOCAL?'<p class="muted" style="font-size:.82rem">Everyone with the link sees each other\'s plans and logs. Refreshes every minute.</p>':''}
  </div>`;
  bindJoin();
  view.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{UI.who=b.dataset.open;UI.sel=null;UI.tab='today';render()});
}
// Most recent milestone reached through completed workouts, not the calendar.
function milestone(r){
  const logs=r.logs||{}, keys=Object.keys(logs).filter(k=>isDone(logs[k])).sort();
  if(!keys.length) return '';
  let best='';
  const startMon=startMonR(r);
  keys.forEach(k=>{
    const d=parse(k), cw=calWeekR(r,d); if(cw<0)return;
    const w=progWeekR(r,cw), dow=(d.getDay()+6)%7, {days}=weekDays(w,r,mondayOf(d)), day=days[dow];
    if(!day||day.type!=='run')return;
    const ru=day.run;
    if(ru.kind==='interval'&&ru.seg.length===1) best=`First ${runSeconds(ru.seg)/60}-minute continuous run`;
    if(ru.kind==='goal') best='Finished the 10K goal run';
    if(ru.kind==='race') best='Ran 10 miles on race day';
    if(ru.kind==='long'&&ru.mi>=5) best=`Longest run so far: ${fmtD(ru.mi)}`;
  });
  if(!best) best=`${plural(keys.length,'workout')} logged`;
  return best;
}

function renderPlan(){
  if(!LOADED){view.innerHTML=`<p class="muted">Loading…</p>`;return}
  const r=viewing()||{entry:0,runDays:3,start:defaultStart(0),holds:[]};
  const N=runnerNow(r), cur=N.notStarted?-1:N.pw, focus=N.notStarted?STARTS[r.entry]:N.pw;
  const S0=schedOf(r), runDow=runDaysOf(r).map(d=>DOW[d]), runDowBase=runDow, nm=a=>[...a].sort((x,y)=>x-y).map(d=>DOW[d]).join(' and ');
  const weekMon={};for(let cw=0;cw<80;cw++){const w=progWeekR(r,cw);if(w>=TOTAL)break;if(weekMon[w]==null)weekMon[w]=addDays(startMonR(r),cw*7)}
  view.innerHTML=`<div class="stack" style="gap:20px">
    ${whoBar()}
    <p class="muted" style="max-width:65ch">${viewing()?esc(nameOf(UI.who))+': ':''}${r.runDays} runs a week on ${runDow.join(', ')}. ${S0.cross.length?'Cross-training on '+nm(S0.cross)+', s':'S'}trength on ${nm(S0.strength)}. Each run shows ${(r.target||'time')==='distance'?'running distance':'running time'}, then total time including the warm-up and cool-down walks.${paceOf(r)?'':' Save a comfortable pace in Setup to see estimates.'} Race week is fixed for everyone: runs on Tue${r.runDays===3?', Thu':''} and the race on Saturday.</p>
    ${PHASES.map((p,pi)=>{
      if(STARTS[pi]+p.weeks<=STARTS[r.entry]) return `<section class="phase"><header><h2 class="muted">${p.name}</h2><span class="muted" style="font-size:.88rem">Skipped: starting at ${PHASES[r.entry].name}</span></header></section>`;
      const here=focus>=STARTS[pi]&&focus<STARTS[pi]+p.weeks, done=focus>=STARTS[pi]+p.weeks;
      let rows='';
      for(let w=STARTS[pi];w<STARTS[pi]+p.weeks;w++){
        const wk=weekInfo(w), rs=pickRuns(wk.runs,r.runDays), m=weekMon[w], runDow=w===TOTAL-1?(r.runDays===3?['Tue','Thu','Sat']:['Tue','Sat']):runDowBase;
        const Ps=rs.map(x=>planFor(x,r,null)), dm=Ps.every(q=>q.mode==='distance');
        const tot=dm?`Week: ${fmtD(Ps.reduce((a,q)=>a+(q.mi||(q.segs?q.segs.reduce((m,z)=>m+(z[2]||0),0)/MI_M:0)),0))} running`:`Week: ${+(Ps.reduce((a,q)=>a+(q.runSec||0),0)/60).toFixed(1)} min running`;
        rows+=`<div class="wrow ${w<cur?'past':''} ${w===cur?'cur':''}">
          <div class="wk">Wk ${wk.wip}<small>${m?fmtDate(m):'#'+(w+1)}${w===cur?' · now':''}</small></div>
          <div class="runs">${rs.map((x,i)=>`<span class="${i===rs.length-1?'key':''}" title="${esc(x.kind==='interval'?describeIntervals(x.seg):runTitle(x))}"><b>${runDow[i]}</b> ${esc(planFor(x,r,null).label)}</span>`).join('')}</div>
          <div class="tot">${tot}</div>
          ${wk.note?`<div class="note">${wk.note}</div>`:''}
          ${pi===0&&w===cur?`<div class="note">${rs.map((x,i)=>`${runDow[i]}: ${esc(planFor(x,r,null).sub.replace(/\. Starts and ends.*$/,''))}`).join('<br>')}</div>`:''}
        </div>`;
      }
      return `<details class="phase" ${here?'open':''}><summary><span class="ph-t"><h2>${p.name}</h2><span class="muted" style="font-size:.88rem">${p.weeks} weeks · ${done?'done by the calendar':here?'you are here':'coming up'} · goal: ${p.goal}</span></span></summary><div class="stack" style="gap:8px">${rows}</div></details>`;
    }).join('')}
  </div>`;
  bindWho();
}

const READY_ITEMS=[
  'Walk briskly for 30 minutes with no pain during or afterward',
  'Pain 0–2/10 with daily activity; no swelling or limping',
  '20–25 single-leg calf raises on each side, roughly symmetrical',
  '10 single-leg squats or step-downs per side with good knee control and no pain',
  'Stand on one leg for 30 seconds per side',
  '10 single-leg hops per side, then jog in place for 2 minutes, both pain-free',
  'Cleared to run by a physical therapist or physician, if coming back from injury or surgery'
];
function renderGuide(){
  const me=mine(), ready=(me&&me.ready)||{};
  view.innerHTML=`<div class="stack" style="gap:22px">
  <section class="card"><div class="prose">
    <h2>How the program works</h2>
    <p>Three phases, 27 weeks, timed to finish on race day, Saturday May 15: Couch → 5K (9 weeks of run/walk intervals), 5K → 10K (8 weeks), and 10K → 10 miles (10 weeks). Each week has 2 or 3 runs, never on back-to-back days, plus 2–3 days of cross-training and strength.</p>
    <p>Weekly running volume rises gradually, with cutback weeks built in. Large week-to-week jumps in running distance are associated with a higher risk of running-related injury, so the plan avoids them. Couch → 5K is measured in time: it builds to 30 minutes of running, which is a different distance for each person. Later phases are written in distance; with a comfortable pace saved, you can see any run as time or distance. Repeating a week is part of the plan; start a week or two before Nov 9 if you want buffer for holidays or illness.</p>
  </div></section>

  <section class="card"><div class="prose">
    <h2>Progression rules</h2>
    <p>Based on the pain-monitoring model used in tendon and return-to-run rehab. Turn on Return to run mode in Setup to log pain during each run and the next morning.</p>
  </div>
  <div class="tbl"><table>
    <tr><th>Zone</th><th>What you notice</th><th>What to do</th></tr>
    <tr><td><span class="light"><span class="dot g"></span><b>Green</b></span></td><td>Pain 0–2/10; next morning no worse than usual</td><td>Progress to next week</td></tr>
    <tr><td><span class="light"><span class="dot a"></span><b>Amber</b></span></td><td>Pain 3–4/10 that settles within 24 h</td><td>Repeat the current week</td></tr>
    <tr><td><span class="light"><span class="dot r"></span><b>Red</b></span></td><td>Pain ≥5/10, limping, swelling, or worse next morning</td><td>Stop, rest 2–3 days, drop back one week; get it assessed if it persists</td></tr>
  </table></div></section>

  <section class="card"><div class="prose">
    <h2>Ready to run?</h2>
    <p>Commonly used clinical criteria before starting a return-to-run program. ${me?'Your ticks are saved to your plan.':'Join the Kru to save your ticks.'}</p>
    <div style="display:flex;flex-direction:column;gap:10px">${READY_ITEMS.map((t,i)=>`<label class="chk" for="r${i}"><input type="checkbox" id="r${i}" data-r="${i}" ${ready[i]?'checked':''} ${me?'':'disabled'}><span>${t}</span></label>`).join('')}</div>
    <p class="muted" id="readyCount" style="font-size:.88rem"></p>
  </div></section>

  <section class="card"><div class="prose"><h2>Effort guide</h2></div>
  <div class="tbl"><table>
    <tr><th>RPE</th><th>Feels like</th><th>Talk test</th><th>Use for</th></tr>
    <tr><td class="mono">2–3</td><td>Very easy</td><td>Full conversation</td><td>Warm-up, walk breaks</td></tr>
    <tr><td class="mono">3–4</td><td>Easy, relaxed</td><td>Full sentences</td><td>Easy and long runs</td></tr>
    <tr><td class="mono">4–5</td><td>Comfortable effort</td><td>Short sentences</td><td>Run/walk intervals, cross-training</td></tr>
    <tr><td class="mono">6–7</td><td>Moderately hard</td><td>A few words</td><td>Strides, final stretch of a goal run</td></tr>
    <tr><td class="mono">8+</td><td>Hard</td><td>Can't talk</td><td>Avoid in this plan</td></tr>
  </table></div></section>

  <section class="card"><div class="prose"><h2>Full-body strength</h2><p>One or two sessions a week, about 45–55 minutes each including rest. It covers the major movement patterns, includes upper-body work, and keeps the calf training runners need. You'll need dumbbells, a chair or bench, and an optional resistance band. The strength day in the app records your weights and reps and shows them next time.</p></div>
  <div class="tbl"><table>
    <tr><th>Block</th><th>Exercises</th><th>Working sets</th><th>About</th></tr>
    <tr><td>Warm-up</td><td>Easy walk or bike, then unloaded squats, hinges, calf raises and light practice sets</td><td>—</td><td class="mono">5–7 min</td></tr>
    <tr><td>A</td><td>Goblet squat + supported dumbbell row (alternate)</td><td class="mono">3 × 8–12 each; rows per side</td><td class="mono">13–15 min</td></tr>
    <tr><td>B</td><td>Dumbbell Romanian deadlift + incline push-up or dumbbell floor press (alternate)</td><td class="mono">3 × 8–12 each</td><td class="mono">13–15 min</td></tr>
    <tr><td>C</td><td>Straight-knee calf raise + seated bent-knee calf raise + side plank</td><td class="mono">Calves 2 × 12–15 each; plank 2 × 20–30 s per side</td><td class="mono">11–13 min</td></tr>
    <tr><td>Finish</td><td>Easy walking; record weights and reps</td><td>—</td><td class="mono">3–5 min</td></tr>
    <tr><td><b>Total</b></td><td></td><td></td><td class="mono"><b>45–55 min</b></td></tr>
  </table></div>
  <div class="prose" style="font-size:.92rem">
    <p class="muted">Times include rest and equipment changes; they're planning estimates.</p>
    <ul>
      <li><b>Rest:</b> about 30–45 seconds to switch exercises and 60–90 seconds after each pair. Rest longer when you need it to keep good form.</li>
      <li><b>Effort:</b> start around RPE 6–7/10 and progress toward 7–8, roughly 2–4 good reps left.</li>
      <li><b>Progression:</b> when every set reaches the top of its rep range with good control at that effort, add the smallest weight step you have.</li>
      <li><b>Learning the moves:</b> start with 2 sets (Setup → Strength sets).</li>
      <li><b>Swaps:</b> split squat or leg press for the goblet squat, band row for the dumbbell row, and bilateral or supported single-leg calf raises.</li>
      <li><b>Scheduling:</b> with Tue/Thu/Sat runs, Monday and Wednesday work well for two sessions and leave Friday free before the long run.</li>
    </ul>
    <p class="src">Based on progressive resistance training principles; ACSM's guidance supports training the major muscle groups at least twice a week with equipment you can use consistently (<a href="https://www.acsm.org/education-resources/trending-topics-resources/physical-activity-guidelines" target="_blank" rel="noopener">acsm.org</a>).</p>
  </div></section>

  <section class="card"><div class="prose">
    <h2>Cross-training options</h2>
    <ul>
      <li><b>Cycling or spin:</b> closest aerobic carryover with almost no impact.</li>
      <li><b>Elliptical:</b> running-like pattern; good on amber weeks.</li>
      <li><b>Pool running or swimming:</b> the best choice if a bone-stress or tendon issue flares.</li>
      <li><b>Rower, incline treadmill walk, hiking, Nordic skiing:</b> all count at RPE 4–5/10.</li>
    </ul>
  </div></section>

  <section class="card"><div class="prose">
    <h2>Sources</h2>
    <ul class="src">
      <li>Run/walk progression modeled on the NHS <a href="https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/" target="_blank" rel="noopener">Couch to 5K</a> program.</li>
      <li>10K and 10-mile phases follow the structure of Hal Higdon's <a href="https://www.halhigdon.com/training/" target="_blank" rel="noopener">novice training programs</a> (3 runs, cross-training, a weekly long run). Distances here are adapted, not his exact schedules.</li>
      <li>Silbernagel KG, et al. Continued sports activity, using a pain-monitoring model, during rehabilitation in patients with Achilles tendinopathy. <i>Am J Sports Med.</i> 2007.</li>
      <li>Nielsen RO, et al. Excessive progression in weekly running distance and risk of running-related injuries. <i>J Orthop Sports Phys Ther.</i> 2014.</li>
      <li>Lauersen JB, et al. The effectiveness of exercise interventions to prevent sports injuries: a systematic review and meta-analysis. <i>Br J Sports Med.</i> 2014.</li>
    </ul>
  </div></section>
  </div>`;
  const upd=()=>{const rd=(mine()&&mine().ready)||{};const n=READY_ITEMS.filter((_,i)=>rd[i]).length;document.getElementById('readyCount').textContent=n===READY_ITEMS.length?'All criteria met. You are ready to start week 1.':`${n} of ${READY_ITEMS.length} criteria met.`};
  view.querySelectorAll('[data-r]').forEach(c=>c.addEventListener('change',()=>saveMine({ready:{[c.dataset.r]:c.checked}})));
  upd();
}

function renderSetup(){
  if(!LOADED){view.innerHTML=`<p class="muted">Loading…</p>`;return}
  const r=mine();
  if(!r){view.innerHTML=`<div class="stack">${banners()}${joinCard()}</div>`;bindJoin();return}
  const DEF={target:'time',strSets:3,wUnit:'lb',units:'mi',mode:'std'};
  const seg=(k,opts)=>`<div class="seg">${opts.map(([v,l])=>`<button type="button" data-k="${k}" data-v="${v}" aria-pressed="${(r[k]??DEF[k])==v}">${l}</button>`).join('')}</div>`;
  const aligned=r.start===defaultStart(r.entry);
  view.innerHTML=`<div class="stack">${banners()}<section class="card" style="gap:22px">
    <h2>Your setup</h2>
    ${LOCAL?'':`<label class="field" for="f-name"><span>Name shown to the Kru</span><input type="text" id="f-name" maxlength="24" value="${esc(r.name||'')}" style="font:inherit;padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);max-width:320px"></label>`}
    <div class="field"><span>Start at</span>${seg('entry',[[0,'Couch → 5K'],[1,'5K → 10K'],[2,'10K → 10 mi']])}<small>Changing this resets your start date so the plan still ends on May 15.</small></div>
    <label class="field" for="f-start"><span>Start date</span><input type="date" id="f-start" value="${r.start}"><small>${aligned?'Race-aligned: your last week is race week.':`Race-aligned start would be ${fmtDate(parse(defaultStart(r.entry)))}.`} Starting earlier banks buffer weeks for holidays or illness.</small>${aligned?'':`<button class="btn small" id="alignStart" style="width:max-content">Use race-aligned start</button>`}</label>
    <div class="field"><span>Run days per week</span>${seg('runDays',[[3,'3 runs + 2 cross'],[2,'2 runs + 3 cross']])}<small>Changing this resets your training days to the default.</small></div>
    ${schedEditor(r)}
    <div class="field"><span>Mode</span>${seg('mode',[['std','Standard'],['rtr','Return to run']])}<small>Return to run adds pain logging (during and next morning) and traffic-light progression rules.</small></div>
    <div class="field"><span>Workout target</span>${seg('target',[['time','Time'],['distance','Distance']])}<small>Time is the beginner default: Couch → 5K builds to 30 minutes of running, which is a different distance for everyone. Distance targets are estimated from your comfortable pace and stay editable per workout. Changing this affects future workouts; completed logs keep their target.</small></div>
    <div class="field"><span>Distance units</span>${seg('units',[['mi','Miles'],['km','Kilometers']])}</div>
    <div class="field"><label for="f-pace"><span>Comfortable running pace <span class="muted" style="font-weight:500">(optional)</span></span></label>
      <div class="ex-in"><input type="text" id="f-pace" inputmode="numeric" placeholder="e.g. 12:00" value="${paceOf(r)?fmtClock(paceIn(r)):''}" style="max-width:140px"><span class="muted" style="align-self:center">per ${UNITS==='km'?'km':'mile'}</span></div>
      <small>Your easy, conversational pace. Used only to estimate time or distance. You can also save it from a logged run.</small></div>
    <div class="field"><span>Strength sets</span>${seg('strSets',[[3,'Standard (3 sets)'],[2,'Learning (2 sets)']])}<small>Start with 2 sets while you learn the moves; the session finishes a little sooner.</small></div>
    <div class="field"><span>Weight units</span>${seg('wUnit',[['lb','Pounds'],['kg','Kilograms']])}</div>
    <div class="field"><span>Repeated weeks</span><p class="muted">${(r.holds||[]).length?`${r.holds.length} week(s) added by repeats or step-backs.`:'None yet.'}</p>${(r.holds||[]).length?'<button class="btn small" id="clearHolds" style="width:max-content">Clear repeats</button>':''}</div>
    ${LOCAL?'':`<div class="field"><span>Use on another phone</span><small>Open this link on your other phone, or type the code there. Anyone with it can log as you, so only send it to yourself.</small>
      <code class="keycode" id="keyCode">${esc(fmtKey(keyFor(ME)))}</code>
      <div class="actions"><button class="btn small" id="copyLink" type="button">Copy link</button><button class="btn small" id="copyCode" type="button">Copy code</button><span class="muted" id="copied" aria-live="polite" style="font-size:.82rem"></span></div>
      <input type="text" id="linkText" readonly value="${esc(linkFor(ME))}" style="font-family:var(--f-mono);font-size:.75rem" aria-label="Device link" hidden></div>`}
    ${LOCAL?'':`<div class="field"><span>This phone</span><small>Logging as ${esc(r.name||'')}. Switch if someone else uses this device. Your key stays on this phone so you can switch back.</small><button class="btn small" id="switchMe" style="width:max-content">Switch runner</button></div>`}
    ${LOCAL?'':`<div class="field"><span>Leave the Kru</span><small>Deletes your plan and every log. This cannot be undone.</small>${UI.confirmLeave?`<div class="actions"><button class="btn small" id="leaveYes" style="border-color:var(--bad);color:var(--bad)">Delete my plan and logs</button><button class="btn small" id="leaveNo">Keep my plan</button></div>`:`<button class="btn small" id="leave" style="width:max-content">Leave Kru…</button>`}</div>`}
  </section></div>`;
  const nm=document.getElementById('f-name'); if(nm) nm.onchange=()=>{const v=nm.value.trim();if(v)saveMine({name:v})};
  document.getElementById('f-start').onchange=e=>{if(e.target.value){UI.sel=null;saveMine({start:iso(mondayOf(parse(e.target.value))),holds:[]})}};
  const al=document.getElementById('alignStart'); if(al) al.onclick=()=>{UI.sel=null;saveMine({start:defaultStart(r.entry),holds:[]})};
  view.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{
    const k=b.dataset.k,v=(k==='runDays'||k==='entry'||k==='strSets')?+b.dataset.v:b.dataset.v;UI.sel=null;
    if(k==='units')UNITS=v;
    saveMine(k==='entry'?{entry:v,start:defaultStart(v),holds:[]}:k==='runDays'?{runDays:v,sched:defaultSched(v),schedPrev:null,schedFrom:null,swaps:{}}:{[k]:v});UI.schedDraft=null;
  });
  bindSched(r);
  const fp=document.getElementById('f-pace'); if(fp) fp.onchange=()=>{const sec=parseDur(fp.value.includes(':')?fp.value:fp.value+':00');
    if(!fp.value.trim()){saveMine({pace:null});return}
    if(!sec||sec<180||sec>1800){fp.setCustomValidity('Enter a pace like 12:00');fp.reportValidity();return}
    fp.setCustomValidity('');saveMine({pace:Math.round(UNITS==='km'?sec*1.609344:sec)})};
  const copy=async(txt,msg)=>{const out=document.getElementById('copied');try{await navigator.clipboard.writeText(txt);out.textContent=msg}catch(e){const li=document.getElementById('linkText');li.hidden=false;li.value=txt;li.select();out.textContent='Select and copy the text above.'}};
  const cl=document.getElementById('copyLink'); if(cl) cl.onclick=()=>copy(linkFor(ME),'Link copied');
  const cc=document.getElementById('copyCode'); if(cc) cc.onclick=()=>copy(fmtKey(keyFor(ME)),'Code copied');
  const ch=document.getElementById('clearHolds'); if(ch) ch.onclick=()=>saveMine({holds:[]});
  const sw=document.getElementById('switchMe'); if(sw) sw.onclick=async()=>{if(QUEUE.length)await push();if(QUEUE.length){ERR=`${plural(QUEUE.length,'change')} from ${mine().name} haven't uploaded yet. Switch runners once they're saved so they aren't lost.`;render();return}setMe(null);UI.newRunner=false;UI.tab='crew';render()};
  const lv=document.getElementById('leave'); if(lv) lv.onclick=()=>{UI.confirmLeave=true;render()};
  const ln=document.getElementById('leaveNo'); if(ln) ln.onclick=()=>{UI.confirmLeave=false;render()};
  const ly=document.getElementById('leaveYes'); if(ly) ly.onclick=async()=>{UI.confirmLeave=false;try{const all=await apiPost({action:'delete',id:ME,token:keyFor(ME)});QUEUE=[];persistQueue();setKey(ME,null);setMe(null);applyServer(all);UI.who=orderedIds()[0]||null;UI.tab='crew'}catch(e){ERR='Could not delete your plan. '+(e.message||'')}render()};
}

function schedEditor(r){
  const n=r.runDays, d=UI.schedDraft||clone(schedOf(r));
  const typeAt=i=>d.run.includes(i)?'run':d.cross.includes(i)?'cross':d.strength.includes(i)?'strength':'rest';
  const prob=schedProblem(d,n), dirtyS=!!UI.schedDraft;
  const opt=[['run','Run'],['cross','Cross'],['strength','Strength'],['rest','Rest']];
  return `<div class="field"><span>Training days</span><small>Pick ${n} run days with a day between each, one or two strength days, and at least one full rest day. Your long run lands on the last run day of the week.</small>
    <div class="sched">${DOW.map((nm,i)=>`<div class="srow"><b>${nm}</b><div class="seg">${opt.map(([v,l])=>`<button type="button" data-sd="${i}" data-sv="${v}" aria-pressed="${typeAt(i)===v}" class="s-${v}">${l}</button>`).join('')}</div></div>`).join('')}</div>
    <div class="actions"><button type="button" class="btn small" id="schedPreset">Use 2 strength days (Mon, Wed)</button><button type="button" class="btn small" id="schedDefault">Default (strength Fri)</button></div>
    ${prob?`<p class="warnline" role="alert">${esc(prob)}</p>`:''}
    ${dirtyS?`<div class="actions"><button class="btn primary small" id="schedSave" ${prob?'disabled':''}>Save training days</button><button class="btn small" id="schedCancel">Cancel</button></div><small>If you've already logged something this week, new days start next Monday.</small>`:UI.schedMsg?`<small role="status" style="color:var(--ok)">${esc(UI.schedMsg)}</small>`:''}
    <small>Race week is the same for everyone so you all race on Saturday, May 15.</small></div>`;
}
function bindSched(r){
  view.querySelectorAll('[data-sd]').forEach(b=>b.onclick=()=>{
    const i=+b.dataset.sd, v=b.dataset.sv, d=UI.schedDraft||clone(schedOf(r));UI.schedMsg='';
    ['run','cross','strength'].forEach(k=>{d[k]=d[k].filter(x=>x!==i)});
    if(v!=='rest')d[v].push(i);
    UI.schedDraft=d;render();
  });
  const sv=document.getElementById('schedSave'); if(sv) sv.onclick=()=>{
    const d=UI.schedDraft;UI.schedDraft=null;UI.sel=null;
    const N=runnerNow(r), thisMon=N.notStarted?startMonR(r):N.mon, logs=r.logs||{};
    const loggedThisWeek=[0,1,2,3,4,5,6].some(i=>statusOf(logs[iso(addDays(thisMon,i))]));
    const from=iso(loggedThisWeek?addDays(thisMon,7):thisMon);
    const swaps={...(r.swaps||{})};Object.keys(swaps).forEach(k=>{if(k>=from)swaps[k]=[]});
    UI.schedMsg=loggedThisWeek?`Saved. New days start ${fmtDate(parse(from))}, since you've already logged workouts this week.`:'Saved.';
    saveMine({sched:d,schedPrev:clone(schedOf(r,thisMon)),schedFrom:from,swaps});
  };
  const pr=document.getElementById('schedPreset'); if(pr) pr.onclick=()=>{UI.schedMsg='';UI.schedDraft=r.runDays===3?{run:[1,3,5],cross:[6],strength:[0,2]}:{run:[1,5],cross:[3,6],strength:[0,2]};render()};
  const pd=document.getElementById('schedDefault'); if(pd) pd.onclick=()=>{UI.schedMsg='';UI.schedDraft=defaultSched(r.runDays);render()};
  const sc=document.getElementById('schedCancel'); if(sc) sc.onclick=()=>{UI.schedDraft=null;render()};
}

/* ---------- timer ---------- */
const TEL=document.getElementById('timer');
let T=null, ac=null, lock=null, iv=null;
const LABEL={run:'Run',walk:'Walk',warm:'Warm-up',cool:'Cool-down'};
const mmss=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+pad(s%60)};
function beep(f,dur,at){if(!ac)return;const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=f;o.connect(g);g.connect(ac.destination);const t=ac.currentTime+(at||0);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.4,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.start(t);o.stop(t+dur+.05)}
function cue(type){if(type==='run'){beep(880,.18);beep(880,.18,.25);try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}}else{beep(520,.4);try{navigator.vibrate&&navigator.vibrate(400)}catch(e){}}}
function openTimer(segs,title,key){
  T={segs,title,key,idx:0,el:0,running:false,last:0,total:segs.reduce((a,s)=>a+s[1],0),logged:false};
  TEL.hidden=false;document.body.style.overflow='hidden';drawTimer();
}
function closeTimer(){T&&(T.running=false);clearInterval(iv);TEL.hidden=true;document.body.style.overflow='';try{lock&&lock.release()}catch(e){}lock=null;render()}
function tick(){
  if(!T||!T.running)return;const now=performance.now();T.el+=(now-T.last)/1000;T.last=now;
  while(T.idx<T.segs.length&&T.segs[T.idx][2]==null&&T.el>=T.segs[T.idx][1]){T.el-=T.segs[T.idx][1];T.idx++;if(T.idx<T.segs.length)cue(T.segs[T.idx][0]);}
  if(T.idx>=T.segs.length){T.running=false;clearInterval(iv);beep(660,.2);beep(880,.2,.25);beep(1100,.35,.5);
    if(!T.logged&&mine()){T.logged=true;saveMine({logs:{[T.key]:{done:true,status:'done',planned:plannedSnapshot(mine(),T.key)}}})}}
  drawTimer();
}
function drawTimer(){
  const done=T.idx>=T.segs.length, s=done?null:T.segs[T.idx];
  const elapsed=T.segs.slice(0,T.idx).reduce((a,x)=>a+x[1],0)+(done?0:T.el);
  const type=done?'run':s[0], tc=type==='run'?'var(--run)':'var(--walk)';
  const next=T.segs[T.idx+1];
  TEL.innerHTML=`<div class="inner">
    <div class="row"><span class="eyebrow">${esc(T.title)}</span><button class="btn small" id="tClose">Close</button></div>
    <div class="center">
      <div class="phase-name" style="--tc:${done?'var(--ok)':tc}">${done?'Done':LABEL[type]}</div>
      ${!done&&s[2]!=null?`<div class="clock" style="font-size:clamp(3rem,16vw,6rem)">${fmtSegM(s[2])}</div><p class="mono muted">${mmss(T.el)} so far · about ${mmss(s[1])} at your pace</p>`:`<div class="clock">${done?mmss(T.total):mmss(s[1]-T.el)}</div>`}
      <p class="muted">${done?'Session logged as complete. Cool down and stretch.':next?`Next: ${LABEL[next[0]]} ${next[2]!=null?fmtSegM(next[2]):mmss(next[1])}`:'Last segment'}</p>
    </div>
    <div class="prog"><div class="segbar" style="height:18px">${T.segs.map(x=>`<span class="s-${x[0]}" style="flex:${x[1]}"></span>`).join('')}</div><div class="cursor" style="left:calc(${elapsed/T.total*100}% - 1px)"></div></div>
    <div class="row mono muted" style="font-size:.85rem"><span>${mmss(elapsed)} elapsed</span><span>Segment ${Math.min(T.idx+1,T.segs.length)} / ${T.segs.length}</span><span>${mmss(T.total-elapsed)} left</span></div>
    <div class="actions">${done?`<button class="btn primary" id="tFinish">Log effort</button>`:`<button class="btn primary" id="tPlay">${T.running?'Pause':elapsed>0?'Resume':'Start'}</button>${s[2]!=null?`<button class="btn primary" id="tSkip">Done with this run</button>`:'<button class="btn" id="tSkip">Skip segment</button>'}`}</div>
  </div>`;
  document.getElementById('tClose').onclick=closeTimer;
  const f=document.getElementById('tFinish'); if(f) f.onclick=closeTimer;
  const p=document.getElementById('tPlay'); if(p) p.onclick=()=>{
    if(!ac){try{ac=new (window.AudioContext||window.webkitAudioContext)()}catch(e){}}
    if(ac&&ac.state==='suspended')ac.resume();
    T.running=!T.running;
    if(T.running){T.last=performance.now();if(elapsed===0)cue(T.segs[0][0]==='run'?'run':'walk');clearInterval(iv);iv=setInterval(tick,250);
      try{navigator.wakeLock&&navigator.wakeLock.request('screen').then(l=>lock=l).catch(()=>{})}catch(e){}}
    else clearInterval(iv);
    drawTimer();
  };
  const k=document.getElementById('tSkip'); if(k) k.onclick=()=>{const cur=T.segs[T.idx];T.el=0;T.idx++;if(T.idx<T.segs.length)cue(T.segs[T.idx][0]);T.last=performance.now();const r=T.running;T.running=true;tick();if(!r&&T.idx<T.segs.length)T.running=false;drawTimer()};
}

document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{UI.tab=b.dataset.tab;store.set('c10-tab',UI.tab);ERR='';render()});
boot();
