const express=require("express")
const bodyParser = require("body-parser")
const cors=require("cors")
const xss=require("xss-clean")
const helmet=require("helmet")
require("dotenv").config()
const app = express();
app.set('view engine', 'ejs');
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:false}))
const DB_connect=require('./Database/connectionDB')
const patientRouter = require("./Routes/patientRoutes")
const caregiverRouter = require("./Routes/caregiverRoutes")
const specificRequestRouter = require("./Routes/specificRequestRoutes")
const publicRequestRouter = require("./Routes/publicRequestRoutes")
const { default: rateLimit } = require("express-rate-limit")
DB_connect()
const limiter=rateLimit({
    windowMs:60*1000,
    limit:5,
    handler:(req,res,next)=>{
        res.status(429).json({message:"Game Over,Too Many Requeste.."})
    }
})
app.use(helmet({
    contentSecurityPolicy:false,
    frameguard:false
}))
app.use(cors())
app.use(xss())
app.use(limiter)
app.use('/api/V1/patient',patientRouter)
app.use('/api/V1/caregiver',caregiverRouter)
app.use('/api/V1/specificRequest',specificRequestRouter)
app.use('/api/V1/publicRequest',publicRequestRouter)

app.get('/', (req, res) => {
    res.status(200).json({message:"Welcome To Relief App ❤️"});
});
app.get('/payment/:requestId', (req, res) => {
    res.render('payment', { requestId: req.params.requestId });

})
app.get("/success", (req, res) => {
    res.render("success", { message: "Payment Successful" });
});
app.get("/cancel", (req, res) => {
    res.render("cancel", { message: "Payment Canceled" });
});
app.use('*', (req, res) => {
    res.status(404).json({message:"Page Not Found!"});
})
app.listen(process.env.PORT||8000,()=>{
    console.log('Server is Running on Port 8000..')
})