"use client";
// Adapted from Convex Life Maxim/components/interactive-mode.tsx: WebRTC lifecycle,
// captions, generation cancellation, visibility/idle timeout, mute and server stop.
import { useEffect, useRef, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import {
  LIVE_MODEL,
  LIVE_SECONDS,
  voiceDraftSchema,
  voiceReviewIssues,
  voiceWelcome,
  type VoiceDraft,
} from "./voice-contracts";
import {
  appendVoiceFragment,
  recoveryMessage,
  reviewFailureMessage,
  type VoiceStopReason,
  type VoiceFragment as Fragment,
} from "./voice-recovery";
function captions(fragments: Fragment[]) {
  const rows: Fragment[] = [];
  for (const f of fragments) {
    const last = rows.at(-1);
    if (last && last.speaker === f.speaker && f.start - last.end < 1500) {
      last.text += f.text;
      last.end = Math.max(last.end, f.end);
    } else rows.push({ ...f });
  }
  return rows;
}
export function VoiceSession({
  mode,
  context,
  spaceId,
  onReviewed,
  onClose,
  active = true,
}: {
  mode: "interactive" | "discussion";
  context: string;
  spaceId?: Id<"spaces">;
  onReviewed: (draft: VoiceDraft) => Promise<void>;
  onClose: () => void;
  active?: boolean;
}) {
  const startVoice = useAction(api.voiceActions.start),
    prepare = useAction(api.voiceActions.prepare),
    stopVoice = useMutation(api.voice.stop);
  const [connectionId, setConnectionId] =
    useState<Id<"voiceConnections"> | null>(null);
  const voice = useQuery(
    api.voice.state,
    connectionId ? { id: connectionId } : "skip",
  );
  const idRef = useRef<Id<"voiceConnections"> | null>(null);
  const [status, setStatus] = useState("Voice is off"),
    [busy, setBusy] = useState(false),
    [connected, setConnected] = useState(false),
    [muted, setMuted] = useState(false),
    [error, setError] = useState("");
  const [remaining, setRemaining] = useState(300),
    [fragments, setFragments] = useState<Fragment[]>([]),
    [notes, setNotes] = useState("");
  const [draft, setDraft] = useState<VoiceDraft | null>(null),
    [working, setWorking] = useState(false);
  const [questionsReviewed, setQuestionsReviewed] = useState(false);
  const [stopReason, setStopReason] = useState<VoiceStopReason | null>(null);
  const [reviewFailed, setReviewFailed] = useState(false),
    [reviewExpired, setReviewExpired] = useState(false);
  const [online, setOnline] = useState(true),
    [now, setNow] = useState(Date.now);
  const reviewInFlight = useRef(false),
    disconnectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
      undefined,
    );
  const serverGeneration = useRef(0);
  const peer = useRef<RTCPeerConnection | null>(null),
    channel = useRef<RTCDataChannel | null>(null),
    media = useRef<MediaStream | null>(null),
    audio = useRef<HTMLAudioElement | null>(null);
  const epoch = useRef(0),
    mounted = useRef(true),
    timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    seen = useRef(new Set<string>()),
    latestInput = useRef(0),
    expiry = useRef(0),
    connecting = useRef(false);
  function cleanup() {
    clearTimeout(timer.current);
    clearTimeout(disconnectTimer.current);
    media.current?.getTracks().forEach((t) => t.stop());
    media.current = null;
    if (channel.current) {
      channel.current.onmessage = null;
      channel.current.onclose = null;
      channel.current.close();
      channel.current = null;
    }
    if (peer.current) {
      peer.current.onconnectionstatechange = null;
      peer.current.ontrack = null;
      peer.current.close();
      peer.current = null;
    }
    if (audio.current) audio.current.srcObject = null;
    connecting.current = false;
  }
  async function stop(reason: VoiceStopReason = "manual") {
    epoch.current++;
    setBusy(false);
    setConnected(false);
    setMuted(false);
    setStopReason(reason);
    connecting.current = false;
    clearTimeout(disconnectTimer.current);
    media.current?.getTracks().forEach((t) => t.stop());
    media.current = null;
    if (channel.current?.readyState === "open")
      try {
        channel.current.send(JSON.stringify({ type: "session.close" }));
      } catch {
        /* Transport may already be closing. */
      }
    const closing = peer.current;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (peer.current === closing) cleanup();
    }, 3000);
    setStatus("Microphone off · captured text kept");
    if (idRef.current)
      try {
        await stopVoice({ id: idRef.current });
      } catch {
        if (mounted.current)
          setError(
            "Server cleanup is not confirmed yet. You can still prepare a review from your captured text; wait for cleanup before reconnecting.",
          );
      }
  }
  const stopRef = useRef(stop);
  useEffect(() => {
    stopRef.current = stop;
  });
  useEffect(() => {
    if (!active && (connecting.current || media.current || connected))
      void stopRef.current("hidden");
  }, [active, connected]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      epoch.current++;
      cleanup();
      if (idRef.current) void stopVoice({ id: idRef.current }).catch(() => {});
    };
  }, [stopVoice]);
  useEffect(() => {
    if (
      voice &&
      ["closed", "uncertain"].includes(voice.status) &&
      (connected || busy) &&
      serverGeneration.current === epoch.current &&
      connectionId === idRef.current
    )
      void stopRef.current("provider");
  }, [voice?.status, connected, busy, connectionId]);
  useEffect(() => {
    if (!connected) return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((expiry.current - Date.now()) / 1000));
      setRemaining(left);
      if (!left) void stopRef.current("limit");
      else if (Date.now() - latestInput.current > 90000)
        void stopRef.current("idle");
    }, 1000);
    const hidden = () => {
      if (document.hidden) void stopRef.current("hidden");
    };
    document.addEventListener("visibilitychange", hidden);
    hidden();
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [connected]);
  useEffect(() => {
    const update = () => {
      const value = navigator.onLine;
      setOnline(value);
      if (!value && (connecting.current || media.current))
        void stopRef.current("connection");
    };
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  const reconnectAt = voice ? voice.expiresAt - LIVE_SECONDS * 1000 + 61000 : 0;
  useEffect(() => {
    setNow(Date.now());
    if (Date.now() >= reconnectAt) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= reconnectAt) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [reconnectAt]);
  async function start() {
    if (
      !active ||
      !online ||
      reviewInFlight.current ||
      connecting.current ||
      connected ||
      (voice && voice.status !== "closed") ||
      Date.now() < reconnectAt
    )
      return;
    const offset = fragments.length
      ? Math.max(...fragments.map((f) => f.end)) + 2000
      : 0;
    const reconnecting = Boolean(idRef.current);
    cleanup();
    connecting.current = true;
    const generation = ++epoch.current;
    setBusy(true);
    setError("");
    setStopReason(null);
    setReviewFailed(false);
    setStatus("Requesting microphone…");
    setDraft(null);
    setQuestionsReviewed(false);
    seen.current.clear();
    setMuted(false);
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection)
        throw Error("Unsupported browser");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (generation !== epoch.current || document.hidden) {
        stream.getTracks().forEach((t) => t.stop());
        if (mounted.current) {
          setBusy(false);
          connecting.current = false;
        }
        return;
      }
      media.current = stream;
      const pc = new RTCPeerConnection();
      peer.current = pc;
      pc.ontrack = (e) => {
        if (generation === epoch.current && audio.current) {
          audio.current.srcObject = new MediaStream([e.track]);
          void audio.current
            .play()
            .catch(() => setStatus("Press play to hear the AI."));
        }
      };
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const dc = pc.createDataChannel("oai-events");
      channel.current = dc;
      dc.onmessage = (e) => {
        if (dc !== channel.current) return;
        let data;
        try {
          data = JSON.parse(String(e.data));
        } catch {
          return;
        }
        if (generation !== epoch.current) return;
        if (data.type === "session.closed") {
          void stopRef.current("provider");
          cleanup();
          return;
        }
        if (data.type === "session.started") {
          clearTimeout(timer.current);
          connecting.current = false;
          setBusy(false);
          setConnected(true);
          setStatus("Listening · AI voice");
          latestInput.current = Date.now();
          if (!seen.current.has("giftsquire-welcome")) {
            seen.current.add("giftsquire-welcome");
            dc.send(
              JSON.stringify({
                type: "session.commentary.append",
                event_id: crypto.randomUUID(),
                delegation_id: null,
                content: voiceWelcome(mode, reconnecting),
              }),
            );
          }
        }
        if (
          data.type === "session.delegation.created" &&
          typeof data.delegation?.id === "string" &&
          !seen.current.has(data.delegation.id)
        ) {
          seen.current.add(data.delegation.id);
          dc.send(
            JSON.stringify({
              type: "session.commentary.append",
              event_id: crypto.randomUUID(),
              delegation_id: data.delegation.id,
              content:
                "No application changes have run. Ask the user to Stop voice & prepare review, then confirm the on-screen handoff. After confirmation, GiftSquire saves the reviewed preferences. YouCam generates clothing and optional lipstick previews only when the person trying on requests them.",
            }),
          );
        }
        if (
          [
            "session.input_transcript.delta",
            "session.output_transcript.delta",
          ].includes(data.type) &&
          typeof data.delta === "string" &&
          typeof data.event_id === "string" &&
          Number.isFinite(data.start_ms) &&
          Number.isFinite(data.end_ms) &&
          !seen.current.has(data.event_id)
        ) {
          seen.current.add(data.event_id);
          if (data.type === "session.input_transcript.delta")
            latestInput.current = Date.now();
          const f: Fragment = {
            id: data.event_id,
            speaker:
              data.type === "session.input_transcript.delta"
                ? "You"
                : "GiftSquire",
            text: data.delta.slice(0, 2000),
            start: data.start_ms,
            end: data.end_ms,
          };
          setFragments((c) => appendVoiceFragment(c, f, generation, offset));
        }
        if (data.type === "error")
          setError(
            "A voice command was rejected. Stop voice if the conversation cannot continue.",
          );
      };
      pc.onconnectionstatechange = () => {
        if (generation !== epoch.current) return;
        if (pc.connectionState === "connected") {
          clearTimeout(disconnectTimer.current);
          if (!connecting.current) setStatus("Listening · AI voice");
        } else if (pc.connectionState === "failed") {
          void stopRef.current("connection");
        } else if (pc.connectionState === "disconnected") {
          setStatus("Audio paused · checking the connection");
          clearTimeout(disconnectTimer.current);
          disconnectTimer.current = setTimeout(() => {
            if (
              generation === epoch.current &&
              pc.connectionState === "disconnected"
            )
              void stopRef.current("connection");
          }, 6000);
        }
      };
      dc.onclose = () => {
        if (generation === epoch.current && mounted.current) {
          void stopRef.current("connection");
          cleanup();
        }
      };
      await pc.setLocalDescription(await pc.createOffer());
      if (pc.iceGatheringState !== "complete")
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            pc.removeEventListener("icegatheringstatechange", check);
            reject(Error("Network setup timed out"));
          }, 10000);
          function check() {
            if (pc.iceGatheringState === "complete") {
              clearTimeout(timeout);
              pc.removeEventListener("icegatheringstatechange", check);
              resolve();
            }
          }
          pc.addEventListener("icegatheringstatechange", check);
          check();
        });
      if (generation !== epoch.current) return;
      if (document.hidden) {
        await stop();
        return;
      }
      setStatus("Connecting securely…");
      const result = await startVoice({
        mode,
        context,
        requestId: crypto.randomUUID(),
        sdp: pc.localDescription?.sdp || "",
        ...(spaceId ? { spaceId } : {}),
      });
      if (generation !== epoch.current) {
        await stopVoice({ id: result.id });
        return;
      }
      idRef.current = result.id;
      serverGeneration.current = generation;
      setReviewExpired(false);
      if (document.hidden) {
        await stop();
        return;
      }
      setConnectionId(result.id);
      expiry.current = result.expiresAt;
      setRemaining(
        Math.max(0, Math.ceil((result.expiresAt - Date.now()) / 1000)),
      );
      await pc.setRemoteDescription({ type: "answer", sdp: result.sdp });
      if (connecting.current)
        timer.current = setTimeout(() => {
          setError("Voice did not become ready. No automatic retry was made.");
          void stopRef.current("startup");
        }, 15000);
    } catch (e) {
      if (generation !== epoch.current) return;
      cleanup();
      if (mounted.current) {
        setBusy(false);
        setConnected(false);
        setStopReason("startup");
        setStatus("Voice is off · captured text kept");
        setError(
          e instanceof ConvexError && typeof e.data === "string"
            ? e.data
            : e instanceof DOMException && e.name === "NotAllowedError"
              ? "Microphone permission was denied. You can continue using text."
              : "Could not connect voice. Check browser support, network and API access; no automatic paid retry was made.",
        );
      }
      if (idRef.current) void stopVoice({ id: idRef.current }).catch(() => {});
    }
  }
  async function review() {
    if (!idRef.current || reviewInFlight.current || !online || reviewExpired)
      return;
    reviewInFlight.current = true;
    setWorking(true);
    setError("");
    setReviewFailed(false);
    setDraft(null);
    setQuestionsReviewed(false);
    try {
      await stop();
      const text = (
        fragments.map((f) => `${f.speaker}: ${f.text}`).join("\n") +
        "\nUser notes: " +
        notes
      ).slice(-12000);
      const next = voiceDraftSchema.parse(
        JSON.parse(await prepare({ id: idRef.current, transcript: text })),
      );
      if (mounted.current) {
        setDraft(next);
        setStopReason(null);
        setError("");
        setStatus("Review ready · check and confirm below");
      }
    } catch (e) {
      if (mounted.current) {
        const message =
          e instanceof ConvexError && typeof e.data === "string" ? e.data : "";
        setReviewFailed(true);
        setReviewExpired(/expired|session not found/i.test(message));
        setError(reviewFailureMessage(message));
      }
    } finally {
      reviewInFlight.current = false;
      if (mounted.current) setWorking(false);
    }
  }
  const hasUserContent =
    fragments.some((f) => f.speaker === "You" && f.text.trim()) ||
    Boolean(notes.trim());
  const recovery =
    stopReason && !connected && !busy && !working && !draft
      ? recoveryMessage(stopReason, hasUserContent && Boolean(connectionId))
      : null;
  const reconnectWait = Math.max(0, Math.ceil((reconnectAt - now) / 1000));
  const reviewIssues = draft
    ? mode === "interactive"
      ? voiceReviewIssues(draft, questionsReviewed)
      : [
          ...(!draft.feedback.trim()
            ? ["Describe the preference you want to save."]
            : []),
          ...(draft.questions.length && !questionsReviewed
            ? ["Confirm that you have reviewed the open questions below."]
            : []),
        ]
    : [];
  return (
    <section
      className="panel voice-session"
      aria-label={
        mode === "interactive" ? "Interactive Mode" : "Discuss with AI"
      }
    >
      <div className="voice-heading">
        <h3>
          {mode === "interactive" ? "Interactive Mode" : "Discuss with AI"}
        </h3>
        <button
          className="text-button"
          disabled={working}
          onClick={() => {
            void stop();
            onClose();
          }}
        >
          Close ×
        </button>
      </div>
      <p>
        {mode === "interactive"
          ? "Talk through your shopping wishes and occasion, then review the details before choosing outfits."
          : "Talk about these outfit choices. Review your proposed improvement before applying it."}
      </p>
      <p className="fine">
        AI-generated voice · {LIVE_MODEL}. Start voice shares microphone audio
        and the displayed shopping context with OpenAI. GiftSquire does not
        store raw audio or captions on its server. Captured text is temporary on
        this page. A bounded context snapshot is kept for handoff and cleared
        after 24 hours; connection metadata and reviewed shopping preferences
        are saved. Provider policies apply.
      </p>
      <p role="status">
        <strong>{status}</strong>{" "}
        {connected &&
          `· ${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")} left`}
      </p>
      <div className="actions">
        <button
          className="button"
          disabled={
            !online ||
            busy ||
            connected ||
            working ||
            reconnectWait > 0 ||
            Boolean(voice && voice.status !== "closed")
          }
          onClick={() => void start()}
        >
          {busy
            ? "Connecting…"
            : connectionId
              ? "Reconnect voice"
              : "Start voice"}
        </button>
        <button
          className="button outline"
          disabled={!connected}
          onClick={() => {
            const next = !muted;
            media.current?.getTracks().forEach((t) => {
              t.enabled = !next;
            });
            if (channel.current?.readyState === "open")
              channel.current.send(
                JSON.stringify({
                  type: next
                    ? "session.input_audio.mute"
                    : "session.input_audio.unmute",
                  event_id: crypto.randomUUID(),
                }),
              );
            setMuted(next);
          }}
        >
          {muted ? "Unmute" : "Mute"}
        </button>
        <button
          className="button outline"
          disabled={!connected && !busy}
          onClick={() => void stop()}
        >
          Stop voice
        </button>
      </div>
      <audio
        ref={audio}
        autoPlay
        controls
        aria-label="GiftSquire AI voice playback"
      />
      {!connected && connectionId && (
        <p className="fine">
          {voice && voice.status !== "closed"
            ? "Reconnect will unlock when server cleanup is confirmed. You can prepare your review in the meantime."
            : reconnectWait > 0
              ? `Reconnect available in ${reconnectWait} seconds (one-minute cooldown).`
              : "Reconnect starts a new voice session and uses another daily start. Earlier captured text stays here for your review."}
        </p>
      )}
      <p className="fine">
        Five-minute maximum; six starts per account/day, 24 shared/day. Mute
        still uses time. Voice stops when the tab is hidden or after 90 seconds
        without user transcript activity. Server:{" "}
        {voice?.status || "not started"}. Billed usage is not measured here.
      </p>
      <div
        className="voice-captions"
        role="log"
        aria-label="Live conversation captions"
        aria-live="polite"
        tabIndex={0}
      >
        {captions(fragments).map((f) => (
          <p key={f.id}>
            <strong>{f.speaker}</strong> {f.text}
          </p>
        ))}
        {!fragments.length && <p>Your live captions will appear here.</p>}
      </div>
      <label>
        Extra notes for the review
        <textarea
          rows={2}
          maxLength={6000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      {!online && (
        <p role="status" className="notice">
          You appear to be offline. Your captured text is still here. Restore
          your internet connection to prepare a review or reconnect voice.
        </p>
      )}
      {reviewFailed ? (
        <div role="alert" className="voice-recovery">
          <h4>Your review is not ready yet</h4>
          <p>{error}</p>
          <p>
            Add anything missing in Extra notes above. Nothing is applied until
            you review and confirm.
          </p>
        </div>
      ) : (
        recovery && (
          <div role="status" className="voice-recovery">
            <h4>{recovery.title}</h4>
            <p>
              {reviewExpired
                ? "Your captured text is still here, but the previous session context expired. Reconnect before preparing a new review."
                : recovery.body}
            </p>
            <p>
              Choose a review below, add more notes, or use Reconnect voice when
              available. Captured text stays in this page; only confirmed
              changes are saved.
            </p>
          </div>
        )
      )}
      {(reviewFailed || recovery) && (
        <p className="fine">
          Prefer to enter the details yourself?{" "}
          <button
            className="text-button"
            onClick={() => {
              void stop();
              onClose();
            }}
          >
            {mode === "interactive" ? "Open User Mode" : "Open Chat"}
          </button>
        </p>
      )}
      {working && (
        <p role="status" className="fine">
          Preparing your review. This can take up to a minute; your captured
          text stays here.
        </p>
      )}
      <button
        className="button outline"
        disabled={
          !connectionId ||
          working ||
          !hasUserContent ||
          !online ||
          reviewExpired
        }
        onClick={() => void review()}
      >
        {working
          ? "Preparing…"
          : reviewFailed
            ? "Retry preparing review"
            : connected || busy
              ? "Stop voice & prepare review"
              : "Prepare review from captured conversation"}
      </button>
      {error && !reviewFailed && (
        <p role="alert" className="alert">
          {error}
        </p>
      )}
      {draft && (
        <div className="voice-review">
          <h4>Review before applying</h4>
          <p>{draft.summary}</p>
          <p className="fine">
            YouCam creates the actual clothing and lipstick previews. Your Style
            Guide helps you describe your wishes; it cannot approve for a
            recipient or make a purchase.
          </p>
          {draft.questions.length > 0 && (
            <div className="notice">
              <ul>
                {draft.questions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={questionsReviewed}
                  onChange={(e) => setQuestionsReviewed(e.target.checked)}
                />
                I reviewed these questions and checked the details.
              </label>
            </div>
          )}
          {mode === "interactive" && (
            <div className="form-grid">
              <label>
                Shopping for
                <select
                  value={draft.journey}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      journey: e.target.value as "self" | "gift",
                    })
                  }
                >
                  <option value="self">Myself</option>
                  <option value="gift">Someone else</option>
                </select>
              </label>
              <label>
                Space name
                <input
                  value={draft.title}
                  maxLength={80}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                />
              </label>
              <label>
                Occasion
                <input
                  value={draft.occasion}
                  maxLength={80}
                  onChange={(e) =>
                    setDraft({ ...draft, occasion: e.target.value })
                  }
                />
              </label>
              <label>
                Relationship
                <input
                  value={draft.relationship}
                  maxLength={60}
                  onChange={(e) =>
                    setDraft({ ...draft, relationship: e.target.value })
                  }
                />
              </label>
              <label>
                Currency
                <input
                  maxLength={3}
                  value={draft.currency}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      currency: e.target.value.toUpperCase(),
                    })
                  }
                />
              </label>
              <label>
                Budget (optional)
                <input
                  type="number"
                  min="1"
                  value={draft.budget ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      budget: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                />
              </label>
            </div>
          )}
          <label>
            {mode === "interactive" ? "Style wishes" : "Preference to save"}
            <textarea
              maxLength={600}
              value={
                mode === "interactive" ? draft.preferences : draft.feedback
              }
              onChange={(e) =>
                setDraft({
                  ...draft,
                  [mode === "interactive" ? "preferences" : "feedback"]:
                    e.target.value,
                })
              }
            />
          </label>
          {reviewIssues.length > 0 && (
            <div role="status" className="notice">
              <ul>
                {reviewIssues.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          )}
          <button
            className="button"
            disabled={working || reviewIssues.length > 0}
            onClick={async () => {
              setWorking(true);
              setError("");
              try {
                await onReviewed(draft);
                setDraft(null);
              } catch {
                setError(
                  "Could not apply this review. Your notes are still here. Check the current space and try again.",
                );
              } finally {
                setWorking(false);
              }
            }}
          >
            {mode === "interactive"
              ? "Confirm setup & choose outfits"
              : "Confirm & save preference"}
          </button>
        </div>
      )}
    </section>
  );
}
