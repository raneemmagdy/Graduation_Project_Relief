const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const caregiverModel = require('../models/caregiverSchema');
const pateintModel = require('../models/PatientSchema');
const publicRequestModel = require('../models/publicRequestSchema');
const sendNotification = require('../services/notificationSender');
const sendSMS = require('../services/Send_SMS');
const { emailTemplate } = require('../utils/email_templete');
const publicRequestValidation=require('../validation/publicRequestValidation');
const { calculatePrice } = require('./specificRequestController');

// API endpoint for create public Request
const createPublicRequest = async (req, res) => {
    try {
         const { error } = publicRequestValidation.publicRequestValidationSchema.validate(req.body, { abortEarly: false });
                
         if (error) {
                    return res.status(400).json({ message: error.details.map(err => err.message) });
         }
        const {
            HowManyPeopleAreYouArrangingCareFor,
            HowManyWeeksOfCareAreRequired,
            WhenWouldYouLikeTheCareToStart,
            DoesThePropertyHaveAPrivateBedroomForTheCarer,
            DoYouHaveAnyPreferenceOnTheGenderOfTheirCarer,
            WouldYouAcceptACarerWhoSmokes,
            DoYouNeedACarerThatCanDrive,
            determineThePeriodOfService,
            appointmentDateTime
        } = req.body;

        const { day, month, hours, minutes } = appointmentDateTime;
        const appointmentDate = new Date();
        appointmentDate.setDate(day);
        appointmentDate.setMonth(month - 1); 
        appointmentDate.setHours(hours);
        appointmentDate.setMinutes(minutes);
        appointmentDate.setSeconds(0);
        appointmentDate.setMilliseconds(0);

        const currentDate = new Date();
        if (appointmentDate <= currentDate) {
            return res.status(400).json({ message: "Appointment date must be in the future" });
        }

       
        const patient = await pateintModel.findById(req.user._id);
        if (!patient) {
            return res.status(404).json({ message: "User not found" });
        }

        
        const newRequest = new publicRequestModel({
            HowManyPeopleAreYouArrangingCareFor,
            HowManyWeeksOfCareAreRequired,
            WhenWouldYouLikeTheCareToStart,
            DoesThePropertyHaveAPrivateBedroomForTheCarer,
            DoYouHaveAnyPreferenceOnTheGenderOfTheirCarer,
            WouldYouAcceptACarerWhoSmokes,
            DoYouNeedACarerThatCanDrive,
            determineThePeriodOfService,
            appointmentDateTime,
            patient: req.user._id, 
        });

        
        await newRequest.save();

        const caregiverCriteria = { availability: true };

        if (DoYouHaveAnyPreferenceOnTheGenderOfTheirCarer !== 'no preference') {
            caregiverCriteria.gender = DoYouHaveAnyPreferenceOnTheGenderOfTheirCarer.toLowerCase();
        }

        if (WouldYouAcceptACarerWhoSmokes.toLowerCase() === 'no') {
            caregiverCriteria.doYouSmoke = { $in: ['no', 'false'] };
        } else if (WouldYouAcceptACarerWhoSmokes.toLowerCase() === 'yes') {
            caregiverCriteria.doYouSmoke = { $in: ['yes', 'true'] };
        }

        if (DoYouNeedACarerThatCanDrive.toLowerCase() === 'yes') {
            caregiverCriteria.canYouDrive = { $in: ['yes', 'true'] };
        } else if (DoYouNeedACarerThatCanDrive.toLowerCase() === 'no') {
            caregiverCriteria.canYouDrive = { $in: ['no', 'false'] };
        }

        const caregivers = await caregiverModel.find(caregiverCriteria);

        newRequest.caregivers = caregivers.map(caregiver => caregiver._id);
        await newRequest.save();

        const populatedRequest = await publicRequestModel
            .findById(newRequest._id)
            .populate('patient')
            .populate('caregivers') 
            
        res.status(201).json({message:"Request created successfully",request:populatedRequest});
    } catch (error) {
        res.status(500).json({ message: error.message });

    }
};


