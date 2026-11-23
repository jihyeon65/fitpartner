// Design Ref: §3.1 로그인 — 닉네임 입력칸 1개와 [시작하기] 버튼 (이메일·비밀번호 없음)
// Plan: 작업 4번 "닉네임만 입력하는 실습용 간단 로그인"
import NicknameForm from "@/components/NicknameForm";

export default function Home() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">핏파트너</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          AI가 잘 맞는 운동 파트너를 찾고, 함께 운동할 방법까지 안내해 드려요.
        </p>
      </div>

      <NicknameForm />
    </section>
  );
}
