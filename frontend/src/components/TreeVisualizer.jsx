import React from 'react';

export default function TreeVisualizer({ pathData }) {
  if (!pathData || !pathData.steps || pathData.steps.length === 0) {
    return null;
  }

  const { steps } = pathData;

  const levelColors = {
    Low: '#10b981',
    Medium: '#f59e0b',
    High: '#ef4444',
  };

  return (
    <div className="clean-box" style={{ padding: '18px' }}>
      <div style={{ marginBottom: '14px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5' }}>
          Decision Tree Logic Path
        </h4>
        <p style={{ fontSize: '11px', color: '#71717a' }}>
          Exact branch decisions evaluated for this input
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {steps.map((step, idx) => {
          const isLeaf = step.type === 'leaf';

          if (isLeaf) {
            const leafColor = levelColors[step.prediction] || '#3b82f6';
            return (
              <div key={idx} style={{
                backgroundColor: '#18181b',
                border: `1px solid ${leafColor}`,
                borderRadius: '5px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase' }}>Classification</span>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: leafColor }}>
                    {step.prediction} Risk
                  </div>
                </div>

                {step.class_distribution && (
                  <div style={{ display: 'flex', gap: '6px', fontSize: '10px', color: '#a1a1aa' }}>
                    {Object.entries(step.class_distribution).map(([c, count]) => (
                      <span key={c}>{c}: {count}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={idx} className="clean-box-subtle" style={{ padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#f4f4f5' }}>
                  {step.feature}
                </span>
                <span style={{ fontSize: '11px', color: '#71717a', marginLeft: '6px' }}>
                  ({step.sample_value} vs {step.threshold})
                </span>
              </div>

              <span style={{
                fontSize: '10px',
                fontWeight: 500,
                padding: '1px 6px',
                borderRadius: '3px',
                backgroundColor: '#09090b',
                color: step.passed ? '#10b981' : '#a1a1aa',
                border: '1px solid #27272a'
              }}>
                {step.passed ? 'YES (<=)' : 'NO (>)'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
