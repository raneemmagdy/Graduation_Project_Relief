const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const caregiverModel = require("../models/caregiverSchema");
const patientModel = require("../models/PatientSchema");
const specificRequestModel = require("../models/specificRequestSchema");
const sendNotification = require("../services/notificationSender");
const sendSMS = require("../services/Send_SMS");
const { emailTemplate } = require("../utils/email_templete");
const specificRequestValidation=require('../validation/specificRequestValidation')

// API endpoint for create Specific Request
const createSpecificRequest = async (req, res) => {
    try {
        const caregiverId = req.params.caregiverId;
        const { appointmentDateTime, determineThePeriodOfService } = req.body;
        const { error } = specificRequestValidation.specificRequestSchema.validate(req.body, { abortEarly: false });
        
        if (error) {
            return res.status(400).json({ message: error.details.map(err => err.message) });
        }

        const { month, day, hours, minutes } = appointmentDateTime;
        const { amount, unit } = determineThePeriodOfService;

        const appointmentDate = new Date(new Date().getFullYear(), month - 1, day, hours, minutes);

        if (appointmentDate < new Date()) {
            return res.status(400).json({ message: "Appointment date must be in the future" });
        }

        const patient = await patientModel.findById(req.user._id);
        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        const caregiver = await caregiverModel.findById(caregiverId);
        if (!caregiver) {
            return res.status(404).json({ message: "Caregiver not found" });
        }

        const newRequest = new specificRequestModel({
            appointmentDateTime: { month, day, hours, minutes },
            determineThePeriodOfService: { amount, unit },
            patient: req.user._id,
            caregiver: caregiverId,
            status: "pending",
            role: "specific"
        });

        await newRequest.save();
        const populatedRequest = await specificRequestModel.findById(newRequest._id)
            .populate("patient")
            .populate("caregiver");

        res.status(201).json({
            message: "Specific request created successfully",
            request: populatedRequest
        });
    } catch (error) {
     
        res.status(500).json({ message: error.message });

    }
};

