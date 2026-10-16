import React from 'react';

export default function RiskGauge({ score = 50, level = 'Medium', confidence = 0.85, size = 200 }) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const angle = -90 + (normalizedScore / 100) * 180;

  const levelConfig = {
    Low: {
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.08)',
      border: 'rgba(16, 185, 129, 0.2)',
      label: 'Low Risk',
    },
    Medium: {
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.08)',
      border: 'rgba(245, 158, 11, 0.2)',
      label: 'Medium Risk',
    },
    High: {
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.08)',
      border: 'rgba(239, 68, 68, 0.2)',
      label: 'High Risk',
    },
  };

  const current = levelConfig[level] || levelConfig.Medium;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: size, height: size * 0.55 }}>
        <svg viewBox="0 0 200 115" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          {/* Background Track */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#27272a"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Value Progress */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={current.color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="251.32"
            strokeDashoffset={251.32 * (1 - normalizedScore / 100)}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />

          {/* Pivot */}
          <circle cx="100" cy="100" r="5" fill="#09090b" stroke="#52525b" strokeWidth="2" />

          {/* Needle */}
          <g
            transform={`rotate(${angle}, 100, 100)`}
            style={{ transition: 'transform 0.5s ease' }}
          >
            <polygon points="98,100 102,100 100,35" fill="#ffffff" />
          </g>

          <text x="20" y="112" fill="#71717a" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">0</text>
          <text x="100" y="15" fill="#71717a" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">50</text>
          <text x="180" y="112" fill="#71717a" fontSize="9" fontFamily="var(--font-mono)" textAnchor="middle">100</text>
        </svg>
      </div>

      <div style={{ textAlign: 'center', marginTop: '-2px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '3px' }}>
          <span style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f4f4f5' }}>
            {normalizedScore}
          </span>
          <span style={{ fontSize: '13px', color: '#71717a' }}>/ 100</span>
        </div>

        <div style={{
          display: 'inline-block',
          padding: '2px 10px',
          borderRadius: '4px',
          background: current.bg,
          border: `1px solid ${current.border}`,
          color: current.color,
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          marginTop: '4px'
        }}>
          {current.label}
        </div>

        {confidence !== undefined && (
          <div style={{ fontSize: '11px', color: '#71717a', marginTop: '4px' }}>
            Confidence: <strong style={{ color: '#a1a1aa' }}>{Math.round(confidence * 100)}%</strong>
          </div>
        )}
      </div>
    </div>
  );
}
