const Joi = require('joi');
const generalRules  = require('../utils/generalRules');

const caregiverValidationSchema = Joi.object({
    caregiverProfilePhoto: Joi.object({
        public_id: Joi.string(),
        secure_url: Joi.string().uri()
    }),
    caregiverName: Joi.string().min(3).max(20).required().messages({
        'string.min': 'Caregiver name must be at least 3 characters long.',
        'string.max': 'Caregiver name cannot exceed 20 characters.',
        'any.required': 'Caregiver name is required.'
    }),
    caregiverEmail: generalRules.email.required(),
    password: generalRules.password.required(),
    cPassword:generalRules.password.valid(Joi.ref('password')).required().messages({
        'any.only': 'Confirm password must match the password.',
        'any.required': 'Confirm password is required.',
        'string.pattern.base': 'Password must be at least 8 characters, contain at least one letter, one number, and one special character.',
        'any.required': 'Password is required.'
      }),
    dateOfBirth: Joi.date().required().messages({
        'any.required': 'Date of birth is required.',
        'date.base': 'Invalid date format.'
    }),
    phone: Joi.string().regex(/^01[0125][0-9]{8}$/).messages({
        'string.pattern.base': 'Phone number must be an Egyptian number and start with 010, 011, 012, or 015 followed by 8 digits.',
        'any.required': 'Phone number is required.'
    }).required(),
    gender: Joi.string().valid('female','male').required().messages({
        'any.only': 'Gender must be either male or female.',
        'any.required': 'Gender is required.'
    }),
    availability: Joi.boolean().messages({
        'boolean.base': 'Availability must be a boolean value.'
    }),
    doYouSmoke: Joi.string().valid('yes', 'no').required().messages({
        'any.only': 'doYouSmoke Must be either yes or no.',
        'any.required': 'Smoking status is required.'
    }),
    canYouDrive: Joi.string().valid('yes', 'no').required().messages({
        'any.only': 'canYouDrive Must be either yes or no.',
        'any.required': 'Driving ability status is required.'
    }),
    biography: Joi.string().required().messages({
        'any.required': 'Biography is required.'
    }),
    extractedDetails: Joi.object({
        diseases: Joi.array().items(Joi.string())
    }).messages({
        'object.base': 'Extracted details must be an object.'
    }),
    longitude: Joi.number().required(),
    latitude: Joi.number().required(),
    availabilityEndDate: Joi.date().messages({
        'date.base': 'Invalid date format for availability end date.'
    }),
});
const changePasswordCaregiverSchema = Joi.object({
    
    oldPassword: generalRules.password.required(),
    newPassword:  generalRules.password.required(),
    cNewPassword: generalRules.password.valid(Joi.ref('newPassword')).required().messages({
        'any.only': 'Confirm password must match the password.',
        'any.required': 'Confirm password is required.',
        'string.pattern.base': 'Password must be at least 8 characters, contain at least one letter, one number, and one special character.',
        'any.required': 'Password is required.'
      })
  
});
const updateProfileCaregiverSchema = Joi.object({
    caregiverProfilePhoto: Joi.object({
        public_id: Joi.string(),
        secure_url: Joi.string().uri()
    }),
    caregiverName: Joi.string().min(3).max(20).messages({
        'string.min': 'Caregiver name must be at least 3 characters long.',
        'string.max': 'Caregiver name cannot exceed 20 characters.'
    }),
  
    dateOfBirth: Joi.date().messages({
        'any.required': 'Date of birth is required.',
        'date.base': 'Invalid date format.'
    }),
    phone: Joi.string().regex(/^01[0125][0-9]{8}$/).messages({
        'string.pattern.base': 'Phone number must be an Egyptian number and start with 010, 011, 012, or 015 followed by 8 digits.',
    }),
    gender: Joi.string().valid('female','male').messages({
        'any.only': 'Gender must be either male or female.'
    }),
    availability: Joi.boolean().messages({
        'boolean.base': 'Availability must be a boolean value.'
    }),
    doYouSmoke: Joi.string().valid('yes', 'no').messages({
        'any.only': 'doYouSmoke Must be either yes or no.',
        
    }),
    canYouDrive: Joi.string().valid('yes', 'no').messages({
        'any.only': 'canYouDrive Must be either yes or no.',
       
    }),
    biography: Joi.string().messages({
        'any.required': 'Biography is required.'
    }),
    extractedDetails: Joi.object({
        diseases: Joi.array().items(Joi.string())
    }).messages({
        'object.base': 'Extracted details must be an object.'
    }),
    longitude: Joi.number(),
    latitude: Joi.number(),
    availabilityEndDate: Joi.date().messages({
        'date.base': 'Invalid date format for availability end date.'
    }),
});
const caregiverSignInValidationSchema = Joi.object({
   
    caregiverEmail:generalRules.email.required(),
    password:  generalRules.password.required()
   
});

const caregiverForgotPasswordSchema = Joi.object({
    caregiverEmail:generalRules.email.required()
});

const caregiverResetPasswordSchema = Joi.object({
  caregiverEmail:generalRules.email.required(),
  otp: Joi.string().length(4).required().messages({
    "string.length": "OTP must be 4 digits",
    "any.required": "OTP is required",
  }),
  newPassword:  generalRules.password.required(),
  cNewPassword: generalRules.password.valid(Joi.ref('newPassword')).required().messages({
    'any.only': 'Confirm password must match the password.',
    'any.required': 'Confirm password is required.',
    'string.pattern.base': 'Password must be at least 8 characters, contain at least one letter, one number, and one special character.',
    'any.required': 'Password is required.'
  })
});



module.exports = {caregiverValidationSchema,caregiverSignInValidationSchema,updateProfileCaregiverSchema,changePasswordCaregiverSchema,caregiverForgotPasswordSchema,caregiverResetPasswordSchema};
