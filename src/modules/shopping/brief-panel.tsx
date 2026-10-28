"use client";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { ConvexError } from "convex/values";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PRODUCTS } from "../../../convex/catalog";
function readable(e: unknown) {
  return e instanceof ConvexError && typeof e.data === "string"
    ? e.data
    : "Could not finish. Your draft is kept; please try again.";
}
export function BriefPanel({
  spaceId,
  title,
  recipientJoined,
  looks,
  gifting,
}: {
  spaceId: Id<"spaces">;
  title: string;
  recipientJoined: boolean;
  gifting: boolean;
  looks: {
    id: Id<"looks">;
    productId: string;
    status: string;
    resultUrl: string | null;
    approved: boolean;
  }[];
}) {
  const [kind, setKind] = useState<"partner" | "gift">("partner"),
    [subject, setSubject] = useState(
      `A little something for you — ${title}`.slice(0, 120),
    ),
    [message, setMessage] = useState(
      "I picked a few looks with you in mind. Take a look and tell me which ones feel like you.",
    ),
    [email, setEmail] = useState(""),
    [chosen, setChosen] = useState<Id<"looks">[]>([]),
    [current, setCurrent] = useState<Id<"briefs"> | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    create = useMutation(api.briefs.create),
    invite = useMutation(api.spaces.invite),
    history = useQuery(api.briefs.list, { spaceId });
  const available = looks.filter((l) => l.status === "complete" && l.resultUrl),
    availableKey = available.map((l) => l.id).join(",");
  useEffect(() => {
    setChosen((previous) => {
      const kept = previous.filter((id) => available.some((l) => l.id === id));
      return kept.length ? kept : available.slice(0, 3).map((l) => l.id);
    });
  }, [availableKey]);
  return (
    <section className="panel gs-brief-panel">
      <div className="gs-section-title">
        <span className="gs-number">05</span>
        <div>
          <span className="eyebrow">A THOUGHTFUL LITTLE PRESENTATION</span>
          <h2>Make it a brief.</h2>
        </div>
      </div>
      <p>
        Keep a private Partner Brief for your planning, or prepare a Gift Brief
        to email to your recipient. Use the actual YouCam preview images.
      </p>
      <div className="gs-mode-tabs">
        <button
          aria-pressed={kind === "partner"}
          className={kind === "partner" ? "active" : ""}
          onClick={() => setKind("partner")}
        >
          Partner Brief · private
        </button>
        {gifting && (
          <button
            aria-pressed={kind === "gift"}
            className={kind === "gift" ? "active" : ""}
            onClick={() => setKind("gift")}
          >
            Gift Brief · for them
          </button>
        )}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (lock.current) return;
          lock.current = true;
          setBusy(true);
          setError("");
          try {
            let token: string | undefined;
            if (kind === "gift" && !recipientJoined) {
              token = crypto.randomUUID() + crypto.randomUUID();
              await invite({ id: spaceId, token });
            }
            const id = await create({
              spaceId,
              kind,
              lookIds: chosen,
              subject,
              message,
              recipientEmail: kind === "gift" ? email : undefined,
              inviteToken: token,
            });
            setCurrent(id);
          } catch (e) {
            setError(readable(e));
          } finally {
            lock.current = false;
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
          <legend className="sr-only">Brief details</legend>
          <label>
            Subject
            <input
              required
              minLength={3}
              maxLength={120}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label>
            {kind === "gift" ? "Personal message" : "Planning note"}
            <textarea
              rows={3}
              maxLength={1500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </label>
          {kind === "gift" && (
            <>
              <label>
                Recipient’s email
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <p className="fine">
                The Gift Brief excludes your budget, private style notes and
                final surprise pick. You will review the exact email before
                sending.
              </p>
            </>
          )}
          <label>Include up to three generated previews</label>
          {!available.length ? (
            <p className="notice">
              Create a preview first, or ask the recipient to share their
              generated previews. You can still prepare a text-only Partner
              Brief.
            </p>
          ) : (
            <div className="gs-brief-choices">
              {available.map((l) => (
                <label className="checkbox" key={l.id}>
                  <input
                    type="checkbox"
                    checked={chosen.includes(l.id)}
                    disabled={!chosen.includes(l.id) && chosen.length >= 3}
                    onChange={(e) =>
                      setChosen(
                        e.target.checked
                          ? [...chosen, l.id]
                          : chosen.filter((id) => id !== l.id),
                      )
                    }
                  />
                  {PRODUCTS.find((p) => p.id === l.productId)?.name} ·{" "}
                  {l.approved ? "Recipient-approved" : "Proposed"}
                </label>
              ))}
            </div>
          )}
          <button
            className="button"
            disabled={busy || (kind === "gift" && !chosen.length)}
          >
            {busy ? "Preparing…" : "Prepare brief for review ↗"}
          </button>
        </fieldset>
      </form>
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
      {current && <BriefPreview id={current} />}
      <details>
        <summary>Saved briefs ({history?.length ?? 0})</summary>
        {history?.map((b) => (
          <button
            key={b.id}
            className="text-button"
            onClick={() => setCurrent(b.id)}
          >
            {b.kind === "partner" ? "Partner" : "Gift"} Brief · {b.status} ·{" "}
            {new Date(b.createdAt).toLocaleDateString()}
          </button>
        ))}
      </details>
    </section>
  );
}
export function BriefPreview({
  id,
  standalone = false,
}: {
  id: Id<"briefs">;
  standalone?: boolean;
}) {
  const brief = useQuery(api.briefs.get, { id }),
    send = useAction(api.briefEmail.send);
  const [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const lock = useRef(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (brief?.status !== "sending" && brief?.status !== "failed") return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [brief?.status]);
  useEffect(() => {
    setConfirmed(false);
    setError("");
    setNotice("");
  }, [id]);
  async function download(url: string, name: string) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw Error();
      const blob = await r.blob(),
        local = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = local;
      a.download = `GiftSquire-${name.replace(/[^a-z0-9]/gi, "-")}.${blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(local), 1000);
    } catch {
      setError(
        "Could not download this image. Refresh the brief and try again.",
      );
    }
  }
  if (!brief) return <p role="status">Opening your brief…</p>;
  if (brief.stale)
    return (
      <div className="notice">
        <h3>This brief needs a refresh.</h3>
        <p>
          The photo, previews, preferences or sharing permission changed.
          Prepare a new brief so you share only current, permitted images.
        </p>
      </div>
    );
  const recovering =
    brief.status === "sending" && now - (brief.sendStartedAt ?? now) >= 60000;
  const waiting = brief.status === "sending" && !recovering;
  const retryExpired =
    brief.status !== "sent" &&
    brief.firstSendStartedAt !== null &&
    now - brief.firstSendStartedAt >= 23 * 3600000;
  return (
    <div className="gs-brief-preview">
      <div className="gs-brief-toolbar" data-noprint>
        <span className="badge">
          {brief.kind === "partner"
            ? "PRIVATE PARTNER BRIEF"
            : "GIFT BRIEF · EMAIL PREVIEW"}
        </span>
        {standalone ? (
          <button
            className="button outline small"
            onClick={() => window.print()}
          >
            Print / Save as PDF
          </button>
        ) : (
          <Link
            className="button outline small"
            href={`/brief?id=${id}`}
            target="_blank"
            rel="noopener"
          >
            Open / Print / PDF ↗
          </Link>
        )}
      </div>
      <article className="gs-brief-document">
        <span className="eyebrow">GIFTSQUIRE · THOUGHTFULLY YOURS</span>
        <h2>{brief.subject}</h2>
        {brief.kind === "gift" && (
          <p className="fine">To: {brief.recipientEmail}</p>
        )}
        <p style={{ whiteSpace: "pre-wrap" }}>{brief.message}</p>
        {brief.occasion && <p>For: {brief.occasion}</p>}
        {brief.kind === "partner" && (
          <>
            <p>Relationship: {brief.relationship || "Not specified"}</p>
            <p>Style wishes: {brief.preferences || "Not specified"}</p>
            <p className="fine">
              Photo revision {brief.sourceRevision} · Prepared{" "}
              {new Date(brief.createdAt).toLocaleString()}
            </p>
            <p>
              Budget:{" "}
              {brief.budget
                ? `${brief.currency} ${brief.budget}`
                : "No budget limit set"}
            </p>
          </>
        )}
        {brief.kind === "partner" && (
          <section className="gs-brief-shortlist">
            <h3>Complete shortlist</h3>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Outfit</th>
                    <th>Preview</th>
                    <th>Revisions</th>
                    <th>Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {brief.shortlist.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.name}
                        {brief.selectedId === item.id ? " · Final choice" : ""}
                      </td>
                      <td>
                        {item.status}
                        {item.shade ? ` · ${item.shade}` : ""}
                      </td>
                      <td>
                        Photo {item.sourceVersion} / Version {item.version}{" "}
                        {item.status === "draft"
                          ? "· Not rendered"
                          : item.renderVersion !== undefined
                            ? `(generated ${item.renderVersion})`
                            : "· No completed render"}
                      </td>
                      <td>{item.approved ? "Approved" : "Not approved"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        <div className="gs-brief-images">
          {brief.images.map((image) => (
            <figure key={image.id}>
              <img src={image.url} alt={`${image.name} — YouCam preview`} />
              {image.detailUrl && (
                <>
                  <p className="fine">Lipstick close-up</p>
                  <img
                    src={image.detailUrl}
                    alt={`${image.name} lipstick close-up`}
                  />
                  <button
                    data-noprint
                    className="text-button"
                    onClick={() =>
                      void download(image.detailUrl!, image.name + "-lipstick")
                    }
                  >
                    Download lipstick preview ↓
                  </button>
                </>
              )}
              <figcaption>
                <strong>{image.name}</strong>
                {brief.kind === "partner" && (
                  <p className="fine">
                    Photo revision {image.sourceRevision} · Render revision{" "}
                    {image.renderRevision}
                  </p>
                )}
                <p>
                  {image.approved
                    ? "Recipient-approved"
                    : "Proposed look — awaiting recipient review"}
                  {image.shade ? ` · Lipstick: ${image.shade}` : ""}
                  {brief.kind === "partner" && brief.selectedId === image.id
                    ? " · Final choice"
                    : ""}
                </p>
              </figcaption>
              <button
                data-noprint
                className="text-button"
                onClick={() => void download(image.url, image.name)}
              >
                Download actual preview ↓
              </button>
            </figure>
          ))}
        </div>
        {brief.reviewPath && (
          <p>
            <Link href={brief.reviewPath} className="text-button">
              Review the gift choices →
            </Link>
          </p>
        )}
        <p className="fine">
          Clothing and optional lipstick previews powered by YouCam · Perfect
          Corp. AI previews explore appearance, not physical garment fit.
        </p>
      </article>
      {brief.kind === "gift" && (
        <div className="gs-send-brief" data-noprint>
          <p>
            {brief.status === "sent"
              ? "✓ Resend accepted this Gift Brief for delivery."
              : recovering
                ? "Delivery confirmation was interrupted. You can retry this same reviewed brief without creating a second send."
                : waiting
                  ? "Sending your reviewed Gift Brief…"
                  : "Nothing is emailed until you confirm and send."}
          </p>
          {brief.status !== "sent" && (
            <>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={busy || waiting || retryExpired}
                />
                I checked the recipient email, message and images above and want
                to send this Gift Brief.
              </label>
              <button
                className="button"
                disabled={!confirmed || busy || waiting || retryExpired}
                onClick={async () => {
                  if (lock.current) return;
                  lock.current = true;
                  setBusy(true);
                  setError("");
                  try {
                    await send({ id, confirmed });
                    setNotice("Gift Brief accepted by Resend for delivery.");
                  } catch (e) {
                    setError(readable(e));
                  } finally {
                    lock.current = false;
                    setBusy(false);
                  }
                }}
              >
                {busy
                  ? "Sending…"
                  : brief.status === "failed" || recovering
                    ? "Retry sending this Gift Brief"
                    : "Send Gift Brief via Resend ↗"}
              </button>
            </>
          )}
          {retryExpired && (
            <p role="status" className="notice">
              The safe retry window has ended. Check whether the recipient
              received the email before preparing a new brief.
            </p>
          )}
          {(error || brief.error) && (
            <p className="alert" role="alert">
              {error || brief.error}
            </p>
          )}
          {notice && (
            <p role="status" className="notice">
              {notice}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
export function BriefPage() {
  const [id, setId] = useState<Id<"briefs"> | null>(null);
  useEffect(() => {
    const value = new URLSearchParams(location.search).get("id");
    if (value && /^[a-z0-9]{20,50}$/.test(value)) setId(value as Id<"briefs">);
  }, []);
  return (
    <div className="page gs-brief-page">
      {id ? (
        <BriefPreview id={id} standalone />
      ) : (
        <p>Open a saved brief from your studio.</p>
      )}
    </div>
  );
}
