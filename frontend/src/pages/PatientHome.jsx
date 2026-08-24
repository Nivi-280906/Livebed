import { useEffect, useState } from "react";
import {
  MapPin,
  Clock,
  CalendarCheck,
  CalendarDays,
  Activity,
  ArrowUpRight,
  X,
  LocateFixed,
  IndianRupee,
  ChevronRight,
  ShieldCheck,
  PhoneCall,
  Users,
  Footprints,
} from "lucide-react";
import { api } from "../api.js";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* =========================================================
   REAL APPOINTMENT DATA ONLY.

   The booking already stores the actual slot the patient
   selected: appointmentDate, appointmentStart, appointmentEnd.
   These are set once at booking time and never change — so we
   read them directly instead of deriving a time range from
   createdAt/updatedAt/estimatedWaitMinutes (which only reflect
   when the record was touched, not the real slot).
========================================================= */

function toDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

// "Mon, Aug 25"
function formatDayLabel(iso) {
  const d = toDate(iso);
  if (!d) return null;
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

// Real appointment slot. Every booking now gets one from the backend —
// online bookings get the patient's picked slot; walk-ins get a real
// "now -> now+consult time" slot. No fallback needed.
function formatAppointmentTime(b) {
  const dayLabel = formatDayLabel(b.appointmentDate);
  const timeRange = b.appointmentEnd
    ? `${b.appointmentStart} – ${b.appointmentEnd}`
    : b.appointmentStart || null;
  return { dayLabel, timeRange };
}

export default function PatientHome({ user, onFind, onProfile, showToast }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState(null);
  const [nearby, setNearby] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);

  /* =========================================================
     NEARBY HOSPITALS
  ========================================================= */
  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        api
          .searchHospitals("General OPD", pos.coords.latitude, pos.coords.longitude, "best")
          .then((results) => setNearby(results.filter((r) => r.available).slice(0, 3)))
          .catch(() => setNearby([]));
      },
      () => setLocationDenied(true),
      { timeout: 8000 }
    );
  }, []);

  /* =========================================================
     LOAD BOOKINGS
  ========================================================= */
  function loadBookings() {
    return api
      .getPatientBookings(user.firebaseUid)
      .then(setBookings)
      .catch(() => {});
  }

  useEffect(() => {
    loadBookings().finally(() => setLoading(false));
  }, [user.firebaseUid]);

  /* =========================================================
     CANCEL BOOKING
  ========================================================= */
  async function cancelBooking(id) {
    setCancellingId(id);
    try {
      await api.updateBookingStatus(id, "cancelled");
      await loadBookings();
      showToast?.("Booking cancelled — slot released");
    } catch (err) {
      showToast?.(err.message || "Couldn't cancel — try again");
    } finally {
      setCancellingId(null);
    }
  }

  /* =========================================================
     DATA
  ========================================================= */
  const active = bookings.filter((b) => b.status === "waiting" || b.status === "in-progress");
  const history = bookings.filter((b) => b.status !== "waiting" && b.status !== "in-progress");
  const profileIncomplete = !user.dateOfBirth || !user.village;
  const firstName = user.name?.trim()?.split(" ")[0] || "there";
  const initial = firstName.charAt(0).toUpperCase();
  const patientId = (user.firebaseUid || user._id || "000000").slice(-6).toUpperCase();

  const statusLabel = {
    completed: "Completed",
    "no-show": "No-show",
    cancelled: "Cancelled",
  };
  const statusColor = {
    completed: "text-[#084F68] bg-[#E3EDF2]",
    "no-show": "text-[#45586B] bg-[#EFF5F8]",
    cancelled: "text-[#B3261E] bg-[#FBEAE7]",
  };

  /* =========================================================
     UI
  ========================================================= */
  return (
    <div className="relative">
      {/* BACKGROUND DECORATION */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-10 -right-24 h-72 w-72 rounded-full bg-[#0B6E8F]/6 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute top-40 -left-20 h-56 w-56 rounded-full bg-[#A8441A]/5 blur-3xl" />

      <div className="relative space-y-5">
        {/* GREETING */}
        <div>
          <h1
            style={{ fontFamily: "'Fraunces', serif" }}
            className="text-[26px] sm:text-[30px] font-medium tracking-tight text-[#0E2233] leading-tight"
          >
            <span className="text-[#0B6E8F]">{greeting()},</span> {firstName}
          </h1>
        </div>

        {/* HERO */}
        <div className="relative overflow-hidden rounded-2xl border border-[#0B6E8F]/30 shadow-lg shadow-[#0E2233]/10">
          <div aria-hidden="true" className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-white/8" />
          <div aria-hidden="true" className="absolute right-24 -bottom-10 h-28 w-28 rounded-full bg-white/6" />
          <button
            onClick={onFind}
            className="relative w-full bg-gradient-to-br from-[#0B6E8F] to-[#084F68] text-white p-6 sm:p-7 text-left flex items-center justify-between group transition-transform active:scale-[0.995]"
          >
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <MapPin size={14} className="text-white/80" />
                <span className="text-[13px] font-semibold text-white/85">Need care right now?</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[#0E2233] bg-[#F2C078] rounded-full px-2 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#A8441A] animate-pulse" />
                  Live
                </span>
              </div>
              <div style={{ fontFamily: "'Fraunces', serif" }} className="text-[26px] font-semibold">
                Find a hospital
              </div>
              <div className="text-[13px] text-white/80 mt-0.5">Live wait times near you</div>
            </div>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 group-hover:bg-white/25 transition-colors flex-shrink-0">
              <ArrowUpRight size={20} className="text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </button>
        </div>

        {/* MAIN + SIDEBAR */}
        <div className="grid gap-5 lg:grid-cols-[1fr_320px] items-start">
          {/* MAIN */}
          <div className="space-y-5">
            {/* STATS */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-white border border-[#C7D6DE] rounded-xl px-5 py-4 shadow-md shadow-[#0E2233]/[0.04] transition-shadow hover:shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#45586B]">Waiting now</span>
                  <div className="w-7 h-7 rounded-md bg-[#A8441A] flex items-center justify-center">
                    <Activity size={13} className="text-white" />
                  </div>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[28px] font-bold text-[#0E2233] leading-none">
                  {loading ? "–" : active.length}
                </div>
              </div>

              <div className="bg-white border border-[#C7D6DE] rounded-xl px-5 py-4 shadow-md shadow-[#0E2233]/[0.04] transition-shadow hover:shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#45586B]">Total bookings</span>
                  <div className="w-7 h-7 rounded-md bg-[#0B6E8F] flex items-center justify-center">
                    <CalendarCheck size={13} className="text-white" />
                  </div>
                </div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[28px] font-bold text-[#0E2233] leading-none">
                  {loading ? "–" : bookings.length}
                </div>
              </div>
            </div>

            {/* ACTIVE / BOOKED */}
            {active.length > 0 && (
              <div className="bg-white border border-[#C7D6DE] rounded-xl overflow-hidden shadow-md shadow-[#0E2233]/[0.04]">
                <div className="px-5 pt-4 pb-2 border-b border-[#C7D6DE] flex items-center justify-between">
                  <h2 className="font-bold text-[14px] text-[#0E2233]">Booked</h2>
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold text-[#A8441A]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#A8441A] animate-pulse" /> Active
                  </span>
                </div>
                <div>
                  {active.map((b) => {
                    const { dayLabel, timeRange } = formatAppointmentTime(b);
                    const forSomeoneElse = b.relation && b.relation !== "Self";

                    return (
                      <div key={b._id} className="px-5 py-4 border-t border-[#EFF5F8] first:border-t-0">
                        {/* ROW 1 — department (left) · date & time (right, highlighted) */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[13.5px] font-semibold text-[#0E2233] truncate min-w-0">
                            {b.department}
                          </div>
                          {(dayLabel || timeRange) && (
                            <div className="flex items-center gap-2 flex-shrink-0 rounded-lg bg-gradient-to-br from-[#0B6E8F]/10 to-[#0B6E8F]/5 border border-[#0B6E8F]/20 px-2.5 py-1.5">
                              {dayLabel && (
                                <span className="flex items-center gap-1 text-[11px] font-semibold text-[#0B6E8F]">
                                  <CalendarDays size={12} /> {dayLabel}
                                </span>
                              )}
                              {dayLabel && timeRange && (
                                <span className="h-3 w-px bg-[#0B6E8F]/25" />
                              )}
                              {timeRange && (
                                <span className="flex items-center gap-1 text-[13px] font-bold text-[#084F68]">
                                  <Clock size={12} /> {timeRange}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* ROW 2 — hospital (left) · wait + cancel (right) */}
                        <div className="flex items-center justify-between gap-3 mt-1">
                          <div className="text-[12px] text-[#45586B] truncate min-w-0">{b.hospitalId?.name}</div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1 text-[12px] font-bold text-white bg-[#A8441A] px-2.5 py-1 rounded-md">
                              <Clock size={11} /> {b.estimatedWaitMinutes ?? "—"}m
                            </div>
                            <button
                              onClick={() => cancelBooking(b._id)}
                              disabled={cancellingId === b._id}
                              className="flex items-center gap-1 text-[12px] font-semibold text-[#B3261E] hover:bg-[#FBEAE7] px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
                            >
                              <X size={11} /> {cancellingId === b._id ? "…" : "Cancel"}
                            </button>
                          </div>
                        </div>

                        {/* EXTRA INFO */}
                        {(forSomeoneElse || b.source === "walk-in") && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11.5px] text-[#45586B]">
                            {forSomeoneElse && (
                              <span className="flex items-center gap-1 text-[#084F68] font-medium">
                                <Users size={11} /> For {b.relation}
                                {b.patientName ? ` (${b.patientName})` : ""}
                              </span>
                            )}
                            {b.source === "walk-in" && (
                              <span className="flex items-center gap-1">
                                <Footprints size={11} /> Walk-in
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* NO ACTIVE BOOKINGS */}
            {active.length === 0 && !loading && (
              <div className="bg-white border border-[#C7D6DE] rounded-xl px-5 py-8 text-center shadow-md shadow-[#0E2233]/[0.04]">
                <p className="text-[13.5px] text-[#45586B]">No active bookings right now.</p>
                <button onClick={onFind} className="mt-2 text-[13px] font-semibold text-[#0B6E8F] hover:text-[#084F68]">
                  Find a hospital →
                </button>
              </div>
            )}

            {/* HISTORY */}
            <div className="bg-white border border-[#C7D6DE] rounded-xl overflow-hidden shadow-md shadow-[#0E2233]/[0.04]">
              <div className="px-5 pt-4 pb-2 border-b border-[#C7D6DE]">
                <h2 className="font-bold text-[14px] text-[#0E2233]">History</h2>
              </div>

              {loading ? (
                <p className="text-[13px] text-[#45586B] px-5 py-5">Loading…</p>
              ) : bookings.length === 0 ? (
                <p className="text-[13px] text-[#45586B] px-5 py-5 leading-relaxed">
                  No bookings yet. Once you book a slot, it'll appear above with a live wait estimate.
                </p>
              ) : history.length === 0 ? (
                <p className="text-[13px] text-[#45586B] px-5 py-5">
                  Nothing here yet — your current booking will move here once it's completed or cancelled.
                </p>
              ) : (
                <div>
                  {history.map((b) => {
                    const { dayLabel, timeRange } = formatAppointmentTime(b);
                    const forSomeoneElse = b.relation && b.relation !== "Self";

                    return (
                      <div key={b._id} className="px-5 py-4 border-t border-[#EFF5F8] first:border-t-0">
                        {/* ROW 1 — department (left) · status (right) */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[13.5px] font-medium text-[#0E2233] truncate min-w-0">
                            {b.department}
                          </div>
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full border flex-shrink-0 ${
                              b.status === "completed"
                                ? "text-[#063B4D] bg-[#CDE9F0] border-[#7FC4D2] shadow-sm"
                                : statusColor[b.status] || "text-[#45586B] bg-[#EFF5F8] border-[#C7D6DE]"
                            }`}
                          >
                            {b.status === "completed" && <CalendarCheck size={12} />}
                            {statusLabel[b.status] || b.status}
                          </span>
                        </div>

                        {/* ROW 2 — hospital (left) · date & time (right, highlighted) */}
                        <div className="flex items-center justify-between gap-3 mt-1">
                          <div className="text-[12px] text-[#45586B] truncate min-w-0">{b.hospitalId?.name}</div>
                          {(dayLabel || timeRange) && (
                            <div className="flex items-center gap-2 flex-shrink-0 rounded-lg bg-[#EFF5F8] border border-[#C7D6DE] px-2.5 py-1">
                              {dayLabel && (
                                <span className="flex items-center gap-1 text-[10.5px] font-semibold text-[#45586B]">
                                  <CalendarDays size={11} /> {dayLabel}
                                </span>
                              )}
                              {dayLabel && timeRange && (
                                <span className="h-3 w-px bg-[#C7D6DE]" />
                              )}
                              {timeRange && (
                                <span className="flex items-center gap-1 text-[12px] font-bold text-[#084F68]">
                                  <Clock size={11} /> {timeRange}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* EXTRA INFO */}
                        {(forSomeoneElse || b.source === "walk-in") && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[11px] text-[#45586B]/90">
                            {forSomeoneElse && (
                              <span className="flex items-center gap-1">
                                <Users size={10} /> {b.relation}
                                {b.patientName ? ` (${b.patientName})` : ""}
                              </span>
                            )}
                            {b.source === "walk-in" && (
                              <span className="flex items-center gap-1">
                                <Footprints size={10} /> Walk-in
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-4">
            {/* PROFILE */}
            <div className="bg-white border border-[#C7D6DE] rounded-xl overflow-hidden shadow-md shadow-[#0E2233]/[0.04]">
              <button onClick={onProfile} className="w-full p-5 text-left hover:bg-[#EFF5F8]/60 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#0B6E8F] to-[#084F68] text-white font-bold text-[16px] flex-shrink-0 shadow-md shadow-[#0B6E8F]/20">
                    {initial}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14px] font-semibold text-[#0E2233] truncate">{user.name || "Patient"}</div>
                    <div className="text-[12px] text-[#45586B] truncate">{user.email}</div>
                    {profileIncomplete && (
                      <div className="text-[11.5px] font-semibold text-[#A8441A] mt-1 flex items-center gap-0.5">
                        Add date of birth & village <ChevronRight size={12} />
                      </div>
                    )}
                  </div>
                </div>
              </button>
              <div className="border-t border-[#C7D6DE]" />
              <div
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                className="flex items-center justify-between bg-[#EFF5F8] px-5 py-3"
              >
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#45586B]">Patient ID</span>
                <span className="text-[13px] font-bold text-[#0E2233]">#{patientId}</span>
              </div>
            </div>

            {/* NEARBY */}
            {nearby !== null && nearby.length > 0 && (
              <div className="bg-white border border-[#C7D6DE] rounded-xl overflow-hidden shadow-md shadow-[#0E2233]/[0.04]">
                <div className="px-5 pt-4 pb-2 border-b border-[#C7D6DE] flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <LocateFixed size={13} className="text-[#0B6E8F]" />
                    <h3 className="font-bold text-[13px] text-[#0E2233]">Near you right now</h3>
                  </div>
                  <button onClick={onFind} className="text-[11px] font-semibold text-[#0B6E8F] hover:text-[#084F68]">
                    See all
                  </button>
                </div>
                <div>
                  {nearby.map((r) => (
                    <button
                      key={r.id}
                      onClick={onFind}
                      className="w-full flex items-center justify-between px-5 py-3 border-t border-[#EFF5F8] gap-2 text-left hover:bg-[#EFF5F8]/60 transition-colors first:border-t-0"
                    >
                      <div className="min-w-0">
                        <div className="text-[12.5px] font-semibold text-[#0E2233] truncate">{r.name}</div>
                        <div className="text-[11.5px] text-[#45586B] truncate flex items-center gap-2 mt-0.5">
                          {r.distanceKm != null && <span>{r.distanceKm} km</span>}
                          <span className="flex items-center gap-0.5">
                            <IndianRupee size={10} /> {r.department?.costRange}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-white bg-[#A8441A] px-2 py-1 rounded-md flex-shrink-0">
                        <Clock size={10} /> {r.department?.estimatedWaitMinutes}m
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* LOCATION DENIED */}
            {locationDenied && (
              <button
                onClick={onFind}
                className="w-full flex items-center justify-between bg-white border border-dashed border-[#C7D6DE] rounded-xl px-5 py-3.5 text-left hover:border-[#0B6E8F] transition-colors"
              >
                <div className="flex items-center gap-2 text-[12.5px] text-[#45586B]">
                  <LocateFixed size={14} className="text-[#45586B]" />
                  Turn on location to see hospitals near you
                </div>
                <ChevronRight size={15} className="text-[#C7D6DE] flex-shrink-0" />
              </button>
            )}

            {/* TRUST */}
            <div className="bg-white border border-[#C7D6DE] rounded-xl p-5 shadow-md shadow-[#0E2233]/[0.04]">
              <div className="flex items-center gap-1.5 mb-3">
                <ShieldCheck size={14} className="text-[#0B6E8F]" />
                <h3 className="text-[13px] font-bold text-[#0E2233]">Why patients trust LiveBed</h3>
              </div>
              <ul className="space-y-2 text-[12.5px] text-[#45586B] leading-snug">
                <li>Only license-verified hospitals appear on LiveBed</li>
                <li>Wait times update continuously, not on a fixed schedule</li>
              </ul>
            </div>

            {/* EMERGENCY */}
            <div className="bg-[#EFF5F8] border border-[#C7D6DE] rounded-xl p-5">
              <div className="flex items-center gap-1.5 mb-2">
                <PhoneCall size={14} className="text-[#A8441A]" />
                <h3 className="text-[13px] font-bold text-[#0E2233]">Emergency?</h3>
              </div>
              <p className="text-[12px] text-[#45586B] leading-relaxed">
                For life-threatening emergencies, call your local emergency number directly rather than
                booking through the app.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}