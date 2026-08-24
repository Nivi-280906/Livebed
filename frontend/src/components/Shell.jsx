import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import Logo from "./Logo";

const NAV_SECTIONS = [
  { id: "home", label: "Home" },
  { id: "how-it-works", label: "How it works" },
  { id: "for-hospitals", label: "For Hospitals" },
];

export default function Shell({
  role,
  onLogout,
  fullWidth,
  wide,
  bleed,
  onGetStarted,
  logoSize,
  plainHeader,
  noHeader,
  compact,
  children,
}) {
  const [active, setActive] = useState("home");

  useEffect(() => {
    if (!fullWidth) return;

    function onScroll() {
      const triggerY = window.scrollY + 140;
      let currentId = NAV_SECTIONS[0].id;

      for (const section of NAV_SECTIONS) {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top + window.scrollY <= triggerY) {
          currentId = section.id;
        }
      }

      setActive(currentId);
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [fullWidth]);

  function scrollToId(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  const resolvedLogoSize = logoSize ?? 40;
  const containerMaxWidth = fullWidth ? "max-w-[1040px]" : wide ? "max-w-[1200px]" : "max-w-[720px]";

  return (
    <div className="min-h-screen w-full bg-[#EFF5F8]">
      {/* =====================================================
          PUBLIC HEADER
      ===================================================== */}
      {!noHeader && fullWidth && (
        <header
          className={`sticky top-0 z-50 w-full ${
            plainHeader ? "bg-[#EFF5F8]" : "bg-white border-b border-[#C7D6DE]"
          }`}
        >
          <div className="h-14 flex items-center justify-between">
            <button onClick={() => scrollToId("home")} className="flex items-center gap-2 pl-5">
              <Logo size={resolvedLogoSize} />
            </button>

            <nav className="flex items-center gap-9 pr-5">
              <div className="hidden sm:flex items-center gap-9">
                {NAV_SECTIONS.map((section) => {
                  const isActive = active === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToId(section.id)}
                      className="relative pb-1 text-sm transition-colors"
                    >
                      <span
                        className={
                          isActive
                            ? "font-semibold text-[#0B6E8F]"
                            : "font-medium text-[#45586B] hover:text-[#0E2233]"
                        }
                      >
                        {section.label}
                      </span>
                      {isActive && (
                        <span className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-[#0B6E8F] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>

              {onGetStarted && (
                <button
                  onClick={onGetStarted}
                  className="bg-[#0B6E8F] hover:bg-[#084F68] text-white text-sm font-bold rounded-full px-6 py-2.5 transition-colors"
                >
                  Get started
                </button>
              )}
            </nav>
          </div>
        </header>
      )}

      {/* =====================================================
          PATIENT / HOSPITAL HEADER

          w-full with no max-width wrapper, so the logo sits at the true
          left edge of the screen and the log-out button at the true right
          edge — not the edges of the centered content column below it.
          Not fixed/sticky, same background as the page, so it doesn't
          look like a separate bar.
      ===================================================== */}
      {!noHeader && !fullWidth && (
        <header className="w-full bg-[#EFF5F8]">
          <div className="h-20 px-5 sm:px-7 flex items-center justify-between">
            {/* Logo — pinned to the true top-left corner */}
            <button onClick={() => scrollToId("home")} className="flex items-center gap-2.5" title="Home">
              <Logo size={resolvedLogoSize} />
              {role && (
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[#084F68] bg-[#E3EDF2] rounded-full px-2.5 py-1">
                  {role === "patient" ? "Patient" : "Hospital"}
                </span>
              )}
            </button>

            {/* Logout — pinned to the true top-right corner.
                White background with a teal border/text so it stays
                on-brand but reads as its own distinct action against
                the teal banner and icon tiles below it. */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="inline-flex items-center gap-2 bg-white text-[#0B6E8F] border-2 border-transparent hover:border-[#0B6E8F] text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-colors"
                title="Log out"
              >
                <LogOut size={16} />
                <span>Log out</span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* =====================================================
          CONTENT
      ===================================================== */}
      {bleed ? (
        <main className="w-full">{children}</main>
      ) : (
        <main
          className={`${containerMaxWidth} mx-auto px-5 ${
            compact ? "py-3" : fullWidth ? "py-10" : "pt-5 pb-10"
          }`}
        >
          {children}
        </main>
      )}
    </div>
  );
}