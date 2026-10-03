import XLSX from 'xlsx';
import Company from '../models/Company.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Contact from '../models/Contact.js';
import Email from '../models/Email.js';

const FIELDS=['name','email','phone','designation','linkedinUrl','company','website','industry','jobTitle','location','jobType','jobUrl','jobId','salary','source','status','appliedAt','notes','emailSubject','emailBody'];
const ALIASES={
 name:['name','fullname','full name','contact name','person','recruiter','recruiter name'],
 email:['email','email address','recruiter email','contact email','mail'],
 phone:['phone','phone number','mobile','mobile number','contact phone','telephone'],
 designation:['designation','contact title','contact role','recruiter title'],
 linkedinUrl:['linkedin','linkedin url','linkedin profile','linkedin profile url'],
 company:['company','company name','organization','organisation','employer'],
 website:['website','company website','company url'], industry:['industry'],
 jobTitle:['job title','position','job','role title','opening','position title'],
 location:['location','job location','city'], jobType:['job type','employment type','employment'],
 jobUrl:['job url','job link','job posting url','job posting link'], jobId:['job id','jobid','requisition id','requisition'],
 salary:['salary','ctc','compensation','package'], source:['source','job source'],
 status:['status','application status'], appliedAt:['applied at','applied date','date applied'],
 notes:['notes','contact notes','application notes'], emailSubject:['email subject','subject'], emailBody:['email body','body','email message']
};
const clean=v=>String(v??'').trim();
const key=v=>clean(v).toLowerCase().replace(/[^a-z0-9]/g,'');
function suggestMapping(headers){
 const normalized=new Map(headers.map(h=>[key(h),h]));
 const mapping={};
 for(const field of FIELDS){
   const exact=ALIASES[field].map(key).find(a=>normalized.has(a));
   mapping[field]=exact?normalized.get(exact):'';
 }
 return mapping;
}
function readWorkbook(buffer){
 const wb=XLSX.read(buffer,{type:'buffer',cellDates:true});
 const sheet=wb.Sheets[wb.SheetNames[0]];
 return {rows:XLSX.utils.sheet_to_json(sheet,{defval:''}),headers:XLSX.utils.sheet_to_json(sheet,{header:1,defval:''})[0]||[]};
}
export async function previewExcel(req,res){
 if(!req.file)return res.status(400).json({message:'Please upload an Excel or CSV file.'});
 try{
   const {rows,headers}=readWorkbook(req.file.buffer);
   if(!headers.length||!rows.length)return res.status(400).json({message:'The spreadsheet is empty.'});
   res.json({rows:rows.length,headers, sample:rows.slice(0,8),suggestedMapping:suggestMapping(headers)});
 }catch(err){res.status(400).json({message:`Could not read spreadsheet: ${err.message}`});}
}
function value(row,mapping,field){const col=mapping?.[field];return col?clean(row[col]):'';}
function validStatus(s){return ['Saved','Applied','OA / Assessment','Interview','HR Round','Offer','Rejected','Withdrawn','No Response'].includes(s)?s:'Saved'}

export async function importExcel(req,res){
 if(!req.file)return res.status(400).json({message:'Please upload an Excel or CSV file.'});
 try{
   const {rows,headers}=readWorkbook(req.file.buffer);
   const mapping=typeof req.body.mapping==='string'?JSON.parse(req.body.mapping):req.body.mapping||{};
   const createEmailDrafts=String(req.body.createEmailDrafts)==='true';
   if(!headers.length||!rows.length)return res.status(400).json({message:'The spreadsheet is empty.'});
   let contactsCreated=0,contactsUpdated=0,companiesCreated=0,jobsCreated=0,applicationsCreated=0,draftsCreated=0;
   const errors=[];
   for(let i=0;i<rows.length;i++){
     const row=rows[i];
     try{
       const r={}; for(const f of FIELDS)r[f]=value(row,mapping,f);
       let company=null,job=null,application=null,contact=null;
       if(r.company){
         company=await Company.findOne({userId:req.user.id,name:new RegExp(`^${r.company.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i')});
         if(!company){company=await Company.create({userId:req.user.id,name:r.company,website:r.website,industry:r.industry});companiesCreated++;}
       }
       if(company&&r.jobTitle){
         job=await Job.findOne({userId:req.user.id,companyId:company._id,title:r.jobTitle});
         if(!job){job=await Job.create({userId:req.user.id,companyId:company._id,title:r.jobTitle,location:r.location,jobType:r.jobType,jobUrl:r.jobUrl,jobId:r.jobId,salary:r.salary,source:r.source,description:'',requirements:''});jobsCreated++;}
       }
       if(r.email||r.phone||r.name){
         contact=r.email?await Contact.findOne({userId:req.user.id,email:r.email.toLowerCase()}):null;
         if(contact){
           Object.assign(contact,{name:r.name||contact.name,phone:r.phone||contact.phone,designation:r.designation||contact.designation,linkedinUrl:r.linkedinUrl||contact.linkedinUrl,notes:r.notes||contact.notes,companyId:company?company._id:contact.companyId});
           await contact.save();contactsUpdated++;
         }else{
           contact=await Contact.create({userId:req.user.id,name:r.name||r.email||'Imported Contact',email:r.email?r.email.toLowerCase():undefined,phone:r.phone||undefined,designation:r.designation||undefined,linkedinUrl:r.linkedinUrl||undefined,notes:r.notes||undefined,companyId:company?company._id:undefined});contactsCreated++;
         }
       }
       if(job){
         application=await Application.findOne({userId:req.user.id,jobId:job._id});
         if(!application){application=await Application.create({userId:req.user.id,jobId:job._id,status:validStatus(r.status),appliedAt:r.appliedAt?new Date(r.appliedAt):undefined,notes:r.notes||undefined});applicationsCreated++;}
       }
       // Import NEVER sends email. It can only create an explicit Draft when the user enables that option.
       if(createEmailDrafts&&r.email){
         const subject=r.emailSubject||`Application${r.jobTitle?` for ${r.jobTitle}`:''}${r.company?` at ${r.company}`:''}`;
         const body=r.emailBody||`Hi ${r.name||'there'},\n\nI am reaching out regarding ${r.jobTitle||'an opportunity'}${r.company?` at ${r.company}`:''}.\n\nBest regards,\n${req.user.name||'Your Name'}`;
         const exists=await Email.findOne({userId:req.user.id,recipientEmail:r.email,status:'Draft',subject});
         if(!exists){await Email.create({userId:req.user.id,applicationId:application?._id,contactId:contact?._id,recipientEmail:r.email,subject,body,type:'Initial Outreach',status:'Draft'});draftsCreated++;}
       }
     }catch(err){errors.push({row:i+2,message:err.message});}
   }
   res.status(201).json({message:createEmailDrafts?'Import completed; email drafts created only. Nothing was sent.':'Import completed; contacts and job data created. No emails were sent.',rows:rows.length,contactsCreated,contactsUpdated,companiesCreated,jobsCreated,applicationsCreated,draftsCreated,emailsSent:0,errors});
 }catch(err){res.status(400).json({message:`Could not read spreadsheet: ${err.message}`});}
}
