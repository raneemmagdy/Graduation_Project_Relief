const Joi = require("joi");

const specificRequestSchema = Joi.object({
  appointmentDateTime: Joi.object({
    month: Joi.number().integer().min(1).max(12).required(),
    day: Joi.number().integer().min(1).max(31).required(),
    hours: Joi.number().integer().min(0).max(23).required(),
    minutes: Joi.number().integer().min(0).max(59).required(),
  }).required(),

  determineThePeriodOfService: Joi.object({
    amount: Joi.number().integer().min(1).required(),
    unit: Joi.string().valid("day", "month").required(),
  }).required(),
});

module.exports = { specificRequestSchema };
