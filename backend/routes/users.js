import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Called right after Firebase signup/login to create or fetch the matching
// MongoDB profile. The frontend sends the Firebase uid + basic details.
router.post("/sync", async (req, res) => {
  try {
    const { firebaseUid, name, phone, email, role } = req.body;
    if (!firebaseUid || !email) {
      return res.status(400).json({ error: "firebaseUid and email are required" });
    }
    let user = await User.findOne({ firebaseUid });
    if (!user) {
      // role is only honored on first creation (e.g. "patient" from the
      // patient signup form) — an existing user's role is never overwritten
      // by a later sync call.
      const initialRole = role === "patient" ? "patient" : null;
      user = await User.create({ firebaseUid, name, phone, email, role: initialRole });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Called once, right after the user picks "Patient" or "Hospital" on signup
router.post("/:firebaseUid/role", async (req, res) => {
  try {
    const { role, hospitalId } = req.body;
    if (!["patient", "hospital"].includes(role)) {
      return res.status(400).json({ error: "role must be 'patient' or 'hospital'" });
    }
    const user = await User.findOneAndUpdate(
      { firebaseUid: req.params.firebaseUid },
      { role, hospitalId: hospitalId || null },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Called from the Profile page to save/update patient details (name, phone,
// date of birth, gender, village, address). These are stored once and sent
// automatically with every booking so the hospital knows who's coming.
router.put("/:firebaseUid/profile", async (req, res) => {
  try {
    const { name, phone, dateOfBirth, gender, village, address } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (phone !== undefined) update.phone = phone;
    if (dateOfBirth !== undefined) update.dateOfBirth = dateOfBirth;
    if (gender !== undefined) update.gender = gender;
    if (village !== undefined) update.village = village;
    if (address !== undefined) update.address = address;

    const user = await User.findOneAndUpdate(
      { firebaseUid: req.params.firebaseUid },
      update,
      { new: true }
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:firebaseUid", async (req, res) => {
  try {
    const user = await User.findOne({ firebaseUid: req.params.firebaseUid });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
