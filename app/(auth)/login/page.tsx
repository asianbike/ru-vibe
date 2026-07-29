"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const EMAIL_DOMAIN = "@scarletmail.rutgers.edu";

export default function LoginPage() {
  const [netid, setNetid] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (!netid) {
      setStatus("error");
      setErrorMessage("Please enter your NetID.");
      return;
    }

    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: `${netid}${EMAIL_DOMAIN}`,
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
