/* ================= GymBro · КЛИЕНТ ================= */
const APP='client',VER=3;
const clone=o=>JSON.parse(JSON.stringify(o));
const day=(t,ex)=>({t,ex:ex.map(([n,s,r,w,rest])=>({n,s,r,w,rest}))});
const COACH={name:'Максим Соколов',code:'MX7K2Q',price:4000,trial:7,spec:'Силовые · Набор массы'};
const COACH_PLAN={n:'План от Максима',by:'coach',days:[day('Пн · Верх',[['Жим штанги лёжа',4,8,60,90],['Тяга гантели в наклоне',3,10,24,75],['Жим гантелей сидя',3,10,16,60]]),day('Ср · Низ',[['Присед со штангой',4,8,70,120],['Румынская тяга',3,10,60,90]]),day('Пт · Всё тело',[['Становая тяга',3,5,90,150],['Подтягивания',3,8,0,90]])]};
const LIB=[
 {id:'p1',n:'Сильная база',for:['strength','bulk'],lvl:['mid','pro'],d:'8 недель · 3×/нед · зал',days:COACH_PLAN.days},
 {id:'p2',n:'Минус 5 кг',for:['cut','keep'],lvl:['new','mid'],d:'6 недель · 4×/нед · зал',days:[day('Пн · Ноги',[['Жим ногами',4,12,80,75],['Ягодичный мост',3,12,40,60]]),day('Вт · Верх',[['Тяга верхнего блока',4,12,35,60],['Жим гантелей сидя',3,12,10,60]]),day('Чт · Всё тело',[['Присед со штангой',3,10,40,90],['Планка',3,1,0,45]]),day('Сб · Кор',[['Планка',4,1,0,45]])]},
 {id:'p3',n:'Старт с нуля',for:['cut','keep','strength','bulk'],lvl:['new'],d:'4 недели · 2×/нед · зал или дом',days:[day('Вт · Всё тело A',[['Присед с собственным весом',3,12,0,60],['Отжимания',3,8,0,60]]),day('Пт · Всё тело B',[['Ягодичный мост',3,12,0,60],['Тяга резинки',3,12,0,60]])]}];
const FOODS=[['Овсянка на воде',88,3,2,15],['Куриная грудка',165,31,4,0],['Рис отварной',130,3,0,28],['Гречка отварная',110,4,1,21],['Яйцо куриное',157,13,11,1],['Творог 5%',121,17,5,2],['Банан',89,1,0,23],['Греческий йогурт',66,10,0,4],['Лосось',208,20,13,0],['Хлеб цельнозерновой',247,13,4,41],['Авокадо',160,2,15,9],['Протеиновый батончик',350,30,9,35]];
function seed(){return {v:VER,scr:'c-auth',email:'',
 mode:'solo',consent:[0,0,0,0],name:'',dob:{d:'',m:'',y:''},sex:'',h:'',w:'',
 code:'',codeTries:0,codeErr:'',coach:null,planReady:false,
 goal:'',level:'',days:[0,2,4],time:'18:00',
 program:null,paid:false,free:false,trialEnds:'',push:null,streakOn:true,lockPreview:false,
 week:[],wk:null,history:[],prs:{'Жим штанги лёжа':57.5},weights:[],streak:0,
 food:{b:[],l:[],s:[],d:[]},meal:'b',fq:'',kcalAdj:0,
 msgs:[],draft:'',rpe:0,feel:'',note:'',firstDone:false}}
const age=()=>{const d=+S.dob.d,m=+S.dob.m,y=+S.dob.y;if(!(d>=1&&d<=31&&m>=1&&m<=12&&S.dob.y.length==4))return null;const b=new Date(y,m-1,d);if(b.getDate()!=d)return null;const n=new Date(2026,10,24);let a=n.getFullYear()-y;if(n<new Date(n.getFullYear(),m-1,d))a--;return a};
const ageOk=()=>{const a=age();return a!=null&&a>=18&&a<=95};
const ME=()=>({w:+String(S.w).replace(',','.')||null,h:+S.h||null,age:age(),sex:S.sex,goal:S.goal||'keep',act:[1.2,1.2,1.375,1.375,1.55,1.725,1.725,1.9][S.days.length]||1.55,kcalAdj:S.kcalAdj});
const bodyOk=()=>{const h=+S.h,w=+String(S.w).replace(',','.');return h>=100&&h<=250&&w>=30&&w<=300};
const GOALS={cut:'Похудеть',bulk:'Набрать массу',strength:'Стать сильнее',keep:'Держать форму'};
const LVL={new:'Новичок',mid:'Тренируюсь до года',pro:'Больше года'};
const DN=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
const eatenK=()=>Object.values(S.food).flat().reduce((a,x)=>a+x.k,0);
const eatenP=()=>Object.values(S.food).flat().reduce((a,x)=>a+x.p,0);
const isCoach=()=>S.mode=='coach'&&S.coach;
const nextDay=()=>{const i=S.week.findIndex(x=>!x);return i<0?null:i};
const tabsC=a=>tabs([['today','Сегодня',I.today,'c-today'],['prog','Программа',I.cal,'c-program'],['food','Питание',I.food,'c-food'],['chart','Прогресс',I.chart,'c-progress'],['user','Профиль',I.user,'c-profile']],a);
function PEEK(){const m=macros(ME());return `Режим: <b>${S.mode=='coach'?'с тренером':S.mode=='solo'?'сам':'—'}</b>${S.coach?` · тренер <b>${S.coach.name}</b>`:''}<br>Возраст: <b>${age()??'—'}</b> · рост <b>${S.h||'—'}</b> · вес <b>${S.w||'—'}</b><br>Норма: <b>${m?fmt(m.k)+' ккал':'—'}</b> · съедено <b>${fmt(eatenK())}</b><br>Программа: <b>${S.program?esc(S.program.n):'—'}</b> · неделя <b>${S.week.filter(Boolean).length}/${S.week.length}</b><br>Подписка: <b>${S.paid?'активна':S.free?'бесплатный режим':'—'}</b> · серия <b>${S.streak}</b>`}

/* ---------- actions ---------- */
function toggleConsent(i){S.consent[i]=S.consent[i]?0:1;commit()}
function inp(k,el,re,max){el.value=el.value.replace(re,'').slice(0,max);S[k]=el.value;save();live()}
function dobIn(k,el,l){el.value=el.value.replace(/\D/g,'').slice(0,l);S.dob[k]=el.value;save();if(el.value.length==l){const nx={d:'m',m:'y'}[k];if(nx)document.getElementById('dob-'+nx)?.focus()}live()}
function live(){const set=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=v};const dis=(id,v)=>{const e=document.getElementById(id);if(e)e.disabled=v};
 dis('nameGo',S.name.trim().length<2);
 const a=age();set('ageOut',a==null?(S.dob.y.length==4?'Проверь дату':''):a<18?'GymBro только для 18+. Данные не сохраняем.':`Тебе ${a}`);dis('aboutGo',!(ageOk()&&S.sex));
 const m=macros(ME());set('kcalLive',bodyOk()&&m?`${fmt(m.k)} ккал в день`:'—');dis('bodyGo',!bodyOk());
 const h=+S.h,w=+String(S.w).replace(',','.');set('hErr',S.h&&(h<100||h>250)?'Рост от 100 до 250 см':'');set('wErr',S.w&&(w<30||w>300)?'Вес от 30 до 300 кг':'');
 const c=document.getElementById('codeGo');if(c)c.disabled=!/^[A-Z0-9]{6}$/.test(S.code)}
