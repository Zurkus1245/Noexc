/* ================= GymBro · ТРЕНЕР ================= */
const APP='trainer',VER=3;
const EXLIB=['Жим штанги лёжа','Присед со штангой','Становая тяга','Тяга гантели в наклоне','Подтягивания','Жим гантелей сидя','Выпады с гантелями','Румынская тяга','Ягодичный мост','Жим ногами','Тяга верхнего блока','Планка'];
const day=(t,ex)=>({t,ex:ex.map(([n,s,r,w,rest])=>({n,s,r,w,rest}))});
const TPL0=[
 {id:'tp1',n:'Сильная база · 3 дня',days:[day('Пн · Верх',[['Жим штанги лёжа',4,'6–8',60,120],['Тяга гантели в наклоне',3,'8–10',24,90],['Жим гантелей сидя',3,'10',16,75]]),day('Ср · Низ',[['Присед со штангой',4,'6–8',70,150],['Румынская тяга',3,'8–10',60,120],['Выпады с гантелями',3,'10',14,75]]),day('Пт · Всё тело',[['Становая тяга',3,'5',90,180],['Подтягивания',3,'макс',0,120],['Планка',3,'45 с',0,60]])]},
 {id:'tp2',n:'Похудение · 4 дня',days:[day('Пн · Ноги',[['Жим ногами',4,'12',100,90],['Ягодичный мост',3,'12',60,75]]),day('Вт · Верх',[['Тяга верхнего блока',4,'12',45,75],['Жим гантелей сидя',3,'12',12,60]]),day('Чт · Всё тело',[['Присед со штангой',3,'10',50,90],['Подтягивания',3,'макс',0,90]]),day('Сб · Кардио + кор',[['Планка',4,'40 с',0,45]])]},
 {id:'tp3',n:'Старт · 2 дня',days:[day('Вт · Всё тело A',[['Присед со штангой',3,'10',30,90],['Тяга верхнего блока',3,'12',35,75]]),day('Пт · Всё тело B',[['Жим гантелей сидя',3,'10',10,75],['Ягодичный мост',3,'12',40,75]])]}];
const clone=o=>JSON.parse(JSON.stringify(o));
function seed(){return {v:VER,scr:'t-auth',
 me:{name:'',photo:false,spec:[],exp:3,price:4000,trial:7,code:'MX7K2Q',consent:[0,0,0,0],push:null,email:''},
 clients:[
  {id:'c1',name:'Анна Смирнова',age:29,sex:'f',h:168,w:68.4,goal:'cut',act:1.55,status:'active',done:3,planned:4,flag:'',paid:true,paidUntil:'12 дек',price:4000,weights:[69.6,69.4,69.3,69.0,68.9,68.6,68.4],kcalAdj:0,eaten:1650,protein:118,sleep:4,reminded:false,plan:clone(TPL0[1].days),ver:3,unread:0,
   msgs:[['them','Сделала все подходы, на последнем жиме ногами было тяжело',"вчера"],['me','Отлично. На следующей неделе +5 кг, техника важнее',"вчера"]]},
  {id:'c2',name:'Игорь Ковалёв',age:35,sex:'m',h:181,w:82.1,goal:'bulk',act:1.55,status:'missed',done:1,planned:3,flag:'Колено болит',paid:true,paidUntil:'3 дек',price:4000,weights:[81.2,81.5,81.6,81.9,82.1],kcalAdj:0,eaten:2300,protein:140,sleep:3,reminded:false,plan:clone(TPL0[0].days),ver:5,unread:2,
   msgs:[['them','Колено побаливает после приседа','4 дня назад'],['them','Пропущу пару тренировок, ок?','4 дня назад']]},
  {id:'c3',name:'Мария Волкова',age:41,sex:'f',h:164,w:61.0,goal:'keep',act:1.375,status:'waiting',done:0,planned:0,flag:'',paid:true,paidUntil:'20 дек',price:4000,weights:[61.2,61.0],kcalAdj:0,eaten:0,protein:0,sleep:3,reminded:false,plan:[],ver:0,unread:0,
   msgs:[['sys','Мария заполнила анкету · 22 ноября','']]},
  {id:'c4',name:'Дмитрий Орлов',age:24,sex:'m',h:null,w:null,goal:'strength',act:1.55,status:'new',done:0,planned:0,flag:'',paid:false,paidUntil:'',price:4000,weights:[],kcalAdj:0,eaten:0,protein:0,sleep:0,reminded:false,plan:[],ver:0,unread:0,
   msgs:[['sys','Дмитрий привязался по коду · вчера','']]}],
 templates:clone(TPL0),
 balance:15200,payout:'',history:[['Вывод на карту',-12000,'1 ноя'],['Анна Смирнова · подписка',3400,'12 ноя'],['Игорь Ковалёв · подписка',3400,'3 ноя']],
 sel:'c1',ctab:'plan',emode:'train',eday:0,dirty:false,filter:'all',q:'',chat:'c1',draft:'',archived:[]}}
