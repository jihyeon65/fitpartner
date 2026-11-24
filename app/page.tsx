// Design Ref: §3.1 로그인 — 닉네임 입력칸 1개와 [시작하기] 버튼 (이메일·비밀번호 없음)
// Plan: 작업 4번 "닉네임만 입력하는 실습용 간단 로그인", 디자인 개선(첫 화면 3D 장면)
import HeroScene from "@/components/HeroScene";
import Logo from "@/components/Logo";
import NicknameForm from "@/components/NicknameForm";
import PrivacyNotice from "@/components/PrivacyNotice";

export default function Home() {
  return (
    <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <div>
          <h1>
            <Logo size={44} textClassName="text-3xl" />
          </h1>
          <p className="mt-3 max-w-md text-lg leading-relaxed text-zinc-700 dark:text-zinc-300">
            AI가 잘 맞는 운동 파트너를 찾고, 함께 운동할 방법까지 안내해 드려요.
          </p>
        </div>

        <NicknameForm />
        <PrivacyNotice />
      </div>

      <HeroScene />
    </section>
  );
}
