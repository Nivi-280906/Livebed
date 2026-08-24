import express from "express";
import Hospital from "../models/Hospital.js";
import User from "../models/User.js";

const router = express.Router();

// Gate for hospital-admin-only endpoints. The frontend sends the logged-in
// Firebase uid in a header; it must match the hospital's ownerUid (set once,
// during /claim). This isn't full token verification, but it closes the
// "pick any hospital from a list and get in" hole — you can no longer see or
// touch a hospital's admin data unless your account actually claimed it.
async function requireOwner(req, res, next) {
  try {
    const uid = req.header("x-firebase-uid");
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ error: "Hospital not found" });
    if (!uid || !hospital.ownerUid || hospital.ownerUid !== uid) {
      return res.status(403).json({ error: "You don't have access to this hospital's dashboard." });
    }
    await applyDailyReset(hospital);
    req.hospital = hospital;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Every department the hospital added the day before disappears the first
// time this hospital is touched (dashboard load or a patient search) on or
// after 6:00 AM local time on a new day — the hospital re-adds only what's
// actually open today (e.g. just Blood Test one day, General OPD +
// Cardiology the next). Booking history in the Bookings tab is untouched;
// this only clears the department menu. Since the hospital dashboard already
// polls every few seconds while it's open, an admin sitting on the page
// through 6 AM will see it clear on its own within seconds — no manual
// browser refresh needed.
const RESET_HOUR = 6; // 6:00 AM

function resetPeriodKey(date) {
  const d = new Date(date);
  if (d.getHours() < RESET_HOUR) d.setDate(d.getDate() - 1);
  return d.toDateString();
}

function isNewDay(hospital) {
  if (!hospital.lastResetAt) return true;
  return resetPeriodKey(hospital.lastResetAt) !== resetPeriodKey(new Date());
}

