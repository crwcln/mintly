// EdgeOne Pages Edge Function: /api/loan
// Requires a KV namespace bound to this project with variable name: mintly_kv
const ID=/^[a-z0-9]{8,32}$/, TK=/^[a-z0-9]{16,64}$/;
const J=(o,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{'content-type':'application/json','cache-control':'no-store'}});
const str=(v,n)=>String(v??'').slice(0,n);
const num=v=>{v=Number(v);return isFinite(v)&&v>=0&&v<1e12?v:0};
const day=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)?v:'';
const clean=s=>({n:str(s.n,80),p:num(s.p),s:day(s.s),d:day(s.d),t:s.t==='weekly'?'weekly':'monthly',r:num(s.r),x:num(s.x),
  paid:num(s.paid),st:s.st==='done'?'done':'active',dn:day(s.dn),i:str(s.i,1000)});

export async function onRequest({request}){
  try{
    const url=new URL(request.url);
    if(request.method==='GET'){
      const id=url.searchParams.get('id')||'';
      if(!ID.test(id))return J({error:'bad id'},400);
      const rec=await mintly_kv.get('loan_'+id,{type:'json'});
      return rec?J(rec.snap):J({error:'not found'},404);
    }
    if(request.method==='PUT'||request.method==='DELETE'){
      const b=await request.json();
      if(!ID.test(b.id||'')||!TK.test(b.tok||''))return J({error:'bad request'},400);
      const key='loan_'+b.id, cur=await mintly_kv.get(key,{type:'json'});
      if(cur&&cur.tok!==b.tok)return J({error:'forbidden'},403);
      if(request.method==='DELETE'){await mintly_kv.delete(key);return J({ok:true})}
      if(!b.snap||typeof b.snap!=='object')return J({error:'bad snapshot'},400);
      await mintly_kv.put(key,JSON.stringify({tok:b.tok,snap:clean(b.snap)}));
      return J({ok:true});
    }
    return J({error:'method not allowed'},405);
  }catch(e){return J({error:'server error'},500)}
}
