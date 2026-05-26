import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#7a2e2a',
          borderRadius: 36,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          width="120"
          height="120"
        >
          <line x1="10" y1="24" x2="18" y2="8" stroke="#f0e7d2" strokeWidth="2.2" strokeLinecap="round" />
          <ellipse cx="12.4" cy="19.2" rx="1.8" ry="0.8" fill="none" stroke="#d9b46a" strokeWidth="0.7" transform="rotate(-55 12.4 19.2)" />
          <ellipse cx="14" cy="16" rx="1.8" ry="0.8" fill="none" stroke="#d9b46a" strokeWidth="0.7" transform="rotate(-55 14 16)" />
          <line x1="18" y1="8" x2="22" y2="5.5" stroke="#f0e7d2" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="22.5" cy="5" r="1.1" fill="#f0e7d2" />
          <circle cx="9.5" cy="25" r="1.8" fill="#d9b46a" opacity="0.8" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
