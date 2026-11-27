/* ================= Неделя самостоятельного: дни → шаблон или своя тренировка =================
   Консилиум: полоса недели + большая карточка выбранного дня; пустая неделя = подсказка «Заполнить неделю»,
   а не голые пустые карточки; шаблон применяется только после превью и показа раскладки по дням;
   пропущенный день — без красного, с «Перенести на сегодня». */
const TODAY=1; // вторник, 24 ноября 2026
const DATES=[23,24,25,26,27,28,29];
const DFULL=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
const DACC=['понедельник','вторник','среду','четверг','пятницу','субботу','воскресенье'];
const defW=n=>/Отжимани|без веса|Подтягивани|Планка|Супермен|на одной ноге|Брусья|Подъём ног/.test(n)?0:/гантел|Разводка|Махи|Выпады/.test(n)?8:/блок|Жим ногами|Сгибания ног|Тяга к лицу/.test(n)?30:20;
const E=(n,s,r,rest)=>({n,s,r,w:defW(n),rest});
/* Источники проверены исследователем консилиума (stronglifts.com, thefitness.wiki, fitnessvolt.com, jefit.com, myprotein.com) */
const TEMPLATES=[
 {id:'sl5',n:'StrongLifts 5×5',kind:'full',lvl:'Новичок',per:3,src:'stronglifts.com',why:'Три базовых упражнения, +2,5 кг каждую тренировку',days:[
  {t:'День A',ex:[E('Присед со штангой',5,5,180),E('Жим штанги лёжа',5,5,180),E('Тяга штанги в наклоне',5,5,180)]},
  {t:'День B',ex:[E('Присед со штангой',5,5,180),E('Жим штанги стоя',5,5,180),E('Становая тяга',1,5,300)]}]},
 {id:'rfb',n:'Базовая r/Fitness',kind:'full',lvl:'Новичок',per:3,src:'thefitness.wiki',why:'3×5, последний подход — на максимум повторов',days:[
  {t:'День A',ex:[E('Тяга штанги в наклоне',3,5,150),E('Жим штанги лёжа',3,5,150),E('Присед со штангой',3,5,150)]},
  {t:'День B',ex:[E('Подтягивания',3,5,150),E('Жим штанги стоя',3,5,150),E('Становая тяга',3,5,180)]}]},
 {id:'home',n:'Дома без оборудования',kind:'home',lvl:'Новичок',per:3,src:'myprotein.com',why:'Только вес тела, 30–40 минут',days:[
  {t:'Всё тело',ex:[E('Приседания без веса',4,10,60),E('Отжимания',4,8,60),E('Выпады',4,8,60),E('Супермены',4,10,45),E('Ягодичный мост на одной ноге',3,10,45),E('Планка, сек',3,60,60)]}]},
 {id:'ul4',n:'Верх / Низ',kind:'split',lvl:'Средний',per:4,src:'fitnessvolt.com',why:'Каждая мышца дважды в неделю',days:[
  {t:'Верх 1',ex:[E('Подтягивания',3,8,60),E('Тяга гантели в наклоне',2,12,45),E('Жим гантелей на наклонной',3,8,60),E('Разводка гантелей сидя',2,12,45)]},
  {t:'Низ 1',ex:[E('Присед со штангой',4,5,120),E('Болгарские выпады',2,12,60),E('Ягодичный мост со штангой',2,10,60),E('Сгибания ног лёжа',2,12,45)]},
  {t:'Верх 2',ex:[E('Становая тяга',2,8,90),E('Жим штанги лёжа',3,8,90),E('Жим штанги сидя',3,12,60),E('Тяга блока сидя',2,10,45)]},
  {t:'Низ 2',ex:[E('Жим ногами',3,10,60),E('Выпады назад с гантелями',2,15,45),E('Ягодичный мост',2,10,45),E('Сгибания ног сидя',2,12,45)]}]},
 {id:'ppl',n:'Push / Pull / Legs',kind:'split',lvl:'Средний',per:6,src:'jefit.com',why:'Жимы, тяги и ноги — по отдельности',days:[
  {t:'Push A',ex:[E('Жим штанги лёжа',4,5,180),E('Жим штанги стоя',3,8,120),E('Жим гантелей на наклонной',3,10,90),E('Махи гантелями в стороны',3,15,60)]},
  {t:'Pull A',ex:[E('Становая тяга',3,5,180),E('Подтягивания',3,8,120),E('Тяга штанги в наклоне',3,8,120),E('Тяга к лицу на блоке',3,15,60)]},
  {t:'Legs A',ex:[E('Присед со штангой',4,6,180),E('Румынская тяга',3,8,120),E('Жим ногами',3,10,120),E('Подъём ног в висе',3,12,60)]},
  {t:'Push B',ex:[E('Жим штанги на наклонной',4,6,150),E('Жим гантелей лёжа',3,10,90),E('Жим гантелей сидя',3,10,90),E('Брусья',3,10,90)]},
  {t:'Pull B',ex:[E('Тяга штанги в наклоне',4,6,150),E('Тяга верхнего блока',3,10,90),E('Тяга блока сидя',3,10,90),E('Обратная разводка',3,15,60)]},
  {t:'Legs B',ex:[E('Фронтальный присед',3,8,150),E('Ягодичный мост со штангой',3,10,120),E('Болгарские выпады',3,10,90),E('Сгибания ног сидя',3,12,60)]}]}];
