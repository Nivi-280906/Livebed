import mongoose from "mongoose";

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // "General OPD", "Cardiology", "Blood Test", "X-Ray"
    capacity: { type: Number, required: true },
    booked: { type: Number, default: 0 },
    costRange: { type: String, required: true }, // e.g. "₹300–500"
    avgConsultMinutes: { type: Number, default: 10 },
    status: { type: String, enum: ["open", "full", "closed"], default: "open" },
    // Slots the hospital offers this department in, e.g. ["09:00–12:00", "14:00–17:00"].
    // Purely informational for now (shown to patients) — booking doesn't pick
    // a specific slot yet, capacity/booked still track overall load.
    timeSlots: { type: [String], default: [] },
    // Which doctor handles this department — shown to patients searching.
    doctorName: { type: String, default: "" },
  },
  { _id: false }
);

const hospitalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    area: { type: String, required: true },
    licenseNumber: { type: String, default: "" },
    // Official registered email for this hospital (e.g. from the license
    // registry). The person claiming this hospital's admin account must
    // sign up with this exact email — a license ID alone isn't enough,
    // since it could be visible on a certificate/signboard.
    registeredEmail: { type: String, default: "" },
    // Public-facing profile details, editable from the hospital dashboard.
    phone: { type: String, default: "" },
    description: { type: String, default: "" },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    departments: [departmentSchema],
    // Firebase uid of the hospital manager/CEO who has claimed this hospital's
    // admin account. Null until someone signs up with the matching license
    // number — that's what gates access to this hospital's dashboard.
    ownerUid: { type: String, default: null, index: true },
    // When departments' booked counts were last zeroed out for a fresh day.
    // Checked (and auto-updated) on dashboard load and on patient search —
    // see applyDailyReset in routes/hospitals.js.
    lastResetAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model("Hospital", hospitalSchema);
