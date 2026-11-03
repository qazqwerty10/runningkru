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

function weekDays(w,n){
  const wk=weekInfo(w), mins=['20–30','30–40','40–50'][wk.ph];
  const cross={type:'cross',title:'Cross-train',detail:`${mins} min low-impact cardio: bike, elliptical, swim, rower, or incline walk at RPE 4–5/10. Builds the aerobic engine without extra impact load.`};
  const strength={type:'strength',title:'Strength',detail:'Runner strength circuit (see Guide): calf raises, split squats, single-leg RDL, bridges, side plank. 2–3 sets; the last 2 reps of each set should feel hard. Optional 15–20 min easy cardio afterward.'};
  const run=(r,t)=>({type:'run',title:t,run:r});
  const k=wk.runs[2].kind;
  const keyLabel=k==='race'?'Race day':k==='goal'?'Goal run':wk.ph===0?`Run ${n}`:'Long run';
  const raceWeek=k==='race';
  return {wk,days:[
    {type:'rest',title:'Rest + mobility',detail:'Full rest, or 10 min of easy mobility: calves, hip flexors, hamstrings.'},
    run(wk.runs[0],'Run 1'),
    raceWeek?{type:'rest',title:'Rest',detail:'Rest or a 20 min easy walk. Nothing hard this week.'}:cross,
    n===3?run(wk.runs[1],'Run 2'):(raceWeek?{type:'rest',title:'Rest',detail:'Rest. Lay out your race kit.'}:{...cross,detail:cross.detail+' In 2-run mode this replaces the middle run.'}),
    raceWeek?{type:'rest',title:'Rest',detail:'Full rest before race day. Hydrate and eat a familiar dinner.'}:strength,
    run(wk.runs[2],keyLabel),
    {type:'rest',title:'Rest or easy cross',detail:raceWeek?'Recovery: easy walk, mobility, celebrate.':'Rest, or an optional 20–30 min easy walk, ride, or swim if you feel fresh.'}
  ]};
}

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
function schedulePill(r){
  const d=scheduleDiff(r);
  if(d===0) return {c:'g',t:'On schedule for May 15'};
  if(d<0) return {c:'g',t:`${-d} wk buffer before race`};
  return {c:'a',t:`${d} wk behind race day`};
}
function weekStatus(r,mon,days){
  const logs=r.logs||{};
  let worst=-1,rpeMax=0,logged=0;
  days.forEach((d,i)=>{if(d.type!=='run')return;const L=logs[iso(addDays(mon,i))];if(!L||!L.done)return;logged++;
    worst=Math.max(worst,L.pain??0,L.morning??0);rpeMax=Math.max(rpeMax,L.rpe??0)});
  if(!logged) return {c:'',t:'No runs logged yet this week',d:r.mode==='rtr'?'Log pain during each run and again the next morning.':'Log effort after each run.'};
  if(r.mode==='rtr'){
    if(worst>=5) return {c:'r',t:'Red: step back',d:'Pain reached 5/10 or higher. Stop running this week, drop back one week, and get it assessed if it persists.'};
    if(worst>=3) return {c:'a',t:'Amber: repeat this week',d:'Pain of 3–4/10 is acceptable if it settles within 24 hours, but hold here rather than progressing.'};
    return {c:'g',t:'Green: on track',d:'Pain 0–2/10 and not worse the next morning. Progress as planned.'};
  }
  if(rpeMax>=8) return {c:'a',t:'Hard week: consider repeating',d:'At least one run felt RPE 8 or higher. Repeating a week is normal; check the race-day buffer before you do.'};
  return {c:'g',t:'On track',d:'Runs felt manageable. Progress as planned.'};
}
function runnerNow(r){
  const t=today(), cw=calWeekR(r,t), notStarted=cw<0;
  const pw=notStarted?STARTS[r.entry]:progWeekR(r,cw);
  const mon=notStarted?startMonR(r):addDays(startMonR(r),cw*7);
  return {t,cw,pw,notStarted,mon,finished:pw>=TOTAL};
}