const KIND={all:'Все',full:'Фулбоди',split:'Сплит',home:'Дома'};
const SL=()=>S.slots||(S.slots={});
const mins=ex=>Math.max(10,Math.round(ex.reduce((a,e)=>a+e.s*((/сек/.test(e.n)?e.r:e.r*4)+e.rest),0)/60/5)*5);
const tplMins=t=>Math.round(t.days.reduce((a,d)=>a+mins(d.ex),0)/t.days.length/5)*5;
const weekKeys=()=>[...new Set([...S.days,...Object.keys(SL()).map(Number).filter(k=>SL()[k]&&SL()[k].ex)])].sort((a,b)=>a-b);
const slotState=k=>{const s=SL()[k];if(s&&s.moved)return 'moved';if(s&&s.done)return 'done';if(k<TODAY)return s&&s.ex?'missed':'past';return s&&s.ex?'set':'empty'};
const suggest=()=>{const n=S.days.length;return TEMPLATES.find(t=>t.id==(n>=6?'ppl':n>=4?'ul4':'sl5'))};
const focusKey=()=>{if(U.focus!=null)return U.focus;const ks=weekKeys();return ks.includes(TODAY)?TODAY:(ks.find(k=>k>TODAY)??ks[0]??TODAY)};
/* ---- actions ---- */
function applyWeek(id){const t=TEMPLATES.find(x=>x.id==id);S.days.forEach((d,i)=>{if(SL()[d]?.done)return;const td=t.days[i%t.days.length];SL()[d]={t:`${t.n} · ${td.t}`,ex:clone(td.ex),tpl:t.id,done:false}});U.sheet=null;U.focus=null;toast(`«${t.n}» разложен по ${S.days.length} дням`)}
function applyDay(id,key,ti){const t=TEMPLATES.find(x=>x.id==id),td=t.days[ti||0];SL()[key]={t:`${t.n} · ${td.t}`,ex:clone(td.ex),tpl:t.id,done:false};if(!S.days.includes(key)){S.days.push(key);S.days.sort()}U.sheet=null;U.focus=key;toast(`${DFULL[key]}: ${td.t}`)}
function clearSlot(k){delete SL()[k];U.sheet=null;toast(`${DFULL[k]} очищен`)}
function undoDone(k){SL()[k].done=false;U.sheet=null;toast('Отметка снята')}
function moveToToday(k){SL()[TODAY]={...clone(SL()[k]),done:false};SL()[k]={moved:true,t:SL()[k].t};U.focus=TODAY;toast('Перенесли на сегодня')}
function addRestDay(k){S.days.push(k);S.days.sort();U.focus=k;openSheet('pick',{key:k})}
function pickFocus(k){U.focus=k;render()}
/* ---- workout from a slot (solo) or plan day (coach) ---- */
function startSlot(k){const s=SL()[k];if(!s?.ex)return openSheet('pick',{key:k});S.wk={key:k,name:DFULL[k]+' · '+s.t.split(' · ').pop(),exs:clone(s.ex),sets:s.ex.map(e=>Array.from({length:e.s},()=>({w:e.w,r:e.r,done:false}))),rest:0,t0:Date.now()};go('c-workout')}
function startWorkout(i){if(i==null)return toast('Неделя закрыта · отдыхай');const d=S.program.days[i];S.wk={key:'p'+i,pday:i,name:d.t,exs:clone(d.ex),sets:d.ex.map(e=>Array.from({length:e.s},()=>({w:e.w,r:e.r,done:false}))),rest:0,t0:Date.now()};go('c-workout')}
function setDone(e,s){const x=S.wk.sets[e][s];if(x.done)return;x.done=true;if(S.wk.sets[e].some(z=>!z.done)){S.wk.rest=S.wk.exs[e].rest;clearInterval(U.rt);U.rt=setInterval(tickRest,1000)}commit()}
function finishWorkout(){let vol=0,sets=0;const prs=[];S.wk.sets.forEach((ss,e)=>ss.forEach(x=>{if(x.done){vol+=x.w*x.r;sets++;const n=S.wk.exs[e].n;if(x.w>0&&x.w>(S.prs[n]||0)){S.prs[n]=x.w;prs.push(`${n} ${kg(x.w)} кг`)}}}));
 if(!sets)return toast('Отметь хотя бы один подход');clearInterval(U.rt);S.wk.result={vol,sets,prs,min:Math.max(1,Math.round((Date.now()-S.wk.t0)/60000))};S.rpe=0;S.feel='';S.note='';go('c-summary')}