// API endpoint for approve Specific Request
const approveSpecificRequest = async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const caregiverId = req.user._id;

       
        const specificRequest = await specificRequestModel.findById(requestId)
            .populate('patient caregiver');
     
        
        if (!specificRequest) {
            return res.status(404).json({ message: "Request not found" });
        }

        if (specificRequest.status === 'approved') {
            return res.status(400).json({ message: "Request has already been approved" });
        }

        if (specificRequest.status === 'rejected') {
            return res.status(400).json({ message: "Request has already been rejected and cannot be approved" });
        }

        if (String(specificRequest.caregiver._id) !== String(caregiverId)) {
            return res.status(403).json({ message: "You are not authorized to approve this request" });
        }

        const caregiver = specificRequest.caregiver;
        if (!caregiver) {
            return res.status(404).json({ message: "Caregiver not found" });
        }

        if (!caregiver.availability) {
            return res.status(400).json({ message: "Caregiver is not available" });
        }

        
        specificRequest.status = 'approved';
        await specificRequest.save();

        
        const appointmentDateTime = new Date(
            new Date().getFullYear(),
            specificRequest.appointmentDateTime.month - 1,
            specificRequest.appointmentDateTime.day,
            specificRequest.appointmentDateTime.hours,
            specificRequest.appointmentDateTime.minutes
        );

        let endDateTime = new Date(appointmentDateTime);
        if (specificRequest.determineThePeriodOfService.unit === 'day') {
            endDateTime.setDate(appointmentDateTime.getDate() + specificRequest.determineThePeriodOfService.amount);
        } else if (specificRequest.determineThePeriodOfService.unit === 'month') {
            endDateTime.setMonth(appointmentDateTime.getMonth() + specificRequest.determineThePeriodOfService.amount);
        }

        caregiver.availability = false;
        caregiver.availabilityEndDate = endDateTime;
        await caregiver.save();

        
        const delay = endDateTime.getTime() - Date.now();
        setTimeout(async () => {
            caregiver.availability = true;
            caregiver.availabilityEndDate = null;
            await caregiver.save();
        }, delay);

    
        res.status(200).json({message: "Request approved successfully",specificRequest});

        // Notifications
        await sendNotification(specificRequest.patient.patientEmail, 'Request Approved', emailTemplate('Request Approved',specificRequest.patient.patientName,'Your request has been approved! (Patient)'));
        await sendNotification(specificRequest.caregiver.caregiverEmail, 'Request Approved', emailTemplate('Request Approved',specificRequest.caregiver.caregiverName,`You accepted the request from ${specificRequest.patient.patientName}! (Caregiver)`));
        await sendSMS(process.env.SMS_API_KEY, 'Relief', '+2' + specificRequest.patient.phone, 'Your request has been approved! (Patient)');
        await sendSMS(process.env.SMS_API_KEY, 'Relief', '+2' + caregiver.phone, `You accepted the request from ${specificRequest.patient.patientName}! (Caregiver)`);

      
        const reminderTime = new Date(appointmentDateTime.getTime() - 5 * 60000);
        if (Date.now() < reminderTime.getTime()) {
            setTimeout(async () => {
                await sendNotification(specificRequest.patient.patientEmail, 'Appointment Reminder',emailTemplate('Appointment Reminder',specificRequest.patient.patientName, 'Your appointment is starting soon! (Patient)'));
                await sendNotification(caregiver.caregiverEmail, 'Appointment Reminder', emailTemplate('Appointment Reminder',specificRequest.caregiver.caregiverName,'Your appointment is starting soon! (Caregiver)'));
                await sendSMS(process.env.SMS_API_KEY, 'Relief', '+2' + specificRequest.patient.phone, 'Your appointment is starting soon! (Patient)');
                await sendSMS(process.env.SMS_API_KEY, 'Relief', '+2' + caregiver.phone, 'Your appointment is starting soon! (Caregiver)');
            }, reminderTime.getTime() - Date.now());
        } else {
            await sendNotification(specificRequest.patient.patientEmail, 'Appointment Reminder',emailTemplate('Appointment Reminder',specificRequest.patient.patientName, 'Your appointment is starting soon! (Patient)'));
            await sendNotification(caregiver.caregiverEmail, 'Appointment Reminder', emailTemplate('Appointment Reminder',specificRequest.caregiver.caregiverName,'Your appointment is starting soon! (Caregiver)'));
            await sendSMS(process.env.SMS_API_KEY, 'Relief', '+2' + specificRequest.patient.phone, 'Your appointment is starting soon! (Patient)');
            await sendSMS(process.env.SMS_API_KEY, 'Relief', '+2' + caregiver.phone, 'Your appointment is starting soon! (Caregiver)');
        }

    } catch (error) {
       
        res.status(500).json({ message:error.message });
    }
};

// API endpoint for reject Specific Request
const rejectSpecificRequest = async (req, res) => {
    try {
      const requestId = req.params.requestId;
      const caregiverId = req.user._id; 
  
      const specificRequest = await specificRequestModel.findById(requestId).populate('patient caregiver');
      if (!specificRequest) {
        return res.status(404).json({ message: "Request not found" });
      }
  
      if (specificRequest.status === 'approved') {
        return res.status(400).json({ message: "Request has already been approved and cannot be rejected" });
      }
      if (specificRequest.status === 'rejected') {
        return res.status(400).json({ message: "Request has already been rejected" });
      }
  
      if (String(specificRequest.caregiver._id) !== String(caregiverId)) {
        return res.status(403).json({ message: "You are not authorized to reject this request" });
      }
  
      specificRequest.status = 'rejected';
  
      await specificRequest.save();
  
      const caregiver = await caregiverModel.findById(caregiverId);
      if (!caregiver) {
        return res.status(404).json({ message: "Caregiver not found" });
      }
  
    
        res.status(200).json({ message: "Request rejected successfully" ,specificRequest});
        await sendNotification(specificRequest.patient.patientEmail, 'Request Rejected', emailTemplate('Request Rejected',specificRequest.patient.patientName,'Your request has been rejected.(Patient)'));
        await sendNotification(specificRequest.caregiver.caregiverEmail, 'Request Rejected', emailTemplate('Request Rejected',specificRequest.caregiver.caregiverName, `You rejected the request from ${specificRequest.patient.patientName}.(Caregiver)`));
        await sendSMS(process.env.SMS_API_KEY, 'Relief', '+2' + specificRequest.patient.phone,'Your request has been rejected.(Patient)');
        await sendSMS(process.env.SMS_API_KEY, 'Relief', '+2' + caregiver.phone,  `You rejected the request from ${specificRequest.patient.patientName}.(Caregiver)`);

    } catch (error) {
    
      res.status(500).json({ message: error.message });
    }
};

