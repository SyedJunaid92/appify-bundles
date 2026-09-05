import { waitUntil } from "@vercel/functions";

export const WEBHOOK_RESPONSE_BUDGET_MS = 4000;

export async function settleOrDefer(
  work: Promise<unknown>,
  defer: (pending: Promise<unknown>) => void,
  budgetMs = WEBHOOK_RESPONSE_BUDGET_MS,
): Promise<"done" | "deferred"> {
  let finished = false;
  const tracked = Promise.resolve(work).then(
    () => {
      finished = true;
    },
    (error) => {
      finished = true;
      console.error("[webhook-work]", error);
    },
  );

  const outcome = await Promise.race([
    tracked.then(() => "done" as const),
    new Promise<"timeout">((resolve) => {
      setTimeout(() => resolve("timeout"), budgetMs);
    }),
  ]);

  if (outcome === "timeout" || !finished) {
    defer(tracked);
    return "deferred";
  }

  return "done";
}

export async function finishWebhookWork(work: Promise<unknown>) {
  return settleOrDefer(work, (pending) => {
    if (process.env.VERCEL) {
      waitUntil(pending);
      return;
    }
    void pending;
  });
}
