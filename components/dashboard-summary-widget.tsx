"use client";

import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  ArrowUpRightIcon,
  BookOpenIcon,
  CalendarDaysIcon,
  CircleAlertIcon,
  SparklesIcon,
  TrophyIcon,
  UserPlusIcon,
  UsersIcon,
} from 'lucide-react';

import type { DashboardSummaryResponse } from '@/lib/portal-dashboard';

const numberFormatter = new Intl.NumberFormat('ru-RU');

type FeedEntry = {
  id: string;
  title: string;
  description: string;
  meta: string;
  href?: string | null;
};

type QuickAction = {
  id: string;
  label: string;
  hint: string;
  href: string;
};

type GuestStartStep = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
};

const FALLBACK_FEED: FeedEntry[] = [
  {
    id: 'fallback-registration',
    title: 'Registration for stage 3 is open',
    description: 'Registration window is open until March 14, 2026.',
    meta: 'Today, 09:15',
  },
  {
    id: 'fallback-import',
    title: 'New player database imported',
    description: '132 participant records were synchronized from CRM.',
    meta: '42 minutes ago',
  },
  {
    id: 'fallback-rules',
    title: 'Spring Cup regulation updated',
    description: 'Timing details and tie-break format were clarified.',
    meta: '10 minutes ago',
  },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'action-calendar',
    label: 'Open tournament calendar',
    hint: 'Future tournaments and dates',
    href: '/dashboard/tournaments/calendar',
  },
  {
    id: 'action-results',
    label: 'Open tournament results',
    hint: 'Archive of completed events',
    href: '/dashboard/tournaments/results',
  },
  {
    id: 'action-settings',
    label: 'Account settings',
    hint: 'Profile and Telegram link',
    href: '/dashboard/settings',
  },
];

const GUEST_START_STEPS: GuestStartStep[] = [
  {
    id: 'guest-step-calendar',
    title: 'Browse tournament calendar',
    description: 'See upcoming events and pick what to follow.',
    href: '/dashboard/tournaments/calendar',
    icon: CalendarDaysIcon,
  },
  {
    id: 'guest-step-discussions',
    title: 'Open discussions',
    description: 'Read current bridge topics and community threads.',
    href: '/dashboard/discussions',
    icon: BookOpenIcon,
  },
  {
    id: 'guest-step-signin',
    title: 'Create account / Sign in',
    description: 'Save preferences and unlock personal tools.',
    href: '/auth/signin?callbackUrl=/dashboard',
    icon: UserPlusIcon,
  },
];

// UX invariant: central dashboard area must never be empty, even if DB/API is unavailable.

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[#d8dbe1] bg-white/90 px-2.5 py-2 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7a8394]">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-[#1f2734]">{numberFormatter.format(value)}</p>
    </div>
  );
}

function buildFeed(data: DashboardSummaryResponse | null): FeedEntry[] {
  if (!data?.ready) return FALLBACK_FEED;

  const upcoming = data.upcoming.slice(0, 3).map((item) => ({
    id: `upcoming-${item.id}`,
    title: item.name,
    description: `${formatDate(item.startDate)}${item.city ? ` · ${item.city}` : ''}`,
    meta: 'Upcoming tournament',
    href: item.sourceUrl,
  }));

  const leaders = data.topPlayers.slice(0, 2).map((item, index) => ({
    id: `leader-${item.id}`,
    title: `#${index + 1} ${item.name}`,
    description: `Rating: ${item.rating ? numberFormatter.format(item.rating) : '—'}`,
    meta: 'Top player',
  }));

  const merged = [...upcoming, ...leaders];
  return merged.length > 0 ? merged : FALLBACK_FEED;
}

function FeedItem({ item }: { item: FeedEntry }) {
  const content = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[15px] font-semibold text-[#1f2734]">{item.title}</p>
        <p className="shrink-0 text-xs text-[#6e7788]">{item.meta}</p>
      </div>
      <p className="mt-0.5 text-sm text-[#556176]">{item.description}</p>
    </>
  );

  if (!item.href) {
    return <div className="rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-3">{content}</div>;
  }

  return (
    <a
      href={item.href}
      target="_blank"
      rel="noreferrer"
      className="block rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] p-3 transition-colors hover:bg-[#eef3fb]"
    >
      {content}
    </a>
  );
}

type DashboardSummaryWidgetProps = {
  isGuest?: boolean;
};

