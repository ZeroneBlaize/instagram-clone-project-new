import { ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function AuthPage() {
  const { login, register, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') {
        await login(identifier, password);
      } else {
        await register({ username, displayName, email, password });
      }
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = async (demoHandle: string) => {
    setBusy(true);
    setError(null);
    try {
      await demoLogin(demoHandle);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demo login failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--bg)] text-[var(--text)]">
      {/* Editorial Showcase Panel */}
      <section className="hidden lg:flex flex-col justify-between p-12 bg-zinc-950 text-white relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-3">
          <img src="/favicon.svg" alt="" className="h-9 w-9 rounded-xl" />
          <span className="font-editorial text-2xl font-semibold">FrameNew</span>
        </div>

        <div className="relative z-10 max-w-md space-y-5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
            <Sparkles className="h-3.5 w-3.5 text-rose-400" />
            2026 Visual Creator Social Platform
          </span>
          <h1 className="font-editorial text-4xl leading-tight font-semibold">
            Share stories, photography, and short-form clips with built-in safety guardrails.
          </h1>
          <p className="text-sm text-zinc-300 leading-relaxed">
            Built with React 19, Express 5, Mongoose / SQLite persistence, magic-byte upload verification, and automated privacy & spam protection.
          </p>
        </div>

        <div className="relative z-10 grid grid-cols-3 gap-3">
          <img src="/media/arches.jpg" alt="Concrete arches" className="h-36 w-full rounded-2xl object-cover" />
          <img src="/media/coffee.jpg" alt="Pour-over studio" className="h-36 w-full rounded-2xl object-cover" />
          <img src="/media/lanterns.jpg" alt="Rainy evening lane" className="h-36 w-full rounded-2xl object-cover" />
        </div>
      </section>

      {/* Auth Form */}
      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Create your creator account'}
            </h2>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {mode === 'login'
                ? 'Sign in or launch instantly with a verified demo profile.'
                : 'MIT-licensed open visual platform with privacy guardrails.'}
            </p>
          </div>

          {/* 1-Click Demo Profiles */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/60 p-4 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
              <ShieldCheck className="h-4 w-4 text-[var(--accent)]" />
              Instant 1-Click Demo Login
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDemo('alex_rivera')}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold hover:border-[var(--primary)] transition"
              >
                <span>@alex_rivera</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--primary)]" />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => handleDemo('maya_chen')}
                className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-semibold hover:border-[var(--primary)] transition"
              >
                <span>@maya_chen</span>
                <ArrowRight className="h-3.5 w-3.5 text-[var(--primary)]" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'login' ? (
              <div>
                <label htmlFor="auth-id" className="block text-xs font-semibold mb-1">
                  Username or Email
                </label>
                <input
                  id="auth-id"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="alex_rivera"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm"
                />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="auth-username" className="block text-xs font-semibold mb-1">
                      Username
                    </label>
                    <input
                      id="auth-username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="studio_handle"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="auth-display" className="block text-xs font-semibold mb-1">
                      Display Name
                    </label>
                    <input
                      id="auth-display"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Elena Vance"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="auth-email" className="block text-xs font-semibold mb-1">
                    Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="creator@framenew.example"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="auth-password" className="block text-xs font-semibold mb-1">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-sm"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[var(--primary)] py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50 transition"
            >
              {busy ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-xs text-[var(--text-muted)]">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login');
                setError(null);
              }}
              className="font-semibold text-[var(--primary)] hover:underline"
            >
              {mode === 'login' ? 'Register' : 'Sign in'}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
