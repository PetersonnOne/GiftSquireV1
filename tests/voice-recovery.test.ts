import { describe, it, expect } from "vitest";
import {
  appendVoiceFragment,
  recoveryMessage,
  reviewFailureMessage,
  type VoiceFragment,
} from "../src/modules/shopping/voice/voice-recovery";

describe("voice recovery without losing captured work", () => {
  it("offers review without reconnecting when text exists, and asks for notes when it does not", () => {
    expect(recoveryMessage("connection", true).body).toContain(
      "without reconnecting",
    );
    expect(recoveryMessage("connection", false).body).toContain(
      "No spoken preferences",
    );
    expect(recoveryMessage("limit", true).title).toContain("time limit");
    expect(recoveryMessage("idle", true).title).toContain("silence");
    expect(recoveryMessage("hidden", true).title).toContain("tab");
  });
  it("keeps earlier captions ordered and distinct when a new provider session reuses timestamps and event IDs", () => {
    const first: VoiceFragment = {
      id: "1:same",
      speaker: "You",
      text: "Keep peanuts excluded.",
      start: 0,
      end: 1000,
    };
    const next = appendVoiceFragment(
      [first],
      { ...first, id: "same", text: "Please add fish.", start: 0, end: 300 },
      3,
      3000,
    );
    expect(next.map((f) => f.text)).toEqual([
      "Keep peanuts excluded.",
      "Please add fish.",
    ]);
    expect(next.map((f) => f.start)).toEqual([0, 3000]);
    expect(new Set(next.map((f) => f.id)).size).toBe(2);
    expect(first.id).toBe("1:same");
    const bounded = appendVoiceFragment(
      Array.from({ length: 600 }, (_, i) => ({
        ...first,
        id: String(i),
        start: i,
        end: i + 1,
      })),
      { ...first, id: "last" },
      5,
      2000,
    );
    expect(bounded).toHaveLength(600);
    expect(bounded.at(-1)?.id).toBe("5:last");
  });
  it("distinguishes a retryable review failure from expired context and rate limits", () => {
    expect(reviewFailureMessage("Temporary provider error")).toContain(
      "do not need to repeat",
    );
    expect(
      reviewFailureMessage("This conversation context expired."),
    ).toContain("Reconnect");
    expect(reviewFailureMessage("ASSISTANT_RATE_LIMIT")).toContain(
      "try again later",
    );
  });
});