function setSex(s){S.sex=s;commit()}
function pickMode(m){S.mode=m;go('c-consent')}
function afterBody(){S.weights=[+String(S.w).replace(',','.')];go(S.mode=='coach'?'c-code':'c-goal')}
function codeIn(el){el.value=el.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);S.code=el.value;S.codeErr='';save();live();const e=document.getElementById('codeErr');if(e)e.textContent=''}
function linkCode(){if(S.codeTries>=3)return;if(S.code===COACH.code){S.coach=clone(COACH);S.mode='coach';S.codeErr='';S.msgs=[['sys',`Ты привязан к тренеру ${COACH.name}`,'сейчас'],['them','Привет! Посмотрю анкету и пришлю план сегодня.','сейчас']];toast('Связались с тренером');go('c-wait')}
 else{S.codeTries++;S.codeErr=S.codeTries>=3?'Попыток больше нет. Попроси у тренера новый код.':`Код не найден или истёк. Осталось попыток: ${3-S.codeTries}`;commit()}}
function coachSends(){S.program=clone(COACH_PLAN);S.week=S.program.days.map(()=>false);S.planReady=true;S.kcalAdj=0;applyFlags();S.msgs.push(['sys','Максим прислал план · версия 1','сейчас']);toast('План от тренера пришёл');go('c-plan-coach')}
function setGoal(g){S.goal=g;commit()}
function toggleDay(k){S.days=S.days.includes(k)?S.days.filter(x=>x!=k):[...S.days,k].sort();commit()}
function pickProgram(){const L=LIB.filter(p=>p.for.includes(S.goal)&&p.lvl.includes(S.level));return L[0]||LIB[2]}
function startBuild(){U.bs=0;U.bdone=false;go('c-build')}
function ensureBuild(){if(U.bt||U.bdone||S.scr!='c-build')return;U.bs=0;U.bt=setInterval(()=>{if(S.scr!='c-build'){clearInterval(U.bt);U.bt=null;return}U.bs++;
 if(U.bs>=4){clearInterval(U.bt);U.bt=null;U.bdone=true;const p=pickProgram();S.program={n:p.n,by:'lib',id:p.id,d:p.d,days:clone(p.days)};S.week=S.program.days.map(()=>false);save();render();
  setTimeout(()=>{if(S.scr=='c-build')go('c-plan-lib')},900);return}render()},600)}
function startTrial(){S.paid=true;S.free=false;S.trialEnds='1 декабря';toast('7 дней бесплатно · напомним за 2 дня');tab('c-today')}
function goFree(){S.paid=false;S.free=true;tab('c-today')}
/* workout */
function startWorkout(i){if(i==null)return toast('Неделя закрыта · отдыхай');const d=S.program.days[i];S.wk={day:i,ex:0,sets:d.ex.map(e=>Array.from({length:e.s},()=>({w:e.w,r:e.r,done:false}))),rest:0,t0:Date.now()};go('c-workout')}
function wAdj(e,s,f,d){const x=S.wk.sets[e][s];x[f]=Math.max(0,Math.round((x[f]+d)*10)/10);commit()}
function setDone(e,s){const x=S.wk.sets[e][s];if(x.done)return;x.done=true;const ex=S.program.days[S.wk.day].ex[e];
 if(S.wk.sets[e].some(z=>!z.done)){S.wk.rest=ex.rest;clearInterval(U.rt);U.rt=setInterval(tickRest,1000)}commit()}
function tickRest(){if(!S.wk||S.wk.rest<=0){clearInterval(U.rt);return}S.wk.rest--;const n=document.getElementById('restNum');if(n&&S.wk.rest>0)n.textContent=fmtRest();else{clearInterval(U.rt);render()}}
const fmtRest=()=>`${Math.floor(S.wk.rest/60)}:${String(S.wk.rest%60).padStart(2,'0')}`;
function restAdj(d){S.wk.rest=Math.max(0,S.wk.rest+d);if(!S.wk.rest)clearInterval(U.rt);commit()}
function finishWorkout(){const d=S.program.days[S.wk.day];let vol=0,sets=0;const prs=[];S.wk.sets.forEach((ss,e)=>ss.forEach(x=>{if(x.done){vol+=x.w*x.r;sets++;const n=d.ex[e].n;if(x.w>0&&x.w>(S.prs[n]||0)){S.prs[n]=x.w;prs.push(`${n} ${kg(x.w)} кг`)}}}));
 if(!sets)return toast('Отметь хотя бы один подход');clearInterval(U.rt);S.wk.result={vol,sets,prs,min:Math.max(1,Math.round((Date.now()-S.wk.t0)/60000))};S.rpe=0;S.feel='';S.note='';go('c-summary')}
function closeSummary(){const r=S.wk.result,d=S.program.days[S.wk.day];S.week[S.wk.day]=true;S.history.unshift({t:d.t,vol:r.vol,sets:r.sets,rpe:S.rpe,date:'сегодня'});S.streak++;
 if(isCoach())S.msgs.push(['me',`Тренировка «${d.t}» · ${r.sets} подх. · RPE ${S.rpe||'—'}${S.feel?` · ${S.feel}`:''}${S.note?` · ${S.note}`:''}`,'сейчас']);
 S.wk=null;const first=!S.firstDone;S.firstDone=true;tab('c-today');if(first&&S.push==null)openSheet('push');else toast(isCoach()?'Отчёт ушёл тренеру':'Записано')}
