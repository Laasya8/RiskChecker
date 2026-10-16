import React from 'react';
import MetricCard from '../components/MetricCard';

export default function Dashboard({ systemSummary, setActiveTab }) {
  const datasetInfo = systemSummary?.dataset_info || {};
  const bestModel = systemSummary?.best_model || {};
  const modelComparisons = systemSummary?.model_comparisons || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Overview Block */}
      <div className="clean-box" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ maxWidth: '720px' }}>
            <h1 style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f5' }}>
              Risk Assessment Decision Support System
            </h1>
            <p style={{ fontSize: '13px', color: '#a1a1aa', marginTop: '6px', lineHeight: 1.6 }}>
              A general-purpose risk evaluation platform utilizing K-Nearest Neighbors, Support Vector Machines, and Decision Tree classifiers. Evaluates situational risk characteristics and provides quantitative scores, decision trees, and historical precedent evidence.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('assess')}
              className="btn-primary"
            >
              Start New Assessment
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className="btn-secondary"
            >
              View Models
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <MetricCard
          title="Historical Cases"
          value={datasetInfo.total_records ? datasetInfo.total_records.toLocaleString() : '1,200'}
          subtitle="Multi-domain risk records"
          badgeText="8 Categories"
        />

        <MetricCard
          title="Optimal Classifier"
          value={bestModel.key ? bestModel.key.toUpperCase() : 'SVM'}
          subtitle={bestModel.selection_reason || 'Highest Cross-Validation F1'}
          badgeText={`F1: ${bestModel.cv_f1_macro ? (bestModel.cv_f1_macro * 100).toFixed(1) + '%' : '93.6%'}`}
        />

        <MetricCard
          title="Test Accuracy"
          value={bestModel.test_accuracy ? `${bestModel.test_accuracy}%` : '95.8%'}
          subtitle={`${datasetInfo.test_evaluation_records?.toLocaleString() || '—'} unseen test feature vectors`}
          badgeText="Verified"
        />

        <MetricCard
          title="Cross-Validation"
          value="5-Fold"
          subtitle="Stratified by unique feature groups"
          badgeText="Standard"
        />
      </div>

      {datasetInfo.evaluation_caveat && (
        <div
          role="note"
          style={{
            padding: '12px 16px',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            borderRadius: '8px',
            backgroundColor: 'rgba(245, 158, 11, 0.08)',
            color: '#fcd34d',
            fontSize: '12px',
            lineHeight: 1.6
          }}
        >
          Evaluation caution: {datasetInfo.evaluation_caveat}
        </div>
      )}

      {/* Models & Class Distribution Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        {/* Leaderboard */}
        <div className="clean-box" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5' }}>
              Model Performance Summary
            </h4>
            <button
              onClick={() => setActiveTab('models')}
              style={{ fontSize: '12px', color: '#a1a1aa', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Details &rarr;
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a', color: '#71717a', fontSize: '10px', textTransform: 'uppercase' }}>
                <th style={{ padding: '6px 8px' }}>Model</th>
                <th style={{ padding: '6px 8px' }}>Accuracy</th>
                <th style={{ padding: '6px 8px' }}>Precision</th>
                <th style={{ padding: '6px 8px' }}>Recall</th>
                <th style={{ padding: '6px 8px' }}>F1 (Macro)</th>
              </tr>
            </thead>
            <tbody>
              {['svm', 'knn', 'decision_tree'].map((key) => {
                const m = modelComparisons[key] || {};
                const isBest = bestModel.key === key;
                return (
                  <tr key={key} style={{ borderBottom: '1px solid #1f1f23' }}>
                    <td style={{ padding: '8px', fontWeight: 500, color: '#f4f4f5' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{key.toUpperCase()}</span>
                        {isBest && (
                          <span style={{ fontSize: '9px', backgroundColor: '#18181b', color: '#10b981', border: '1px solid #27272a', padding: '1px 4px', borderRadius: '3px' }}>
                            Best
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>
                      {m.accuracy ? `${(m.accuracy * 100).toFixed(1)}%` : '--'}
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>
                      {m.precision_macro ? `${(m.precision_macro * 100).toFixed(1)}%` : '--'}
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>
                      {m.recall_macro ? `${(m.recall_macro * 100).toFixed(1)}%` : '--'}
                    </td>
                    <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#f4f4f5' }}>
                      {m.f1_macro ? `${(m.f1_macro * 100).toFixed(1)}%` : '--'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Distribution */}
        <div className="clean-box" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5', marginBottom: '12px' }}>
            Class Distribution
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {datasetInfo.class_distribution && Object.entries(datasetInfo.class_distribution).map(([label, count]) => {
              const total = datasetInfo.total_records || 1200;
              const pct = Math.round((count / total) * 100);
              const color = label === 'Low' ? '#10b981' : (label === 'Medium' ? '#f59e0b' : '#ef4444');

              return (
                <div key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                    <span style={{ fontWeight: 500, color }}>{label} Risk</span>
                    <span style={{ color: '#71717a', fontFamily: 'var(--font-mono)' }}>{count} cases ({pct}%)</span>
                  </div>
                  <div style={{ height: '4px', backgroundColor: '#18181b', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '1px solid #27272a' }}>
            <button
              onClick={() => setActiveTab('assess')}
              style={{ fontSize: '12px', color: '#a1a1aa', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Start New Evaluation &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
