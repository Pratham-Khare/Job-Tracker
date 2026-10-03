import crypto from 'crypto';
import cron from 'node-cron';
import Email from '../models/Email.js';
import EmailEvent from '../models/EmailEvent.js';
import EmailLink from '../models/EmailLink.js';
import Notification from '../models/Notification.js';
import {sendViaGmail} from './gmailService.js';
import {renderTrackedHtml,extractUrls} from './emailService.js';

const prepareLinks=async(emailId,body)=>{
  const links=[];
  for(const originalUrl of extractUrls(body)){
    const token=crypto.randomBytes(18).toString('hex');
    await EmailLink.create({emailId,token,originalUrl});
    links.push({originalUrl,trackedUrl:`${process.env.SERVER_PUBLIC_URL||'http://localhost:5000'}/api/emails/click/${token}`});
  }
  return links;
};

export function startFollowUpWorker(){
  const expression=process.env.FOLLOWUP_CHECK_CRON||'*/30 * * * *';
  cron.schedule(expression,async()=>{
    try{
      const now=new Date();
      // Automatic follow-ups are strictly opt-in and only become due after the first tracked open.
      const due=await Email.find({status:'Sent',replied:false,autoFollowUpEnabled:true,openCount:{$gte:1},nextFollowUpAt:{$lte:now},followUpCount:{$lt:1}});
      for(const e of due){
        if(!e.autoFollowUpBody)continue;
        try{
          const follow=await Email.create({
            userId:e.userId,
            applicationId:e.applicationId||undefined,
            contactId:e.contactId||undefined,
            recipientEmail:e.recipientEmail,
            subject:e.autoFollowUpSubject||`Re: ${e.subject.replace(/^Re:\s*/i,'')}`,
            body:e.autoFollowUpBody,
            type:'Follow-up',
            followUpAfterDays:e.followUpAfterDays,
            trackingId:crypto.randomBytes(18).toString('hex'),
            status:'Draft'
          });
          const links=await prepareLinks(follow._id,follow.body);
          const trackingUrl=`${process.env.SERVER_PUBLIC_URL||'http://localhost:5000'}/api/emails/track/${follow.trackingId}`;
          const out=await sendViaGmail(e.userId,{to:follow.recipientEmail,subject:follow.subject,html:renderTrackedHtml(follow.body,trackingUrl,links)});
          follow.providerMessageId=out.id;
          follow.gmailMessageId=out.id;
          follow.gmailThreadId=out.threadId;
          follow.gmailMessageIdHeader=out.messageIdHeader;
          follow.status='Sent';
          follow.sentAt=new Date();
          follow.nextFollowUpAt=null;
          await follow.save();
          e.followUpCount+=1;
          e.autoFollowUpSentAt=new Date();
          e.nextFollowUpAt=null;
          await e.save();
          await EmailEvent.create({emailId:follow._id,type:'SENT',metadata:{followUpOf:e._id.toString(),automatic:true}});
          await Notification.create({userId:e.userId,type:'FOLLOW_UP_SENT',title:'Automatic follow-up sent',message:`Your follow-up to ${e.recipientEmail} was sent after the first email was opened.`,applicationId:e.applicationId,emailId:follow._id});
        }catch(err){
          console.error(`Automatic follow-up failed for ${e._id}:`,err.message);
          e.nextFollowUpAt=new Date(Date.now()+30*60000);
          await e.save();
        }
      }
    }catch(err){console.error('Follow-up worker error:',err.message)}
  });
  console.log(`Follow-up worker scheduled: ${expression}`);
}
