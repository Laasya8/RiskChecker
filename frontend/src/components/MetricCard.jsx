import React from 'react';

export default function MetricCard({ title, value, subtitle, badgeText }) {
  return (
    <div className="clean-box" style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
          {title}
        </span>
        {badgeText && (
          <span style={{
            fontSize: '10px',
            fontWeight: 500,
            padding: '1px 6px',
            borderRadius: '3px',
            backgroundColor: '#18181b',
            color: '#a1a1aa',
            border: '1px solid #27272a'
          }}>
            {badgeText}
          </span>
        )}
      </div>

      <div style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#f4f4f5' }}>
        {value}
      </div>

      {subtitle && (
        <p style={{ fontSize: '11px', color: '#71717a', marginTop: '3px' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
