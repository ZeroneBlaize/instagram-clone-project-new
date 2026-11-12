import { Bookmark, ChevronDown, ChevronUp, Film, Heart, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/apiClient';
import { PostView } from '../types';

export function ReelsPage() {
  const { user } = useAuth();
  const [reels, setReels] = useState<PostView[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    apiRequest<{ posts: PostView[] }>('/api/posts?tab=reels')
      .then((res) => setReels(res.posts))
      .catch(() => {});
  }, []);

  const current = reels[index];

  const toggleLike = async () => {
    if (!current || !user) return;
    const res = await apiRequest<{ liked: boolean; likesCount: number }>(`/api/posts/${current.id}/like`, {
      method: 'POST',
    });
    setReels((prev) =>
      prev.map((r) => (r.id === current.id ? { ...r, isLiked: res.liked, likesCount: res.likesCount } : r))
    );
  };

  const toggleSave = async () => {
    if (!current || !user) return;
    const res = await apiRequest<{ saved: boolean }>(`/api/posts/${current.id}/save`, {
      method: 'POST',
    });
    setReels((prev) => prev.map((r) => (r.id === current.id ? { ...r, isSaved: res.saved } : r)));
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Film className="h-5 w-5 text-[var(--primary)]" />
          <h1 className="font-editorial text-2xl font-semibold">Reels Showcase</h1>
        </div>
        <span className="font-mono-num text-xs text-[var(--text-muted)]">
          {reels.length > 0 ? `${index + 1} / ${reels.length}` : '0 clips'}
        </span>
      </div>

      {!current ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-12 text-center text-sm text-[var(--text-muted)]">
          No reels published yet. Use Create Post and pick &ldquo;Reel&rdquo; to publish a vertical clip.
        </div>
      ) : (
        <div className="flex items-center justify-center gap-4">
          <div className="relative aspect-[9/16] w-full max-w-[360px] overflow-hidden rounded-3xl bg-zinc-950 text-white shadow-2xl border border-[var(--border)]">
            <img
              src={current.mediaUrl}
              alt={current.altText || current.caption}
              className="h-full w-full object-cover animate-[pulse_8s_ease-in-out_infinite]"
            />

            <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-xs font-medium backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-rose-400" />
              Reel Motion Frame
            </div>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent p-5 pt-20 space-y-2">
              <Link to={`/profile/${current.author.username}`} className="flex items-center gap-2.5">
                <img
                  src={current.author.avatarUrl}
                  alt={current.author.displayName}
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-white/50"
                />
                <span className="text-sm font-semibold">@{current.author.username}</span>
              </Link>
              <p className="text-xs leading-relaxed text-white/90">{current.caption}</p>
            </div>

            {/* Action column */}
            <div className="absolute right-3 bottom-24 flex flex-col gap-3">
              <button
                type="button"
                onClick={toggleLike}
                disabled={!user}
                aria-label="Like reel"
                className="flex flex-col items-center gap-1 rounded-2xl bg-black/45 p-2.5 backdrop-blur hover:bg-black/70"
              >
                <Heart className={`h-6 w-6 ${current.isLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span className="font-mono-num text-[11px]">{current.likesCount}</span>
              </button>
              <button
                type="button"
                onClick={toggleSave}
                disabled={!user}
                aria-label="Save reel"
                className="flex flex-col items-center gap-1 rounded-2xl bg-black/45 p-2.5 backdrop-blur hover:bg-black/70"
              >
                <Bookmark className={`h-6 w-6 ${current.isSaved ? 'fill-white text-white' : ''}`} />
                <span className="text-[11px]">Save</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={index <= 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              aria-label="Previous reel"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] disabled:opacity-40"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={index >= reels.length - 1}
              onClick={() => setIndex((i) => Math.min(reels.length - 1, i + 1))}
              aria-label="Next reel"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-muted)] disabled:opacity-40"
            >
              <ChevronDown className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