const C=()=>S.clients.find(c=>c.id==S.sel)||S.clients[0];
const CH=()=>S.clients.find(c=>c.id==S.chat)||S.clients[0];
const STL={active:'Активен',missed:'Пропустил',waiting:'Ждёт план',new:'Новый',paused:'Пауза'};
const GOALS={cut:'Похудение',bulk:'Набор массы',keep:'Поддержание и осанка',strength:'Сила'};
const st=c=>`<span class="st ${c.status}">${STL[c.status]}</span>`;
const first=c=>c.name.split(' ')[0];
const needs=c=>c.status=='missed'||c.status=='waiting'||c.status=='new'||c.unread>0||!!c.flag;
const COMM=.15;
const tabsT=a=>tabs([['today','Сегодня',I.bell,'t-today'],['users','Клиенты',I.users,'t-clients'],['chat','Чат',I.mail,'t-chats'],['user','Профиль',I.user,'t-profile']],a);
const unreadAll=()=>S.clients.reduce((a,c)=>a+c.unread,0);
const monthGross=()=>S.clients.filter(c=>c.paid&&c.status!='paused').reduce((a,c)=>a+c.price,0);
function PEEK(){return `Тренер: <b>${esc(S.me.name||'—')}</b><br>Клиентов: <b>${S.clients.length}</b> · нужна реакция: <b>${S.clients.filter(needs).length}</b><br>Непрочитанных: <b>${unreadAll()}</b><br>Выбран: <b>${esc(C()?.name||'—')}</b> · план v${C()?.ver??0}${S.dirty?' (черновик)':''}`}