/* ---------- shared state (Google Sheet via Apps Script) ---------- */
const API=(window.C10_API||'').trim();
let ME=null, RUNNERS={}, LOADED=false, LOCAL=false, ERR='', SYNC='idle', LASTSYNC=null;
let UI={tab:store.get('c10-tab','today'),sel:null,who:null,join:{name:'',entry:0,runDays:3},confirmLeave:false,newRunner:false};
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
async function apiGet(){
  const res=await fetch(API+(API.includes('?')?'&':'?')+'action=all&t='+Date.now(),{redirect:'follow'});
  const j=await res.json(); if(!j.ok) throw new Error(j.error||'Load failed'); return j.runners||{};
}
async function apiPost(body){
  // text/plain keeps this a "simple" request, which Apps Script accepts without a CORS preflight
  const res=await fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),redirect:'follow'});
  const j=await res.json(); if(!j.ok) throw new Error(j.error||'Save failed'); return j.runners||{};
}
let dirty=false, pushTimer=null, pushing=null;
function applyServer(runners){
  const keep=dirty&&RUNNERS[ME]?RUNNERS[ME]:null;
  RUNNERS=runners; if(keep) RUNNERS[ME]=keep;
  if(ME&&!RUNNERS[ME]&&!keep){ME=null;store.set('c10-me',null)}
  LOADED=true; LASTSYNC=new Date();
  if(mine())UNITS=mine().units||'mi';
  if(!UI.who||!RUNNERS[UI.who]) UI.who=mine()?ME:(orderedIds()[0]||null);
}
async function refresh(){
  if(LOCAL||!API||document.hidden) return;
  try{const r=await apiGet();applyServer(r);if(SYNC==='offline')SYNC='idle';if(ERR&&/load|connect/i.test(ERR))ERR='';render()}
  catch(e){if(!LOADED){ERR='Could not load the crew. Check your connection, then reload.';LOADED=true}SYNC='offline';render()}
}
function schedulePush(){clearTimeout(pushTimer);pushTimer=setTimeout(push,700)}
async function push(){
  if(pushing){await pushing;}
  if(!dirty||!mine()) return;
  dirty=false; SYNC='saving'; paintSync();
  const body={action:'save',id:ME,runner:mine()};
  pushing=apiPost(body).then(r=>{applyServer(r);SYNC='saved';ERR=''}).catch(()=>{dirty=true;SYNC='offline';ERR='Not saved yet: no connection to the crew sheet. Your changes are kept on this phone and will retry.';setTimeout(()=>{if(dirty)push()},15000)}).finally(()=>{pushing=null;render()});
  await pushing;
}
function saveMine(patch){
  if(!mine())return;
  RUNNERS[ME]=deepMerge(JSON.parse(JSON.stringify(mine())),patch);
  if(LOCAL){store.set('c10-local',RUNNERS[ME]);render();return}
  store.set('c10-pending',{id:ME,runner:RUNNERS[ME]});
  dirty=true; render(); schedulePush();
}
function paintSync(){const el=document.getElementById('sync');if(!el)return;
  el.textContent=LOCAL?'This device only':SYNC==='saving'?'Saving…':SYNC==='offline'?'Offline · will retry':LASTSYNC?'Synced '+LASTSYNC.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}):'Connecting…';
  el.dataset.state=LOCAL?'local':SYNC;}

function goLocal(){
  LOCAL=true;ME='local';
  let r=store.get('c10-local',null);
  if(!r){const old=store.get('c10-settings',{});r=newRunner('You',old.entry||0,old.runDays||3,old.mode||'std');r.logs=store.get('c10-logs',{});r.ready=store.get('c10-ready',{});}
  RUNNERS={local:r};UI.who='local';LOADED=true;UNITS=r.units||'mi';render();
}

