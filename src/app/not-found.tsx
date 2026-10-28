import Link from "next/link";
export default function NotFound() {
  return (
    <div className="page narrow">
      <span className="eyebrow">LET’S FIND YOUR WAY BACK</span>
      <h1>Page not found.</h1>
      <p>This address does not lead to a GiftSquire page.</p>
      <Link className="button" href="/">
        Back home
      </Link>
    </div>
  );
}
