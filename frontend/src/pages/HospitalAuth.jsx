import { useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { api } from "../api.js";
import Logo from "../components/Logo";

export default function HospitalAuth({ onAuthed, onBack }) {
  const [mode, setMode] = useState("signup"); // signup | login

  const [licenseNumber, setLicenseNumber] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [managerName, setManagerName] = useState("");
  const [phone, setPhone] = useState("");

  const [loginLicense, setLoginLicense] = useState("");
  const [loginEmail, setLoginEmail] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await api.claimHospital({
        licenseNumber: licenseNumber.trim(),
        name: managerName.trim(),
        phone: phone.trim(),
        email: signupEmail.trim(),
      });
      onAuthed(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await api.loginHospital(loginLicense.trim(), loginEmail.trim());
      onAuthed(user);
    } catch (err) {
      setError(err.message);
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
            <>Register your hospital</>
          ) : (
            <>
              Hospital <em className="italic text-[#0B6E8F]">login</em>
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
          {mode === "signup" ? (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#45586B] mb-1.5 block">Hospital license ID</label>
                <input
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. TN-HOSP-2026-001"
                  required
                  className="w-full border border-[#C7D6DE] bg-white rounded-xl px-4 py-2.5 text-sm text-[#0E2233] placeholder:text-[#45586B]/50 focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/30 focus:border-[#0B6E8F] transition-shadow"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#45586B] mb-1.5 block">Registered email</label>
                <input
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="admin@yourhospital.in"
                  type="email"
                  required
                  className="w-full border border-[#C7D6DE] bg-white rounded-xl px-4 py-2.5 text-sm text-[#0E2233] placeholder:text-[#45586B]/50 focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/30 focus:border-[#0B6E8F] transition-shadow"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#45586B] mb-1.5 block">Your name</label>
                <input
                  value={managerName}
                  onChange={(e) => setManagerName(e.target.value)}
                  placeholder="Manager / CEO"
                  required
                  className="w-full border border-[#C7D6DE] bg-white rounded-xl px-4 py-2.5 text-sm text-[#0E2233] placeholder:text-[#45586B]/50 focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/30 focus:border-[#0B6E8F] transition-shadow"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#45586B] mb-1.5 block">Phone number</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contact number"
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
                {loading ? "Please wait…" : "Create hospital account"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-[#45586B] mb-1.5 block">Hospital license ID</label>
                <input
                  value={loginLicense}
                  onChange={(e) => setLoginLicense(e.target.value)}
                  placeholder="e.g. TN-HOSP-2026-001"
                  required
                  className="w-full border border-[#C7D6DE] bg-white rounded-xl px-4 py-2.5 text-sm text-[#0E2233] placeholder:text-[#45586B]/50 focus:outline-none focus:ring-2 focus:ring-[#0B6E8F]/30 focus:border-[#0B6E8F] transition-shadow"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-[#45586B] mb-1.5 block">Registered email</label>
                <input
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@yourhospital.in"
                  type="email"
                  required
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
                {loading ? "Please wait…" : "Log in"}
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-[#45586B]">
          <ShieldCheck size={14} className="text-[#0B6E8F]" />
          License-verified hospitals only
        </span>
      </div>
    </div>
  );
}