import mongoose from 'mongoose';
const schema=new mongoose.Schema({emailId:{type:mongoose.Schema.Types.ObjectId,ref:'Email',required:true,index:true},type:{type:String,enum:['SENT','OPENED','REPLIED','BOUNCED','CLICKED'],required:true},occurredAt:{type:Date,default:Date.now},metadata:mongoose.Schema.Types.Mixed});
export default mongoose.model('EmailEvent',schema);
