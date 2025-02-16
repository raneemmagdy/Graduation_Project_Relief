const express=require("express")
const specificRequestController=require('../controllers/specificRequestController')
const authenticate = require("../middleware/authentication")

const specificRequestRouter=express.Router()
module.exports=specificRequestRouter

specificRequestRouter.post('/:caregiverId',authenticate,specificRequestController.createSpecificRequest)
specificRequestRouter.patch('/approve/:requestId', authenticate, specificRequestController.approveSpecificRequest);
specificRequestRouter.patch('/reject/:requestId', authenticate, specificRequestController.rejectSpecificRequest);
specificRequestRouter.post('/rate/:requestId',authenticate,specificRequestController.makeRatingForSpecificRequest )
specificRequestRouter.post('/payment/:requestId',specificRequestController.createPaymentForSpecialRequest);
specificRequestRouter.delete('/delete/:requestId', authenticate, specificRequestController.deleteSpecificRequest);

