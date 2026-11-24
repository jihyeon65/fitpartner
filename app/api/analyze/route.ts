// Design Ref: §7 API 명세 — POST /api/analyze: 사용자·후보 한 쌍을 받아 AI 분석을 호출하고, 검사·후처리한 결과를 반환
//   AI 시간 초과·호출 실패는 503, 정보 부족은 200 + 안내
// Design Ref: §4.2 — AI에는 닉네임 없이 코드 값만 보낸다.
// Plan: 작업 11번 "AI 성향 분석·추천 이유", 작업 12번 "AI 연습 방식·운동 프로그램 추천"
import { aiFailureResponse, askAi } from "@/lib/ai";
import { ANALYSIS_INSTRUCTIONS, buildAnalysisInput, checkAnalysis } from "@/lib/analysis";
import { VIRTUAL_PROFILES } from "@/lib/profiles";
import { rateLimit } from "@/lib/rate-limit";
import { checkProfileInput } from "@/lib/validate-profile";

/** 한 주소가 1분에 AI 분석을 부를 수 있는 횟수 (추천 카드 5장 × 몇 번 정도) */
const ANALYZE_LIMIT_PER_MINUTE = 20;

export async function POST(request: Request) {
  const limited = rateLimit(request, "analyze", ANALYZE_LIMIT_PER_MINUTE, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "요청 내용을 읽지 못했어요." }, { status: 400 });
  }

  const { me: meInput, candidateId } = (typeof body === "object" && body !== null ? body : {}) as {
    me?: unknown;
    candidateId?: unknown;
  };

  const me = checkProfileInput(meInput);
  if (!me.ok) {
    return Response.json({ message: `${me.missing.join(", ")}을 선택해 주세요.` }, { status: 400 });
  }
  const candidate = VIRTUAL_PROFILES.find((profile) => profile.id === candidateId);
  if (!candidate) {
    return Response.json({ message: "추천 후보를 찾지 못했어요." }, { status: 404 });
  }

  const ai = await askAi(ANALYSIS_INSTRUCTIONS, JSON.stringify(buildAnalysisInput(me.profile, candidate)));
  if (!ai.ok) return aiFailureResponse(ai.reason);

  return Response.json(checkAnalysis(ai.text, me.profile, candidate));
}
