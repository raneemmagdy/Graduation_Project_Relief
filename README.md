# 🌟 Relief - A Support System for Patients & Caregivers

Relief is a web application that connects patients with caregivers and facilitates public & specific assistance requests. It supports secure authentication, messaging, notifications, and seamless online payments via Stripe.

 **Live Demo**: [Relief on Vercel](https://graduation-project-relief.vercel.app)  
 **Postman Docs**: [API Documentation](https://documenter.getpostman.com/view/26311189/2sAYXEEdKw)  
 **Hugging Face API**: [AI Model](https://RaneemElmahdi-relief-model-api.hf.space)


##  Features
-  User Authentication (JWT, bcrypt, email verification)
-  Role-Based Access (Patients, Caregivers)
-  Request System (Public & Specific requests)
-  Secure Payment Gateway (Stripe)
-  Email & SMS Notifications (Nodemailer, Infobip)
-  Rate Limiting & Security (Helmet, XSS Clean, CORS)
-  Database: MongoDB (ODM:Mongoose)


##  Tech Stack

### Backend
- **Node.js**  + **Express.js** 
- **MongoDB** & **Mongoose** 
- **JWT Authentication** 
- **Stripe** for Payments 
- **Infobip** for SMS Notifications
- **Nodemailer** for Emails 

### Frontend (For Future Implementation)
- **EJS** 🌟 for Server-Side Views


##  Installation & Setup

```bash
# Clone the repository
git clone https://github.com/raneemmagdy/Graduation_Project_Relief.git

# Navigate into the project
cd Graduation_Project_Relief

# Install dependencies
npm install

# Create the .env file and add the required environment variables

# Run the local server
npm run dev
```

##  Environment Variables
Ensure you set up your `.env` file with the following:

```ini
PORT=8000
SMS_API_KEY=your-sms-api-key
MONGO_DB_URL=your-mongodb-url
CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-password
STRIPE_SECRET_KEY=your-stripe-secret-key
SALT_ROUND=your-salt-round
JWT_SECRET_PATIENT=your-jwt-secret-patient
JWT_SECRET_CAREGIVER=your-jwt-secret-caregiver
PREFIX_PATIENT=Patient
PREFIX_CAREGIVER=Caregiver
```

##  API Endpoints

### Patient Or Caregiver Authentication
| Method | Endpoint | Description |
|--------|----------------------------|------------------|
| POST | `/api/V1/auth/signup` | Register a new Patient Or Caregiver |
| POST | `/api/V1/auth/signin` | Patient Or Caregiver login |
| PUT | `/api/V1/profile` | update Patient Or Caregiver profile |

### Requests & Payment
| Method | Endpoint | Description |
|--------|----------------------------------|----------------------------------|
| POST | `/api/V1/publicRequest/reject/:requestId` | reject a public request |
| GET | `/api/V1/publicRequest/approve/:requestId` | approve a public requests |
| POST | `/api/V1/publicRequest/rate/:requestId` | rate a public requests |

_For a full list of endpoints and usage examples, check out the [Postman Docs](https://documenter.getpostman.com/view/26311189/2sAYXEEdKw)._ 🚀

##  Payment Integration
The Relief app allows Patients to make secure payments via Stripe.

### Navigate to the payment page:
```bash
http://localhost:8000/payment/:requestId
```
Click **"Pay Now"** to initiate the Stripe checkout.
- Upon success, Patients are redirected to `/success`, or `/cancel` if they abort.

##  Notifications
- **Emails:** Sent via Nodemailer for registration, password reset.
- **SMS:** Handled via Infobip for urgent notifications.

##  Security & Performance
-  JWT Authentication for secure access.
-  Rate Limiting (Max 5 requests per minute).
-  Helmet & XSS-Clean for enhanced security.



 Built by the Relief Team 
