import Link from 'next/link';

export const metadata = { title: 'Privacy Policy — Drashai' };

export default function PrivacyPolicy() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-page)',
      padding: '48px 16px',
    }}>
      <article className="card" style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '40px 36px',
        fontFamily: "'Cormorant Garamond', serif",
        color: 'var(--ink)',
        lineHeight: 1.7,
        fontSize: 16,
      }}>
        <h1 className="heb-display" style={{ fontSize: 28, margin: '0 0 4px' }}>Privacy Policy</h1>
        <p className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em', margin: '0 0 32px' }}>
          Last updated: May 26, 2026
        </p>

        <p>
          Drashai ("we", "us", or "the app") is an encounter recorder and content
          generator built for rabbis. This policy explains what data we collect, how
          we use it, and the choices you have.
        </p>

        <Section title="1. Information We Collect">
          <p><strong>Google account data.</strong> When you sign in with Google OAuth we receive your name, email address, and profile picture. We do not receive or store your Google password.</p>
          <p><strong>Google Drive access.</strong> With your consent, the app reads and writes files in a dedicated Drashai folder within your Google Drive. We do not access files outside that folder.</p>
          <p><strong>Audio recordings.</strong> Encounter recordings you create are uploaded to secure cloud storage (Vercel Blob) for processing. Recordings are used solely to generate transcripts and content for you.</p>
          <p><strong>Generated content.</strong> Transcripts, drafts, sparks, and other outputs are stored in your Google Drive and in our application database to provide the service.</p>
          <p><strong>Usage data.</strong> We collect minimal server logs (timestamps, request paths, error traces) for debugging and reliability. We do not use third-party analytics trackers.</p>
        </Section>

        <Section title="2. How We Use Your Data">
          <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
            <li>Authenticate you and maintain your session</li>
            <li>Transcribe and process audio recordings</li>
            <li>Generate content using AI (Anthropic Claude)</li>
            <li>Store your files in Google Drive on your behalf</li>
            <li>Improve reliability and fix bugs</li>
          </ul>
        </Section>

        <Section title="3. Third-Party Services">
          <p>We send data to the following services strictly to provide app functionality:</p>
          <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
            <li><strong>Google</strong> — authentication and Drive file storage</li>
            <li><strong>Anthropic (Claude)</strong> — AI content generation from your transcripts and notes</li>
            <li><strong>ElevenLabs</strong> — audio transcription and text-to-speech</li>
            <li><strong>Vercel</strong> — application hosting and temporary blob storage</li>
          </ul>
          <p>Each service is governed by its own privacy policy. We only share the minimum data needed for each service to function.</p>
        </Section>

        <Section title="4. Data Retention">
          <p>Audio uploads are retained in cloud storage only as long as needed for processing. Your Google Drive files persist until you delete them. Session cookies expire when you log out or after a period of inactivity.</p>
        </Section>

        <Section title="5. Data Security">
          <p>All data is transmitted over HTTPS. Sessions are encrypted using iron-session. We follow industry-standard practices to protect your information, but no system is 100% secure.</p>
        </Section>

        <Section title="6. Your Rights">
          <p>You can revoke Drashai's access to your Google account at any time via your <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Google Account permissions</a>. You may also request deletion of your data by contacting us.</p>
        </Section>

        <Section title="7. Changes">
          <p>We may update this policy from time to time. Material changes will be communicated within the app.</p>
        </Section>

        <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <Link href="/login" style={{ color: 'var(--accent)', fontSize: 14 }}>← Back to login</Link>
          {' · '}
          <Link href="/terms" style={{ color: 'var(--accent)', fontSize: 14 }}>Terms of Service</Link>
        </div>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ margin: '24px 0' }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>{title}</h2>
      {children}
    </section>
  );
}
