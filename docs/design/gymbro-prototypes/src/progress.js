/* ================= Прогресс: сила + вес тела (решение консилиума, 5 агентов) =================
   • Две синхронные панели с общей осью дат: сверху сила (расчётный 1ПМ), снизу вес тела. Без двух осей Y на одном поле.
   • Сила = расчётный 1ПМ по Эпли w×(1+r/30), только подходы 1–10 повторов. По умолчанию «Сумма силы» = присед + жим + становая.
   • Вес тела — нейтральный цвет, только тренд (среднее за 7 дней), сырые замеры бледными точками; скрывается одним переключателем.
   • Плато = «Стабильно», без красного. Пропуски не превращаются в ноль. */
const DAYMS=864e5,NOW=Date.UTC(2026,10,24);
const LIFTS={sq:'Присед со штангой',bp:'Жим штанги лёжа',dl:'Становая тяга'};
const LN={sum:'Сумма силы',sq:'Присед',bp:'Жим',dl:'Тяга'};
const MONTHS=['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
const fmtD=t=>{const d=new Date(t);return d.getUTCDate()+' '+MONTHS[d.getUTCMonth()]};
const fmtDs=t=>{const d=new Date(t);return String(d.getUTCDate()).padStart(2,'0')+'.'+String(d.getUTCMonth()+1).padStart(2,'0')};
const e1rm=(w,r)=>r>=1&&r<=10&&w>0?w*(1+r/30):null;
const r05=v=>Math.round(v*2)/2;
/* демо от силового тренера: 8 недель, StrongLifts 5×5, похудение 64 → 61,6 кг, плато на 4-й и 6-й неделе */
function demoPG(){const lifts=[],bw=[];const W=[[64,35,30,40],[63.6,40,32.5,45],[63.2,45,35,50],[63,45,35,50],[62.5,47.5,37.5,55],[62.2,50,37.5,55],[61.9,50,40,60],[61.6,52.5,40,60]];let a=true;
 W.forEach((w,k)=>{const mon=Date.UTC(2026,9,5)+k*7*DAYMS;
  [0,2,4].forEach(o=>{const t=mon+o*DAYMS;if(t>NOW)return;lifts.push({t,n:LIFTS.sq,w:w[1],r:5});lifts.push(a?{t,n:LIFTS.bp,w:w[2],r:5}:{t,n:LIFTS.dl,w:w[3],r:5});a=!a});
  const nz=[.25,-.2,.35,-.1,.15,-.3,.05,.2][k];[0,3].forEach((o,j)=>{const t=mon+o*DAYMS;if(t<=NOW)bw.push({t,kg:Math.round((w[0]+(j?-nz:nz))*10)/10})})});
 return {lifts,bw}}
const PG=()=>S.pg||(S.pg=demoPG());
function liftSeries(key){const L=PG().lifts;
 const best=n=>{const m={};L.filter(x=>x.n==n).forEach(x=>{const v=e1rm(x.w,x.r);if(v==null)return;if(!m[x.t]||v>m[x.t].v)m[x.t]={t:x.t,v,w:x.w,r:x.r}});return Object.values(m).sort((a,b)=>a.t-b.t)};
 if(key!='sum')return best(LIFTS[key]);
 const S3=['sq','bp','dl'].map(k=>best(LIFTS[k])),ts=[...new Set(S3.flat().map(p=>p.t))].sort((a,b)=>a-b),last=[null,null,null],out=[];
 ts.forEach(t=>{S3.forEach((s,i)=>{const p=s.find(x=>x.t==t);if(p)last[i]=p});if(last.every(Boolean))out.push({t,v:last.reduce((a,p)=>a+p.v,0),parts:last.map(p=>p.w)})});return out}
const PER={'4w':['4 нед',28],'3m':['3 мес',91],all:['Всё',1e9]};
const inPer=(arr,per)=>{const from=NOW-PER[per][1]*DAYMS;return arr.filter(p=>p.t>=from)};
const bwMA=raw=>raw.map(p=>{const w=raw.filter(q=>q.t<=p.t&&q.t>p.t-7*DAYMS);return {t:p.t,v:w.reduce((s,q)=>s+q.kg,0)/w.length}});
function niceTicks(min,max,n=4){const raw=((max-min)||1)/(n-1),mag=10**Math.floor(Math.log10(raw)),step=[1,2,2.5,5,10].map(m=>m*mag).find(s=>s>=raw);const lo=Math.floor(min/step)*step,hi=Math.ceil(max/step)*step,out=[];for(let v=lo;v<=hi+step/2;v+=step)out.push(+v.toFixed(4));return out}
/* ---- chart: two panels, one time axis ---- */
function pgChart(key,per,showBw){const s=inPer(liftSeries(key),per),rawB=inPer(PG().bw,per),b=bwMA(rawB);
 if(s.length<2)return {svg:`<div class="pg-empty"><b>${s.length?'Одна тренировка есть':'Графика пока нет'}</b>${s.length?'Ещё одна — и появится линия.':'Одна тренировка — и он появится.'}<button class="btn s" style="margin-top:10px;height:44px" onclick="tab('c-today')">К тренировкам</button></div>`,s};
 const W=340,PL=34,PR=58,T1=12,H1=150,G=26,H2=showBw?84:0,XA=18,H=T1+H1+(showBw?G+H2:0)+XA;
 const t0=s[0].t,t1=Math.max(s.at(-1).t,rawB.at(-1)?.t||0);
 const X=t=>PL+(t-t0)/((t1-t0)||1)*(W-PL-PR);
 const ts=niceTicks(Math.min(...s.map(p=>p.v)),Math.max(...s.map(p=>p.v)),4);const Ys=v=>T1+(1-(v-ts[0])/((ts.at(-1)-ts[0])||1))*H1;
 const bt=b.length?niceTicks(Math.min(...rawB.map(p=>p.kg)),Math.max(...rawB.map(p=>p.kg)),3):[0,1];const B0=T1+H1+G;const Yb=v=>B0+(1-(v-bt[0])/((bt.at(-1)-bt[0])||1))*H2;
 const path=(ps,Y)=>ps.map((p,i)=>`${i?'L':'M'}${X(p.t).toFixed(1)} ${Y(p.v).toFixed(1)}`).join('');
 let mx=-1;const rec=s.filter((p,i)=>{const r=i>0&&p.v>mx+.01;mx=Math.max(mx,p.v);return r});
 const xt=[t0,t0+(t1-t0)/2,t1];
 U.pg={s,b,X,Ys,Yb,key,showBw,W,H};
 const svg=`<svg class="pg-svg ${U.pgDraw?'draw':''}" viewBox="0 0 ${W} ${H}" role="img" tabindex="0" aria-label="${LN[key]}: ${kg(s[0].v)} → ${kg(s.at(-1).v)} кг расчётный 1ПМ${showBw&&b.length?`, вес тела ${kg(b.at(-1).v)} кг`:''}. Стрелки влево и вправо — по точкам." onkeydown="pgKey(event)">
 <text class="pg-cap" x="${PL}" y="8">${LN[key].toUpperCase()} · РАСЧЁТНЫЙ 1ПМ, КГ</text>
 ${ts.map(v=>`<line class="pg-grid" x1="${PL}" x2="${W-PR+6}" y1="${Ys(v)}" y2="${Ys(v)}"/><text class="pg-yl" x="${PL-6}" y="${Ys(v)+3}">${v}</text>`).join('')}
 <path class="pg-s" pathLength="1" d="${path(s,Ys)}"/>
 ${s.map(p=>`<circle class="pg-sp" cx="${X(p.t)}" cy="${Ys(p.v)}" r="2.6"/>`).join('')}
 ${rec.map(p=>`<circle class="pg-rec" cx="${X(p.t)}" cy="${Ys(p.v)}" r="5"/>`).join('')}
 <text class="pg-end pg-end-s" x="${X(s.at(-1).t)+8}" y="${Ys(s.at(-1).v)+4}">${kg(r05(s.at(-1).v))}</text>
 ${showBw&&b.length?`<text class="pg-cap" x="${PL}" y="${B0-10}">ВЕС ТЕЛА, КГ · СРЕДНЕЕ ЗА 7 ДНЕЙ</text>
  ${bt.map(v=>`<line class="pg-grid" x1="${PL}" x2="${W-PR+6}" y1="${Yb(v)}" y2="${Yb(v)}"/><text class="pg-yl" x="${PL-6}" y="${Yb(v)+3}">${kg(v)}</text>`).join('')}
  ${rawB.map(p=>`<circle class="pg-bp" cx="${X(p.t)}" cy="${Yb(p.kg)}" r="2.2"/>`).join('')}
  ${b.length>1?`<path class="pg-b" d="${path(b,Yb)}"/>`:''}
  <text class="pg-end pg-end-b" x="${X(b.at(-1).t)+8}" y="${Yb(b.at(-1).v)+4}">${kg(b.at(-1).v)}</text>`:''}
 ${xt.map((t,i)=>`<text class="pg-xl" x="${X(t)}" y="${H-4}" text-anchor="${['start','middle','end'][i]}">${fmtDs(t)}</text>`).join('')}
 <line class="pg-cur" x1="0" x2="0" y1="${T1}" y2="${H-XA}" style="opacity:0"/><circle class="pg-dot" r="5" style="opacity:0"/><circle class="pg-dotb" r="4" style="opacity:0"/>
 <rect class="pg-hit" x="${PL-6}" y="0" width="${W-PL-PR+20}" height="${H-XA}" onpointerdown="pgScrub(event,1)" onpointermove="pgScrub(event)" onpointerleave="pgEnd()" onpointerup="pgEnd()" onpointercancel="pgEnd()"/></svg>`;
 return {svg,s,rec,b}}
/* ---- scrub: only attributes change, no re-render ---- */
function pgShow(i){const g=U.pg;if(!g)return;const p=g.s[i];U.pgI=i;const svg=document.querySelector('.pg-svg');if(!svg)return;const x=g.X(p.t);
 const cur=svg.querySelector('.pg-cur'),dot=svg.querySelector('.pg-dot'),dotb=svg.querySelector('.pg-dotb');cur.setAttribute('x1',x);cur.setAttribute('x2',x);cur.style.opacity=1;dot.setAttribute('cx',x);dot.setAttribute('cy',g.Ys(p.v));dot.style.opacity=1;
 let bv=null;if(g.showBw&&g.b.length){bv=g.b.reduce((a,q)=>Math.abs(q.t-p.t)<Math.abs(a.t-p.t)?q:a);dotb.setAttribute('cx',g.X(bv.t));dotb.setAttribute('cy',g.Yb(bv.v));dotb.style.opacity=1}
 const tip=document.getElementById('pgTip');if(tip){tip.innerHTML=`<b>${fmtD(p.t)}</b> · ${LN[g.key]} ${kg(r05(p.v))} кг<span class="mut">${p.parts?` (${p.parts.map(kg).join(' + ')} раб.)`:p.w?` · ${kg(p.w)} × ${p.r}`:''}</span>${bv?`<br><span class="mut">Вес тела ${kg(bv.v)} кг</span>`:''}`;tip.classList.add('on');tip.style.left=Math.min(Math.max(x/g.W*100,22),78)+'%'}
 if(navigator.vibrate&&U.pgLastI!==i)try{navigator.vibrate(3)}catch(e){}U.pgLastI=i}
function pgScrub(e,down){const g=U.pg;if(!g)return;if(e.pointerType=='touch'&&!down&&!e.buttons)return;if(down)try{e.target.setPointerCapture(e.pointerId)}catch(_){}
 const svg=e.target.ownerSVGElement,pt=svg.createSVGPoint();pt.x=e.clientX;pt.y=e.clientY;const vx=pt.matrixTransform(svg.getScreenCTM().inverse()).x;
 let k=0;g.s.forEach((p,i)=>{if(Math.abs(g.X(p.t)-vx)<Math.abs(g.X(g.s[k].t)-vx))k=i});pgShow(k)}
function pgEnd(){clearTimeout(U.pgT);U.pgT=setTimeout(()=>{const svg=document.querySelector('.pg-svg');if(!svg)return;svg.querySelectorAll('.pg-cur,.pg-dot,.pg-dotb').forEach(n=>n.style.opacity=0);document.getElementById('pgTip')?.classList.remove('on')},2000)}
function pgKey(e){if(e.key!='ArrowLeft'&&e.key!='ArrowRight')return;e.preventDefault();const n=U.pg.s.length;pgShow(Math.max(0,Math.min(n-1,(U.pgI??n-1)+(e.key=='ArrowRight'?1:-1))))}
function pgSet(k,v){S[k]=v;U.pgDraw=true;U.pgI=null;commit();U.pgDraw=false}
/* ---- hooks: real workouts and weigh-ins feed the chart ---- */
function logWeight(v){S.weights.push(v);S.w=String(v).replace('.',',');PG().bw.push({t:NOW,kg:v});U.sheet=null;toast(`Вес ${kg(v)} кг записан`)}
/* ---- screen ---- */
SCREENS.find(x=>x.id=='c-progress').notes=['Две панели с общей осью дат: сверху сила, снизу вес тела. Две оси Y на одном поле врут — их нет.','Сила = расчётный 1ПМ (Эпли, подходы до 10 повторов). «Сумма силы» = присед + жим + становая.','Вес тела нейтральным цветом, только тренд за 7 дней. Скрывается одним переключателем.','Проведи пальцем по графику — дата, сила и вес в этот день. Синие кольца — рекорды.','Плато = «Стабильно», без красного.'];
SCREENS.find(x=>x.id=='c-progress').tz='Консилиум 5 агентов: визуализация, тренер, iOS-дизайн, психолог, инженер';
SCREENS.find(x=>x.id=='c-progress').r=()=>{const key=S.pgKey||'sum',per=S.pgPer||'all',showBw=!S.pgHideBw;const C=pgChart(key,per,showBw),s=C.s;
 const d=s.length>1?s.at(-1).v-s[0].v:0,wk=s.length>1?Math.max(1,Math.round((s.at(-1).t-s[0].t)/(7*DAYMS))):0;
 const L=PG().lifts,best=n=>L.filter(x=>x.n==n).reduce((a,x)=>!a||x.w>a.w?x:a,null),firstW=n=>L.filter(x=>x.n==n).sort((a,b)=>a.t-b.t)[0]?.w;
 const sessions=new Set(L.map(x=>x.t)).size;const reach=(n,w)=>L.filter(x=>x.n==n&&x.w>=w).sort((a,b)=>a.t-b.t)[0];
 const miles=[[reach(LIFTS.sq,50),'Первые 50 кг в приседе'],[reach(LIFTS.bp,40),'Жим 40 кг'],[reach(LIFTS.dl,60),'Становая 60 кг']].filter(m=>m[0]);
 return `<div class="top"><div class="h1" style="margin:0">Прогресс</div><span></span></div><div class="body col gap12">
 <div class="pg-head">${s.length>1?`<div class="pg-big">${d>=1?'+'+kg(r05(d))+' кг':'Стабильно'}</div><div class="sm mut">${LN[key]} · расчётный 1ПМ · ${wk} нед · ${kg(r05(s[0].v))} → ${kg(r05(s.at(-1).v))} кг</div>`:`<div class="pg-big">—</div><div class="sm mut">Нужно минимум 2 тренировки с этим упражнением</div>`}</div>
 <div class="chips" role="tablist">${Object.entries(LN).map(([k,l])=>`<button class="chip ${key==k?'on':''}" role="tab" aria-selected="${key==k}" onclick="pgSet('pgKey','${k}')">${l.replace(' силы','')}</button>`).join('')}</div>
 <div class="card pg-card"><div id="pgTip" class="pg-tip" aria-live="polite"></div>${C.svg}
  <div class="row sb" style="margin-top:8px"><div class="seg pg-per">${Object.entries(PER).map(([k,[l]])=>`<button class="${per==k?'on':''}" onclick="pgSet('pgPer','${k}')">${l}</button>`).join('')}</div></div>
  <div class="li" style="margin-top:6px"><span style="flex:1" class="sm">Показывать вес тела</span>${toggle(showBw,"pgSet('pgHideBw',!S.pgHideBw)",'Показывать вес тела')}</div>
  ${s.length>1?'<div class="xs mut">Проведи пальцем по графику. Синие кольца — рекорды.</div>':''}</div>
 <button class="btn s" onclick="openSheet('weight')">${I.plus}Записать вес</button>
 <div class="card"><b>Рекорды</b>${Object.entries(LIFTS).map(([k,n])=>{const b=best(n),f=firstW(n);return b?`<button class="li tap" onclick="pgSet('pgKey','${k}')"><div style="flex:1"><span class="sm">${LN[k]}</span><div class="xs mut">${fmtD(b.t)} · ${kg(b.w)} × ${b.r}</div></div><b class="sm">${kg(b.w)} кг</b>${f&&b.w>f?`<span class="xs" style="color:#FF7A1A;margin-left:6px">+${kg(b.w-f)}</span>`:''}</button>`:''}).join('')}</div>
 <div class="card"><b>Вехи</b><div class="li"><span style="flex:1" class="sm">Тренировок записано</span><b class="sm">${sessions}</b></div>${miles.map(([m,l])=>`<div class="li"><span style="flex:1" class="sm">${l}</span><span class="xs mut">${fmtD(m.t)}</span></div>`).join('')}</div>
 <div class="card"><b>История</b>${S.free?`<div class="empty">История — в подписке<button class="btn s" style="height:44px;margin-top:8px" onclick="go('c-paywall')">Попробовать 7 дней</button></div>`:S.history.length?S.history.map(h=>`<div class="li"><div style="flex:1"><span class="sm">${esc(h.t)}</span><div class="xs mut">${h.date} · ${h.sets} подх.${h.rpe?' · RPE '+h.rpe:''}</div></div><b class="sm">${fmt(h.vol)} кг</b></div>`).join(''):'<div class="empty">Закрой тренировку в приложении — она появится здесь</div>'}</div></div>${tabsC('chart')}`};
