'use client';

import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

type TelegramAuthUser = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
};

declare global {
  interface Window {
    BridgeTelegramAuth?: (user: TelegramAuthUser) => void;
  }
}

export default function SignInPage() {
  const router = useRouter();
  const telegramContainerRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const telegramBotName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME?.trim() ?? '';
  const telegramEnabled = telegramBotName.length > 0;

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

  const runTelegramSignIn = useCallback(async (user: TelegramAuthUser) => {
    const userId = user?.id ? String(user.id) : '';
    const authDate = user?.auth_date ? String(user.auth_date) : '';
    const hash = user?.hash ? String(user.hash) : '';

    if (!userId || !authDate || !hash) {
      setErrorMessage('Telegram payload is incomplete.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setInfoMessage('Signing in with Telegram...');

    const result = await signIn('telegram', {
      id: userId,
      first_name: user.first_name ?? '',
      last_name: user.last_name ?? '',
      username: user.username ?? '',
      photo_url: user.photo_url ?? '',
      auth_date: authDate,
      hash,
      redirect: false,
      callbackUrl: '/',
    });

    setIsLoading(false);
    if (result?.ok) {
      router.push('/');
      router.refresh();
      return;
    }

    setInfoMessage('');
    setErrorMessage('Telegram sign in failed.');
  }, [router]);

  useEffect(() => {
    const handler = (user: TelegramAuthUser) => {
      void runTelegramSignIn(user);
    };

    window.BridgeTelegramAuth = handler;
    return () => {
      delete window.BridgeTelegramAuth;
    };
  }, [runTelegramSignIn]);

  useEffect(() => {
    if (!telegramEnabled) return;
    if (!telegramContainerRef.current) return;

    const host = telegramContainerRef.current;
    host.innerHTML = '';

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', telegramBotName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-userpic', 'false');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-onauth', 'BridgeTelegramAuth(user)');
    host.appendChild(script);

    return () => {
      host.innerHTML = '';
    };
  }, [telegramBotName, telegramEnabled]);

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
          {telegramEnabled ? (
            <div className="mt-2">
              <div ref={telegramContainerRef} className="min-h-10" />
              <p className="mt-2 text-[11px] text-slate-500">
                Use Telegram Login Widget to sign in or auto-create account.
              </p>
            </div>
          ) : (
            <div className="text-xs text-slate-500 mt-1">
              Set <code className="mx-1 text-[11px]">NEXT_PUBLIC_TELEGRAM_BOT_NAME</code> to enable Telegram sign-in
              widget.
            </div>
          )}
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
