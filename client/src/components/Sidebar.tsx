import {
  BarChart3,
  Bell,
  Compass,
  Film,
  Home,
  LogOut,
  MessageSquare,
  Moon,
  PlusSquare,
  Settings,
  ShieldCheck,
  Sun,
  User,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  unreadNotifications: number;
  unreadMessages: number;
  onOpenCreate: () => void;
}

export function BrandLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <img src="/favicon.svg" alt="" aria-hidden="true" className="h-8 w-8 rounded-lg shrink-0" />
      <div className="leading-none hidden lg:block">
        <span className="font-editorial text-xl font-semibold tracking-tight">FrameNew</span>
        <span className="ml-1.5 rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--primary)]">
          2026
        </span>
      </div>
    </div>
  );
}

export function Sidebar({ unreadNotifications, unreadMessages, onOpenCreate }: SidebarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { to: '/', label: 'Feed', icon: Home, badge: 0 },
    { to: '/explore', label: 'Explore', icon: Compass, badge: 0 },
    { to: '/reels', label: 'Reels', icon: Film, badge: 0 },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: unreadNotifications },
    { to: '/messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
    { to: '/insights', label: 'Insights', icon: BarChart3, badge: 0 },
    { to: user ? `/profile/${user.username}` : '/auth', label: 'Profile', icon: User, badge: 0 },
    { to: '/settings', label: 'Settings', icon: Settings, badge: 0 },
  ];

  return (
    <>
      {/* Desktop / Tablet Sidebar */}
      <aside className="hidden md:flex md:w-20 lg:w-64 shrink-0 flex-col justify-between border-r border-[var(--border)] bg-[var(--surface)] px-3 lg:px-4 py-5 sticky top-0 h-screen">
        <div className="space-y-5 overflow-y-auto">
          <div className="flex items-center justify-between px-1">
            <NavLink to="/" aria-label="FrameNew Home">
              <BrandLogo />
            </NavLink>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              className="hidden lg:inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-muted)] transition"
            >
              {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </button>
          </div>

          {user && (
            <div className="hidden lg:block rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/60 p-3.5">
              <NavLink to={`/profile/${user.username}`} className="flex items-center gap-3">
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="h-11 w-11 rounded-full object-cover ring-2 ring-[var(--primary)]/40"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="truncate text-sm font-semibold">{user.displayName}</p>
                    {user.verified && (
                      <ShieldCheck className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-label="Verified creator" />
                    )}
                  </div>
                  <p className="truncate text-xs text-[var(--text-muted)]">@{user.username}</p>
                </div>
              </NavLink>
              <div className="mt-3 grid grid-cols-3 gap-1 border-t border-[var(--border)] pt-2.5 text-center">
                <div>
                  <div className="font-mono-num text-xs font-bold">{user.postsCount ?? 0}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Posts</div>
                </div>
                <div>
                  <div className="font-mono-num text-xs font-bold">{user.followersCount}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Followers</div>
                </div>
                <div>
                  <div className="font-mono-num text-xs font-bold">{user.followingCount}</div>
                  <div className="text-[11px] text-[var(--text-muted)]">Following</div>
                </div>
              </div>
            </div>
          )}

          <nav aria-label="Primary navigation" className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-[var(--primary)]/15 text-[var(--primary)] dark:text-rose-400 font-semibold'
                        : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]'
                    }`
                  }
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </span>
                  {item.badge > 0 && (
                    <span className="hidden lg:inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-[11px] font-bold text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={onOpenCreate}
            className="w-full flex items-center justify-center lg:justify-start gap-2.5 rounded-xl bg-[var(--primary)] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] transition shadow-sm"
          >
            <PlusSquare className="h-5 w-5 shrink-0" />
            <span className="hidden lg:inline">Create Post</span>
          </button>
        </div>

        <div className="pt-3 border-t border-[var(--border)] space-y-1">
          {user ? (
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center lg:justify-start gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)] transition"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">Sign out</span>
            </button>
          ) : (
            <NavLink
              to="/auth"
              className="w-full flex items-center justify-center rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--surface-muted)] transition"
            >
              <span className="hidden lg:inline">Sign in</span>
              <User className="h-4 w-4 lg:hidden" />
            </NavLink>
          )}
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur px-4 py-2.5">
        <NavLink to="/" className="flex items-center gap-2">
          <img src="/favicon.svg" alt="" className="h-7 w-7 rounded-lg" />
          <span className="font-editorial text-lg font-semibold">FrameNew</span>
        </NavLink>
        <div className="flex items-center gap-1.5">
          <NavLink
            to="/notifications"
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[var(--surface-muted)]"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifications > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--primary)]" />
            )}
          </NavLink>
          <NavLink
            to="/messages"
            aria-label="Messages"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[var(--surface-muted)]"
          >
            <MessageSquare className="h-5 w-5" />
            {unreadMessages > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[var(--primary)]" />
            )}
          </NavLink>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-[var(--surface-muted)]"
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Bottom Nav (5 primary destinations) */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-5 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur py-1.5"
      >
        <NavLink
          to="/"
          end
          aria-label="Feed"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-h-[44px] text-[11px] ${
              isActive ? 'text-[var(--primary)] font-semibold' : 'text-[var(--text-muted)]'
            }`
          }
        >
          <Home className="h-5 w-5" />
          <span>Feed</span>
        </NavLink>
        <NavLink
          to="/explore"
          aria-label="Explore"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-h-[44px] text-[11px] ${
              isActive ? 'text-[var(--primary)] font-semibold' : 'text-[var(--text-muted)]'
            }`
          }
        >
          <Compass className="h-5 w-5" />
          <span>Explore</span>
        </NavLink>
        <button
          type="button"
          onClick={onOpenCreate}
          aria-label="Create Post"
          className="flex flex-col items-center justify-center min-h-[44px] text-[11px] text-[var(--primary)] font-semibold"
        >
          <PlusSquare className="h-6 w-6" />
          <span>Create</span>
        </button>
        <NavLink
          to="/reels"
          aria-label="Reels"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-h-[44px] text-[11px] ${
              isActive ? 'text-[var(--primary)] font-semibold' : 'text-[var(--text-muted)]'
            }`
          }
        >
          <Film className="h-5 w-5" />
          <span>Reels</span>
        </NavLink>
        <NavLink
          to={user ? `/profile/${user.username}` : '/auth'}
          aria-label="Profile"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center min-h-[44px] text-[11px] ${
              isActive ? 'text-[var(--primary)] font-semibold' : 'text-[var(--text-muted)]'
            }`
          }
        >
          <User className="h-5 w-5" />
          <span>Profile</span>
        </NavLink>
      </nav>
    </>
  );
}
