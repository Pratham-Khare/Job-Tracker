import cron from 'node-cron';
import GmailAccount from '../models/GmailAccount.js';
import {syncRepliesForUser} from './gmailService.js';
export function startGmailReplyWorker(){
 const expression=process.env.GMAIL_REPLY_CHECK_CRON||'*/2 * * * *';
 cron.schedule(expression,async()=>{for(const a of await GmailAccount.find({}).select('userId')){try{await syncRepliesForUser(a.userId)}catch(e){console.error(`Gmail reply sync failed for ${a.userId}:`,e.message)}}});
 console.log(`Gmail reply worker scheduled: ${expression}`);
}
