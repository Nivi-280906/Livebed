import { useMemo, useState } from "react";
import {
  ArrowLeft, MapPin, Clock, IndianRupee, Circle, ChevronDown, Search,
  Stethoscope, HeartPulse, TestTube, Radio, Sparkles, Navigation, Wallet,
  Phone, Info, User, Users, X, Calendar,
} from "lucide-react";
import { api } from "../api.js";
import Badge from "../components/Badge.jsx";

const issueToDept = {
  "Fever / general checkup": "General OPD",
  "Chest pain / cardiology": "Cardiology",
  "Blood test": "Blood Test",
  "X-ray / scan": "X-Ray",
};

const deptIcon = {
  "General OPD": Stethoscope,
  Cardiology: HeartPulse,
  "Blood Test": TestTube,
  "X-Ray": Radio,
};

const symptomToDept = {
  "General OPD": [
    "fever", "cold", "cough", "flu", "headache", "sore throat", "stomach pain",
    "body pain", "vomiting", "diarrhoea", "diarrhea", "checkup", "general checkup",
    "weakness", "allergy", "skin rash", "infection", "general physician",
  ],
  Cardiology: [
    "chest pain", "heart", "cardiology", "palpitation", "palpitations",
    "blood pressure", "bp", "breathlessness", "shortness of breath", "cardiac",
  ],
  "Blood Test": [
    "blood test", "sugar test", "diabetes test", "lab test", "cbc",
    "blood work", "thyroid test", "cholesterol test",
  ],
  "X-Ray": [
    "x-ray", "xray", "scan", "fracture", "ct scan", "mri", "broken bone",
    "injury scan", "sprain",
  ],
};

const deptToIssueLabel = Object.fromEntries(
  Object.entries(issueToDept).map(([label, dept]) => [dept, label])
);

const allKeywords = Object.entries(symptomToDept).flatMap(([dept, words]) =>
  words.map((word) => ({ word, dept }))
);

function matchDeptFromQuery(q) {
  const query = q.trim().toLowerCase();
  if (!query) return null;
  const hit = allKeywords.find(
    ({ word }) => query === word || query.includes(word) || word.includes(query)
  );
  return hit ? hit.dept : null;
}

function suggestionsFromQuery(q) {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const seenDepts = new Set();
  const matches = [];
  for (const { word, dept } of allKeywords) {
    if (word.includes(query) && !seenDepts.has(dept)) {
      seenDepts.add(dept);
      matches.push({ word, dept });
    }
  }
  return matches.slice(0, 5);
}

const sortOptions = [
  { key: "best", label: "Best match", icon: Sparkles },
  { key: "distance", label: "Nearest", icon: Navigation },
  { key: "wait", label: "Fastest", icon: Clock },
  { key: "cost", label: "Cheapest", icon: Wallet },
];

const PAGE_SIZE = 5;
const FALLBACK_LOCATION = { lat: 13.0827, lng: 80.2707 };

function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// yyyy-mm-dd for today, in local time — slots are same-day only, so this is
// always what gets sent, never user-editable.
function todayISO() {
  const d = new Date();
  const tzOffsetMs = d.getTimezoneOffset() * 60000;
  return new Date(d - tzOffsetMs).toISOString().slice(0, 10);
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Mirrors the backend's parseTimeSlot() exactly, so a slot string like
// "09:00–12:00" or "09:00 - 12:00" is split into the same
// { start, end } shape the server parses dept.timeSlots into when it
// checks appointmentStart/appointmentEnd against them. Sending the raw
// combined string (or a made-up field name) never matched — the backend
// only ever reads appointmentStart and appointmentEnd separately.
function parseTimeSlot(slot) {
  if (!slot) return null;
  const text = String(slot).trim().replace(/-/g, "–");
  const parts = text.split("–").map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 2) return null;
  return { start: parts[0], end: parts[1] };
}

