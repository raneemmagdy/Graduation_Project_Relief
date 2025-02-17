const bcrypt = require('bcrypt')
const caregiverModel = require('../models/caregiverSchema');
const cloudinary = require("../services/cloudinaryConfig")
const jwt=require('jsonwebtoken');
const patientValidation = require('../validation/patientValidation');
const patientModel = require('../models/PatientSchema');
const sendNotification = require('../services/notificationSender');
const { emailTemplate } = require('../utils/email_templete');
const specificRequestModel = require('../models/specificRequestSchema');
const publicRequestModel = require('../models/publicRequestSchema');
const { default: axios } = require('axios');
let customAlphabet;
(async () => {
  const nanoid = await import('nanoid');
  customAlphabet = nanoid.customAlphabet;
})();
const extractHealthRecord = async (text) => {
    try {
        const response = await axios.post('https://RaneemElmahdi-relief-model-api.hf.space/healthRecord/predict', { text });
        return response.data;
    } catch (error) {
        console.error('Error calling NLP API:', error);
        throw error;
    }
}
// API endpoint for SignUP
const signUp = async function (req, res) {
    try {
       
        const { error } = patientValidation.patientValidationSchema.validate(req.body, { abortEarly: false });

        if (error) {
            return res.status(400).json({ message: error.details.map(err => err.message) });
        }
        
        let { patientName,patientEmail, phone, password,dateOfBirth,healthRecordText,gender,longitude,latitude } = req.body;
        patientEmail = patientEmail.toLowerCase();
        const emailExists = await patientModel.findOne({ patientEmail });
        const emailExistsInCaregiver=await caregiverModel.findOne({caregiverEmail:patientEmail})
        if (emailExists||emailExistsInCaregiver) {
            return res.status(400).json({ message: "Email already exists" });
        }
        const phoneExists = await patientModel.findOne({ phone });
        const phoneExistsInCaregiver = await caregiverModel.findOne({ phone });

        if (phoneExists||phoneExistsInCaregiver) {
            return res.status(400).json({ message: "Phone number already exists" });
        }
        let pathForProfileImage= {}
        if(req.file){
            const { public_id, secure_url } = await cloudinary.uploader.upload(req.file.path, {
                folder: 'Relief/patients',
               });
            pathForProfileImage = { public_id, secure_url };
        }
        const healthRecord = await extractHealthRecord(healthRecordText);
        const hashedPassword = await bcrypt.hash(password, +process.env.SALT_ROUND);

        const newPatient =await patientModel.create({
            patientProfilePhoto:pathForProfileImage,
            patientName,
            patientEmail,
            dateOfBirth,
            phone,
            gender,
            password: hashedPassword,
            healthRecordText,
            healthRecord: {
                medicines: healthRecord.medications,
                diseases: healthRecord.diseases
            },
            location: {
                type: "Point",
                coordinates: [longitude, latitude]
            }
        });
        res.status(201).json({
            message: "Patient registered successfully",
            patient: newPatient
        });
    } catch (error) {
       
        res.status(500).json({ message:error.message});
}}

