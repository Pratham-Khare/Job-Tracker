import mongoose from 'mongoose';
const schema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},companyId:{type:mongoose.Schema.Types.ObjectId,ref:'Company'},name:{type:String,required:true},email:String,designation:String,linkedinUrl:String,phone:String,notes:String},{timestamps:true});
export default mongoose.model('Contact',schema);
