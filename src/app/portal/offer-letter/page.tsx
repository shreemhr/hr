'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OfferLetterData {
  hasLetter: boolean;
  acknowledged: boolean;
  acknowledged_at: string | null;
  signature_name: string | null;
  previewUrl: string | null;
}

export default function PortalOfferLetterPage() {
  const [data,   setData]   = useState<OfferLetterData | null>(null);
  const [sig,    setSig]    = useState('');
  const [saving, setSaving] = useState(false);
  const [done,   setDone]   = useState(false);
  const [error,  setError]  = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/portal/offer-letter')
      .then(r => r.json())
      .then(d => { setData(d); if (d.acknowledged) setDone(true); setLoading(false); });
  }, []);

  async function acknowledge() {
    if (!sig.trim()) { setError('Please type your full name to acknowledge.'); return; }
    setSaving(true); setError('');
    const res = await fetch('/api/portal/offer-letter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signature_name: sig.trim() }),
    });
    const d = await res.json();
    if (!res.ok) { setError(d.error ?? 'Failed to save.'); setSaving(false); return; }
    setDone(true); setData(prev => prev ? { ...prev, acknowledged: true, acknowledged_at: d.acknowledged_at, signature_name: sig } : prev);
    setSaving(false);
  }

  const s = {
    h1:    { fontSize: 22, fontWeight: 800, color: '#1c1b22', margin: '0 0 4px' },
    sub:   { color: '#6b6760', fontSize: 14, margin: '0 0 24px' },
    card:  { background: '#fff', border: '1px solid #e9e4da', borderRadius: 12, padding: 24, marginBottom: 16 },
    label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#34313d', marginBottom: 6 },
    input: { width: '100%', padding: '10px 12px', border: '1px solid #ddd8cd', borderRadius: 8, fontSize: 15, boxSizing: 'border-box' as const, outline: 'none', fontFamily: 'inherit' },
    btn:   { background: '#16794a', color: '#fff', fontWeight: 700, padding: '11px 24px', borderRadius: 8, border: 'none', fontSize: 15, cursor: 'pointer' },
    err:   { background: '#fae9e7', color: '#c0392b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginTop: 12 },
    frame: { width: '100%', height: 520, border: '1px solid #e9e4da', borderRadius: 8, background: '#faf8f4' },
  };

  if (loading) return <div style={{ color: '#6b6760' }}>Loading…</div>;

  return (
    <div>
      <Link href="/portal/dashboard" style={{ color: '#6b6760', fontSize: 13, marginBottom: 16, display: 'block', textDecoration: 'none' }}>← Dashboard</Link>
      <h1 style={s.h1}>Offer Letter</h1>
      <p style={s.sub}>Review your offer letter and acknowledge acceptance below.</p>

      {!data?.hasLetter && (
        <div style={{ ...s.card, color: '#6b6760', textAlign: 'center' as const, padding: 48 }}>
          Your offer letter hasn't been generated yet. Your HR team will notify you when it's ready.
        </div>
      )}

      {data?.hasLetter && (
        <>
          {/* Iframe preview */}
          <div style={s.card}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Your Offer Letter</div>
            <iframe
              src="/api/portal/offer-letter?preview=1"
              style={s.frame}
              title="Offer Letter"
            />
          </div>

          {/* Acknowledgement section */}
          <div style={s.card}>
            {done ? (
              <div>
                <div style={{ color: '#16794a', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>✓ Acknowledged</div>
                <div style={{ fontSize: 14, color: '#34313d' }}>
                  Signed as: <strong>{data.signature_name}</strong>
                </div>
                <div style={{ fontSize: 13, color: '#6b6760', marginTop: 4 }}>
                  {data.acknowledged_at ? new Date(data.acknowledged_at).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' }) : ''}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Acknowledge & Accept</div>
                <div style={{ color: '#6b6760', fontSize: 13, marginBottom: 16 }}>
                  By typing your full name below, you confirm you have read this offer letter and accept its terms.
                </div>
                <label style={s.label}>Full Name (as signature)</label>
                <input
                  style={s.input}
                  type="text"
                  placeholder="Type your full legal name"
                  value={sig}
                  onChange={e => setSig(e.target.value)}
                />
                {error && <div style={s.err}>{error}</div>}
                <div style={{ marginTop: 16 }}>
                  <button style={s.btn} onClick={acknowledge} disabled={saving}>
                    {saving ? 'Saving…' : '✓ I accept this offer'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
