/** WeatherBoard mark: a sun rising over a board line. Same geometry as the app icon. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="logo">
      <rect width="32" height="32" rx="9" fill="var(--accent)" />
      <circle cx="16" cy="18" r="6" fill="#ffd36b" />
      <path d="M16 6.5v2.2M7.9 9.9l1.6 1.6M24.1 9.9l-1.6 1.6M5 18h2.2M24.8 18H27" stroke="#ffd36b" strokeWidth="2" strokeLinecap="round" />
      <rect x="4" y="19.5" width="24" height="8.5" fill="var(--accent)" />
      <path d="M6 20.5h20" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
