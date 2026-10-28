"use client";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="page narrow">
      <span className="eyebrow">LET'S TRY THAT AGAIN</span>
      <h1>We couldn't load this page.</h1>
      <p>Your saved data has not been changed. Try again in a moment.</p>
      <button className="button" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
