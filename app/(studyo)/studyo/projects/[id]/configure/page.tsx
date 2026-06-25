'use client';
// Screen 4: Configure output — placeholder for Phase 3.

import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function ConfigurePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div>
      <Link href={`/studyo/projects/${id}`} style={{ fontSize: 13, color: '#8b91a0', textDecoration: 'none' }}>← Back</Link>
      <div className="sy-eyebrow" style={{ marginTop: 18, marginBottom: 8 }}>New audio file</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 24 }}>How should it sound?</div>
      <div className="sy-empty-card">
        Configure output options coming soon — format, length, voices, and instructions.
      </div>
    </div>
  );
}
