export default function Badge({ status, count, className = "" }) {
  const map = {
    open:    { text: "Open",   classes: "bg-[#0B6E8F] text-white" },
    full:    { text: "Full",   classes: "bg-[#9B3A22] text-white" },
    closed:  { text: "Closed", classes: "bg-[#5B6C7D] text-white" },
    loading: { text: "Checking…", classes: "bg-[#E3EDF2] text-[#45586B]" },
  };

  const resolvedStatus =
    status || (typeof count === "number" ? (count > 0 ? "open" : "full") : "closed");
  const s = map[resolvedStatus] || map.closed;
  const label = typeof count === "number" && resolvedStatus === "open" ? `${count} open` : s.text;

  const dotClasses =
    resolvedStatus === "loading" ? "bg-[#45586B] animate-pulse" : "bg-white/80";

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.classes} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClasses}`} />
      {label}
    </span>
  );
}