/* food */
function openAdd(m){S.meal=m;S.fq='';go('c-food-add')}
function addFood(i,g){const f=FOODS[i],k=g/100;S.food[S.meal].push({n:f[0],g,k:Math.round(f[1]*k),p:Math.round(f[2]*k)});U.sheet=null;toast(`${f[0]} · ${Math.round(f[1]*k)} ккал`);back('c-food')}
function delFood(m,i){const x=S.food[m].splice(i,1)[0];toast(`Убрано: ${x.n}`)}
/* weight */
function logWeight(v){S.weights.push(v);S.w=String(v).replace('.',',');U.sheet=null;toast(`Вес ${kg(v)} кг записан · норма пересчитана`)}
/* program */
function replaceProgram(id){const p=LIB.find(x=>x.id==id);S.program={n:p.n,by:'lib',id:p.id,d:p.d,days:clone(p.days)};S.week=S.program.days.map(()=>false);U.sheet=null;toast(`Программа «${p.n}» · неделя с начала`)}
function moveDay(i){const d=S.program.days.splice(i,1)[0];const w=S.week.splice(i,1)[0];S.program.days.push(d);S.week.push(w);U.sheet=null;if(isCoach())S.msgs.push(['sys',`Перенесено: ${d.t} → в конец недели`,'сейчас']);toast(isCoach()?'Перенесено · тренер увидит':'Перенесено в конец недели')}
/* chat */
const TAGS=['Колено болит','Болит поясница','Нет времени','Нет инвентаря'];
function send(t){const txt=(t??S.draft).trim();if(!txt)return;S.msgs.push(['me',txt,'сейчас']);S.draft='';commit();clearTimeout(U.ct);U.ct=setTimeout(()=>{S.msgs.push(['them',TAGS.includes(txt)?'Понял. Заменю упражнения на этой неделе, не терпи боль.':'Принял, спасибо!','сейчас']);applyFlags();commit()},1400)}
function applyFlags(){if(!S.program||!S.msgs.some(m=>m[0]=='me'&&m[1]=='Колено болит'))return;S.program.days.forEach(d=>d.ex.forEach(e=>{if(e.n=='Присед со штангой'){e.n='Ягодичный мост';e.w=40}}))}
function unlinkCoach(){S.coach=null;S.mode='solo';S.planReady=false;S.msgs=[];if(S.program)S.program.by='lib';U.sheet=null;toast('Ты отвязан. План остаётся до конца недели')}
function cancelSub(){S.paid=false;S.free=true;U.sheet=null;toast('Подписка отменена · доступ до 1 декабря')}

/* ---------- sheets ---------- */
const SHEETS={
 email:()=>`<div class="h2">Вход по почте</div><input id="emIn" class="inp" type="email" inputmode="email" placeholder="you@mail.ru" value="${esc(S.email)}" oninput="S.email=this.value;save();document.getElementById('emGo').disabled=!/^\\S+@\\S+\\.\\S+$/.test(this.value)"><button class="btn p" id="emGo" ${/^\S+@\S+\.\S+$/.test(S.email)?'':'disabled'} onclick="U.sheet=null;go('c-consent')">Получить ссылку для входа</button>`,
 grams:({i})=>{const f=FOODS[i],g=U.g||100,k=g/100;return `<div class="h2">${f[0]}</div>${stepper(g,'U.g=Math.max(10,(U.g||100)-10);render()','U.g=(U.g||100)+10;render()','г')}<div class="sm mut">${Math.round(f[1]*k)} ккал · Б ${Math.round(f[2]*k)} · Ж ${Math.round(f[3]*k)} · У ${Math.round(f[4]*k)}</div><button class="btn p" onclick="addFood(${i},${g});U.g=100">Добавить в «${{b:'Завтрак',l:'Обед',s:'Перекус',d:'Ужин'}[S.meal]}»</button>`},
 weight:()=>{const v=U.wv??(S.weights.at(-1)||70);return `<div class="h2">Записать вес</div>${stepper(kg(v),'U.wv=Math.round(((U.wv??'+(S.weights.at(-1)||70)+')-.1)*10)/10;render()','U.wv=Math.round(((U.wv??'+(S.weights.at(-1)||70)+')+.1)*10)/10;render()','кг')}<div class="sm mut">Лучше утром, до завтрака. Тренд важнее одного числа.</div><button class="btn p" onclick="logWeight(${v});U.wv=null">Сохранить</button>`},
 move:()=>{const i=nextDay();return `<div class="h2">Перенести тренировку</div><div class="sm mut">Один перенос — нормально. ${isCoach()?'Тренер увидит перенос.':''}</div><button class="opt" onclick="moveDay(${i})">В конец недели</button><button class="opt" onclick="closeSheet();toast('Напомним в 20:00')">Сегодня позже, 20:00</button>`},
 replace:({id})=>{const p=LIB.find(x=>x.id==id);return `<div class="h2">Заменить на «${p.n}»?</div><div class="sm mut">Текущая неделя начнётся заново. История тренировок сохранится.</div><button class="btn p" onclick="replaceProgram('${id}')">Заменить</button><button class="btn t" onclick="closeSheet()">Отмена</button>`},
 push:()=>`<div class="h2">Первая тренировка закрыта</div><div class="sm mut">Напомнить о следующей? ${isCoach()?'И сообщить, когда тренер ответит.':''} Без цифр веса на экране блокировки.</div><button class="btn p" onclick="S.push=true;closeSheet();toast('Напоминания включены')">Включить напоминания</button><button class="btn t" onclick="S.push=false;closeSheet()">Не сейчас</button>`,
 unlink:()=>`<div class="h2">Отвязаться от тренера?</div><div class="sm mut">${S.coach?.name} сразу потеряет доступ к твоим данным. План останется до конца недели.</div><button class="btn p" style="background:var(--signal)!important" onclick="unlinkCoach()">Отвязаться</button><button class="btn t" onclick="closeSheet()">Отмена</button>`,
 cancel:()=>`<div class="h2">Отменить подписку?</div><div class="sm mut">Доступ сохранится до 1 декабря. Потом — бесплатный режим, история не пропадёт.</div><button class="btn p" onclick="cancelSub()">Отменить подписку</button><button class="btn t" onclick="closeSheet()">Оставить</button>`,
 del:()=>`<div class="h2">Удалить аккаунт?</div><div class="sm mut">Удалим тренировки, питание и вес. Тренер потеряет доступ. Отменить нельзя.</div><button class="btn p" style="background:var(--signal)!important" onclick="resetDemo()">Удалить</button><button class="btn t" onclick="closeSheet()">Отмена</button>`,
};

