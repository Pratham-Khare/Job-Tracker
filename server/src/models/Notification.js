import mongoose from 'mongoose';
const schema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},type:String,title:String,message:String,applicationId:{type:mongoose.Schema.Types.ObjectId,ref:'Application'},emailId:{type:mongoose.Schema.Types.ObjectId,ref:'Email'},read:{type:Boolean,default:false}},{timestamps:true});
export default mongoose.model('Notification',schema);
