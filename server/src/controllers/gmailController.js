import crypto from 'crypto';
import {getAuthorizationUrl,finishAuthorization,getGmailStatus,disconnectGmail} from '../services/gmailService.js';
import jwt from 'jsonwebtoken';
function makeState(userId){return jwt.sign({uid:userId,purpose:'gmail-oauth'},process.env.JWT_SECRET,{expiresIn:'10m'});}
export async function connect(req,res){res.json({url:getAuthorizationUrl(makeState(req.user.id))});}
export async function callback(req,res){
  try{
    const payload=jwt.verify(req.query.state||'',process.env.JWT_SECRET); if(payload.purpose!=='gmail-oauth')throw new Error('Invalid OAuth state');
    await finishAuthorization(req.query.code,payload.uid);
    res.redirect(`${process.env.CLIENT_URL||'http://localhost:5173'}?gmail=connected`);
  }catch(e){res.redirect(`${process.env.CLIENT_URL||'http://localhost:5173'}?gmail=error&message=${encodeURIComponent(e.message)}`)}
}
export async function status(req,res){res.json(await getGmailStatus(req.user.id));}
export async function disconnect(req,res){await disconnectGmail(req.user.id);res.json({ok:true});}