/* ---------- screens ---------- */
const mealsN={b:'Завтрак',l:'Обед',s:'Перекус',d:'Ужин'};
const SCREENS=[
{id:'c-auth',g:'Вход для всех',t:'Вход',notes:['Аккаунт за 10 секунд.','Почта открывает шторку с проверкой адреса.'],tz:'Общий старт',
 r:()=>`<div class="body col" style="justify-content:space-between;padding-top:48px">${MASCOT('Привет! Я Бро.<br>Пошли в зал?')}
 <div class="col gap8"><button class="btn dark" onclick="toast('Вход через Apple');go('c-consent')">${I.apple}Продолжить с Apple</button><button class="btn s" onclick="toast('Вход через Google');go('c-consent')">${I.google}Продолжить с Google</button><button class="btn s" onclick="openSheet('email')">${I.mail}Через почту</button></div></div>`},
{id:'c-mode',g:'Вход для всех',t:'Сам или с тренером',notes:['Вилка путей — сразу после входа.','С тренером: код → план от тренера. Сам: анкета → подбор программы.'],tz:'Два пути, общий конец',
 r:()=>`${hdr(progBar(1,6))}<div class="body col gap12"><div class="h1">Как будешь тренироваться?</div>
 <button class="opt ${S.mode=='coach'?'on':''}" onclick="pickMode('coach')">${I.users}<div style="flex:1"><b>С тренером</b><div class="sm mut">У меня есть код от тренера</div></div>${I.chev}</button>
 <button class="opt ${S.mode=='solo'?'on':''}" onclick="pickMode('solo')">${I.dumbbell}<div style="flex:1"><b>Сам</b><div class="sm mut">Подберём программу под цель</div></div>${I.chev}</button>
 <div class="xs mut">Тренер? Его путь — в файле gymbro-trainer.html</div></div>`},
{id:'c-consent',g:'Вход для всех',t:'Согласия 18+ и данные здоровья',notes:['До любых личных данных.','Отдельное согласие на данные здоровья. Для пути с тренером — явно, что увидит тренер.','Маркетинг выключен по умолчанию.'],tz:'GDPR / 152-ФЗ',
 r:()=>{const c=S.consent,ok=c[0]&&c[1]&&c[2];const it=(i,t,s,req)=>`<button class="chk ${c[i]?'on':''}" role="checkbox" aria-checked="${!!c[i]}" onclick="toggleConsent(${i})"><span class="box">${c[i]?I.check:''}</span><span><b>${t}</b>${req?'':' <span class="xs mut">по желанию</span>'}<div class="sm mut">${s}</div></span></button>`;
 return `${hdr(progBar(1,7))}<div class="body col" style="justify-content:space-between"><div class="col gap8"><div class="h1">Пара важных галочек</div>
 ${it(0,'Мне есть 18 лет','Сервис только для взрослых',1)}${it(1,'Условия и политика конфиденциальности','Как храним и защищаем данные',1)}${it(2,'Данные о здоровье',S.mode=='coach'?'Тренер увидит вес, травмы и питание. Отключить можно в профиле.':'Вес и питание нужны для расчёта нормы',1)}${it(3,'Новости и советы','Раз в месяц',0)}</div>
 <button class="btn p" ${ok?'':'disabled'} onclick="go('c-name')">Дальше</button></div>`}},
{id:'c-name',g:'Вход для всех',t:'Имя',notes:['2–30 символов. Тренер увидит это имя.'],tz:'Валидация на лету',
 r:()=>`${hdr(progBar(2,7))}<div class="body col" style="justify-content:space-between"><div class="col gap12"><div class="h1">Как тебя зовут?</div><input id="nameIn" class="inp" maxlength="30" placeholder="Анна" value="${esc(S.name)}" oninput="inp('name',this,/[<>]/g,30)"></div>
 <button class="btn p" id="nameGo" ${S.name.trim().length>=2?'':'disabled'} onclick="go('c-about')">Дальше</button></div>`},
{id:'c-about',g:'Вход для всех',t:'Дата рождения и пол',notes:['Нужно для нормы калорий (Миффлин–Сан Жеор).','Младше 18 — стоп, данные не сохраняются.'],tz:'Возрастной гейт',
 r:()=>`${hdr(progBar(3,7))}<div class="body col" style="justify-content:space-between"><div class="col gap12"><div class="h1">Немного о тебе</div><div class="sm mut">Дата рождения</div>
 <div class="row gap8">${[['d','ДД',2],['m','ММ',2],['y','ГГГГ',4]].map(([k,p,l])=>`<input id="dob-${k}" class="inp" style="text-align:center;${k=='y'?'flex:1.6':'flex:1'}" inputmode="numeric" placeholder="${p}" value="${S.dob[k]}" oninput="dobIn('${k}',this,${l})">`).join('')}</div><div class="sm" id="ageOut" style="min-height:18px;color:var(--A)"></div>
 <div class="sm mut">Пол для расчёта нормы</div><div class="row gap8">${[['f','Женский',I.female],['m','Мужской',I.male]].map(([k,l,ic])=>`<button class="opt ${S.sex==k?'on':''}" style="flex:1;margin:0;justify-content:center" aria-pressed="${S.sex==k}" onclick="setSex('${k}')">${ic||''}${l}</button>`).join('')}</div></div>
 <button class="btn p" id="aboutGo" ${ageOk()&&S.sex?'':'disabled'} onclick="go('c-body')">Дальше</button></div>`},
{id:'c-body',g:'Вход для всех',t:'Рост и вес',notes:['Норма калорий пересчитывается на лету.','Диапазоны: рост 100–250, вес 30–300.'],tz:'Живой расчёт',
 r:()=>`${hdr(progBar(4,7))}<div class="body col" style="justify-content:space-between"><div class="col gap12"><div class="h1">Рост и вес</div>
 ${[['h','Рост','см',3,'hErr'],['w','Вес','кг',5,'wErr']].map(([k,l,u,ml,er])=>`<div class="field unit-f"><label class="unit-l" for="b-${k}"><span>${l}</span><span class="unit">${u}</span></label><input id="b-${k}" inputmode="decimal" maxlength="${ml}" value="${esc(S[k])}" oninput="inp('${k}',this,/[^0-9.,]/g,${ml})"></div><div class="err" id="${er}"></div>`).join('')}</div>
 <button class="btn p" id="bodyGo" ${bodyOk()?'':'disabled'} onclick="afterBody()">Дальше</button></div>`},
/* path A */
{id:'c-code',g:'Путь А · с тренером',t:'Код тренера',notes:['6 символов, буквы и цифры. Демо-код: MX7K2Q.','3 неверные попытки — просим новый код у тренера.','«Нет кода» — переход на самостоятельный путь.'],tz:'Ошибки без технических кодов',
 r:()=>`${hdr(progBar(6,6))}<div class="body col" style="justify-content:space-between"><div class="col gap12"><div class="h1">Код от тренера</div><div class="mut">Тренер найдёт его у себя в профиле.</div>
 <input id="codeIn" class="inp code-in" autocapitalize="characters" maxlength="6" placeholder="••••••" value="${esc(S.code)}" oninput="codeIn(this)" ${S.codeTries>=3?'disabled':''}><div class="err" id="codeErr">${esc(S.codeErr)}</div>
 <div class="xs mut">Демо: правильный код <b>MX7K2Q</b></div></div>
 <div class="col gap8"><button class="btn p" id="codeGo" ${/^[A-Z0-9]{6}$/.test(S.code)&&S.codeTries<3?'':'disabled'} onclick="linkCode()">Привязать</button><button class="btn t" onclick="S.mode='solo';go('c-goal')">Нет кода — начну сам</button></div></div>`},
{id:'c-wait',g:'Путь А · с тренером',t:'Тренер готовит план',notes:['Не блокируем: можно зайти в приложение и писать тренеру.','Демо-кнопка имитирует, что тренер опубликовал план.'],tz:'Пустое состояние «план ещё не пришёл»',
 r:()=>`<div class="body col" style="justify-content:space-between;padding-top:24px"><div class="illo">${ILLO.plan||''}</div><div class="col gap8" style="text-align:center"><div class="h1">${esc(S.coach?.name.split(' ')[0]||'Тренер')} готовит твой план</div><div class="mut">Обычно до 24 часов. Пришлём уведомление.</div></div>
 <div class="col gap8"><button class="btn p" onclick="coachSends()">Демо: тренер прислал план</button><button class="btn s" onclick="go('c-chat')">Написать тренеру</button><button class="btn t" onclick="tab('c-today')">Пока осмотрюсь</button></div></div>`},
{id:'c-plan-coach',g:'Путь А · с тренером',t:'План от тренера',notes:['Платишь тренеру, а не приложению. Пробный период задаёт тренер.','Цена и дата списания видны до кнопки.'],tz:'Кто платит — понятно',
 r:()=>{const m=macros(ME());return `<div class="body col" style="justify-content:space-between;padding-top:20px"><div class="col gap12"><div class="lbl warm">План · готов</div><div class="h1">${esc(COACH.name.split(' ')[0])} подготовил план</div>
 <div class="card">${(S.program?.days||[]).map(d=>`<div class="li"><b style="flex:1">${esc(d.t)}</b><span class="sm mut">${d.ex.length} упр.</span></div>`).join('')}</div>
 <div class="card row sb"><span class="row gap8">${I.food}Питание в день</span><b>${m?fmt(m.k)+' ккал':'—'}</b></div>
 <div class="card sm">${COACH.trial} дней бесплатно, потом <b>${fmt(COACH.price)} ₽/мес</b> тренеру. Отмена в профиле в 2 нажатия.</div></div>
 <button class="btn p" onclick="startTrial()">Начать с ${esc(COACH.name.split(' ')[0])}</button></div>`}},
/* path B */
{id:'c-goal',g:'Путь Б · сам',t:'Цель',notes:['Цель меняет калории: −18% похудение, +10% масса.'],tz:'Одна мысль на экран',
 r:()=>`${hdr(progBar(5,7))}<div class="body col" style="justify-content:space-between"><div class="col gap8"><div class="h1">Какая цель?</div><div class="opt-gap"></div>${Object.entries(GOALS).map(([k,l])=>`<button class="opt ${S.goal==k?'on':''}" aria-pressed="${S.goal==k}" onclick="setGoal('${k}')"><b style="flex:1">${l}</b>${S.goal==k?I.check:''}</button>`).join('')}</div>
 <button class="btn p" ${S.goal?'':'disabled'} onclick="go('c-level')">Дальше</button></div>`},
{id:'c-level',g:'Путь Б · сам',t:'Уровень',notes:['Фильтрует программы библиотеки.'],tz:'',
 r:()=>`${hdr(progBar(6,7))}<div class="body col" style="justify-content:space-between"><div class="col gap8"><div class="h1">Как давно тренируешься?</div><div class="opt-gap"></div>${Object.entries(LVL).map(([k,l])=>`<button class="opt ${S.level==k?'on':''}" onclick="S.level='${k}';commit()"><b style="flex:1">${l}</b>${S.level==k?I.check:''}</button>`).join('')}</div>
 <button class="btn p" ${S.level?'':'disabled'} onclick="go('c-schedule')">Дальше</button></div>`},
{id:'c-schedule',g:'Путь Б · сам',t:'Расписание',notes:['Число дней меняет коэффициент активности и норму калорий.'],tz:'',
 r:()=>{const m=macros(ME());return `${hdr(progBar(7,7))}<div class="body col" style="justify-content:space-between"><div class="col gap12"><div class="h1">В какие дни удобно?</div>
 <div class="row sb" style="gap:0">${DN.map((d,k)=>`<button class="dayc ${S.days.includes(k)?'on':''}" aria-pressed="${S.days.includes(k)}" onclick="toggleDay(${k})">${d}</button>`).join('')}</div>
 <div class="sm mut">${S.days.length} ${S.days.length==1?'день':S.days.length<5?'дня':'дней'} в неделю</div>
 <div class="sm mut">Время</div><div class="seg">${['07:00','12:00','18:00','20:00'].map(t=>`<button class="${S.time==t?'on':''}" onclick="S.time='${t}';commit()">${t}</button>`).join('')}</div>
 </div>
 <button class="btn p" ${S.days.length>=2?'':'disabled'} onclick="startBuild()">${S.days.length>=2?'Собрать план':'Минимум 2 дня'}</button></div>`}},
{id:'c-build',g:'Путь Б · сам',t:'Мы создаём твой персональный план',notes:['Экран из вашего ТЗ: заголовок и иллюстрация, без лишнего текста.','Шаги подбора идут по-настоящему: цель → уровень → дни → программа.'],tz:'Просьба: «Мы создаём твой персональный план»',
 r:()=>{setTimeout(ensureBuild);const st=['Цель: '+(GOALS[S.goal]||'—'),'Уровень: '+(LVL[S.level]||'—'),'Дни: '+(S.days.map(k=>DN[k]).join(', ')||'—'),'Программа подобрана'];const n=U.bdone?4:Math.min(4,U.bs||0);
 return `<div class="body col" style="justify-content:space-between;padding-top:8px"><div class="col gap16"><div class="illo" style="flex:none;min-height:200px">${ILLO.plan||''}</div><div class="h1" style="text-align:center;margin:0">Мы создаём твой персональный план</div>
 <div class="col gap8" style="align-self:center">${st.map((x,k)=>`<div class="row gap8 sm ${k<n?'':'mut'}" style="transition:color .3s">${k<n?I.check:'<span style="width:22px"></span>'}${x}</div>`).join('')}</div></div>
 <div class="col gap12"><div class="meter"><i style="width:${n*25}%"></i></div>
 ${U.bdone?`<button class="btn p" onclick="go('c-plan-lib')">Показать план</button>`:`<div class="xs mut" style="text-align:center">Подбираем программу…</div>`}</div></div>`}},
{id:'c-plan-lib',g:'Путь Б · сам',t:'Подобранная программа',notes:['Объясняем, почему эта программа.','Сменить можно во вкладке «Программа».'],tz:'',
 r:()=>{const p=S.program,m=macros(ME());return `${hdr()}<div class="body col" style="justify-content:space-between"><div class="col gap12"><div class="lbl warm">План · готов</div><div class="h1">${esc(p?.n||'—')}</div><div class="mut">${esc(p?.d||'')}. Под цель «${GOALS[S.goal]||'—'}» и уровень «${LVL[S.level]||'—'}».</div>
 <div class="card">${(p?.days||[]).map(d=>`<div class="li"><b style="flex:1">${esc(d.t)}</b><span class="sm mut">${d.ex.length} упр.</span></div>`).join('')}</div>
 <div class="card row sb"><span class="row gap8">${I.food}Питание в день</span><b>${m?fmt(m.k)+' ккал':'—'}</b></div></div>
 <div class="col gap8"><button class="btn p" onclick="go('c-paywall')">Дальше</button><button class="btn t" onclick="openBuilder()">Соберу программу сам</button></div></div>`}},
{id:'c-paywall',g:'Путь Б · сам',t:'Пробный период',notes:['Мягкий paywall: «Позже» = бесплатный режим, не тупик.','Цена и дата списания до кнопки. Без таймеров.'],tz:'App Store 3.1.2, без тёмных паттернов',
 r:()=>`<div class="body col" style="justify-content:space-between;padding-top:20px"><div class="col gap12"><div class="h1">7 дней бесплатно. Потом решай</div>
 <div class="card"><div class="tl"><div class="on"><b>Сегодня</b><div class="sm mut">Полный доступ. Списаний нет</div></div><div><b>29 ноября</b><div class="sm mut">Напомним пушем и письмом</div></div><div><b>1 декабря</b><div class="sm mut">Первое списание · 990 ₽/мес</div></div></div></div>
 <div class="card sm"><b>Бесплатно навсегда:</b> одна программа, дневник питания, вес.<br><b>В подписке:</b> все программы, история и рекорды, графики.</div></div>
 <div class="col gap8"><div class="xs mut" style="text-align:center">Отмена: Профиль → Подписка</div><button class="btn p" onclick="startTrial()">Начать 7 дней бесплатно</button><button class="btn t" onclick="goFree()">Позже, бесплатный режим</button></div></div>`},
/* main */
{id:'c-today',g:'Приложение',t:'Сегодня',notes:['Следующая тренировка недели в 1 тап.','Норма и съеденное — из дневника питания.','Серию можно выключить (риск РПП).'],tz:'Главный экран',
 r:()=>{const m=macros(ME()),i=S.program?nextDay():null,d=i!=null?S.program.days[i]:null,e=eatenK();
 return `<div class="body col gap12" style="padding-top:12px"><div class="row sb"><div><div class="xs mut">Вторник, 24 ноября</div><div class="h1">${S.name?`${esc(S.name)}, привет`:'Сегодня'}</div>${S.streakOn&&S.streak?`<div class="sm" style="color:var(--A)">${I.flame} ${S.streak} трен. подряд</div>`:''}</div>${av(S.name||'Я')}</div>
 ${S.free?`<button class="banner" onclick="go('c-paywall')"><span style="flex:1;text-align:left">Бесплатный режим. Все программы и история — 7 дней бесплатно</span>${I.chev}</button>`:''}
 ${S.mode=='coach'&&!S.planReady?`<div class="card empty"><b>${esc(S.coach?.name.split(' ')[0]||'Тренер')} готовит план</b>Обычно до 24 часов<div class="row gap8" style="margin-top:12px"><button class="btn s" onclick="go('c-chat')">Написать</button><button class="btn p" onclick="coachSends()">Демо: план пришёл</button></div></div>`:
  !S.program?`<div class="card empty"><b>Программа не выбрана</b><button class="btn p" style="margin-top:10px" onclick="tab('c-program')">Выбрать программу</button><button class="btn s" style="margin-top:8px" onclick="openBuilder()">Собрать свою</button></div>`:
  d?`<div class="card hero col gap8"><div class="row sb"><span class="pill">${isCoach()?'От тренера':esc(S.program.n)}</span><span class="sm">${S.week.filter(Boolean).length}/${S.week.length} за неделю</span></div><div class="h2">${esc(d.t)}</div><div class="sm">${d.ex.map(x=>`${esc(x.n)} · ${x.s}×${x.r}`).join('<br>')}</div><button class="btn p" onclick="startWorkout(${i})">Начать тренировку</button><button class="btn t" onclick="openSheet('move')">Перенести</button></div>`:
  `<div class="card empty"><b>Неделя закрыта</b>Все ${S.week.length} тренировки сделаны. Отдыхай.</div>`}
 ${isCoach()?`<button class="card row gap12 li tap" onclick="go('c-chat')">${av(S.coach.name)}<div style="flex:1"><b>${esc(S.coach.name)}</b><div class="sm mut">${esc(S.msgs.filter(x=>x[0]!='sys').at(-1)?.[1]||'Напиши тренеру')}</div></div>${I.chev}</button>`:''}
 <button class="card col gap8 tap" style="text-align:left;width:100%" onclick="tab('c-food')"><div class="row sb"><b>Питание</b><span class="sm">${fmt(e)} / ${m?fmt(m.k):'—'} ккал</span></div><div class="meter"><i style="width:${m?Math.min(100,e/m.k*100):0}%"></i></div></button>
 <div class="card row sb"><div><b>Вес</b><div class="sm mut">${S.weights.length?kg(S.weights.at(-1))+' кг':'Ещё нет записей'}</div></div><button class="btn s" style="width:auto;height:44px;padding:0 16px" onclick="openSheet('weight')">${I.plus}Записать</button></div></div>${tabsC('today')}`}},
{id:'c-workout',g:'Приложение',t:'Тренировка',notes:['Значения предзаполнены — подход закрывается одним тапом.','Таймер отдыха стартует сам, ±15 с.','Отметка — только «сделано», повторный тап не отменяет (защита от двойного клика).'],tz:'Подходы, вес, повторы, отдых',
 r:()=>{if(!S.wk)return `${hdr('','','c-today')}<div class="body empty"><b>Тренировка не начата</b><button class="btn p" style="margin-top:12px" onclick="startWorkout(nextDay())">Начать</button></div>`;const d=S.program.days[S.wk.day];const all=S.wk.sets.flat(),dn=all.filter(x=>x.done).length;
 return `${hdr(`<div class="col" style="align-items:center"><b>${esc(d.t)}</b><span class="xs mut">${dn} из ${all.length} подходов</span></div>`,'','c-today')}<div class="body col gap12">
 <div class="meter"><i style="width:${dn/all.length*100}%"></i></div>
 ${S.wk.rest>0?`<div class="rest"><div><div class="xs mut">Отдых</div><b id="restNum" style="font:700 26px var(--f-text)">${fmtRest()}</b></div><div class="row gap8"><button class="chip" onclick="restAdj(-15)">−15</button><button class="chip" onclick="restAdj(15)">+15</button><button class="chip on" onclick="restAdj(-999)">Пропустить</button></div></div>`:''}
 ${d.ex.map((e,ei)=>`<div class="card"><div class="row sb"><b>${esc(e.n)}</b>${S.prs[e.n]?`<span class="xs mut">рекорд ${kg(S.prs[e.n])} кг</span>`:''}</div>
  <div class="setrow xs mut"><span>#</span><span style="text-align:center">кг</span><span style="text-align:center">повт.</span><span></span></div>
  ${S.wk.sets[ei].map((x,si)=>`<div class="setrow ${x.done?'done-x':''}"><span class="sm">${si+1}</span><div class="mini-stp"><button aria-label="Вес меньше" onclick="wAdj(${ei},${si},'w',-2.5)">${I.minus}</button><b>${kg(x.w)}</b><button aria-label="Вес больше" onclick="wAdj(${ei},${si},'w',2.5)">${I.plus}</button></div><div class="mini-stp"><button aria-label="Повторы меньше" onclick="wAdj(${ei},${si},'r',-1)">${I.minus}</button><b>${x.r}</b><button aria-label="Повторы больше" onclick="wAdj(${ei},${si},'r',1)">${I.plus}</button></div><button class="ck ${x.done?'on':''}" aria-label="Подход сделан" ${x.done?'disabled style="opacity:1"':''} onclick="setDone(${ei},${si})">${I.check}</button></div>`).join('')}</div>`).join('')}
 </div><div class="wk-foot"><button class="btn p" ${dn?'':'disabled'} onclick="finishWorkout()">${dn?`Завершить тренировку · ${dn}/${all.length}`:'Отметь первый подход'}</button></div>`}},
{id:'c-summary',g:'Приложение',t:'Итоги тренировки',notes:['Объём и рекорды считаются из отмеченных подходов.','RPE и самочувствие уходят тренеру отчётом.','Пуш просим здесь — после первой ценности.'],tz:'',
 r:()=>{const r=S.wk?.result;if(!r)return `${hdr('','','c-today')}<div class="body empty"><b>Нет итогов</b></div>`;
 return `<div class="body col gap12" style="padding-top:24px"><div class="h1">Тренировка закрыта</div><div class="row gap8"><div class="card kpi"><span class="xs mut">Подходов</span><b>${r.sets}</b></div><div class="card kpi"><span class="xs mut">Объём, кг</span><b>${fmt(r.vol)}</b></div><div class="card kpi"><span class="xs mut">Минут</span><b>${r.min}</b></div></div>
 ${r.prs.length?`<div class="card pr row gap8">${I.star}<div><b>Новый рекорд</b><div class="sm">${r.prs.map(esc).join(', ')}</div></div></div>`:''}
 <div class="sm mut">Насколько тяжело (RPE)</div><div class="row sb">${[6,7,8,9,10].map(n=>`<button class="chip ${S.rpe==n?'on':''}" style="flex:1" onclick="S.rpe=${n};commit()">${n}</button>`).join('')}</div>
 <div class="sm mut">Самочувствие</div><div class="chips">${['Отлично','Нормально','Тяжело','Что-то болит'].map(f=>`<button class="chip ${S.feel==f?'on':''}" onclick="S.feel='${f}';commit()">${f}</button>`).join('')}</div>
 ${isCoach()?`<input id="noteIn" class="inp" placeholder="Комментарий тренеру" value="${esc(S.note)}" oninput="S.note=this.value;save()">`:''}
 <button class="btn p" onclick="closeSummary()">${isCoach()?'Отправить отчёт тренеру':'Готово'}</button></div>`}},
{id:'c-program',g:'Приложение',t:'Программа',notes:['Неделя: что сделано, что впереди. Тап по дню — начать.','С тренером библиотека только для просмотра — план ведёт тренер.','Замена программы — с подтверждением.'],tz:'План + библиотека в одной вкладке',
 r:()=>`<div class="top"><div class="h1" style="margin:0">Программа</div><span></span></div><div class="body col gap12">
 ${S.program?`<div class="card"><div class="row sb"><b>${esc(S.program.n)}</b><span class="xs mut">${isCoach()?'ведёт тренер':'из библиотеки'}</span></div>${S.program.days.map((d,k)=>`<button class="li tap" onclick="${S.week[k]?`toast('Уже сделано')`:`startWorkout(${k})`}">${S.week[k]?I.check:`<span style="width:22px;text-align:center" class="sm mut">${k+1}</span>`}<span style="flex:1" class="${S.week[k]?'mut':''}">${esc(d.t)}</span><span class="xs mut">${S.week[k]?'сделано':'начать'}</span></button>`).join('')}</div>`:`<div class="card empty"><b>Программы пока нет</b>${S.mode=='coach'?'Тренер готовит план':'Выбери ниже'}</div>`}
 ${isCoach()?'':`<button class="card row gap12 tap" style="width:100%;text-align:left" onclick="openBuilder()">${I.plus}<div style="flex:1"><b>${S.program?.by=='custom'?'Изменить свою программу':'Собрать свою тренировку'}</b><div class="sm mut">Свои дни, упражнения, подходы и веса</div></div>${I.chev}</button>`}<div class="h2">Библиотека</div>${isCoach()?'<div class="sm mut">План ведёт тренер. Библиотека доступна для просмотра.</div>':''}
 ${LIB.map(p=>`<div class="card"><div class="row sb"><b>${p.n}</b>${S.program?.id==p.id?'<span class="pill">текущая</span>':''}</div><div class="sm mut">${p.d}</div>${isCoach()||S.program?.id==p.id?'':`<button class="btn s" style="height:44px;margin-top:8px" ${S.free&&S.program?'':''} onclick="${S.free&&S.program?`go('c-paywall')`:`openSheet('replace',{id:'${p.id}'})`}">${S.free&&S.program?'Доступно в подписке':'Выбрать'}</button>`}</div>`).join('')}</div>${tabsC('prog')}`},
{id:'c-food',g:'Приложение',t:'Питание',notes:['Остаток = норма − съедено. Без «красного» за +50 ккал.','Удаление записи — крестик.'],tz:'Дневник по приёмам пищи',
 r:()=>{const m=macros(ME()),e=eatenK(),p=eatenP();return `<div class="top"><div class="h1" style="margin:0">Питание</div><span></span></div><div class="body col gap12">
 <div class="card col gap8"><div class="row sb"><b>${m?(m.k-e>=0?`Осталось ${fmt(m.k-e)}`:`Сверх нормы ${fmt(e-m.k)}`):'Норма не посчитана'}</b><span class="sm mut">${fmt(e)}${m?' / '+fmt(m.k):''} ккал</span></div><div class="meter"><i style="width:${m?Math.min(100,e/m.k*100):0}%"></i></div>
 ${m?`<div class="row sb sm"><span>Белок</span><span>${p} / ${m.p} г</span></div><div class="meter blue"><i style="width:${Math.min(100,p/m.p*100)}%"></i></div>`:''}${S.kcalAdj?`<div class="xs mut">Тренер скорректировал норму на ${S.kcalAdj>0?'+':''}${S.kcalAdj} ккал</div>`:''}</div>
 ${Object.entries(mealsN).map(([k,l])=>`<div class="card"><div class="row sb"><b>${l}</b><span class="sm mut">${fmt(S.food[k].reduce((a,x)=>a+x.k,0))} ккал</span></div>${S.food[k].map((x,i)=>`<div class="ex-row"><div class="grow"><span class="sm">${esc(x.n)}</span><div class="xs mut">${x.g} г · ${x.k} ккал</div></div><button class="ic-btn" aria-label="Удалить ${esc(x.n)}" onclick="delFood('${k}',${i})">${I.close}</button></div>`).join('')}<button class="btn t" style="height:44px" onclick="openAdd('${k}')">${I.plus}Добавить</button></div>`).join('')}</div>${tabsC('food')}`}},
{id:'c-food-add',g:'Приложение',t:'Добавить продукт',notes:['Поиск фильтрует на лету без потери фокуса.','Граммы степпером — КБЖУ пересчитываются.'],tz:'',
 r:()=>{const L=FOODS.map((f,i)=>[f,i]).filter(([f])=>f[0].toLowerCase().includes(S.fq.toLowerCase()));return `${hdr(`<b>${mealsN[S.meal]}</b>`,'','c-food')}<div class="body col gap12">
 <input id="fq" class="inp" type="search" placeholder="Поиск продукта" value="${esc(S.fq)}" oninput="S.fq=this.value;commit()">
 <div class="card">${L.length?L.map(([f,i])=>`<button class="li tap" onclick="U.g=100;openSheet('grams',{i:${i}})"><div style="flex:1"><span>${f[0]}</span><div class="xs mut">${f[1]} ккал · Б ${f[2]} на 100 г</div></div>${I.plus}</button>`).join(''):'<div class="empty"><b>Не нашли</b>Попробуй другое слово</div>'}</div></div>`}},
{id:'c-progress',g:'Приложение',t:'Прогресс',notes:['Вес — тренд. Новый замер пересчитывает норму калорий.','Рекорды и история — из закрытых тренировок.','В бесплатном режиме история скрыта.'],tz:'',
 r:()=>`<div class="top"><div class="h1" style="margin:0">Прогресс</div><span></span></div><div class="body col gap12">
 <div class="card"><div class="row sb"><b>Вес, кг</b><span class="sm">${S.weights.length?kg(S.weights.at(-1)):'—'}${S.weights.length>1?` <span class="mut">(${(S.weights.at(-1)-S.weights[0]>0?'+':'')+kg(S.weights.at(-1)-S.weights[0])})</span>`:''}</span></div>${spark(S.weights)}<button class="btn s" style="height:44px" onclick="openSheet('weight')">${I.plus}Записать вес</button></div>
 <div class="card"><b>Рекорды</b>${Object.entries(S.prs).map(([n,w])=>`<div class="li"><span style="flex:1" class="sm">${esc(n)}</span><b class="sm">${kg(w)} кг</b></div>`).join('')}</div>
 <div class="card"><b>История</b>${S.free?`<div class="empty">История — в подписке<button class="btn s" style="height:44px;margin-top:8px" onclick="go('c-paywall')">Попробовать 7 дней</button></div>`:S.history.length?S.history.map(h=>`<div class="li"><div style="flex:1"><span class="sm">${esc(h.t)}</span><div class="xs mut">${h.date} · ${h.sets} подх.${h.rpe?' · RPE '+h.rpe:''}</div></div><b class="sm">${fmt(h.vol)} кг</b></div>`).join(''):'<div class="empty">Закрой первую тренировку — она появится здесь</div>'}</div></div>${tabsC('chart')}`},
{id:'c-chat',g:'Приложение',t:'Чат с тренером',notes:['Метки-кнопки: «Колено болит» и т. п. Тренер получает флаг.','«Колено болит» — тренер реально заменяет присед в плане (симуляция).'],tz:'Обратная связь от доменного эксперта',
 r:()=>!S.coach?`${hdr('','','c-today')}<div class="body empty"><b>Тренер не привязан</b>Введи код тренера в профиле<button class="btn p" style="margin-top:12px" onclick="openSheet('code')">Ввести код</button></div>`:`${hdr(`<b>${esc(S.coach.name)}</b>`,'','c-today')}
 <div class="body"><div class="msgs">${S.msgs.map(m=>`<div class="msg ${m[0]}">${esc(m[1])}${m[2]&&m[0]!='sys'?`<span class="xs">${esc(m[2])}</span>`:''}</div>`).join('')}</div></div>
 <div style="padding:0 14px"><div class="chips" style="flex-wrap:nowrap;overflow:auto">${TAGS.map(t=>`<button class="chip" style="white-space:nowrap" onclick="send('${t}')">${t}</button>`).join('')}</div></div>
 <div class="composer"><input id="draft" placeholder="Сообщение" value="${esc(S.draft)}" oninput="S.draft=this.value;save()" onkeydown="if(event.key=='Enter')send()"><button class="back" aria-label="Отправить" onclick="send()">${I.fwd}</button></div>`},
{id:'c-profile',g:'Приложение',t:'Профиль',notes:['Тренер: привязать по коду или отвязаться — доступ закрывается сразу.','Серию можно выключить. Превью на локскрине — выключено по умолчанию.','Отмена подписки без «точно бросаешь?».'],tz:'Приватность и контроль',
 r:()=>`<div class="top"><div class="h1" style="margin:0">Профиль</div><span class="role-badge">${S.mode=='coach'?'С тренером':'Сам'}</span></div><div class="body col gap12">
 <div class="card row gap12">${av(S.name||'Я')}<div style="flex:1"><b>${esc(S.name||'Без имени')}</b><div class="xs mut">${age()??'—'} · ${S.h||'—'} см · ${S.w||'—'} кг${S.goal?' · '+GOALS[S.goal]:''}</div></div><button class="chip" onclick="U.nd=S.name;openSheet('name')">Изменить</button></div>
 <div class="card">${S.coach?`<div class="li">${av(S.coach.name)}<div style="flex:1"><b>${esc(S.coach.name)}</b><div class="xs mut">${S.coach.spec} · ${fmt(S.coach.price)} ₽/мес</div></div></div><button class="li tap" style="color:var(--signal)" onclick="openSheet('unlink')"><span style="flex:1">Отвязаться от тренера</span></button>`:`<button class="li tap" onclick="S.codeTries=0;S.code='';S.codeErr='';openSheet('code')">${I.users}<span style="flex:1">Ввести код тренера</span>${I.chev}</button>`}</div>
 <div class="card"><div class="li"><span style="flex:1">Подписка</span><span class="sm mut">${S.paid?`пробная до ${S.trialEnds}`:'бесплатный режим'}</span></div>${S.paid?`<button class="li tap" onclick="openSheet('cancel')"><span style="flex:1">Отменить подписку</span>${I.chev}</button>`:`<button class="li tap" onclick="go('c-paywall')"><span style="flex:1">Оформить</span>${I.chev}</button>`}</div>
 <div class="card"><div class="li"><span style="flex:1">Напоминания</span>${toggle(S.push,'S.push=!S.push;commit()','Напоминания')}</div><div class="li"><span style="flex:1">Показывать серию дней</span>${toggle(S.streakOn,'S.streakOn=!S.streakOn;commit()','Серия')}</div><div class="li"><div style="flex:1">Вес в уведомлениях<div class="xs mut">На экране блокировки</div></div>${toggle(S.lockPreview,'S.lockPreview=!S.lockPreview;commit()','Вес в уведомлениях')}</div></div>
 <div class="card"><button class="li tap" onclick="tab('c-auth');toast('Ты вышел')"><span style="flex:1">Выйти</span></button><button class="li tap" style="color:var(--signal)" onclick="openSheet('del')"><span style="flex:1">Удалить аккаунт</span></button></div></div>${tabsC('user')}`},
];
const afterRender=live;
const TABFOR={'c-workout':'today','c-summary':'today','c-food-add':'food','c-chat':'today'};
SCREENS.forEach(s=>{if(TABFOR[s.id]){const r=s.r;s.r=()=>r()+tabsC(TABFOR[s.id])}});
