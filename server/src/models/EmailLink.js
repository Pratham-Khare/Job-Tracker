import mongoose from 'mongoose';
const schema=new mongoose.Schema({
  emailId:{type:mongoose.Schema.Types.ObjectId,ref:'Email',required:true,index:true},
  token:{type:String,required:true,unique:true,index:true},
  originalUrl:{type:String,required:true},
  clickCount:{type:Number,default:0},
  lastClickedAt:Date
},{timestamps:true});
export default mongoose.model('EmailLink',schema);
