import Contact from '../models/Contact.js';
import Company from '../models/Company.js';

export async function list(req,res){res.json(await Contact.find({userId:req.user.id}).populate('companyId').sort({name:1}))}

export async function create(req,res){
  const {companyId,...data}=req.body;
  const cleanCompanyId=companyId || undefined;
  if(cleanCompanyId){
    const company=await Company.findOne({_id:cleanCompanyId,userId:req.user.id});
    if(!company)return res.status(404).json({message:'Company not found'});
  }
  const c=await Contact.create({...data,companyId:cleanCompanyId,userId:req.user.id});
  res.status(201).json(await c.populate('companyId'));
}