// API endpoint for approve pubic Request
const approvePublicRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const caregiverId = req.user._id;

        const publicRequest = await publicRequestModel.findById(requestId).populate('patient caregiver');
        if (!publicRequest) {
            return res.status(404).json({ message: "Request not found" });
        }
        if (publicRequest.status === 'approved') {
            return res.status(400).json({ message: "Request has already been approved" });
        }
        if (publicRequest.status === 'rejected') {
            return res.status(400).json({ message: "Request has already been rejected and cannot be approved" });
        }
        if (!publicRequest.caregivers.includes(caregiverId)) {
            return res.status(403).json({ message: "You are not authorized to approve this request" });
        }

        const caregiver = await caregiverModel.findById(caregiverId);
        if (!caregiver) {
            return res.status(404).json({ message: "Caregiver not found" });
        }
        if (!caregiver.availability) {
            return res.status(400).json({ message: "Caregiver is not available" });
        }

       
        if (!publicRequest.appointmentDateTime) {
            return res.status(400).json({ message: "Appointment date is missing" });
        }

        publicRequest.status = 'approved';

        publicRequest.caregiver = caregiverId;

        await publicRequest.save();
        await publicRequestModel.updateOne({ _id: requestId }, { $unset: { caregivers: 1 } });

        const appointmentDateTime = new Date(
            new Date().getFullYear(),
            publicRequest.appointmentDateTime.month - 1,
            publicRequest.appointmentDateTime.day,
            publicRequest.appointmentDateTime.hours,
            publicRequest.appointmentDateTime.minutes
        );

        let endDateTime = new Date(appointmentDateTime);
        if (publicRequest.determineThePeriodOfService.unit === 'day') {
            endDateTime.setDate(appointmentDateTime.getDate() + publicRequest.determineThePeriodOfService.amount);
        } else if (publicRequest.determineThePeriodOfService.unit === 'month') {
            endDateTime.setMonth(appointmentDateTime.getMonth() + publicRequest.determineThePeriodOfService.amount);
        }
         console.log(endDateTime);
         
        caregiver.availability = false;
        caregiver.availabilityEndDate = endDateTime;
        await caregiver.save();
      
        const delay = endDateTime.getTime() - Date.now();
        setTimeout(async () => {
            const updatedCaregiver = await caregiverModel.findById(caregiverId);
            updatedCaregiver.availability = true;
            updatedCaregiver.availabilityEndDate = null;
            await updatedCaregiver.save();
        }, delay);

        // Send notifications
        await sendNotification(publicRequest.patient.patientEmail, 'Request Approved',
            emailTemplate('Request Approved', publicRequest.patient.patientName, 'Your request has been approved! (Patient)'));
        await sendNotification(caregiver.caregiverEmail, 'Request Approved',
            emailTemplate('Request Approved', caregiver.caregiverName, `You accepted the request from ${publicRequest.patient.patientName}! (Caregiver)`));
        await sendSMS(process.env.SMS_API_KEY, 'Relief', '+2' + publicRequest.patient.phone, 'Your request has been approved! (Patient)');
        await sendSMS(process.env.SMS_API_KEY, 'Relief', '+2' + caregiver.phone, `You accepted the request from ${publicRequest.patient.patientName}! (Caregiver)`);

        
        const reminderTime = new Date(appointmentDateTime.getTime() - 5 * 60000);
        if (Date.now() < reminderTime.getTime()) {
            setTimeout(async () => {
                await sendNotification(publicRequest.patient.patientEmail, 'Appointment Reminder',
                    emailTemplate('Appointment Reminder', publicRequest.patient.patientName, 'Your appointment is starting soon! (Patient)'));
                await sendNotification(caregiver.caregiverEmail, 'Appointment Reminder',
                    emailTemplate('Appointment Reminder', caregiver.caregiverName, 'Your appointment is starting soon! (Caregiver)'));
                await sendSMS(process.env.SMS_API_KEY, 'Relief', '+2' + publicRequest.patient.phone, 'Your appointment is starting soon! (Patient)');
                await sendSMS(process.env.SMS_API_KEY, 'Relief', '+2' + caregiver.phone, 'Your appointment is starting soon! (Caregiver)');
            }, reminderTime.getTime() - Date.now());
        } else {
            await sendNotification(publicRequest.patient.patientEmail, 'Appointment Reminder',
                emailTemplate('Appointment Reminder', publicRequest.patient.patientName, 'Your appointment is starting soon! (Patient)'));
            await sendNotification(caregiver.caregiverEmail, 'Appointment Reminder',
                emailTemplate('Appointment Reminder', caregiver.caregiverName, 'Your appointment is starting soon! (Caregiver)'));
            await sendSMS(process.env.SMS_API_KEY, 'Relief', '+2' + publicRequest.patient.phone, 'Your appointment is starting soon! (Patient)');
            await sendSMS(process.env.SMS_API_KEY, 'Relief', '+2' + caregiver.phone, 'Your appointment is starting soon! (Caregiver)');
        }

        res.status(200).json({ message: "Request approved successfully", publicRequest });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