// API endpoint to make rating for specific Request
const makeRatingForSpecificRequest=async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const patientId = req.user._id;

        
        const { rating,ratingMessage } = req.body;
        if (rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }
        const specificRequest = await specificRequestModel.findById(requestId).populate('patient caregiver');
        if (!specificRequest) {
            return res.status(404).json({ message: "Request not found" });
        }
        if (specificRequest.status !== 'approved') {
            return res.status(400).json({ message: "Cannot rate a request that is not approved" });
        }

        if (specificRequest.patient._id.toString() !== patientId.toString()) {
            return res.status(403).json({ message: "You are not authorized to rate this request" });
        }
        if (specificRequest.rating) {
            return res.status(400).json({ message: "Request has already been rated" });
        }

        specificRequest.rating = rating;
        specificRequest.ratingMessage=ratingMessage
        await specificRequest.save();

        const caregiver = await caregiverModel.findById(specificRequest.caregiver._id);
        if (!caregiver) {
            return res.status(404).json({ message: "Caregiver not found" });
        }

        caregiver.ratings.push(rating);         
        caregiver.averageRating = caregiver.ratings.reduce((acc, curr) => acc + curr, 0) / caregiver.ratings.length;
        await caregiver.save();

        res.status(200).json({ message: "Rating submitted successfully",specificRequest});
    } catch (error) {
        res.status(500).json({ message: error.message});
    }
}

// API endpoint to create Payment For Special Request
const calculatePrice = (periods) => {
    let totalPrice = 0;
    periods.forEach(period => {
        if (period.unit === 'day') {
            totalPrice += period.amount * 200;
        } else if (period.unit === 'month') {
            totalPrice += period.amount * 2000;
        }
    });

    return totalPrice;
};

// API endpoint to create Payment For specific Request
const createPaymentForSpecialRequest = async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const specificRequest = await specificRequestModel.findById(requestId);

        if (!specificRequest) {
            return res.status(404).json({ error: 'Request not found' });
        }
        if (specificRequest.status !== 'approved') {
            return res.status(400).json({ error: 'Request is not approved' });
        }

        if (!specificRequest.determineThePeriodOfService) {
            return res.status(400).json({ error: 'Service period not defined' });
        }

        const periods = Array.isArray(specificRequest.determineThePeriodOfService)
            ? specificRequest.determineThePeriodOfService
            : [specificRequest.determineThePeriodOfService];

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

// API endpoint to Delete spicific Request By Owner (Patient)
const deleteSpecificRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const userId = req.user._id; 
        const specificRequest = await specificRequestModel.findById(requestId);
        if (!specificRequest) {
            return res.status(404).json({ message: "specific request not found" });
        }
        if (specificRequest.patient.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Unauthorized: You can only delete your own specific request" });
        }
        await specificRequestModel.findByIdAndDelete(requestId);
        res.status(200).json({ message: "specific request deleted successfully" });

    } catch (error) {
        res.status(500).json({ message:  error.message });
    }
};

module.exports={createSpecificRequest,approveSpecificRequest,rejectSpecificRequest,makeRatingForSpecificRequest,createPaymentForSpecialRequest,calculatePrice,deleteSpecificRequest}
