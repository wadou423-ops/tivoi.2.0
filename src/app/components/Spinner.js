export default function Spinner({ size = 22, className = "" }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="Chargement"
    >
      <circle cx="12" cy="12" r="10" stroke="rgba(212, 175, 55, 0.18)" strokeWidth="2.5" />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="#f2ca50"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
