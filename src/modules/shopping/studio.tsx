"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useConvexAuth, useMutation, useQuery, useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { PRODUCTS } from "../../../convex/catalog";
import { setupSchema, SHADES, type Setup } from "./domain";
import { BriefPanel } from "./brief-panel";
import { VoiceSession } from "./voice/voice-session";
const defaults: Setup = {
  journey: "gift",
  title: "A little something for you",
  occasion: "",
  relationship: "",
  currency: "USD",
  budget: null,
  preferences: "",
};
function errorText(e: unknown) {
  return e instanceof ConvexError && typeof e.data === "string"
    ? e.data
    : "That did not finish. Your choices are kept; please try again.";
}
function ModeBubble({ interactive }: { interactive: boolean }) {
  return (
    <div className={`gs-mode-bubble ${interactive ? "is-voice" : "is-manual"}`}>
      <span>{interactive ? "◌" : "✎"}</span>
      <div>
        <strong>
          You’re in {interactive ? "Interactive Mode" : "User Mode"}
        </strong>
        <p>
          {interactive
            ? "Tell your Style Guide what you have in mind. You’ll review every detail before choosing outfits."
            : "Use the fields and shortlist at your own pace. Switch to voice at any time by choosing Interactive Mode."}
        </p>
      </div>
    </div>
  );
}
export function Studio() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [selected, setSelected] = useState<Id<"spaces"> | null>(null);
  const [pendingInvite, setPendingInvite] = useState(false);
  useEffect(() => {
    const id = new URLSearchParams(location.search).get("space");
    if (id && /^[a-z0-9]{20,50}$/.test(id)) setSelected(id as Id<"spaces">);
    setPendingInvite(!!sessionStorage.getItem("giftsquire-invite"));
  }, []);
  const spaces = useQuery(api.spaces.list, isAuthenticated ? {} : "skip");
  if (isLoading)
    return (
      <div className="page">
        <p role="status">Opening your studio…</p>
      </div>
    );
  if (!isAuthenticated)
    return (
      <div className="page gs-studio">
        <div className="page-heading">
          <span className="eyebrow">YOUR PERSONAL STYLE STUDIO</span>
          <h1>
            A thoughtful choice
            <br />
            starts <em>right here.</em>
          </h1>
          <p>
            Sign in to keep your choices, create private previews and invite
            someone to help choose their gift.
          </p>
          <Link className="button" href="/sign-in">
            Sign in or create an account ↗
          </Link>
        </div>
        <div className="gs-feature-grid">
          {[
            "01 · Tell us who it’s for",
            "02 · Preview with YouCam",
            "03 · Approve & choose",
          ].map((x) => (
            <article key={x}>
              <h3>{x}</h3>
              <p>
                Photos stay under the control of the person trying on. Their
                approval comes before the giver’s final choice.
              </p>
            </article>
          ))}
        </div>
      </div>
    );
  return (
    <div className="page gs-studio">
      <div className="gs-studio-heading">
        <div>
          <span className="eyebrow">THOUGHTFULLY YOURS</span>
          <h1>
            Your style studio<span className="gs-dot">.</span>
          </h1>
          <p>
            A space for the right look, the right person, the lovely little
            details.
          </p>
        </div>
        <span className="gs-powered">✧ Powered by YouCam</span>
      </div>
      {pendingInvite && (
        <Link className="notice" href="/join">
          Your gift invitation is waiting. Open it here →
        </Link>
      )}
      <div className="gs-space-tabs" aria-label="Shopping spaces">
        <button
          className={!selected ? "active" : ""}
          onClick={() => setSelected(null)}
        >
          ＋ New space
        </button>
        {spaces?.map((s) => (
          <button
            key={s.id}
            className={selected === s.id ? "active" : ""}
            onClick={() => setSelected(s.id)}
          >
            {s.selected ? "♡ " : ""}
            {s.title}
          </button>
        ))}
      </div>
      {selected ? (
        <SpaceView
          key={selected}
          id={selected}
          onClosed={() => setSelected(null)}
        />
      ) : (
        <NewSpace onCreated={(id) => setSelected(id)} />
      )}
    </div>
  );
}
function NewSpace({ onCreated }: { onCreated: (id: Id<"spaces">) => void }) {
  const [setup, setSetup] = useState<Setup>(defaults),
    [mode, setMode] = useState<"interactive" | "user">("interactive"),
    [products, setProducts] = useState<string[]>(
      PRODUCTS.slice(3).map((p) => p.id),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [photoPath, setPhotoPath] = useState<"invite" | "shared">("invite");
  const lock = useRef(false),
    create = useMutation(api.spaces.create);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (new URLSearchParams(location.search).get("journey") === "self")
      setSetup((s) => ({ ...s, journey: "self", title: "My next look" }));
  }, []);
  async function submit() {
    if (lock.current) return;
    const valid = setupSchema.safeParse(setup);
    if (!valid.success) {
      setError(
        "Give your space a name, a three-letter currency and a positive budget, or leave the budget empty.",
      );
      return;
    }
    if (!products.length) {
      setError("Choose at least one outfit for your shortlist.");
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      onCreated(
        await create({
          setup: JSON.stringify(valid.data),
          products,
          photoPath,
        }),
      );
    } catch (e) {
      setError(errorText(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="gs-work-grid">
      <div>
        <section className="panel gs-mode-panel">
          <span className="eyebrow">LET’S FIND THEIR KIND OF LOVELY</span>
          <h2>
            A little conversation.
            <br />A more personal choice.
          </h2>
          <div className="gs-mode-tabs" role="group" aria-label="Setup mode">
            <button
              aria-pressed={mode === "user"}
              className={mode === "user" ? "active" : ""}
              onClick={() => setMode("user")}
            >
              ✎ User Mode
            </button>
            <button
              aria-pressed={mode === "interactive"}
              className={mode === "interactive" ? "active" : ""}
              onClick={() => setMode("interactive")}
            >
              ◌ Interactive Mode
            </button>
          </div>
          <ModeBubble interactive={mode === "interactive"} />
        </section>
        {
          <div hidden={mode !== "interactive"}>
            <VoiceSession
              mode="interactive"
              active={mode === "interactive"}
              context={JSON.stringify(setup)}
              onClose={() => setMode("user")}
              onReviewed={async (d) => {
                setSetup(setupSchema.parse(d));
                setMode("user");
                form.current?.scrollIntoView({ behavior: "smooth" });
              }}
            />
          </div>
        }
        <form
          ref={form}
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <section className="panel">
            <div className="gs-section-title">
              <span className="gs-number">01</span>
              <div>
                <span className="eyebrow">THE PERSON & THE MOMENT</span>
                <h2>Who’s on your mind?</h2>
              </div>
            </div>
            <fieldset disabled={busy}>
              <legend className="sr-only">Shopping details</legend>
              <div className="gs-journeys">
                <button
                  type="button"
                  aria-pressed={setup.journey === "self"}
                  className={setup.journey === "self" ? "active" : ""}
                  onClick={() =>
                    setSetup({
                      ...setup,
                      journey: "self",
                      title: "My next look",
                    })
                  }
                >
                  <span>✧</span>
                  <strong>For myself</strong>
                  <small>A look that feels like me.</small>
                </button>
                <button
                  type="button"
                  aria-pressed={setup.journey === "gift"}
                  className={setup.journey === "gift" ? "active" : ""}
                  onClick={() =>
                    setSetup({
                      ...setup,
                      journey: "gift",
                      title: "A little something for you",
                    })
                  }
                >
                  <span>♡</span>
                  <strong>For someone else</strong>
                  <small>Their say. Your surprise.</small>
                </button>
              </div>
              {setup.journey === "gift" && (
                <label>
                  How would you like to prepare?
                  <select
                    value={photoPath}
                    onChange={(e) =>
                      setPhotoPath(e.target.value as "invite" | "shared")
                    }
                  >
                    <option value="invite">Invite them to try privately</option>
                    <option value="shared">
                      They have shared a photo with me
                    </option>
                  </select>
                  <small>
                    {photoPath === "shared"
                      ? "You confirm their permission before uploading. Your previews are proposals until they approve."
                      : "They provide their own photo and control what they share."}
                  </small>
                </label>
              )}
              <div className="form-grid">
                <label>
                  Space name
                  <input
                    required
                    maxLength={80}
                    value={setup.title}
                    onChange={(e) =>
                      setSetup({ ...setup, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Occasion <small>(optional)</small>
                  <input
                    maxLength={80}
                    placeholder="Birthday, a celebration, just because…"
                    value={setup.occasion}
                    onChange={(e) =>
                      setSetup({ ...setup, occasion: e.target.value })
                    }
                  />
                </label>
                {setup.journey === "gift" && (
                  <label>
                    Relationship <small>(optional)</small>
                    <input
                      maxLength={60}
                      placeholder="A friend, partner, colleague…"
                      value={setup.relationship}
                      onChange={(e) =>
                        setSetup({ ...setup, relationship: e.target.value })
                      }
                    />
                  </label>
                )}
                <label>
                  Currency
                  <input
                    required
                    maxLength={3}
                    pattern="[A-Z]{3}"
                    value={setup.currency}
                    onChange={(e) =>
                      setSetup({
                        ...setup,
                        currency: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </label>
                <label>
                  Budget in {setup.currency} <small>(optional)</small>
                  <input
                    type="number"
                    min="0.01"
                    max="1000000"
                    step="any"
                    placeholder="No limit set"
                    value={setup.budget ?? ""}
                    onChange={(e) =>
                      setSetup({
                        ...setup,
                        budget: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </label>
              </div>
              <label>
                Style wishes
                <textarea
                  maxLength={600}
                  rows={3}
                  placeholder="Favourite colours, relaxed or dressed up, something to avoid…"
                  value={setup.preferences}
                  onChange={(e) =>
                    setSetup({ ...setup, preferences: e.target.value })
                  }
                />
              </label>
            </fieldset>
          </section>
          <section className="panel">
            <div className="gs-section-title">
              <span className="gs-number">02</span>
              <div>
                <span className="eyebrow">A FEW POSSIBILITIES</span>
                <h2>Build a little shortlist.</h2>
              </div>
            </div>
            <p>
              Choose up to six outfits. These are YouCam demonstration styles,
              ready to try on; merchant prices and checkout are not included.
            </p>
            <div className="gs-catalog">
              {PRODUCTS.map((p) => (
                <label
                  key={p.id}
                  className={`gs-product ${products.includes(p.id) ? "chosen" : ""}`}
                >
                  <img src={p.image} alt={p.name} />
                  <span>
                    <input
                      type="checkbox"
                      checked={products.includes(p.id)}
                      onChange={(e) =>
                        setProducts(
                          e.target.checked
                            ? [...products, p.id]
                            : products.filter((id) => id !== p.id),
                        )
                      }
                    />
                    <strong>{p.name}</strong>
                  </span>
                </label>
              ))}
            </div>
            <div className="gs-create">
              <p>
                {products.length} outfit{products.length !== 1 ? "s" : ""} in
                your shortlist · You can review before making a final choice.
              </p>
              <button
                className="button"
                disabled={busy || !products.length}
                type="submit"
              >
                {busy ? "Creating your space…" : "Create my shopping space ↗"}
              </button>
            </div>
            {error && (
              <p className="alert" role="alert">
                {error}
              </p>
            )}
          </section>
        </form>
      </div>
      <aside>
        <section className="panel gs-soft-card">
          <span className="eyebrow">A MORE THOUGHTFUL WAY</span>
          <h3>
            A say in the style.
            <br />A surprise in the giving.
          </h3>
          <p>
            Invite your recipient to privately try on and approve the options
            they like. You make the final choice from their favourites.
          </p>
          <div className="gs-checklist">
            <p>♡ Their photo stays private</p>
            <p>✧ YouCam brings options to life</p>
            <p>✓ Approval before the final pick</p>
          </div>
        </section>
        <section className="panel">
          <span className="eyebrow">YOUR PACE, YOUR WAY</span>
          <p>
            Voice is optional. Five minutes per session, six starts per account
            each day, with 24 shared starts daily.
          </p>
          <small>Starting a microphone session always needs your click.</small>
        </section>
      </aside>
    </div>
  );
}
function SpaceView({
  id,
  onClosed,
}: {
  id: Id<"spaces">;
  onClosed: () => void;
}) {
  const space = useQuery(api.spaces.get, { id });
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [working, setWorking] = useState(false),
    [consent, setConsent] = useState(false),
    [link, setLink] = useState(""),
    [compare, setCompare] = useState(false),
    [unavailablePhoto, setUnavailablePhoto] = useState<string | null>(null);
  const lock = useRef(false);
  const photo = useMutation(api.spaces.photo),
    upload = useMutation(api.spaces.uploadUrl),
    preview = useMutation(api.spaces.preview),
    approve = useMutation(api.spaces.approve),
    select = useMutation(api.spaces.select),
    invite = useMutation(api.spaces.invite),
    revoke = useMutation(api.spaces.revoke),
    share = useMutation(api.spaces.share),
    remove = useMutation(api.spaces.remove),
    deletePhoto = useMutation(api.spaces.deletePhoto);
  async function run(fn: () => Promise<unknown>, message?: string) {
    if (lock.current) return;
    lock.current = true;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      await fn();
      if (message) setNotice(message);
    } catch (e) {
      setError(errorText(e));
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }
  if (!space)
    return (
      <section className="panel">
        <p>Opening this shopping space…</p>
      </section>
    );
  const shopper = space.canPreview,
    completed = space.looks.filter((l) => l.status === "complete").length,
    approved = space.looks.filter((l) => l.approved).length,
    failed = space.looks.filter((l) => l.status === "failed").length;
  const picked = space.looks.find((l) => l.id === space.selectedId),
    pickedProduct = PRODUCTS.find((p) => p.id === picked?.productId);
  return (
    <>
      <div className="gs-space-heading">
        <div>
          <span className="eyebrow">
            {space.journey === "self"
              ? "YOUR NEXT LOOK"
              : "A GIFT WITH THEIR SAY"}
          </span>
          <h2>{space.title}</h2>
          <p>
            {space.occasion || "A little something, thoughtfully chosen."}{" "}
            {space.budget ? `· Budget ${space.currency} ${space.budget}` : ""}
          </p>
        </div>
        <span className="badge">
          {space.canApprove
            ? "Your previews & approvals"
            : shopper
              ? "Giver’s proposed previews"
              : "Giver’s view"}
        </span>
      </div>
      {error && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <div className="gs-work-grid">
        <div>
          {space.journey === "gift" && space.isOwner && (
            <section className="panel">
              <div className="gs-section-title">
                <span className="gs-number">03</span>
                <div>
                  <span className="eyebrow">LET THEM HAVE A SAY</span>
                  <h2>A private invitation.</h2>
                </div>
              </div>
              <p>
                {space.recipientJoined
                  ? "Your recipient has joined. They control their photo, previews and approvals."
                  : "Send your recipient a link. They can try the shortlist and approve the looks they would welcome."}
              </p>
              {!space.recipientJoined && (
                <button
                  className="button"
                  disabled={working}
                  onClick={() =>
                    void run(async () => {
                      const token = crypto.randomUUID() + crypto.randomUUID();
                      await invite({ id, token });
                      setLink(`${location.origin}/join?token=${token}`);
                    }, "Invitation ready. Copy the link below.")
                  }
                >
                  Create private invitation
                </button>
              )}
              {link && (
                <label>
                  Invitation link
                  <input
                    readOnly
                    value={link}
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    className="text-button"
                    onClick={() =>
                      void run(
                        () => navigator.clipboard.writeText(link),
                        "Invitation link copied.",
                      )
                    }
                  >
                    Copy link
                  </button>
                </label>
              )}
              <details>
                <summary>Invitation controls</summary>
                <p>
                  Revoking removes recipient access and clears their photos,
                  previews and approvals in this space.
                </p>
                <button
                  className="button outline"
                  disabled={working}
                  onClick={() => {
                    if (
                      confirm(
                        "Revoke the invitation and clear this recipient’s previews?",
                      )
                    )
                      void run(async () => {
                        await revoke({ id });
                        setLink("");
                      }, "Invitation revoked. You can invite someone again.");
                  }}
                >
                  Revoke invitation
                </button>
              </details>
            </section>
          )}
          {shopper && (
            <section className="panel">
              <div className="gs-section-title">
                <span className="gs-number">03</span>
                <div>
                  <span className="eyebrow">SEE IT ON YOU</span>
                  <h2>A photo. A few possibilities.</h2>
                </div>
              </div>
              <div className="gs-photo-area">
                {space.photoUrl && unavailablePhoto !== space.photoUrl ? (
                  <img
                    src={space.photoUrl}
                    alt="Your current try-on source"
                    onError={() => setUnavailablePhoto(space.photoUrl)}
                  />
                ) : (
                  <div className="gs-photo-placeholder">
                    <span>◌</span>
                    <p>
                      {space.photoUrl
                        ? "The source image could not load. Your saved previews are still available."
                        : "Your photo stays under your control."}
                    </p>
                    {space.photoUrl && (
                      <button
                        className="text-button"
                        onClick={() => setUnavailablePhoto(null)}
                      >
                        Reload source image
                      </button>
                    )}
                  </div>
                )}
                <div>
                  <p>
                    Use a clear, front-facing photo with your face and full
                    outfit visible. JPG, PNG or WebP, up to 5 MB.
                  </p>
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    {space.photoPath === "shared" && !space.canApprove
                      ? "The adult recipient shared this photo with me and explicitly permitted its use in GiftSquire and YouCam for previews."
                      : "I am an adult and consent to this photo being processed by YouCam for previews. I own or have permission to use it."}
                  </label>
                  <p className="fine">
                    The photo and results stay here until deletion or closure. A
                    recipient-uploaded replacement stays private to the
                    recipient. YouCam’s processing policies apply.
                  </p>
                  <label className="button outline gs-upload">
                    {working
                      ? "Working…"
                      : space.hasPhoto
                        ? "Replace photo"
                        : "Upload my photo"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={!consent || working}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (
                          file.size > 5 * 1024 * 1024 ||
                          !["image/jpeg", "image/png", "image/webp"].includes(
                            file.type,
                          )
                        ) {
                          setError("Choose a JPG, PNG or WebP under 5 MB.");
                          return;
                        }
                        void run(async () => {
                          const url = await upload({ id });
                          const r = await fetch(url, {
                            method: "POST",
                            headers: { "Content-Type": file.type },
                            body: file,
                          });
                          if (!r.ok) throw Error();
                          const out = await r.json();
                          await photo({
                            id,
                            storageId: out.storageId,
                            demo: false,
                            consent,
                          });
                        }, "Photo ready. Choose an outfit preview below.");
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    className="text-button"
                    disabled={!consent || working}
                    onClick={() =>
                      void run(
                        () => photo({ id, demo: true, consent }),
                        "YouCam’s example model is ready. These previews use the example photo, not your likeness.",
                      )
                    }
                  >
                    Use YouCam’s example model
                  </button>
                  {space.hasPhoto && (
                    <button
                      className="text-button"
                      disabled={working}
                      onClick={() => {
                        if (
                          confirm(
                            "Delete your photo and all previews in this space?",
                          )
                        )
                          void run(
                            () => deletePhoto({ id }),
                            "Photo and previews deleted.",
                          );
                      }}
                    >
                      Delete photo & previews
                    </button>
                  )}
                </div>
              </div>
              {space.journey === "gift" && space.canApprove && (
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={space.sharePreviews}
                    disabled={working}
                    onChange={(e) =>
                      void run(
                        () => share({ id, enabled: e.target.checked }),
                        "Preview sharing updated.",
                      )
                    }
                  />
                  Share my generated previews with the giver. My original photo
                  stays private.
                </label>
              )}
            </section>
          )}
          {space.photoPath === "shared" && !space.canApprove && (
            <p className="notice">
              These are your proposed looks. Invite the recipient to review;
              only they can approve a gift.
            </p>
          )}
          <section className="panel">
            <div className="gs-section-title">
              <span className="gs-number">04</span>
              <div>
                <span className="eyebrow">
                  SEE. COMPARE. FIND YOUR FAVOURITES.
                </span>
                <h2>The little shortlist.</h2>
              </div>
            </div>
            <div className="gs-compare-heading">
              <p>
                {shopper
                  ? "Create each YouCam preview when you’re ready. Approve only the current looks you like."
                  : "Recipient approvals appear here. Previews are visible only if your recipient chooses to share them."}
              </p>
              <button
                className="button outline small"
                aria-pressed={compare}
                onClick={() => setCompare(!compare)}
              >
                {compare ? "Show details" : "Compare looks"}
              </button>
            </div>
            <div className={`gs-look-grid ${compare ? "comparing" : ""}`}>
              {space.looks.map((l) => {
                const p = PRODUCTS.find((p) => p.id === l.productId)!;
                return (
                  <article
                    className={`gs-look ${l.id === space.selectedId ? "selected" : ""}`}
                    key={l.id}
                  >
                    <div className="gs-look-image">
                      <img
                        src={l.resultUrl || p.image}
                        alt={
                          l.resultUrl
                            ? `${p.name} — generated YouCam preview`
                            : p.name
                        }
                      />
                      <span className={`gs-state state-${l.status}`}>
                        {l.approved
                          ? "♡ Approved"
                          : l.rejected
                            ? "Not for me"
                            : l.status === "complete"
                              ? "✓ Preview ready"
                              : l.status === "draft"
                                ? "Outfit inspiration"
                                : l.status === "failed"
                                  ? "Try again"
                                  : "✧ Creating preview…"}
                      </span>
                    </div>
                    <div className="gs-look-body">
                      <small>
                        {l.resultUrl ? "YOUCAM PREVIEW" : "YOUCAM DEMO STYLE"}
                      </small>
                      <h3>{p.name}</h3>
                      {l.detailUrl && (
                        <figure className="gs-lip-detail">
                          <img
                            src={l.detailUrl}
                            alt={`${p.name} lipstick close-up`}
                          />
                          <figcaption>Lipstick close-up · YouCam</figcaption>
                        </figure>
                      )}
                      {l.shadePreviews.length > 0 && (
                        <section
                          className="gs-shade-comparison"
                          aria-label={`Compare lipstick for ${p.name}`}
                        >
                          <h4>Compare lipstick close-ups</h4>
                          <div>
                            {l.shadePreviews.map((v) => (
                              <figure key={v.id}>
                                <img
                                  src={v.url}
                                  alt={`${SHADES.find((s) => s.id === v.shade)?.name ?? v.shade} lipstick on ${p.name}`}
                                />
                                <figcaption>
                                  {SHADES.find((s) => s.id === v.shade)?.name}
                                </figcaption>
                                {shopper && (
                                  <button
                                    className="button outline small"
                                    disabled={
                                      working ||
                                      l.status !== "complete" ||
                                      l.lipstick === v.shade
                                    }
                                    onClick={() =>
                                      void run(
                                        () =>
                                          preview({
                                            lookId: l.id,
                                            version: l.version,
                                            shade: v.shade,
                                          }),
                                        "Saved shade selected. Review before approving the updated look.",
                                      )
                                    }
                                  >
                                    {l.lipstick === v.shade
                                      ? "Selected"
                                      : "Use this shade"}
                                  </button>
                                )}
                              </figure>
                            ))}
                          </div>
                        </section>
                      )}
                      {l.lipstick && (
                        <p className="fine">
                          Lipstick:{" "}
                          {SHADES.find((s) => s.id === l.lipstick)?.name}
                        </p>
                      )}
                      {l.error && (
                        <p className="alert" role="status">
                          {l.error} Other previews are safe.
                        </p>
                      )}
                      {!compare && (
                        <>
                          <div className="actions">
                            {shopper && (
                              <button
                                className="button outline small"
                                disabled={
                                  working ||
                                  !space.hasPhoto ||
                                  ["queued", "running"].includes(l.status)
                                }
                                onClick={() =>
                                  void run(
                                    () =>
                                      preview({
                                        lookId: l.id,
                                        version: l.version,
                                      }),
                                    "Preview requested. You can keep browsing while YouCam works.",
                                  )
                                }
                              >
                                {l.status === "complete"
                                  ? "Recreate outfit"
                                  : l.status === "failed"
                                    ? "Retry this preview"
                                    : "Preview on me"}
                              </button>
                            )}
                            {space.canApprove && l.status === "complete" && (
                              <>
                                <button
                                  className={`button small ${l.approved ? "" : "outline"}`}
                                  disabled={working}
                                  onClick={() =>
                                    void run(
                                      () =>
                                        approve({
                                          lookId: l.id,
                                          version: l.version,
                                          approved: true,
                                        }),
                                      "Approved. The final choice can use this exact preview.",
                                    )
                                  }
                                >
                                  ♡ {l.approved ? "Approved" : "I like this"}
                                </button>
                                <button
                                  className="text-button"
                                  disabled={working}
                                  onClick={() =>
                                    void run(
                                      () =>
                                        approve({
                                          lookId: l.id,
                                          version: l.version,
                                          approved: false,
                                        }),
                                      "Preference saved.",
                                    )
                                  }
                                >
                                  Not for me
                                </button>
                              </>
                            )}
                            {space.isOwner && l.approved && (
                              <button
                                className="button small"
                                disabled={working}
                                onClick={() =>
                                  void run(
                                    () =>
                                      select({
                                        lookId: l.id,
                                        version: l.version,
                                      }),
                                    "Your choice is saved.",
                                  )
                                }
                              >
                                {space.selectedId === l.id
                                  ? "✓ Chosen"
                                  : "Choose this look"}
                              </button>
                            )}
                          </div>
                          {shopper && l.status === "complete" && (
                            <details>
                              <summary>
                                Complete my look · optional lipstick
                              </summary>
                              <p className="fine">
                                YouCam creates a lipstick close-up from this
                                outfit preview. The full outfit stays alongside
                                it. Review and approve the updated look again.
                              </p>
                              <div className="gs-shades">
                                {SHADES.map((s) => (
                                  <button
                                    key={s.id}
                                    aria-pressed={l.lipstick === s.id}
                                    className="button outline small"
                                    disabled={working}
                                    onClick={() =>
                                      void run(
                                        () =>
                                          preview({
                                            lookId: l.id,
                                            version: l.version,
                                            shade: s.id,
                                          }),
                                        "Shade selected or requested. Existing ready shades are reused without a new render.",
                                      )
                                    }
                                  >
                                    <i style={{ background: s.hex }} />
                                    {s.name}
                                  </button>
                                ))}
                              </div>
                            </details>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="fine">
              AI previews help explore style; they do not measure garment size
              or guarantee physical fit. Changing a photo or recreating a look
              clears affected approvals.
            </p>
          </section>
          {picked && (
            <section className="panel gs-decision">
              <span className="eyebrow">A THOUGHTFUL CHOICE, SAVED</span>
              <h2>♡ {pickedProduct?.name}</h2>
              <p>
                {space.journey === "gift"
                  ? "Chosen from your recipient’s approved looks. Your final pick stays between you and GiftSquire."
                  : "Your preferred look is saved here, with the exact preview you approved."}
              </p>
              <button className="button outline" onClick={() => window.print()}>
                Print my choice
              </button>
            </section>
          )}
          {space.isOwner && (
            <BriefPanel
              spaceId={id}
              title={space.title}
              recipientJoined={space.recipientJoined}
              gifting={space.journey === "gift"}
              looks={space.looks}
            />
          )}{" "}
          {space.isOwner && (
            <details className="panel">
              <summary>Manage this space</summary>
              <p>
                Closing deletes photos and previews and ends recipient access.
                Keep a note of your chosen style first.
              </p>
              <button
                className="button outline"
                disabled={working}
                onClick={() => {
                  if (
                    confirm(
                      "Close this space and delete its photos and previews?",
                    )
                  )
                    void run(async () => {
                      await remove({ id });
                      onClosed();
                    });
                }}
              >
                Close shopping space
              </button>
            </details>
          )}
        </div>
        <aside>
          <section className="panel gs-stats">
            <span className="eyebrow">AT A GLANCE</span>
            <h3>Your choices, in view.</h3>
            <div>
              {[
                { n: space.looks.length, t: "Outfits", c: "rose" },
                { n: completed, t: "Previews", c: "gold" },
                { n: approved, t: "Approved", c: "green" },
                { n: failed, t: "To retry", c: "muted" },
              ].map((x) => (
                <div className={`gs-stat ${x.c}`} key={x.t}>
                  <strong>{x.n}</strong>
                  <span>{x.t}</span>
                </div>
              ))}
            </div>
          </section>
          <Discussion
            id={id}
            version={space.preferenceVersion}
            preferences={space.preferences}
            looks={space.looks}
            selectedId={space.selectedId}
            decisionNotes={space.decisionNotes}
            messages={space.messages}
          />
        </aside>
      </div>
    </>
  );
}
type TopicSnapshot = {
  scope: "space" | "look" | "decision";
  lookId?: Id<"looks">;
  stage: "planning" | "post_purchase";
  purchaseConfirmed: boolean;
  version: number;
  renderVersion?: number;
  label: string;
  key: string;
};
type DiscussionLook = {
  id: Id<"looks">;
  productId: string;
  version: number;
  feedback: string;
  feedbackVersion: number;
  feedbackStage: string;
  planningFeedback: string;
  postPurchaseFeedback: string;
};
function Discussion({
  id,
  version,
  preferences,
  looks,
  selectedId,
  decisionNotes,
  messages,
}: {
  id: Id<"spaces">;
  version: number;
  preferences: string;
  looks: DiscussionLook[];
  selectedId: Id<"looks"> | null;
  decisionNotes: {
    lookId: Id<"looks">;
    stage: string;
    text: string;
    version: number;
  }[];
  messages: {
    id: Id<"feedback">;
    text: string;
    own: boolean;
    lookId?: Id<"looks"> | null;
    scope?: string;
    stage?: string;
    purchaseReported?: boolean;
    renderVersion?: number | null;
  }[];
}) {
  const [choice, setChoice] = useState("space"),
    [stage, setStage] = useState<"planning" | "post_purchase">("planning"),
    [reported, setReported] = useState(false),
    [mode, setMode] = useState<"chat" | "voice">("chat"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({}),
    [proposals, setProposals] = useState<
      Record<string, { topic: TopicSnapshot; text: string }>
    >({}),
    [replies, setReplies] = useState<Record<string, string>>({});
  const [turns, setTurns] = useState<
    Record<string, { speaker: string; text: string }[]>
  >({});
  const [threads, setThreads] = useState<
      { id: string; topic: TopicSnapshot }[]
    >([]),
    [activeThread, setActiveThread] = useState<string | null>(null);
  const lock = useRef(false),
    discuss = useAction(api.styleGuide.discuss),
    save = useMutation(api.discussion.save);
  const scope =
      choice === "space"
        ? "space"
        : choice === "decision"
          ? "decision"
          : "look",
    look = looks.find(
      (l) => l.id === (scope === "decision" ? selectedId : choice),
    );
  const key = choice + ":" + (look?.id ?? "space") + ":" + stage,
    label =
      scope === "space"
        ? "Overall style wishes"
        : `${scope === "decision" ? "Saved choice: " : ""}${PRODUCTS.find((p) => p.id === look?.productId)?.name ?? "Choose an outfit"}`;
  const topic: TopicSnapshot = {
    scope,
    lookId: look?.id,
    stage,
    purchaseConfirmed: reported,
    version:
      scope === "decision"
        ? (decisionNotes.find((n) => n.lookId === look?.id && n.stage === stage)
            ?.version ?? 1)
        : (look?.feedbackVersion ?? version),
    renderVersion: look?.version,
    label,
    key,
  };
  const ready =
      (scope === "space" || !!look) && (stage !== "post_purchase" || reported),
    text = drafts[key] ?? "",
    proposal = proposals[key];
  const initial =
    scope === "decision"
      ? (decisionNotes.find((n) => n.lookId === look?.id && n.stage === stage)
          ?.text ?? "")
      : scope === "space"
        ? preferences
        : stage === "planning"
          ? (look?.planningFeedback ?? "")
          : (look?.postPurchaseFeedback ?? "");

  function args(t: TopicSnapshot) {
    return {
      scope: t.scope,
      lookId: t.lookId,
      stage: t.stage,
      purchaseConfirmed: t.purchaseConfirmed,
    };
  }
  async function apply(value: string, snapshot: TopicSnapshot) {
    await save({
      spaceId: id,
      ...args(snapshot),
      version: snapshot.version,
      renderVersion: snapshot.renderVersion,
      text: value,
    });
    setProposals((p) => {
      const next = { ...p };
      delete next[snapshot.key];
      return next;
    });
    setReplies((r) => ({
      ...r,
      [snapshot.key]:
        "Your reviewed note is saved for this topic. Existing images, approvals and unrelated choices are unchanged.",
    }));
  }
  function voice() {
    if (!ready) return;
    const previous = [...threads]
      .reverse()
      .find(
        (t) =>
          t.topic.key === key &&
          t.topic.version === topic.version &&
          t.topic.renderVersion === topic.renderVersion,
      );
    if (previous) setActiveThread(previous.id);
    else {
      const entry = { id: crypto.randomUUID(), topic };
      setThreads((t) => [...t, entry]);
      setActiveThread(entry.id);
    }
    setMode("voice");
    setError("");
  }
  const history = messages
    .filter((m) => (scope === "space" ? !m.lookId : m.lookId === look?.id))
    .filter((m) => (m.scope ?? (m.lookId ? "look" : "space")) === scope)
    .filter((m) => (m.stage ?? "planning") === stage);
  return (
    <section className="panel gs-discussion">
      <span className="eyebrow">A LITTLE BACK & FORTH</span>
      <h3>Talk it through.</h3>
      <label>
        Discussion topic
        <select
          value={choice}
          disabled={busy || mode === "voice"}
          onChange={(e) => {
            setChoice(e.target.value);
            setError("");
            if (e.target.value === "space") {
              setStage("planning");
              setReported(false);
            }
          }}
        >
          <option value="space">Overall style wishes</option>
          {selectedId && <option value="decision">My saved choice</option>}
          {looks.map((l) => (
            <option key={l.id} value={l.id}>
              {PRODUCTS.find((p) => p.id === l.productId)?.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Feedback stage
        <select
          value={stage}
          disabled={scope === "space" || busy || mode === "voice"}
          onChange={(e) => {
            setStage(e.target.value as typeof stage);
            setReported(false);
            setError("");
          }}
        >
          <option value="planning">Before purchase · planning</option>
          <option value="post_purchase">After purchase · my report</option>
        </select>
      </label>
      {stage === "post_purchase" && (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={reported}
            disabled={busy || mode === "voice"}
            onChange={(e) => setReported(e.target.checked)}
          />
          I report that this item was purchased. This is my own report, not a
          verified transaction.
        </label>
      )}
      <p className="fine">
        {label}.{" "}
        {stage === "post_purchase"
          ? "Your experience is recorded as reported feedback; a preview or approval never proves a purchase."
          : "Discuss your plans, then review before saving."}
      </p>
      <div className="gs-mode-tabs" role="group" aria-label="Feedback mode">
        <button
          aria-pressed={mode === "chat"}
          className={mode === "chat" ? "active" : ""}
          onClick={() => setMode("chat")}
        >
          Chat
        </button>
        <button
          aria-pressed={mode === "voice"}
          className={mode === "voice" ? "active" : ""}
          disabled={!ready || busy}
          onClick={voice}
        >
          ◌ Discuss with AI
        </button>
      </div>
      <div hidden={mode !== "chat"}>
        <div className="gs-message-log" role="log">
          <p className="gs-assistant">
            What would you like to improve about{" "}
            {scope === "space" ? "your style wishes" : "this outfit"}?
          </p>
          {history.map((m) => (
            <div key={m.id} className={m.own ? "gs-user" : "gs-assistant"}>
              <small>
                {m.purchaseReported
                  ? "User-reported post-purchase feedback"
                  : "Planning note"}
                {m.renderVersion
                  ? ` · preview revision ${m.renderVersion}`
                  : ""}
              </small>
              <p>{m.text}</p>
            </div>
          ))}
          {turns[key]?.map((turn, i) => (
            <p
              key={i}
              className={turn.speaker === "You" ? "gs-user" : "gs-assistant"}
            >
              <strong>{turn.speaker}</strong> {turn.text}
            </p>
          ))}
          {replies[key] && <p className="gs-assistant">{replies[key]}</p>}
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (lock.current || !text.trim() || !ready) return;
            lock.current = true;
            setBusy(true);
            setError("");
            const snapshot = topic;
            try {
              const out = await discuss({
                spaceId: id,
                text,
                ...args(snapshot),
              });
              setTurns((t) => ({
                ...t,
                [key]: [
                  ...(t[key] ?? []),
                  { speaker: "You", text },
                  { speaker: "Style Guide", text: out.reply },
                ],
              }));
              setProposals((p) => ({
                ...p,
                [key]: { topic: snapshot, text: out.preference },
              }));
              setDrafts((d) => ({ ...d, [key]: "" }));
            } catch (e) {
              setError(errorText(e));
            } finally {
              lock.current = false;
              setBusy(false);
            }
          }}
        >
          <label className="sr-only" htmlFor="discussion-note">
            Message your Style Guide
          </label>
          <textarea
            id="discussion-note"
            rows={3}
            maxLength={1000}
            value={text}
            onChange={(e) =>
              setDrafts((d) => ({ ...d, [key]: e.target.value }))
            }
            placeholder="What would make this feel more like you?"
          />
          <button className="button" disabled={busy || !text.trim() || !ready}>
            {busy ? "Thinking…" : "Send to Style Guide ↑"}
          </button>
        </form>
        {proposal && (
          <div className="voice-review">
            <h4>
              Review the{" "}
              {proposal.topic.scope === "space" ? "preference" : "outfit note"}
            </h4>
            <p className="fine">
              {proposal.topic.label} ·{" "}
              {proposal.topic.stage === "post_purchase"
                ? "User-reported after purchase"
                : "Planning"}
            </p>
            <textarea
              maxLength={600}
              value={proposal.text}
              onChange={(e) =>
                setProposals((p) => ({
                  ...p,
                  [key]: { ...proposal, text: e.target.value },
                }))
              }
            />
            <button
              className="button"
              disabled={busy || !ready || !proposal.text.trim()}
              onClick={async () => {
                if (lock.current) return;
                lock.current = true;
                setBusy(true);
                try {
                  await apply(proposal.text, proposal.topic);
                } catch (e) {
                  setError(errorText(e));
                } finally {
                  lock.current = false;
                  setBusy(false);
                }
              }}
            >
              Confirm & save {scope === "space" ? "preference" : "outfit note"}
            </button>
            <button
              className="text-button"
              onClick={() =>
                setProposals((p) => {
                  const next = { ...p };
                  delete next[key];
                  return next;
                })
              }
            >
              Discard proposal
            </button>
          </div>
        )}
        <details>
          <summary>Or edit this topic directly</summary>
          <PreferenceEditor
            key={key}
            value={initial}
            enabled={ready}
            onSave={(value) => apply(value, topic)}
          />
        </details>
      </div>
      {threads.map((t) => (
        <div key={t.id} hidden={mode !== "voice" || activeThread !== t.id}>
          <p className="fine">
            Voice topic: {t.topic.label} ·{" "}
            {t.topic.stage === "post_purchase"
              ? "Your post-purchase report"
              : "Planning"}
            . Five minutes maximum.
          </p>
          <VoiceSession
            mode="discussion"
            spaceId={id}
            topic={args(t.topic)}
            context={JSON.stringify(t.topic)}
            active={mode === "voice" && activeThread === t.id}
            onClose={() => setMode("chat")}
            onReviewed={async (d) => {
              await apply(d.feedback, t.topic);
              setMode("chat");
            }}
          />
        </div>
      ))}
      {threads.filter((t) => t.topic.key === key).length > 1 && (
        <details>
          <summary>Earlier conversation drafts</summary>
          {threads
            .filter((t) => t.topic.key === key)
            .map((t, i) => (
              <button
                className="text-button"
                key={t.id}
                disabled={!ready}
                onClick={() => {
                  setActiveThread(t.id);
                  setMode("voice");
                }}
              >
                Conversation {i + 1} · {t.topic.label}
              </button>
            ))}
          <p className="fine">
            Older drafts stay on this page. A changed item must be reviewed
            against its current revision before saving.
          </p>
        </details>
      )}
      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
function PreferenceEditor({
  value,
  onSave,
  enabled = true,
}: {
  value: string;
  onSave: (v: string) => Promise<void>;
  enabled?: boolean;
}) {
  const [text, setText] = useState(value),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    dirty = useRef(false);
  useEffect(() => {
    if (!dirty.current) setText(value);
  }, [value]);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy || !enabled) return;
        setBusy(true);
        try {
          await onSave(text);
          dirty.current = false;
          setError("Saved.");
        } catch (e) {
          setError(errorText(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Reviewed note
        <textarea
          maxLength={600}
          value={text}
          onChange={(e) => {
            dirty.current = true;
            setText(e.target.value);
          }}
        />
      </label>
      <button
        className="button outline"
        disabled={busy || !enabled || !text.trim()}
      >
        Save reviewed note
      </button>
      {error && <p role="status">{error}</p>}
    </form>
  );
}
