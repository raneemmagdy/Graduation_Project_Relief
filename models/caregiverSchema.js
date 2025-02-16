const mongoose = require('mongoose'); 

const caregiverSchema = new mongoose.Schema({
    caregiverProfilePhoto: {
        public_id:String,
        secure_url:String
    },
    
    caregiverName :{type:String, required:true, minlength:3, maxlength:20}, 
 
    caregiverEmail : {
        type:String,
        required:true,
        unique : true 
    }, 

    password : {type:String,required:true},
    dateOfBirth :  {type:Date,required:true}, 
    phone:{
        type: String,
        unique: true,
        required:true
    },
    otpCreatedAt:Date,
    otpPassword:String,
    
    ratings: [{ type: Number }],
    averageRating: { type: Number, default: 0 },
    gender: { type: String,required:true , enum: ['male', 'female'] },
    availability: { type: Boolean, default: true },
    doYouSmoke :{type:String, required:true, enum: ['yes','no'] },
    canYouDrive : {type:String, required:true, enum: ['yes','no']},

    biography:{type:String , required:true },
    extractedDetails: {
    diseases: [{ type: String }]
    },
    location: {
    type: { type: String, default: "Point" },
    coordinates: [Number], 
    },
    availabilityEndDate: { type: Date },
    changedPasswordAt:Date,
})
caregiverSchema.index({ location: "2dsphere" });
const caregiverModel =  mongoose.model('Caregiver', caregiverSchema)

module.exports=caregiverModel