import jwt from 'jsonwebtoken';
export function auth(req,res,next){try{const h=req.headers.authorization||'';if(!h.startsWith('Bearer ')) return res.status(401).json({message:'Authentication required'});req.user=jwt.verify(h.slice(7),process.env.JWT_SECRET);next();}catch{return res.status(401).json({message:'Invalid or expired token'});}}
