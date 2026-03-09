type RateLimitEntry = {
  count: number;
  resetAtMs: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

const buckets = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number,
  nowMs = Date.now(),
): RateLimitResult {
  const current = buckets.get(key);
  if (!current || current.resetAtMs <= nowMs) {
    const next: RateLimitEntry = {
      count: 1,
      resetAtMs: nowMs + windowMs,
    };
    buckets.set(key, next);
    return {
      allowed: true,
      remaining: Math.max(max - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (current.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(Math.ceil((current.resetAtMs - nowMs) / 1000), 1),
    };
  }

  current.count += 1;
  return {
    allowed: true,
    remaining: Math.max(max - current.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((current.resetAtMs - nowMs) / 1000), 1),
  };
}

export function clearRateLimitBuckets(): void {
  buckets.clear();
}