function closeSummary(){const r=S.wk.result,w=S.wk;if(String(w.key)[0]=='p')S.week[w.pday]=true;else{const s=SL()[w.key];if(s){s.done=true;s.res=`${r.sets} подх. · ${r.min} мин`}}
 S.history.unshift({t:w.name,vol:r.vol,sets:r.sets,rpe:S.rpe,date:'сегодня'});S.streak++;
 if(isCoach())S.msgs.push(['me',`Тренировка «${w.name}» · ${r.sets} подх. · RPE ${S.rpe||'—'}${S.feel?` · ${S.feel}`:''}${S.note?` · ${S.note}`:''}`,'сейчас']);
 S.wk.sets.forEach((ss,e)=>ss.forEach(x=>{if(x.done&&x.w>0)PG().lifts.push({t:NOW,n:S.wk.exs[e].n,w:x.w,r:x.r})}));U.pgDraw=true;
 S.wk=null;const first=!S.firstDone;S.firstDone=true;tab('c-today');if(first&&S.push==null)openSheet('push');else toast(isCoach()?'Отчёт ушёл тренеру':'Готово. Записали в историю.')}
/* plan build now only prepares the week; templates are chosen on «Сегодня» */
function ensureBuild(){if(U.bt||U.bdone||S.scr!='c-build')return;U.bs=0;U.bt=setInterval(()=>{if(S.scr!='c-build'){clearInterval(U.bt);U.bt=null;return}U.bs++;
 if(U.bs>=4){clearInterval(U.bt);U.bt=null;U.bdone=true;S.slots=S.slots||{};save();render();setTimeout(()=>{if(S.scr=='c-build')go('c-paywall')},900);return}render()},600)}
function PEEK(){const m=macros(ME());return `Режим: <b>${S.mode=='coach'?'с тренером':S.mode=='solo'?'сам':'—'}</b>${S.coach?` · тренер <b>${S.coach.name}</b>`:''}<br>Дни: <b>${S.days.map(k=>DN[k]).join(', ')||'—'}</b><br>${weekKeys().map(k=>`${DN[k]}: <b>${esc(SL()[k]?.t||'пусто')}</b>${SL()[k]?.done?' ✓':''}`).join('<br>')}<br>Норма: <b>${m?fmt(m.k)+' ккал':'—'}</b> · съедено <b>${fmt(eatenK())}</b><br>Подписка: <b>${S.paid?'активна':S.free?'бесплатный режим':'—'}</b>`}
/* ---- builder for one day ---- */
const EXLIB=[['Присед со штангой','Ноги'],['Жим ногами','Ноги'],['Выпады с гантелями','Ноги'],['Болгарские выпады','Ноги'],['Румынская тяга','Ноги'],['Сгибания ног лёжа','Ноги'],['Ягодичный мост','Ягодицы'],['Ягодичный мост со штангой','Ягодицы'],['Жим штанги лёжа','Грудь'],['Жим гантелей на наклонной','Грудь'],['Отжимания','Грудь'],['Брусья','Грудь'],['Жим штанги стоя','Плечи'],['Жим гантелей сидя','Плечи'],['Махи гантелями в стороны','Плечи'],['Подтягивания','Спина'],['Тяга верхнего блока','Спина'],['Тяга штанги в наклоне','Спина'],['Тяга гантели в наклоне','Спина'],['Становая тяга','Спина'],['Сгибания на бицепс','Руки'],['Французский жим','Руки'],['Планка, сек','Кор'],['Подъём ног в висе','Кор'],['Скручивания','Кор']];
function openBuilder(k){if(isCoach())return toast('План ведёт тренер · попроси его изменить');k=k??focusKey();const s=SL()[k];S.custom={key:k,n:s?.ex?s.t.split(' · ').pop():'Моя тренировка',ex:s?.ex?clone(s.ex):[]};U.sheet=null;U.mg='Все';go('c-builder')}
function cbAddEx(n){S.custom.ex.push(E(n,3,10,90));U.sheet=null;toast(n+' добавлено')}
function cbDelEx(k){S.custom.ex.splice(k,1);commit()}
function cbMove(k,d){const a=S.custom.ex,j=k+d;if(j<0||j>=a.length)return;[a[k],a[j]]=[a[j],a[k]];commit()}
function cbAdj(k,f,d){const e=S.custom.ex[k];e[f]=Math.max(f=='w'?0:1,Math.round((e[f]+d)*10)/10);commit()}
function saveCustom(all){const c=S.custom;if(!c.ex.length)return toast('Добавь хотя бы одно упражнение');if(c.n.trim().length<2)return toast('Дай тренировке название');
 const keys=all?S.days.filter(d=>!SL()[d]?.done):[c.key];keys.forEach(k=>SL()[k]={t:c.n.trim(),ex:clone(c.ex),tpl:'own',done:false});if(!S.days.includes(c.key)){S.days.push(c.key);S.days.sort()}
 U.focus=c.key;S.custom=null;toast(all?`«${c.n.trim()}» на все ${keys.length} дн.`:`${DFULL[c.key]}: «${c.n.trim()}»`);tab('c-today')}
