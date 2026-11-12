import { Hash, Heart, MessageCircle, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PostCard } from '../components/PostCard';
import { apiRequest } from '../lib/apiClient';
import { PostView } from '../types';

export function ExplorePage() {
  const [posts, setPosts] = useState<PostView[]>([]);
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [modalPost, setModalPost] = useState<PostView | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ tab: 'for-you' });
    if (query.trim()) params.set('search', query.trim());
    if (selectedTag) params.set('tag', selectedTag);

    apiRequest<{ posts: PostView[] }>(`/api/posts?${params.toString()}`)
      .then((res) => setPosts(res.posts))
      .catch(() => {});
  }, [query, selectedTag]);

  const trendingTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) {
      for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [posts]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-editorial text-2xl font-semibold">Explore Creators & Tags</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Discover curated photography, reels, and creative studies across the network.
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter explore..."
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Trending Hashtags */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSelectedTag(null)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            selectedTag === null
              ? 'bg-[var(--primary)] text-white'
              : 'border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]'
          }`}
        >
          All Topics
        </button>
        {trendingTags.map(([tag, count]) => (
          <button
            key={tag}
            type="button"
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              selectedTag === tag
                ? 'bg-[var(--primary)] text-white'
                : 'border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]'
            }`}
          >
            <Hash className="h-3 w-3" />
            {tag}
            <span className="opacity-70">({count})</span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {posts.map((post) => (
          <button
            key={post.id}
            type="button"
            onClick={() => setModalPost(post)}
            className="group relative aspect-[4/5] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] text-left"
          >
            <img
              src={post.mediaUrl}
              alt={post.altText || post.caption}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition p-3.5 text-white">
              <div className="flex w-full items-center justify-between text-xs font-semibold">
                <span>@{post.author.username}</span>
                <span className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 fill-white" /> {post.likesCount}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5" /> {post.commentsCount}
                  </span>
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {modalPost && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto"
        >
          <div className="relative w-full max-w-lg">
            <button
              type="button"
              onClick={() => setModalPost(null)}
              aria-label="Close post detail"
              className="absolute -top-11 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25"
            >
              <X className="h-5 w-5" />
            </button>
            <PostCard
              post={modalPost}
              onPostUpdated={(updated) => {
                setModalPost(updated);
                setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
              }}
              onPostDeleted={(id) => {
                setModalPost(null);
                setPosts((prev) => prev.filter((p) => p.id !== id));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
