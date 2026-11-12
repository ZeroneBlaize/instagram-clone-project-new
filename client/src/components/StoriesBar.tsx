import { Play, Plus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StoryGroupView } from '../types';

interface StoriesBarProps {
  groups: StoryGroupView[];
  onSelectGroup: (index: number) => void;
  onAddStory: () => void;
}

export function StoriesBar({ groups, onSelectGroup, onAddStory }: StoriesBarProps) {
  const { user } = useAuth();

  return (
    <section
      aria-label="Stories"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold tracking-tight">Stories</h2>
        {groups.length > 0 && (
          <button
            type="button"
            onClick={() => onSelectGroup(0)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] hover:underline"
          >
            <Play className="h-3.5 w-3.5" />
            Watch all
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={onAddStory}
          className="flex flex-col items-center gap-1.5 shrink-0 group"
        >
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-[var(--border)] bg-[var(--surface-muted)] group-hover:border-[var(--primary)] transition">
            {user ? (
              <img
                src={user.avatarUrl}
                alt="Your avatar"
                className="h-14 w-14 rounded-full object-cover opacity-80"
              />
            ) : null}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow">
              <Plus className="h-3.5 w-3.5" />
            </span>
          </div>
          <span className="max-w-[70px] truncate text-xs text-[var(--text-muted)]">Your story</span>
        </button>

        {groups.map((group, idx) => (
          <button
            key={group.author.id}
            type="button"
            onClick={() => onSelectGroup(idx)}
            className="flex flex-col items-center gap-1.5 shrink-0 group"
          >
            <div
              className={`rounded-full p-[2.5px] transition transform group-hover:scale-105 ${
                group.hasUnseen ? 'story-ring' : 'bg-[var(--border)]'
              }`}
            >
              <div className="rounded-full bg-[var(--surface)] p-0.5">
                <img
                  src={group.author.avatarUrl}
                  alt={`${group.author.displayName}'s story`}
                  className="h-14 w-14 rounded-full object-cover"
                />
              </div>
            </div>
            <span className="max-w-[74px] truncate text-xs font-medium">{group.author.username}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