// API endpoint for SignIN
const signIn = async function (req, res) {
    try {
        const { error } = patientValidation.patientSignInValidationSchema.validate(req.body, { abortEarly: false });

        if (error) {
            return res.status(400).json({ message: error.details.map(err => err.message) });
        }

        const { patientEmail, password } = req.body;

       
        const patient = await patientModel.findOne({ patientEmail: patientEmail.toLowerCase() });

        if (!patient) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const passwordMatch = await bcrypt.compare(password, patient.password);
        if (!passwordMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: patient._id, role: "patient" },
            process.env.JWT_SECRET_PATIENT,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: "Patient login successful",
            token,
            patient
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// API endpoint for Update Profile Patient
const updateProfilePatient = async function(req, res) {
    try {
        const { error } = patientValidation.updateProfilePatientSchema.validate(req.body, { abortEarly: false });

        if (error) {
            return res.status(400).json({ message: error.details.map(err => err.message) });
        }

        const patientId = req.user._id;
        
        const { patientName, phone, dateOfBirth, healthRecordText, gender, longitude, latitude } = req.body;
  
       
        const patient = await patientModel.findById(patientId);

        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

       
        const phoneExists = await patientModel.findOne({ phone, _id: { $ne: patientId } });
        const phoneExistsInCaregiver = await caregiverModel.findOne({ phone, _id: { $ne: patientId } });

        if (phoneExists || phoneExistsInCaregiver) {
            return res.status(400).json({ message: "Phone number already exists" });
        }

        let pathForProfileImage = patient.patientProfilePhoto;
        if (req.file) {
            if (patient.patientProfilePhoto && patient.patientProfilePhoto.public_id) {
                await cloudinary.uploader.destroy(patient.patientProfilePhoto.public_id);
            }

            const { public_id, secure_url } = await cloudinary.uploader.upload(req.file.path, {
                folder: 'Relief/patients',
            });
            pathForProfileImage = { public_id, secure_url };
        }

        let healthRecord = {};
        if (healthRecordText) {
            healthRecord = await extractHealthRecord(healthRecordText);
        }

       

        patient.patientName = patientName || patient.patientName;
        patient.phone = phone || patient.phone;
        patient.dateOfBirth = dateOfBirth || patient.dateOfBirth;
        patient.gender = gender || patient.gender;
        patient.healthRecordText = healthRecordText || patient.healthRecordText;
        patient.healthRecord = {
            medicines: healthRecord.medications || patient.healthRecord.medicines,
            diseases: healthRecord.diseases || patient.healthRecord.diseases,
        };
        patient.location = {
            type: "Point",
            coordinates: [longitude || patient.location.coordinates[0], latitude || patient.location.coordinates[1]],
        };
        patient.patientProfilePhoto = pathForProfileImage;
      
        console.log(patient);
        
       
        await patient.save();
        console.log(patient);
  
        res.status(200).json({
            message: "Patient profile updated successfully",
            patient
        });
    } catch (error) {
      
        res.status(500).json({ message: error.message });
    }
};

// API endpoint for Change Password for patient
const changePasswordPatient = async (req, res) => {
    try {
        const { error } = patientValidation.changePasswordPatientSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({ message: error.details.map(err => err.message) });
        }
        const { oldPassword, newPassword } = req.body;
        const patientId = req.user._id;
        const patient = await patientModel.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }
        const isMatch = await bcrypt.compare(oldPassword, patient.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect old password" });
        }
        const hashedPassword = await bcrypt.hash(newPassword, +process.env.SALT_ROUND);
        patient.password = hashedPassword;
        patient.changedPasswordAt=Date.now()
        await patient.save();
        res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
        
        res.status(500).json({ message: error.message });
    }
}

// API endpoint for forget Password for patient
const forgetPassword = async (req, res, next) => {
    const { patientEmail } = req.body;
  
    try {
        const { error } = patientValidation.patientForgotPasswordSchema.validate(req.body, { abortEarly: false });
        if (error) {
            return res.status(400).json({ message: error.details.map(err => err.message) });
        }
      const patient = await patientModel.findOne({ patientEmail });
      if (!patient) {
        return res.status(400).json({ message: 'Patient not found' });
      }
  
      // Generate OTP
      const otp = customAlphabet('0123456789', 4)(); // 4-digit OTP
      const hashOtp = await bcrypt.hash(otp, parseInt(process.env.SALT_ROUND)); 
  
      await patientModel.updateOne(
        { patientEmail },
        { otpPassword: hashOtp, otpCreatedAt: Date.now() }
      );
  
      const emailSent= await sendNotification(patientEmail,'Password Reset',emailTemplate('🔒 Reset Password',patient.patientName,
        `
        <p>We received a request to reset the password for your account. Use the code below to reset your password:</p>
        <div class="otp-box">${otp}</div>
        <p>If you didn’t request this, please ignore this email or contact support if you have any concerns.</p>
        <p>Best regards,<br>The Relief Team</p>`

      ))
  
      if (emailSent) {
        return res.status(200).json({ message: 'OTP sent to your email' });
      } else {
        return res.status(500).json({ message: 'Error sending OTP email' });
      }
    } catch (error) {
       res.status(500).json({ message: error.message });
    }
}