/* ---- sheets ---- */
const tplCard=(t,key)=>`<button class="li tap" onclick="U.tday=0;openSheet('tplv',{id:'${t.id}',key:${key??'null'}})"><div style="flex:1;min-width:0"><b>${t.n}</b><div class="xs mut">${t.per} дн/нед · ~${tplMins(t)} мин · ${t.lvl}</div>${t.per==S.days.length?'<span class="fit">Под твои '+S.days.length+' дн.</span>':''}</div>${I.chev}</button>`;
SHEETS.pick=({key})=>{const m=U.pmode||'tpl',f=U.pf||'all';return `<div class="h2">Что качаем в ${DACC[key]}?</div>
 <div class="seg"><button class="${m=='tpl'?'on':''}" onclick="U.pmode='tpl';render()">Шаблон</button><button class="${m=='own'?'on':''}" onclick="U.pmode='own';render()">С нуля</button></div>
 ${m=='tpl'?`<div class="chips">${Object.entries(KIND).map(([k,l])=>`<button class="chip ${f==k?'on':''}" onclick="U.pf='${k}';render()">${l}</button>`).join('')}</div>
 <div class="col" style="max-height:330px;overflow:auto">${TEMPLATES.filter(t=>f=='all'||t.kind==f).map(t=>tplCard(t,key)).join('')}</div>`
 :`<div class="sm mut">Сам выбираешь упражнения, подходы, повторы, вес и отдых.</div><button class="btn p" onclick="openBuilder(${key})">${I.plus}Открыть конструктор</button>`}`};
SHEETS.tplv=({id,key})=>{const t=TEMPLATES.find(x=>x.id==id),ti=U.tday||0,filled=S.days.filter(d=>SL()[d]?.ex&&!SL()[d].done).length;
 return `<div class="row sb"><div class="h2" style="margin:0">${t.n}</div><button class="ic-btn" aria-label="Назад к шаблонам" onclick="${key!=null?`openSheet('pick',{key:${key}})`:'closeSheet()'}">${I.close}</button></div>
 <div class="xs mut">${t.lvl} · ${t.per} дн/нед · ~${tplMins(t)} мин · источник ${t.src}</div><div class="sm">${t.why}</div>
 <div class="col gap8" style="max-height:220px;overflow:auto">${t.days.map((d,i)=>`<div class="card tpl-day ${key!=null&&i==ti&&t.days.length>1?'sel':''}" ${key!=null&&t.days.length>1?`role="button" onclick="U.tday=${i};render()"`:''}><b class="sm">${d.t}</b><div class="xs mut">${d.ex.map(e=>`${e.n} ${e.s}×${e.r}`).join(' · ')}</div></div>`).join('')}</div>
 <div class="card col gap4"><b class="sm">Раскладка по неделе</b><div class="xs">${S.days.map((d,i)=>`${DN[d]} — ${t.days[i%t.days.length].t}`).join(' · ')||'Дни не выбраны'}</div>${filled?`<div class="xs mut">Заменит ${filled} заполненн${filled==1?'ый день':'ых дня'}. Выполненные не тронем.</div>`:''}</div>
 <button class="btn p" ${S.days.length?'':'disabled'} onclick="applyWeek('${t.id}')">Разложить по неделе</button>
 ${key!=null?`<button class="btn s" onclick="applyDay('${t.id}',${key},${ti})">Только ${DACC[key]}${t.days.length>1?` · ${t.days[ti].t}`:''}</button>`:''}`};
SHEETS.menu=({key})=>{const s=SL()[key];return `<div class="h2">${DFULL[key]}</div><div class="sm mut">${esc(s?.t||'')}</div>
 ${s?.done?`<button class="opt" onclick="undoDone(${key})">Отменить отметку</button>`:`<button class="opt" onclick="U.pmode='tpl';openSheet('pick',{key:${key}})">Поменять шаблон</button><button class="opt" onclick="openBuilder(${key})">Редактировать упражнения</button><button class="opt" style="color:var(--signal)" onclick="openSheet('clear',{key:${key}})">Убрать с этого дня</button>`}`};
SHEETS.clear=({key})=>`<div class="h2">Убрать тренировку с этого дня?</div><div class="sm mut">${DFULL[key]} станет пустым. История выполненных подходов сохранится.</div><button class="btn p" style="background:var(--signal)!important" onclick="clearSlot(${key})">Убрать</button><button class="btn t" onclick="closeSheet()">Отмена</button>`;
SHEETS.cbAddEx=()=>{const groups=['Все',...new Set(EXLIB.map(x=>x[1]))];const g=U.mg||'Все';const L=EXLIB.filter(x=>g=='Все'||x[1]==g);
 return `<div class="h2">Добавить упражнение</div><div class="chips" style="flex-wrap:nowrap;overflow:auto">${groups.map(x=>`<button class="chip ${x==g?'on':''}" style="white-space:nowrap" onclick="U.mg='${x}';render()">${x}</button>`).join('')}</div>
 <div class="col" style="max-height:300px;overflow:auto">${L.map(([n,m])=>`<button class="li tap" onclick="cbAddEx('${n}')"><div style="flex:1"><span>${n}</span><div class="xs mut">${m}</div></div>${S.custom.ex.some(e=>e.n==n)?'<span class="xs mut">уже есть</span>':I.plus}</button>`).join('')}</div>`};
