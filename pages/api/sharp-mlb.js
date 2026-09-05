import { runSharp, auth } from './sharp-engine';
export default async function handler(req,res){
  if (!['GET','POST'].includes(req.method)) return res.status(405).json({ok:false,error:'Method not allowed'});
  if (!auth(req)) return res.status(401).json({ok:false,error:'Unauthorized'});
  try { return res.status(200).json(await runSharp('MLB',req)); } catch(e){ return res.status(500).json({ok:false,league:'MLB',error:e.message,alerts:[]}); }
}
