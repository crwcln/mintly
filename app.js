const $=s=>document.querySelector(s);


const sb=supabase.createClient(CFG.SUPABASE_URL,CFG.SUPABASE_ANON_KEY);
let me=null,loans=[];
const money=n=>n.toLocaleString('en-US',{style:'currency',currency:'USD'});
const fd=d=>new Date(d+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const ini=n=>n.trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();
const iso=d=>d.toISOString().slice(0,10);
const today=()=>iso(new Date());
const days=(a,b)=>(new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/864e5;
const PD={weekly:7,monthly:30};
function calc(l,now=today()){
 const pd=PD[l.rate_type],end=now<l.due_date?now:l.due_date;
 const per=Math.max(0,days(l.start_date,end)/pd),base=l.principal*l.interest_rate/100*per;
 let pen=0,od=0,ow=0,er=l.interest_rate,over=now>l.due_date;
 if(over){od=days(l.due_date,now);ow=Math.floor(od/7);er=l.interest_rate*(1+.5*ow);pen=l.principal*er/100*(od/pd)}
 const ti=base+pen;return{base,pen,od,ow,er,over,ti,bal:l.principal+ti}}
const harsh=(r,t)=>{const a=r*(t==='weekly'?52:12);return a<=12?['Gentle','#16a34a',a]:a<=60?['Moderate','#f59e0b',a]:a<=156?['High','#f97316',a]:['Extreme','#ef4444',a]};
const PRE=[['Friendly',2,'monthly','a casual favor for a friend'],['Standard',5,'monthly','a fair, steady return'],['Firm',3,'weekly','steady weekly growth'],['Aggressive',10,'weekly','fast, firm accrual'],['Shark',20,'weekly','very harsh, use with care']];
const code=()=>{const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';return Array.from({length:6},()=>c[Math.random()*c.length|0]).join('')};
const mine=()=>loans.filter(l=>l.created_by_id===me);
const logo=(s='text-2xl')=>`<div class="flex items-center gap-2 ${s} h"><span class="inline-flex w-9 h-9 rounded-xl items-center justify-center text-white" style="background:linear-gradient(135deg,#34d399,#059669)">🍃</span>Mintly</div>`;
const chk=({error})=>{if(error)throw error};
const loadLoans=async()=>{const{data}=await sb.from('loans').select('*').order('updated_date',{ascending:false});loans=(data||[]).map(l=>({...l,principal:+l.principal,interest_rate:+l.interest_rate}))};
const busy=async f=>{try{await f();await loadLoans()}catch(e){alert('Something went wrong: '+(e.message||e))}render()};
const enter=async()=>{await enter0();go('/')};
const enter0=async()=>{const{data}=await sb.auth.getSession();me=data.session?data.session.user.id:null;if(me)await loadLoans()};
const countUp=(el,to)=>{const t0=performance.now();(function f(t){const p=Math.min(1,(t-t0)/900);el.textContent=money(to*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)})(t0)};
const go=h=>{location.hash=h};
const route=()=>(location.hash.slice(1)||'/').split('?')[0];

/* ---------- auth ---------- */
function authPage(r){
 const reg=r==='/register',fp=r==='/forgot-password',rp=r==='/reset-password';
 const t=reg?'Create your account':fp?'Reset your password':rp?'Choose a new password':'Welcome back';
 const btn=reg?'Create account':fp?'Send reset link':rp?'Save password':'Sign in';
 $('#app').innerHTML=`<div class="min-h-screen flex flex-col items-center justify-center p-4 gap-6">${logo('text-3xl')}
 <div class="pop w-full max-w-sm p-6 rounded-3xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-xl space-y-3">
 <h1 class="text-xl">${t}</h1>
 ${rp?'':'<input id="ae" type="email" class="i" placeholder="Email" autocomplete="email">'}
 ${fp?'':`<input id="ap" type="password" class="i" placeholder="${rp?'New password':'Password'}" autocomplete="${reg||rp?'new-password':'current-password'}">`}
 <p id="er" class="text-sm"></p>
 <button class="b w-full" onclick="auth('${r}')">${btn}</button>
 <div class="text-sm text-center space-y-1">${reg?'<a class="underline" href="#/login">Have an account? Sign in</a>':'<a class="underline" href="#/register">New here? Create an account</a>'}${r==='/login'?'<br><a class="underline" href="#/forgot-password">Forgot password?</a>':''}<br><a class="underline" href="#/portal">Borrower Portal</a></div></div></div>`}
async function auth(r){
 const em=$('#ae')?$('#ae').value.trim().toLowerCase():'',p=$('#ap')?$('#ap').value:'';
 const er=(m,ok)=>{$('#er').textContent=m;$('#er').className='text-sm '+(ok?'text-emerald-700':'text-rose-600')};
 if(r==='/forgot-password'){if(!em)return er('Enter your email.');const{error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname});return error?er(error.message):er('Check your email for a reset link.',1)}
 if(p.length<6)return er('Use a password of 6+ characters.');
 if(r==='/reset-password'){const{error}=await sb.auth.updateUser({password:p});return error?er(error.message):enter()}
 if(!em)return er('Enter your email.');
 if(r==='/register'){const{data,error}=await sb.auth.signUp({email:em,password:p});if(error)return er(error.message);if(!data.session)return er('Check your email to confirm your account, then sign in.',1)}
 else{const{error}=await sb.auth.signInWithPassword({email:em,password:p});if(error)return er(error.message)}
 enter()}
const signout=async()=>{await sb.auth.signOut();me=null;loans=[];go('/login')};

/* ---------- shell ---------- */
const NAV=[['/','Dashboard','◧'],['/lending','Lending','↗'],['/borrowing','Borrowing','↙'],['/history','History','◷']];
const footer=`<footer class="mt-10 text-sm text-gray-500 space-y-2 pb-6"><div class="h text-gray-900">Mintly</div><p>Track what you lend and borrow, with interest that works itself out.</p><div class="flex gap-4"><a href="#/portal" class="underline">Borrower Portal</a><a href="#/login" class="underline">Sign in</a></div></footer>`;
function shell(r,inner,pub){
 const link=(x,c)=>`<a href="#${x[0]}" class="flex items-center gap-3 px-4 py-2.5 rounded-full font-semibold ${c?'bg-gray-900 text-white':'text-gray-600 hover:bg-white/70'}">${x[2]} ${x[1]}</a>`;
 $('#app').innerHTML=`<div class="md:flex gap-6 p-4 max-w-6xl mx-auto">
 ${me?`<aside class="hidden md:flex flex-col justify-between g p-4 w-60 h-[calc(100vh-2rem)] sticky top-4 shrink-0"><div class="space-y-6"><div class="px-2 pt-2">${logo()}</div><nav class="space-y-1">${NAV.map(x=>link(x,r===x[0])).join('')}</nav></div>
 <div class="space-y-1"><a href="#/portal" class="block px-4 py-2 text-gray-600 font-semibold">Borrower Portal</a><button onclick="signout()" class="block px-4 py-2 text-gray-600 font-semibold">Sign out</button></div></aside>
 <div class="md:hidden sticky top-0 z-20 -mx-4 -mt-4 mb-4 px-4 py-3 bg-white/70 backdrop-blur-xl flex justify-between items-center">${logo('text-xl')}<button class="b2" onclick="$('#mm').classList.toggle('hidden')">☰</button></div>
 <div id="mm" class="hidden md:hidden g p-3 mb-4 space-y-1">${[...NAV,['/portal','Borrower Portal']].map(x=>`<a class="block px-3 py-2 rounded-xl font-semibold ${r===x[0]?'bg-gray-900 text-white':''}" href="#${x[0]}">${x[1]}</a>`).join('')}<button class="px-3 py-2 font-semibold" onclick="signout()">Sign out</button></div>`:''}
 <main class="flex-1 min-w-0">${!me&&pub?`<div class="flex justify-between items-center mb-6">${logo()}<a class="b2" href="#/login">Sign in</a></div>`:''}${inner}${footer}</main></div>`}

/* ---------- loan views ---------- */
function card(l,ro){
 const c=calc(l),done=l.status==='completed',st=done?['Completed','bg-gray-100 text-gray-600']:c.over?['Overdue','bg-rose-100 text-rose-700']:['Active','bg-emerald-100 text-emerald-700'];
 return`<div class="g lift p-5 space-y-3"><div class="flex items-center gap-3"><div class="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">${ini(l.counterparty_name)}</div>
 <div class="flex-1 min-w-0"><div class="h truncate">${esc(l.counterparty_name)}</div><span class="text-xs px-2 py-0.5 rounded-full ${st[1]}">${c.over&&!done?'<span class="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse mr-1"></span>':''}${st[0]}</span></div>
 <div class="text-right"><div class="h text-xl">${money(done?l.principal+c.ti:c.bal)}</div><div class="text-xs text-gray-500">+${money(c.ti)} interest</div></div></div>
 <div class="text-sm text-gray-500 flex justify-between"><span>Due ${fd(l.due_date)}</span><span>${l.interest_rate}% / ${l.rate_type==='weekly'?'week':'month'}</span></div>
 ${c.over&&!done?`<div class="rounded-xl bg-rose-50 text-rose-700 text-sm p-3">${Math.floor(c.od)} days (${c.ow} full weeks) overdue. Penalty rate is now ${c.er.toFixed(2)}% / ${l.rate_type==='weekly'?'week':'month'}.</div>`:''}
 ${ro?'':`<div class="flex flex-wrap gap-2">${done?`<button class="b2" onclick="reopen('${l.id}')">Undo settle</button>`:`<button class="b2" onclick="share('${l.id}')">Share code</button><button class="b2" onclick="settle('${l.id}')">Settle</button><button class="b2" onclick="loanForm('${l.id}')">Edit</button>`}<button class="b2 text-rose-600" onclick="del('${l.id}')">Delete</button></div>`}</div>`}
const esc=s=>String(s??'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const upd=(id,p)=>busy(async()=>chk(await sb.from('loans').update({...p,updated_date:new Date().toISOString()}).eq('id',id)));
const settle=id=>upd(id,{status:'completed'});
const reopen=id=>upd(id,{status:'active'});
const del=id=>{if(confirm('Delete this loan? This can\'t be undone.'))busy(async()=>chk(await sb.from('loans').delete().eq('id',id)))};
const closeM=()=>$('#modal').innerHTML='';
function share(id){const l=loans.find(x=>x.id===id);
 $('#modal').innerHTML=`<div class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 fade"><div class="pop g bg-white p-6 w-full max-w-sm text-center space-y-4" style="background:#fff"><h2 class="text-xl">Share access code</h2>
 <div class="font-mono text-4xl font-bold tracking-widest text-emerald-700">${l.access_code}</div>
 <button id="cp" class="b2" onclick="navigator.clipboard&&navigator.clipboard.writeText('${l.access_code}');this.textContent='Copied!'">Copy code</button>
 <p class="text-sm text-gray-500">${esc(l.counterparty_name)} can enter this code at the Borrower Portal to view this loan read-only.</p><button class="b" onclick="closeM()">Close</button></div></div>`}
function list(r,type,title,sub){
 const a=mine().filter(l=>l.type===type&&l.status==='active');
 shell(r,`<div class="flex justify-between items-start gap-3 mb-6"><div><h1 class="text-3xl">${title}</h1><p>${sub}</p></div><button class="b" onclick="loanForm(null,'${type}')">New loan</button></div>
 <div class="grid gap-4 lg:grid-cols-2">${a.map(l=>card(l)).join('')||`<div class="g p-8 text-center lg:col-span-2">Nothing here yet. Add a loan to start tracking interest.</div>`}</div>`)}

/* ---------- pages ---------- */
function dash(){dash0();const n=$('#net');countUp(n,+n.dataset.v)}
function dash0(){
 const a=mine().filter(l=>l.status==='active').map(l=>({l,c:calc(l)}));
 const lent=a.filter(x=>x.l.type==='lent'),bor=a.filter(x=>x.l.type==='borrowed'),sum=(x,f)=>x.reduce((s,y)=>s+f(y),0);
 const owed=sum(lent,y=>y.c.bal),owe=sum(bor,y=>y.c.bal),od=a.filter(x=>x.c.over).length;
 const st=(t,v,c='')=>`<div class="g p-4"><div class="text-sm text-gray-500">${t}</div><div class="h text-2xl ${c}">${v}</div></div>`;
 const rec=[...a].sort((x,y)=>y.l.updated_date.localeCompare(x.l.updated_date)).slice(0,3);
 shell('/',`<div class="flex justify-between items-center mb-6"><h1 class="text-3xl">Your portfolio</h1><button class="b" onclick="loanForm()">New loan</button></div>
 <div class="rounded-3xl p-6 text-white shadow-xl" style="background:linear-gradient(135deg,#064e3b,#111827)"><div class="text-emerald-200 text-sm">Net position</div><div id="net" data-v="${owed-owe}" class="text-5xl md:text-6xl font-extrabold my-2">${money(owed-owe)}</div>
 <div class="flex gap-6 text-sm"><div><div class="text-emerald-200">Owed to you</div><b>${money(owed)}</b></div><div><div class="text-emerald-200">You owe</div><b>${money(owe)}</b></div></div></div>
 <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">${st('Principal out',money(sum(lent,y=>y.l.principal)))}${st('Interest earned',money(sum(lent,y=>y.c.ti)))}${st('Active loans',a.length)}${st('Overdue',od,od?'text-rose-600':'')}</div>
 <h2 class="text-xl mt-8 mb-3">Recent activity</h2><div class="grid gap-4 lg:grid-cols-2">${rec.map(x=>card(x.l)).join('')||`<div class="g p-8 text-center lg:col-span-2"><p class="mb-3">No loans yet. Create your first one to see interest accrue.</p><button class="b" onclick="loanForm()">Create a loan</button></div>`}</div>`)}
function hist(){const a=mine().filter(l=>l.status==='completed');
 shell('/history',`<h1 class="text-3xl">History</h1><p class="mb-6">Loans you've settled.</p><div class="grid gap-4 lg:grid-cols-2">${a.map(l=>card(l)).join('')||'<div class="g p-8 text-center lg:col-span-2">No settled loans yet.</div>'}</div>`)}
function portal(){
 shell('/portal',`<div class="max-w-md mx-auto g p-6 space-y-3 mt-6"><h1 class="text-2xl">Borrower Portal</h1><p>Enter the 6-character code you were given to see your loan.</p>
 <input id="pc" maxlength="6" class="i font-mono text-2xl tracking-widest uppercase text-center" placeholder="ABC234"><p id="pe" class="text-rose-600 text-sm"></p>
 <button class="b w-full" onclick="lookup()">View loan</button></div>`,1)}
async function lookup(){const c=$('#pc').value.trim().toUpperCase();const{data}=await sb.rpc('get_loan_by_code',{code:c});if(!data||!data.length)return $('#pe').textContent='No loan found for that code. Check it and try again.';go('/view?'+c)}
async function view(){
 $('#app').innerHTML='<div class="p-10 text-center text-gray-500">Loading…</div>';
 const c0=(location.hash.split('?')[1]||'').toUpperCase();
 const{data}=await sb.rpc('get_loan_by_code',{code:c0});const l=data&&data[0]?{...data[0],principal:+data[0].principal,interest_rate:+data[0].interest_rate}:null;
 if(!l)return shell('/view','<div class="g p-8 text-center">Loan not found. <a class="underline" href="#/portal">Try another code</a></div>',1);
 const c=calc(l),row=(a,b)=>`<div class="flex justify-between py-1.5"><span>${a}</span><b>${b}</b></div>`;
 shell('/view',`<div class="max-w-lg mx-auto g p-6 space-y-3 mt-4"><div class="text-sm text-gray-500">Read-only loan</div><h1 class="text-2xl">${esc(l.counterparty_name)}</h1>
 <div class="h text-4xl">${money(c.bal)}</div>${c.over?`<div class="rounded-xl bg-rose-50 text-rose-700 p-3 text-sm">Overdue by ${Math.floor(c.od)} days. Penalty rate is ${c.er.toFixed(2)}% per ${l.rate_type==='weekly'?'week':'month'}.</div>`:''}
 <div class="divide-y">${row('Principal',money(l.principal))}${row('Interest',money(c.base))}${row('Overdue penalty',money(c.pen))}${row('Due date',fd(l.due_date))}${row('Rate',l.interest_rate+'% / '+(l.rate_type==='weekly'?'week':'month'))}</div>
 ${l.payment_instructions?`<div><b>How to pay</b><p class="whitespace-pre-line">${esc(l.payment_instructions)}</p></div>`:''}${l.contact_note?`<div><b>Contact</b><p>${esc(l.contact_note)}</p></div>`:''}</div>`,1)}


/* ---------- loan form ---------- */
let F={};
function loanForm(id,type){
 const l=id&&loans.find(x=>x.id===id);
 F=l?{...l}:{type:type||'lent',counterparty_name:'',principal:'',start_date:today(),due_date:iso(new Date(Date.now()+60*864e5)),interest_rate:5,rate_type:'monthly',payment_instructions:'',contact_note:''};
 formDraw(1)}
function formDraw(first){
 const h=harsh(+F.interest_rate||0,F.rate_type),lend=F.type==='lent';
 const tg=(v,t)=>`<button class="flex-1 py-2 rounded-full font-semibold ${F.type===v?'bg-gray-900 text-white':''}" onclick="fset('type','${v}')">${t}</button>`;
 $('#modal').innerHTML=`<div class="fixed inset-0 z-50 bg-black/40 overflow-y-auto p-4 ${first?'fade':''}"><div class="${first?'pop':''} max-w-md mx-auto rounded-3xl bg-white p-5 space-y-3 shadow-2xl my-4">
 <h2 class="text-xl">${F.id?'Edit loan':'New loan'}</h2>
 <div class="flex bg-gray-100 rounded-full p-1">${tg('lent',"I'm lending")}${tg('borrowed',"I'm borrowing")}</div>
 <label class="block text-sm font-semibold">${lend?'Borrower name':'Lender name'}<input class="i mt-1 font-normal" value="${esc(F.counterparty_name)}" oninput="F.counterparty_name=this.value"></label>
 <label class="block text-sm font-semibold">Principal<div class="relative mt-1"><span class="absolute left-3 top-2.5 text-gray-400">$</span><input type="number" min="0" class="i pl-7 font-normal" value="${F.principal}" oninput="F.principal=this.value"></div></label>
 <div class="grid grid-cols-2 gap-3">${dp('start_date','Start date')}${dp('due_date','Due date')}</div>
 <div class="text-sm font-semibold">Interest period<div class="relative mt-1"><button class="i text-left font-normal" onclick="$('#sel').classList.toggle('hidden')">${F.rate_type==='weekly'?'Weekly':'Monthly'} ▾</button><div id="sel" class="hidden absolute z-10 w-full bg-white border rounded-xl shadow-lg mt-1 overflow-hidden">${['weekly','monthly'].map(v=>`<button class="block w-full text-left px-3 py-2 hover:bg-emerald-50 font-normal" onclick="fset('rate_type','${v}')">${v==='weekly'?'Weekly':'Monthly'}</button>`).join('')}</div></div></div>
 <div class="flex flex-wrap gap-2">${PRE.map(p=>`<button title="${p[3]}" class="b2 !py-1 !px-3" onclick="preset('${p[0]}')">${p[0]}</button>`).join('')}</div>
 <label class="block text-sm font-semibold">Interest rate (%)<input type="number" min="0" step="0.1" class="i mt-1 font-normal" style="border-color:${h[1]}" value="${F.interest_rate}" oninput="F.interest_rate=this.value;hz()"></label>
 <div id="hz" class="text-sm font-semibold" style="color:${h[1]}">${h[0]} · about ${h[2].toFixed(0)}% per year</div>
 <label class="block text-sm font-semibold">Payment instructions (optional)<textarea class="i mt-1 font-normal" rows="2" oninput="F.payment_instructions=this.value">${esc(F.payment_instructions)}</textarea></label>
 <label class="block text-sm font-semibold">Contact note (optional)<input class="i mt-1 font-normal" value="${esc(F.contact_note)}" oninput="F.contact_note=this.value"></label>
 <p id="fe" class="text-rose-600 text-sm"></p>
 <div class="flex gap-2 justify-end"><button class="b2" onclick="closeM()">Cancel</button><button class="b" onclick="fsave()">Save loan</button></div></div></div>`}
const hz=()=>{const h=harsh(+F.interest_rate||0,F.rate_type);$('#hz').textContent=`${h[0]} · about ${h[2].toFixed(0)}% per year`;$('#hz').style.color=h[1];document.querySelector('input[step]').style.borderColor=h[1]};
const fset=(k,v)=>{F[k]=v;if(k==='due_date'||k==='start_date'){if(F.due_date<F.start_date)F.due_date=F.start_date}formDraw()};
function preset(n){const p=PRE.find(x=>x[0]===n);F.interest_rate=p[1];F.rate_type=p[2];F.preset=n;F.due_date=iso(new Date(new Date(F.start_date+'T00:00:00').getTime()+(p[2]==='weekly'?14:60)*864e5));formDraw()}
let CM={};
function dp(k,label){
 const open=CM.k===k;let g='';
 if(open){const y=CM.y,m=CM.m,first=new Date(y,m,1).getDay(),n=new Date(y,m+1,0).getDate();
  g=`<div class="absolute z-10 bg-white border rounded-2xl shadow-xl p-3 w-64 mt-1"><div class="flex justify-between items-center mb-2"><button onclick="cmv(-1)">‹</button><b>${new Date(y,m,1).toLocaleDateString('en-US',{month:'long',year:'numeric'})}</b><button onclick="cmv(1)">›</button></div><div class="grid grid-cols-7 text-center text-sm gap-y-1">${'SMTWTFS'.split('').map(d=>`<span class="text-gray-400">${d}</span>`).join('')}${'<span></span>'.repeat(first)}${Array.from({length:n},(_,i)=>{const d=iso(new Date(Date.UTC(y,m,i+1))),dis=k==='due_date'&&d<F.start_date;return`<button ${dis?'disabled':''} class="rounded-full py-1 ${d===F[k]?'bg-gray-900 text-white':dis?'text-gray-300':'hover:bg-emerald-100'}" onclick="fset('${k}','${d}');CM={}">${i+1}</button>`}).join('')}</div></div>`}
 return`<div class="relative text-sm font-semibold">${label}<button class="i mt-1 text-left font-normal" onclick="cmo('${k}')">${fd(F[k])}</button>${g}</div>`}
const cmo=k=>{if(CM.k===k){CM={}}else{const d=new Date(F[k]+'T00:00:00');CM={k,y:d.getFullYear(),m:d.getMonth()}}formDraw()};
const cmv=d=>{const x=new Date(CM.y,CM.m+d,1);CM.y=x.getFullYear();CM.m=x.getMonth();formDraw()};
function fsave(){
 const e=m=>$('#fe').textContent=m;
 if(!F.counterparty_name.trim())return e('Enter a name.');if(!(+F.principal>0))return e('Principal must be more than 0.');
 if(!(+F.interest_rate>=0)||F.interest_rate==='')return e('Interest rate must be 0 or more.');
 const o={...F,principal:+F.principal,interest_rate:+F.interest_rate,updated_date:new Date().toISOString()};
 ['id','created_by_id','created_date'].forEach(k=>delete o[k]);const id=F.id;closeM();CM={};
 busy(async()=>chk(id?await sb.from('loans').update(o).eq('id',id):await sb.from('loans').insert({...o,access_code:code()})))}

/* ---------- router ---------- */
function render(){
 const r=route();closeM();
 if(r==='/portal')return portal();if(r==='/view')return view();
 if(['/login','/register','/forgot-password','/reset-password'].includes(r))return authPage(r==='/reset-password'?'/forgot-password':r);
 if(!me)return go('/login');
 ({'/':dash,'/lending':()=>list('/lending','lent','Lending',"Money you've lent out."),'/borrowing':()=>list('/borrowing','borrowed','Borrowing','Money you owe.'),'/history':hist}[r]||dash)()}
if(CFG.SUPABASE_URL.includes('YOUR-PROJECT')){$('#app').innerHTML='<div class="p-10 text-center">Add your Supabase URL and anon key to config.js. See the README.</div>'}else{
sb.auth.onAuthStateChange((ev,s)=>{me=s?s.user.id:null;if(ev==='PASSWORD_RECOVERY')go('/reset-password')});
addEventListener('hashchange',render);
(async()=>{await enter0();render()})()}
