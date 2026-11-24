// Design Ref: §9 보안 — API 남용 방지: 같은 접속 주소가 짧은 시간에 너무 많이 부르면 429로 막는다. (특히 비용이 드는 AI 호출)
// 서버가 여러 개로 나뉘어 돌아가면(서버리스) 서버마다 따로 세므로 "완벽한 제한"이 아니라 기본 방어선이다.
// 더 단단히 하려면 Upstash 같은 공용 저장소로 바꾼다.
//
// 이 파일은 서버(API 라우트)에서만 쓴다.
const buckets = new Map<string, { count: number; resetAt: number }>();
/** 저장 항목이 이만큼 넘으면 기간이 끝난 항목부터 정리한다. (메모리가 계속 커지지 않게) */
const MAX_BUCKETS = 5000;

/** 요청을 보낸 쪽의 주소. 프록시가 붙이는 첫 번째 주소를 쓰고, 없으면 "unknown" */
function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}

/**
 * 같은 주소가 windowMs 동안 limit번을 넘기면 429 응답을 돌려주고, 아니면 null을 돌려준다.
 * @param name 어떤 API의 제한인지 (API마다 따로 센다)
 */
export function rateLimit(request: Request, name: string, limit: number, windowMs: number, nowMs = Date.now()): Response | null {
  const key = `${name}:${clientKey(request)}`;
  if (buckets.size > MAX_BUCKETS) {
    for (const [k, v] of buckets) if (v.resetAt <= nowMs) buckets.delete(k);
    if (buckets.size > MAX_BUCKETS) buckets.clear();
  }
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= nowMs) {
    buckets.set(key, { count: 1, resetAt: nowMs + windowMs });
    return null;
  }
  bucket.count += 1;
  if (bucket.count <= limit) return null;
  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - nowMs) / 1000));
  return Response.json(
    { message: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } },
  );
}

/** 시험용: 저장된 횟수를 모두 지운다. */
export function resetRateLimits(): void {
  buckets.clear();
}
