import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    patientUid: {
      type: String,
      required: true,
    },

    patientName: {
      type: String,
      required: true,
    },

    patientAge: {
      type: Number,
      default: null,
    },

    patientGender: {
      type: String,
      default: "",
    },

    patientPhone: {
      type: String,
      default: "",
    },

    patientVillage: {
      type: String,
      default: "",
    },

    relation: {
      type: String,
      default: "Self",
    },

    bookedByName: {
      type: String,
      default: "",
    },

    symptom: {
      type: String,
      default: "",
    },

    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      required: true,
    },

    department: {
      type: String,
      required: true,
    },

    /*
     * REAL APPOINTMENT DATA
     *
     * These are different from createdAt / updatedAt.
     *
     * createdAt = when booking was made
     * updatedAt = when booking/status changed
     *
     * appointmentDate = date patient selected
     * appointmentStart = selected slot start
     * appointmentEnd = selected slot end
     */
    appointmentDate: {
      type: Date,
      required: true,
    },

    appointmentStart: {
      type: String,
      required: true,
    },

    appointmentEnd: {
      type: String,
      required: true,
    },

    estimatedWaitMinutes: {
      type: Number,
    },

    source: {
      type: String,
      enum: ["online", "walk-in"],
      default: "online",
    },

    status: {
      type: String,
      enum: [
        "waiting",
        "in-progress",
        "completed",
        "no-show",
        "cancelled",
      ],
      default: "waiting",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model(
  "Booking",
  bookingSchema
);