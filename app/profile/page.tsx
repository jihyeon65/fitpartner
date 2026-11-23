// Design Ref: §3.2 프로필 입력 — 선택 버튼으로 프로필을 고르고 [추천 받기]
// Plan: 작업 5번 "프로필 입력 화면"
import ProfileForm from "@/components/ProfileForm";

export default function ProfilePage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">프로필 입력</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          운동 종목·실력·목적 등을 선택하면 맞는 파트너를 추천해 드려요.
        </p>
      </div>

      <ProfileForm />
    </section>
  );
}
