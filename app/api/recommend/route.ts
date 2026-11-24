// Design Ref: §7 API 명세 — POST /api/recommend: 프로필을 받아 필수 조건 거르기 → 점수 계산 → 최대 5명 반환 (AI 없음)
// Design Ref: §4.1 추천 흐름 — 점수는 AI가 아니라 코드가 계산한다.
// Plan: 작업 9번 "추천 결과 화면(AI 없이 먼저)"
import { VIRTUAL_PROFILES } from "@/lib/profiles";
import { rateLimit } from "@/lib/rate-limit";
import { recommend } from "@/lib/score";
import { checkProfileInput } from "@/lib/validate-profile";

export async function POST(request: Request) {
  const limited = rateLimit(request, "recommend", 120, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "요청 내용을 읽지 못했어요." }, { status: 400 });
  }

  const checked = checkProfileInput(body);
  if (!checked.ok) {
    return Response.json({ message: `${checked.missing.join(", ")}을 선택해 주세요.` }, { status: 400 });
  }

  const results = recommend(checked.profile, VIRTUAL_PROFILES).map(
    ({ profile, score, matchedConditions, levelGap, meetMode, isReference, isRelaxed, differences }) => ({
      profile,
      score,
      matchedConditions,
      levelGap,
      meetMode,
      isReference,
      isRelaxed,
      differences,
    }),
  );
  return Response.json(results);
}
