'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const runSignIn = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setInfoMessage('');
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
      callbackUrl: '/',
    });
    setIsLoading(false);

    if (result?.ok) {
      router.push('/');
      router.refresh();
      return;
    }
    setErrorMessage('Sign in failed. Check email/password.');
  };

  const runRegister = async () => {
    setIsLoading(true);
    setErrorMessage('');
    setInfoMessage('');
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });

      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        setErrorMessage(payload.message ?? 'Registration failed');
        return;
      }

      setInfoMessage('Registration successful. Signing in...');
      await runSignIn();
    } catch {
      setErrorMessage('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
        <p className="text-sm text-slate-500 mt-1">Use email/password or Telegram to access your systems.</p>

        <div className="mt-5 space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Display name (optional)</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Alexey"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Email</span>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="name@example.com"
              type="email"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Minimum 8 characters"
              type="password"
            />
          </label>
        </div>

        {errorMessage ? <div className="mt-3 text-sm text-red-600">{errorMessage}</div> : null}
        {infoMessage ? <div className="mt-3 text-sm text-emerald-600">{infoMessage}</div> : null}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={runSignIn}
            disabled={isLoading || !email || !password}
            className="h-10 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={runRegister}
            disabled={isLoading || !email || !password}
            className="h-10 rounded-md border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            Register
          </button>
        </div>

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Telegram</div>
          <div className="text-xs text-slate-500 mt-1">
            Telegram sign-in backend is ready. Connect Telegram Login Widget and send payload to provider
            <code className="mx-1 text-[11px]">telegram</code>.
          </div>
        </div>

        <div className="mt-4 text-xs text-slate-500">
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            Back to editor
          </Link>
        </div>
      </div>
    </main>
  );
}
