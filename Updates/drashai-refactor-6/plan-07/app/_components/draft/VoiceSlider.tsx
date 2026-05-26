'use client';
// 4-stop horizontal slider. Hidden semantic <input type=range> drives state;
// visual layer is custom dots + a sliding pill.

import { VOICE_STOPS, VoiceStop, descriptorFor } from '@/app/_lib/voice-mode';

export interface VoiceSliderProps {
  value: VoiceStop;
  onChange: (v: VoiceStop) => void;
}

export function VoiceSlider({ value, onChange }: VoiceSliderProps) {
  const descriptor = descriptorFor(value);
  const pct = ((value - 1) / (VOICE_STOPS.length - 1)) * 100;

  return (
    <div className="voice-slider-wrap">
      <div className="voice-slider-label">
        <div className="voice-slider-label-en">{descriptor.label}</div>
        <div className="voice-slider-label-detail">{descriptor.detail}</div>
      </div>

      <div className="voice-slider-track-wrap">
        <div className="voice-slider-track">
          <div className="voice-slider-track-fill" style={{ width: `${pct}%` }}/>
          {VOICE_STOPS.map((s) => {
            const stopPct = ((s.stop - 1) / (VOICE_STOPS.length - 1)) * 100;
            const isActive = s.stop === value;
            const isPast = s.stop < value;
            return (
              <button
                type="button"
                key={s.stop}
                className={`voice-slider-stop${isActive ? ' active' : ''}${isPast ? ' past' : ''}`}
                style={{ left: `${stopPct}%` }}
                onClick={() => onChange(s.stop)}
                title={s.label}
                aria-label={s.label}
              />
            );
          })}
        </div>
        <div className="voice-slider-stops-row">
          {VOICE_STOPS.map((s) => {
            const stopPct = ((s.stop - 1) / (VOICE_STOPS.length - 1)) * 100;
            return (
              <button
                key={s.stop}
                type="button"
                className={`voice-slider-stop-label${s.stop === value ? ' active' : ''}`}
                style={{ left: `${stopPct}%` }}
                onClick={() => onChange(s.stop)}>
                {s.stop === 1 && 'My words'}
                {s.stop === 2 && 'I lead'}
                {s.stop === 3 && 'Co-author'}
                {s.stop === 4 && 'AI drafts'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Accessible fallback range — keyboard control */}
      <input
        type="range"
        min={1}
        max={4}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value) as VoiceStop)}
        className="voice-slider-range-sr"
        aria-label="AI voice"
      />
    </div>
  );
}
