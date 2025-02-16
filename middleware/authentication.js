const jwt = require("jsonwebtoken");
const caregiverModel = require("../models/caregiverSchema");
const patientModel = require("../models/PatientSchema");

const authenticate = async (req, res, next) => {
    try {
        const Authorization = req.header("Authorization");
        const [prefix, token] = Authorization.split(' ');
    
        if (!prefix || !token) {
            return res.status(401).json({ message: "Unauthorized: Token or prefix missing" });
        }
        let secretKey;
        if (prefix === process.env.PREFIX_PATIENT) {
            secretKey = process.env.JWT_SECRET_PATIENT;
        } else if (prefix === process.env.PREFIX_CAREGIVER) {
            secretKey = process.env.JWT_SECRET_CAREGIVER;
        } else {
            return res.status(401).json({ message: "Unauthorized: Invalid prefix" });
        }

        const decoded = jwt.verify(token, secretKey);
       
        
        if (!decoded.id) {
            throw new Error("Invalid token: User ID not found");
        }

        const user = prefix === process.env.PREFIX_PATIENT
            ? await patientModel.findById(decoded.id)
            : await caregiverModel.findById(decoded.id);

        if (!user) {
            throw new Error("Invalid token: User not found");
        }
        if(parseInt(user?.changedPasswordAt?.getTime()/1000) > decoded.iat){
            return res.status(400).json({ message: `Token has expired. Please log in again.`});

        }

        req.user = user; 
        next();
    } catch (error) {
        return res.status(401).json({ message: `Authentication error: ${error.message}`});
    }
};

module.exports = authenticate;