SHEETS.cbLeave=()=>`<div class="h2">Выйти без сохранения?</div><div class="sm mut">Изменения пропадут.</div><button class="btn p" onclick="S.custom=null;U.sheet=null;back('c-today')">Выйти</button><button class="btn t" onclick="closeSheet()">Остаться</button>`;
/* ---- screens ---- */
const scr=id=>SCREENS.find(s=>s.id==id);
SCREENS.splice(SCREENS.findIndex(s=>s.id=='c-plan-lib'),1); // консилиум: бесполезный слайд — удалён
{const st=scr('c-build');const r0=st.r;st.r=()=>r0().replace('Программа подобрана','Неделя готова');st.notes=['Заголовок и иллюстрация из ТЗ. Шаги идут сами, через ~3 с — подписка.','Тренировки выбираются уже на «Сегодня»: шаблон или своя.'];}
const todayCoach=scr('c-today').r,programCoach=scr('c-program').r;
const slotCard=k=>{const s=SL()[k],st=slotState(k),isT=k==TODAY,lbl=`${isT?'Сегодня · ':''}${DFULL[k]}, ${DATES[k]} ноября`;
 if(st=='empty')return `<div class="card slot slot-empty ${isT?'today':''}" aria-label="${lbl}, тренировка не назначена"><div class="xs mut">${lbl}</div><div class="row gap12" style="align-items:center"><span class="slot-ic">${I.plus}</span><div style="flex:1"><b>Ещё нет тренировки</b><div class="sm mut">Возьми шаблон или собери свою</div></div></div><button class="btn s" onclick="U.pmode='tpl';openSheet('pick',{key:${k}})">Выбрать тренировку</button></div>`;
 if(st=='past')return `<div class="card slot past"><div class="xs mut">${lbl}</div><b class="mut">Прошёл без тренировки</b><div class="sm mut">Ничего страшного. Следующий день — по плану.</div></div>`;
 if(st=='moved')return `<div class="card slot past"><div class="xs mut">${lbl}</div><b class="mut">Перенесено на сегодня</b></div>`;
 const ex=s.ex,head=`<div class="row sb"><span class="xs ${isT?'':'mut'}">${isT?'<span class="today-chip">Сегодня</span> ':''}${DFULL[k]}, ${DATES[k]} ноября</span><button class="ic-btn" aria-label="Действия с тренировкой" onclick="openSheet('menu',{key:${k}})">${I.more}</button></div><div class="h2" style="margin:2px 0 0">${esc(s.t.split(' · ').pop())}</div><div class="xs mut">${esc(s.t.includes(' · ')?s.t.split(' · ')[0]+' · ':'')}${ex.length} упр · ~${mins(ex)} мин</div>`;
 if(st=='done')return `<div class="card slot done ${isT?'today':''}">${head}<div class="row gap8 sm" style="color:var(--A)">${I.check}<b>Готово${s.res?' · '+s.res:''}</b></div></div>`;
 if(st=='missed')return `<div class="card slot past">${head}<div class="sm mut">${DN[k]} прошёл без тренировки. Перенести на сегодня?</div><button class="btn s" onclick="moveToToday(${k})">Перенести на сегодня</button></div>`;
 return `<div class="card slot ${isT?'today':''}">${head}<div class="sm" style="margin:6px 0">${ex.slice(0,3).map(e=>`${esc(e.n)} · ${e.s}×${e.r}`).join('<br>')}${ex.length>3?`<br><span class="mut">+ ещё ${ex.length-3}</span>`:''}</div><button class="btn p" onclick="startSlot(${k})">${k>TODAY?'Начать досрочно':'Начать'}</button></div>`};
