import { Search, ShieldCheck, UserPlus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PostCard } from '../components/PostCard';
import { StoriesBar } from '../components/StoriesBar';
import { StoryModal } from '../components/StoryModal';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/apiClient';
import { PostView, PublicUser, StoryGroupView } from '../types';

interface FeedPageProps {
  onOpenStoryComposer: () => void;
  refreshSignal: number;
}

export function FeedPage({ onOpenStoryComposer, refreshSignal }: FeedPageProps) {
  const { user, refreshMe } = useAuth();
  const [tab, setTab] = useState<'for-you' | 'following' | 'saved'>('for-you');
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [posts, setPosts] = useState<PostView[]>([]);
  const [storyGroups, setStoryGroups] = useState<StoryGroupView[]>([]);
  const [suggestedCreators, setSuggestedCreators] = useState<PublicUser[]>([]);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab });
      if (search.trim()) params.set('search', search.trim());
      if (activeTag) params.set('tag', activeTag);

      const [postsRes, storiesRes, usersRes] = await Promise.all([
        apiRequest<{ posts: PostView[] }>(`/api/posts?${params.toString()}`),
        apiRequest<{ storyGroups: StoryGroupView[] }>('/api/stories'),
        apiRequest<{ users: PublicUser[] }>('/api/users'),
      ]);
      setPosts(postsRes.posts);
      setStoryGroups(storiesRes.storyGroups);
      setSuggestedCreators(usersRes.users.filter((u) => u.id !== user?.id).slice(0, 5));
    } finally {
      setLoading(false);
    }
  }, [tab, search, activeTag, user?.id]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed, refreshSignal]);

  const handleFollowToggle = async (targetId: string) => {
    if (!user) return;
    const res = await apiRequest<{ following: boolean; followersCount: number }>(
      `/api/users/${targetId}/follow`,
      { method: 'POST' }
    );
    setSuggestedCreators((prev) =>
      prev.map((c) =>
        c.id === targetId ? { ...c, isFollowing: res.following, followersCount: res.followersCount } : c
      )
    );
    void refreshMe();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 grid gap-8 lg:grid-cols-[minmax(0,640px)_300px] justify-center">
      {/* Main Column */}
      <div className="space-y-5">
        {/* Search & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search creators, captions, locations, or #tags..."
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-10 pr-4 py-2.5 text-sm"
            />
          </div>

          <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1">
            {(
              [
                { id: 'for-you', label: 'For You' },
                { id: 'following', label: 'Following' },
                { id: 'saved', label: 'Saved' },
              ] as const
            ).map((item) => {
              if ((item.id === 'following' || item.id === 'saved') && !user) return null;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    tab === item.id
                      ? 'bg-[var(--primary)] text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        {activeTag && (
          <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs">
            <span>
              Filtering by <strong className="text-[var(--accent)]">#{activeTag}</strong>
            </span>
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className="inline-flex items-center gap-1 font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        )}

        <StoriesBar
          groups={storyGroups}
          onSelectGroup={(idx) => setActiveStoryIndex(idx)}
          onAddStory={onOpenStoryComposer}
        />

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div
                key={n}
                className="h-96 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
              />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
            <p className="text-base font-semibold">No posts match this view yet.</p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              Try switching tabs, clearing filters, or publishing a new frame.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onPostUpdated={(updated) =>
                  setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
                }
                onPostDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
                onTagClick={(tag) => setActiveTag(tag)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Right Rail: Suggested Creators & Safety Status */}
      <aside className="hidden lg:block space-y-5">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">Creators to follow</h3>
            <Link to="/explore" className="text-xs font-semibold text-[var(--accent)] hover:underline">
              Explore
            </Link>
          </div>

          <div className="space-y-3">
            {suggestedCreators.map((creator) => (
              <div key={creator.id} className="flex items-center justify-between gap-2.5">
                <Link to={`/profile/${creator.username}`} className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={creator.avatarUrl}
                    alt={creator.displayName}
                    className="h-9 w-9 rounded-full object-cover"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className="truncate text-xs font-semibold">{creator.username}</p>
                      {creator.verified && <ShieldCheck className="h-3.5 w-3.5 text-[var(--accent)]" />}
                    </div>
                    <p className="truncate text-[11px] text-[var(--text-muted)]">{creator.displayName}</p>
                  </div>
                </Link>

                {user && (
                  <button
                    type="button"
                    onClick={() => handleFollowToggle(creator.id)}
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      creator.isFollowing
                        ? 'border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-muted)]'
                        : 'bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20'
                    }`}
                  >
                    {!creator.isFollowing && <UserPlus className="h-3 w-3" />}
                    {creator.isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-2 text-xs text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Runtime Guardrails Active
          </div>
          <p className="leading-relaxed">
            Magic-byte media validation, secret/PII leak blocking, rate-limit backoff, and MIT license compliance are active across this platform.
          </p>
        </div>
      </aside>

      {activeStoryIndex !== null && (
        <StoryModal
          groups={storyGroups}
          initialGroupIndex={activeStoryIndex}
          onClose={() => setActiveStoryIndex(null)}
          onViewed={() => void loadFeed()}
        />
      )}
    </div>
  );
}
