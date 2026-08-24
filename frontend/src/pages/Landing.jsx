import {
  HeartPulse, Building2, ChevronRight, ShieldCheck, Search, MapPin,
  CalendarCheck, RefreshCw, UserCheck, Lock, Stethoscope, TestTube,
  Radio, Clock, Banknote,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../api.js";
import heroCare from "../assets/hero-care.jpg";
import hospitalDesk from "../assets/hospital-desk.jpg";

/**
 * PALETTE — higher-contrast token set:
 *   bg        #EFF5F8  — page background
 *   surface   #FFFFFF  — cards
 *   tint      #E3EDF2  — section bands (distinct from surface)
 *   border    #C7D6DE  — real, visible borders
 *   ink       #0E2233  — headings / primary text
 *   slate     #45586B  — body copy (7.9:1 on white)
 *   primary   #0B6E8F  — buttons, icons, links
 *   primary-d #084F68  — hover state
 *   accent    #A8441A  — urgency: live pulse, cancellation fills (icon-tile only)
 */

const stats = [
  { value: "10+", label: "Hospitals live" },
  { value: "24/7", label: "Real-time updates" },
  { value: "0", label: "Slots wasted to no-shows" },
  { value: "∞", label: "Departments per hospital" },
];

const steps = [
  { icon: Search, title: "Search by symptom", body: "Type what's wrong — fever, chest pain, a scan — and we match you to the right department." },
  { icon: MapPin, title: "See live availability", body: "Real wait times, cost range, and distance, ranked side by side — not one guess, several options." },
  { icon: CalendarCheck, title: "Book or walk in", body: "Reserve a same-day slot online, or walk in — both draw from the same live queue, fairly." },
];

const hospitalPoints = [
  { icon: RefreshCw, text: "Every cancellation instantly reopens to the next waiting patient" },
  { icon: UserCheck, text: "Register walk-ins in one tap — no manual coordination with reception" },
  { icon: Lock, text: "License-verified — only your hospital's manager or CEO can access its dashboard" },
];

// Matches the actual seeded departments (see backend/seed/seedHospitals.js
// and FindHospital.jsx's deptIcon map) — not a fictional specialty list.
const departments = [
  { name: "General OPD", icon: Stethoscope },
  { name: "Cardiology", icon: HeartPulse },
  { name: "Blood Test", icon: TestTube },
  { name: "X-Ray", icon: Radio },
];

const whyPoints = [
  { icon: Banknote, title: "No booking fees", body: "Patients can search availability and book slots without extra charges." },
  { icon: Clock, title: "Real-time wait times", body: "See live wait times across hospitals before deciding where to go." },
  { icon: CalendarCheck, title: "Same-day slots", body: "Online bookings and walk-ins draw from the same live queue." },
  { icon: ShieldCheck, title: "License-verified", body: "Hospital dashboards are only accessible by verified managers or CEOs." },
];

function SectionHeading({ eyebrow, title, body, align = "center" }) {
  const alignment = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={`${alignment} max-w-[560px] mb-12`}>
      <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#084F68]">
        <span className="h-[2px] w-6 bg-[#0B6E8F]" />
        {eyebrow}
      </div>
      <h2 style={{ fontFamily: "'Fraunces', serif" }} className="mt-3 text-[28px] sm:text-[34px] font-medium tracking-[-0.01em] text-[#0E2233] leading-[1.15]">
        {title}
      </h2>
      {body ? <p className="mt-3 text-[14.5px] leading-relaxed text-[#45586B]">{body}</p> : null}
    </div>
  );
}

function TicketNotches({ top, bg = "#FFFFFF" }) {
  return (
    <>
      <span aria-hidden="true" className="absolute -left-[7px] h-3.5 w-3.5 rounded-full border border-[#C7D6DE]" style={{ top, backgroundColor: bg }} />
      <span aria-hidden="true" className="absolute -right-[7px] h-3.5 w-3.5 rounded-full border border-[#C7D6DE]" style={{ top, backgroundColor: bg }} />
    </>
  );
}