export function DashboardSummaryWidget({ isGuest = false }: DashboardSummaryWidgetProps) {
  const [data, setData] = useState<DashboardSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadSummary() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/dashboard/summary', { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = (await response.json()) as DashboardSummaryResponse;
        if (mounted) setData(payload);
      } catch (requestError) {
        if (!mounted) return;
        setError(requestError instanceof Error ? requestError.message : 'Failed to load dashboard summary');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    void loadSummary();
    return () => {
      mounted = false;
    };
  }, []);

  const updatedLabel = useMemo(() => {
    if (!data?.generatedAt) return null;
    return formatDate(data.generatedAt);
  }, [data?.generatedAt]);
  const feed = useMemo(() => buildFeed(data), [data]);
  const stats = data?.stats ?? {
    totalPlayers: 0,
    totalTournaments: 0,
    upcomingEventsCount: 0,
  };
  const latestRatingCount = data?.topPlayers.length ?? 0;

  if (loading) {
    return (
      <section className="w-full max-w-[1320px] space-y-3">
        <div className="rounded-xl border border-[#d8dbe1] bg-white/75 p-4 shadow-sm backdrop-blur-sm">
          <div className="h-6 w-52 animate-pulse rounded bg-[#e7eaf1]" />
          <div className="mt-3 h-14 animate-pulse rounded-lg bg-[#eef1f7]" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <div className="h-14 animate-pulse rounded-lg bg-[#e7eaf1]" />
          <div className="h-14 animate-pulse rounded-lg bg-[#e7eaf1]" />
          <div className="h-14 animate-pulse rounded-lg bg-[#e7eaf1]" />
          <div className="h-14 animate-pulse rounded-lg bg-[#e7eaf1]" />
        </div>
        <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="h-64 animate-pulse rounded-xl bg-[#e7eaf1]" />
          <div className="h-64 animate-pulse rounded-xl bg-[#e7eaf1]" />
        </div>
      </section>
    );
  }

  return (
    <section className="w-full max-w-[1320px] space-y-3">
      {isGuest ? (
        <article className="rounded-xl border border-[#d8dbe1] bg-white/82 p-4 shadow-sm backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-7 items-center justify-center rounded-full border border-[#d8dbe1] bg-[#f4f7fd] text-[#2f3f61]">
                <SparklesIcon className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-semibold text-[#1f2734]">Welcome to Bridge OneClub</h2>
                <p className="text-xs text-[#6e7788]">Start in 3 short steps and discover portal sections.</p>
              </div>
            </div>
            <span className="rounded-full border border-[#d8dbe1] bg-[#f8f9fc] px-2 py-0.5 text-xs font-medium text-[#5f6a7b]">
              Starter path: 3 steps
            </span>
          </div>

          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {GUEST_START_STEPS.map((step, index) => (
              <a
                key={step.id}
                href={step.href}
                className="group flex items-start gap-2 rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2.5 py-2 transition-colors hover:bg-[#eef3fb]"
              >
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-[#cfd5df] bg-white text-xs font-semibold text-[#2f3f61]">
                  {index + 1}
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <step.icon className="size-3.5 text-[#5d6a80]" />
                    <span className="block text-sm font-medium text-[#1f2734]">{step.title}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-[#6e7788]">{step.description}</span>
                </span>
                <ArrowUpRightIcon className="ml-auto mt-0.5 size-3.5 shrink-0 text-[#7a8394] transition-transform group-hover:-translate-y-[1px] group-hover:translate-x-[1px]" />
              </a>
            ))}
          </div>
        </article>
      ) : null}

      <article className="rounded-xl border border-[#d8dbe1] bg-white/78 p-4 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[#1f2734]">BridgeSport snapshot</h2>
          {updatedLabel ? <p className="text-xs text-[#6e7788]">Обновлено: {updatedLabel}</p> : null}
        </div>

        {error ? (
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-[#e5cad0] bg-[#fff2f4] px-2.5 py-1.5 text-sm text-[#8b3240]">
            <CircleAlertIcon className="size-4" />
            Не удалось загрузить данные BridgeSport: {error}
          </p>
        ) : null}

        {!data?.ready ? (
          <p className="mt-2 rounded-lg border border-dashed border-[#cfd5df] bg-[#f8f9fc] px-2.5 py-1.5 text-sm text-[#5f6a7b]">
            {data?.message ?? 'BridgeSport данные недоступны. Показываем fallback-режим панели.'}
          </p>
        ) : null}
      </article>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Игроки" value={stats.totalPlayers} />
        <StatCard label="Турниры" value={stats.totalTournaments} />
        <StatCard label="Ближайшие события" value={stats.upcomingEventsCount} />
        <StatCard label="Записей в топе" value={latestRatingCount} />
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <article className="rounded-xl border border-[#d8dbe1] bg-white/80 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <UsersIcon className="size-4 text-[#51617b]" />
            <h3 className="text-xl font-semibold leading-none tracking-tight text-[#1f2734]">Activity feed</h3>
          </div>

          <div className="mt-3 space-y-2.5">
            {feed.map((item) => (
              <FeedItem key={item.id} item={item} />
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-[#d8dbe1] bg-white/80 p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="size-4 text-[#51617b]" />
            <h3 className="text-xl font-semibold leading-none tracking-tight text-[#1f2734]">Quick actions</h3>
          </div>

          <div className="mt-3 space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <a
                key={action.id}
                href={action.href}
                className="flex items-center justify-between rounded-lg border border-[#d8dbe1] bg-[#f8f9fc] px-2.5 py-2 transition-colors hover:bg-[#eef3fb]"
              >
                <span>
                  <span className="block text-sm font-medium text-[#1f2734]">{action.label}</span>
                  <span className="block text-xs text-[#6e7788]">{action.hint}</span>
                </span>
                <ArrowUpRightIcon className="size-4 text-[#5d6a80]" />
              </a>
            ))}
          </div>

          {data?.latestRating ? (
            <div className="mt-3 rounded-lg border border-[#d8dbe1] bg-white px-2.5 py-2">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#7a8394]">
                <TrophyIcon className="size-3.5" />
                Latest rating
              </p>
              <p className="mt-1 text-sm font-medium text-[#1f2734]">{data.latestRating.typeName}</p>
              <p className="mt-1 text-xs text-[#6e7788]">
                {data.latestRating.snapshotDate ? formatDate(data.latestRating.snapshotDate) : 'Date not set'}
              </p>
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
