"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const EMAIL_DOMAIN = "@scarletmail.rutgers.edu";

export default function LoginPage() {
  // useRouter = 페이지 이동을 코드로 하게 해주는 도구. <a> 태그를 누르는 것과 같은 일을
  // 함수 호출로 한다. 로그인이 끝난 뒤 자동으로 /capture로 보내려고 쓴다.
  const router = useRouter();

  // 이 화면은 두 단계다: 이메일을 받는 단계 → 메일로 온 6자리 코드를 받는 단계.
  // 화면 두 개를 만들 수도 있지만, 그러면 페이지를 이동하는 순간 아래 netid 값이 날아가서
  // 코드 검증에 필요한 이메일 주소를 다시 물어봐야 한다. 한 화면에서 단계만 바꾼다.
  const [step, setStep] = useState<"email" | "code">("email");

  const [netid, setNetid] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false); // 요청 중 (버튼 잠금 + 중복 전송 방지)
  const [errorMessage, setErrorMessage] = useState("");

  const email = `${netid}${EMAIL_DOMAIN}`;

  // 1단계: 이메일로 6자리 코드를 보낸다.
  //
  // 예전에는 "매직 링크"(메일의 링크를 누르면 로그인됨)를 썼는데 치명적인 문제가 있었다.
  // Gmail 앱에서 링크를 누르면 Safari가 아니라 구글 앱 안의 브라우저가 열리고,
  // 로그인 세션(쿠키)은 브라우저마다 따로 저장되므로 유저가 나중에 Safari로 앱을 열면
  // 로그아웃 상태가 된다. 어느 브라우저로 열릴지는 우리가 통제할 수 없다.
  //
  // 코드 방식은 브라우저를 건너가지 않는다 — 유저가 숫자를 눈으로 읽어 지금 이 화면에
  // 입력하므로, 세션이 처음부터 끝까지 같은 브라우저에 남는다.
  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrorMessage("");

    const supabase = createClient();
    // emailRedirectTo가 사라진 것에 주목. 돌아올 주소 자체가 필요 없어졌다.
    const { error } = await supabase.auth.signInWithOtp({ email });

    setBusy(false);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setStep("code");
  }

  // 2단계: 유저가 입력한 코드가 맞는지 서버에 확인받는다.
  // 맞으면 Supabase가 세션 쿠키를 이 브라우저에 심어준다 = 로그인 완료.
  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrorMessage("");

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email", // 이메일로 보낸 로그인 코드라는 뜻 (문자 인증 등과 구분하는 값)
    });

    if (error) {
      setBusy(false);
      setErrorMessage(error.message); // 코드가 틀렸거나 만료됨 — 다시 입력할 수 있게 둔다
      return;
    }

    // 로그인의 목적지. /map이 생기면(태스크 7) 그쪽으로 바꾼다.
    router.push("/capture");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      {step === "email" ? (
        <form onSubmit={sendCode} className="flex w-full max-w-sm flex-col gap-4">
          <h1 className="text-2xl font-semibold">Log in</h1>
          <p className="text-sm text-zinc-500">
            Enter your NetID (the part before <strong>{EMAIL_DOMAIN}</strong>).
          </p>
          <div className="flex items-center rounded border px-3 py-2">
            <input
              type="text"
              required
              placeholder="netid"
              value={netid}
              onChange={(e) => setNetid(e.target.value)}
              className="min-w-0 flex-1 outline-none"
            />
            <span className="whitespace-nowrap text-zinc-500">{EMAIL_DOMAIN}</span>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send login code"}
          </button>
          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
        </form>
      ) : (
        <form onSubmit={verifyCode} className="flex w-full max-w-sm flex-col gap-4">
          <h1 className="text-2xl font-semibold">Enter your code</h1>
          <p className="text-sm text-zinc-500">
            We sent a code to <strong>{email}</strong>. Check your spam folder.
          </p>
          <input
            type="text"
            required
            // inputMode="numeric" — 폰에서 문자 키보드 대신 숫자 키패드가 뜬다.
            // autoComplete="one-time-code" — iOS가 방금 온 메일에서 코드를 읽어
            // 키보드 위에 "자동 입력" 버튼을 띄워준다. 타이핑 없이 한 번에 채워진다.
            inputMode="numeric"
            autoComplete="one-time-code"
            // 코드 길이는 우리가 정하는 게 아니라 Supabase 대시보드 설정값이다(기본 6, 최대 10).
            // 여기에 6을 박아두면 8자리로 설정된 순간 뒤 두 자리가 입력조차 안 되고,
            // 화면엔 아무 에러도 안 뜬다 — "코드가 계속 틀리다"로만 보인다.
            // 최대치인 10을 두고 실제 검증은 서버에 맡긴다. 설정을 바꿔도 여기는 안 고쳐도 된다.
            maxLength={10}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="rounded border px-3 py-2 text-center text-2xl tracking-[0.4em] outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
          >
            {busy ? "Verifying…" : "Log in"}
          </button>
          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
          {/* 오타로 엉뚱한 주소에 보냈을 때 빠져나갈 길. 없으면 새로고침밖에 방법이 없다. */}
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setErrorMessage("");
            }}
            className="text-sm text-zinc-500 underline"
          >
            Use a different NetID
          </button>
        </form>
      )}
    </div>
  );
}
