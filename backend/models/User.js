import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    phone: { type: String },
    email: { type: String, required: true },
    role: { type: String, enum: ["patient", "hospital"], default: null },
    // patient profile details — collected once, sent automatically with
    // every booking so hospitals know who's coming
    dateOfBirth: { type: String, default: "" }, // stored as YYYY-MM-DD
    gender: { type: String, enum: ["male", "female", "other", ""], default: "" },
    village: { type: String, default: "" },
    address: { type: String, default: "" },
    // only set when role === "hospital" — links this login to a hospital doc
    hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
