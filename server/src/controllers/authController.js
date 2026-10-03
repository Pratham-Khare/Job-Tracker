import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Company from '../models/Company.js';
import Job from '../models/Job.js';
import Application from '../models/Application.js';
import Contact from '../models/Contact.js';
import Call from '../models/Call.js';
import Email from '../models/Email.js';
import EmailEvent from '../models/EmailEvent.js';
import EmailLink from '../models/EmailLink.js';
import EmailTemplate from '../models/EmailTemplate.js';
import Notification from '../models/Notification.js';
import GmailAccount from '../models/GmailAccount.js';

const token=u=>jwt.sign({id:u._id,email:u.email},process.env.JWT_SECRET,{expiresIn:'7d'});

export async function register(req,res){
  const {name,email,password}=req.body;
  if(!name||!email||!password||password.length<8)return res.status(400).json({message:'Name, valid email and password of at least 8 characters are required'});
  if(await User.findOne({email}))return res.status(409).json({message:'Email already registered'});
  const u=await User.create({name,email,password:await bcrypt.hash(password,12)});
  res.status(201).json({token:token(u),user:{id:u._id,name:u.name,email:u.email}})
}

export async function login(req,res){
  const {email,password}=req.body;
  const u=await User.findOne({email});
  if(!u||!(await bcrypt.compare(password,u.password)))return res.status(401).json({message:'Invalid email or password'});
  res.json({token:token(u),user:{id:u._id,name:u.name,email:u.email}})
}

export async function deleteAccount(req,res){
  const userId=req.user.id;
  const emails=await Email.find({userId}).select('_id');
  const emailIds=emails.map(e=>e._id);
  await Promise.all([
    EmailEvent.deleteMany({emailId:{$in:emailIds}}),
    EmailLink.deleteMany({emailId:{$in:emailIds}}),
    Email.deleteMany({userId}),
    Application.deleteMany({userId}),
    Job.deleteMany({userId}),
    Company.deleteMany({userId}),
    Contact.deleteMany({userId}),
    Call.deleteMany({userId}),
    EmailTemplate.deleteMany({userId}),
    Notification.deleteMany({userId}),
    GmailAccount.deleteMany({userId})
  ]);
  await User.deleteOne({_id:userId});
  res.json({ok:true,message:'Your JobTrack account and associated data were permanently deleted.'});
}
