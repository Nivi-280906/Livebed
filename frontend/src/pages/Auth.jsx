import { useState } from "react";
import { ArrowLeft, ShieldCheck, BadgeCheck } from "lucide-react";
import { signUp, logIn } from "../firebase.js";
import { api } from "../api.js";
import Logo from "../components/Logo"; // adjust path if your Logo.jsx lives elsewhere

/**
 * Render this page as:
 *   <Shell noHeader compact onBack={...}>
 *     <Auth onAuthed={...} onBack={...} />
 *   </Shell>
 *
 * NOTE: fontFamily on the h1 below is still a guess ('Fraunces'). Send me
 * your index.html font <link> (or tailwind.config.js fontFamily, or
 * Landing.jsx) and I'll swap it for the real value instead of approximating.
 */
export default function Auth({ onAuthed, onBack }) {
  const [mode, setMode] = useState("signup"); // signup | login
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let cred;
      if (mode === "signup") {
        cred = await signUp(email, password);
      } else {
        cred = await logIn(email, password);
      }
      const user = await api.syncUser({
        firebaseUid: cred.user.uid,
        name: name || cred.user.email,
        phone,
        email: cred.user.email,
        role: "patient",
      });
      onAuthed(user);
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next) {
    if (next === mode) return;
    setMode(next);
    setError("");
  }

  return (
    <div
      className="space-y-4"
      style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}
    >
      <style>{`
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #FFFFFF inset;
          -webkit-text-fill-color: #0E2233;
          transition: background-color 9999s ease-in-out 0s;
        }
      `}</style>

      {/* logo, Back, heading — Back is corner-pinned so it doesn't add its own row */}
      <div className="text-center relative">
        {onBack && (
          <button
            onClick={onBack}
            className="absolute left-0 top-0 inline-flex items-center gap-1.5 rounded-full bg-white border border-[#C7D6DE] pl-2.5 pr-3.5 py-1.5 text-xs font-semibold text-[#45586B] shadow-sm hover:text-[#0B6E8F] hover:border-[#0B6E8F]/40 transition-colors"
          >
            <ArrowLeft size={13} />
            Back
          </button>
        )}

        <div className="flex justify-center">
          <Logo size={40} />
        </div>

        <h1
          style={{ fontFamily: "'Fraunces', serif" }}
          className="text-[1.75rem] font-medium tracking-tight text-[#0E2233] mt-3"
        >
          {mode === "signup" ? (
            <>Create your account</>
          ) : (
            <>
              Welcome <em className="italic text-[#0B6E8F]">back</em>
            </>
          )}
        </h1>
      </div>

      <div className="bg-white border border-[#C7D6DE] rounded-2xl shadow-[0_1px_2px_rgba(14,34,51,0.04),0_16px_32px_-20px_rgba(14,34,51,0.25)] overflow-hidden">
        <div className="p-5 pb-0">
          <div className="grid grid-cols-2 gap-1 rounded-full bg-[#EFF5F8] p-1">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`rounded-full py-2.5 text-sm font-semibold transition-colors ${
                mode === "login"
                  ? "bg-[#0B6E8F] text-white shadow-sm"
                  : "text-[#45586B] hover:text-[#0E2233]"
              }`}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`rounded-full py-2.5 text-sm font-semibold transition-colors ${
                mode === "signup"
                  ? "bg-[#0B6E8F] text-white shadow-sm"
                  : "text-[#45586B] hover:text-[#0E2233]"
              }`}
            >
              Sign up
            </button>
          </div>
        </div>

        <div className="p-6 pt-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="text-xs font-medium text-[#45586B] mb-1.5 block">Full name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    required
                    className="w-full border border-[#C7D6DE] bg-white rounded-xl px-4 py-2.5 text-sm text-[#0E2233] placeholder:text-[#45586B]/50 focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/30 focus:border-[#0B6E8F] transition-shadow"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#45586B] mb-1.5 block">Phone number</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="For hospitals to reach you"
                    className="w-full border border-[#C7D6DE] bg-white rounded-xl px-4 py-2.5 text-sm text-[#0E2233] placeholder:text-[#45586B]/50 focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/30 focus:border-[#0B6E8F] transition-shadow"
                  />
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-medium text-[#45586B] mb-1.5 block">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                type="email"
                required
                className="w-full border border-[#C7D6DE] bg-white rounded-xl px-4 py-2.5 text-sm text-[#0E2233] placeholder:text-[#45586B]/50 focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/30 focus:border-[#0B6E8F] transition-shadow"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[#45586B] mb-1.5 block">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                type="password"
                required
                minLength={6}
                className="w-full border border-[#C7D6DE] bg-white rounded-xl px-4 py-2.5 text-sm text-[#0E2233] placeholder:text-[#45586B]/50 focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/30 focus:border-[#0B6E8F] transition-shadow"
              />
            </div>

            {error && (
              <p className="text-sm text-[#B3261E] bg-[#FBEAE9] border border-[#F2C9C6] rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0B6E8F] hover:bg-[#084F68] disabled:opacity-60 text-white rounded-full py-3 text-sm font-bold transition-colors mt-2"
            >
              {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
            </button>
          </form>
        </div>
      </div>

      <div className="flex items-center justify-center gap-5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-[#45586B]">
          <BadgeCheck size={14} className="text-[#0B6E8F]" />
          No booking fees
        </span>
        <span className="h-3 w-px bg-[#C7D6DE]" />
        <span className="flex items-center gap-1.5 text-xs font-medium text-[#45586B]">
          <ShieldCheck size={14} className="text-[#0B6E8F]" />
          License-verified hospitals
        </span>
      </div>
    </div>
  );
}