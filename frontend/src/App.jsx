import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { watchAuth, logOut } from "./firebase.js";
import { api } from "./api.js";
import Shell from "./components/Shell.jsx";
import Landing from "./pages/Landing.jsx";
import Auth from "./pages/Auth.jsx";
import HospitalAuth from "./pages/HospitalAuth.jsx";
import RoleSelect from "./pages/RoleSelect.jsx";
import PatientHome from "./pages/PatientHome.jsx";
import FindHospital from "./pages/FindHospital.jsx";
import HospitalAdmin from "./pages/HospitalAdmin.jsx";
import Profile from "./pages/Profile.jsx";

export default function App() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState(null); // MongoDB user profile (has .role)
  const [screen, setScreen] = useState("patientHome"); // patientHome | find | profile
  const [authIntent, setAuthIntent] = useState(null); // null | "patient" | "hospital" — picked on the landing screen
  const [toast, setToast] = useState(null);

  // Both auth screens (patient sign-up/login and hospital sign-in) render
  // their own centered logo inline above the heading, so the shared Shell
  // header should get out of the way for them — no boxed white bar, no
  // extra top padding.
  const isAuthScreen = !user && (authIntent === "patient" || authIntent === "hospital");

  // Profile and FindHospital both render their own local page chrome
  // (back button inline with their heading, full-width self-contained
  // layout), so the shared Shell header/main padding should get out of
  // the way here too — same reasoning as isAuthScreen above.
  const isProfileScreen = user && user.role === "patient" && screen === "profile";
  const isFindScreen = user && user.role === "patient" && screen === "find";

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  // Hospital accounts don't use Firebase (they log in with license ID +
  // registered email), so their session is kept in localStorage instead.
  function persistHospitalSession(hospitalUser) {
    localStorage.setItem("livebed_hospital_user", JSON.stringify(hospitalUser));
    setUser(hospitalUser);
  }

  // On load, check if Firebase already has a logged-in session and, if so,
  // fetch the matching MongoDB profile so we skip straight past the auth screen.
  // Patients are Firebase-backed; hospitals are restored from localStorage.
  useEffect(() => {
    const savedHospital = localStorage.getItem("livebed_hospital_user");
    if (savedHospital) {
      try {
        setUser(JSON.parse(savedHospital));
      } catch {
        localStorage.removeItem("livebed_hospital_user");
      }
      setCheckingAuth(false);
      return;
    }

    const unsub = watchAuth(async (fbUser) => {
      if (fbUser) {
        try {
          const profile = await api.getUser(fbUser.uid);
          setUser(profile);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setCheckingAuth(false);
    });
    return unsub;
  }, []);

  async function handleLogout() {
    localStorage.removeItem("livebed_hospital_user");
    await logOut().catch(() => {});
    setUser(null);
    setScreen("patientHome");
    setAuthIntent(null);
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-stone-400 bg-[#F7F6F2]">
        Loading…
      </div>
    );
  }

  return (
    <Shell
      role={user?.role}
      onLogout={user ? handleLogout : null}
      fullWidth={!user && !authIntent}
      bleed={(!user && !authIntent) || isProfileScreen || isFindScreen}
      wide={!!user}
      onGetStarted={() => setAuthIntent("patient")}
      onProfile={
        user && user.role === "patient" && screen !== "profile"
          ? () => setScreen("profile")
          : null
      }
      noHeader={isAuthScreen || isProfileScreen || isFindScreen}
      compact={isAuthScreen}
    >
      {!user && !authIntent && <Landing onSelect={setAuthIntent} />}

      {!user && authIntent === "patient" && (
        <Auth onAuthed={setUser} onBack={() => setAuthIntent(null)} />
      )}

      {!user && authIntent === "hospital" && (
        <HospitalAuth onAuthed={persistHospitalSession} onBack={() => setAuthIntent(null)} />
      )}

      {user && !user.role && <RoleSelect user={user} onRolePicked={setUser} />}

      {user && user.role === "patient" && screen === "patientHome" && (
        <PatientHome
          user={user}
          onFind={() => setScreen("find")}
          onProfile={() => setScreen("profile")}
          showToast={showToast}
        />
      )}

      {user && user.role === "patient" && screen === "profile" && (
        <Profile
          user={user}
          onBack={() => setScreen("patientHome")}
          onLogout={handleLogout}
          onSaved={(updated) => {
            setUser(updated);
            showToast("Profile saved");
            setScreen("patientHome");
          }}
        />
      )}

      {user && user.role === "patient" && screen === "find" && (
        <FindHospital
          user={user}
          onBack={() => setScreen("patientHome")}
          onBooked={() => {
            showToast("Booked — slot reserved for you");
            setScreen("patientHome");
          }}
        />
      )}

      {user && user.role === "hospital" && <HospitalAdmin user={user} showToast={showToast} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 z-50">
          <Check size={14} className="text-emerald-400" />
          {toast}
        </div>
      )}
    </Shell>
  );
}