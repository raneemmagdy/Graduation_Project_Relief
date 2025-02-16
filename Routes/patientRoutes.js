const express=require("express")
const patientcontroller=require("../controllers/patientController")
const multerHost = require("../middleware/multerMiddleware");
const authenticate = require("../middleware/authentication");

const patientRouter=express.Router()
module.exports=patientRouter

patientRouter.post('/signup',multerHost.multerHost(multerHost.formatOptions.image).single('patientProfilePhoto'),patientcontroller.signUp)
patientRouter.post('/signin',patientcontroller.signIn)
patientRouter.put('/profile',authenticate,multerHost.multerHost(multerHost.formatOptions.image).single('patientProfilePhoto'),patientcontroller.updateProfilePatient)
patientRouter.put('/changePassword',authenticate,patientcontroller.changePasswordPatient)
patientRouter.post("/forgot-password",patientcontroller.forgetPassword);
patientRouter.post("/reset-password", patientcontroller.resetPassword);
patientRouter.get("/requests",authenticate,patientcontroller.getAllApprovedRequestsForPatient)
patientRouter.get("/RatingMessages/:patientId",patientcontroller.getAllRatingMessagesForPateint)
patientRouter.get("/RatingMessagesForSpecificCaregiver/:caregiverId",authenticate,patientcontroller.getAllRatingAndRatingMessagesFromPatientToSpecificCaregiver)
patientRouter.get("/:patientId",patientcontroller.getPatientById)







