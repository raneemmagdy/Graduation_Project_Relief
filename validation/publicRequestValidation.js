const Joi = require('joi');

const publicRequestValidationSchema = Joi.object({
    role: Joi.string().valid('public').default('public'),
    HowManyPeopleAreYouArrangingCareFor: Joi.number().valid(1, 2).required(),
    HowManyWeeksOfCareAreRequired: Joi.string().valid('1-3 weeks', '4-8 weeks', 'ongoing').required(),
    WhenWouldYouLikeTheCareToStart: Joi.string().valid('Immediately', 'within a week', '1-3 month').required(),
    DoesThePropertyHaveAPrivateBedroomForTheCarer: Joi.string().valid('yes', 'no').required(),
    DoYouHaveAnyPreferenceOnTheGenderOfTheirCarer: Joi.string().valid('male', 'female', 'no preference').required(),
    WouldYouAcceptACarerWhoSmokes: Joi.string().valid('yes', 'no').required(),
    DoYouNeedACarerThatCanDrive: Joi.string().valid('yes', 'no').required(),
    determineThePeriodOfService: Joi.object({
        amount: Joi.number().required(),
        unit: Joi.string().valid('day', 'month').required()
    }).required(),
    appointmentDateTime: Joi.object({
        day: Joi.number().required(),
        month: Joi.number().required(),
        hours: Joi.number().min(0).max(23).required(),
        minutes: Joi.number().min(0).max(59).required()
    }).required(),
    status: Joi.string().valid('pending', 'approved', 'rejected').default('pending')
});

module.exports = {publicRequestValidationSchema};
