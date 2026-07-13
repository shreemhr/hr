'use client';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger, loading, onConfirm, onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(28,27,34,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 24,
      }}
      className="animate-in"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="animate-in-scale"
        style={{
          background: '#fff', borderRadius: 14, padding: '28px 28px 24px',
          maxWidth: 400, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 17, color: '#1c1b22', marginBottom: 10 }}>{title}</div>
        <div style={{ color: '#6b6760', fontSize: 14, lineHeight: 1.5, marginBottom: 24 }}>{message}</div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{ background: '#f4f2ee', color: '#6b6760', padding: '9px 18px', borderRadius: 8, fontWeight: 600 }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={danger ? '' : 'btn-primary'}
            style={danger ? { background: '#c0392b', color: '#fff', fontWeight: 700, padding: '9px 18px', borderRadius: 8 } : { padding: '9px 18px', borderRadius: 8 }}
          >
            {loading ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
