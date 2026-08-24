import { useState } from "react";
import { HeartPulse } from "lucide-react";
import { api } from "../api.js";

// Fallback shown only if a logged-in patient account somehow has no role
// yet (e.g. an older account from before the Landing screen existed).
// New signups pick "patient" vs "hospital" on Landing instead, before they
// even create an account — hospitals register through HospitalAuth.jsx
// (license ID + registered email), which never touches this screen.
export default function RoleSelect({ user, onRolePicked }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function pickPatient() {
    setError("");
    setLoading(true);
    try {
      const updated = await api.setRole(user.firebaseUid, "patient");
      onRolePicked(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-medium tracking-tight px-1">One more thing</h1>
      <p className="text-sm text-stone-500 px-1 mb-2">
        Continue as a patient to find live availability and book a slot.
      </p>

      <button
        onClick={pickPatient}
        disabled={loading}
        className="w-full text-left bg-white border border-stone-200 hover:border-teal-600 rounded-2xl p-5 flex items-center gap-4 transition-colors disabled:opacity-60"
      >
        <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
          <HeartPulse size={20} />
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm">Continue as a patient</div>
          <p className="text-xs text-stone-500 mt-0.5">
            {loading ? "Setting up your account…" : "Find live availability and book a slot."}
          </p>
        </div>
      </button>

      <p className="text-xs text-stone-400 px-1">
        Managing a hospital? Log out and use "I manage a hospital" on the welcome screen instead.
      </p>

      {error && <p className="text-sm text-rose-600 px-1">{error}</p>}
    </div>
  );
}