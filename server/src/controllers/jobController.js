import Job from '../models/Job.js';
export async function list(req,res){res.json(await Job.find({userId:req.user.id}).populate('companyId').sort({createdAt:-1}))}
export async function create(req,res){const j=await Job.create({...req.body,userId:req.user.id});res.status(201).json(await j.populate('companyId'))}
export async function update(req,res){const j=await Job.findOneAndUpdate({_id:req.params.id,userId:req.user.id},req.body,{new:true});if(!j)return res.status(404).json({message:'Job not found'});res.json(j)}
export async function remove(req,res){await Job.deleteOne({_id:req.params.id,userId:req.user.id});res.json({message:'Deleted'})}
