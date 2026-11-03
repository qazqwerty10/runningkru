// Offline support: keeps a copy of the app's own files so it opens without internet.
// App files are fetched fresh when online (network first) and fall back to the saved copy.
// Requests to Google's script are never cached here; the app keeps its own copy of the plan.
const CACHE='c10-app-v9';
const FILES=['./','./index.html','./app.js','./config.js','./manifest.webmanifest','./icon.svg','./icon-180.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('c10-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});

function networkFirst(req){
  return new Promise(resolve=>{
    let done=false;
    const fallback=()=>caches.match(req,{ignoreSearch:true}).then(r=>r||(req.mode==='navigate'?caches.match('./index.html'):undefined)).then(r=>{if(!done){done=true;resolve(r||Response.error())}});
    const timer=setTimeout(fallback,4000); // slow gym/trailhead signal: open from cache after 4 s
    fetch(req).then(res=>{
      if(res&&res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy))}
      clearTimeout(timer);if(!done){done=true;resolve(res)}
    }).catch(()=>{clearTimeout(timer);fallback()});
  });
}
function staleWhileRevalidate(req){
  return caches.open(CACHE+'-fonts').then(c=>c.match(req).then(hit=>{
    const net=fetch(req).then(res=>{if(res&&(res.ok||res.type==='opaque'))c.put(req,res.clone());return res}).catch(()=>hit);
    return hit||net;
  }));
}
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin===self.location.origin){e.respondWith(networkFirst(req));return}
  if(url.hostname==='fonts.googleapis.com'||url.hostname==='fonts.gstatic.com'){e.respondWith(staleWhileRevalidate(req))}
});