scr('c-today').r=()=>{if(S.mode=='coach')return todayCoach();const m=macros(ME()),e=eatenK(),ks=weekKeys(),fk=focusKey(),filled=ks.filter(k=>SL()[k]?.ex).length,done=ks.filter(k=>SL()[k]?.done).length,sg=suggest();
 return `<div class="body col gap12" style="padding-top:12px"><div class="row sb"><div><div class="xs mut">Вторник, 24 ноября</div><div class="h1">${S.name?`${esc(S.name)}, привет`:'Сегодня'}</div><div class="sm mut">${ks.length?`${done} из ${ks.length} на этой неделе`:'Дни не выбраны'}${S.streakOn&&S.streak?` · <span style="color:var(--A)">${S.streak} подряд</span>`:''}</div></div>${av(S.name||'Я')}</div>
 ${S.free?`<button class="banner" onclick="go('c-paywall')"><span style="flex:1;text-align:left">Бесплатный режим. История и рекорды — 7 дней бесплатно</span>${I.chev}</button>`:''}
 <div class="wk-strip" role="tablist" aria-label="Неделя">${DN.map((d,k)=>{const on=ks.includes(k),st=on?slotState(k):'rest';return `<button class="wday ${k==fk?'sel':''} ${k==TODAY?'now':''} st-${st}" role="tab" aria-selected="${k==fk}" aria-label="${DFULL[k]} ${DATES[k]}, ${on?{empty:'не назначено',set:'назначено',done:'выполнено',missed:'пропущено',past:'прошёл',moved:'перенесено'}[st]:'отдых'}" onclick="pickFocus(${k})"><span class="wd">${d}</span><span class="wn">${st=='done'?I.check:DATES[k]}</span><i class="wdot"></i></button>`}).join('')}</div>
 ${filled==0&&ks.length?`<div class="card col gap8 hint"><b>Неделя пустая. Заполним?</b><div class="sm mut">Под ${ks.length} дн. подойдёт «${sg.n}»: ${sg.why.toLowerCase()}.</div><button class="btn p" onclick="U.tday=0;openSheet('tplv',{id:'${sg.id}',key:null})">Заполнить неделю</button><button class="btn t" onclick="U.pmode='tpl';openSheet('pick',{key:${fk}})">Выбрать по дням</button></div>`:''}
 ${ks.includes(fk)||SL()[fk]?.ex?slotCard(fk):`<div class="card slot past"><div class="xs mut">${DFULL[fk]}, ${DATES[fk]} ноября</div><b>День отдыха</b><div class="sm mut">${(()=>{const n=ks.find(k=>k>fk);return n!=null?`Следующая: ${DFULL[n].toLowerCase()}`:'Восстановление тоже часть плана'})()}</div><button class="btn t" onclick="addRestDay(${fk})">Добавить тренировку в этот день</button></div>`}
 ${ks.filter(k=>k!=fk).length?`<div class="card">${ks.filter(k=>k!=fk).map(k=>{const s=SL()[k],st=slotState(k);return `<button class="li tap" onclick="pickFocus(${k})"><b style="width:28px">${DN[k]}</b><span style="flex:1" class="sm ${st=='empty'||st=='past'||st=='moved'?'mut':''}">${st=='empty'?'Ещё нет тренировки':st=='past'?'Прошёл без тренировки':st=='moved'?'Перенесено':esc(s.t.split(' · ').pop())}</span>${st=='done'?`<span style="color:var(--A)">${I.check}</span>`:I.chev}</button>`}).join('')}</div>`:''}
 <button class="card col gap8 tap" style="text-align:left;width:100%" onclick="tab('c-food')"><div class="row sb"><b>Питание</b><span class="sm">${fmt(e)} / ${m?fmt(m.k):'—'} ккал</span></div><div class="meter"><i style="width:${m?Math.min(100,e/m.k*100):0}%"></i></div></button></div>${tabsC('today')}`};
