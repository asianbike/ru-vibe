"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const EMAIL_DOMAIN = "@scarletmail.rutgers.edu";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!email.toLowerCase().endsWith(EMAIL_DOMAIN)) {
      setStatus("error");
      setErrorMessage(`Please use your ${EMAIL_DOMAIN} email.`);
      return;
    }

    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }

    setStatus("sent");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-4">
        <h1 className="text-2xl font-semibold">Log in</h1>
        <p className="text-sm text-zinc-500">
          use <strong>@scarletmail.rutgers.edu</strong>, not @rutgers.edu to login.
        </p>
        <input
          type="email"
          required
          placeholder="netid@scarletmail.rutgers.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded bg-black px-3 py-2 text-white disabled:opacity-50"
        >
          Send login link
        </button>
        {status === "sent" && (
          <p className="text-sm text-green-600">Check your inbox for the login link.</p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-600">{errorMessage}</p>
        )}
      </form>
    </div>
  );
}
