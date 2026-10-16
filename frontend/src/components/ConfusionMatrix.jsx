import React from 'react';

export default function ConfusionMatrix({ matrix = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], classes = ['Low', 'Medium', 'High'], modelName = '' }) {
  const flatVals = matrix.flat();
  const maxVal = Math.max(...flatVals, 1);
  const totalSamples = flatVals.reduce((a, b) => a + b, 0);

  return (
    <div className="clean-box" style={{ padding: '18px' }}>
      <div style={{ marginBottom: '14px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5' }}>
          Confusion Matrix {modelName && `(${modelName})`}
        </h4>
        <p style={{ fontSize: '11px', color: '#71717a' }}>
          Test set validation (N = {totalSamples})
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: '10px', color: '#71717a', marginBottom: '6px', textTransform: 'uppercase' }}>
          Predicted &rarr;
        </div>

        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            fontSize: '10px',
            color: '#71717a',
            marginRight: '8px',
            textTransform: 'uppercase'
          }}>
            Actual &rarr;
          </div>

          <div>
            <div style={{ display: 'grid', gridTemplateColumns: `50px repeat(${classes.length}, 65px)`, gap: '3px', marginBottom: '3px' }}>
              <div />
              {classes.map((c) => (
                <div key={c} style={{ textAlign: 'center', fontSize: '11px', color: '#a1a1aa' }}>
                  {c}
                </div>
              ))}
            </div>

            {matrix.map((row, rowIdx) => (
              <div key={rowIdx} style={{ display: 'grid', gridTemplateColumns: `50px repeat(${classes.length}, 65px)`, gap: '3px', marginBottom: '3px', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#a1a1aa', textAlign: 'right', paddingRight: '6px' }}>
                  {classes[rowIdx]}
                </div>
                {row.map((cellVal, colIdx) => {
                  const isDiagonal = rowIdx === colIdx;
                  const rowSum = row.reduce((a, b) => a + b, 0);
                  const rowPct = rowSum > 0 ? Math.round((cellVal / rowSum) * 100) : 0;
                  
                  return (
                    <div
                      key={colIdx}
                      style={{
                        height: '46px',
                        borderRadius: '4px',
                        backgroundColor: isDiagonal ? '#18181b' : (cellVal > 0 ? 'rgba(239, 68, 68, 0.08)' : '#09090b'),
                        border: isDiagonal ? '1px solid #3f3f46' : '1px solid #1f1f23',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: isDiagonal ? '#ffffff' : (cellVal > 0 ? '#ef4444' : '#52525b') }}>
                        {cellVal}
                      </span>
                      <span style={{ fontSize: '9px', color: '#71717a' }}>{rowPct}%</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