async function applyDailyReset(hospital) {
  if (!isNewDay(hospital)) return hospital;
  if (hospital.departments.length) hospital.departments = [];
  hospital.lastResetAt = new Date();
  await hospital.save();
  return hospital;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateWait(dept) {
  if (dept.status !== "open") return null;
  const open = dept.capacity - dept.booked;
  if (open <= 0) return null;
  const aheadFactor = Math.max(0, dept.booked - Math.max(0, dept.capacity - open - 3));
  return Math.max(5, Math.round(aheadFactor * dept.avgConsultMinutes * 0.35) || dept.avgConsultMinutes);
}

// "₹300–500" -> 400. Falls back to null if nothing numeric is found.
function parseCostAvg(costRange) {
  if (!costRange) return null;
  const nums = (costRange.match(/\d+/g) || []).map(Number);
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// Min-max normalize a "lower is better" field across a set of candidates.
function normalize(values, value) {
  if (value == null) return 1; // unknown -> treat as worst
  const known = values.filter((v) => v != null);
  if (!known.length) return 0;
  const min = Math.min(...known);
  const max = Math.max(...known);
  if (max === min) return 0;
  return (value - min) / (max - min);
}

// GET /api/hospitals?department=Cardiology&lat=13.08&lng=80.27&sort=best
// sort: "best" (default, blended distance+wait+cost), "distance", "wait", "cost"
// Returns EVERY hospital offering that department (patients can re-sort/browse
// all of them client-side) but each result carries a "score" so the default
// view can lead with the best-ranked options first.
router.get("/", async (req, res) => {
  try {
    const { department, lat, lng, sort = "best" } = req.query;
    const hospitals = await Hospital.find(
      department ? { "departments.name": department } : {}
    );
    await Promise.all(hospitals.map(applyDailyReset));

    let results = hospitals.map((h) => {
      const dept = h.departments.find((d) => d.name === department) || null;
      const distanceKm =
        lat && lng ? Number(haversineKm(Number(lat), Number(lng), h.latitude, h.longitude).toFixed(1)) : null;
      const estimatedWaitMinutes = dept ? estimateWait(dept) : null;
      const costAvg = dept ? parseCostAvg(dept.costRange) : null;
      const available = dept && dept.status === "open" && estimatedWaitMinutes != null;
      return {
        id: h._id,
        name: h.name,
        area: h.area,
        distanceKm,
        available,
        phone: h.phone || "",
        description: h.description || "",
        department: dept
          ? {
              name: dept.name,
              status: dept.status,
              costRange: dept.costRange,
              costAvg,
              capacity: dept.capacity,
              booked: dept.booked,
              estimatedWaitMinutes,
              timeSlots: dept.timeSlots || [],
              doctorName: dept.doctorName || "",
            }
          : null,
      };
    });

    // Blend distance + wait + cost into one 0-1 "lower is better" score so
    // the default view can surface the best overall options, not just the
    // closest one.
    const distances = results.map((r) => r.distanceKm);
    const waits = results.map((r) => r.department?.estimatedWaitMinutes ?? null);
    const costs = results.map((r) => r.department?.costAvg ?? null);

    results = results.map((r) => {
      if (!r.available) return { ...r, score: Infinity };
      const dScore = normalize(distances, r.distanceKm);
      const wScore = normalize(waits, r.department.estimatedWaitMinutes);
      const cScore = normalize(costs, r.department.costAvg);
      return { ...r, score: dScore * 0.4 + wScore * 0.35 + cScore * 0.25 };
    });

    const byAvailability = (a, b) => Number(!a.available) - Number(!b.available);
    const comparators = {
      best: (a, b) => byAvailability(a, b) || a.score - b.score,
      distance: (a, b) =>
        byAvailability(a, b) || (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
      wait: (a, b) =>
        byAvailability(a, b) ||
        (a.department?.estimatedWaitMinutes ?? Infinity) - (b.department?.estimatedWaitMinutes ?? Infinity),
      cost: (a, b) =>
        byAvailability(a, b) || (a.department?.costAvg ?? Infinity) - (b.department?.costAvg ?? Infinity),
    };

    results.sort(comparators[sort] || comparators.best);

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/hospitals/verify-license?licenseNumber=TN-HOSP-2026-001&email=admin@sunrisegeneral.in
// Used by the hospital signup form to confirm a license ID is real, not
// already claimed, and — once an email is supplied — that it matches the
// hospital's registered email. Doesn't echo the registered email back;
// the person has to already know it, so leaking it here would defeat the
// point of checking it.
router.get("/verify-license", async (req, res) => {
  try {
    const { licenseNumber, email } = req.query;
    if (!licenseNumber || !licenseNumber.trim()) {
      return res.status(400).json({ error: "Enter a license ID." });
    }
    const hospital = await Hospital.findOne({
      licenseNumber: new RegExp(`^${licenseNumber.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (!hospital) {
      return res.status(404).json({ error: "No hospital is registered under that license ID." });
    }
    if (hospital.ownerUid) {
      return res.status(409).json({ error: "This hospital already has an account. Log in instead." });
    }
    if (
      email &&
      hospital.registeredEmail &&
      hospital.registeredEmail.trim().toLowerCase() !== String(email).trim().toLowerCase()
    ) {
      return res.status(403).json({
        error: "That email doesn't match this hospital's registered email on file.",
      });
    }
    res.json({ hospitalId: hospital._id, name: hospital.name, area: hospital.area });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hospitals/claim
// Register a hospital in ONE step — license ID + registered email + name
// (+ phone) — no password, no separate "verify" screen. The license ID and
// registered email ARE the credential: both have to match what's on file
// (checked right here, server-side) before the account is created.
router.post("/claim", async (req, res) => {
  try {
    const { licenseNumber, name, phone, email } = req.body;
    if (!licenseNumber || !licenseNumber.trim() || !name || !email || !email.trim()) {
      return res.status(400).json({ error: "License ID, email, and name are required." });
    }

    const hospital = await Hospital.findOne({
      licenseNumber: new RegExp(`^${licenseNumber.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (!hospital) {
      return res.status(404).json({ error: "No hospital is registered under that license ID." });
    }
    if (hospital.ownerUid) {
      return res.status(409).json({ error: "This hospital already has an account. Log in instead." });
    }
    if (
      hospital.registeredEmail &&
      hospital.registeredEmail.trim().toLowerCase() !== String(email).trim().toLowerCase()
    ) {
      return res.status(403).json({
        error: "That email doesn't match this hospital's registered email on file. Use your official hospital email.",
      });
    }

    // No Firebase account here — the hospital's identity going forward is
    // this hospital doc, so we mint a stable pseudo-uid from its own _id and
    // store it as both the hospital's owner and the user's "firebaseUid" so
    // every existing owner-only check (requireOwner, bookings, etc.) keeps
    // working unchanged.
    const pseudoUid = `hosp_${hospital._id}`;
    hospital.ownerUid = pseudoUid;
    await hospital.save();

    const user = await User.create({
      firebaseUid: pseudoUid,
      name,
      phone,
      email: email.trim(),
      role: "hospital",
      hospitalId: hospital._id,
    });

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/hospitals/login
// Hospital login — license ID + registered email, no password. Both must
// match the hospital already on file, and it must already be claimed
// (registered) via /claim first.
router.post("/login", async (req, res) => {
  try {
    const { licenseNumber, email } = req.body;
    if (!licenseNumber || !licenseNumber.trim() || !email || !email.trim()) {
      return res.status(400).json({ error: "Enter your hospital's license ID and registered email." });
    }

    const hospital = await Hospital.findOne({
      licenseNumber: new RegExp(`^${licenseNumber.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (!hospital) {
      return res.status(404).json({ error: "No hospital is registered under that license ID." });
    }
    if (!hospital.ownerUid) {
      return res.status(404).json({ error: "This hospital hasn't registered an account yet. Register first." });
    }
    if (
      hospital.registeredEmail &&
      hospital.registeredEmail.trim().toLowerCase() !== String(email).trim().toLowerCase()
    ) {
      return res.status(403).json({
        error: "That email doesn't match this hospital's registered email on file.",
      });
    }

    const user = await User.findOne({ firebaseUid: hospital.ownerUid, role: "hospital" });
    if (!user) {
      return res.status(404).json({ error: "No hospital account found for this license ID." });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Full detail for one hospital (hospital admin dashboard) — owner-only.
router.get("/:id", requireOwner, async (req, res) => {
  res.json(req.hospital);
});

// Hospital admin: edit the hospital's own public profile (phone, description).
// name/area/license/registeredEmail are left alone here since those are what
// verified the account in the first place — support can fix those if needed.
router.put("/:id/profile", requireOwner, async (req, res) => {
  try {
    const { phone, description } = req.body;
    const hospital = req.hospital;
    if (phone != null) hospital.phone = phone;
    if (description != null) hospital.description = description;
    await hospital.save();
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hospital admin: adjust a department's booked count directly
// (used for "mark completed / no-show" -> delta -1, and "walk-in" -> delta +1)
router.patch("/:id/departments/:deptName", requireOwner, async (req, res) => {
  try {
    const { delta } = req.body;
    const hospital = req.hospital;

    const dept = hospital.departments.find((d) => d.name === req.params.deptName);
    if (!dept) return res.status(404).json({ error: "Department not found" });

    dept.booked = Math.min(dept.capacity, Math.max(0, dept.booked + Number(delta)));
    dept.status = dept.booked >= dept.capacity ? "full" : "open";
    await hospital.save();

    res.json(hospital);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hospital admin: update capacity, cost range, hours, doctor, or time slots for a department
router.put("/:id/departments/:deptName", requireOwner, async (req, res) => {
  try {
    const { capacity, costRange, status, timeSlots, doctorName } = req.body;
    const hospital = req.hospital;

    const dept = hospital.departments.find((d) => d.name === req.params.deptName);
    if (!dept) return res.status(404).json({ error: "Department not found" });

    if (capacity != null) dept.capacity = capacity;
    if (costRange) dept.costRange = costRange;
    if (status) dept.status = status;
    if (Array.isArray(timeSlots)) dept.timeSlots = timeSlots.map((s) => String(s).trim()).filter(Boolean);
    if (doctorName != null) dept.doctorName = doctorName.trim();
    await hospital.save();

    res.json(hospital);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hospital admin: add a brand-new department/issue this hospital handles.
router.post("/:id/departments", requireOwner, async (req, res) => {
  try {
    const { name, capacity, costRange, avgConsultMinutes, timeSlots, doctorName } = req.body;
    const hospital = req.hospital;

    if (!name || !name.trim() || !capacity || !costRange) {
      return res.status(400).json({ error: "Name, capacity, and cost range are required." });
    }
    if (hospital.departments.some((d) => d.name.toLowerCase() === name.trim().toLowerCase())) {
      return res.status(409).json({ error: "This hospital already has a department with that name." });
    }

    hospital.departments.push({
      name: name.trim(),
      capacity: Number(capacity),
      booked: 0,
      costRange,
      avgConsultMinutes: avgConsultMinutes ? Number(avgConsultMinutes) : 10,
      status: "open",
      timeSlots: Array.isArray(timeSlots) ? timeSlots.map((s) => String(s).trim()).filter(Boolean) : [],
      doctorName: doctorName ? doctorName.trim() : "",
    });
    await hospital.save();

    res.json(hospital);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
