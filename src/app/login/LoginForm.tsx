"use client";

import { useActionState } from "react";
import { loginAction } from "./actions";

export function LoginForm() {
  const [error, formAction, isPending] = useActionState(loginAction, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {/* Email */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-xs font-medium"
          style={{ color: "#8b9196" }}
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue="mateusz@enviropax.com"
          placeholder="you@enviropax.com"
          className="px-3 py-2 text-sm rounded-lg outline-none"
          style={{
            backgroundColor: "#1a1d20",
            color: "#e2e4e6",
            border: "1px solid #2a2d30",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(232,160,32,0.6)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2d30")}
        />
      </div>

      {/* Password */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-xs font-medium"
          style={{ color: "#8b9196" }}
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          defaultValue="test997"
          placeholder="••••••••"
          className="px-3 py-2 text-sm rounded-lg outline-none"
          style={{
            backgroundColor: "#1a1d20",
            color: "#e2e4e6",
            border: "1px solid #2a2d30",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(232,160,32,0.6)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#2a2d30")}
        />
      </div>

      {/* Error */}
      {error && (
        <p
          className="text-xs px-3 py-2 rounded-lg"
          style={{
            color: "#fca5a5",
            backgroundColor: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.25)",
          }}
        >
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="mt-1 py-2.5 text-sm font-semibold rounded-lg disabled:opacity-60 transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#e8a020", color: "#000" }}
      >
        {isPending ? "Signing in…" : "Sign In"}
      </button>
    </form>
  );
}
