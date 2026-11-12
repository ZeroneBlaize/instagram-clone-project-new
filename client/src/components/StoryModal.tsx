import { ChevronLeft, ChevronRight, Send, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiRequest } from '../lib/apiClient';
import { formatRelativeTime } from '../lib/sanitize';
import { useAuth } from '../context/AuthContext';
import { StoryGroupView } from '../types';

interface StoryModalProps {
  groups: StoryGroupView[];
  initialGroupIndex: number;
  onClose: () => void;
  onViewed: () => void;
}

export function StoryModal({ groups, initialGroupIndex, onClose, onViewed }: StoryModalProps) {
  const { user } = useAuth();
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [reply, setReply] = useState('');
  const [replyStatus, setReplyStatus] = useState<string | null>(null);

  const currentGroup = groups[groupIdx];
  const currentStory = currentGroup?.stories[storyIdx];

  useEffect(() => {
    if (user && currentStory && !currentStory.isViewed) {
      apiRequest(`/api/stories/${currentStory.id}/view`, { method: 'POST' })
        .then(() => onViewed())
        .catch(() => {});
    }
  }, [currentStory, user, onViewed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!currentGroup || !currentStory) return null;

  const handleNext = () => {
    if (storyIdx + 1 < currentGroup.stories.length) {
      setStoryIdx(storyIdx + 1);
    } else if (groupIdx + 1 < groups.length) {
      setGroupIdx(groupIdx + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (storyIdx > 0) {
      setStoryIdx(storyIdx - 1);
    } else if (groupIdx > 0) {
      setGroupIdx(groupIdx - 1);
      setStoryIdx(0);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim() || !user || currentGroup.author.id === user.id) return;
    try {
      await apiRequest(`/api/messages/${currentGroup.author.id}`, {
        method: 'POST',
        body: JSON.stringify({ text: `Story reply: ${reply.trim()}` }),
      });
      setReply('');
      setReplyStatus('Reply sent to DM');
      setTimeout(() => setReplyStatus(null), 2500);
    } catch (err) {
      setReplyStatus(err instanceof Error ? err.message : 'Unable to send reply');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Story from ${currentGroup.author.displayName}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-zinc-950 text-white shadow-2xl">
        {/* Progress Indicators */}
        <div className="absolute top-3 inset-x-3 z-20 flex gap-1.5">
          {currentGroup.stories.map((s, idx) => (
            <div key={s.id} className="h-1 flex-1 rounded-full bg-white/25 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  idx <= storyIdx ? 'w-full bg-white' : 'w-0'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Author Bar */}
        <div className="absolute top-6 inset-x-4 z-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src={currentGroup.author.avatarUrl}
              alt={currentGroup.author.displayName}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-white/40"
            />
            <div>
              <p className="text-sm font-semibold">{currentGroup.author.username}</p>
              <p className="text-[11px] text-white/75">{formatRelativeTime(currentStory.createdAt)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close story viewer"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 hover:bg-black/75 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Media */}
        <div className="relative aspect-[3/4] w-full bg-zinc-900">
          <img
            src={currentStory.mediaUrl}
            alt={currentStory.caption || `Story by ${currentGroup.author.username}`}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-5 pt-16">
            {currentStory.caption && <p className="text-sm leading-relaxed">{currentStory.caption}</p>}
          </div>

          <button
            type="button"
            onClick={handlePrev}
            aria-label="Previous story"
            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 hover:bg-black/70"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Next story"
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 hover:bg-black/70"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        {/* Reply bar */}
        {user && currentGroup.author.id !== user.id && (
          <form onSubmit={sendReply} className="flex items-center gap-2 border-t border-white/10 p-3 bg-zinc-950">
            <input
              type="text"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={`Reply to ${currentGroup.author.username}...`}
              className="flex-1 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50"
            />
            <button
              type="submit"
              aria-label="Send story reply"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        )}
        {replyStatus && (
          <p className="px-4 pb-3 text-xs text-emerald-400">{replyStatus}</p>
        )}
      </div>
    </div>
  );
}
