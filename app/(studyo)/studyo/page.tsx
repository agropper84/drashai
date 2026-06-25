'use client';
// Screen 1: Projects home — greeting + 2-column project card grid.

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useStudyo } from '@/app/(studyo)/_lib/studyo-store';
import { getVoice } from '@/app/(studyo)/_lib/studyo-voices';

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'yesterday';
  return `${days} days ago`;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function ProjectsPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { projects, loading, create } = useStudyo();

  // Handle ?new=1 from sidebar button
  useEffect(() => {
    if (params.get('new') === '1') {
      create({ title: 'Untitled project' }).then(p => {
        router.replace(`/studyo/projects/${p.id}`);
      });
    }
  }, [params]);

  if (loading) {
    return <div style={{ color: '#8b91a0', fontFamily: "'Hanken Grotesk', sans-serif" }}>Loading...</div>;
  }

  const handleNew = async () => {
    const p = await create({ title: 'Untitled project' });
    router.push(`/studyo/projects/${p.id}`);
  };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 26 }}>
        <div>
          <div className="sy-greeting">{greeting()}.</div>
          <div className="sy-page-title">Your study projects</div>
        </div>
        <button className="sy-new-project" style={{ width: 'auto', marginTop: 0, padding: '12px 20px' }} onClick={handleNew}>
          + New project
        </button>
      </div>

      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <div style={{ fontSize: 48, opacity: 0.15, marginBottom: 16 }}>◗</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>No projects yet</div>
          <div style={{ fontSize: 14, color: '#8b91a0', marginBottom: 24 }}>
            Create your first project to start turning study material into audio.
          </div>
          <button className="sy-new-project" style={{ width: 'auto', display: 'inline-flex', marginTop: 0, padding: '12px 24px' }} onClick={handleNew}>
            + New project
          </button>
        </div>
      ) : (
        <div className="sy-project-grid">
          {projects.map(p => {
            const initial = p.title[0]?.toUpperCase() || 'U';
            const matCount = p.material.length;
            const outCount = p.outputs.length;
            const instrVoices = p.instructions.flatMap(i => [i.voiceA, i.voiceB].filter(Boolean) as string[]);
            const uniqueVoiceIds = [...new Set(instrVoices)];
            const avatars = uniqueVoiceIds.map(vid => getVoice(vid)).filter(Boolean);

            return (
              <Link key={p.id} href={`/studyo/projects/${p.id}`} className="sy-project-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 13, minWidth: 0 }}>
                    <div className="sy-project-tile" style={{ background: p.color }}>{initial}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="sy-project-title">{p.title}</div>
                      <div className="sy-project-sub">{matCount} source{matCount !== 1 ? 's' : ''} · {outCount} audio file{outCount !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11.5, color: '#6d7383', flexShrink: 0 }}>{timeAgo(p.updatedAt)}</div>
                </div>
                <div className="sy-project-desc">{p.desc || 'No description'}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                  <div className="sy-avatar-stack">
                    {avatars.slice(0, 4).map(v => (
                      <div key={v!.id} className="sy-avatar-stack-item" style={{ background: v!.color }}>{v!.initials}</div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: '#8b91a0' }}>
                    {p.instructions.length} instruction set{p.instructions.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
