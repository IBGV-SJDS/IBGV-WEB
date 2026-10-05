document.getElementById('year').textContent=new Date().getFullYear();
const c=window.IBGV_CONFIG||{}; const ready=c.SUPABASE_URL&&!c.SUPABASE_URL.startsWith('PEGA_');
const esc=(v='')=>String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const safeUrl=(v='')=>{try{let x=String(v).trim();if(!x)return '#';if(!/^https?:\/\//i.test(x))x='https://'+x;const u=new URL(x);return ['http:','https:'].includes(u.protocol)?u.href:'#'}catch{return '#'}};
const linkOrHide=(label,url)=>{const u=safeUrl(url);return u==='#'?'':`<a target="_blank" rel="noopener noreferrer" href="${u}">${label}</a>`};
if(ready){const db=supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY);(async()=>{
 const {data:s}=await db.from('settings').select('*').eq('id',1).maybeSingle();
 if(s){['about','sunday','wednesday','address'].forEach(k=>{if(s[k]&&document.getElementById(k))document.getElementById(k).textContent=s[k]});
  if(s.whatsapp)document.getElementById('whatsapp').href='https://wa.me/'+s.whatsapp.replace(/\D/g,'');
  const lunch=document.getElementById('lunch-line'); if(s.lunch_enabled===false) lunch.hidden=true; else if(s.lunch_text) lunch.textContent=s.lunch_text;
  const maps=document.getElementById('maps'); const mapUrl=safeUrl(s.maps_url); if(mapUrl!=='#'){maps.href=mapUrl;maps.hidden=false}else{maps.hidden=true};
  const socialDefs=[['Facebook',s.facebook_url],['YouTube',s.youtube_url],['Instagram',s.instagram_url],['Enlace',s.other_social_url]];
  document.getElementById('socials').innerHTML=socialDefs.map(x=>linkOrHide(x[0],x[1])).join('');
 }
 const {data:sermons}=await db.from('sermons').select('*').order('created_at',{ascending:false});
 if(sermons?.length){
   const groups={}; sermons.forEach(x=>{const book=(x.book||'Otros').trim()||'Otros';(groups[book]??=[]).push(x)});
   document.getElementById('sermon-list').innerHTML=Object.entries(groups).map(([book,items])=>`<section class="sermon-group"><h3 class="sermon-book">${esc(book)}</h3><div class="cards">${items.map(x=>`<article class="card"><h3>${esc(x.title)}</h3>${x.series?`<p class="series-tag">Serie: ${esc(x.series)}</p>`:''}<p>${esc(x.passage||'')} ${x.preacher?'· '+esc(x.preacher):''}</p>${safeUrl(x.youtube_url)!=='#'?`<a class="btn" target="_blank" rel="noopener noreferrer" href="${safeUrl(x.youtube_url)}">Ver sermón</a>`:''}</article>`).join('')}</div></section>`).join('');
 }
 const {data:leaders}=await db.from('leadership').select('*').eq('visible',true).order('sort_order').order('created_at'); if(leaders?.length)document.getElementById('leadership-list').innerHTML=leaders.map(x=>`<article class="card">${safeUrl(x.photo_url)!=='#'?`<img class="leader-photo" src="${safeUrl(x.photo_url)}" alt="${esc(x.name)}">`:''}<h3>${esc(x.name)}</h3><p><strong>${esc(x.role||'')}</strong></p><p>${esc(x.bio||'')}</p></article>`).join('');
 const {data:albums}=await db.from('albums').select('*').eq('visible',true).order('sort_order').order('created_at',{ascending:false});
 if(albums?.length)document.getElementById('album-list').innerHTML=albums.map(x=>`<figure>${safeUrl(x.cover_url)!=='#'?`<img loading="lazy" src="${safeUrl(x.cover_url)}" alt="${esc(x.title)}">`:''}<figcaption><strong>${esc(x.title)}</strong>${x.description?`<p>${esc(x.description)}</p>`:''}${safeUrl(x.album_url)!=='#'?`<a class="btn secondary" target="_blank" rel="noopener noreferrer" href="${safeUrl(x.album_url)}">Ver álbum →</a>`:''}</figcaption></figure>`).join('');
})()}
