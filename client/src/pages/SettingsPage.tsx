import { EyeOff, Moon, Scale, Settings as SettingsIcon, ShieldCheck, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function SettingsPage() {
  const { theme, toggleTheme, blurSensitive, setBlurSensitive } = useTheme();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <SettingsIcon className="h-5 w-5 text-[var(--primary)]" />
        <h1 className="font-editorial text-2xl font-semibold">Settings & Guardrails</h1>
      </div>

      <section className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            {theme === 'light' ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-[var(--accent)]" />}
            <div>
              <p className="text-sm font-semibold">Appearance Theme</p>
              <p className="text-xs text-[var(--text-muted)]">
                Currently using {theme === 'light' ? 'Light editorial' : 'Dark obsidian'} palette.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold hover:bg-[var(--surface-muted)]"
          >
            Switch to {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>

        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <EyeOff className="h-5 w-5 text-[var(--primary)]" />
            <div>
              <p className="text-sm font-semibold">Content Warning Shield</p>
              <p className="text-xs text-[var(--text-muted)]">
                Automatically blur media flagged by safety guardrails until revealed.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            aria-label="Toggle content warning shield"
            checked={blurSensitive}
            onChange={(e) => setBlurSensitive(e.target.checked)}
            className="h-5 w-5 accent-[var(--primary)]"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-bold">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          Active Security & Safety Guardrails
        </div>
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-[var(--text-muted)]">
          <li>Helmet strict HTTP security headers & CSP directives.</li>
          <li>Sliding-window rate limiters with `429 Retry-After` bounded backoff on the client.</li>
          <li>Zod runtime schema validation + DOMPurify & HTML stripping against XSS.</li>
          <li>Magic-byte binary inspection (`FF D8 FF`, `89 50 4E 47`, `RIFF WEBP`) on all uploaded images.</li>
          <li>Automated secret/PII leak blocking (`ghp_`, `AKIA`, `sk-`, private keys, SSN patterns).</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
        <div className="flex items-center gap-2 text-sm font-bold">
          <Scale className="h-4 w-4 text-[var(--accent)]" />
          Licensing & Trademark Notice
        </div>
        <p className="text-xs leading-relaxed text-[var(--text-muted)]">
          FrameNew (`instagram-clone-project-new`) is licensed under the MIT License (2026 Sahil Deshpande). All brand graphics, icons (`lucide-react`), and seed artwork are MIT-compatible and contain no Meta Platforms or Instagram trademarked assets.
        </p>
      </section>
    </div>
  );
}
