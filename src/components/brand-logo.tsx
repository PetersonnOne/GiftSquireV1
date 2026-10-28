export function BrandLogo() {
  return (
    <span className="logo-lockup">
      <svg
        width="36"
        height="36"
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <rect width="40" height="40" rx="13" fill="currentColor" />
        <path
          d="M11 18h18v13H11zM9 14h22v5H9zM20 14v17M20 14c-9 0-9-9-4-7 3 1 4 7 4 7Zm0 0c9 0 9-9 4-7-3 1-4 7-4 7Z"
          stroke="var(--bg)"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
      <span>
        Gift<span className="logo-serif">Squire</span>
        <small>THOUGHTFULLY YOURS</small>
      </span>
    </span>
  );
}
