import Application from '../models/Application.js';
import Company from '../models/Company.js';
import Job from '../models/Job.js';

export async function list(req,res){
  res.json(await Application.find({userId:req.user.id})
    .populate({path:'jobId',populate:{path:'companyId'}})
    .populate('recruiterId')
    .sort({updatedAt:-1}));
}

export async function create(req,res){
  const {jobId, company = {}, job = {}, ...applicationData} = req.body;
  if (jobId === '') applicationData.jobId = undefined;
  let resolvedJobId = jobId || null;

  if (resolvedJobId) {
    const existingJob = await Job.findOne({_id:resolvedJobId,userId:req.user.id});
    if (!existingJob) return res.status(404).json({message:'Job not found'});
  } else {
    const companyName = String(company.name || '').trim();
    const jobTitle = String(job.title || '').trim();
    if (!companyName) return res.status(400).json({message:'Company name is required'});
    if (!jobTitle) return res.status(400).json({message:'Job title is required'});

    let existingCompany = await Company.findOne({userId:req.user.id,name:companyName});
    if (!existingCompany) {
      try {
        existingCompany = await Company.create({
          userId:req.user.id,
          name:companyName,
          website:company.website || '',
          industry:company.industry || '',
          notes:company.notes || ''
        });
      } catch (err) {
        if (err?.code === 11000) existingCompany = await Company.findOne({userId:req.user.id,name:companyName});
        else throw err;
      }
    }

    let existingJob = await Job.findOne({userId:req.user.id,companyId:existingCompany._id,title:jobTitle});
    if (!existingJob) {
      existingJob = await Job.create({
        userId:req.user.id,
        companyId:existingCompany._id,
        title:jobTitle,
        location:job.location || '',
        jobType:job.jobType || '',
        jobUrl:job.jobUrl || '',
        jobId:job.jobId || '',
        salary:job.salary || '',
        source:job.source || '',
        description:job.description || '',
        requirements:job.requirements || ''
      });
    }
    resolvedJobId = existingJob._id;
  }

  const a = await Application.create({...applicationData,jobId:resolvedJobId,userId:req.user.id});
  res.status(201).json(await a.populate({path:'jobId',populate:{path:'companyId'}}));
}

export async function update(req,res){
  const a=await Application.findOneAndUpdate({_id:req.params.id,userId:req.user.id},req.body,{new:true});
  if(!a)return res.status(404).json({message:'Application not found'});
  res.json(a);
}

export async function remove(req,res){await Application.deleteOne({_id:req.params.id,userId:req.user.id});res.json({message:'Deleted'})}
