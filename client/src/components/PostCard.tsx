import {
  Bookmark,
  Eye,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { apiRequest } from '../lib/apiClient';
import { formatRelativeTime, isSafeDisplayUrl } from '../lib/sanitize';
import { PostView } from '../types';
import { ReportModal } from './ReportModal';

interface PostCardProps {
  post: PostView;
  onPostUpdated: (updated: PostView) => void;
  onPostDeleted: (postId: string) => void;
  onTagClick?: (tag: string) => void;
}

export function PostCard({ post, onPostUpdated, onPostDeleted, onTagClick }: PostCardProps) {
  const { user } = useAuth();
  const { blurSensitive } = useTheme();
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isBlurred = Boolean(post.contentWarning && blurSensitive && !revealed);

  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await apiRequest<{ liked: boolean; likesCount: number }>(`/api/posts/${post.id}/like`, {
        method: 'POST',
      });
      onPostUpdated({ ...post, isLiked: res.liked, likesCount: res.likesCount });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to update like.');
    }
  };

  const handleDoubleTap = () => {
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 700);
    if (!post.isLiked && user) {
      void handleLike();
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      const res = await apiRequest<{ saved: boolean }>(`/api/posts/${post.id}/save`, {
        method: 'POST',
      });
      onPostUpdated({ ...post, isSaved: res.saved });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to save post.');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !user) return;
    setErrorMsg(null);
    try {
      const res = await apiRequest<{ comment: PostView['comments'][number] }>(
        `/api/posts/${post.id}/comments`,
        {
          method: 'POST',
          body: JSON.stringify({ text: commentText.trim() }),
        }
      );
      onPostUpdated({
        ...post,
        comments: [...post.comments, res.comment],
        commentsCount: post.commentsCount + 1,
      });
      setCommentText('');
      setShowComments(true);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Comment rejected by guardrail.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await apiRequest(`/api/posts/${post.id}/comments/${commentId}`, { method: 'DELETE' });
      onPostUpdated({
        ...post,
        comments: post.comments.filter((c) => c.id !== commentId),
        commentsCount: Math.max(0, post.commentsCount - 1),
      });
    } catch {
      // Ignore
    }
  };

  const handleDeletePost = async () => {
    try {
      await apiRequest(`/api/posts/${post.id}`, { method: 'DELETE' });
      onPostDeleted(post.id);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not delete post.');
    }
  };

  const handleShare = () => {
    const link = `${window.location.origin}/profile/${post.author.username}`;
    void navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <Link to={`/profile/${post.author.username}`} className="flex items-center gap-3 min-w-0">
          <img
            src={post.author.avatarUrl}
            alt={post.author.displayName}
            className="h-10 w-10 rounded-full object-cover ring-2 ring-[var(--primary)]/30"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="truncate text-sm font-semibold hover:underline">
                {post.author.username}
              </span>
              {post.author.verified && (
                <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-label="Verified" />
              )}
              <span className="text-xs text-[var(--text-muted)]">· {formatRelativeTime(post.createdAt)}</span>
            </div>
            {post.location && (
              <p className="flex items-center gap-1 text-xs text-[var(--text-muted)] truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                {post.location}
              </p>
            )}
          </div>
        </Link>

        <div className="flex items-center gap-1">
          {post.mediaKind === 'reel' && (
            <span className="rounded-full bg-[var(--accent)]/10 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent)]">
              Reel
            </span>
          )}
          {user?.id === post.userId ? (
            <button
              type="button"
              onClick={handleDeletePost}
              aria-label="Delete your post"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-600 transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : user ? (
            <button
              type="button"
              onClick={() => setShowReport(true)}
              aria-label="Report post"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--surface-muted)] transition"
            >
              <Flag className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {/* Media Frame */}
      <div
        onDoubleClick={handleDoubleTap}
        className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--surface-muted)] select-none"
      >
        {isSafeDisplayUrl(post.mediaUrl) && (
          <img
            src={post.mediaUrl}
            alt={post.altText || post.caption}
            loading="lazy"
            className={`h-full w-full object-cover transition duration-300 ${
              isBlurred ? 'blur-2xl scale-105' : 'hover:scale-[1.01]'
            }`}
          />
        )}

        {showHeartBurst && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Heart className="h-24 w-24 fill-[var(--primary)] text-[var(--primary)] animate-heart-pop drop-shadow-lg" />
          </div>
        )}

        {isBlurred && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 p-6 text-center text-white">
            <ShieldAlert className="mb-2 h-8 w-8 text-amber-400" />
            <p className="text-sm font-semibold">{post.contentWarning}</p>
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur hover:bg-white/25 transition"
            >
              <Eye className="h-4 w-4" />
              Reveal Media
            </button>
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className="px-4 pt-3 pb-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleLike}
              disabled={!user}
              aria-label={post.isLiked ? 'Unlike post' : 'Like post'}
              className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[var(--surface-muted)] transition disabled:opacity-50"
            >
              <Heart
                className={`h-5 w-5 transition ${
                  post.isLiked ? 'fill-[var(--primary)] text-[var(--primary)]' : ''
                }`}
              />
            </button>
            <button
              type="button"
              onClick={() => setShowComments((v) => !v)}
              aria-label="Toggle comments"
              className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[var(--surface-muted)] transition"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleShare}
              aria-label="Copy link"
              className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[var(--surface-muted)] transition"
            >
              <Share2 className="h-5 w-5" />
            </button>
            {copied && <span className="text-xs font-medium text-[var(--accent)]">Link copied</span>}
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!user}
            aria-label={post.isSaved ? 'Remove from saved' : 'Save post'}
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[var(--surface-muted)] transition disabled:opacity-50"
          >
            <Bookmark
              className={`h-5 w-5 ${post.isSaved ? 'fill-[var(--text)] text-[var(--text)]' : ''}`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="font-mono-num">{post.likesCount.toLocaleString()} likes</span>
          {post.altText && (
            <span
              title={post.altText}
              className="rounded-md bg-[var(--surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-muted)]"
            >
              ALT verified
            </span>
          )}
        </div>

        <p className="text-sm leading-relaxed">
          <Link to={`/profile/${post.author.username}`} className="font-semibold mr-1.5 hover:underline">
            {post.author.username}
          </Link>
          {post.caption}
        </p>

        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => onTagClick?.(tag)}
                className="rounded-lg bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-medium text-[var(--accent)] hover:opacity-80 transition"
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        {post.commentsCount > 0 && (
          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            {showComments ? 'Hide comments' : `View all ${post.commentsCount} comments`}
          </button>
        )}

        {showComments && (
          <div className="space-y-2 border-t border-[var(--border)] pt-2.5">
            {post.comments.map((cmt) => (
              <div key={cmt.id} className="flex items-start justify-between gap-2 text-xs">
                <p className="leading-relaxed">
                  <Link to={`/profile/${cmt.author.username}`} className="font-semibold mr-1.5">
                    {cmt.author.username}
                  </Link>
                  {cmt.text}
                </p>
                {user?.id === cmt.userId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(cmt.id)}
                    aria-label="Delete comment"
                    className="text-[var(--text-muted)] hover:text-red-600 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {user && (
          <form onSubmit={handleCommentSubmit} className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              maxLength={400}
              className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/10 disabled:opacity-40 transition"
            >
              Post
            </button>
          </form>
        )}

        {errorMsg && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {errorMsg}
          </p>
        )}
      </div>

      {showReport && <ReportModal postId={post.id} onClose={() => setShowReport(false)} />}
    </article>
  );
}
