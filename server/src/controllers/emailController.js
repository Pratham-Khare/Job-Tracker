import crypto from 'crypto';
import Email from '../models/Email.js';
import EmailEvent from '../models/EmailEvent.js';
import EmailLink from '../models/EmailLink.js';
import Notification from '../models/Notification.js';
import Application from '../models/Application.js';
import Contact from '../models/Contact.js';
import {renderTrackedHtml,extractUrls} from '../services/emailService.js';
import {sendViaGmail} from '../services/gmailService.js';

const due=(days)=>new Date(Date.now()+Math.max(1,Number(days)||4)*86400000);
const findOwnedEmail=async(id,userId)=>Email.findOne({_id:id,userId});
async function prepareLinks(emailId,body){
  const urls=extractUrls(body);
  const links=[];
  for(const originalUrl of urls){
    const token=crypto.randomBytes(18).toString('hex');
    const link=await EmailLink.create({emailId,token,originalUrl});
    links.push({originalUrl,trackedUrl:`${process.env.SERVER_PUBLIC_URL||'http://localhost:5000'}/api/emails/click/${token}`});
  }
  return links;
}

export async function list(req,res){
  res.json(await Email.find({userId:req.user.id}).populate('contactId').populate({path:'applicationId',populate:{path:'jobId',populate:{path:'companyId'}}}).sort({createdAt:-1}));
}

export async function detail(req,res){
  const e=await findOwnedEmail(req.params.id,req.user.id);
  if(!e)return res.status(404).json({message:'Email not found'});
  const events=await EmailEvent.find({emailId:e._id}).sort({occurredAt:1});
  const links=await EmailLink.find({emailId:e._id}).sort({createdAt:1});
  await e.populate('contactId');
  await e.populate({path:'applicationId',populate:{path:'jobId',populate:{path:'companyId'}}});
  res.json({email:e,events,links});
}

export async function sendDraft(req,res){
  const e=await findOwnedEmail(req.params.id,req.user.id);
  if(!e)return res.status(404).json({message:'Email draft not found'});
  if(e.status!=='Draft')return res.status(400).json({message:'Only a draft can be sent'});
  try{
    const links=await prepareLinks(e._id,e.body);
    const trackingUrl=`${process.env.SERVER_PUBLIC_URL||'http://localhost:5000'}/api/emails/track/${e.trackingId||crypto.randomBytes(18).toString('hex')}`;
    if(!e.trackingId){e.trackingId=trackingUrl.split('/').pop();}
    const out=await sendViaGmail(req.user.id,{to:e.recipientEmail,subject:e.subject,html:renderTrackedHtml(e.body,trackingUrl,links),text:e.body});
    e.providerMessageId=out.id;e.gmailMessageId=out.id;e.gmailThreadId=out.threadId;e.gmailMessageIdHeader=out.messageIdHeader;e.status='Sent';e.sentAt=new Date();e.nextFollowUpAt=null;await e.save();
    await EmailEvent.create({emailId:e._id,type:'SENT'});
    return res.status(201).json(e);
  }catch(err){e.status='Failed';await e.save();return res.status(502).json({message:err.message||'Email could not be sent'});}
}

export async function send(req,res){
  const {applicationId,contactId,recipientEmail,subject,body,type='Initial Outreach',followUpAfterDays=4,autoFollowUpEnabled=false,autoFollowUpSubject='',autoFollowUpBody=''}=req.body;
  const cleanApplicationId=applicationId||undefined, cleanContactId=contactId||undefined;
  if(cleanApplicationId&&!await Application.findOne({_id:cleanApplicationId,userId:req.user.id}))return res.status(404).json({message:'Application not found'});
  if(cleanContactId&&!await Contact.findOne({_id:cleanContactId,userId:req.user.id}))return res.status(404).json({message:'Contact not found'});
  if(!recipientEmail||!subject||!body)return res.status(400).json({message:'Recipient, subject and body are required'});
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(recipientEmail).trim()))return res.status(400).json({message:'Please enter a valid recipient email address'});
  const autoEnabled=Boolean(autoFollowUpEnabled);
  if(autoEnabled&&!String(autoFollowUpBody||'').replace(/<[^>]*>/g,'').trim())return res.status(400).json({message:'Add the follow-up body or turn off automatic follow-up.'});
  const trackingId=crypto.randomBytes(18).toString('hex');
  const e=await Email.create({userId:req.user.id,applicationId:cleanApplicationId,contactId:cleanContactId,recipientEmail:String(recipientEmail).trim(),subject,body,type,followUpAfterDays:Number(followUpAfterDays)||4,autoFollowUpEnabled:autoEnabled,autoFollowUpSubject:String(autoFollowUpSubject||''),autoFollowUpBody:String(autoFollowUpBody||''),trackingId,status:'Draft'});
  try{
    const links=await prepareLinks(e._id,body);
    const trackingUrl=`${process.env.SERVER_PUBLIC_URL||'http://localhost:5000'}/api/emails/track/${trackingId}`;
    const out=await sendViaGmail(req.user.id,{to:e.recipientEmail,subject,html:renderTrackedHtml(body,trackingUrl,links)});
    e.providerMessageId=out.id;e.gmailMessageId=out.id;e.gmailThreadId=out.threadId;e.gmailMessageIdHeader=out.messageIdHeader;e.status='Sent';e.sentAt=new Date();e.nextFollowUpAt=null;await e.save();
    await EmailEvent.create({emailId:e._id,type:'SENT'});
    res.status(201).json(e);
  }catch(err){e.status='Failed';await e.save();return res.status(502).json({message:err.message||'Email could not be sent'});}
}

