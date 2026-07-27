"use client";

import { useState, type FormEvent } from "react";

type LoginFormProps = {
  onSuccess: (username: string) => void;
};

export const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        setError("Invalid username or password.");
        return;
      }
      const data = (await response.json()) as { username: string };
      onSuccess(data.username);
    } catch {
      setError("Unable to sign in. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div className="pointer-events-none absolute left-0 top-0 h-[420px] w-[420px] -translate-x-1/3 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,_rgba(32,157,215,0.25)_0%,_rgba(32,157,215,0.05)_55%,_transparent_70%)]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-[520px] w-[520px] translate-x-1/4 translate-y-1/4 rounded-full bg-[radial-gradient(circle,_rgba(117,57,145,0.18)_0%,_rgba(117,57,145,0.05)_55%,_transparent_75%)]" />

      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-[32px] border border-[var(--stroke)] bg-white/90 p-8 shadow-[var(--shadow)] backdrop-blur"
        data-testid="login-form"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--gray-text)]">
          Sign in
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-[var(--navy-dark)]">
          Kanban Studio
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--gray-text)]">
          Use your demo credentials to open the board.
        </p>

        <label className="mt-8 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
          Username
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            name="username"
            autoComplete="username"
            className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
            required
          />
        </label>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gray-text)]">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            name="password"
            autoComplete="current-password"
            className="mt-2 w-full rounded-xl border border-[var(--stroke)] bg-white px-3 py-3 text-sm font-medium normal-case tracking-normal text-[var(--navy-dark)] outline-none transition focus:border-[var(--primary-blue)]"
            required
          />
        </label>

        {error ? (
          <p className="mt-4 text-sm text-[var(--secondary-purple)]" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="mt-8 w-full rounded-full bg-[var(--secondary-purple)] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
};
