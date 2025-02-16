const mongoose = require("mongoose");

const specificRequestSchema = new mongoose.Schema({
  role: { type: String, default: "specific" },

  appointmentDateTime: {
    day: { type: Number, required: true },
    month: { type: Number, required: true },

    hours: { type: Number, required: true },
    minutes: { type: Number, required: true },
  },
  determineThePeriodOfService: {
    amount: { type: Number, required: true },
    unit: { type: String, enum: ["day", "month"], required: true },
  },

  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Patient",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending",
  },
  caregiver: { type: mongoose.Schema.Types.ObjectId, ref: "Caregiver" },
 
  rating: { type: Number, min: 0, max: 5 },
  ratingMessage: { type: String, required: false }
});

const specificRequestModel =  mongoose.model('specificRequest', specificRequestSchema)

module.exports=specificRequestModel