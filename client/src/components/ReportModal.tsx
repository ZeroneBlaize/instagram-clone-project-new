import { Flag, X } from 'lucide-react';
import { useState } from 'react';
import { apiRequest } from '../lib/apiClient';

interface ReportModalProps {
  postId: string;
  onClose: () => void;
}

export function ReportModal({ postId, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<'spam' | 'harassment' | 'misinformation' | 'sensitive' | 'copyright'>('spam');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiRequest(`/api/posts/${postId}/report`, {
        method: 'POST',
        body: JSON.stringify({ reason, details }),
      });
      setFeedback('Report submitted to the FrameNew safety queue.');
      setTimeout(onClose, 1200);
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Unable to submit report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Report post"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Flag className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="text-base font-bold">Report Content</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report dialog"
            className="rounded-lg p-1.5 hover:bg-[var(--surface-muted)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="report-reason" className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Reason
            </label>
            <select
              id="report-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as typeof reason)}
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2.5 text-sm"
            >
              <option value="spam">Spam or automated link flood</option>
              <option value="harassment">Harassment or abusive behavior</option>
              <option value="misinformation">Misleading or synthetic impersonation</option>
              <option value="sensitive">Unlabeled sensitive media</option>
              <option value="copyright">Copyright or trademark concern</option>
            </select>
          </div>

          <div>
            <label htmlFor="report-details" className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Additional context (optional)
            </label>
            <textarea
              id="report-details"
              rows={3}
              maxLength={400}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Explain what should be reviewed..."
              className="mt-1.5 w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            />
          </div>

          {feedback && <p className="text-xs font-medium text-[var(--accent)]">{feedback}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
