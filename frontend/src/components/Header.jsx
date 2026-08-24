import { LogOut, UserCircle } from "lucide-react";
import Logo from "./Logo";

export default function Header({ role, onLogout, onProfile }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-2">
        <Logo size={30} />
        {role && (
          <span className="ml-1 text-[11px] uppercase tracking-wide text-[#4B5A66] border border-[#16283A]/10 rounded-full px-2 py-0.5">
            {role === "patient" ? "Patient" : "Hospital"}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        {onProfile && (
          <button onClick={onProfile} className="text-sm text-[#4B5A66] hover:text-[#16283A] flex items-center gap-1.5 transition-colors">
            <UserCircle size={14} /> Profile
          </button>
        )}
        {onLogout && (
          <button onClick={onLogout} className="text-sm text-[#4B5A66] hover:text-[#16283A] flex items-center gap-1.5 transition-colors">
            <LogOut size={14} /> Log out
          </button>
        )}
      </div>
    </div>
  );
}