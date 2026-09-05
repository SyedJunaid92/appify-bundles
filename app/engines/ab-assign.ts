export type ExperimentVariant = "control" | "challenger";

export function assignExperimentVariant(
  trafficPercent: number,
  seed: string,
): ExperimentVariant {
  const clamped = Math.min(90, Math.max(10, Math.round(trafficPercent)));
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return hash % 100 < clamped ? "challenger" : "control";
}

export function experimentCookieName(experimentId: string) {
  return `appify_ab_${experimentId}`;
}

export function parseExperimentCookie(
  value: string | undefined | null,
): ExperimentVariant | null {
  if (value === "control" || value === "challenger") return value;
  return null;
}
