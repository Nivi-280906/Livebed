import { useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { api } from "../api.js";

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

export default function Profile({ user, onBack, onSaved, onLogout }) {
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth || "");
  const [gender, setGender] = useState(user.gender || "");
  const [village, setVillage] = useState(user.village || "");
  const [address, setAddress] = useState(user.address || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const age = calcAge(dateOfBirth);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const updated = await api.updateProfile(user.firebaseUid, {
        name,
        phone,
        dateOfBirth,
        gender,
        village,
        address,
      });
      onSaved(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const fieldClass =
    "w-full border border-[#C7D6DE] rounded-xl px-4 py-3 text-sm text-[#0E2233] bg-[#FAFCFD] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/25 focus:border-[#0B6E8F] focus:bg-white placeholder:text-[#9AAAB6]";
  const labelClass = "text-[12px] font-semibold text-[#45586B] mb-1.5 block";

  return (
    <div className="min-h-screen w-full bg-[#EFF5F8]">
      <div className="mx-auto max-w-[640px] px-5 sm:px-0 py-10">
        <div className="bg-white border border-[#C7D6DE] rounded-2xl shadow-sm shadow-[#0E2233]/5 p-6 sm:p-8">
          {/* Back + heading share one row now, with hover motion on both */}
          <div className="flex items-center gap-3 mb-6">
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
              className="text-[22px] font-medium text-[#0E2233] transition-colors duration-200 hover:text-[#0B6E8F]"
            >
              Your profile
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal */}
            <div className="space-y-4">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#084F68]">Personal</div>

              <div>
                <label className={labelClass}>Full name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Date of birth {age != null && <span className="text-[#9AAAB6] font-normal">· age {age}</span>}
                  </label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className={`${fieldClass} bg-[#FAFCFD]`}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4 pt-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#084F68]">Contact</div>

              <div>
                <label className={labelClass}>Phone number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="For the hospital to reach you"
                  className={fieldClass}
                />
              </div>
            </div>

            {/* Location */}
            <div className="space-y-4 pt-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#084F68]">Location</div>

              <div>
                <label className={labelClass}>Village / town / city</label>
                <input
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. T. Nagar, Chennai"
                  className={fieldClass}
                />
              </div>

              <div>
                <label className={labelClass}>Address (optional)</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={3}
                  className={`${fieldClass} resize-none`}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-[#A8441A]/25 bg-[#A8441A]/5 px-4 py-3 text-sm text-[#A8441A]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-[#0B6E8F] hover:bg-[#084F68] disabled:opacity-60 text-white rounded-xl py-3.5 text-sm font-bold transition-all hover:shadow-lg hover:shadow-[#0B6E8F]/25 flex items-center justify-center gap-2"
            >
              <Check size={16} /> {saving ? "Saving…" : "Save profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}