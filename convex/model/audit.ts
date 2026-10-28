import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
export async function recordAudit(
  ctx: MutationCtx,
  event: {
    actorId?: Id<"users">;
    action: string;
    module: string;
    outcome: "success" | "failure";
    target?: string;
    summary: string;
    requestId?: string;
  },
) {
  // Selected metadata only: no profiles, provider responses, tokens, passwords, or secrets.
  return ctx.db.insert("auditEvents", {
    ...event,
    summary: event.summary.slice(0, 300),
    requestId: event.requestId || crypto.randomUUID(),
  });
}
