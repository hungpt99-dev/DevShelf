export interface LinkHealth {
  status: "ok" | "redirected" | "broken" | "unknown";
  httpStatus: number | null;
  checkedAt: string;
  consecutiveFailures: number;
}

export interface LinkProbe {
  ok: boolean;
  httpStatus: number | null;
  redirected: boolean;
}

export function updateLinkHealth(previous: LinkHealth | undefined, probe: LinkProbe, now = new Date().toISOString()): LinkHealth {
  if (probe.ok) {
    return {
      status: probe.redirected ? "redirected" : "ok",
      httpStatus: probe.httpStatus,
      checkedAt: now,
      consecutiveFailures: 0,
    };
  }
  const failures = (previous?.consecutiveFailures ?? 0) + 1;
  return {
    status: failures >= 2 ? "broken" : "unknown",
    httpStatus: probe.httpStatus,
    checkedAt: now,
    consecutiveFailures: failures,
  };
}