// API endpoint for reject pubic Request
const rejectPublicRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const caregiverId = req.user._id;

       
        const publicRequest = await publicRequestModel.findById(requestId).populate('patient');
        if (!publicRequest) {
            return res.status(404).json({ message: "Request not found" });
        }
        
        if (!publicRequest.caregivers.includes(caregiverId)) {
            return res.status(403).json({ message: "You are not authorized to reject this request" });
        }
        if (publicRequest.status === 'rejected') {
            return res.status(400).json({ message: "Request has already been rejected" });
        }
        if (publicRequest.status === 'approved') {
            return res.status(400).json({ message: "Request has already been approved and cannot be rejected" });
        }

        
        publicRequest.caregivers = publicRequest.caregivers.filter(id => id.toString() !== caregiverId.toString());
       
        if (publicRequest.caregivers.length === 0) {
            publicRequest.status = 'rejected';
          
        }

        await publicRequest.save();

        await sendNotification(publicRequest.patient.patientEmail, 'Request Rejected', emailTemplate('Request Rejected',publicRequest.patient.patientName,'Your request has been rejected.(Patient)'));
        await sendSMS(process.env.SMS_API_KEY, 'Relief', '+2' + publicRequest.patient.phone,'Your request has been rejected.(Patient)');
        res.status(200).json({ message: "Request rejected successfully" ,publicRequest});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


// API endpoint to make rating for poblic Request
const makeRatingForPubicRequest=async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const patientId = req.user._id;
    
        const { rating,ratingMessage } = req.body;
    
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }
        const publicRequest = await publicRequestModel.findById(requestId).populate('patient caregiver');
        if (!publicRequest) {
            return res.status(404).json({ message: "Request not found" });
        } 
        if (publicRequest.status !== 'approved') {
            return res.status(400).json({ message: "Cannot rate a request that is not approved" });
        }
        if (publicRequest.patient._id.toString() !== patientId.toString()) {
          return res.status(403).json({ message: "You are not authorized to rate this request" });
        }
        if (publicRequest.rating) {
            return res.status(400).json({ message: "Request has already been rated" });
        }

        publicRequest.rating = rating;
        publicRequest.ratingMessage=ratingMessage
        await publicRequest.save();

    
        const caregiver = await caregiverModel.findById(publicRequest.caregiver._id);
        if (!caregiver) {
            return res.status(404).json({ message: "Caregiver not found" });
        }

        caregiver.ratings.push(rating);      
        caregiver.averageRating = caregiver.ratings.reduce((acc, curr) => acc + curr, 0) / caregiver.ratings.length;
        await caregiver.save();
        res.status(200).json({ message: "Rating submitted successfully",publicRequest});
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}


// API endpoint to create Payment For Public Request
const createPaymentForPublicRequest = async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const publicRequest = await publicRequestModel.findById(requestId);

        if (!publicRequest) {
            return res.status(404).json({ error: 'Request not found' });
        }
        if (publicRequest.status !== 'approved') {
            return res.status(400).json({ error: 'Request is not approved' });
        }

        if (!publicRequest.determineThePeriodOfService) {
            return res.status(400).json({ error: 'Service period not defined' });
        }

        const periods = Array.isArray(publicRequest.determineThePeriodOfService)
            ? publicRequest.determineThePeriodOfService
            : [publicRequest.determineThePeriodOfService];

        const price = calculatePrice(periods);

        if (price <= 0) {
            return res.status(400).json({ error: 'Invalid payment amount' });
        }

        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'gbp',
                        product_data: {
                            name: 'Special Service Payment',
                            description: 'Payment for approved special request',
                        },
                        unit_amount: price * 100, 
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${req.protocol}://${req.get('host')}/success`,
            cancel_url: `${req.protocol}://${req.get('host')}/cancel`,
            metadata: { requestId: requestId },
        });

        res.status(201).json({ success: true, sessionId: session.id });

    } catch (error) {
        res.status(500).json({ message:error.message });
    }
};


// API endpoint to Delete Public Request By Owner (Patient)
const deletePublicRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id; 
        const publicRequest = await publicRequestModel.findById(requestId);
        if (!publicRequest) {
            return res.status(404).json({ message: "Public request not found" });
        }
        if (publicRequest.patient.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Unauthorized: You can only delete your own public request" });
        }
        await publicRequestModel.findByIdAndDelete(requestId);
        res.status(200).json({ message: "Public request deleted successfully" });

    } catch (error) {
        res.status(500).json({ message:  error.message });
    }
};
module.exports={createPublicRequest,approvePublicRequest,rejectPublicRequest,makeRatingForPubicRequest,createPaymentForPublicRequest,deletePublicRequest}