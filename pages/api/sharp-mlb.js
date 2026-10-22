import { runSharp, auth } from '../../lib/sharp-engine';
export default async function handler(req,res){
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ok:false,error:'Method not allowed'});
  if (!auth(req)) return res.status(401).json({ok:false,error:'Unauthorized'});
  try { const result=await runSharp('MLB',req); if(result.ok) res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=600'); return res.status(200).json(result); } catch(e){ return res.status(500).json({ok:false,league:'MLB',error:e.message,alerts:[]}); }
}
