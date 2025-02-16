const express=require("express")
const publicRequestController=require('../controllers/publicRequestController')
const authenticate = require("../middleware/authentication")
const publicRequestRouter=express.Router()
module.exports=publicRequestRouter
publicRequestRouter.post('/',authenticate,publicRequestController.createPublicRequest)
publicRequestRouter.patch('/approve/:requestId', authenticate, publicRequestController.approvePublicRequest);
publicRequestRouter.patch('/reject/:requestId', authenticate, publicRequestController.rejectPublicRequest);
publicRequestRouter.post('/rate/:requestId',authenticate,publicRequestController.makeRatingForPubicRequest )
publicRequestRouter.post('/payment/:requestId',publicRequestController.createPaymentForPublicRequest);
publicRequestRouter.delete('/:requestId', authenticate, publicRequestController.deletePublicRequest);