/* ---------- actions ---------- */
function setMe(k,v){S.me[k]=v;save()}
function toggleConsent(i){S.me.consent[i]=S.me.consent[i]?0:1;commit()}
function toggleSpec(s){const a=S.me.spec;if(a.includes(s))S.me.spec=a.filter(x=>x!=s);else if(a.length<3)a.push(s);else return toast('Максимум 3 направления');commit()}
function nameIn(el){S.me.name=el.value.slice(0,30);save();const ok=S.me.name.trim().length>=2;document.getElementById('nameGo').disabled=!ok;document.getElementById('nameErr').textContent=S.me.name&&!ok?'Минимум 2 буквы':''}
function newCode(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';S.me.code=Array.from({length:6},()=>A[Math.floor(Math.random()*A.length)]).join('');U.sheet=null;toast('Новый код · старый больше не работает')}
function simJoin(){const names=[['Олег Петров','m'],['Ксения Белова','f'],['Тимур Алиев','m']];const n=names[S.clients.length%3];
 S.clients.push({id:'c'+Date.now(),name:n[0],age:27,sex:n[1],h:null,w:null,goal:'cut',act:1.55,status:'new',done:0,planned:0,flag:'',paid:false,paidUntil:'',price:S.me.price,weights:[],kcalAdj:0,eaten:0,protein:0,sleep:0,reminded:false,plan:[],ver:0,unread:1,msgs:[['sys',`${n[0]} привязался по коду ${S.me.code}`,'сейчас'],['them','Привет! Хочу начать на этой неделе','сейчас']]});
 toast(`${first({name:n[0]})} ввёл код · новый клиент`)}
function openClient(id,t='plan'){S.sel=id;S.ctab=t;go('t-client')}
function openChat(id){S.chat=id;const c=CH();c.unread=0;go('t-thread')}
function remind(id,what){const c=S.clients.find(x=>x.id==id);if(c.reminded)return toast('Сегодня уже напоминали · завтра можно снова');c.reminded=true;c.msgs.push(['me',what=='pay'?'Напоминаю про оплату: ссылка в профиле.':'Как дела? Жду тебя на тренировке, напиши, если что-то мешает.','сейчас']);toast(`${first(c)} получит напоминание`)}
function markPaid(id){const c=S.clients.find(x=>x.id==id);c.paid=true;c.paidUntil='24 дек';S.balance+=Math.round(c.price*(1-COMM));S.history.unshift([`${c.name} · подписка`,Math.round(c.price*(1-COMM)),'сегодня']);U.sheet=null;toast(`Оплата отмечена · +${fmt(c.price*(1-COMM))} ₽`)}
function setStatus(id,s){const c=S.clients.find(x=>x.id==id);c.status=s;U.sheet=null;toast(s=='paused'?`${first(c)} на паузе · напоминания выключены`:`${first(c)} снова активен`)}
function unlink(id){const c=S.clients.find(x=>x.id==id);S.archived.push(c.name);S.clients=S.clients.filter(x=>x.id!=id);S.sel=S.clients[0]?.id;U.sheet=null;U.hist=[];S.scr='t-clients';toast(`${c.name} отвязан · план в архиве 30 дней`)}
function clearFlag(){const c=C();c.flag='';c.msgs.push(['sys','Тренер снял флаг «колено»','сейчас']);toast('Флаг снят')}
function setPrice(id,d){const c=S.clients.find(x=>x.id==id);c.price=Math.max(1000,Math.min(20000,c.price+d));commit()}
/* editor */
function editClient(id,mode='train'){S.sel=id;S.emode=mode;S.eday=0;go('t-editor')}
function dirty(){S.dirty=true;commit()}
function addDay(){const p=C().plan;const n=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][p.length%7];p.push({t:`${n} · Новый день`,ex:[]});S.eday=p.length-1;dirty()}
function copyDay(){const p=C().plan,d=clone(p[S.eday]);d.t=d.t.replace(/^[^·]+/,['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][p.length%7]+' ');p.push(d);S.eday=p.length-1;toast('День скопирован');S.dirty=true;save()}
function delDay(){const p=C().plan;p.splice(S.eday,1);S.eday=Math.max(0,S.eday-1);dirty()}
function addEx(n){const d=C().plan[S.eday];d.ex.push({n,s:3,r:'10',w:20,rest:90});U.sheet=null;S.dirty=true;toast(`${n} добавлено`)}
function delEx(k){C().plan[S.eday].ex.splice(k,1);dirty()}
function exAdj(k,f,dv){const e=C().plan[S.eday].ex[k];if(f=='r'){const n=parseInt(e.r)||10;e.r=String(Math.max(1,n+dv))}else e[f]=Math.max(f=='s'?1:0,Math.round((e[f]+dv)*10)/10);S.dirty=true;commit()}
function applyTpl(id,shift){const t=S.templates.find(x=>x.id==id);const d=clone(t.days);d.forEach(x=>x.ex.forEach(e=>e.w=Math.round(e.w*(1+shift)/2.5)*2.5));C().plan=d;S.eday=0;S.dirty=true;U.sheet=null;toast(`Шаблон «${t.n}» применён${shift?` · веса ${shift>0?'+':''}${shift*100}%`:''}`)}
function saveTpl(){const c=C();if(!c.plan.length)return toast('Пустой план нельзя сохранить');S.templates.push({id:'tp'+Date.now(),n:`План ${first(c)} · ${c.plan.length} дн`,days:clone(c.plan)});U.sheet=null;toast('Сохранено в шаблоны')}
function kcalAdj(d){C().kcalAdj+=d;S.dirty=true;commit()}
function publish(){const c=C();if(!c.plan.length)return toast('Добавь хотя бы один день');c.ver++;S.dirty=false;if(c.status=='waiting'||c.status=='new')c.status='active';c.planned=c.plan.length;c.msgs.push(['sys',`План обновлён · версия ${c.ver}`,'сейчас']);toast(`${first(c)} получил план v${c.ver} · push отправлен`)}
/* chat */
const QUICK=['Отлично, так держать','Пришли видео техники','Сегодня делаем легче','Замени упражнение на жим ногами','Как самочувствие?'];
function draftIn(el){S.draft=el.value;save()}
function send(t){const c=CH();const txt=(t??S.draft).trim();if(!txt)return;c.msgs.push(['me',txt,'сейчас']);S.draft='';commit();
 const R={'Как самочувствие?':'Норм, колено лучше','Пришли видео техники':'Ок, вечером запишу'};clearTimeout(U.rt);U.rt=setTimeout(()=>{c.msgs.push(['them',R[txt]||'Понял, спасибо!','сейчас']);if(S.scr!='t-thread'||S.chat!=c.id)c.unread++;commit()},1400)}
/* income */
function withdraw(){if(!S.payout)return openSheet('payout');if(S.balance<1000)return toast('Минимум для вывода 1 000 ₽');S.history.unshift(['Вывод на карту',-S.balance,'сегодня']);const b=S.balance;S.balance=0;toast(`${fmt(b)} ₽ уйдут на карту ${S.payout} за 1–2 дня`)}
function savePayout(){const v=document.getElementById('payIn').value.replace(/\D/g,'');if(v.length<4)return toast('Нужны хотя бы последние 4 цифры');S.payout='•• '+v.slice(-4);U.sheet=null;toast('Карта для выплат сохранена')}

/* ---------- sheets ---------- */
const SHEETS={
 email:()=>`<div class="h2">Вход по почте</div><input id="emIn" class="inp" type="email" inputmode="email" placeholder="you@mail.ru" value="${esc(S.me.email)}" oninput="S.me.email=this.value;save();document.getElementById('emGo').disabled=!/^\\S+@\\S+\\.\\S+$/.test(this.value)"><button class="btn p" id="emGo" ${/^\S+@\S+\.\S+$/.test(S.me.email)?'':'disabled'} onclick="U.sheet=null;go('t-role')">Получить ссылку для входа</button>`,
 addEx:()=>`<div class="h2">Добавить упражнение</div><div class="col" style="max-height:340px;overflow:auto">${EXLIB.map(n=>`<button class="li tap" onclick="addEx('${n}')">${I.dumbbell}<span style="flex:1">${n}</span>${I.plus}</button>`).join('')}</div>`,
 tpl:()=>`<div class="h2">Шаблоны</div><div class="sm mut">Применить к плану ${esc(first(C()))}. Текущий план заменится.</div>${S.templates.map(t=>`<div class="card"><b>${esc(t.n)}</b><div class="xs mut">${t.days.length} дн · ${t.days.reduce((a,d)=>a+d.ex.length,0)} упражнений</div><div class="chips" style="margin-top:8px"><button class="chip" onclick="applyTpl('${t.id}',-.05)">−5%</button><button class="chip on" onclick="applyTpl('${t.id}',0)">Как есть</button><button class="chip" onclick="applyTpl('${t.id}',.05)">+5%</button></div></div>`).join('')}<button class="btn s" onclick="saveTpl()">Сохранить текущий план как шаблон</button>`,
 price:({id})=>{const c=S.clients.find(x=>x.id==id);return `<div class="h2">Цена для ${esc(first(c))}</div>${stepper(fmt(c.price)+' ₽',`setPrice('${id}',-500)`,`setPrice('${id}',500)`)}<div class="sm mut">Новая цена начнёт действовать со следующего списания. ${esc(first(c))} увидит её заранее.</div><button class="btn p" onclick="closeSheet();toast('Цена сохранена')">Готово</button>`},
 manage:({id})=>{const c=S.clients.find(x=>x.id==id);return `<div class="h2">${esc(c.name)}</div>
  ${c.status=='paused'?`<button class="opt" onclick="setStatus('${id}','active')">Возобновить ведение</button>`:`<button class="opt" onclick="setStatus('${id}','paused')">Поставить на паузу</button>`}
  <button class="opt" style="color:var(--signal)" onclick="openSheet('unlink',{id:'${id}'})">Отвязать клиента</button>`},
 unlink:({id})=>{const c=S.clients.find(x=>x.id==id);return `<div class="h2">Отвязать ${esc(first(c))}?</div><div class="sm mut">Доступ к данным закроется сразу. План сохранится в архиве 30 дней. ${esc(first(c))} получит уведомление.</div><button class="btn p" style="background:var(--signal)!important" onclick="unlink('${id}')">Отвязать</button><button class="btn t" onclick="closeSheet()">Отмена</button>`},
 code:()=>`<div class="h2">Перевыпустить код?</div><div class="sm mut">Старый код ${S.me.code} перестанет работать. Уже привязанные клиенты останутся.</div><button class="btn p" onclick="newCode()">Перевыпустить</button><button class="btn t" onclick="closeSheet()">Отмена</button>`,
 payout:()=>`<div class="h2">Карта для выплат</div><div class="sm mut">В демо достаточно последних 4 цифр. Настоящие реквизиты вводятся у платёжного провайдера.</div><input id="payIn" class="inp" inputmode="numeric" maxlength="4" placeholder="Последние 4 цифры"><button class="btn p" onclick="savePayout()">Сохранить</button>`,
 del:()=>`<div class="h2">Удалить аккаунт?</div><div class="sm mut">Клиенты будут отвязаны, их данные останутся у них. Отменить нельзя.</div><button class="btn p" style="background:var(--signal)!important" onclick="resetDemo()">Удалить</button><button class="btn t" onclick="closeSheet()">Отмена</button>`,
};

/* ---------- screens ---------- */
const SPECS=['Силовые','Похудение','Набор массы','Реабилитация','Функционал','Питание'];
const SCREENS=[
{id:'t-auth',g:'Регистрация тренера',t:'Вход',notes:['Аккаунт за 10 секунд. Роль выбирается после входа, не до.','Почта открывает шторку с проверкой адреса.'],tz:'Консилиум: вход без ID, роль отдельно',
 r:()=>`<div class="body col" style="justify-content:space-between;padding-top:48px">${MASCOT('Привет! Я Бро.<br>Погнали вести клиентов?')}
 <div class="col gap8"><button class="btn dark" onclick="toast('Вход через Apple');go('t-role')">${I.apple}Продолжить с Apple</button><button class="btn s" onclick="toast('Вход через Google');go('t-role')">${I.google}Продолжить с Google</button><button class="btn s" onclick="openSheet('email')">${I.mail}Через почту</button></div></div>`},
{id:'t-role',g:'Регистрация тренера',t:'Роль',notes:['Роль — первое решение после входа. Её видно бейджем дальше.','Клиентский путь живёт в отдельном файле gymbro-client.html.'],tz:'Риск №1: путаница ролей',
 r:()=>`${hdr(progBar(1,6))}<div class="body col gap12"><div class="h1">Кто ты в GymBro?</div><div class="mut">Роль можно поменять позже в профиле.</div>
 <button class="opt on" onclick="go('t-consent')">${I.users}<div style="flex:1"><b>Я тренер</b><div class="sm mut">Веду клиентов: планы, питание, чат, оплата</div></div>${I.chev}</button>
 <button class="opt" onclick="toast('Путь клиента — в файле gymbro-client.html')">${I.user}<div style="flex:1"><b>Я тренируюсь</b><div class="sm mut">Сам или с тренером</div></div>${I.chev}</button></div>`},
{id:'t-consent',g:'Регистрация тренера',t:'Согласия',notes:['Согласие до любых данных. Нет предвыбранных галочек.','Тренер — обработчик данных здоровья клиентов, это отдельный пункт.','Маркетинг необязателен и выключен.'],tz:'GDPR / 152-ФЗ, App Store 5.1',
 r:()=>{const c=S.me.consent,ok=c[0]&&c[1]&&c[2];const it=(i,t,s,req)=>`<button class="chk ${c[i]?'on':''}" role="checkbox" aria-checked="${!!c[i]}" onclick="toggleConsent(${i})"><span class="box">${c[i]?I.check:''}</span><span><b>${t}</b>${req?'':' <span class="xs mut">по желанию</span>'}<div class="sm mut">${s}</div></span></button>`;
 return `${hdr(progBar(2,6))}<div class="body col" style="justify-content:space-between"><div class="col gap8"><div class="h1">Пара важных галочек</div><span class="role-badge" style="align-self:flex-start">Режим тренера</span>
 ${it(0,'Мне есть 18 лет','Сервис только для взрослых',1)}${it(1,'Условия и политика конфиденциальности','Как мы храним и защищаем данные',1)}${it(2,'Обработка данных здоровья клиентов','Вес, травмы и питание клиентов видишь только ты, пока они не отвяжутся',1)}${it(3,'Новости и советы','Раз в месяц, можно отписаться',0)}</div>
 <button class="btn p" ${ok?'':'disabled'} onclick="go('t-name')">Дальше</button></div>`}},
{id:'t-name',g:'Регистрация тренера',t:'Имя и фото',notes:['Имя видят клиенты в чате и в плане.','Фото по желанию, без него — инициалы.'],tz:'Валидация: 2–30 символов',
 r:()=>{const ok=S.me.name.trim().length>=2;return `${hdr(progBar(3,6))}<div class="body col" style="justify-content:space-between"><div class="col gap12"><div class="h1">Как тебя представить клиентам?</div>
 <div class="row gap12" style="align-items:center">${S.me.photo?`<div class="av" style="width:64px;height:64px;font-size:20px;background:linear-gradient(135deg,#FF9A4D,#2E9BFF)">${av(S.me.name||'Т').replace(/<[^>]+>/g,'')}</div>`:`<button class="av" style="width:64px;height:64px" aria-label="Добавить фото" onclick="setMe('photo',true);commit();toast('Фото добавлено')">${I.plus}</button>`}<div class="sm mut">${S.me.photo?'Фото добавлено':'Фото по желанию'}</div></div>
 <label class="sm mut" for="nameIn">Имя и фамилия</label><input id="nameIn" class="inp" maxlength="30" placeholder="Максим Соколов" value="${esc(S.me.name)}" oninput="nameIn(this)"><div class="err" id="nameErr"></div></div>
 <button class="btn p" id="nameGo" ${ok?'':'disabled'} onclick="go('t-spec')">Дальше</button></div>`}},
{id:'t-spec',g:'Регистрация тренера',t:'Специализация',notes:['1–3 направления — клиент поймёт, к кому пришёл.','Опыт степпером, без клавиатуры.'],tz:'Минимум полей, сертификаты позже',
 r:()=>`${hdr(progBar(4,6))}<div class="body col" style="justify-content:space-between"><div class="col gap12"><div class="h1">С чем работаешь?</div><div class="sm mut">До трёх направлений · выбрано ${S.me.spec.length}</div>
 <div class="chips">${SPECS.map(s=>`<button class="chip ${S.me.spec.includes(s)?'on':''}" aria-pressed="${S.me.spec.includes(s)}" onclick="toggleSpec('${s}')">${s}</button>`).join('')}</div>
 <div class="card row sb"><div><b>Опыт</b><div class="sm mut">лет тренерской практики</div></div>${stepper(S.me.exp,`S.me.exp=Math.max(0,S.me.exp-1);commit()`,`S.me.exp=Math.min(40,S.me.exp+1);commit()`)}</div></div>
 <button class="btn p" ${S.me.spec.length?'':'disabled'} onclick="go('t-invite')">Дальше</button></div>`},
{id:'t-invite',g:'Регистрация тренера',t:'Пригласить клиента',notes:['Приглашение — после профиля, не до.','Код и ссылка. Демо-кнопка имитирует, что клиент ввёл код.'],tz:'Пустое состояние 0 клиентов → этот экран',
 r:()=>`${hdr(progBar(5,6))}<div class="body col" style="justify-content:space-between"><div class="col gap12"><div class="h1">Позови первого клиента</div><div class="mut">Клиент вводит код в приложении — и вы связаны.</div>
 <div class="card col gap8"><div class="code-big">${S.me.code}</div><div class="row gap8"><button class="btn s" onclick="toast('Код скопирован')">${I.copy}Копировать</button><button class="btn s" onclick="toast('Ссылка отправлена')">Поделиться</button></div></div>
 
 <button class="btn t" onclick="simJoin()">Демо: клиент ввёл код</button><div class="xs mut" style="text-align:center">Клиентов сейчас: ${S.clients.length}</div></div>
 <div class="col gap8"><button class="btn p" onclick="go('t-push')">Готово</button></div></div>`},
{id:'t-push',g:'Регистрация тренера',t:'Уведомления',notes:['Просим с объяснением пользы.','Превью без данных здоровья на экране блокировки.'],tz:'Риск №3: здоровье на локскрине',
 r:()=>`${hdr(progBar(6,6))}<div class="body col" style="justify-content:space-between"><div class="col gap12"><div class="h1">Скажем, когда клиент ответит</div>
 <div class="card col gap8"><div class="row gap8"><b>GymBro</b><span class="xs mut">сейчас</span></div><div class="sm">Игорь написал сообщение</div><div class="xs mut">Без текста и цифр веса на экране блокировки</div></div>
 <div class="sm mut">Пропуски тренировок и сообщения. Не чаще одного раза в час.</div></div>
 <div class="col gap8"><button class="btn p" onclick="setMe('push',true);tab('t-today');toast('Уведомления включены')">Разрешить</button><button class="btn t" onclick="setMe('push',false);tab('t-today')">Не сейчас</button></div></div>`},
/* ---- main ---- */
{id:'t-today',g:'Кабинет тренера',t:'Сегодня · кому нужна реакция',notes:['Очередь строится из живых данных: пропуски, ожидающие план, неоплата, сообщения, флаги.','Каждое действие закрывает карточку или меняет её статус.','Пусто — значит всё под контролем, а не «нет данных».'],tz:'Топ-7 действий тренера: всё в 1 тап',
 r:()=>{const q=[];S.clients.forEach(c=>{
  if(c.flag)q.push([c,`${I.bolt}<b>${esc(first(c))}: «${esc(c.flag)}»</b><div class="sm mut">Замени упражнения на этой неделе</div>`,[['Заменить',`editClient('${c.id}')`],['Открыть',`openClient('${c.id}')`]]]);
  if(c.status=='missed')q.push([c,`<b>${esc(first(c))} пропустил ${c.planned-c.done} из ${c.planned}</b><div class="sm mut">Последний вход 4 дня назад</div>`,[[c.reminded?'Напомнили':'Напомнить',`remind('${c.id}')`],['Написать',`openChat('${c.id}')`]]]);
  if(c.status=='waiting')q.push([c,`<b>${esc(first(c))} ждёт план</b><div class="sm mut">Анкета заполнена 2 дня назад</div>`,[['Создать план',`editClient('${c.id}')`]]]);
  if(c.status=='new')q.push([c,`<b>${esc(first(c))} — новый клиент</b><div class="sm mut">${c.w?'Анкета готова':'Ещё нет анкеты и веса'}</div>`,[[c.reminded?'Напомнили':'Попросить анкету',`remind('${c.id}')`],['План',`editClient('${c.id}')`]]]);
  if(c.unread)q.push([c,`<b>${esc(first(c))}: ${c.unread} новых</b><div class="sm mut">«${esc(c.msgs.filter(m=>m[0]=='them').at(-1)?.[1]||'')}»</div>`,[['Ответить',`openChat('${c.id}')`]]]);});
 return `<div class="body col gap12" style="padding-top:12px"><div class="row sb"><div><div class="xs mut">Вторник, 24 ноября</div><div class="h1">${S.me.name?`Привет, ${esc(S.me.name.split(' ')[0])}`:'Сегодня'}</div></div>${av(S.me.name||'Тренер')}</div>
 <div class="row gap8"><div class="card kpi"><span class="xs mut">Клиентов</span><b>${S.clients.length}</b></div><div class="card kpi"><span class="xs mut">Ждут реакции</span><b style="color:var(--A)">${q.length}</b></div></div>
 ${S.clients.length==0?`<div class="card empty"><b>Пока без клиентов</b>Отправь код ${S.me.code}, и первый клиент появится здесь.<button class="btn p" style="margin-top:12px" onclick="go('t-invite')">Пригласить</button></div>`:
 q.length?q.map(([c,h,a])=>`<div class="card col gap8"><div class="row gap12">${av(c.name)}<div style="flex:1">${h}</div></div><div class="row gap8">${a.map(([l,f],k)=>`<button class="btn ${k?'s':'p'}" style="height:44px" ${l=='Напомнили'?'disabled':''} onclick="${f}">${l}</button>`).join('')}</div></div>`).join(''):
 `<div class="card empty"><b>Всё под контролем</b>Никто не ждёт ответа. Можно заняться шаблонами.</div>`}</div>${tabsT('today')}`}},
{id:'t-clients',g:'Кабинет тренера',t:'Клиенты',notes:['Один список, разница только в фильтре.','Поиск не теряет фокус при перерисовке.','«+» — приглашение.'],tz:'Убрали дубль «Сегодня»/«Клиенты»',
 r:()=>{const F={all:'Все',need:'Реакция',active:'Активные',paused:'Пауза'};const L=S.clients.filter(c=>(S.filter=='all'||(S.filter=='need'&&needs(c))||(S.filter=='unpaid'&&!c.paid)||c.status==S.filter)&&c.name.toLowerCase().includes(S.q.toLowerCase()));
 return `<div class="top"><div class="h1" style="margin:0">Клиенты</div><button class="back" aria-label="Пригласить клиента" onclick="go('t-invite')">${I.plus}</button></div><div class="body col gap12">
 <input id="qIn" class="inp" type="search" placeholder="Поиск по имени" value="${esc(S.q)}" oninput="S.q=this.value;commit()">
 <div class="chips">${Object.entries(F).map(([k,l])=>`<button class="chip ${S.filter==k?'on':''}" onclick="S.filter='${k}';commit()">${l}</button>`).join('')}</div>
 <div class="card">${L.length?L.map(c=>`<button class="li tap" onclick="openClient('${c.id}')">${av(c.name)}<div style="flex:1;min-width:0"><b>${esc(c.name)}</b><div class="xs mut">${GOALS[c.goal]} · ${c.planned?`${c.done}/${c.planned} трен.`:'без плана'}</div><div style="margin-top:4px">${st(c)}${c.flag?` <span class="flag">${esc(c.flag)}</span>`:''}</div></div>${c.unread?`<span class="badge">${c.unread}</span>`:I.chev}</button>`).join(''):`<div class="empty"><b>Никого не нашли</b>Сбрось фильтр или поиск</div>`}</div>
 ${S.archived.length?`<div class="xs mut">В архиве: ${S.archived.map(esc).join(', ')}</div>`:''}</div>${tabsT('users')}`}},
{id:'t-client',g:'Кабинет тренера',t:'Карточка клиента',notes:['Флаг травмы всегда сверху.','Вкладки: План · Питание · Прогресс. Всё редактируется отсюда.','Вес — тренд, а не сырые скачки.'],tz:'Нужные данные vs шум (доменный эксперт)',
 r:()=>{const c=C();if(!c)return `${hdr()}<div class="body empty"><b>Клиент не выбран</b></div>`;const m=macros(c),T={plan:'План',food:'Питание',prog:'Прогресс'};
 const body={plan:()=>c.plan.length?`<div class="card">${c.plan.map(d=>`<div class="li"><b style="flex:1">${esc(d.t)}</b><span class="sm mut">${d.ex.length} упр.</span></div>`).join('')}</div><div class="sm mut">Выполнено на неделе: <b>${c.done} из ${c.planned||c.plan.length}</b> · версия плана ${c.ver}</div><button class="btn p" onclick="editClient('${c.id}')">Редактировать план</button>`:`<div class="card empty"><b>Плана ещё нет</b>${esc(first(c))} ждёт. Начни с шаблона — это быстрее.</div><button class="btn p" onclick="editClient('${c.id}')">Создать план</button>`,
  food:()=>m?`<div class="card col gap8"><div class="row sb"><b>Норма</b><b>${fmt(m.k)} ккал</b></div><div class="sm mut">Б ${m.p} · Ж ${m.f} · У ${m.c} г${c.kcalAdj?` · корректировка ${c.kcalAdj>0?'+':''}${c.kcalAdj}`:''}</div><div class="row sb sm"><span>Сегодня съедено</span><span>${fmt(c.eaten)} ккал</span></div><div class="meter"><i style="width:${Math.min(100,c.eaten/m.k*100)}%"></i></div><div class="row sb sm"><span>Белок</span><span>${c.protein} / ${m.p} г</span></div><div class="meter blue"><i style="width:${Math.min(100,c.protein/m.p*100)}%"></i></div></div><button class="btn s" onclick="editClient('${c.id}','food')">Изменить норму</button>`:`<div class="card empty"><b>Нет роста и веса</b>Без них норму не посчитать. Попроси ${esc(first(c))} заполнить анкету.</div><button class="btn s" ${c.reminded?'disabled':''} onclick="remind('${c.id}')">${c.reminded?'Напомнили сегодня':'Попросить анкету'}</button>`,
  prog:()=>`<div class="card"><div class="row sb"><b>Вес, кг</b><span class="sm">${kg(c.w)}${c.weights.length>1?` <span class="mut">(${(c.weights.at(-1)-c.weights[0]>0?'+':'')+kg(c.weights.at(-1)-c.weights[0])})</span>`:''}</span></div>${spark(c.weights)}</div><div class="row gap8"><div class="card kpi"><span class="xs mut">План</span><b>${c.planned?Math.round(c.done/c.planned*100):0}%</b></div><div class="card kpi"><span class="xs mut">Сон</span><b>${c.sleep||'—'}/5</b></div></div>`,
  pay:()=>`<div class="card col gap8"><div class="row sb"><span>Цена</span><b>${fmt(c.price)} ₽/мес</b></div><div class="row sb"><span>Статус</span><span>${c.paid?`Оплачено до ${c.paidUntil}`:'<span style="color:var(--signal)">Не оплачено</span>'}</span></div><div class="row sb sm mut"><span>Тебе после комиссии</span><span>${fmt(c.price*(1-COMM))} ₽</span></div></div>${c.paid?'':`<button class="btn p" ${c.reminded?'disabled':''} onclick="remind('${c.id}','pay')">${c.reminded?'Напомнили сегодня':'Напомнить об оплате'}</button><button class="btn s" onclick="markPaid('${c.id}')">Отметить оплату вручную</button>`}<button class="btn t" onclick="openSheet('price',{id:'${c.id}'})">Изменить цену</button>`};
 return `${hdr('',`<button class="back" aria-label="Управление" onclick="openSheet('manage',{id:'${c.id}'})">${I.more}</button>`,'t-clients')}<div class="body col gap12">
 <div class="row gap12">${av(c.name)}<div style="flex:1"><div class="h2">${esc(c.name)}</div><div class="xs mut">${c.age} ${c.age%10==1&&c.age!=11?'год':'лет'} · ${GOALS[c.goal]}${c.w?` · ${kg(c.w)} кг`:''}</div><div style="margin-top:4px">${st(c)}</div></div><button class="btn s" style="width:auto;height:40px;padding:0 14px" onclick="openChat('${c.id}')">${I.mail}</button></div>
 ${c.flag?`<div class="card row gap8" style="border-color:var(--signal)!important"><span class="flag">${I.bolt}${esc(c.flag)}</span><span class="sm" style="flex:1">Учти в плане</span><button class="chip" onclick="clearFlag()">Снять</button></div>`:''}
 <div class="seg">${Object.entries(T).map(([k,l])=>`<button class="${S.ctab==k?'on':''}" onclick="S.ctab='${k}';commit()">${l}</button>`).join('')}</div>
 ${body[S.ctab]()}</div>`}},
{id:'t-editor',g:'Кабинет тренера',t:'Конструктор плана',notes:['Один конструктор: тренировка и питание.','Упражнение: подходы × повторы × вес × отдых, всё степперами.','Шаблоны — шторка с ±5% к весам. «Опубликовать» поднимает версию и шлёт push.'],tz:'Отдельный экран «Шаблоны» убран',
 r:()=>{const c=C();if(!c)return `${hdr()}<div class="body empty"><b>Нет клиента</b></div>`;const d=c.plan[S.eday];const m=macros(c);
 return `${hdr(`<div class="col" style="align-items:center"><b>План · ${esc(first(c))}</b><span class="xs mut">v${c.ver}${S.dirty?' · черновик':''}</span></div>`,`<button class="back" aria-label="Шаблоны" onclick="openSheet('tpl')">${I.tpl}</button>`,'t-client')}
 <div class="body col gap12"><div class="seg"><button class="${S.emode=='train'?'on':''}" onclick="S.emode='train';commit()">Тренировка</button><button class="${S.emode=='food'?'on':''}" onclick="S.emode='food';commit()">Питание</button></div>
 ${S.emode=='train'?`<div class="chips">${c.plan.map((x,k)=>`<button class="chip ${k==S.eday?'on':''}" onclick="S.eday=${k};commit()">${esc(x.t.split(' · ')[0])}</button>`).join('')}<button class="chip" aria-label="Добавить день" onclick="addDay()">+ день</button></div>
 ${d?`<div class="card"><div class="row sb"><b>${esc(d.t)}</b><div class="row"><button class="ic-btn" aria-label="Копировать день" onclick="copyDay()">${I.copy}</button><button class="ic-btn" aria-label="Удалить день" onclick="delDay()">${I.close}</button></div></div>
 ${d.ex.length?d.ex.map((e,k)=>`<div class="ex-row" style="flex-wrap:wrap"><div class="grow"><b>${esc(e.n)}</b><div class="xs mut">отдых ${e.rest} с</div></div><button class="ic-btn" aria-label="Удалить упражнение" onclick="delEx(${k})">${I.close}</button>
  <div class="ex-grid">${[['s','подх.',1],['r','повт.',1],['w','кг',2.5],['rest','отдых',15]].map(([f,l,st])=>`<div class="col" style="align-items:center"><div class="mini-stp"><button aria-label="${l} меньше" onclick="exAdj(${k},'${f}',-${st})">${I.minus}</button><b>${f=='w'?kg(e.w):e[f]}</b><button aria-label="${l} больше" onclick="exAdj(${k},'${f}',${st})">${I.plus}</button></div><span class="xs mut">${l}</span></div>`).join('')}</div></div>`).join(''):`<div class="empty">В этом дне пока пусто</div>`}
 <button class="btn s" style="margin-top:8px" onclick="openSheet('addEx')">${I.plus}Упражнение</button></div>`:`<div class="card empty"><b>Нет дней</b>Добавь день или примени шаблон</div><button class="btn s" onclick="openSheet('tpl')">Открыть шаблоны</button>`}`
 :(m?`<div class="card col gap12" style="align-items:center"><div class="sm mut">Норма калорий · ${GOALS[c.goal]}</div>${stepper(fmt(m.k),'kcalAdj(-100)','kcalAdj(100)','ккал')}<div class="sm">Б ${m.p} · Ж ${m.f} · У ${m.c} г</div><div class="xs mut" style="text-align:center">Миффлин–Сан Жеор × активность ${c.act}. Шаг ±100 ккал — корректируй раз в 2 недели по тренду веса.</div></div>`:`<div class="card empty"><b>Нужны рост и вес</b>Норма посчитается автоматически после анкеты</div>`)}
 <button class="btn p" ${c.plan.length?'':'disabled'} onclick="publish()">${S.dirty||c.ver==0?'Опубликовать клиенту':'Опубликовано · v'+c.ver}</button></div>`}},
{id:'t-chats',g:'Кабинет тренера',t:'Чат · диалоги',notes:['Непрочитанные сверху.','Системные события (план, привязка) видны в ленте.'],tz:'Чат — отдельная вкладка',
 r:()=>{const L=[...S.clients].sort((a,b)=>b.unread-a.unread);return `<div class="top"><div class="h1" style="margin:0">Чат</div><span></span></div><div class="body col gap12"><div class="card">${L.length?L.map(c=>{const l=c.msgs.at(-1)||['sys','Нет сообщений',''];return `<button class="li tap" onclick="openChat('${c.id}')">${av(c.name)}<div style="flex:1;min-width:0"><b>${esc(c.name)}</b><div class="sm mut" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l[0]=='me'?'Ты: ':''}${esc(l[1])}</div></div>${c.unread?`<span class="badge">${c.unread}</span>`:`<span class="xs mut">${esc(l[2])}</span>`}</button>`}).join(''):'<div class="empty"><b>Пока нет диалогов</b></div>'}</div></div>${tabsT('chat')}`}},
{id:'t-thread',g:'Кабинет тренера',t:'Чат · переписка',notes:['Быстрые ответы — 5 шаблонов в 1 тап.','Клиент отвечает (симуляция через 1,4 с).','Поле ввода не теряет текст при перерисовке.'],tz:'Обратная связь и метки',
 r:()=>{const c=CH();return `${hdr(`<b>${esc(c.name)}</b>`,`<button class="back" aria-label="Карточка" onclick="openClient('${c.id}')">${I.user}</button>`,'t-chats')}
 <div class="body"><div class="msgs">${c.msgs.map(m=>`<div class="msg ${m[0]}">${esc(m[1])}${m[2]&&m[0]!='sys'?`<span class="xs">${esc(m[2])}</span>`:''}</div>`).join('')}</div></div>
 <div style="padding:0 14px"><div class="chips" style="flex-wrap:nowrap;overflow:auto">${QUICK.map(q=>`<button class="chip" style="white-space:nowrap" onclick="send('${q}')">${q}</button>`).join('')}</div></div>
 <div class="composer"><input id="draft" placeholder="Сообщение" value="${esc(S.draft)}" oninput="draftIn(this)" onkeydown="if(event.key=='Enter')send()"><button class="back" aria-label="Отправить" onclick="send()">${I.fwd}</button></div>`}},
{id:'t-profile',g:'Кабинет тренера',t:'Профиль',notes:['Всё, что указано при регистрации, редактируется здесь.','Перевыпуск кода деактивирует старый.','Удаление аккаунта — с подтверждением.'],tz:'Профиль, код, выход',
 r:()=>`<div class="top"><div class="h1" style="margin:0">Профиль</div><span class="role-badge">Тренер</span></div><div class="body col gap12">
 <div class="card row gap12">${av(S.me.name||'Тренер')}<div style="flex:1"><b>${esc(S.me.name||'Без имени')}</b><div class="xs mut">${S.me.spec.join(' · ')||'Направления не выбраны'} · опыт ${S.me.exp} л.</div></div><button class="chip" onclick="go('t-name')">Изменить</button></div>
 <div class="card col gap8"><div class="row sb"><span>Код приглашения</span><b style="letter-spacing:.12em">${S.me.code}</b></div><div class="row gap8"><button class="btn s" style="height:44px" onclick="toast('Код скопирован')">Копировать</button><button class="btn s" style="height:44px" onclick="openSheet('code')">Перевыпустить</button></div></div>
 <div class="card"><button class="li tap" onclick="go('t-spec')"><span style="flex:1">Специализация</span>${I.chev}</button>
 <div class="li"><span style="flex:1">Уведомления</span>${toggle(S.me.push,"S.me.push=!S.me.push;commit()",'Уведомления')}</div></div>
 <div class="card"><button class="li tap" onclick="tab('t-auth');toast('Ты вышел из аккаунта')"><span style="flex:1">Выйти</span></button><button class="li tap" style="color:var(--signal)" onclick="openSheet('del')"><span style="flex:1">Удалить аккаунт</span></button></div></div>${tabsT('user')}`},
];
/* bottom bar on every in-app screen, so the app is usable without the slide list */
const TABFOR={'t-client':'users','t-editor':'users','t-thread':'chat'};
SCREENS.forEach(s=>{if(TABFOR[s.id]){const r=s.r;s.r=()=>r()+tabsT(TABFOR[s.id])}});
