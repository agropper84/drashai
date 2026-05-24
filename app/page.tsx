'use client';

import { useState, useEffect } from 'react';

export default function HomePage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/rav/encounters')
      .then(res => {
        if (res.status === 401) {
          setAuthed(false);
        } else {
          setAuthed(true);
        }
      })
      .catch(() => setAuthed(false));
  }, []);

  // Loading
  if (authed === null) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #334155', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not authenticated — show login
  if (!authed) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a, #1e293b, #0f172a)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ width: '100%', maxWidth: 380, margin: '0 16px' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>Drash AI</h1>
            <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>Encounter Recorder & Content Generator</p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24 }}>
            <a
              href="/api/auth/login"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', padding: '12px 16px', background: '#fff', color: '#0f172a', borderRadius: 12, fontWeight: 500, fontSize: 14, textDecoration: 'none' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </a>
          </div>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#64748b', marginTop: 24 }}>Secure login via Google OAuth</p>
        </div>
      </div>
    );
  }

  // Authenticated — show app (placeholder until full UI is restored)
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700 }}>Drash AI</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>You are logged in. Full app coming soon.</p>
        <a href="/api/auth/logout" style={{ display: 'inline-block', marginTop: 24, padding: '8px 20px', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, fontSize: 13, textDecoration: 'none' }}>Sign Out</a>
      </div>
    </div>
  );
}