scr('c-program').r=()=>{if(isCoach())return programCoach();const ks=weekKeys();return `<div class="top"><div class="h1" style="margin:0">Программа</div><span></span></div><div class="body col gap12">
 <div class="card"><b>Моя неделя</b>${ks.length?ks.map(k=>{const s=SL()[k];return `<button class="li tap" onclick="U.focus=${k};tab('c-today')"><b style="width:28px">${DN[k]}</b><span style="flex:1" class="sm ${s?.ex?'':'mut'}">${s?.ex?esc(s.t):'Ещё нет тренировки'}</span>${s?.done?`<span style="color:var(--A)">${I.check}</span>`:I.chev}</button>`}).join(''):'<div class="empty">Дни не выбраны</div>'}</div>
 <button class="card row gap12 tap" style="width:100%;text-align:left" onclick="openBuilder()">${I.plus}<div style="flex:1"><b>Собрать свою тренировку</b><div class="sm mut">На ${DACC[focusKey()]}: упражнения, подходы, вес</div></div>${I.chev}</button>
 <div class="h2">Шаблоны</div><div class="chips">${Object.entries(KIND).map(([k,l])=>`<button class="chip ${(U.pf||'all')==k?'on':''}" onclick="U.pf='${k}';render()">${l}</button>`).join('')}</div>
 <div class="card">${TEMPLATES.filter(t=>(U.pf||'all')=='all'||t.kind==U.pf).map(t=>tplCard(t,null)).join('')}</div><div class="xs mut">Шаблоны по открытым программам: StrongLifts, r/Fitness, Fitness Volt, Jefit, Myprotein.</div></div>${tabsC('prog')}`};
{const w=scr('c-workout');w.r=()=>{if(!S.wk)return `${hdr('','','c-today')}<div class="body empty"><b>Тренировка не начата</b><button class="btn p" style="margin-top:12px" onclick="tab('c-today')">К неделе</button></div>${tabsC('today')}`;const all=S.wk.sets.flat(),dn=all.filter(x=>x.done).length;
 return `${hdr(`<div class="col" style="align-items:center"><b>${esc(S.wk.name)}</b><span class="xs mut">${dn} из ${all.length} подходов</span></div>`,'','c-today')}<div class="body col gap12">
 <div class="meter"><i style="width:${dn/all.length*100}%"></i></div>
 ${S.wk.rest>0?`<div class="rest"><div><div class="xs mut">Отдых</div><b id="restNum" style="font:700 26px var(--f-text)">${fmtRest()}</b></div><div class="row gap8"><button class="chip" onclick="restAdj(-15)">−15</button><button class="chip" onclick="restAdj(15)">+15</button><button class="chip on" onclick="restAdj(-999)">Пропустить</button></div></div>`:''}
 ${S.wk.exs.map((e,ei)=>`<div class="card"><div class="row sb"><b>${esc(e.n)}</b>${S.prs[e.n]?`<span class="xs mut">рекорд ${kg(S.prs[e.n])} кг</span>`:''}</div>
  <div class="setrow xs mut"><span>#</span><span style="text-align:center">кг</span><span style="text-align:center">${/сек/.test(e.n)?'сек':'повт.'}</span><span></span></div>
  ${S.wk.sets[ei].map((x,si)=>`<div class="setrow ${x.done?'done-x':''}"><span class="sm">${si+1}</span><div class="mini-stp"><button aria-label="Вес меньше" onclick="wAdj(${ei},${si},'w',-2.5)">${I.minus}</button><b>${kg(x.w)}</b><button aria-label="Вес больше" onclick="wAdj(${ei},${si},'w',2.5)">${I.plus}</button></div><div class="mini-stp"><button aria-label="Повторы меньше" onclick="wAdj(${ei},${si},'r',-1)">${I.minus}</button><b>${x.r}</b><button aria-label="Повторы больше" onclick="wAdj(${ei},${si},'r',1)">${I.plus}</button></div><button class="ck ${x.done?'on':''}" aria-label="Подход сделан" ${x.done?'disabled style="opacity:1"':''} onclick="setDone(${ei},${si})">${I.check}</button></div>`).join('')}</div>`).join('')}
 </div><div class="wk-foot"><button class="btn p" ${dn?'':'disabled'} onclick="finishWorkout()">${dn?`Завершить тренировку · ${dn}/${all.length}`:'Отметь первый подход'}</button></div>${tabsC('today')}`};}
SCREENS.splice(SCREENS.findIndex(s=>s.id=='c-program')+1,0,{id:'c-builder',g:'Приложение',t:'Своя тренировка',
 notes:['Собрать тренировку на выбранный день: упражнения по группам мышц, подходы, повторы, вес, отдых.','Сохранить на этот день или на все дни недели.','С тренером закрыто — план ведёт тренер.'],tz:'Запрос: создавать тренировку под себя',
 r:()=>{if(!S.custom)return `${hdr('','','c-today')}<div class="body empty"><b>Конструктор закрыт</b><button class="btn p" style="margin-top:12px" onclick="openBuilder()">Открыть</button></div>`+tabsC('prog');const c=S.custom;
 return `<div class="top"><button class="back" aria-label="Назад" onclick="openSheet('cbLeave')">${I.back}</button><div class="col" style="align-items:center"><b>Своя тренировка</b><span class="xs mut">${DFULL[c.key]} · ${c.ex.length} упр${c.ex.length?' · ~'+mins(c.ex)+' мин':''}</span></div><span style="width:36px"></span></div>
 <div class="body col gap12"><label class="sm mut" for="cbName">Название</label><input id="cbName" class="inp" maxlength="30" value="${esc(c.n)}" oninput="S.custom.n=this.value;save()">
 <div class="card">${c.ex.length?c.ex.map((e,k)=>`<div class="ex-row" style="flex-wrap:wrap"><div class="grow"><b>${esc(e.n)}</b></div><button class="ic-btn" aria-label="Выше" ${k?'':'disabled'} onclick="cbMove(${k},-1)">${I.up}</button><button class="ic-btn" aria-label="Ниже" ${k<c.ex.length-1?'':'disabled'} onclick="cbMove(${k},1)">${I.down}</button><button class="ic-btn" aria-label="Удалить" onclick="cbDelEx(${k})">${I.close}</button>
  <div class="ex-grid">${[['s','подходы',1],['r',/сек/.test(e.n)?'секунды':'повторы',/сек/.test(e.n)?5:1],['w','кг',2.5],['rest','отдых, с',15]].map(([f,l,st])=>`<div class="col" style="align-items:center"><div class="mini-stp"><button aria-label="${l} меньше" onclick="cbAdj(${k},'${f}',-${st})">${I.minus}</button><b>${f=='w'?kg(e.w):e[f]}</b><button aria-label="${l} больше" onclick="cbAdj(${k},'${f}',${st})">${I.plus}</button></div><span class="xs mut">${l}</span></div>`).join('')}</div></div>`).join(''):`<div class="empty"><b>Пока пусто</b>Добавь первое упражнение</div>`}
 <button class="btn s" style="margin-top:8px" onclick="U.mg='Все';openSheet('cbAddEx')">${I.plus}Упражнение</button></div></div>
 <div class="wk-foot col gap8"><button class="btn p" ${c.ex.length?'':'disabled'} onclick="saveCustom(false)">Сохранить на ${DACC[c.key]}</button>${S.days.length>1?`<button class="btn t" style="height:40px" ${c.ex.length?'':'disabled'} onclick="saveCustom(true)">На все дни недели</button>`:''}</div>${tabsC('prog')}`}});

