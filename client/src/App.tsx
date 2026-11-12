import { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { CreatePostModal } from './components/CreatePostModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { apiRequest } from './lib/apiClient';
import { AuthPage } from './pages/AuthPage';
import { ExplorePage } from './pages/ExplorePage';
import { FeedPage } from './pages/FeedPage';
import { InsightsPage } from './pages/InsightsPage';
import { MessagesPage } from './pages/MessagesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { ProfilePage } from './pages/ProfilePage';
import { ReelsPage } from './pages/ReelsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ConversationSummary, NotificationView } from './types';

function AppShell() {
  const { user, loading, refreshMe } = useAuth();
  const navigate = useNavigate();
  const [composerMode, setComposerMode] = useState<'post' | 'story' | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const refreshCounts = useCallback(async () => {
    if (!user) {
      setUnreadNotifications(0);
      setUnreadMessages(0);
      return;
    }
    try {
      const [nRes, mRes] = await Promise.all([
        apiRequest<{ notifications: NotificationView[] }>('/api/notifications'),
        apiRequest<{ conversations: ConversationSummary[] }>('/api/messages/conversations'),
      ]);
      setUnreadNotifications(nRes.notifications.filter((n) => !n.read).length);
      setUnreadMessages(mRes.conversations.reduce((acc, c) => acc + c.unreadCount, 0));
    } catch {
      // Ignore background count refresh errors
    }
  }, [user]);

  useEffect(() => {
    void refreshCounts();
  }, [refreshCounts]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] text-sm text-[var(--text-muted)]">
        Loading FrameNew...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route
        path="*"
        element={
          <div className="min-h-screen flex flex-col md:flex-row bg-[var(--bg)] text-[var(--text)] pb-16 md:pb-0">
            <Sidebar
              unreadNotifications={unreadNotifications}
              unreadMessages={unreadMessages}
              onOpenCreate={() => (user ? setComposerMode('post') : navigate('/auth'))}
            />
            <main className="flex-1 min-w-0">
              <Routes>
                <Route
                  path="/"
                  element={
                    <FeedPage
                      onOpenStoryComposer={() => (user ? setComposerMode('story') : navigate('/auth'))}
                      refreshSignal={refreshSignal}
                    />
                  }
                />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/reels" element={<ReelsPage />} />
                <Route
                  path="/notifications"
                  element={<NotificationsPage onRead={() => void refreshCounts()} />}
                />
                <Route
                  path="/messages"
                  element={<MessagesPage onUnreadChange={() => void refreshCounts()} />}
                />
                <Route path="/insights" element={<InsightsPage />} />
                <Route path="/profile/:username" element={<ProfilePage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {composerMode && user && (
              <CreatePostModal
                mode={composerMode}
                onClose={() => setComposerMode(null)}
                onCreated={() => {
                  setRefreshSignal((s) => s + 1);
                  void refreshMe();
                }}
              />
            )}
          </div>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