async function boot(){
  if(!API){goLocal();return}
  ME=store.get('c10-me',null);
  const pend=store.get('c10-pending',null);
  render();
  await refresh();
  if(pend&&pend.id===ME&&ME){RUNNERS[ME]=deepMerge(JSON.parse(JSON.stringify(RUNNERS[ME]||{})),pend.runner);dirty=true;push()}
  if(!mine()&&UI.tab==='today') UI.tab='crew';
  render();
  setInterval(refresh,60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
}

/* ---------- render ---------- */
const view=document.getElementById('view');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CHECK='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.2 3L13 4.5"/></svg>';

function render(){
  document.querySelectorAll('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===UI.tab));
  ({today:renderToday,crew:renderCrew,plan:renderPlan,guide:renderGuide,setup:renderSetup})[UI.tab]();
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
  if(LOCAL) h+=`<div class="banner">Saving on this device only. The crew sheet isn't connected yet (see README step 2).</div>`;
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
  const pick=ids.length&&!UI.newRunner?`<section class="card join">
    <div><h2>Who's on this phone?</h2><p class="muted">Pick your name to log your own workouts here. Use the same name on every device you train with.</p></div>
    <div class="who">${ids.map(id=>`<button type="button" data-iam="${esc(id)}"><span class="av" style="--c:${colorOf(id)}">${esc(initial(nameOf(id)))}</span>I'm ${esc(nameOf(id))}</button>`).join('')}</div>
    <div class="actions"><button class="btn small" id="newRunnerBtn">I'm new: join the crew</button></div>
  </section>`:'';
  if(pick) return pick;
  const J=UI.join;
  const seg=(k,opts)=>`<div class="seg">${opts.map(([v,l])=>`<button type="button" data-j="${k}" data-v="${v}" aria-pressed="${J[k]==v}">${l}</button>`).join('')}</div>`;
  return `<section class="card join">
    <div><h2>Join the crew</h2><p class="muted">Get your own plan aimed at May 15. Everyone with the link sees each other's progress.</p></div>
    <label class="field" for="j-name"><span>Your first name</span><input type="text" id="j-name" maxlength="24" value="${esc(J.name)}" placeholder="First name" autocomplete="given-name"></label>
    <div class="field"><span>Where are you starting?</span>${seg('entry',[[0,'Not running yet'],[1,'Can run 30 min'],[2,'Can run a 10K']])}<small>Your start date: ${fmtDate(parse(defaultStart(J.entry)))}, timed so the plan ends on race day.</small></div>
    <div class="field"><span>Run days per week</span>${seg('runDays',[[3,'3 runs + 2 cross'],[2,'2 runs + 3 cross']])}</div>
    <div class="actions"><button class="btn primary" id="joinBtn">Join</button>${ids.length?'<button class="btn" id="backPick">Back</button>':''}</div>
  </section>`;
}
function bindJoin(){
  view.querySelectorAll('[data-iam]').forEach(b=>b.onclick=()=>{ME=b.dataset.iam;store.set('c10-me',ME);UI.who=ME;UI.tab='today';UI.sel=null;UNITS=mine().units||'mi';render()});
  const nb=document.getElementById('newRunnerBtn'); if(nb) nb.onclick=()=>{UI.newRunner=true;render()};
  const bp=document.getElementById('backPick'); if(bp) bp.onclick=()=>{UI.newRunner=false;render()};
  const n=document.getElementById('j-name'); if(!n)return;
  n.oninput=()=>{UI.join.name=n.value};
  view.querySelectorAll('[data-j]').forEach(b=>b.onclick=()=>{UI.join[b.dataset.j]=+b.dataset.v;render()});
  document.getElementById('joinBtn').onclick=async()=>{
    const nm=(UI.join.name||'').trim(); if(!nm){n.focus();return}
    if(Object.values(RUNNERS).some(r=>(r.name||'').toLowerCase()===nm.toLowerCase())){ERR=`${nm} is already in the crew. Tap Back and pick that name instead.`;render();return}
    const id=newId(), r=newRunner(nm,UI.join.entry,UI.join.runDays,'std');
    const btn=document.getElementById('joinBtn');btn.disabled=true;btn.textContent='Joining…';
    try{const all=await apiPost({action:'save',id,runner:r});ME=id;store.set('c10-me',ME);applyServer(all);UI.who=ME;UI.tab='today';UI.sel=null;UI.newRunner=false;ERR=''}
    catch(e){ERR='Could not join just now. Check your connection and try again.'}
    render();
  };
}

function renderToday(){
  if(!LOADED){view.innerHTML=`<p class="muted">Loading the crew…</p>`;return}
  const r=viewing();
  if(!r){view.innerHTML=`<div style="display:flex;flex-direction:column;gap:18px">${banners()}${joinCard()||'<p class="muted">Nobody has joined yet.</p>'}</div>`;bindJoin();return}
  const own=isMine(), n=r.runDays, logs=r.logs||{};
  const N=runnerNow(r), {t,cw,pw,notStarted,mon}=N;
  const head=`${banners()}${!mine()?joinCard():''}${whoBar()}`;
  if(N.finished){
    view.innerHTML=`<div style="display:flex;flex-direction:column;gap:18px">${head}${ladder(TOTAL)}<div class="card session t-run"><span class="chip">Program complete</span><h2>10 miles: done</h2><p class="muted">All 27 weeks finished. Keep 2–3 easy runs a week plus strength to hold your fitness.</p></div></div>`;
    bindWho();bindJoin();return;
  }
  const {wk,days}=weekDays(pw,n);
  const tDow=(t.getDay()+6)%7;
  if(UI.sel===null) UI.sel=notStarted?1:tDow;
  const day=days[UI.sel], date=addDays(mon,UI.sel), key=iso(date), L=logs[key]||{};
  const ph=PHASES[wk.ph], st=weekStatus(r,mon,days), held=(r.holds||[]).filter(h=>h===cw).length;
  const isRace=key===RACE&&day.type==='run';
  const sp=schedulePill(r);

  let body='';
  if(day.type==='run'){
    const ru=day.run;
    if(ru.kind==='interval'){
      const segs=fullSegs(ru), tot=segs.reduce((a,s)=>a+s[1],0);
      body+=`<div class="meta"><div><span class="eyebrow">Running</span><b>${runSeconds(ru.seg)/60} min</b></div><div><span class="eyebrow">Total session</span><b>${Math.round(tot/60)} min</b></div></div>
      <div class="segbar" aria-hidden="true">${segs.map(s=>`<span class="s-${s[0]}" style="flex:${s[1]}"></span>`).join('')}</div>
      <div class="legend"><span><i class="s-run"></i>Run</span><span><i class="s-walk"></i>Walk</span><span><i class="s-warm"></i>Warm-up / cool-down</span></div>`;
    } else body+=`<div class="meta"><div><span class="eyebrow">Distance</span><b>${fmtD(ru.mi)}</b></div><div><span class="eyebrow">Effort</span><b>${ru.kind==='race'||ru.kind==='goal'?'Goal':'RPE 3–4'}</b></div></div>`;
  }
  const timerBtn=day.type==='run'&&day.run.kind==='interval'?`<button class="btn primary" id="startTimer">Start interval timer</button>`:'';
  const doneBtn=own?`<button class="btn ${L.done?'done':''}" id="markDone">${L.done?'Completed':'Mark complete'}</button>`:`<span class="ro">${L.done?'Completed':'Not logged yet'}${L.rpe?` · RPE ${L.rpe}`:''}${L.pain!=null?` · pain ${L.pain}/10`:''}</span>`;
  const logFields=own&&day.type==='run'&&L.done?`<div class="logs">
      <label for="f-rpe">Effort (RPE) <output>${L.rpe??'–'}/10</output><input type="range" id="f-rpe" min="1" max="10" value="${L.rpe??4}" data-k="rpe"></label>
      ${r.mode==='rtr'?`<label for="f-pain">Pain during run <output>${L.pain??0}/10</output><input type="range" id="f-pain" min="0" max="10" value="${L.pain??0}" data-k="pain"></label>
      <label for="f-morn">Pain next morning <output>${L.morning??'–'}/10</output><input type="range" id="f-morn" min="0" max="10" value="${L.morning??0}" data-k="morning"></label>`:''}
    </div>`:'';

  view.innerHTML=`<div style="display:flex;flex-direction:column;gap:18px">
    ${head}
    ${ladder(pw)}
    <div class="status"><span class="big">Week ${pw+1} <span class="muted">/ ${TOTAL}</span></span><span class="muted">${own?'':esc(nameOf(UI.who))+' · '}${ph.name} · week ${wk.wip} of ${ph.weeks}${notStarted?` · starts ${fmtDate(mon)}`:''}</span><span class="pill ${sp.c}">${sp.t}</span></div>
    ${wk.note?`<p class="muted" style="font-size:.9rem">${wk.note}</p>`:''}
    <section class="card session t-${day.type}">
      <span class="chip">${DOW[UI.sel]} ${fmtDate(date)} · ${isRace?'Race day':day.title}${UI.sel===tDow&&!notStarted?' · today':''}</span>
      <h2>${esc(day.type==='run'?runTitle(day.run):day.title)}</h2>
      <p class="muted">${esc(day.type==='run'?runDetail(day.run):day.detail)}</p>
      ${body}
      <div class="actions">${own?timerBtn:''}${doneBtn}</div>
      ${logFields}
    </section>
    <div style="display:flex;flex-direction:column;gap:8px">
      <h3>${own?'This week':esc(nameOf(UI.who))+"'s week"}</h3>
      <div class="week">${days.map((d,i)=>{const dd=addDays(mon,i),k=iso(dd),done=logs[k]&&logs[k].done;
        return `<div class="day t-${d.type} ${i===UI.sel?'sel':''} ${i===tDow&&!notStarted?'today':''}" role="button" tabindex="0" data-sel="${i}">
          <div class="dn">${DOW[i]}<small>${fmtDate(dd)}</small></div>
          <div class="what"><span class="chip">${k===RACE&&d.type==='run'?'Race day':d.title}</span><span>${esc(d.type==='run'?runTitle(d.run):d.type==='rest'?d.detail.split(/[,.]/)[0]:d.type==='cross'?['20–30','30–40','40–50'][wk.ph]+' min low-impact cardio':'Runner strength circuit')}</span></div>
          ${own?`<button class="check ${done?'on':''}" data-done="${k}" aria-label="Mark ${DOW[i]} complete">${done?CHECK:''}</button>`:`<span class="check ${done?'on':''}" aria-label="${done?'Completed':'Not completed'}">${done?CHECK:''}</span>`}</div>`}).join('')}</div>
    </div>
    <section class="card">
      <h3>Weekly check-in</h3>
      <div class="light"><span class="dot ${st.c}"></span><div><b>${st.t}</b><p class="muted" style="font-size:.9rem">${st.d}</p></div></div>
      ${own&&!notStarted?`<div class="actions">
        <button class="btn small" id="holdRepeat">Repeat this week next week</button>
        <button class="btn small" id="holdBack">Step back one week</button>
        ${held?`<button class="btn small" id="holdUndo">Undo (${held} held)</button>`:''}
      </div><p class="muted" style="font-size:.82rem">Each repeat pushes your finish one week later. ${scheduleDiff(r)<0?`You have ${-scheduleDiff(r)} buffer week(s) before May 15.`:'You have no buffer weeks before May 15; start earlier in Setup to build some.'}</p>`:''}
    </section>
  </div>`;

  bindWho();bindJoin();
  view.querySelectorAll('[data-sel]').forEach(el=>{
    const go=()=>{UI.sel=+el.dataset.sel;render()};
    el.addEventListener('click',go);el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go()}});
  });
  if(!own)return;
  view.querySelectorAll('[data-done]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();toggle(b.dataset.done)}));
  document.getElementById('markDone').onclick=()=>toggle(key);
  view.querySelectorAll('.logs input').forEach(inp=>{
    inp.addEventListener('input',()=>{inp.previousElementSibling.textContent=inp.value+'/10'});
    inp.addEventListener('change',()=>saveMine({logs:{[key]:{[inp.dataset.k]:+inp.value}}}));
  });
  const tb=document.getElementById('startTimer'); if(tb) tb.onclick=()=>openTimer(fullSegs(day.run),runTitle(day.run),key);
  const holds=()=>[...(r.holds||[])];
  const hr=document.getElementById('holdRepeat'); if(hr) hr.onclick=()=>saveMine({holds:[...holds(),cw]});
  const hb=document.getElementById('holdBack'); if(hb) hb.onclick=()=>saveMine({holds:[...holds(),cw,cw]});
  const hu=document.getElementById('holdUndo'); if(hu) hu.onclick=()=>{const h=holds(),i=h.lastIndexOf(cw);if(i>-1)h.splice(i,1);saveMine({holds:h})};
}
function toggle(k){const L=(mine().logs||{})[k]||{};saveMine({logs:{[k]:{done:!L.done}}})}

function renderCrew(){
  const t=today(), days=Math.max(0,dayNum(parse(RACE))-dayNum(t));
  const ids=orderedIds();
  const cards=ids.map((id,i)=>{
    const r=RUNNERS[id], N=runnerNow(r), sp=schedulePill(r);
    let weekHtml='', summary='', st={c:''};
    if(N.finished){summary='Program complete';}
    else{
      const {wk,days:ds}=weekDays(N.pw,r.runDays), logs=r.logs||{};
      const planned=ds.filter(d=>d.type!=='rest').length;
      const done=ds.filter((d,j)=>d.type!=='rest'&&logs[iso(addDays(N.mon,j))]&&logs[iso(addDays(N.mon,j))].done).length;
      const tDow=(t.getDay()+6)%7;
      weekHtml=`<div class="sq">${ds.map((d,j)=>{const k=iso(addDays(N.mon,j)),on=logs[k]&&logs[k].done;return `<span class="t-${d.type} ${d.type==='rest'?'rest':''} ${on?'on':''} ${j===tDow&&!N.notStarted?'tod':''}" title="${DOW[j]}: ${esc(d.type==='run'?runTitle(d.run):d.title)}">${DOW[j].charAt(0)}</span>`}).join('')}</div>`;
      st=weekStatus(r,N.mon,ds);
      summary=N.notStarted?`Starts ${fmtDate(N.mon)} · ${PHASES[wk.ph].name}`:`${PHASES[wk.ph].name} · wk ${wk.wip} of ${PHASES[wk.ph].weeks} · ${done}/${planned} sessions this week`;
    }
    const total=Object.values(r.logs||{}).filter(l=>l&&l.done).length;
    return `<button type="button" class="rc" data-open="${esc(id)}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%"><span class="nm"><span class="av" style="--c:${colorOf(id)}">${esc(initial(nameOf(id)))}</span><b>${esc(nameOf(id))}</b>${id===ME?'<span class="muted" style="font-size:.8rem">you</span>':''}</span><span class="pill ${sp.c}">${sp.t}</span></div>
      ${ladder(Math.min(TOTAL,N.pw))}
      <span class="muted" style="font-size:.86rem">${summary}</span>
      ${weekHtml}
      <span style="display:flex;justify-content:space-between;gap:8px;font-size:.82rem" class="muted"><span><span class="dot ${st.c}" style="display:inline-block;width:9px;height:9px;margin:0 6px 0 0;vertical-align:0"></span>${esc(st.t||'')}</span><span class="mono">${total} done</span></span>
    </button>`;
  }).join('');
  view.innerHTML=`<div style="display:flex;flex-direction:column;gap:18px">
    ${banners()}
    <section class="card race">
      <div><span class="eyebrow">Race day</span><h2 style="font-size:2rem">Sat, May 15, 2027</h2><p class="muted">10 miles. Plans that start Nov 9 finish on race morning.</p></div>
      <div class="count">${days}<small>days to go</small></div>
    </section>
    ${joinCard()}
    ${!LOADED?'<p class="muted">Loading the crew…</p>':ids.length?`<div class="crew">${cards}</div>`:'<p class="muted">Nobody has joined yet. Join above, then share this page with your crew.</p>'}
    ${LOADED&&!LOCAL?'<p class="muted" style="font-size:.82rem">Everyone with the link sees each other\'s plans and logs. Refreshes every minute.</p>':''}
  </div>`;
  bindJoin();
  view.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>{UI.who=b.dataset.open;UI.sel=null;UI.tab='today';render()});
}

function renderPlan(){
  if(!LOADED){view.innerHTML=`<p class="muted">Loading…</p>`;return}
  const r=viewing()||{entry:0,runDays:3,start:defaultStart(0),holds:[]};
  const N=runnerNow(r), cur=N.notStarted?-1:N.pw;
  // calendar Monday for each program week (first occurrence, honoring repeats)
  const weekMon={};for(let cw=0;cw<80;cw++){const w=progWeekR(r,cw);if(w>=TOTAL)break;if(weekMon[w]==null)weekMon[w]=addDays(startMonR(r),cw*7)}
  view.innerHTML=`<div style="display:flex;flex-direction:column;gap:26px">
    ${whoBar()}
    <p class="muted" style="max-width:65ch">${viewing()?esc(nameOf(UI.who))+': ':''}${r.runDays} run days and ${r.runDays===3?'2':'3'} cross-training / strength days each week. Runs fall on Tue${r.runDays===3?', Thu':''} and Sat; cross-training on Wed${r.runDays===2?', Thu':''}; strength on Fri.</p>
    ${PHASES.map((p,pi)=>{
      if(STARTS[pi]+p.weeks<=STARTS[r.entry]) return `<section class="phase"><header><h2 class="muted">${p.name}</h2><span class="muted" style="font-size:.88rem">Skipped: starting at ${PHASES[r.entry].name}</span></header></section>`;
      let rows='';
      for(let w=STARTS[pi];w<STARTS[pi]+p.weeks;w++){
        const wk=weekInfo(w), rs=pickRuns(wk.runs,r.runDays);
        const tot=pi===0?`${rs.reduce((a,x)=>a+runSeconds(x.seg),0)/60} min run`:fmtD(rs.reduce((a,x)=>a+x.mi,0))+' / wk';
        const m=weekMon[w];
        rows+=`<div class="wrow ${w<cur?'past':''} ${w===cur?'cur':''}">
          <div class="wk">Wk ${wk.wip}<small>${m?fmtDate(m):'#'+(w+1)}${w===cur?' · now':''}</small></div>
          <div class="runs">${rs.map((x,i)=>`<span class="${i===rs.length-1?'key':''}" title="${esc(runTitle(x))}">${esc(pi===0?x.d:runShort(x))}</span>`).join('')}</div>
          <div class="tot">${tot}</div>
          ${wk.note?`<div class="note">${wk.note}</div>`:''}
        </div>`;
      }
      return `<section class="phase"><header><h2>${p.name}</h2><span class="muted" style="font-size:.88rem">${p.weeks} weeks · goal: ${p.goal}</span></header>${rows}</section>`;
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
  view.innerHTML=`<div style="display:flex;flex-direction:column;gap:22px">
  <section class="card"><div class="prose">
    <h2>How the program works</h2>
    <p>Three phases, 27 weeks, timed to finish on race day, Saturday May 15: Couch → 5K (9 weeks of run/walk intervals), 5K → 10K (8 weeks), and 10K → 10 miles (10 weeks). Each week has 2 or 3 runs, never on back-to-back days, plus 2–3 days of cross-training and strength.</p>
    <p>Weekly running volume rises gradually, with cutback weeks built in. Large week-to-week jumps in running distance are associated with a higher risk of running-related injury, so the plan avoids them. Repeating a week is part of the plan; start a week or two before Nov 9 if you want buffer for holidays or illness.</p>
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
    <p>Commonly used clinical criteria before starting a return-to-run program. ${me?'Your ticks are saved to your plan.':'Join the crew to save your ticks.'}</p>
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

  <section class="card"><div class="prose"><h2>Strength circuit</h2><p>Twice a week (Friday, plus after Wednesday's cross-training if you can). Strength training reduces sports injury risk, and calf capacity matters most for runners.</p></div>
  <div class="tbl"><table>
    <tr><th>Exercise</th><th>Dose</th><th>Why</th></tr>
    <tr><td>Single-leg calf raise, straight knee</td><td class="mono">3 × 12–15</td><td>Gastrocnemius / Achilles capacity</td></tr>
    <tr><td>Single-leg calf raise, bent knee</td><td class="mono">3 × 12–15</td><td>Soleus, the main load absorber in running</td></tr>
    <tr><td>Rear-foot elevated split squat</td><td class="mono">3 × 8–10 / side</td><td>Quads and glutes, single-leg control</td></tr>
    <tr><td>Single-leg Romanian deadlift</td><td class="mono">3 × 8 / side</td><td>Hamstrings, hip stability</td></tr>
    <tr><td>Single-leg glute bridge</td><td class="mono">3 × 10 / side</td><td>Hip extension strength</td></tr>
    <tr><td>Side plank</td><td class="mono">3 × 20–30 s / side</td><td>Lateral hip and trunk control</td></tr>
  </table></div>
  <p class="muted" style="font-size:.88rem">Add load (backpack, dumbbells) once all sets feel easy. Slow tempo: about 3 s down, 1–2 s up.</p></section>

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
  if(!r){view.innerHTML=`<div style="display:flex;flex-direction:column;gap:18px">${banners()}${joinCard()}</div>`;bindJoin();return}
  const seg=(k,opts)=>`<div class="seg">${opts.map(([v,l])=>`<button type="button" data-k="${k}" data-v="${v}" aria-pressed="${r[k]==v}">${l}</button>`).join('')}</div>`;
  const aligned=r.start===defaultStart(r.entry);
  view.innerHTML=`<div style="display:flex;flex-direction:column;gap:18px">${banners()}<section class="card" style="gap:22px">
    <h2>Your setup</h2>
    ${LOCAL?'':`<label class="field" for="f-name"><span>Name shown to the crew</span><input type="text" id="f-name" maxlength="24" value="${esc(r.name||'')}" style="font:inherit;padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);max-width:320px"></label>`}
    <div class="field"><span>Start at</span>${seg('entry',[[0,'Couch → 5K'],[1,'5K → 10K'],[2,'10K → 10 mi']])}<small>Changing this resets your start date so the plan still ends on May 15.</small></div>
    <label class="field" for="f-start"><span>Start date</span><input type="date" id="f-start" value="${r.start}"><small>${aligned?'Race-aligned: your last week is race week.':`Race-aligned start would be ${fmtDate(parse(defaultStart(r.entry)))}.`} Starting earlier banks buffer weeks for holidays or illness.</small>${aligned?'':`<button class="btn small" id="alignStart" style="width:max-content">Use race-aligned start</button>`}</label>
    <div class="field"><span>Run days per week</span>${seg('runDays',[[3,'3 runs + 2 cross'],[2,'2 runs + 3 cross']])}<small>2-run mode keeps Run 1 and the key run; the middle run becomes cross-training.</small></div>
    <div class="field"><span>Mode</span>${seg('mode',[['std','Standard'],['rtr','Return to run']])}<small>Return to run adds pain logging (during and next morning) and traffic-light progression rules.</small></div>
    <div class="field"><span>Units</span>${seg('units',[['mi','Miles'],['km','Kilometers']])}</div>
    <div class="field"><span>Repeated weeks</span><p class="muted">${(r.holds||[]).length?`${r.holds.length} week(s) added by repeats or step-backs.`:'None yet.'}</p>${(r.holds||[]).length?'<button class="btn small" id="clearHolds" style="width:max-content">Clear repeats</button>':''}</div>
    ${LOCAL?'':`<div class="field"><span>This phone</span><small>Logging as ${esc(r.name||'')}. Switch if someone else uses this device.</small><button class="btn small" id="switchMe" style="width:max-content">Switch runner</button></div>`}
    ${LOCAL?'':`<div class="field"><span>Leave the crew</span><small>Deletes your plan and every log. This cannot be undone.</small>${UI.confirmLeave?`<div class="actions"><button class="btn small" id="leaveYes" style="border-color:var(--bad);color:var(--bad)">Delete my plan and logs</button><button class="btn small" id="leaveNo">Keep my plan</button></div>`:`<button class="btn small" id="leave" style="width:max-content">Leave crew…</button>`}</div>`}
  </section></div>`;
  const nm=document.getElementById('f-name'); if(nm) nm.onchange=()=>{const v=nm.value.trim();if(v)saveMine({name:v})};
  document.getElementById('f-start').onchange=e=>{if(e.target.value){UI.sel=null;saveMine({start:iso(mondayOf(parse(e.target.value))),holds:[]})}};
  const al=document.getElementById('alignStart'); if(al) al.onclick=()=>{UI.sel=null;saveMine({start:defaultStart(r.entry),holds:[]})};
  view.querySelectorAll('.seg button').forEach(b=>b.onclick=()=>{
    const k=b.dataset.k,v=(k==='runDays'||k==='entry')?+b.dataset.v:b.dataset.v;UI.sel=null;
    if(k==='units')UNITS=v;
    saveMine(k==='entry'?{entry:v,start:defaultStart(v),holds:[]}:{[k]:v});
  });
  const ch=document.getElementById('clearHolds'); if(ch) ch.onclick=()=>saveMine({holds:[]});
  const sw=document.getElementById('switchMe'); if(sw) sw.onclick=async()=>{if(dirty)await push();ME=null;store.set('c10-me',null);UI.newRunner=false;UI.tab='crew';render()};
  const lv=document.getElementById('leave'); if(lv) lv.onclick=()=>{UI.confirmLeave=true;render()};
  const ln=document.getElementById('leaveNo'); if(ln) ln.onclick=()=>{UI.confirmLeave=false;render()};
  const ly=document.getElementById('leaveYes'); if(ly) ly.onclick=async()=>{UI.confirmLeave=false;try{const all=await apiPost({action:'delete',id:ME});dirty=false;store.set('c10-pending',null);ME=null;store.set('c10-me',null);applyServer(all);UI.who=orderedIds()[0]||null;UI.tab='crew'}catch(e){ERR='Could not delete your plan just now. Check your connection.'}render()};
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
  while(T.idx<T.segs.length&&T.el>=T.segs[T.idx][1]){T.el-=T.segs[T.idx][1];T.idx++;if(T.idx<T.segs.length)cue(T.segs[T.idx][0]);}
  if(T.idx>=T.segs.length){T.running=false;clearInterval(iv);beep(660,.2);beep(880,.2,.25);beep(1100,.35,.5);
    if(!T.logged&&mine()){T.logged=true;saveMine({logs:{[T.key]:{done:true}}})}}
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
      <div class="clock">${done?mmss(T.total):mmss(s[1]-T.el)}</div>
      <p class="muted">${done?'Session logged as complete. Cool down and stretch.':next?`Next: ${LABEL[next[0]]} ${mmss(next[1])}`:'Last segment'}</p>
    </div>
    <div class="prog"><div class="segbar" style="height:18px">${T.segs.map(x=>`<span class="s-${x[0]}" style="flex:${x[1]}"></span>`).join('')}</div><div class="cursor" style="left:calc(${elapsed/T.total*100}% - 1px)"></div></div>
    <div class="row mono muted" style="font-size:.85rem"><span>${mmss(elapsed)} elapsed</span><span>Segment ${Math.min(T.idx+1,T.segs.length)} / ${T.segs.length}</span><span>${mmss(T.total-elapsed)} left</span></div>
    <div class="actions">${done?`<button class="btn primary" id="tFinish">Log effort</button>`:`<button class="btn primary" id="tPlay">${T.running?'Pause':elapsed>0?'Resume':'Start'}</button><button class="btn" id="tSkip">Skip segment</button>`}</div>
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
  const k=document.getElementById('tSkip'); if(k) k.onclick=()=>{T.el=T.segs[T.idx][1];T.last=performance.now();const r=T.running;T.running=true;tick();if(!r&&T.idx<T.segs.length)T.running=false;drawTimer()};
}

document.querySelectorAll('.tabs button').forEach(b=>b.onclick=()=>{UI.tab=b.dataset.tab;store.set('c10-tab',UI.tab);ERR='';render()});
boot();
