import mongoose from 'mongoose';
const schema=new mongoose.Schema({userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},companyId:{type:mongoose.Schema.Types.ObjectId,ref:'Company',required:true},title:{type:String,required:true},location:String,jobType:String,jobUrl:String,jobId:String,salary:String,source:String,description:String,requirements:String},{timestamps:true});
export default mongoose.model('Job',schema);
