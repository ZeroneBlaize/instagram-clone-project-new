import { ImagePlus, ShieldCheck, Sparkles, Upload, X } from 'lucide-react';
import { useState } from 'react';
import { apiRequest } from '../lib/apiClient';
import { GuardrailDecision, PostView } from '../types';

interface CreatePostModalProps {
  mode: 'post' | 'story';
  onClose: () => void;
  onCreated: (post?: PostView) => void;
}

const STUDIO_PRESETS = [
  { label: 'Concrete Arches', url: '/media/arches.jpg' },
  { label: 'Pour-Over Studio', url: '/media/coffee.jpg' },
  { label: 'Amber Lanterns', url: '/media/lanterns.jpg' },
  { label: 'Alpine Dawn', url: '/media/alpine.jpg' },
  { label: 'Prism Shader', url: '/media/studio-prism.svg' },
  { label: 'Dusk Horizon', url: '/media/studio-dusk.svg' },
];

export function CreatePostModal({ mode, onClose, onCreated }: CreatePostModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('/media/arches.jpg');
  const [selectedPreset, setSelectedPreset] = useState<string>('/media/arches.jpg');
  const [mediaKind, setMediaKind] = useState<'photo' | 'reel'>('photo');
  const [caption, setCaption] = useState('');
  const [altText, setAltText] = useState('');
  const [location, setLocation] = useState('');
  const [contentWarning, setContentWarning] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [aiMood, setAiMood] = useState<'editorial' | 'minimal' | 'storytelling' | 'technical'>('editorial');
  const [guardCheck, setGuardCheck] = useState<GuardrailDecision | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(picked.type)) {
      setError('Guardrail: Only JPEG, PNG, or WebP images are permitted.');
      return;
    }
    if (picked.size > 5 * 1024 * 1024) {
      setError('Guardrail: Image exceeds 5 MB maximum upload cap.');
      return;
    }
    setError(null);
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
  };

  const runAiAssist = async () => {
    if (!aiTopic.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiRequest<{ caption: string; altText: string }>('/api/ai/caption-assist', {
        method: 'POST',
        body: JSON.stringify({ topic: aiTopic.trim(), mood: aiMood, mediaKind }),
      });
      setCaption(res.caption);
      setAltText(res.altText);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI assistant error.');
    } finally {
      setBusy(false);
    }
  };

  const runPreCheck = async (value: string) => {
    setCaption(value);
    if (!value.trim()) {
      setGuardCheck(null);
      return;
    }
    try {
      const res = await apiRequest<GuardrailDecision>('/api/ai/guardrail-check', {
        method: 'POST',
        body: JSON.stringify({ text: value }),
      });
      setGuardCheck(res);
    } catch {
      // Ignore transient pre-check issues
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      if (file) form.append('media', file);
      else form.append('mediaUrl', selectedPreset);
      form.append('caption', caption);
      if (mode === 'post') {
        form.append('altText', altText);
        form.append('location', location);
        form.append('mediaKind', mediaKind);
        if (contentWarning.trim()) form.append('contentWarning', contentWarning.trim());
        const res = await apiRequest<{ post: PostView }>('/api/posts', {
          method: 'POST',
          body: form,
        });
        onCreated(res.post);
      } else {
        await apiRequest('/api/stories', {
          method: 'POST',
          body: form,
        });
        onCreated();
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'post' ? 'Create new post' : 'Add to story'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-bold">
              {mode === 'post' ? 'Create New Post' : 'Publish 24h Story'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close composer"
            className="rounded-xl p-2 hover:bg-[var(--surface-muted)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 grid gap-5 md:grid-cols-2">
          {/* Left: Media Preview & Selector */}
          <div className="space-y-3">
            <div className="aspect-[4/5] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
              <img src={previewUrl} alt="Upload preview" className="h-full w-full object-cover" />
            </div>

            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] px-3 py-2.5 text-xs font-semibold hover:border-[var(--primary)] transition">
              <Upload className="h-4 w-4 text-[var(--primary)]" />
              <span>{file ? file.name : 'Upload JPEG / PNG / WebP (max 5 MB)'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Or select MIT studio preset
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {STUDIO_PRESETS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setSelectedPreset(preset.url);
                      setPreviewUrl(preset.url);
                    }}
                    className={`rounded-lg border px-2 py-1.5 text-[11px] font-medium truncate transition ${
                      !file && selectedPreset === preset.url
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                        : 'border-[var(--border)] hover:bg-[var(--surface-muted)]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Caption, AI Assist, & Guardrail Controls */}
          <div className="space-y-3">
            {mode === 'post' && (
              <div className="flex gap-2">
                {(['photo', 'reel'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => setMediaKind(kind)}
                    className={`flex-1 rounded-xl border py-2 text-xs font-semibold capitalize transition ${
                      mediaKind === kind
                        ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                        : 'border-[var(--border)] hover:bg-[var(--surface-muted)]'
                    }`}
                  >
                    {kind}
                  </button>
                ))}
              </div>
            )}

            {/* 2026 AI Caption & Alt-Text Assistant */}
            {mode === 'post' && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--primary)]" />
                    AI Caption & Alt-Text Assist
                  </span>
                  <select
                    aria-label="Caption tone"
                    value={aiMood}
                    onChange={(e) => setAiMood(e.target.value as typeof aiMood)}
                    className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px]"
                  >
                    <option value="editorial">Editorial</option>
                    <option value="minimal">Minimal</option>
                    <option value="storytelling">Storytelling</option>
                    <option value="technical">Technical</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder="Describe your scene (e.g. Kyoto rain alley)"
                    className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={runAiAssist}
                    disabled={busy || !aiTopic.trim()}
                    className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  >
                    Generate
                  </button>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="post-caption" className="block text-xs font-semibold mb-1">
                Caption
              </label>
              <textarea
                id="post-caption"
                required={mode === 'post'}
                rows={3}
                maxLength={800}
                value={caption}
                onChange={(e) => void runPreCheck(e.target.value)}
                placeholder="Write a caption with #hashtags..."
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
              />
              {guardCheck && (
                <div
                  className={`mt-1.5 flex items-center gap-1.5 text-xs font-medium ${
                    guardCheck.allowed ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {guardCheck.allowed
                      ? `Guardrail passed (${guardCheck.status})`
                      : guardCheck.reason}
                  </span>
                </div>
              )}
            </div>

            {mode === 'post' && (
              <>
                <div>
                  <label htmlFor="post-alt" className="block text-xs font-semibold mb-1">
                    Accessibility Alt Text
                  </label>
                  <input
                    id="post-alt"
                    type="text"
                    maxLength={280}
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    placeholder="Describe visual details for screen readers"
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="post-loc" className="block text-xs font-semibold mb-1">
                      Location
                    </label>
                    <input
                      id="post-loc"
                      type="text"
                      maxLength={80}
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Tokyo, Studio..."
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="post-cw" className="block text-xs font-semibold mb-1">
                      Content Warning
                    </label>
                    <input
                      id="post-cw"
                      type="text"
                      maxLength={80}
                      value={contentWarning}
                      onChange={(e) => setContentWarning(e.target.value)}
                      placeholder="Optional (e.g. Spoiler)"
                      className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-xs"
                    />
                  </div>
                </div>
              </>
            )}

            {error && (
              <p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || (guardCheck !== null && !guardCheck.allowed)}
                className="rounded-xl bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
              >
                {busy ? 'Publishing...' : mode === 'post' ? 'Publish Post' : 'Share Story'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
