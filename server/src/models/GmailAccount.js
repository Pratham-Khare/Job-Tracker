import mongoose from 'mongoose';
const schema=new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,unique:true,index:true},
  email:{type:String,required:true},
  refreshTokenEncrypted:{type:String,required:true},
  scope:String,
  connectedAt:{type:Date,default:Date.now},
  lastSyncAt:Date
},{timestamps:true});
export default mongoose.model('GmailAccount',schema);
