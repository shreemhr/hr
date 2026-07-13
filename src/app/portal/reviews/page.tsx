'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Review {
  id: string; review_period: string | null; review_date: string; rating: string | null;
  overall_comments: string | null; goals_next_period: string | null; users: { name: string } | null;
}

const RATING_LABELS: Record<string, string> = {
  unsatisfactory: 'Unsatisfactory', needs_improvement: 'Needs Improvement',
  meets_expectations: 'Meets Expectations', exceeds_expectations: 'Exceeds Expectations', outstanding: 'Outstanding',
};
const RATING_COLORS: Record<string, { bg: string; color: string }> = {
  unsatisfactory:       { bg: '#fae9e7', color: '#c0392b' },
  needs_improvement:    { bg: '#fbf1de', color: '#c2780c' },
  meets_expectations:   { bg: '#f4f2ee', color: '#6b6760' },
  exceeds_expectations: { bg: '#e8f3ec', color: '#16794a' },
  outstanding:          { bg: '#eef2ff', color: '#4f46e5' },
};

export default function PortalReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetch('/api/portal/reviews')
      .then(async r => {
        if (!r.ok) { setLoadError(true); return; }
        setReviews(await r.json());
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const s = {
    h1:   { fontSize: 22, fontWeight: 800, color: '#1c1b22', margin: '0 0 4px' },
    sub:  { color: '#6b6760', fontSize: 14, margin: '0 0 24px' },
    card: { background: '#fff', border: '1px solid #e9e4da', borderRadius: 12, padding: 22, marginBottom: 14 },
  };

  if (loading) return <div style={{ color: '#6b6760' }}>Loading…</div>;
  if (loadError) return <div style={{ color: '#c0392b' }}>Failed to load — please refresh, or sign in again if your session expired.</div>;

  return (
    <div>
      <Link href="/portal/dashboard" style={{ color: '#6b6760', fontSize: 13, marginBottom: 16, display: 'block', textDecoration: 'none' }}>← Dashboard</Link>
      <h1 style={s.h1}>Performance Reviews</h1>
      <p style={s.sub}>Reviews completed by your manager. Contact HR with any questions.</p>

      {reviews.length === 0 && (
        <div style={{ ...s.card, textAlign: 'center' as const, color: '#a8a39a', padding: 48 }}>No performance reviews on file yet.</div>
      )}

      {reviews.map(r => {
        const rc = r.rating ? (RATING_COLORS[r.rating] ?? { bg: '#f4f2ee', color: '#6b6760' }) : null;
        return (
          <div key={r.id} style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{r.review_period ?? 'Performance Review'}</div>
                <div style={{ color: '#a8a39a', fontSize: 12, marginTop: 3 }}>
                  {new Date(r.review_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  {' · '}{(r.users as { name: string } | null)?.name ?? 'Manager'}
                </div>
              </div>
              {rc && r.rating && (
                <span style={{ background: rc.bg, color: rc.color, borderRadius: 999, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                  {RATING_LABELS[r.rating]}
                </span>
              )}
            </div>
            {r.overall_comments && (
              <div style={{ fontSize: 14, color: '#1c1b22', lineHeight: 1.7, marginBottom: r.goals_next_period ? 12 : 0 }}>
                {r.overall_comments}
              </div>
            )}
            {r.goals_next_period && (
              <div style={{ background: '#eef2ff', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#3730a3' }}>
                <strong>Goals for next period:</strong> {r.goals_next_period}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
