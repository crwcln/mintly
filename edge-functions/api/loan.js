// EdgeOne Pages Edge Function: handles every /api/* route (accounts, sync, loan codes).
// Requires a KV namespace bound to this project with the variable name: mintly_kv
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const rnd=(n,A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789')=>[...crypto.getRandomValues(new Uint8Array(n))].map(b=>A[b%A.length]).join('');
const enc=s=>new TextEncoder().encode(s);
const sha=async s=>hex(await crypto.subtle.digest('SHA-256',enc(s)));
async function hashPw(pw,salt){const k=await crypto.subtle.importKey('raw',enc(pw),'PBKDF2',false,['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:enc(salt),iterations:20000},k,256))}
const str=(v,n)=>String(v??'').slice(0,n),num=v=>{v=Number(v);return isFinite(v)&&v>=0&&v<1e12?v:0},day=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)?v:'';
const clean=s=>({by:str(s.by,60),n:str(s.n,80),p:num(s.p),s:day(s.s),d:day(s.d),t:s.t==='weekly'?'weekly':'monthly',r:num(s.r),x:num(s.x),paid:num(s.paid),st:s.st==='done'?'done':'active',dn:day(s.dn),i:str(s.i,1000)});
const norm=c=>String(c||'').toUpperCase().replace(/[^A-Z0-9]/g,'');
async function authed(req){const t=(req.headers.get('authorization')||'').replace('Bearer ','');
  if(!/^[a-z0-9]{32}$/.test(t))return null;const s=await mintly_kv.get('sess_'+t,{type:'json'});return s&&s.exp>Date.now()?s.u:null}
async function session(u){const t=rnd(32,'abcdefghijklmnopqrstuvwxyz0123456789');await mintly_kv.put('sess_'+t,JSON.stringify({u,exp:Date.now()+90*864e5}));return t}

export async function onRequest({request}){
  try{
    const M=request.method,P=new URL(request.url).pathname.replace(/^\/api\/?/,'').split('/').filter(Boolean),r=P[0];
    const body=async()=>{const t=await request.text();if(t.length>1e6)throw new Error('Too large');return t?JSON.parse(t):{}};
    if(r==='health'){await mintly_kv.put('health_ping','1');return J({ok:true,kv:true})}
    if(r==='register'&&M==='POST'){
      const b=await body(),email=str(b.email,120).trim().toLowerCase(),name=str(b.name,60).trim()||'Friend';
      if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))return J({error:'Enter a valid email'},400);
      if(str(b.pw,200).length<8)return J({error:'Password needs 8+ characters'},400);
      const id=await sha(email);if(await mintly_kv.get('user_'+id))return J({error:'That email already has an account'},409);
      const salt=rnd(16);await mintly_kv.put('user_'+id,JSON.stringify({name,email,salt,h:await hashPw(b.pw,salt)}));
      return J({tok:await session(id),name,email});
    }
    if(r==='login'&&M==='POST'){
      const b=await body(),email=str(b.email,120).trim().toLowerCase(),id=await sha(email),u=await mintly_kv.get('user_'+id,{type:'json'});
      if(!u||u.h!==await hashPw(str(b.pw,200),u.salt))return J({error:'Wrong email or password'},401);
      const d=await mintly_kv.get('data_'+id,{type:'json'});
      return J({tok:await session(id),name:u.name,email:u.email,d:d&&d.d,ts:d&&d.ts});
    }
    if(r==='data'){
      const u=await authed(request);if(!u)return J({error:'Please sign in again'},401);
      if(M==='GET'){const d=await mintly_kv.get('data_'+u,{type:'json'});return J(d||{})}
      if(M==='PUT'){const b=await body();if(!b.d||!Array.isArray(b.d.loans))return J({error:'Bad data'},400);
        await mintly_kv.put('data_'+u,JSON.stringify({d:b.d,ts:Number(b.d.ts)||Date.now()}));return J({ok:true})}
    }
    if(r==='code'){
      if(M==='POST'&&!P[1]){const b=await body();let code;
        for(let i=0;i<5;i++){code=rnd(8);if(!await mintly_kv.get('code_'+code))break}
        const tok=rnd(24,'abcdefghijklmnopqrstuvwxyz0123456789');
        await mintly_kv.put('code_'+code,JSON.stringify({tok,snap:clean(b.snap||{})}));return J({code,tok});}
      const code=norm(P[1]);if(code.length!==8)return J({error:'Codes have 8 characters'},400);
      const rec=await mintly_kv.get('code_'+code,{type:'json'});
      if(M==='GET')return rec?J(rec.snap):J({error:'Code not found. Check it and try again'},404);
      const b=await body();if(!rec||rec.tok!==b.tok)return J({error:'Not allowed'},403);
      if(M==='DELETE'){await mintly_kv.delete('code_'+code);return J({ok:true})}
      if(M==='PUT'){await mintly_kv.put('code_'+code,JSON.stringify({tok:rec.tok,snap:clean(b.snap||{})}));return J({ok:true})}
    }
    return J({error:'Not found'},404);
  }catch(e){
    return J({error:/mintly_kv/.test(String(e))?'Storage not connected: bind a KV namespace named mintly_kv and redeploy':'Server error'},500);
  }
}
