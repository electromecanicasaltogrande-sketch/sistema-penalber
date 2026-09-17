"use client";

import { useActionState } from "react";
import { login } from "./actions";

const initialState = { error: "" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await login(formData);
      return result ?? initialState;
    },
    initialState,
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-[var(--radius-app)] border border-border bg-surface p-8 shadow-sm">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold text-ink">
          Electrotécnica Peñalber
        </h1>
        <p className="mt-1 text-sm text-ink-faint">
          Sistema de gestión — iniciá sesión
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="usuario" className="text-xs font-semibold text-ink-soft">
              Usuario
            </label>
            <input
              id="usuario"
              name="usuario"
              type="text"
              autoComplete="username"
              required
              className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-ink-soft">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-ink outline-none focus:border-copper focus:ring-1 focus:ring-copper"
            />
          </div>

          {state.error && (
            <p className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
              {state.error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-copper px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-copper-dark disabled:opacity-60"
          >
            {pending ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </main>
  );
}