/* solo-only client: путь «С тренером» убран из регистрации (слайды выбора, кода, ожидания и плана тренера).
   Тренера можно привязать только в профиле — шторкой с кодом. */
['c-mode','c-code','c-wait','c-plan-coach'].forEach(id=>{const i=SCREENS.findIndex(x=>x.id==id);if(i>=0)SCREENS.splice(i,1)});
function afterBody(){S.weights=[+String(S.w).replace(',','.')];go('c-goal')}
function linkCode(){if(S.codeTries>=3)return;if(S.code===COACH.code){S.coach=clone(COACH);S.mode='coach';S.codeErr='';S.msgs=[['sys',`Ты привязан к тренеру ${COACH.name}`,'сейчас'],['them','Привет! Посмотрю анкету и пришлю план сегодня.','сейчас']];U.sheet=null;toast('Связались с тренером');tab('c-today')}
 else{S.codeTries++;S.codeErr=S.codeTries>=3?'Попыток больше нет. Попроси у тренера новый код.':`Код не найден или истёк. Осталось попыток: ${3-S.codeTries}`;commit()}}
function coachSends(){S.program=clone(COACH_PLAN);S.week=S.program.days.map(()=>false);S.planReady=true;S.kcalAdj=0;applyFlags();S.msgs.push(['sys','Максим прислал план · версия 1','сейчас']);toast('План от тренера пришёл');tab('c-today')}
function unlinkCoach(){S.coach=null;S.mode='solo';S.planReady=false;S.msgs=[];S.program=null;U.sheet=null;toast('Ты отвязан. Твоя неделя снова твоя')}
SHEETS.code=()=>`<div class="h2">Код от тренера</div><div class="sm mut">Тренер найдёт его у себя в профиле. Демо-код: <b>MX7K2Q</b></div>
 <input id="codeIn" class="inp code-in" autocapitalize="characters" maxlength="6" placeholder="••••••" value="${esc(S.code)}" oninput="codeIn(this)" ${S.codeTries>=3?'disabled':''}><div class="err" id="codeErr">${esc(S.codeErr)}</div>
 <button class="btn p" id="codeGo" ${/^[A-Z0-9]{6}$/.test(S.code)&&S.codeTries<3?'':'disabled'} onclick="linkCode()">Привязать</button><button class="btn t" onclick="closeSheet()">Отмена</button>`;

/* plan screen: no loading — картинка, «Мы создадим твой персональный план», кнопка «Создать план» */
function startBuild(){go('c-build')}
function ensureBuild(){}
{const st=SCREENS.find(x=>x.id=='c-build');st.t='Мы создадим твой персональный план';st.notes=['Картинка и одна фраза. Без загрузки и шагов.','«Создать план» ведёт к подписке, тренировки выбираются на «Сегодня».'];
 st.r=()=>`<div class="body col" style="justify-content:space-between;padding-top:8px"><div class="col gap16"><div class="illo" style="flex:none;min-height:220px">${ILLO.plan||''}</div><div class="h1" style="text-align:center;margin:0">Мы создадим твой персональный план</div></div>
 <button class="btn p" onclick="S.slots=S.slots||{};go('c-paywall')">Создать план</button></div>`}

/* profile: edit name in place (sheet), no jump to onboarding */
function ndIn(el){U.nd=el.value.replace(/[<>]/g,'').slice(0,30);const ok=U.nd.trim().length>=2;document.getElementById('ndGo').disabled=!ok;document.getElementById('ndErr').textContent=U.nd&&!ok?'Минимум 2 буквы':''}
function saveName(){const v=(U.nd||'').trim();if(v.length<2)return;S.name=v;U.sheet=null;toast('Имя сохранено')}
SHEETS.name=()=>{const v=U.nd??S.name;return `<div class="h2">${S.name?'Изменить имя':'Как тебя зовут?'}</div><div class="sm mut">Так тебя увидит тренер, если ты к нему привяжешься.</div>
 <input id="ndIn" class="inp" maxlength="30" placeholder="Анна" autocomplete="given-name" value="${esc(v)}" oninput="ndIn(this)" onkeydown="if(event.key=='Enter')saveName()"><div class="err" id="ndErr"></div>
 <button class="btn p" id="ndGo" ${v.trim().length>=2?'':'disabled'} onclick="saveName()">Сохранить</button><button class="btn t" onclick="closeSheet()">Отмена</button>`};
