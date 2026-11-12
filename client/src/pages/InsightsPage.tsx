import { BarChart3, Hash, Heart, MessageCircle, ShieldCheck, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/apiClient';
import { CreatorStats } from '../types';

export function InsightsPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CreatorStats | null>(null);

  useEffect(() => {
    if (!user) return;
    apiRequest<{ stats: CreatorStats }>('/api/users/me/stats')
      .then((res) => setStats(res.stats))
      .catch(() => {});
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-base font-semibold">Sign in to view Creator Insights</p>
        <Link
          to="/auth"
          className="mt-4 inline-block rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      <div className="flex items-center gap-2.5">
        <BarChart3 className="h-6 w-6 text-[var(--primary)]" />
        <div>
          <h1 className="font-editorial text-2xl font-semibold">Creator Insights & Safety Health</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Live audience reach, engagement rate, and guardrail audit metrics for @{user.username}.
          </p>
        </div>
      </div>

      {stats && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
                <span>Estimated Reach</span>
                <TrendingUp className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <p className="mt-2 font-mono-num text-3xl font-bold">{stats.totalReach.toLocaleString()}</p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
                <span>Engagement Rate</span>
                <BarChart3 className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <p className="mt-2 font-mono-num text-3xl font-bold">{stats.engagementRate}%</p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
                <span>Total Likes</span>
                <Heart className="h-4 w-4 text-[var(--primary)]" />
              </div>
              <p className="mt-2 font-mono-num text-3xl font-bold">{stats.totalLikes}</p>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-muted)]">
                <span>Total Comments</span>
                <MessageCircle className="h-4 w-4 text-[var(--accent)]" />
              </div>
              <p className="mt-2 font-mono-num text-3xl font-bold">{stats.totalComments}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                Guardrail Content Health
              </div>
              <div className="grid grid-cols-3 gap-3 text-center pt-2">
                <div className="rounded-xl bg-[var(--surface-muted)] p-3">
                  <div className="font-mono-num text-xl font-bold text-emerald-600">
                    {stats.guardrailHealth.cleanPosts}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">Clean Posts</div>
                </div>
                <div className="rounded-xl bg-[var(--surface-muted)] p-3">
                  <div className="font-mono-num text-xl font-bold text-amber-500">
                    {stats.guardrailHealth.flaggedPosts}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">CW Flagged</div>
                </div>
                <div className="rounded-xl bg-[var(--surface-muted)] p-3">
                  <div className="font-mono-num text-xl font-bold">
                    {stats.guardrailHealth.openReportsAgainstUser}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)]">Open Reports</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Hash className="h-5 w-5 text-[var(--accent)]" />
                Top Performing Tags
              </div>
              {stats.topTags.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">Add #hashtags to posts to track tag reach.</p>
              ) : (
                <div className="space-y-2">
                  {stats.topTags.map((t) => (
                    <div key={t.tag} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--accent)]">#{t.tag}</span>
                      <span className="font-mono-num text-[var(--text-muted)]">{t.count} posts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
