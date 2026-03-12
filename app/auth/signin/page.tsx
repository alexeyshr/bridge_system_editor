'use client';

import { EyeIcon, EyeOffIcon, XIcon } from 'lucide-react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

type TelegramAuthUser = {
  id: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
};

type AuthAction = 'signin' | 'register' | 'telegram' | null;
const REMEMBERED_EMAIL_KEY = 'bridge.portal.auth.rememberedEmail';

declare global {
  interface Window {
    BridgeTelegramAuth?: (user: TelegramAuthUser) => void;
  }
}

export default function SignInPage() {
  const { status } = useSession();
  const router = useRouter();
  const telegramContainerRef = useRef<HTMLDivElement | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(true);
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<AuthAction>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const telegramBotName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME?.trim() ?? '';
  const telegramEnabled = telegramBotName.length > 0;
  const closeSignIn = useCallback(() => {
    router.push('/');
  }, [router]);
  const syncRememberedEmail = useCallback((value: string, shouldRemember: boolean) => {
    if (typeof window === 'undefined') return;
    const normalized = value.trim().toLowerCase();
    if (shouldRemember && normalized) {
      window.localStorage.setItem(REMEMBERED_EMAIL_KEY, normalized);
      return;
    }
    window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  }, []);

  const runSignIn = async () => {
    setActiveAction('signin');
    setIsLoading(true);
    setErrorMessage('');
    setInfoMessage('');
    syncRememberedEmail(email, rememberEmail);
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: '/',
      });

      if (result?.ok) {
        router.push('/');
        router.refresh();
        return;
      }
      setErrorMessage('Sign in failed. Check email/password.');
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  };

  const runRegister = async () => {
    setActiveAction('register');
    setIsLoading(true);
    setErrorMessage('');
    setInfoMessage('');
    syncRememberedEmail(email, rememberEmail);
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
      setActiveAction(null);
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
    setActiveAction('telegram');
    setErrorMessage('');
    setInfoMessage('');
    try {
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

      if (result?.ok) {
        router.push('/');
        router.refresh();
        return;
      }

      setInfoMessage('');
      setErrorMessage('Telegram sign in is available only for linked accounts. Sign in with email first and link Telegram in profile.');
    } catch {
      setInfoMessage('');
      setErrorMessage('Telegram sign-in request failed. Please try again.');
    } finally {
      setIsLoading(false);
      setActiveAction(null);
    }
  }, [router]);

  const handleSignInSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isLoading || !email || !password) return;
    void runSignIn();
  };

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
    if (status !== 'authenticated') return;
    router.replace('/');
    router.refresh();
  }, [status, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const remembered = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (!remembered) return;
    setEmail(remembered);
    setRememberEmail(true);
  }, []);

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      closeSignIn();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [closeSignIn]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Sign in</h1>
            <p className="mt-1 text-sm text-slate-500">
              Sign up/sign in with email, then link Telegram in your profile settings.
            </p>
          </div>
          <button
            type="button"
            onClick={closeSignIn}
            aria-label="Close sign in and return to portal"
            title="Close"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <form className="mt-5 space-y-3" onSubmit={handleSignInSubmit} autoComplete="on">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Display name (optional)</span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Alexey"
              autoComplete="name"
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
              autoComplete="email"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-slate-500">Password</span>
            <div className="relative mt-1">
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-200 px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Minimum 8 characters"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded text-slate-500 transition-colors hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </div>
          </label>
          <label className="mt-1 inline-flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              className="size-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={rememberEmail}
              onChange={(event) => {
                const nextValue = event.target.checked;
                setRememberEmail(nextValue);
                syncRememberedEmail(email, nextValue);
              }}
            />
            Remember email on this device
          </label>

          {errorMessage ? <div className="mt-3 text-sm text-red-600">{errorMessage}</div> : null}
          {infoMessage ? <div className="mt-3 text-sm text-emerald-600">{infoMessage}</div> : null}

          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="h-10 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading && activeAction === 'signin' ? (
                <span className="inline-flex items-center gap-2">
                  <span className="relative inline-flex size-5 items-center justify-center">
                    <span className="absolute inset-0 rounded-full border border-white/45 border-t-white animate-spin motion-reduce:animate-none" />
                    <span className="text-[13px] leading-none text-white animate-pulse motion-reduce:animate-none">
                      ♣
                    </span>
                  </span>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
            <button
              type="button"
              onClick={runRegister}
              disabled={isLoading || !email || !password}
              className="h-10 rounded-md border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60"
            >
              {isLoading && activeAction === 'register' ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>

        <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Telegram</div>
          {telegramEnabled ? (
            <div className="mt-2">
              <div className="relative min-h-10">
                <div
                  ref={telegramContainerRef}
                  className={isLoading && activeAction === 'telegram' ? 'pointer-events-none min-h-10 opacity-35' : 'min-h-10'}
                />
                {isLoading && activeAction === 'telegram' ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                      <span className="relative inline-flex size-5 items-center justify-center">
                        <span className="absolute inset-0 rounded-full border border-[#64748b]/35 border-t-[#1e3a8a] animate-spin motion-reduce:animate-none" />
                        <span className="text-[13px] leading-none text-[#1e3a8a] animate-pulse motion-reduce:animate-none">
                          ♣
                        </span>
                      </span>
                      Signing in with Telegram...
                    </span>
                  </div>
                ) : null}
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Telegram sign-in works only after your account is linked on the portal.
              </p>
            </div>
          ) : (
            <div className="text-xs text-slate-500 mt-1">
              Set <code className="mx-1 text-[11px]">NEXT_PUBLIC_TELEGRAM_BOT_NAME</code> to enable Telegram sign-in
              widget.
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
