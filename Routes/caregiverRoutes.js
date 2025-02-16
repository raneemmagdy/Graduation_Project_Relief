const express=require("express")
const caregivercontroller=require("../controllers/caregiverController")
const multerHost = require("../middleware/multerMiddleware");
const authenticate = require("../middleware/authentication");


const caregiverRouter=express.Router()
module.exports=caregiverRouter

caregiverRouter.post('/signup',multerHost.multerHost(multerHost.formatOptions.image).single('caregiverProfilePhoto'),caregivercontroller.signUp)
caregiverRouter.post('/signin',caregivercontroller.signIn)
caregiverRouter.put('/profile',authenticate,multerHost.multerHost(multerHost.formatOptions.image).single('caregiverProfilePhoto'),caregivercontroller.updateProfileCaregiver)
caregiverRouter.put('/changePassword',authenticate,caregivercontroller.changePasswordCaregiver)
caregiverRouter.post("/forgot-password",caregivercontroller.forgetPasswordCaregiver);
caregiverRouter.post("/reset-password", caregivercontroller.resetPasswordCaregiver);
caregiverRouter.get("/", caregivercontroller.displayAllCaregivers);
caregiverRouter.get("/available", caregivercontroller.displayAvaliableCaregivers);
caregiverRouter.get("/nearbyCaregivers",authenticate,caregivercontroller.getNearCaregivers)
caregiverRouter.get('/pendingRequest',authenticate,caregivercontroller.getPendingRequestsForCaregiverWithRole);
caregiverRouter.get("/caregiverWithSortedRate",caregivercontroller.displayCaregiversByRating)
caregiverRouter.get("/RatingMessages/:caregiverId",caregivercontroller.getRatingMessagesForCaregiver)
caregiverRouter.get('/approvedRequest',authenticate,caregivercontroller.getApprovedRequestsForCaregiver);
caregiverRouter.get('/matchDisease',authenticate,caregivercontroller.MatchDiseaseFromPatientHealthRecordWithCaregiverBiography);
caregiverRouter.get("/:caregiverId",caregivercontroller.getCaregiverById)


