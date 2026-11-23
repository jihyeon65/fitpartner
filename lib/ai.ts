// Design Ref: §4.2 AI에 보내는 것과 받는 것 — 10초 초과·호출 실패면 AI 영역만 "잠시 후 다시 시도해 주세요"
// Design Ref: §7 API 명세 — AI 호출 실패는 503 (공공데이터는 502)
// Design Ref: §9 보안 — API 키는 .env(OPENAI_API_KEY)에만 두고 서버 코드에서만 읽는다. (NEXT_PUBLIC_ 금지)
// Plan: 작업 10번 "AI API 연결과 오류 처리" — 분석 내용(프롬프트·형식 검사)은 작업 11·12번에서 이어서 만든다.
//
// 이 파일은 서버에서만 쓴다. 브라우저 코드가 가져오면 빌드가 실패해서 키가 새는 일을 막아 준다.
import "server-only";
import OpenAI from "openai";

/** AI 응답을 기다리는 최대 시간 (10초) */
export const AI_TIMEOUT_MS = 10_000;

/** 사용할 AI 모델 */
export const AI_MODEL = "gpt-4o-mini";

/** 실패했을 때 화면에 보여주는 안내 문구 (AI 영역에만 보이고 점수 목록은 그대로 둔다) */
export const AI_RETRY_MESSAGE = "잠시 후 다시 시도해 주세요";

/** 실패 이유: 시간 초과 / 키 없음 / 그 밖의 호출 실패 */
export type AiFailure = "timeout" | "no-key" | "failed";

export type AiResult = { ok: true; text: string } | { ok: false; reason: AiFailure };

/** AI 호출에 필요한 최소한의 모양. (시험할 때 가짜 도구를 넣을 수 있게 따로 정의한다) */
export interface AiClient {
  responses: {
    create(
      body: { model: string; instructions: string; input: string },
      options: { timeout: number; maxRetries: number },
    ): Promise<{ output_text: string }>;
  };
}

/** 키가 있을 때만 진짜 AI 도구를 만든다. 키 값은 어디에도 출력하지 않는다. */
function createClient(): AiClient | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey }) as unknown as AiClient;
}

/**
 * AI에게 질문하고 글자 답을 받는다. 실패해도 오류를 던지지 않고 이유를 담아 돌려준다.
 * @param instructions AI에게 주는 지시문
 * @param input 분석할 내용 (닉네임·개인 식별 정보는 넣지 않는다)
 * @param deps 시험용으로 가짜 도구·제한 시간을 넣을 때만 사용
 */
export async function askAi(
  instructions: string,
  input: string,
  deps: { client?: AiClient | null; timeoutMs?: number } = {},
): Promise<AiResult> {
  const client = deps.client === undefined ? createClient() : deps.client;
  if (!client) return { ok: false, reason: "no-key" };

  const timeoutMs = deps.timeoutMs ?? AI_TIMEOUT_MS;
  try {
    // 다시 시도(maxRetries)를 끄고 제한 시간을 한 번만 적용해서, 실제 대기 시간이 10초를 넘지 않게 한다.
    const response = await client.responses.create(
      { model: AI_MODEL, instructions, input },
      { timeout: timeoutMs, maxRetries: 0 },
    );
    const text = response.output_text?.trim();
    return text ? { ok: true, text } : { ok: false, reason: "failed" };
  } catch (error) {
    const isTimeout = error instanceof OpenAI.APIConnectionTimeoutError;
    return { ok: false, reason: isTimeout ? "timeout" : "failed" };
  }
}

/** 실패 이유를 API 응답으로 바꾼다. (503 + 화면에 보여줄 안내 문구) */
export function aiFailureResponse(reason: AiFailure): Response {
  // 키가 없는 경우도 사용자에게는 같은 안내만 보이고, 이유는 서버 로그에만 남긴다.
  console.error(`[AI] 호출 실패: ${reason}`);
  return Response.json({ message: AI_RETRY_MESSAGE, reason }, { status: 503 });
}