// API endpoint for reset Password for patient
const resetPassword = async (req, res, next) => {
    const { patientEmail, otp, newPassword } = req.body;
  
    try {
   
      const { error } = patientValidation.patientResetPasswordSchema.validate(req.body, { abortEarly: false });
      if (error) {
        return res.status(400).json({ message: error.details.map(err => err.message) });
      }
  
   
      const patient = await patientModel.findOne({ patientEmail });
      if (!patient) {
        return res.status(400).json({ message: 'Patient not found' });
      }
  
      if (!patient.otpPassword || !patient.otpCreatedAt) {
        return res.status(400).json({ message: 'OTP expired or not requested. Please request a new one.' });
      }
  
  
      const otpValid = await bcrypt.compare(otp, patient.otpPassword);
      if (!otpValid) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }
     
   
      const otpAge = Date.now() - new Date(patient.otpCreatedAt).getTime();
      const otpExpiryTime = 2 * 60 * 1000;
      if (otpAge > otpExpiryTime) {
        return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
      }

      
  
      const saltRounds = parseInt(process.env.SALT_ROUND) || 10; // Default to 10 if not set
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
  
    
      await patientModel.updateOne(
        { patientEmail },
        { password: hashedPassword, $unset: { otpPassword: "", otpCreatedAt: "" } }
      );
  
      return res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
       res.status(500).json({ message: error.message });
    }
};
  

// API endpoint for get All Requests For Patient
const getAllApprovedRequestsForPatient = async (req, res) => {
    try {
        const patientId = req.user._id;

        
        const requestsFromSpecificRequestModel = await specificRequestModel.find({ patient: patientId });

        const requestsFromPublicRequestModel = await publicRequestModel.find({ patient: patientId });

        const combinedRequests = [...requestsFromSpecificRequestModel, ...requestsFromPublicRequestModel];

        const approvedRequests = combinedRequests.filter(request => request.status === 'approved');

        res.json({message:"Done",Requests:approvedRequests});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// API endpoint for get Patient ById
const getPatientById = async (req, res) => {
    try {
        const { patientId } = req.params;
        const patient = await patientModel.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }
        res.status(200).json({ message:"Done",  patient });
    } catch (err) {
        res.status(500).json({ message:err.message });
    }
};

// API endpoint for get All Rating Messages For Pateint
const getAllRatingMessagesForPateint = async (req, res) => {
    try {
        const patientId = req.params.patientId;
        const requestsFromSpecificRequestModel = await specificRequestModel.find({ patient: patientId }).populate('patient caregiver')

        const requestsFromPublicRequestModel = await publicRequestModel.find({ patient: patientId }).populate('patient caregiver')

        let formattedRequests = [];
        const filterRequests = (requests) => {
            return requests.filter(request => {
                return (request.messageRating !== undefined || request.rating !== undefined);
            });
        };

        formattedRequests = [
            ...filterRequests(requestsFromSpecificRequestModel),
            ...filterRequests(requestsFromPublicRequestModel)
        ]
        res.status(200).json({message:"Done",Requests:formattedRequests});
} catch (error) {
       
        res.status(500).json({ message: error.message });
    }
};


// API endpoint for get All Rating And Rating Messages From Patient To Specific Caregiver
const getAllRatingAndRatingMessagesFromPatientToSpecificCaregiver = async (req, res) => {
    try {
        const caregiverId = req.params.caregiverId;
        const patientId = req.user._id;
        
        const patient = await patientModel.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        const caregiver = await caregiverModel.findById(caregiverId);
        if (!caregiver) {
            return res.status(404).json({ message: "Caregiver not found" });
        }
        const ratingsFromSpecificRequest = await specificRequestModel
            .find({ patient: patientId, caregiver: caregiverId, rating: { $ne: null }, ratingMessage: { $ne: null } })
            .select("rating ratingMessage").populate('patient caregiver')

        const ratingsFromPublicRequest = await publicRequestModel
            .find({ patient: patientId, caregiver: caregiverId, rating: { $ne: null }, ratingMessage: { $ne: null } })
            .select("rating ratingMessage").populate('patient caregiver')

        const allRatings = [...ratingsFromSpecificRequest, ...ratingsFromPublicRequest];

        res.status(200).json({ message: "Done", ratings: allRatings });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};




module.exports = {signUp,signIn,updateProfilePatient,changePasswordPatient,forgetPassword,resetPassword,getAllApprovedRequestsForPatient,getPatientById,getAllRatingMessagesForPateint,getAllRatingAndRatingMessagesFromPatientToSpecificCaregiver}; 