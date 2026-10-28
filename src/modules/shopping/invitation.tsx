"use client";
import { useEffect, useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
export function Invitation() {
  const [token, setToken] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const { isAuthenticated } = useConvexAuth();
  const router = useRouter();
  useEffect(() => {
    const value =
      new URLSearchParams(location.search).get("token") ??
      sessionStorage.getItem("giftsquire-invite") ??
      "";
    setToken(value);
    if (value) sessionStorage.setItem("giftsquire-invite", value);
  }, []);
  const info = useQuery(api.spaces.invitation, token ? { token } : "skip"),
    join = useMutation(api.spaces.join);
  return (
    <div className="page auth-page">
      <section className="panel">
        <span className="eyebrow">SOMETHING THOUGHTFUL IS WAITING</span>
        <h1>A gift, with your say.</h1>
        {info === undefined ? (
          <p>Checking your invitation…</p>
        ) : !info ? (
          <p>
            This invitation has expired or been withdrawn. Ask the giver for a
            fresh link.
          </p>
        ) : (
          <>
            <h2>{info.title}</h2>
            <p>
              {info.occasion || "A little something chosen with you in mind."}
            </p>
            <p>
              Your original photo stays private. Try the shortlisted outfits and
              approve only the ones you would welcome. Sharing previews with the
              giver is optional.
            </p>
            {isAuthenticated ? (
              <button
                className="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    const id = await join({ token: token! });
                    sessionStorage.removeItem("giftsquire-invite");
                    router.push(`/studio?space=${id}`);
                  } catch {
                    setError(
                      "This invitation cannot be accepted. It may belong to another recipient or have been revoked.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {busy ? "Joining…" : "Accept invitation"}
              </button>
            ) : (
              <Link href="/sign-in" className="button">
                Sign in or create your account ↗
              </Link>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}