export async function sendFollowUp(req,res){
  const e=await findOwnedEmail(req.params.id,req.user.id);
  if(!e)return res.status(404).json({message:'Email not found'});
  if(e.status!=='Sent')return res.status(400).json({message:'Only a sent email can be followed up'});
  if(e.replied)return res.status(400).json({message:'This contact has already replied'});
  if(e.followUpCount>=2)return res.status(400).json({message:'Follow-up limit reached for this email'});
  const {subject,body}=req.body;if(!body)return res.status(400).json({message:'Follow-up body is required'});
  const follow=await Email.create({userId:req.user.id,applicationId:e.applicationId||undefined,contactId:e.contactId||undefined,recipientEmail:e.recipientEmail,subject:subject||`Re: ${e.subject.replace(/^Re:\s*/i,'')}`,body,type:'Follow-up',followUpAfterDays:e.followUpAfterDays,trackingId:crypto.randomBytes(18).toString('hex'),status:'Draft'});
  try{
    const links=await prepareLinks(follow._id,body);
    const trackingUrl=`${process.env.SERVER_PUBLIC_URL||'http://localhost:5000'}/api/emails/track/${follow.trackingId}`;
    const out=await sendViaGmail(req.user.id,{to:follow.recipientEmail,subject:follow.subject,html:renderTrackedHtml(body,trackingUrl,links)});
    follow.providerMessageId=out.id;follow.gmailMessageId=out.id;follow.gmailThreadId=out.threadId;follow.gmailMessageIdHeader=out.messageIdHeader;follow.status='Sent';follow.sentAt=new Date();follow.nextFollowUpAt=due(follow.followUpAfterDays);await follow.save();
    e.followUpCount+=1;e.nextFollowUpAt=null;await e.save();
    await EmailEvent.create({emailId:follow._id,type:'SENT',metadata:{followUpOf:e._id.toString()}});
    res.status(201).json(follow);
  }catch(err){follow.status='Failed';await follow.save();return res.status(502).json({message:err.message||'Follow-up could not be sent'});}
}

export async function trackOpen(req,res){
  const e=await Email.findOne({trackingId:req.params.trackingId});
  if(e){
    const firstOpen=e.openCount===0;
    e.openCount+=1;e.lastOpenedAt=new Date();
    if(firstOpen&&e.autoFollowUpEnabled&&!e.replied&&e.followUpCount===0){
      e.nextFollowUpAt=due(e.followUpAfterDays);
    }
    await e.save();
    await EmailEvent.create({emailId:e._id,type:'OPENED',metadata:{source:'tracking-pixel',userAgent:req.get('user-agent'),ip:req.ip}});
    if(firstOpen)await Notification.create({userId:e.userId,type:'EMAIL_OPENED',title:'Email opened',message:e.autoFollowUpEnabled?`Your email to ${e.recipientEmail} was opened. Automatic follow-up is scheduled for ${e.nextFollowUpAt?e.nextFollowUpAt.toLocaleString():'later'}.`:`Your email to ${e.recipientEmail} was opened.`,applicationId:e.applicationId,emailId:e._id});
  }
  res.set('Content-Type','image/gif');res.set('Cache-Control','no-store, no-cache, must-revalidate, max-age=0');res.send(Buffer.from('R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=','base64'));
}

export async function trackClick(req,res){
  const link=await EmailLink.findOne({token:req.params.token});
  if(!link)return res.status(404).send('Link not found');
  link.clickCount+=1;link.lastClickedAt=new Date();await link.save();
  await EmailEvent.create({emailId:link.emailId,type:'CLICKED',occurredAt:link.lastClickedAt,metadata:{url:link.originalUrl,token:link.token,userAgent:req.get('user-agent'),ip:req.ip}});
  return res.redirect(302,link.originalUrl);
}

