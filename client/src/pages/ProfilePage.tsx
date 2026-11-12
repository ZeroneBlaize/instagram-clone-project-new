import { Edit3, ExternalLink, Grid, ShieldCheck, UserCheck, UserPlus, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PostCard } from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/apiClient';
import { isSafeDisplayUrl } from '../lib/sanitize';
import { PostView, PublicUser } from '../types';

export function ProfilePage() {
  const { username } = useParams();
  const { user: currentUser, updateProfile, refreshMe } = useAuth();
  const [profile, setProfile] = useState<PublicUser | null>(null);
  const [posts, setPosts] = useState<PostView[]>([]);
  const [selectedPost, setSelectedPost] = useState<PostView | null>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!username) return;
    const res = await apiRequest<{ user: PublicUser; posts: PostView[] }>(`/api/users/${username}`);
    setProfile(res.user);
    setPosts(res.posts);
    setDisplayName(res.user.displayName);
    setBio(res.user.bio);
    setWebsite(res.user.website);
  }, [username]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleFollow = async () => {
    if (!profile || !currentUser) return;
    const res = await apiRequest<{ following: boolean; followersCount: number }>(
      `/api/users/${profile.id}/follow`,
      { method: 'POST' }
    );
    setProfile({ ...profile, isFollowing: res.following, followersCount: res.followersCount });
    void refreshMe();
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await updateProfile({ displayName, bio, website });
      setEditing(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save profile.');
    }
  };

  if (!profile) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center text-sm text-[var(--text-muted)]">
        Loading profile...
      </div>
    );
  }

  const isMe = currentUser?.id === profile.id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-8">
      <section className="flex flex-col sm:flex-row items-start sm:items-center gap-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6">
        <img
          src={profile.avatarUrl}
          alt={profile.displayName}
          className="h-24 w-24 rounded-full object-cover ring-4 ring-[var(--primary)]/25"
        />

        <div className="flex-1 space-y-3 min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-bold">{profile.displayName}</h1>
                {profile.verified && <ShieldCheck className="h-5 w-5 text-[var(--accent)]" />}
              </div>
              <p className="text-sm text-[var(--text-muted)]">@{profile.username}</p>
            </div>

            {isMe ? (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold hover:bg-[var(--surface-muted)]"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Profile
              </button>
            ) : currentUser ? (
              <button
                type="button"
                onClick={toggleFollow}
                className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  profile.isFollowing
                    ? 'border border-[var(--border)] hover:bg-[var(--surface-muted)]'
                    : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
                }`}
              >
                {profile.isFollowing ? <UserCheck className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {profile.isFollowing ? 'Following' : 'Follow'}
              </button>
            ) : null}
          </div>

          <div className="flex gap-6 text-sm">
            <div>
              <span className="font-mono-num font-bold">{profile.postsCount ?? posts.length}</span>{' '}
              <span className="text-[var(--text-muted)]">posts</span>
            </div>
            <div>
              <span className="font-mono-num font-bold">{profile.followersCount}</span>{' '}
              <span className="text-[var(--text-muted)]">followers</span>
            </div>
            <div>
              <span className="font-mono-num font-bold">{profile.followingCount}</span>{' '}
              <span className="text-[var(--text-muted)]">following</span>
            </div>
          </div>

          {profile.bio && <p className="text-sm leading-relaxed">{profile.bio}</p>}
          {profile.website && isSafeDisplayUrl(profile.website) && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              {profile.website}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </section>

      {/* Posts Grid */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2 text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          <Grid className="h-4 w-4" />
          Posts
        </div>

        {posts.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--text-muted)]">No posts published yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {posts.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => setSelectedPost(post)}
                className="aspect-[4/5] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]"
              >
                <img
                  src={post.mediaUrl}
                  alt={post.altText || post.caption}
                  className="h-full w-full object-cover hover:scale-105 transition duration-300"
                />
              </button>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={saveEdit}
            className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold">Edit Profile</h2>
              <button type="button" onClick={() => setEditing(false)} aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label htmlFor="edit-dn" className="block text-xs font-semibold mb-1">
                Display Name
              </label>
              <input
                id="edit-dn"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="edit-bio" className="block text-xs font-semibold mb-1">
                Bio
              </label>
              <textarea
                id="edit-bio"
                rows={3}
                maxLength={240}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="edit-web" className="block text-xs font-semibold mb-1">
                Website (https://)
              </label>
              <input
                id="edit-web"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://framenew.example"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
            </div>
            {error && <p className="text-xs font-medium text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-semibold text-white"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedPost && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg">
            <button
              type="button"
              onClick={() => setSelectedPost(null)}
              aria-label="Close post"
              className="absolute -top-11 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <PostCard
              post={selectedPost}
              onPostUpdated={(u) => {
                setSelectedPost(u);
                setPosts((prev) => prev.map((p) => (p.id === u.id ? u : p)));
              }}
              onPostDeleted={(id) => {
                setSelectedPost(null);
                setPosts((prev) => prev.filter((p) => p.id !== id));
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
