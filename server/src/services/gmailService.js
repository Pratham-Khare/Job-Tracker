import {google} from 'googleapis';
import crypto from 'crypto';
import GmailAccount from '../models/GmailAccount.js';
import {encrypt,decrypt} from './tokenCrypto.js';

export const GMAIL_SCOPES=[
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly'
];

function oauthClient(){
  if(!process.env.GOOGLE_CLIENT_ID||!process.env.GOOGLE_CLIENT_SECRET||!process.env.GOOGLE_REDIRECT_URI){
    throw new Error('Google OAuth is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI to server/.env.');
  }
  return new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_CLIENT_SECRET,process.env.GOOGLE_REDIRECT_URI);
}

export function getAuthorizationUrl(state){
  return oauthClient().generateAuthUrl({access_type:'offline',prompt:'consent',include_granted_scopes:true,scope:GMAIL_SCOPES,state});
}

export async function finishAuthorization(code,userId){
  const client=oauthClient();
  const {tokens}=await client.getToken(code);
  if(!tokens.refresh_token) throw new Error('Google did not return a refresh token. Disconnect/reconnect Gmail and grant access again.');
  client.setCredentials(tokens);
  const gmail=google.gmail({version:'v1',auth:client});
  const profile=await gmail.users.getProfile({userId:'me'});
  const account=await GmailAccount.findOneAndUpdate({userId},{userId,email:profile.data.emailAddress,refreshTokenEncrypted:encrypt(tokens.refresh_token),scope:(typeof tokens.scope === 'string' ? tokens.scope : GMAIL_SCOPES.join(' ')),connectedAt:new Date()},{upsert:true,new:true,setDefaultsOnInsert:true});
  return account;
}

export async function getClientForUser(userId){
  const account=await GmailAccount.findOne({userId});
  if(!account) throw new Error('Gmail is not connected. Connect Gmail in Settings first.');
  const client=oauthClient();
  client.setCredentials({refresh_token:decrypt(account.refreshTokenEncrypted)});
  client.on('tokens',async(tokens)=>{ if(tokens.refresh_token) { account.refreshTokenEncrypted=encrypt(tokens.refresh_token); await account.save(); }});
  return {client,gmail:google.gmail({version:'v1',auth:client}),account};
}

function b64url(input){return Buffer.from(input).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function header(name,value){return `${name}: ${String(value).replace(/[\r\n]/g,' ')}`;}
function buildRaw({from,to,subject,html,text,replyTo,inReplyTo,references}){
  const boundary=`jt_${crypto.randomBytes(12).toString('hex')}`;
  const lines=[
    header('From',from),header('To',to),header('Subject',subject),
    header('MIME-Version','1.0'),header('Content-Type',`multipart/alternative; boundary="${boundary}"`),
  ];
  if(replyTo)lines.push(header('Reply-To',replyTo));
  if(inReplyTo)lines.push(header('In-Reply-To',inReplyTo));
  if(references)lines.push(header('References',references));
  lines.push('',`--${boundary}`,'Content-Type: text/plain; charset="UTF-8"','Content-Transfer-Encoding: 8bit','',text||'',`--${boundary}`,'Content-Type: text/html; charset="UTF-8"','Content-Transfer-Encoding: 8bit','',html||'',`--${boundary}--`,'');
  return b64url(lines.join('\r\n'));
}

export async function sendViaGmail(userId,{to,subject,html,text,replyTo,inReplyTo,references}){
  const {gmail,account}=await getClientForUser(userId);
  const raw=buildRaw({from:account.email,to,subject,html,text,replyTo:replyTo||account.email,inReplyTo,references});
  const result=await gmail.users.messages.send({userId:'me',requestBody:{raw}});
  const message=result.data;
  let messageIdHeader='';
  try{
    const meta=await gmail.users.messages.get({userId:'me',id:message.id,format:'metadata',metadataHeaders:['Message-ID','Date','Subject','To']});
    messageIdHeader=(meta.data.payload?.headers||[]).find(h=>h.name.toLowerCase()==='message-id')?.value||'';
    return {id:message.id,threadId:message.threadId,messageIdHeader};
  }catch{return {id:message.id,threadId:message.threadId,messageIdHeader};}
}

export async function getGmailStatus(userId){
  const account=await GmailAccount.findOne({userId}).select('email connectedAt lastSyncAt');
  return account?{connected:true,...account.toObject()}:{connected:false};
}
export async function disconnectGmail(userId){await GmailAccount.deleteOne({userId});}

export async function syncRepliesForUser(userId){
  const {gmail,account}=await getClientForUser(userId);
  const Email=(await import('../models/Email.js')).default;
  const EmailEvent=(await import('../models/EmailEvent.js')).default;
  const Notification=(await import('../models/Notification.js')).default;
  const emails=await Email.find({userId,status:'Sent',replied:false,gmailMessageId:{$exists:true,$ne:''}}).sort({sentAt:-1}).limit(100);
  if(!emails.length){account.lastSyncAt=new Date();await account.save();return 0;}
  const result=await gmail.users.messages.list({userId:'me',q:'in:inbox -from:me newer_than:30d',maxResults:100});
  let count=0;
  for(const item of (result.data.messages||[])){
    const msg=await gmail.users.messages.get({userId:'me',id:item.id,format:'metadata',metadataHeaders:['From','To','Subject','In-Reply-To','References','Message-ID','Date']});
    const headers=msg.data.payload?.headers||[]; const get=n=>headers.find(h=>h.name.toLowerCase()===n.toLowerCase())?.value||'';
    const threadId=msg.data.threadId; const inReplyTo=get('In-Reply-To'); const refs=get('References');
    const match=emails.find(e=>e.gmailThreadId&&e.gmailThreadId===threadId || (e.gmailMessageIdHeader&&(inReplyTo===e.gmailMessageIdHeader||refs.includes(e.gmailMessageIdHeader))));
    if(!match)continue;
    const occurredAt=new Date(get('Date')||Date.now());
    match.replied=true;match.repliedAt=occurredAt;match.nextFollowUpAt=null;await match.save();
    await EmailEvent.create({emailId:match._id,type:'REPLIED',occurredAt,metadata:{gmailMessageId:item.id,from:get('From'),subject:get('Subject')}});
    await Notification.create({userId,type:'EMAIL_REPLIED',title:'Recruiter replied',message:`A reply was received for ${match.subject}.`,applicationId:match.applicationId,emailId:match._id});
    count++;
  }
  account.lastSyncAt=new Date();await account.save(); return count;
}
