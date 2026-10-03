import Call from '../models/Call.js';
import Contact from '../models/Contact.js';
import Application from '../models/Application.js';

export async function list(req,res){
  const calls=await Call.find({userId:req.user.id}).populate('contactId').populate({path:'applicationId',populate:{path:'jobId',populate:{path:'companyId'}}}).sort({calledAt:-1,createdAt:-1});
  res.json(calls);
}
export async function create(req,res){
  const {contactId,applicationId,phone,outcome='Not Called',notes,calledAt,nextCallAt}=req.body;
  if(!contactId||!phone)return res.status(400).json({message:'Contact and phone number are required'});
  const contact=await Contact.findOne({_id:contactId,userId:req.user.id});if(!contact)return res.status(404).json({message:'Contact not found'});
  if(applicationId&&!await Application.findOne({_id:applicationId,userId:req.user.id}))return res.status(404).json({message:'Application not found'});
  const c=await Call.create({userId:req.user.id,contactId,applicationId:applicationId||undefined,phone:String(phone).trim(),outcome,notes,calledAt:calledAt?new Date(calledAt):(outcome!=='Not Called'?new Date():undefined),nextCallAt:nextCallAt?new Date(nextCallAt):undefined});
  res.status(201).json(await c.populate('contactId'));
}
export async function update(req,res){
  const data={...req.body};if(data.calledAt)data.calledAt=new Date(data.calledAt);if(data.nextCallAt)data.nextCallAt=new Date(data.nextCallAt);
  const c=await Call.findOneAndUpdate({_id:req.params.id,userId:req.user.id},data,{new:true}).populate('contactId');if(!c)return res.status(404).json({message:'Call not found'});res.json(c);
}
export async function remove(req,res){await Call.deleteOne({_id:req.params.id,userId:req.user.id});res.json({message:'Deleted'});}
