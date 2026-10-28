export default function Loading() {
  return (
    <div className="page" aria-label="Loading" role="status">
      <div className="skeleton sk-title" />
      <div className="skeleton sk-line" />
      <div className="dashboard-grid">
        {[1, 2, 3].map((i) => (
          <div className="skeleton sk-card" key={i} />
        ))}
      </div>
      <span className="sr-only">Loading your choices…</span>
    </div>
  );
}