export default function FindHospital({ user, onBack, onBooked }) {
  const [query, setQuery] = useState("");
  const [issue, setIssue] = useState("");
  const [symptomText, setSymptomText] = useState("");
  const [location, setLocation] = useState(null);
  const [sort, setSort] = useState("best");
  const [results, setResults] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState(null);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");

  const [pendingHospitalId, setPendingHospitalId] = useState(null);
  const [forWhom, setForWhom] = useState("self");
  const [otherName, setOtherName] = useState("");
  const [otherAge, setOtherAge] = useState("");
  const [otherGender, setOtherGender] = useState("");
  const [otherPhone, setOtherPhone] = useState("");
  const [otherRelation, setOtherRelation] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");

  const suggestions = useMemo(() => suggestionsFromQuery(query), [query]);

  function getLocation() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(FALLBACK_LOCATION);
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(FALLBACK_LOCATION),
        { timeout: 4000 }
      );
    });
  }

  async function runSearch(dept, sortKey, loc) {
    setLoading(true);
    setError("");
    try {
      const data = await api.searchHospitals(dept, loc.lat, loc.lng, sortKey);
      setResults(data);
      setVisibleCount(PAGE_SIZE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function selectDept(dept, symptomLabel) {
    setSearchError("");
    setIssue(deptToIssueLabel[dept] || dept);
    setSymptomText(symptomLabel || deptToIssueLabel[dept] || dept);
    setSort("best");
    const loc = location || (await getLocation());
    if (!location) setLocation(loc);
    runSearch(dept, "best", loc);
  }

  async function selectTile(opt) {
    setQuery("");
    await selectDept(issueToDept[opt], opt);
  }

  async function selectSuggestion(word, dept) {
    setQuery(word);
    await selectDept(dept, word);
  }

  async function submitSearch(e) {
    e?.preventDefault();
    const dept = matchDeptFromQuery(query);
    if (!dept) {
      setSearchError(
        "Couldn't match that to a department — try a tile below, or a word like \"fever\", \"chest pain\", \"blood test\", \"x-ray\"."
      );
      return;
    }
    await selectDept(dept, query.trim());
  }

  function changeSort(key) {
    setSort(key);
    if (issue && location) runSearch(issueToDept[issue] || matchDeptFromQuery(symptomText), key, location);
  }

  const visibleResults = results.slice(0, visibleCount);
  const hasMore = visibleCount < results.length;

  function openWhoFor(hospitalId, slots = []) {
    setPendingHospitalId(hospitalId);
    setForWhom("self");
    setOtherName("");
    setOtherAge("");
    setOtherGender("");
    setOtherPhone("");
    setOtherRelation("");
    setSelectedSlot(slots.length === 1 ? slots[0] : "");
    setError("");
  }

  function closeWhoFor() {
    setPendingHospitalId(null);
  }

  async function confirmBooking(needsSlotChoice) {
    if (forWhom === "other" && !otherName.trim()) {
      setError("Enter the patient's name.");
      return;
    }
    if (needsSlotChoice && !selectedSlot) {
      setError("Please select an appointment time slot.");
      return;
    }
    const parsed = parseTimeSlot(selectedSlot);
    if (!parsed) {
      setError("Please select an appointment time slot.");
      return;
    }

    setBookingId(pendingHospitalId);
    setError("");
    try {
      const dept = issueToDept[issue] || matchDeptFromQuery(symptomText) || matchDeptFromQuery(issue);

      const patientPayload =
        forWhom === "self"
          ? {
              patientName: user.name,
              patientAge: calcAge(user.dateOfBirth),
              patientGender: user.gender || "",
              patientPhone: user.phone || "",
              patientVillage: user.village || "",
              relation: "Self",
            }
          : {
              patientName: otherName.trim(),
              patientAge: otherAge ? Number(otherAge) : null,
              patientGender: otherGender || "",
              patientPhone: otherPhone || user.phone || "",
              patientVillage: user.village || "",
              relation: otherRelation || "Family member",
            };

      await api.createBooking({
        patientUid: user.firebaseUid,
        bookedByName: user.name,
        symptom: symptomText || issue,
        hospitalId: pendingHospitalId,
        department: dept,
        appointmentDate: todayISO(),
        appointmentStart: parsed.start,
        appointmentEnd: parsed.end,
        source: "online",
        ...patientPayload,
      });
      setPendingHospitalId(null);
      onBooked();
    } catch (err) {
      setError(err.message);
    } finally {
      setBookingId(null);
    }
  }

  const inputClass =
    "w-full border border-[#C7D6DE] rounded-xl px-4 py-2.5 text-sm text-[#0E2233] bg-[#FAFCFD] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F] focus:bg-white placeholder:text-[#9AAAB6]";
  const smallInputClass =
    "w-full border border-[#C7D6DE] rounded-lg px-3 py-2 text-xs text-[#0E2233] bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F]";

  return (
    <div className="min-h-screen w-full bg-[#EFF5F8]">
      <div className="mx-auto max-w-[640px] px-5 sm:px-0 py-10 space-y-5">
        <div className="bg-white border border-[#C7D6DE] rounded-2xl shadow-sm shadow-[#0E2233]/5 p-6 sm:p-8 space-y-6">
          <div>
            {/* Back sits inline with the heading now, same pattern as Profile */}
            <div className="flex items-center gap-3 mb-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#C7D6DE] text-[#45586B] transition-all duration-200 hover:-translate-x-0.5 hover:border-[#0B6E8F] hover:text-[#0B6E8F] hover:shadow-sm"
                  title="Back"
                >
                  <ArrowLeft size={16} className="transition-transform duration-200 group-hover:-translate-x-0.5" />
                </button>
              )}
              <h2
                style={{ fontFamily: "'Fraunces', serif" }}
                className="text-[20px] font-medium text-[#0E2233] transition-colors duration-200 hover:text-[#0B6E8F]"
              >
                What's going on?
              </h2>
            </div>
            <form onSubmit={submitSearch} className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AAAB6]" />
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSearchError("");
                }}
                placeholder="Describe your issue — e.g. fever, chest pain, blood test"
                className={`${inputClass} pl-10`}
              />
            </form>

            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {suggestions.map(({ word, dept }) => (
                  <button
                    key={word}
                    onClick={() => selectSuggestion(word, dept)}
                    className="text-xs px-3 py-1.5 rounded-full border border-[#C7D6DE] text-[#45586B] transition-all duration-200 hover:border-[#0B6E8F] hover:text-[#0B6E8F] hover:-translate-y-0.5"
                  >
                    {word} <span className="text-[#9AAAB6]">· {dept}</span>
                  </button>
                ))}
              </div>
            )}
            {searchError && <p className="text-xs text-[#A8441A] mt-2">{searchError}</p>}
          </div>

          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#084F68] mb-3">
              Or pick a category
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(issueToDept).map((opt) => {
                const Icon = deptIcon[issueToDept[opt]];
                const active = issue === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => selectTile(opt)}
                    className={`flex flex-col items-start gap-2.5 border rounded-xl p-4 text-left transition-all duration-200 ${
                      active
                        ? "border-[#0B6E8F] bg-[#E3EDF2] shadow-sm"
                        : "border-[#C7D6DE] bg-white hover:border-[#0B6E8F]/50 hover:-translate-y-0.5 hover:shadow-sm"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        active ? "bg-[#0B6E8F] text-white" : "bg-[#E3EDF2] text-[#45586B]"
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <span className="text-xs font-semibold leading-tight text-[#0E2233]">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {error && !pendingHospitalId && (
          <div className="flex items-start gap-2 rounded-xl border border-[#A8441A]/25 bg-[#A8441A]/5 px-4 py-3 text-sm text-[#A8441A]">
            {error}
          </div>
        )}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-[#45586B] px-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0B6E8F] animate-pulse" />
            Checking live availability…
          </div>
        )}

        {!loading && issue && results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-1.5 text-xs text-[#45586B]">
                <Circle size={6} className="fill-[#0B6E8F] text-[#0B6E8F] animate-pulse" />
                Live availability for {issueToDept[issue] || symptomText} · {results.length} hospitals found
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {sortOptions.map(({ key, label, icon: Icon }) => {
                const active = sort === key;
                return (
                  <button
                    key={key}
                    onClick={() => changeSort(key)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-semibold border transition-all duration-200 ${
                      active
                        ? "bg-[#0B6E8F] border-[#0B6E8F] text-white shadow-sm shadow-[#0B6E8F]/25"
                        : "bg-white border-[#C7D6DE] text-[#45586B] hover:border-[#0B6E8F]/50 hover:-translate-y-0.5"
                    }`}
                  >
                    <Icon size={13} /> {label}
                  </button>
                );
              })}
            </div>

            {visibleResults.map((r) => {
              const slots = r.department?.timeSlots || [];
              const needsSlotChoice = slots.length > 1;

              return (
                <div
                  key={r.id}
                  className="bg-white border border-[#C7D6DE] rounded-2xl shadow-sm shadow-[#0E2233]/5 p-5 sm:p-6 transition-shadow duration-200 hover:shadow-md hover:shadow-[#0E2233]/8"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-[14px] text-[#0E2233]">{r.name}</div>
                      <div className="text-xs text-[#45586B] flex items-center gap-1 mt-1">
                        <MapPin size={12} /> {r.area}
                        {r.distanceKm != null && ` · ${r.distanceKm} km`}
                      </div>
                    </div>
                    {r.department && <Badge status={r.department.status} />}
                  </div>
                  {r.department && (
                    <>
                      <div className="flex items-center gap-4 text-xs text-[#45586B] mb-2.5">
                        <span className="flex items-center gap-1">
                          <IndianRupee size={12} /> {r.department.costRange}
                        </span>
                        {r.department.estimatedWaitMinutes != null ? (
                          <span className="flex items-center gap-1 text-[#B5750F] font-semibold">
                            <Clock size={12} /> ~{r.department.estimatedWaitMinutes} min wait
                          </span>
                        ) : (
                          <span className="text-[#A8441A] font-semibold">No slots open now</span>
                        )}
                      </div>

                      {(r.department.doctorName || slots.length > 0) && (
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#45586B] mb-3">
                          {r.department.doctorName && (
                            <span className="flex items-center gap-1">
                              <User size={12} /> {r.department.doctorName}
                            </span>
                          )}
                          {slots.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock size={12} /> {slots.join(" · ")}
                            </span>
                          )}
                        </div>
                      )}

                      {(r.phone || r.description) && (
                        <div className="border-t border-[#EFF5F8] pt-3 mb-4 space-y-1.5">
                          {r.phone && (
                            <div className="flex items-center gap-1.5 text-[11px] text-[#45586B]">
                              <Phone size={12} /> {r.phone}
                            </div>
                          )}
                          {r.description && (
                            <div className="flex items-start gap-1.5 text-[11px] text-[#45586B]">
                              <Info size={12} className="mt-0.5 shrink-0" /> {r.description}
                            </div>
                          )}
                        </div>
                      )}

                      {pendingHospitalId === r.id ? (
                        <div className="border border-[#0B6E8F]/25 bg-[#E3EDF2] rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-[#0E2233] flex items-center gap-1.5">
                              <Users size={14} className="text-[#0B6E8F]" /> Who is this booking for?
                            </span>
                            <button
                              onClick={closeWhoFor}
                              className="text-[#45586B] hover:text-[#0E2233] transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => setForWhom("self")}
                              className={`flex-1 text-xs font-semibold rounded-lg py-2 border transition-colors duration-200 ${
                                forWhom === "self"
                                  ? "bg-[#0B6E8F] border-[#0B6E8F] text-white"
                                  : "bg-white border-[#C7D6DE] text-[#45586B]"
                              }`}
                            >
                              Myself
                            </button>
                            <button
                              onClick={() => setForWhom("other")}
                              className={`flex-1 text-xs font-semibold rounded-lg py-2 border transition-colors duration-200 ${
                                forWhom === "other"
                                  ? "bg-[#0B6E8F] border-[#0B6E8F] text-white"
                                  : "bg-white border-[#C7D6DE] text-[#45586B]"
                              }`}
                            >
                              Someone else
                            </button>
                          </div>

                          {forWhom === "self" ? (
                            <div className="text-xs text-[#45586B] bg-white border border-[#C7D6DE] rounded-lg px-3 py-2.5">
                              {user.name}
                              {calcAge(user.dateOfBirth) != null ? `, ${calcAge(user.dateOfBirth)}` : ""}
                              {user.gender ? `, ${user.gender}` : ""}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <input
                                value={otherName}
                                onChange={(e) => setOtherName(e.target.value)}
                                placeholder="Patient's full name"
                                className={smallInputClass}
                              />
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  value={otherAge}
                                  onChange={(e) => setOtherAge(e.target.value)}
                                  type="number"
                                  min="0"
                                  max="120"
                                  placeholder="Age"
                                  className={smallInputClass}
                                />
                                <select
                                  value={otherGender}
                                  onChange={(e) => setOtherGender(e.target.value)}
                                  className={`${smallInputClass} bg-white`}
                                >
                                  <option value="">Gender</option>
                                  <option value="male">Male</option>
                                  <option value="female">Female</option>
                                  <option value="other">Other</option>
                                </select>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={otherRelation}
                                  onChange={(e) => setOtherRelation(e.target.value)}
                                  className={`${smallInputClass} bg-white`}
                                >
                                  <option value="">Relation</option>
                                  <option value="Mother">Mother</option>
                                  <option value="Father">Father</option>
                                  <option value="Spouse">Spouse</option>
                                  <option value="Child">Child</option>
                                  <option value="Sibling">Sibling</option>
                                  <option value="Other">Other</option>
                                </select>
                                <input
                                  value={otherPhone}
                                  onChange={(e) => setOtherPhone(e.target.value)}
                                  placeholder="Their phone (optional)"
                                  className={smallInputClass}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 text-xs text-[#45586B] bg-white border border-[#C7D6DE] rounded-lg px-3 py-2.5">
                            <Calendar size={13} className="text-[#0B6E8F]" />
                            Today, {todayLabel()}
                          </div>

                          {needsSlotChoice ? (
                            <div>
                              <label className="text-[11px] font-semibold text-[#45586B] mb-1.5 flex items-center gap-1.5">
                                <Clock size={13} /> Pick a time slot
                              </label>
                              <div className="flex flex-wrap gap-1.5">
                                {slots.map((slot) => {
                                  const active = selectedSlot === slot;
                                  return (
                                    <button
                                      key={slot}
                                      type="button"
                                      onClick={() => setSelectedSlot(slot)}
                                      className={`text-xs font-semibold rounded-full px-3.5 py-1.5 border transition-all duration-200 ${
                                        active
                                          ? "bg-[#0B6E8F] border-[#0B6E8F] text-white"
                                          : "bg-white border-[#C7D6DE] text-[#45586B] hover:border-[#0B6E8F] hover:text-[#0B6E8F]"
                                      }`}
                                    >
                                      {slot}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            slots.length === 1 && (
                              <div className="flex items-center gap-1.5 text-xs text-[#45586B] bg-white border border-[#C7D6DE] rounded-lg px-3 py-2.5">
                                <Clock size={13} className="text-[#0B6E8F]" />
                                {slots[0]}
                              </div>
                            )
                          )}

                          {error && (
                            <div className="flex items-start gap-2 rounded-lg border border-[#A8441A]/25 bg-[#A8441A]/5 px-3 py-2 text-xs text-[#A8441A]">
                              {error}
                            </div>
                          )}

                          <button
                            onClick={() => confirmBooking(needsSlotChoice)}
                            disabled={bookingId === r.id}
                            className="w-full rounded-lg py-3 text-xs font-bold bg-[#0B6E8F] hover:bg-[#084F68] text-white transition-all duration-200 hover:shadow-md hover:shadow-[#0B6E8F]/25 disabled:opacity-60"
                          >
                            {bookingId === r.id ? "Booking…" : "Confirm booking"}
                          </button>
                        </div>
                      ) : (
                        <button
                          disabled={r.department.status === "full"}
                          onClick={() => openWhoFor(r.id, slots)}
                          className={`w-full rounded-xl py-3 text-sm font-bold transition-all duration-200 ${
                            r.department.status === "full"
                              ? "bg-[#E3EDF2] text-[#9AAAB6] cursor-not-allowed"
                              : "bg-[#0B6E8F] hover:bg-[#084F68] text-white hover:shadow-md hover:shadow-[#0B6E8F]/25"
                          }`}
                        >
                          {r.department.status === "full" ? "Full — try another hospital" : "Book this slot"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {hasMore && (
              <button
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-[#0B6E8F] border border-dashed border-[#0B6E8F]/40 rounded-2xl py-3.5 transition-all duration-200 hover:bg-[#E3EDF2] hover:border-[#0B6E8F]"
              >
                Show {Math.min(PAGE_SIZE, results.length - visibleCount)} more option
                {results.length - visibleCount > 1 ? "s" : ""} <ChevronDown size={14} />
              </button>
            )}
          </div>
        )}

        {!loading && issue && results.length === 0 && (
          <p className="text-sm text-[#45586B] px-1">
            No hospitals currently offer {issueToDept[issue] || symptomText} nearby. Try another need.
          </p>
        )}
      </div>
    </div>
  );
}