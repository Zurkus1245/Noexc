/* ================= GymBro flow engine (shared by trainer & client mockups) ================= */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='gymbro:v1:'+APP;
let S;
function loadState(){try{const r=localStorage.getItem(KEY);if(r){const o=JSON.parse(r);if(o&&o.v===VER)return o}}catch(e){}return seed()}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){/* file:/data: — memory only */}}
function resetDemo(){S=seed();try{localStorage.removeItem(KEY)}catch(e){}U.hist=[];U.sheet=null;U.focus=null;U.pmode=null;U.pf=null;U.bdone=false;lastI=-1;toast('Демо сброшено');}
S=loadState();
const U={hist:[],sheet:null,toast:null,tt:0,dir:0};
const idx=id=>SCREENS.findIndex(s=>s.id==id);
const cur=()=>SCREENS[Math.max(0,idx(S.scr))];
/* navigation */
function go(id,push=true){if(idx(id)<0)return console.warn('no screen',id);if(push&&S.scr!==id)U.hist.push(S.scr);U.sheet=null;S.scr=id;commit();document.querySelector('.body')?.scrollTo(0,0)}
function back(fallback){const p=U.hist.pop();go(p||fallback||SCREENS[0].id,false)}
function tab(id){U.hist=[];go(id,false)}
function next(){const i=idx(S.scr);if(i<SCREENS.length-1)go(SCREENS[i+1].id)}
function prev(){const i=idx(S.scr);if(i>0)go(SCREENS[i-1].id)}
function commit(){save();render()}
/* sheets & toast */
function openSheet(k,p={}){U.sheet={k,...p};render()}
function closeSheet(){U.sheet=null;render()}
function toast(t){U.toast=t;render();clearTimeout(U.tt);U.tt=setTimeout(()=>{U.toast=null;render()},2600)}
function sheetWrap(inner){return `<div class="sheet" onclick="if(event.target==this)closeSheet()"><div class="gap12" role="dialog" aria-modal="true">${inner}</div></div>`}
/* shared UI bits */
const hdr=(mid='',right='',fb)=>`<div class="top"><button class="back" aria-label="Назад" onclick="back('${fb||''}')">${I.back}</button>${mid}${right||'<span style="width:36px"></span>'}</div>`;
const progBar=(n,t)=>`<div class="prog" aria-label="Шаг ${n} из ${t}">${Array.from({length:t},(_,k)=>`<i class="${k<n?'on':''}"></i>`).join('')}</div>`;
const tabs=(list,a)=>`<nav class="tabs" role="tablist">${list.map(([k,l,ic,id])=>`<button role="tab" aria-selected="${a==k}" class="${a==k?'on':''}" onclick="tab('${id}')">${ic}${l}</button>`).join('')}</nav>`;
const toggle=(on,fn,label)=>`<button class="tgl ${on?'on':''}" role="switch" aria-checked="${!!on}" aria-label="${label||''}" onclick="${fn}"><i></i></button>`;
const stepper=(val,dec,inc,unit='')=>`<div class="stp"><button class="step" aria-label="Меньше" onclick="${dec}">${I.minus}</button><b>${val}${unit?`<span class="xs mut"> ${unit}</span>`:''}</b><button class="step" aria-label="Больше" onclick="${inc}">${I.plus}</button></div>`;
const av=(name,cls='')=>`<div class="av ${cls}">${esc(String(name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase())}</div>`;
const fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
const kg=v=>v==null?'—':String(Math.round(v*10)/10).replace('.',',');
function spark(arr,h=90){if(!arr||arr.length<2)return `<div class="sm mut" style="padding:20px 0;text-align:center">Нужно минимум 2 замера, чтобы показать тренд</div>`;
 const mn=Math.min(...arr)-.3,mx=Math.max(...arr)+.3,W=300,st=W/(arr.length-1),y=v=>h-((v-mn)/(mx-mn))*(h-14)-7;
 const d=arr.map((v,i)=>`${i?'L':'M'}${(i*st).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
 return `<svg viewBox="0 0 ${W} ${h}" class="spark" preserveAspectRatio="none"><path d="${d} L${W} ${h} L0 ${h}Z" class="spark-a"/><path d="${d}" class="spark-l"/>${arr.map((v,i)=>i==arr.length-1?`<circle cx="${i*st}" cy="${y(v)}" r="4" class="spark-d"/>`:'').join('')}</svg>`}
/* Mifflin–St Jeor */
function kcalFor(p){if(!p.w||!p.h||!p.age)return null;const bmr=10*p.w+6.25*p.h-5*p.age+(p.sex=='m'?5:-161);const k={cut:.82,bulk:1.1,keep:1,strength:1.05}[p.goal]??1;return Math.round((bmr*(p.act||1.55)*k+(p.kcalAdj||0))/10)*10}
function macros(p){const k=kcalFor(p);if(!k)return null;const pr=Math.round(p.w*(p.goal=='cut'?2:1.8)),f=Math.round(p.w*.9),c=Math.max(0,Math.round((k-pr*4-f*9)/4));return {k,p:pr,f,c}}
/* render */
let lastI=-1,lastSheet='';
function render(){const i=Math.max(0,idx(S.scr)),s=SCREENS[i],scr=document.getElementById('scr');
 const ae=document.activeElement,fid=ae&&ae.id&&scr.contains(ae)?ae.id:null,sel=fid&&ae.selectionStart!=null?[ae.selectionStart,ae.selectionEnd]:null;
 const bodyScroll=scr.querySelector('.body')?.scrollTop||0;
 let sh='';if(U.sheet&&SHEETS[U.sheet.k])sh=sheetWrap(SHEETS[U.sheet.k](U.sheet));
 scr.innerHTML=s.r()+sh+(U.toast?`<div class="toast" role="status" aria-live="polite"><span>${esc(U.toast)}</span>${I.check}</div>`:'');
 const sk=U.sheet?U.sheet.k:'';
 scr.className='scr '+(i!==lastI?(i>lastI?'fwd':'bwd'):'still')+(sk===lastSheet?' sheet-still':'')+(U.toast&&U.toast===window._lt?' toast-still':'');window._lt=U.toast;
 if(i===lastI){const b=scr.querySelector('.body');if(b)b.scrollTop=bodyScroll}
 lastI=i;lastSheet=sk;
 if(fid){const el=document.getElementById(fid);if(el){el.focus();if(sel&&el.setSelectionRange)try{el.setSelectionRange(sel[0],sel[1])}catch(e){}}}
 if(typeof afterRender=='function')afterRender();
 document.getElementById('pos').textContent=`${i+1} / ${SCREENS.length}`;
 let g='',h='';SCREENS.forEach((x,k)=>{if(x.g!=g){g=x.g;h+=`<div class="grp">${g}</div>`}h+=`<button class="${k==i?'on':''}" onclick="U.hist=[];go('${x.id}',false)"><span>${k+1}</span>${x.t}</button>`});
 document.getElementById('nav').innerHTML=h;
 document.getElementById('notes').innerHTML=`<div class="who">Почему так · консилиум</div><h2>${s.t}</h2><ul>${s.notes.map(n=>`<li>${n}</li>`).join('')}</ul><div class="tz">${s.tz||''}</div><div class="state-peek"><div class="who" style="margin-top:18px">Живые данные</div>${PEEK()}</div>`;
}
/* dead-button self test: every button must have a handler or be disabled */
function selfTest(){const bad=[];document.querySelectorAll('#scr button,#scr [role=button]').forEach(b=>{if(!b.disabled&&!b.getAttribute('onclick')){bad.push((b.textContent||b.ariaLabel||'?').trim().slice(0,40));b.style.outline='2px dashed red'}});return bad}
function selfTestAll(){const keep=S.scr,out={};SCREENS.forEach(s=>{S.scr=s.id;U.sheet=null;render();const b=selfTest();if(b.length)out[s.id]=b});S.scr=keep;render();return out}
/* boot */
function boot(){
 document.querySelector('.status span:last-child').innerHTML=I.signal+'<span style="font-size:13px">5G</span>'+I.battery;
 const P=document.getElementById('prev'),N=document.getElementById('next'),T=document.getElementById('theme');
 P.innerHTML=I.back+'Назад';N.innerHTML='Дальше'+I.fwd;T.innerHTML=I.theme;P.onclick=prev;N.onclick=next;
 T.onclick=()=>{const r=document.documentElement;r.dataset.theme=r.dataset.theme=='light'?'dark':'light'};
 const R=document.createElement('button');R.id='reset';R.textContent='Сбросить демо';R.onclick=resetDemo;document.querySelector('.ctrl').appendChild(R);
 document.querySelector('.stage>.sm').textContent='Всё кликается внутри телефона. Изменения сохраняются в браузере (если он разрешает).';
 document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea'))return;if(e.key=='Escape'&&U.sheet)closeSheet();if(e.key=='ArrowRight')next();if(e.key=='ArrowLeft')prev()});
 render();
}

/* original mascot + entrance animation from gymbro-mockup */
const MASCOT=(hi)=>`<div class="mega">Gym<em>Bro</em></div>
  <div class="mascot-stage"><div class="bubble">${hi}</div>
   <svg class="mascot" viewBox="0 0 160 170" aria-label="Маскот GymBro">
    <ellipse class="m-shadow" cx="80" cy="162" rx="46" ry="6"/>
    <g class="m-body">
     <path class="m-handle" d="M52 52a28 28 0 0 1 56 0" fill="none" stroke-width="13" stroke-linecap="round"/>
     <path class="m-bell" d="M80 44c-36 0-56 26-56 58 0 28 18 52 56 52s56-24 56-52c0-32-20-58-56-58z"/>
     <ellipse class="m-shine" cx="56" cy="80" rx="9" ry="16" transform="rotate(20 56 80)"/>
     <g class="m-face"><circle cx="64" cy="98" r="6"/><circle cx="96" cy="98" r="6"/><circle class="m-eye-hi" cx="66" cy="96" r="2"/><circle class="m-eye-hi" cx="98" cy="96" r="2"/>
      <path d="M68 116q12 10 24 0" fill="none" stroke-width="4.5" stroke-linecap="round"/></g>
     <circle class="m-cheek" cx="54" cy="112" r="5"/><circle class="m-cheek" cx="106" cy="112" r="5"/>
     <g class="m-arm"><path d="M134 104q16-10 18-30" fill="none" stroke-width="10" stroke-linecap="round"/><circle cx="152" cy="70" r="8"/></g>
    </g>
   </svg></div>`;
