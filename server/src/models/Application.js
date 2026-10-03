import mongoose from 'mongoose';
const schema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},jobId:{type:mongoose.Schema.Types.ObjectId,ref:'Job',required:true},status:{type:String,enum:['Saved','Applied','OA / Assessment','Interview','HR Round','Offer','Rejected','Withdrawn','No Response'],default:'Saved'},currentStage:String,source:String,appliedAt:Date,resumeVersion:String,referral:Boolean,recruiterId:{type:mongoose.Schema.Types.ObjectId,ref:'Contact'},notes:String,nextAction:String,nextActionDate:Date},{timestamps:true});
schema.index({userId:1,status:1});
export default mongoose.model('Application',schema);
