import EmailTemplate from '../models/EmailTemplate.js';

export async function list(req,res){
  res.json(await EmailTemplate.find({userId:req.user.id}).sort({updatedAt:-1,name:1}));
}

export async function create(req,res){
  const {name,subject='',body=''}=req.body;
  if(!String(name||'').trim()) return res.status(400).json({message:'Template name is required'});
  if(!String(body||'').trim()) return res.status(400).json({message:'Template body is required'});
  try{
    const t=await EmailTemplate.create({userId:req.user.id,name:String(name).trim(),subject:String(subject||''),body:String(body||'')});
    res.status(201).json(t);
  }catch(err){
    if(err.code===11000) return res.status(409).json({message:'A template with this name already exists'});
    res.status(500).json({message:err.message||'Could not create template'});
  }
}

export async function update(req,res){
  const {name,subject='',body=''}=req.body;
  if(!String(name||'').trim()) return res.status(400).json({message:'Template name is required'});
  if(!String(body||'').trim()) return res.status(400).json({message:'Template body is required'});
  try{
    const t=await EmailTemplate.findOneAndUpdate(
      {_id:req.params.id,userId:req.user.id},
      {name:String(name).trim(),subject:String(subject||''),body:String(body||'')},
      {new:true,runValidators:true}
    );
    if(!t) return res.status(404).json({message:'Template not found'});
    res.json(t);
  }catch(err){
    if(err.code===11000) return res.status(409).json({message:'A template with this name already exists'});
    res.status(500).json({message:err.message||'Could not update template'});
  }
}

export async function remove(req,res){
  const result=await EmailTemplate.deleteOne({_id:req.params.id,userId:req.user.id});
  if(!result.deletedCount) return res.status(404).json({message:'Template not found'});
  res.json({ok:true});
}
