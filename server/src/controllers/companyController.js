import Company from '../models/Company.js';
export async function list(req,res){res.json(await Company.find({userId:req.user.id}).sort({name:1}))}
export async function create(req,res){const c=await Company.create({...req.body,userId:req.user.id});res.status(201).json(c)}
