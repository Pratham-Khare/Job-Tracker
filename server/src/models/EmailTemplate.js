import mongoose from 'mongoose';

const schema=new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  name:{type:String,required:true,trim:true},
  subject:{type:String,default:''},
  body:{type:String,default:''},
},{timestamps:true});

schema.index({userId:1,name:1},{unique:true});

export default mongoose.model('EmailTemplate',schema);
