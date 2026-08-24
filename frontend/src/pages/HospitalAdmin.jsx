import { useEffect, useState, useCallback } from "react";
import {
  Check, Plus, Circle, Stethoscope, HeartPulse, TestTube, Radio, MapPin,
  Pencil, Phone, Info, Clock, IndianRupee, LayoutGrid, ClipboardList,
  Settings2, Users, Ban, PhoneCall, User, X, ShieldCheck, LayoutDashboard,
  CalendarCheck, Activity, CalendarDays,
} from "lucide-react";
import { api } from "../api.js";
import Badge from "../components/Badge.jsx";

const deptIcon = {
  "General OPD": Stethoscope,
  Cardiology: HeartPulse,
  "Blood Test": TestTube,
  "X-Ray": Radio,
};

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutGrid },
  { key: "bookings", label: "Bookings", icon: ClipboardList },
  { key: "profile", label: "Profile", icon: Settings2 },
];

// Same "09:00–12:00" / "10:00 - 11:00" parsing the backend uses, so the
// dropdown label a hospital sees matches exactly what gets validated.
function parseTimeSlot(slot) {
  if (!slot) return null;
  const text = String(slot).trim().replace(/-/g, "–");
  const parts = text.split("–").map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  return { start: parts[0], end: parts[1] };
}

