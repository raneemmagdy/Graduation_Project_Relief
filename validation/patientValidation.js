const Joi = require('joi');
const generalRules = require('../utils/generalRules');

const patientValidationSchema = Joi.object({
    patientProfilePhoto: Joi.object({
        public_id: Joi.string(),
        secure_url: Joi.string().uri()
    }),
    patientName: Joi.string().min(3).max(20).required().messages({
        'string.min': 'Name must be at least 3 characters.',
        'string.max': 'Name must not exceed 20 characters.',
        'any.required': 'Name is required.'
    }),
    patientEmail:generalRules.email.required(),
    password: generalRules.password.required(),
    cPassword:generalRules.password.valid(Joi.ref('password')).required().messages({
        'any.only': 'Confirm password must match the password.',
        'any.required': 'Confirm password is required.'
    }),
    dateOfBirth: Joi.date().required().messages({
        'any.required': 'Date of birth is required.',
        'date.base': '"dateOfBirth" must be a valid date'
    }),
    phone: Joi.string().regex(/^01[0125][0-9]{8}$/).required().messages({
        'string.pattern.base': 'Phone number must be an Egyptian number starting with 010, 011, 012, or 015 followed by 8 digits.',
        'any.required': 'Phone number is required.'
    }),
    healthRecordText: Joi.string().required().messages({
        'string.empty': '"healthRecordText" is not allowed to be empty'
    }),
    healthRecord: Joi.object({
        medicines: Joi.array().items(Joi.string()),
        diseases: Joi.array().items(Joi.string())
    }),
    gender: Joi.string().valid('male', 'female').required().messages({
        'any.only': 'Gender must be either male or female.',
        'any.required': 'Gender is required.'
    }),
    longitude: Joi.number().required(),
    latitude: Joi.number().required(),
})
const updateProfilePatientSchema = Joi.object({
    patientProfilePhoto: Joi.object({
        public_id: Joi.string(),
        secure_url: Joi.string().uri()
    }),
    patientName: Joi.string().min(3).max(20).messages({
        'string.min': 'Name must be at least 3 characters.',
        'string.max': 'Name must not exceed 20 characters.'
    }),

    dateOfBirth: Joi.date().messages({
        'date.base': '"dateOfBirth" must be a valid date'
    }),
    phone: Joi.string().regex(/^01[0125][0-9]{8}$/).messages({
        'string.pattern.base': 'Phone number must be an Egyptian number starting with 010, 011, 012, or 015 followed by 8 digits.',
    }),
    healthRecordText: Joi.string(),
    healthRecord: Joi.object({
        medicines: Joi.array().items(Joi.string()),
        diseases: Joi.array().items(Joi.string())
    }),
    gender: Joi.string().valid('male', 'female').messages({
        'any.only': 'Gender must be either male or female.',
    }),
    longitude: Joi.number(),
    latitude: Joi.number(),
})
const patientSignInValidationSchema= Joi.object(
    {
        patientEmail:generalRules.email.required(),
        password: generalRules.password.required()
})
const changePasswordPatientSchema= Joi.object(
    {
        
        oldPassword:generalRules.password.required(),
        newPassword: generalRules.password.required(),
        cNewPassword:generalRules.password.valid(Joi.ref('newPassword')).required().messages({
            'any.only': 'Confirm password must match the password.',
            'any.required': 'Confirm password is required.'
        })
})

const patientForgotPasswordSchema = Joi.object({
    patientEmail: generalRules.email.required()
});

const patientResetPasswordSchema = Joi.object({
  patientEmail: generalRules.email.required(),
  otp: Joi.string().length(4).required().messages({
    "string.length": "OTP must be 4 digits",
    "any.required": "OTP is required",
  }),
  newPassword: generalRules.password.required(),
  cNewPassword:generalRules.password.valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Confirm password must match the password.',
    'any.required': 'Confirm password is required.',
    'string.pattern.base': 'Password must be at least 8 characters, contain at least one letter, one number, and one special character.',
    'any.required': 'Password is required.'
  })
});

module.exports = {patientValidationSchema,patientSignInValidationSchema,updateProfilePatientSchema,changePasswordPatientSchema,patientResetPasswordSchema,patientForgotPasswordSchema};