export default function Landing({ onSelect }) {
  const [liveDeptCounts, setLiveDeptCounts] = useState(
    departments.map((d) => ({ ...d, count: 0, status: "loading" })),
  );

  // Real live counts pulled from the backend — falls back to 0 (not stuck
  // "loading") if a request fails, so this section never hangs.
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      departments.map((d) =>
        api
          .searchHospitals(d.name, "", "", "best")
          .then((results) => ({ ...d, count: results.filter((r) => r.available).length, status: "ready" }))
          .catch(() => ({ ...d, count: 0, status: "ready" }))
      )
    ).then((updated) => {
      if (!cancelled) setLiveDeptCounts(updated);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }} className="bg-[#EFF5F8] text-[#0E2233] antialiased selection:bg-[#0B6E8F]/20">
      {/* id="home" — the nav's scrollspy and its "Get started" back-to-top
          target both depend on this exact id existing. */}
      <section id="home" className="relative w-full overflow-hidden bg-gradient-to-br from-[#E3EDF2] via-[#EFF5F8] to-[#DCEAEF] border-b border-[#C7D6DE] pb-20 pt-16 sm:pt-20">
        <div aria-hidden="true" className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#0B6E8F]/10" />
        <div aria-hidden="true" className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-[#A8441A]/8" />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[#0E2233] ring-1 ring-inset ring-[#C7D6DE] shadow-sm">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#A8441A] opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#A8441A]" />
                </span>
                Live right now
              </div>

              <h1 style={{ fontFamily: "'Fraunces', serif" }} className="text-[40px] sm:text-[54px] lg:text-[60px] font-medium tracking-[-0.02em] leading-[1.05] text-[#0E2233]">
                Never wait blind
                <br />
                at a hospital <span className="italic text-[#0B6E8F]">again</span>
              </h1>
              <p className="mt-6 max-w-[460px] text-[16px] sm:text-[17px] leading-relaxed text-[#45586B]">
                See real wait times, book same-day slots, and let hospitals fill every cancelled appointment instantly — before it goes to waste.
              </p>

              <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row">
                <button onClick={() => onSelect("patient")} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#0B6E8F] px-7 py-4 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#084F68] hover:shadow-xl hover:shadow-[#0B6E8F]/25 sm:w-auto">
                  <HeartPulse size={18} className="transition-transform group-hover:scale-110" />
                  I'm a patient
                </button>
                <button onClick={() => onSelect("hospital")} className="group flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0E2233]/25 bg-white px-7 py-4 text-sm font-bold text-[#0E2233] transition-all hover:-translate-y-0.5 hover:border-[#0E2233]/40 hover:shadow-lg sm:w-auto">
                  <Building2 size={18} className="transition-transform group-hover:scale-110" />
                  I manage a hospital
                </button>
              </div>
            </div>

            {/* Real hospital/patient photo — confirmed present at
                src/assets/hero-care.jpg */}
            <div className="relative mx-auto w-full max-w-[460px]">
              <div className="overflow-hidden rounded-[1.75rem] ring-4 ring-white shadow-2xl shadow-[#0E2233]/20">
                <img
                  src={heroCare}
                  alt="A doctor speaking with a patient in a hospital corridor"
                  width={1200}
                  height={1408}
                  className="h-[300px] w-full object-cover sm:h-[420px]"
                />
              </div>

              <div className="absolute -bottom-6 -left-4 flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-xl shadow-[#0E2233]/15 ring-1 ring-[#C7D6DE] sm:-left-7">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B6E8F] text-white">
                  <Clock size={16} />
                </div>
                <div className="text-left">
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[12.5px] font-semibold text-[#0E2233]">
                    Live wait times
                  </div>
                  <div className="text-[11px] text-[#45586B]">Updated continuously</div>
                </div>
              </div>

              <div className="absolute -top-4 -right-3 hidden items-center gap-2 rounded-full bg-white px-4 py-2 shadow-xl shadow-[#0E2233]/15 ring-1 ring-[#C7D6DE] sm:flex">
                <ShieldCheck size={15} className="text-[#0B6E8F]" />
                <span className="text-[11.5px] font-bold text-[#0E2233]">License-verified</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-6 pb-16">
        <section className="relative -mt-10">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-xl border border-[#C7D6DE] bg-white px-5 py-6 text-center shadow-md shadow-[#0E2233]/5">
                <div style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[26px] font-bold tracking-tight text-[#084F68]">
                  {s.value}
                </div>
                <div className="mt-1.5 text-[11.5px] font-semibold leading-tight text-[#45586B]">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="pt-20">
          <SectionHeading eyebrow="Find by department" title="Where do you need to be seen?" body="Real-time availability across every department at connected hospitals — each card is your slot, ready to tear off." />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 items-stretch">
            {liveDeptCounts.map((dept) => {
              const Icon = dept.icon || departments.find((d) => d.name === dept.name)?.icon || Stethoscope;
              return (
                <button key={dept.name} onClick={() => onSelect("patient")} className="group relative flex h-full flex-col items-stretch overflow-hidden rounded-xl border border-[#C7D6DE] bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#0B6E8F] hover:shadow-lg hover:shadow-[#0E2233]/10">
                  <div className="flex flex-1 flex-col items-center gap-2.5 px-4 pt-5 pb-4 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0B6E8F] text-white transition-transform group-hover:scale-105">
                      <Icon size={18} />
                    </div>
                    <div className="text-[13px] font-bold leading-tight text-[#0E2233]">{dept.name}</div>
                  </div>

                  <div className="relative border-t-2 border-dashed border-[#B7C7D1]">
                    <TicketNotches top="-8px" />
                  </div>

                  <div className="bg-[#E3EDF2] px-4 py-3 text-center" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                    {dept.status === "loading" ? (
                      <span className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#45586B]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#45586B]/40 animate-pulse" />
                        Checking…
                      </span>
                    ) : (
                      <span className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#084F68]">
                        <span className="h-1.5 w-1.5 rounded-full bg-[#0B6E8F]" />
                        {dept.count} available
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section id="how-it-works" className="pt-20">
          <SectionHeading eyebrow="How it works" title="From symptom to seen, in three steps" />
          <div className="grid gap-5 sm:grid-cols-3 items-stretch">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="relative flex h-full flex-col rounded-xl border border-[#C7D6DE] bg-white p-6 shadow-sm">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0B6E8F] text-white">
                      <Icon size={18} />
                    </div>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace" }} className="text-[11px] font-bold tracking-widest text-[#0E2233]/35">
                      0{i + 1}
                    </span>
                  </div>
                  <div className="mb-2 text-[15px] font-bold text-[#0E2233]">{s.title}</div>
                  <p className="text-[13.5px] leading-relaxed text-[#45586B]">{s.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="pt-20">
          <SectionHeading eyebrow="Why LiveBed" title="Built for trust, speed, and fairness" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
            {whyPoints.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="flex h-full flex-col rounded-xl border border-[#C7D6DE] bg-white p-5 shadow-sm">
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[#0B6E8F] text-white">
                    <Icon size={17} />
                  </div>
                  <div className="mb-1.5 text-[14px] font-bold text-[#0E2233]">{p.title}</div>
                  <p className="text-[13px] leading-relaxed text-[#45586B]">{p.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="for-hospitals" className="pt-20">
          <div className="relative overflow-hidden rounded-[1.75rem] border-2 border-[#0B6E8F]/30 bg-white p-8 sm:p-12 shadow-sm">
            <div aria-hidden="true" className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[#0B6E8F]/8" />
            <div className="relative grid items-center gap-10 sm:grid-cols-2">
              <div>
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#084F68]">
                  <span className="h-[2px] w-6 bg-[#084F68]" />
                  For hospitals
                </div>
                <h2 style={{ fontFamily: "'Fraunces', serif" }} className="mt-3 text-[28px] sm:text-[36px] font-medium leading-[1.12] tracking-[-0.01em] text-[#0E2233]">
                  Stop losing slots to no-shows
                </h2>
                <p className="mt-4 max-w-[420px] text-[14.5px] leading-relaxed text-[#45586B]">
                  A cancelled appointment doesn't have to sit empty. LiveBed fills it automatically — no phone calls, no waitlists to manage by hand.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <button onClick={() => onSelect("hospital")} className="group inline-flex items-center gap-1.5 rounded-xl bg-[#0B6E8F] px-6 py-3.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#084F68] hover:shadow-lg hover:shadow-[#0B6E8F]/25">
                    Register your hospital
                    <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
                  </button>
                  <button onClick={() => onSelect("patient")} className="text-sm font-semibold text-[#45586B] underline decoration-[#0E2233]/30 underline-offset-4 transition-colors hover:text-[#0E2233] hover:decoration-[#0B6E8F]">
                    Just here to book? Skip the wait
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="overflow-hidden rounded-xl ring-1 ring-[#C7D6DE]">
                  <img
                    src={hospitalDesk}
                    alt="A bright modern hospital reception desk"
                    loading="lazy"
                    width={1408}
                    height={1008}
                    className="h-40 w-full object-cover sm:h-44"
                  />
                </div>
                {hospitalPoints.map((p) => {
                  const Icon = p.icon;
                  return (
                    <div key={p.text} className="flex items-start gap-3.5 rounded-xl border border-[#C7D6DE] bg-[#EFF5F8] p-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0B6E8F]/12">
                        <Icon size={16} className="text-[#084F68]" />
                      </div>
                      <span className="pt-1 text-[13.5px] font-medium leading-snug text-[#0E2233]/90">{p.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 flex max-w-[640px] items-start gap-3 border-t border-[#C7D6DE] px-1 pt-6 text-[12px] text-[#45586B]">
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E3EDF2]">
            <ShieldCheck size={12} className="text-[#084F68]" />
          </div>
          <span className="leading-relaxed">
            Hospital access is verified by license ID, so only your hospital's own manager or CEO can sign in to its dashboard.
          </span>
        </section>
      </div>
    </div>
  );
}