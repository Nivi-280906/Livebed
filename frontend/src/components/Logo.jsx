export default function Logo({ size = 32, showWordmark = true, dark = false }) {
  const wordColor = dark ? "#FFFFFF" : "#0E2233";
  const accentColor = dark ? "#9FD3E8" : "#0B6E8F";

  return (
    <div className="flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="1" y="1" width="30" height="30" rx="8" fill="#0B6E8F" />
        <circle cx="24" cy="8" r="3.2" fill="#FFFFFF" />
        <line
          x1="6" y1="24" x2="24" y2="6"
          stroke="#FFFFFF" strokeWidth="1.6" strokeDasharray="2.5 2.5"
          strokeLinecap="round" opacity="0.55"
        />
        <path
          d="M6 21 L10.5 21 L12.5 17 L15 25 L17.5 19 L19.5 21 L25 21"
          stroke="#CFE7EF" strokeWidth="1.8" fill="none"
          strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
      {showWordmark && (
        <span
          style={{ fontFamily: "'Fraunces', serif", fontSize: Math.round(size * 0.5) }}
          className="font-medium tracking-[-0.01em]"
        >
          <span style={{ color: wordColor }}>Live</span>
          <span style={{ color: accentColor }} className="italic">Bed</span>
        </span>
      )}
    </div>
  );
}