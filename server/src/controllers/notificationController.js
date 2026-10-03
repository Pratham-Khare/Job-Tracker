import Notification from '../models/Notification.js';
export async function list(req,res){res.json(await Notification.find({userId:req.user.id}).sort({createdAt:-1}).limit(50))}
export async function read(req,res){await Notification.updateOne({_id:req.params.id,userId:req.user.id},{read:true});res.json({ok:true})}
