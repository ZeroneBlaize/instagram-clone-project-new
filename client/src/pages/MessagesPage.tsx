import { MessageSquare, Send, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/apiClient';
import { formatRelativeTime } from '../lib/sanitize';
import { ConversationSummary, MessageRecord, PublicUser } from '../types';

export function MessagesPage({ onUnreadChange }: { onUnreadChange: () => void }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [allCreators, setAllCreators] = useState<PublicUser[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string;
  } | null>(null);
  const [thread, setThread] = useState<MessageRecord[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const loadInbox = useCallback(async () => {
    if (!user) return;
    const [convRes, usersRes] = await Promise.all([
      apiRequest<{ conversations: ConversationSummary[] }>('/api/messages/conversations'),
      apiRequest<{ users: PublicUser[] }>('/api/users'),
    ]);
    setConversations(convRes.conversations);
    setAllCreators(usersRes.users.filter((u) => u.id !== user.id));
    if (!selectedPartner && convRes.conversations.length > 0) {
      setSelectedPartner(convRes.conversations[0].partner);
    }
  }, [user, selectedPartner]);

  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  useEffect(() => {
    if (!user || !selectedPartner) return;
    apiRequest<{ messages: MessageRecord[] }>(`/api/messages/${selectedPartner.id}`)
      .then((res) => {
        setThread(res.messages);
        onUnreadChange();
      })
      .catch(() => {});
  }, [user, selectedPartner, onUnreadChange]);

  if (!user) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-base font-semibold">Sign in to open Direct Messages</p>
        <Link
          to="/auth"
          className="mt-4 inline-block rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartner || !draft.trim()) return;
    setError(null);
    try {
      const res = await apiRequest<{ message: MessageRecord }>(`/api/messages/${selectedPartner.id}`, {
        method: 'POST',
        body: JSON.stringify({ text: draft.trim() }),
      });
      setThread((prev) => [...prev, res.message]);
      setDraft('');
      void loadInbox();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Message blocked by guardrail.');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="grid h-[76vh] min-h-[480px] overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] md:grid-cols-[290px_1fr]">
        {/* Conversations List */}
        <div className="border-r border-[var(--border)] overflow-y-auto p-3 space-y-4">
          <div className="px-2 pt-1 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[var(--primary)]" />
            <h1 className="text-sm font-bold">Direct Messages</h1>
          </div>

          <div className="space-y-1">
            {conversations.map((c) => (
              <button
                key={c.partner.id}
                type="button"
                onClick={() => setSelectedPartner(c.partner)}
                className={`w-full flex items-center justify-between gap-2.5 rounded-xl p-2.5 text-left transition ${
                  selectedPartner?.id === c.partner.id
                    ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                    : 'hover:bg-[var(--surface-muted)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={c.partner.avatarUrl}
                    alt={c.partner.displayName}
                    className="h-10 w-10 rounded-full object-cover shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{c.partner.username}</p>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">{c.lastMessage.text}</p>
                  </div>
                </div>
                {c.unreadCount > 0 && (
                  <span className="h-5 min-w-5 rounded-full bg-[var(--primary)] px-1.5 text-center text-[11px] font-bold leading-5 text-white">
                    {c.unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="border-t border-[var(--border)] pt-3">
            <p className="px-2 mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Start chat with creator
            </p>
            <div className="space-y-1">
              {allCreators.map((creator) => (
                <button
                  key={creator.id}
                  type="button"
                  onClick={() => setSelectedPartner(creator)}
                  className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs hover:bg-[var(--surface-muted)]"
                >
                  <img
                    src={creator.avatarUrl}
                    alt={creator.displayName}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                  <span className="truncate font-medium">@{creator.username}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Thread */}
        <div className="flex flex-col h-full">
          {!selectedPartner ? (
            <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-muted)]">
              Select a creator to start messaging.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedPartner.avatarUrl}
                    alt={selectedPartner.displayName}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-sm font-semibold">{selectedPartner.displayName}</p>
                    <p className="text-xs text-[var(--text-muted)]">@{selectedPartner.username}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
                  <ShieldCheck className="h-3.5 w-3.5" /> Guardrail filtered
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {thread.length === 0 ? (
                  <p className="text-center text-xs text-[var(--text-muted)] pt-8">
                    No messages yet. Say hello to @{selectedPartner.username}.
                  </p>
                ) : (
                  thread.map((msg) => {
                    const mine = msg.senderId === user.id;
                    return (
                      <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                            mine
                              ? 'bg-[var(--primary)] text-white'
                              : 'border border-[var(--border)] bg-[var(--surface-muted)]'
                          }`}
                        >
                          <p>{msg.text}</p>
                          <p className={`mt-1 text-[10px] ${mine ? 'text-white/75' : 'text-[var(--text-muted)]'}`}>
                            {formatRelativeTime(msg.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {error && (
                <p role="alert" className="px-5 py-1.5 text-xs font-medium text-red-600">
                  {error}
                </p>
              )}

              <form onSubmit={sendMessage} className="flex items-center gap-2 border-t border-[var(--border)] p-4">
                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={600}
                  placeholder={`Message @${selectedPartner.username}...`}
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  aria-label="Send message"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
