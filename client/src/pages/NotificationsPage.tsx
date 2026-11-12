import { Bell, CheckCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/apiClient';
import { formatRelativeTime } from '../lib/sanitize';
import { NotificationView } from '../types';

export function NotificationsPage({ onRead }: { onRead: () => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationView[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const res = await apiRequest<{ notifications: NotificationView[] }>('/api/notifications');
    setItems(res.notifications);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const markAll = async () => {
    await apiRequest('/api/notifications/read-all', { method: 'POST' });
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    onRead();
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-base font-semibold">Sign in to view notifications</p>
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
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-[var(--primary)]" />
          <h1 className="font-editorial text-2xl font-semibold">Activity & Notifications</h1>
        </div>
        {items.some((i) => !i.read) && (
          <button
            type="button"
            onClick={markAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold hover:bg-[var(--surface-muted)]"
          >
            <CheckCheck className="h-4 w-4 text-[var(--accent)]" />
            Mark all read
          </button>
        )}
      </div>

      <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {items.length === 0 ? (
          <p className="p-10 text-center text-sm text-[var(--text-muted)]">No notifications yet.</p>
        ) : (
          items.map((note) => (
            <div
              key={note.id}
              className={`flex items-center justify-between gap-3 px-4 py-3.5 ${
                note.read ? '' : 'bg-[var(--primary)]/5'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Link to={`/profile/${note.actor.username}`}>
                  <img
                    src={note.actor.avatarUrl}
                    alt={note.actor.displayName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                </Link>
                <div className="min-w-0 text-sm">
                  <p className="leading-snug">
                    <Link to={`/profile/${note.actor.username}`} className="font-semibold hover:underline">
                      @{note.actor.username}
                    </Link>{' '}
                    {note.message}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">{formatRelativeTime(note.createdAt)}</p>
                </div>
              </div>
              {!note.read && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--primary)]" />}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
