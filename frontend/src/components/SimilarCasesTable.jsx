import React from 'react';

export default function SimilarCasesTable({ cases = [] }) {
  if (!cases || cases.length === 0) {
    return null;
  }

  return (
    <div className="clean-box" style={{ padding: '18px', overflowX: 'auto' }}>
      <div style={{ marginBottom: '12px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5' }}>
          Similar Historical Precedents (KNN)
        </h4>
        <p style={{ fontSize: '11px', color: '#71717a' }}>
          Historical cases ranked by feature distance
        </p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #27272a', color: '#71717a', textTransform: 'uppercase', fontSize: '10px' }}>
            <th style={{ padding: '6px 8px' }}>Case ID</th>
            <th style={{ padding: '6px 8px' }}>Category</th>
            <th style={{ padding: '6px 8px' }}>Match</th>
            <th style={{ padding: '6px 8px' }}>Ratings (Sev / Like / Imp / Ctrl)</th>
            <th style={{ padding: '6px 8px' }}>Actual Risk</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c, idx) => {
            const sim = c.similarity_pct || 0;
            return (
              <tr key={c.case_id || idx} style={{ borderBottom: '1px solid #1f1f23' }}>
                <td style={{ padding: '8px', fontWeight: 500, fontFamily: 'var(--font-mono)', color: '#f4f4f5' }}>
                  #{c.case_id}
                </td>
                <td style={{ padding: '8px', color: '#a1a1aa' }}>{c.category}</td>
                <td style={{ padding: '8px', color: '#f4f4f5', fontFamily: 'var(--font-mono)' }}>
                  {sim}%
                </td>
                <td style={{ padding: '8px', color: '#71717a' }}>
                  {c.severity} / {c.likelihood} / {c.impact} / <span style={{ color: '#10b981' }}>{c.control_effectiveness}</span>
                </td>
                <td style={{ padding: '8px' }}>
                  <span className={`badge-${c.known_risk_level?.toLowerCase()}`} style={{
                    padding: '1px 5px',
                    borderRadius: '3px',
                    fontSize: '10px',
                    fontWeight: 500,
                    textTransform: 'uppercase'
                  }}>
                    {c.known_risk_level}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
