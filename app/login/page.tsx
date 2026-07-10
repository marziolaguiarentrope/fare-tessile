'use client';

import { useActionState } from 'react';
import { BrandLogo } from '@/components/brand-logo';
import { login } from '@/lib/auth/actions';

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-brand-navy to-brand-denim px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <BrandLogo className="h-10 w-auto" fallbackClassName="text-2xl" />
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-8">
          <h1 className="mb-1 text-lg font-bold text-white">Fare Tessile Hub</h1>
          <p className="mb-6 text-xs text-white/40">Sign in to continue</p>

          <form action={action} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/60" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-brand-gold/60 focus:ring-1 focus:ring-brand-gold/30"
                placeholder="your username"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white/60" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition focus:border-brand-gold/60 focus:ring-1 focus:ring-brand-gold/30"
                placeholder="••••••••••"
              />
            </div>

            {state?.error && (
              <p className="rounded-lg border border-brand-rose/30 bg-brand-rose/10 px-3 py-2 text-xs text-brand-rose">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="mt-2 w-full rounded-lg bg-brand-gold py-2.5 text-sm font-semibold text-brand-navy transition hover:bg-brand-gold/90 disabled:opacity-50"
            >
              {pending ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-white/20">
          Fare Tessile © {new Date().getFullYear()}
        </p>
      </div>
    </main>
  );
}
