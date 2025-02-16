const mongoose = require('mongoose'); 
const PateintSchema = new mongoose.Schema({
    patientProfilePhoto: {
        public_id:String,
        secure_url:String
    },
    patientName :{type:String, required:true, minlength:3, maxlength:20}, 
    patientEmail : {
        type:String,
        required:true, 
        unique : true 
    },
    password : {type:String,required:true},
    dateOfBirth : {type:Date,required:true}, 
    phone:{
        type: String,
        unique: true,
        required:true, 
    },
    healthRecordText: {type: String,required:true},
    healthRecord: {
        medicines: [{ type: String }],
        diseases: [{ type: String }]
    },
    otpCreatedAt:Date,
    otpPassword:String,
    gender: { type: String, enum: ['male', 'female'] },
    
    location: {
        type: { type: String, default: "Point" },
        coordinates: [Number], 
    },
    changedPasswordAt:Date
    
})

const pateintModel =  mongoose.model('Patient', PateintSchema)

module.exports=pateintModel