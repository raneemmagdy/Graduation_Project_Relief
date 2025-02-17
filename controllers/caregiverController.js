const bcrypt = require('bcrypt')
const jwt=require('jsonwebtoken');
const cloudinary = require("../services/cloudinaryConfig")
const { exec } = require('child_process'); 
const caregiverModel = require('../models/caregiverSchema');
const patientModel = require('../models/PatientSchema');
const caregiverValidation = require('../validation/caregiverValidation');
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
const extractBiography = async(text) => {
   try {
        const response = await axios.post('https://RaneemElmahdi-relief-model-api.hf.space/biography/predict', { text });
        return response.data;
    } catch (error) {
        console.error('Error calling NLP API:', error);
        throw error;
    }
};
// API endpoint for SignUP
const signUp = async function (req, res) {
    try {
        const { error } = caregiverValidation.caregiverValidationSchema.validate(req.body, { abortEarly: false });
        console.log(error);
        if (error) {
            return res.status(400).json({ message: error.details.map(err => err.message) });
        }

        let { caregiverName, caregiverEmail, phone, password, dateOfBirth, biography, gender, longitude, latitude, availability, doYouSmoke, canYouDrive } = req.body;
        caregiverEmail = caregiverEmail.toLowerCase();
        const emailExists = await caregiverModel.findOne({ caregiverEmail });
        const emailExistsInPatient = await patientModel.findOne({ patientEmail: caregiverEmail });
        if (emailExists || emailExistsInPatient) {
            return res.status(400).json({ message: "Email already exists" });
        }
        const phoneExists = await caregiverModel.findOne({ phone });
        const phoneExistsInPatient = await patientModel.findOne({ phone });

        if (phoneExists||phoneExistsInPatient) {
            return res.status(400).json({ message: "Phone number already exists" });
        }

        let pathForProfileImage = {};
        if (req.file) {
            const { public_id, secure_url } = await cloudinary.uploader.upload(req.file.path, {
                folder: 'Relief/caregivers',
            });
            pathForProfileImage = { public_id, secure_url };
        }

        
        const extractedDetails = await extractBiography(biography);
        const hashedPassword = await bcrypt.hash(password, +process.env.SALT_ROUND);
        const newCaregiver = await caregiverModel.create({
            caregiverProfilePhoto: pathForProfileImage,
            caregiverName,
            caregiverEmail,
            dateOfBirth,
            phone,
            gender,
            password: hashedPassword,
            availability,
            doYouSmoke,
            canYouDrive,
            biography,
            extractedDetails: {
                diseases: extractedDetails.diseases
            },
            location: {
                type: "Point",
                coordinates: [longitude, latitude]
            }
        });

      
        res.status(201).json({
            message: "Caregiver registered successfully",
            caregiver: newCaregiver
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// API endpoint for SignIN
const signIn = async function (req, res) {
    try {
        const { error } = caregiverValidation.caregiverSignInValidationSchema.validate(req.body, { abortEarly: false });

        if (error) {
            return res.status(400).json({ message: error.details.map(err => err.message) });
        }

        const { caregiverEmail, password } = req.body;

        const caregiver = await caregiverModel.findOne({ caregiverEmail: caregiverEmail.toLowerCase() });

        if (!caregiver) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

      
        const passwordMatch = await bcrypt.compare(password, caregiver.password);
        if (!passwordMatch) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign(
            { id: caregiver._id, role: "caregiver" },
            process.env.JWT_SECRET_CAREGIVER,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: "Caregiver login successful",
            token,
            caregiver
        });

    } catch (error) {
       
        res.status(500).json({ message: error.message });
    }
};
// API endpoint for Update Profile Caregiver
const updateProfileCaregiver = async function(req, res) {
    try {
        const { error } = caregiverValidation.updateProfileCaregiverSchema.validate(req.body, { abortEarly: false });
        
        if (error) {
            return res.status(400).json({ message: error.details.map(err => err.message) });
        }
        
        const caregiverId = req.user._id;
        const { caregiverName, phone, dateOfBirth, biography, gender, longitude, latitude } = req.body;
        
        const caregiver = await caregiverModel.findById(caregiverId);
        
        if (!caregiver) {
            return res.status(404).json({ message: "Caregiver not found" });
        }
        
        const phoneExists = await caregiverModel.findOne({ phone, _id: { $ne: caregiverId } });
        const phoneExistsInPatient = await patientModel.findOne({ phone, _id: { $ne: caregiverId } });
        
        if (phoneExists || phoneExistsInPatient) {
            return res.status(400).json({ message: "Phone number already exists" });
        }
        
        let pathForProfileImage = caregiver.caregiverProfilePhoto;
        if (req.file) {
            if (caregiver.caregiverProfilePhoto && caregiver.caregiverProfilePhoto.public_id) {
                await cloudinary.uploader.destroy(caregiver.caregiverProfilePhoto.public_id);
            }
            
            const { public_id, secure_url } = await cloudinary.uploader.upload(req.file.path, {
                folder: 'Relief/caregivers',
            });
            pathForProfileImage = { public_id, secure_url };
        }
        let extractedDetails=caregiver.extractedDetails
        if(biography){
            extractedDetails = await extractBiography(biography);

        }
        caregiver.caregiverName = caregiverName || caregiver.caregiverName;
        caregiver.phone = phone || caregiver.phone;
        caregiver.dateOfBirth = dateOfBirth || caregiver.dateOfBirth;
        caregiver.gender = gender || caregiver.gender;
        caregiver.biography = biography || caregiver.biography;
        caregiver.location = {
            type: "Point",
            coordinates: [longitude || caregiver.location.coordinates[0], latitude || caregiver.location.coordinates[1]],
        };
        caregiver.caregiverProfilePhoto = pathForProfileImage;
        caregiver.extractedDetails={
            diseases: extractedDetails.diseases
        }
        await caregiver.save();

        res.status(200).json({
            message: "Caregiver profile updated successfully",
            caregiver
        });
    } catch (error) {
       
        res.status(500).json({ message: error.message });
    }
};
// API endpoint for Change Password for Caregiver
const changePasswordCaregiver = async (req, res) => {
    try {

        const { error } = caregiverValidation.changePasswordCaregiverSchema.validate(req.body, { abortEarly: false });
        
        if (error) {
            return res.status(400).json({ message: error.details.map(err => err.message) });
        }
        
        const { oldPassword, newPassword } = req.body;

    
        const caregiverId = req.user._id;
        const caregiver = await caregiverModel.findById(caregiverId);

        if (!caregiver) {
            return res.status(404).json({ message: "Caregiver not found" });
        }

        const isMatch = await bcrypt.compare(oldPassword, caregiver.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect old password" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        caregiver.password = hashedPassword;
        caregiver.changedPasswordAt=Date.now()
        await caregiver.save();

        res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("Error during password change:", error);
        res.status(500).json({ message: error.message });
    }
};
// API endpoint for forget Password Caregiver
const forgetPasswordCaregiver = async (req, res, next) => {
    const { caregiverEmail } = req.body;
    
    try {
        const { error } = caregiverValidation.caregiverForgotPasswordSchema.validate(req.body, { abortEarly: false });
        
       if (error) {
        return res.status(400).json({ message: error.details.map(err => err.message) });
       }


      const caregiver = await caregiverModel.findOne({ caregiverEmail });
      if (!caregiver) {
        return res.status(400).json({ message: 'Caregiver not found' });
      }
  
      const otp = customAlphabet('0123456789', 4)(); 
      const hashOtp = await bcrypt.hash(otp, parseInt(process.env.SALT_ROUND));
  
      await caregiverModel.updateOne(
        { caregiverEmail },
        { otpPassword: hashOtp, otpCreatedAt: Date.now() }
      );
  
      const emailSent = await sendNotification(
        caregiverEmail,
        'Password Reset',
        emailTemplate(
          '🔒 Reset Password',
          caregiver.caregiverName,
          `
          <p>We received a request to reset the password for your account. Use the code below to reset your password:</p>
          <div class="otp-box">${otp}</div>
          <p>If you didn’t request this, please ignore this email or contact support if you have any concerns.</p>
          <p>Best regards,<br>The Relief Team</p>`
        )
      );
  
      if (emailSent) {
        return res.status(200).json({ message: 'OTP sent to your email' });
      } else {
        return res.status(500).json({ message: 'Error sending OTP email' });
      }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// API endpoint for reset Password Caregiver
const resetPasswordCaregiver = async (req, res, next) => {
    const { caregiverEmail, otp, newPassword } = req.body;
    
    try {

      const { error } = caregiverValidation.caregiverResetPasswordSchema.validate(req.body, { abortEarly: false });
        
      if (error) {
        return res.status(400).json({ message: error.details.map(err => err.message) });
      }
      const caregiver = await caregiverModel.findOne({ caregiverEmail });
      if (!caregiver) {
        return res.status(400).json({ message: 'Caregiver not found' });
      }
  
      const otpValid = await bcrypt.compare(otp, caregiver.otpPassword);
      if (!otpValid) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }
  
      const otpAge = Date.now() - new Date(caregiver.otpCreatedAt).getTime();
      const otpExpiryTime = 2 * 60 * 1000; 
  
      if (otpAge > otpExpiryTime) {
        return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
      }
  
 
      const hashedPassword = await bcrypt.hash(newPassword, parseInt(process.env.SALT_ROUND));
      await caregiverModel.updateOne(
        { caregiverEmail },
        { password: hashedPassword, $unset: { otpPassword: 0, otpCreatedAt: 0 } } 
      );
  
      return res.status(200).json({ message: 'Password has been reset successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// API endpoint to display All Caregivers
const displayAllCaregivers=async function(req, res) {
    try {
      
        const caregivers = await caregiverModel.find();
        res.status(200).json({message:"Done",caregivers});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}; 
// API endpoint to display Caregivers Avaliable
const displayAvaliableCaregivers = async (req, res) => {
    try {
        const caregivers = await caregiverModel.find({ availability: true  });
        res.status(200).json({message:"Done",caregivers});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
// API endpoint to display Caregivers Nearby Patient
const getNearCaregivers = async (req, res) => {
    const user = req.user
    const coordinates = [user.location.coordinates[0], user.location.coordinates[1]]
    const maxDistance = 1 * req.query.km * 1000 
    const caregiver = await caregiverModel.find({
        location: {
            $near: {
                $geometry: {
                    type: "Point",
                    coordinates: [coordinates[0], coordinates[1]],
                },
                $maxDistance: maxDistance,
            },
        },
    })
    res.status(200).json({
        results: caregiver.length,
        caregiver,
    })
}

// API endpoint to get Requests For Caregiver With Role(public-specific)
const getPendingRequestsForCaregiverWithRole = async (req, res) => {
    try {
        const caregiverId = req.user._id;
     
        const requestsFromSpecificRequestModel = await specificRequestModel.find({ caregiver: caregiverId, status: 'pending' }).populate('patient');
        const requestsFromPublicRequestModel = await publicRequestModel.find({ status: 'pending' }).populate('patient');
        const filteredPublicRequests = requestsFromPublicRequestModel.filter(publicRequest =>
            publicRequest.caregivers.includes(caregiverId)
        );
        res.json({message:"Done",allRequests:{specificRequests:requestsFromSpecificRequestModel,publicRequests:filteredPublicRequests}});
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
};

// API endpoint to display Caregivers By Rating
const displayCaregiversByRating = async (req, res) => {
    try {
        const caregivers = await caregiverModel.find({ availability: true }).sort({ averageRating: -1 });
        res.json({message:"Done",caregivers});
    } catch (error) {
        console.error("Error fetching caregivers:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// API endpoint to get Rating Messages For Caregiver
const getRatingMessagesForCaregiver = async (req, res) => {
    try {
        const caregiverId = req.params.caregiverId;
        const requestsFromSpecificRequestModel = await specificRequestModel.find({ caregiver: caregiverId }).populate('patient caregiver')
        const requestsFromPublicRequestModel = await publicRequestModel.find({ caregiver: caregiverId }).populate('patient caregiver')
        
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
       
        res.status(500).json({ message:error.message });
    }
};

// API endpoint to get Caregiver ById
const getCaregiverById = async (req, res) => {
    try {
        const { caregiverId } = req.params;

        let caregiver = await caregiverModel.findById(caregiverId);
        if (!caregiver) {
            return res.status(404).json({ message: 'Caregiver not found' });
        }
        res.status(200).json({ message: 'Done', caregiver });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// API endpoint to get Approved Requests For Caregiver
const getApprovedRequestsForCaregiver = async (req, res) => {
    try {
        const caregiverId = req.user._id;

        const requestsFromSpecificRequestModel = await specificRequestModel.find({ caregiver: caregiverId });

        const requestsFromPublicRequestModel = await publicRequestModel.find({ caregiver: caregiverId });

        const combinedRequests = [...requestsFromSpecificRequestModel, ...requestsFromPublicRequestModel];

        const approvedRequests = combinedRequests.filter(request => request.status === 'approved');

        res.status(200).json({message:"Done",Requests:approvedRequests});
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
};
// API endpoint for get All Caregivers Match Disease From Patient HealthRecord With Caregiver Biography
const MatchDiseaseFromPatientHealthRecordWithCaregiverBiography=async (req, res) => {
    try {
        const patientId  = req.user._id;
        
        const patient = await patientModel.findById(patientId);
        if (!patient) {
            return res.status(404).json({ message: 'Patient not found' });
        }
        const caregivers = await caregiverModel.find();

        
        const patientDiseases = patient.healthRecord.diseases;

        const matchingCaregivers = caregivers
            .map(caregiver => {
                const caregiverDiseases = caregiver.extractedDetails.diseases;
                const commonDiseases = patientDiseases.filter(disease => caregiverDiseases.includes(disease));
                if (commonDiseases.length > 0) {
                    return {
                        caregiver,
                        commonDiseases
                    };
                }
                return null;
            })
            .filter(caregiverData => caregiverData !== null);

        res.status(200).json({ message:"Done",Caregivers:matchingCaregivers });

    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}









module.exports = {signUp,signIn,updateProfileCaregiver,changePasswordCaregiver,forgetPasswordCaregiver,resetPasswordCaregiver,displayAllCaregivers,displayAvaliableCaregivers,getNearCaregivers,getPendingRequestsForCaregiverWithRole,displayCaregiversByRating,getRatingMessagesForCaregiver,getCaregiverById,getApprovedRequestsForCaregiver,MatchDiseaseFromPatientHealthRecordWithCaregiverBiography}; 




