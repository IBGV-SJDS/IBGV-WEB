/* Complemento independiente: programa público IBGV */
(async()=>{
 const c=window.IBGV_CONFIG||{};if(!c.SUPABASE_URL||!c.SUPABASE_ANON_KEY||!window.supabase)return;
 const sunday=document.getElementById('sunday');if(!sunday)return;
 const db=supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY);
 const {data,error}=await db.from('meeting_schedule').select('day,title,start_time,end_time').eq('visible',true).order('sort_order').order('start_time');
 if(error||!data?.length)return; // Mantiene el diseño anterior si falla la consulta.
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=s=>{const [h,m]=s.slice(0,5).split(':').map(Number);return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'a. m.':'p. m.'}`};
 const render=day=>data.filter(x=>x.day===day).map(x=>`<div class="meeting-activity" style="margin:.6rem 0"><strong>${esc(x.title)}</strong><div>${fmt(x.start_time)} – ${fmt(x.end_time)}</div></div>`).join('');
 const sundayItems=render('domingo');
 if(sundayItems){sunday.textContent='';sunday.insertAdjacentHTML('afterend',`<div class="meeting-program" aria-label="Programa del domingo">${sundayItems}</div>`);const lunch=document.getElementById('lunch-line');if(lunch)lunch.hidden=true}
 const wednesday=document.getElementById('wednesday');const wednesdayItems=render('miercoles');if(wednesday&&wednesdayItems){wednesday.textContent='';wednesday.insertAdjacentHTML('afterend',`<div class="meeting-program" aria-label="Programa del miércoles">${wednesdayItems}</div>`)}
})();
