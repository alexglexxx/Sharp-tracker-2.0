import { getVsin } from '../../lib/providers';
import { hasCronSecret } from '../../lib/auth';
export default async function handler(req,res){ if(!hasCronSecret(req)) return res.status(401).json({ok:false,error:'Unauthorized'}); const league=(req.query.league||'MLB').toUpperCase(); if(!['MLB','NFL'].includes(league)) return res.status(400).json({ok:false,error:'league must be MLB or NFL'}); const r=await getVsin(league); return res.status(r.available?200:503).json(r); }
