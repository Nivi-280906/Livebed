// Synthetic hospital dataset — realistic but fictional, for testing and
// demoing without needing a real hospital's data or permission.
import "dotenv/config";
import { connectDB } from "../config/db.js";
import Hospital from "../models/Hospital.js";
import mongoose from "mongoose";

function dept(name, capacity, booked, costRange, avgConsultMinutes) {
  return {
    name,
    capacity,
    booked,
    costRange,
    avgConsultMinutes,
    status: booked >= capacity ? "full" : "open",
  };
}

// Hospitals now start with an EMPTY department list — each hospital admin
// adds their own departments (name, capacity, cost range, time slots) one by
// one from the dashboard after registering, instead of the platform
// pre-filling fake ones for them. Only name/area/license/email/location are
// seeded here; keep `dept(...)` above around if you want to hand-populate
// one hospital for a quick demo.
const hospitals = [
  {
    name: "Sunrise General Hospital",
    area: "Anna Nagar, Chennai",
    licenseNumber: "TN-HOSP-2026-001",
    registeredEmail: "admin@sunrisegeneral.in",
    latitude: 13.0850,
    longitude: 80.2101,
    departments: [],
  },
  {
    name: "Meridian Care Hospital",
    area: "T. Nagar, Chennai",
    licenseNumber: "TN-HOSP-2026-002",
    registeredEmail: "admin@meridiancare.in",
    latitude: 13.0418,
    longitude: 80.2341,
    departments: [],
  },
  {
    name: "Harbor View Medical Centre",
    area: "Adyar, Chennai",
    licenseNumber: "TN-HOSP-2026-003",
    registeredEmail: "admin@harborviewmedical.in",
    latitude: 13.0012,
    longitude: 80.2565,
    departments: [],
  },
  {
    name: "Greenfield Multispeciality Hospital",
    area: "Velachery, Chennai",
    licenseNumber: "TN-HOSP-2026-004",
    registeredEmail: "admin@greenfieldmulti.in",
    latitude: 12.9791,
    longitude: 80.2212,
    departments: [],
  },
  {
    name: "Lakeview Institute of Health",
    area: "Porur, Chennai",
    licenseNumber: "TN-HOSP-2026-005",
    registeredEmail: "admin@lakeviewhealth.in",
    latitude: 13.0382,
    longitude: 80.1565,
    departments: [],
  },
  {
    name: "St. Xavier's Charitable Hospital",
    area: "Mylapore, Chennai",
    licenseNumber: "TN-HOSP-2026-006",
    registeredEmail: "admin@stxavierscharitable.in",
    latitude: 13.0339,
    longitude: 80.2619,
    departments: [],
  },
  {
    name: "Pearl Multispeciality Hospital",
    area: "Nungambakkam, Chennai",
    licenseNumber: "TN-HOSP-2026-007",
    registeredEmail: "admin@pearlmultispeciality.in",
    latitude: 13.0569,
    longitude: 80.2425,
    departments: [],
  },
  {
    name: "Coral Heights Hospital",
    area: "Perambur, Chennai",
    licenseNumber: "TN-HOSP-2026-008",
    registeredEmail: "admin@coralheights.in",
    latitude: 13.1143,
    longitude: 80.2329,
    departments: [],
  },
  {
    name: "Riverside Community Hospital",
    area: "Guindy, Chennai",
    licenseNumber: "TN-HOSP-2026-009",
    registeredEmail: "admin@riversidecommunity.in",
    latitude: 13.0067,
    longitude: 80.2206,
    departments: [],
  },
  {
    name: "Silver Oak Speciality Hospital",
    area: "Tambaram, Chennai",
    licenseNumber: "TN-HOSP-2026-010",
    registeredEmail: "admin@silveroakspeciality.in",
    latitude: 12.9250,
    longitude: 80.1000,
    departments: [],
  },
];

async function seed() {
  await connectDB();
  await Hospital.deleteMany({});
  await Hospital.insertMany(hospitals);
  console.log(`Seeded ${hospitals.length} synthetic hospitals.`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