// Groups bookings by the calendar date they were made on (createdAt —
// falls back to appointmentDate if createdAt is somehow missing), most
// recent date first, and each date's bookings most recent first. Purely
// a display grouping — doesn't touch the underlying bookings array, the
// API calls, or any of the booking-status logic.
function groupBookingsByDate(bookings) {
  const groups = new Map();
  for (const b of bookings) {
    const raw = b.createdAt || b.appointmentDate;
    const d = raw ? new Date(raw) : null;
    const key =
      d && !Number.isNaN(d.getTime())
        ? `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
        : "Unknown date";
    if (!groups.has(key)) groups.set(key, { date: d, items: [] });
    groups.get(key).items.push(b);
  }
  return Array.from(groups.entries())
    .sort((a, b) => {
      const at = a[1].date ? a[1].date.getTime() : -Infinity;
      const bt = b[1].date ? b[1].date.getTime() : -Infinity;
      return bt - at;
    })
    .map(([key, { date, items }]) => ({ key, date, items }));
}

function dateGroupLabel(key, date) {
  if (!date) return key;
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  if (isToday) return `Today · ${key}`;
  if (isYesterday) return `Yesterday · ${key}`;
  return key;
}

export default function HospitalAdmin({ user, showToast }) {
  const [hospital, setHospital] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

  // profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profilePhone, setProfilePhone] = useState("");
  const [profileDesc, setProfileDesc] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // per-department edit state (only one open at a time, keyed by dept name)
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ capacity: "", costRange: "", status: "open", timeSlots: "", doctorName: "" });
  const [savingDept, setSavingDept] = useState(false);

  // "add new department/issue" form
  const [addingDept, setAddingDept] = useState(false);
  const [newDept, setNewDept] = useState({ name: "", capacity: "", costRange: "", timeSlots: "", doctorName: "" });
  const [savingNewDept, setSavingNewDept] = useState(false);

  const [updatingBookingId, setUpdatingBookingId] = useState(null);

  const loadHospital = useCallback(async () => {
    if (!user.hospitalId) return;
    try {
      const data = await api.getHospital(user.hospitalId, user.firebaseUid);
      setHospital(data);
    } catch (err) {
      setError(err.message);
    }
  }, [user.hospitalId, user.firebaseUid]);

  const loadBookings = useCallback(async () => {
    if (!user.hospitalId) return;
    try {
      const data = await api.getHospitalBookings(user.hospitalId);
      setBookings(data);
    } catch {
      // bookings failing to load shouldn't block the rest of the dashboard
    }
  }, [user.hospitalId]);

  // Polling gives every open patient screen a live view without a manual
  // refresh. Swap for a Firebase Realtime Database listener for instant
  // push updates instead of a fixed interval — see README.
  useEffect(() => {
    loadHospital();
    loadBookings();
    const t = setInterval(() => {
      loadHospital();
      loadBookings();
    }, 4000);
    return () => clearInterval(t);
  }, [loadHospital, loadBookings]);

  // walk-in intake form — filling this creates a REAL booking (source:
  // "walk-in") so it shows up in the Bookings tab alongside online ones,
  // instead of just silently bumping a counter. The hospital now picks
  // the real time slot from the department's own published slots, same
  // as an online patient would — so appointmentStart/appointmentEnd are
  // always real, never guessed.
  const [walkInDept, setWalkInDept] = useState(null);
  const [walkInForm, setWalkInForm] = useState({ name: "", age: "", gender: "", phone: "", symptom: "", timeSlot: "" });
  const [submittingWalkIn, setSubmittingWalkIn] = useState(false);

  async function submitWalkIn(e, deptName) {
    e.preventDefault();

    const parsed = parseTimeSlot(walkInForm.timeSlot);
    if (!parsed) {
      showToast("Pick the time slot this walk-in is being seen in");
      return;
    }

    setSubmittingWalkIn(true);
    try {
      await api.createBooking({
        patientUid: `walkin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        patientName: walkInForm.name.trim(),
        patientAge: walkInForm.age ? Number(walkInForm.age) : null,
        patientGender: walkInForm.gender,
        patientPhone: walkInForm.phone.trim(),
        symptom: walkInForm.symptom.trim(),
        hospitalId: hospital._id,
        department: deptName,
        source: "walk-in",
        // Real, hospital-picked slot — same shape online bookings use.
        appointmentDate: new Date().toISOString(),
        appointmentStart: parsed.start,
        appointmentEnd: parsed.end,
      });
      await Promise.all([loadHospital(), loadBookings()]);
      setWalkInDept(null);
      setWalkInForm({ name: "", age: "", gender: "", phone: "", symptom: "", timeSlot: "" });
      showToast(`${walkInForm.name.trim()} added as a walk-in`);
    } catch (err) {
      showToast(err.message);
    } finally {
      setSubmittingWalkIn(false);
    }
  }

  function startEditProfile() {
    setProfilePhone(hospital.phone || "");
    setProfileDesc(hospital.description || "");
    setEditingProfile(true);
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await api.updateHospitalProfile(
        hospital._id,
        { phone: profilePhone.trim(), description: profileDesc.trim() },
        user.firebaseUid
      );
      setHospital(updated);
      setEditingProfile(false);
      showToast("Hospital profile updated");
    } catch (err) {
      showToast(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  function startEditDept(d) {
    setEditingDept(d.name);
    setDeptForm({
      capacity: d.capacity,
      costRange: d.costRange,
      status: d.status,
      timeSlots: (d.timeSlots || []).join(", "),
      doctorName: d.doctorName || "",
    });
  }

  async function saveDept(e, deptName) {
    e.preventDefault();
    setSavingDept(true);
    try {
      const updated = await api.updateDepartment(
        hospital._id,
        deptName,
        {
          capacity: Number(deptForm.capacity),
          costRange: deptForm.costRange.trim(),
          status: deptForm.status,
          timeSlots: deptForm.timeSlots.split(",").map((s) => s.trim()).filter(Boolean),
          doctorName: deptForm.doctorName.trim(),
        },
        user.firebaseUid
      );
      setHospital(updated);
      setEditingDept(null);
      showToast(`${deptName} updated`);
    } catch (err) {
      showToast(err.message);
    } finally {
      setSavingDept(false);
    }
  }

  async function saveNewDept(e) {
    e.preventDefault();
    setSavingNewDept(true);
    try {
      const updated = await api.addDepartment(
        hospital._id,
        {
          name: newDept.name.trim(),
          capacity: Number(newDept.capacity),
          costRange: newDept.costRange.trim(),
          timeSlots: newDept.timeSlots.split(",").map((s) => s.trim()).filter(Boolean),
          doctorName: newDept.doctorName.trim(),
        },
        user.firebaseUid
      );
      setHospital(updated);
      setAddingDept(false);
      setNewDept({ name: "", capacity: "", costRange: "", timeSlots: "", doctorName: "" });
      showToast(`${newDept.name} added`);
    } catch (err) {
      showToast(err.message);
    } finally {
      setSavingNewDept(false);
    }
  }

  async function setBookingStatus(booking, status, message) {
    setUpdatingBookingId(booking._id);
    try {
      await api.updateBookingStatus(booking._id, status);
      await Promise.all([loadBookings(), loadHospital()]);
      showToast(message);
    } catch (err) {
      showToast(err.message);
    } finally {
      setUpdatingBookingId(null);
    }
  }

  if (!user.hospitalId) {
    return (
      <div className="bg-white border border-[#C7D6DE] rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-[#45586B]">
          Your account isn't linked to a hospital yet. Contact support to get this fixed.
        </p>
      </div>
    );
  }

  if (error) return <p className="text-sm text-[#B3261E] px-1">{error}</p>;
  if (!hospital) return <p className="text-sm text-[#45586B] px-1">Loading your hospital…</p>;

  const totalOpen = hospital.departments.reduce((sum, d) => sum + Math.max(0, d.capacity - d.booked), 0);
  const waitingCount = bookings.filter((b) => b.status === "waiting").length;
  const todaysBookings = bookings.length;
  const bookingGroups = groupBookingsByDate(bookings);

  return (
    <div className="space-y-5">
      {/* Hero — real data only: name, area, and the hospital's actual
          license number (hospital.licenseNumber), mirroring the same
          premium gradient treatment used on the patient dashboard. */}
      <div className="relative overflow-hidden rounded-2xl border border-[#0B6E8F]/30 shadow-md shadow-[#0E2233]/10">
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/8" />
        <div aria-hidden="true" className="absolute right-24 -bottom-10 h-28 w-28 rounded-full bg-white/6" />
        <div className="relative bg-gradient-to-br from-[#0B6E8F] to-[#084F68] text-white p-6 sm:p-7">
          <div className="flex items-center gap-1.5 mb-2 text-[12.5px] font-semibold text-white/85">
            <ShieldCheck size={14} />
            License-verified hospital
          </div>
          <h1 style={{ fontFamily: "'Fraunces', serif" }} className="text-[26px] sm:text-[28px] font-semibold tracking-tight">
            {hospital.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[13px] text-white/80">
            <span className="flex items-center gap-1">
              <MapPin size={13} /> {hospital.area}
            </span>
            {hospital.licenseNumber && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11.5px] bg-white/12 rounded-full px-2.5 py-0.5">
                {hospital.licenseNumber}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Departments" value={hospital.departments.length} icon={LayoutDashboard} accent="primary" />
        <StatCard label="Open slots" value={totalOpen} icon={Check} accent="primary" />
        <StatCard label="Waiting now" value={waitingCount} icon={Activity} accent="amber" />
        <StatCard label="Bookings today" value={todaysBookings} icon={CalendarCheck} accent="primary" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#C7D6DE]">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? "border-[#0B6E8F] text-[#084F68]"
                  : "border-transparent text-[#45586B] hover:text-[#0E2233]"
              }`}
            >
              <Icon size={14} /> {t.label}
              {t.key === "bookings" && waitingCount > 0 && (
                <span className="ml-1 bg-[#F2C078] text-[#0E2233] text-[10px] font-bold rounded-full px-1.5 py-0.5">
                  {waitingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <div className="bg-white border border-[#C7D6DE] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 style={{ fontFamily: "'Fraunces', serif" }} className="font-semibold text-[15px] text-[#0E2233]">Departments</h2>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[#084F68] bg-[#E3EDF2] px-2 py-0.5 rounded-full">
              <Circle size={6} className="fill-[#0B6E8F] text-[#0B6E8F] animate-pulse" /> Live
            </span>
          </div>
          <p className="text-xs text-[#45586B] mb-4 leading-relaxed">
            Add each department your hospital has open today — patients only see departments you've added
            here. Log a walk-in below to occupy a slot (it'll appear in Bookings too); mark a patient done
            from the Bookings tab to free their slot back up. This list clears automatically at the start
            of each new day — add today's departments fresh each morning.
          </p>

          {hospital.departments.length === 0 && !addingDept && (
            <div className="text-center py-8 border border-dashed border-[#C7D6DE] rounded-xl mb-4">
              <div className="w-10 h-10 rounded-full bg-[#E3EDF2] flex items-center justify-center mx-auto mb-3">
                <LayoutDashboard size={16} className="text-[#0B6E8F]" />
              </div>
              <p className="text-sm text-[#45586B] mb-3">You haven't added any departments yet.</p>
              <button
                onClick={() => setAddingDept(true)}
                className="inline-flex items-center gap-1.5 text-sm text-[#0B6E8F] hover:text-[#084F68] font-semibold"
              >
                <Plus size={14} /> Add your first department
              </button>
            </div>
          )}

          <div className="space-y-3">
            {hospital.departments.map((d) => {
              const Icon = deptIcon[d.name] || Stethoscope;
              const open = d.capacity - d.booked;
              const isEditing = editingDept === d.name;
              return (
                <div
                  key={d.name}
                  className="relative border border-[#C7D6DE] rounded-xl p-4 pl-5 hover:border-[#0B6E8F]/40 transition-colors overflow-hidden"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-0 bottom-0 w-1 ${
                      d.status === "open" ? "bg-[#0B6E8F]" : d.status === "full" ? "bg-[#B3261E]" : "bg-[#C7D6DE]"
                    }`}
                  />
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-md bg-[#0B6E8F] flex items-center justify-center">
                        <Icon size={13} className="text-white" />
                      </div>
                      <span className="text-sm font-semibold text-[#0E2233]">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge status={d.status} />
                      {!isEditing && (
                        <button
                          onClick={() => startEditDept(d)}
                          className="text-[#45586B] hover:text-[#0B6E8F] transition-colors"
                          title="Edit department"
                        >
                          <Pencil size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <form onSubmit={(e) => saveDept(e, d.name)} className="space-y-2 mt-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={0}
                          value={deptForm.capacity}
                          onChange={(e) => setDeptForm({ ...deptForm, capacity: e.target.value })}
                          placeholder="Capacity"
                          required
                          className="border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F]"
                        />
                        <select
                          value={deptForm.status}
                          onChange={(e) => setDeptForm({ ...deptForm, status: e.target.value })}
                          className="border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F]"
                        >
                          <option value="open">Open</option>
                          <option value="full">Full</option>
                          <option value="closed">Closed</option>
                        </select>
                      </div>
                      <input
                        value={deptForm.costRange}
                        onChange={(e) => setDeptForm({ ...deptForm, costRange: e.target.value })}
                        placeholder="Cost range (e.g. ₹300–500)"
                        required
                        className="w-full border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F]"
                      />
                      <input
                        value={deptForm.doctorName}
                        onChange={(e) => setDeptForm({ ...deptForm, doctorName: e.target.value })}
                        placeholder="Doctor handling this department (e.g. Dr. Anitha Rao)"
                        className="w-full border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F]"
                      />
                      <input
                        value={deptForm.timeSlots}
                        onChange={(e) => setDeptForm({ ...deptForm, timeSlots: e.target.value })}
                        placeholder="Time slots, comma separated (e.g. 09:00–12:00, 14:00–17:00)"
                        className="w-full border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F]"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          disabled={savingDept}
                          className="bg-[#0B6E8F] hover:bg-[#084F68] disabled:opacity-60 text-white rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors"
                        >
                          {savingDept ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingDept(null)}
                          className="text-xs text-[#45586B] hover:text-[#0E2233] px-2"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-xs text-[#45586B]">
                          {d.booked}/{d.capacity} booked ·{" "}
                          {open > 0 ? (
                            <span className="text-[#084F68] font-semibold">{open} open</span>
                          ) : (
                            <span className="text-[#B3261E] font-semibold">Full</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            disabled={d.status === "full"}
                            onClick={() => {
                              setWalkInDept(d.name);
                              setWalkInForm({ name: "", age: "", gender: "", phone: "", symptom: "", timeSlot: "" });
                            }}
                            className="flex items-center gap-1 text-xs border border-[#C7D6DE] rounded-lg px-2.5 py-1.5 hover:border-[#0B6E8F] hover:bg-[#EFF5F8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus size={12} /> Walk-in
                          </button>
                        </div>
                      </div>

                      {walkInDept === d.name && (
                        <form
                          onSubmit={(e) => submitWalkIn(e, d.name)}
                          className="mt-3 border border-[#0B6E8F]/25 bg-[#EFF5F8] rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#0E2233]">Walk-in patient details</span>
                            <button
                              type="button"
                              onClick={() => setWalkInDept(null)}
                              className="text-[#45586B] hover:text-[#0E2233]"
                            >
                              <X size={13} />
                            </button>
                          </div>
                          <input
                            value={walkInForm.name}
                            onChange={(e) => setWalkInForm({ ...walkInForm, name: e.target.value })}
                            placeholder="Patient name"
                            required
                            className="w-full border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F] bg-white"
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="number"
                              min={0}
                              value={walkInForm.age}
                              onChange={(e) => setWalkInForm({ ...walkInForm, age: e.target.value })}
                              placeholder="Age"
                              className="border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F] bg-white"
                            />
                            <select
                              value={walkInForm.gender}
                              onChange={(e) => setWalkInForm({ ...walkInForm, gender: e.target.value })}
                              className="border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F] bg-white"
                            >
                              <option value="">Gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <input
                            value={walkInForm.phone}
                            onChange={(e) => setWalkInForm({ ...walkInForm, phone: e.target.value })}
                            placeholder="Phone number (optional)"
                            className="w-full border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F] bg-white"
                          />
                          <input
                            value={walkInForm.symptom}
                            onChange={(e) => setWalkInForm({ ...walkInForm, symptom: e.target.value })}
                            placeholder="Reason / symptom (optional)"
                            className="w-full border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F] bg-white"
                          />
                          {/* Real time slot, picked from this department's own
                              published slots — required so appointmentStart/
                              appointmentEnd are always real, never guessed. */}
                          <select
                            value={walkInForm.timeSlot}
                            onChange={(e) => setWalkInForm({ ...walkInForm, timeSlot: e.target.value })}
                            required
                            className="w-full border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F] bg-white"
                          >
                            <option value="">Select time slot being seen in</option>
                            {(d.timeSlots || []).map((slot) => (
                              <option key={slot} value={slot}>
                                {slot}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            disabled={submittingWalkIn}
                            className="w-full bg-[#0B6E8F] hover:bg-[#084F68] disabled:opacity-60 text-white rounded-lg py-2 text-xs font-semibold transition-colors"
                          >
                            {submittingWalkIn ? "Adding…" : "Add walk-in & occupy slot"}
                          </button>
                        </form>
                      )}

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-[#45586B]">
                        <span className="flex items-center gap-1">
                          <IndianRupee size={11} /> {d.costRange}
                        </span>
                        {d.doctorName && (
                          <span className="flex items-center gap-1">
                            <User size={11} />
                            {d.doctorName}
                          </span>
                        )}
                        {d.timeSlots && d.timeSlots.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {d.timeSlots.join(" · ")}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add a new department/issue */}
          <div className={hospital.departments.length ? "mt-4 pt-4 border-t border-[#C7D6DE]" : ""}>
            {addingDept ? (
              <form onSubmit={saveNewDept} className="space-y-2">
                <input
                  value={newDept.name}
                  onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                  placeholder="Department / issue name (e.g. Dermatology)"
                  required
                  className="w-full border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min={1}
                    value={newDept.capacity}
                    onChange={(e) => setNewDept({ ...newDept, capacity: e.target.value })}
                    placeholder="Capacity"
                    required
                    className="border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F]"
                  />
                  <input
                    value={newDept.costRange}
                    onChange={(e) => setNewDept({ ...newDept, costRange: e.target.value })}
                    placeholder="Cost range (e.g. ₹400–700)"
                    required
                    className="border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F]"
                  />
                </div>
                <input
                  value={newDept.timeSlots}
                  onChange={(e) => setNewDept({ ...newDept, timeSlots: e.target.value })}
                  placeholder="Time slots, comma separated (optional)"
                  className="w-full border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F]"
                />
                <input
                  value={newDept.doctorName}
                  onChange={(e) => setNewDept({ ...newDept, doctorName: e.target.value })}
                  placeholder="Doctor handling this department (optional)"
                  className="w-full border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F]"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={savingNewDept}
                    className="bg-[#0B6E8F] hover:bg-[#084F68] disabled:opacity-60 text-white rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors"
                  >
                    {savingNewDept ? "Adding…" : "Add department"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingDept(false)}
                    className="text-xs text-[#45586B] hover:text-[#0E2233] px-2"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              hospital.departments.length > 0 && (
                <button
                  onClick={() => setAddingDept(true)}
                  className="flex items-center gap-1.5 text-xs text-[#0B6E8F] hover:text-[#084F68] font-semibold"
                >
                  <Plus size={13} /> Add a department / issue
                </button>
              )
            )}
          </div>
        </div>
      )}

      {tab === "bookings" && (
        <div className="bg-white border border-[#C7D6DE] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <h2 style={{ fontFamily: "'Fraunces', serif" }} className="font-semibold text-[15px] text-[#0E2233]">Bookings</h2>
            <span className="flex items-center gap-1 text-[11px] text-[#45586B]">
              <Users size={12} /> {bookings.length} total
            </span>
          </div>
          <p className="text-xs text-[#45586B] mb-4">
            Every patient who booked online or was registered as a walk-in, grouped by date, most recent first.
          </p>

          {bookings.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-[#C7D6DE] rounded-xl">
              <div className="w-10 h-10 rounded-full bg-[#E3EDF2] flex items-center justify-center mx-auto mb-3">
                <ClipboardList size={16} className="text-[#0B6E8F]" />
              </div>
              <p className="text-sm text-[#45586B]">No bookings yet.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {bookingGroups.map((group) => (
                <div key={group.key}>
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <CalendarDays size={13} className="text-[#0B6E8F]" />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11.5px] font-semibold uppercase tracking-wide text-[#084F68]">
                      {dateGroupLabel(group.key, group.date)}
                    </span>
                    <span className="text-[11px] text-[#45586B]">· {group.items.length} booking{group.items.length > 1 ? "s" : ""}</span>
                  </div>

                  <div className="space-y-2.5">
                    {group.items.map((b) => (
                      <div key={b._id} className="border border-[#C7D6DE] rounded-xl p-3.5 hover:border-[#0B6E8F]/40 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#0B6E8F] to-[#084F68] text-white font-bold text-[12px] flex-shrink-0 mt-0.5">
                              {(b.patientName || "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-sm font-semibold text-[#0E2233]">
                                {b.patientName}
                                {b.patientAge != null && (
                                  <span className="text-[#45586B] font-normal">
                                    · {b.patientAge}{b.patientGender ? `, ${b.patientGender}` : ""}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#45586B] mt-1">
                                {b.department}
                                {b.symptom ? ` — ${b.symptom}` : ""}
                              </div>
                              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-[#45586B]/80">
                                {b.patientPhone && (
                                  <span className="flex items-center gap-1">
                                    <PhoneCall size={11} /> {b.patientPhone}
                                  </span>
                                )}
                                <span className="capitalize">{b.source}</span>
                                {b.appointmentStart && (
                                  <span className="flex items-center gap-1">
                                    <Clock size={11} />
                                    {b.appointmentStart}
                                    {b.appointmentEnd ? ` – ${b.appointmentEnd}` : ""}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <StatusPill status={b.status} />
                            {b.status === "waiting" && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  disabled={updatingBookingId === b._id}
                                  onClick={() => setBookingStatus(b, "completed", "Marked completed")}
                                  className="flex items-center gap-1 text-[11px] border border-[#C7D6DE] rounded-lg px-2 py-1 hover:border-[#0B6E8F] hover:bg-[#EFF5F8] transition-colors disabled:opacity-50"
                                >
                                  <Check size={11} /> Complete
                                </button>
                                <button
                                  disabled={updatingBookingId === b._id}
                                  onClick={() => setBookingStatus(b, "no-show", "Marked no-show")}
                                  className="flex items-center gap-1 text-[11px] border border-[#C7D6DE] rounded-lg px-2 py-1 hover:border-[#0B6E8F] hover:bg-[#EFF5F8] transition-colors disabled:opacity-50"
                                >
                                  <Ban size={11} /> No-show
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "profile" && (
        <div className="bg-white border border-[#C7D6DE] rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontFamily: "'Fraunces', serif" }} className="font-semibold text-[15px] text-[#0E2233]">Hospital profile</h2>
            {!editingProfile && (
              <button
                onClick={startEditProfile}
                className="flex items-center gap-1 text-xs text-[#0B6E8F] hover:text-[#084F68] font-semibold"
              >
                <Pencil size={12} /> Edit
              </button>
            )}
          </div>

          {editingProfile ? (
            <form onSubmit={saveProfile} className="space-y-2.5">
              <input
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                placeholder="Contact phone number"
                className="w-full border border-[#C7D6DE] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F]"
              />
              <textarea
                value={profileDesc}
                onChange={(e) => setProfileDesc(e.target.value)}
                placeholder="Short description patients will see (facilities, specialities, timings...)"
                rows={3}
                className="w-full border border-[#C7D6DE] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-[#0B6E8F] hover:bg-[#084F68] disabled:opacity-60 text-white rounded-lg px-4 py-2 text-xs font-semibold transition-colors"
                >
                  {savingProfile ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingProfile(false)}
                  className="text-xs text-[#45586B] hover:text-[#0E2233] px-2"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-[#EFF5F8] border border-[#C7D6DE] rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-7 h-7 rounded-md bg-[#0B6E8F] flex items-center justify-center flex-shrink-0">
                    <Phone size={13} className="text-white" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#45586B]">Contact phone</span>
                </div>
                <p className="text-sm text-[#0E2233]">
                  {hospital.phone || <span className="text-[#45586B]/70">No phone number added yet</span>}
                </p>
              </div>
              <div className="bg-[#EFF5F8] border border-[#C7D6DE] rounded-xl p-4">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-7 h-7 rounded-md bg-[#0B6E8F] flex items-center justify-center flex-shrink-0">
                    <Info size={13} className="text-white" />
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#45586B]">Description</span>
                </div>
                <p className="text-sm text-[#0E2233] leading-relaxed">
                  {hospital.description || <span className="text-[#45586B]/70">No description added yet</span>}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }) {
  const accentText = { primary: "text-[#084F68]", amber: "text-[#A8441A]" }[accent] || "text-[#0E2233]";
  const iconBg = { primary: "bg-[#0B6E8F]", amber: "bg-[#A8441A]" }[accent] || "bg-[#45586B]";
  return (
    <div className="bg-white border border-[#C7D6DE] rounded-xl px-4 py-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-[#45586B]">{label}</span>
        {Icon && (
          <div className={`w-6 h-6 rounded-md ${iconBg} flex items-center justify-center flex-shrink-0`}>
            <Icon size={12} className="text-white" />
          </div>
        )}
      </div>
      <div style={{ fontFamily: "'IBM Plex Mono', monospace" }} className={`text-xl font-bold ${accentText}`}>{value}</div>
    </div>
  );
}

function StatusPill({ status }) {
  const map = {
    waiting: { bg: "bg-[#FDF0DD]", text: "text-[#A8441A]", label: "Waiting" },
    "in-progress": { bg: "bg-[#E3EDF2]", text: "text-[#0B6E8F]", label: "In progress" },
    completed: { bg: "bg-[#E3EDF2]", text: "text-[#084F68]", label: "Completed" },
    "no-show": { bg: "bg-[#EFF5F8]", text: "text-[#45586B]", label: "No-show" },
    cancelled: { bg: "bg-[#FBEAE7]", text: "text-[#B3261E]", label: "Cancelled" },
  };
  const s = map[status] || map.waiting;
  return (
    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
  );
}