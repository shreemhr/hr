'use client';
import { useEffect } from 'react';

export interface ToastState {
  message: string;
  type?: 'success' | 'error';
}

interface Props {
  toast: ToastState | null;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ toast, onClose, duration = 3200 }: Props) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [toast, onClose, duration]);

  if (!toast) return null;

  const isError = toast.type === 'error';

  return (
    <div
      role="status"
      className="animate-in-scale"
      style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
        background: isError ? '#c0392b' : '#16794a',
        color: '#fff', fontSize: 14, fontWeight: 600,
        padding: '13px 18px', borderRadius: 10,
        boxShadow: '0 12px 32px rgba(0,0,0,0.2)',
        display: 'flex', alignItems: 'center', gap: 10,
        maxWidth: 360,
      }}
    >
      <span style={{ fontSize: 16 }}>{isError ? '⚠️' : '✅'}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={onClose}
        aria-label="Dismiss"
        style={{ background: 'transparent', color: 'rgba(255,255,255,0.8)', padding: 0, fontSize: 15, lineHeight: 1 }}
      >
        ✕
      </button>
    </div>
  );
}
