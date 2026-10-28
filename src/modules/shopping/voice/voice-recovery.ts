export type VoiceStopReason =
  | "manual"
  | "connection"
  | "provider"
  | "idle"
  | "limit"
  | "hidden"
  | "startup";
export type VoiceFragment = {
  id: string;
  speaker: "You" | "GiftSquire";
  text: string;
  start: number;
  end: number;
};

export function recoveryMessage(
  reason: VoiceStopReason,
  hasUserContent: boolean,
) {
  const titles: Record<VoiceStopReason, string> = {
    manual: "Voice stopped",
    connection: "Voice was interrupted",
    provider: "The voice session ended",
    idle: "Voice paused after silence",
    limit: "The voice time limit was reached",
    hidden: "Voice paused when you left this tab",
    startup: "Voice could not start",
  };
  return {
    title: titles[reason],
    body: hasUserContent
      ? "Your captured conversation and notes are still on this page. Check for any words that were cut off, then prepare a review without reconnecting."
      : "No spoken preferences have been captured yet. Add your request in Extra notes below, or reconnect when available.",
  };
}

export function appendVoiceFragment(
  history: VoiceFragment[],
  fragment: VoiceFragment,
  session: number,
  offset: number,
): VoiceFragment[] {
  return [
    ...history,
    {
      ...fragment,
      id: `${session}:${fragment.id}`,
      start: fragment.start + offset,
      end: fragment.end + offset,
    },
  ]
    .sort((a, b) => a.start - b.start)
    .slice(-600);
}

export function reviewFailureMessage(message: string) {
  if (/ASSISTANT_RATE_LIMIT/.test(message))
    return "Review requests are temporarily limited. Your captured text is still here; try again later.";
  if (/expired|session not found/i.test(message))
    return "The saved session context has expired. Your captured text is still here. Reconnect to create a new session before preparing another review.";
  return "The review could not be prepared this time. Your captured conversation and notes are still here. Retry preparing the review; you do not need to repeat the conversation.";
}
