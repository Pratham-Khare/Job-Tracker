import mongoose from 'mongoose';
const outcomes=['Not Called','No Answer','Busy','Call Back Later','Spoke','Interested','Not Interested','Wrong Number','Switched Off','Out of Coverage','Voicemail','Number Not Available','Do Not Call','Other'];
const schema=new mongoose.Schema({
  userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  contactId:{type:mongoose.Schema.Types.ObjectId,ref:'Contact',required:true,index:true},
  applicationId:{type:mongoose.Schema.Types.ObjectId,ref:'Application'},
  phone:{type:String,required:true},
  outcome:{type:String,enum:outcomes,default:'Not Called'},
  notes:String,
  calledAt:Date,
  nextCallAt:Date
},{timestamps:true});
export {outcomes};
export default mongoose.model('Call',schema);
