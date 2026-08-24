// backend/scripts/resetHospitalAccount.js
// Fully resets ONE hospital back to its just-seeded, unclaimed state:
// removes the claimed account (ownerUid + the matching User doc), clears
// every department, deletes that hospital's bookings, and clears the
// profile fields (phone/description). The hospital's name/license/email
// stay intact so you can register it again from scratch.
//
// Usage:
//   node scripts/resetHospitalAccount.js TN-HOSP-2026-010
import "dotenv/config";
import { connectDB } from "../config/db.js";
import Hospital from "../models/Hospital.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import mongoose from "mongoose";

async function run() {
  const licenseNumber = process.argv[2];
  if (!licenseNumber) {
    console.error("Usage: node scripts/resetHospitalAccount.js <licenseNumber>");
    process.exit(1);
  }

  await connectDB();

  const hospital = await Hospital.findOne({
    licenseNumber: new RegExp(`^${licenseNumber.trim()}$`, "i"),
  });
  if (!hospital) {
    console.error(`No hospital found with license ${licenseNumber}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const deletedBookings = await Booking.deleteMany({ hospitalId: hospital._id });
  const deletedUsers = await User.deleteMany({ hospitalId: hospital._id });

  hospital.ownerUid = null;
  hospital.departments = [];
  hospital.phone = "";
  hospital.description = "";
  hospital.lastResetAt = new Date();
  await hospital.save();

  console.log(`Reset "${hospital.name}" (${hospital.licenseNumber}):`);
  console.log(`  - removed account (ownerUid cleared)`);
  console.log(`  - deleted ${deletedUsers.deletedCount} user record(s)`);
  console.log(`  - deleted ${deletedBookings.deletedCount} booking(s)`);
  console.log(`  - cleared all departments and profile fields`);
  console.log(`You can now Register this hospital again as if it were brand new.`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});