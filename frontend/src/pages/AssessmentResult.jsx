import React, { useState } from 'react';
import { 
  GitCompare, 
  Bookmark, 
  RotateCcw, 
  Check
} from 'lucide-react';
import RiskGauge from '../components/RiskGauge';
import TreeVisualizer from '../components/TreeVisualizer';
import SimilarCasesTable from '../components/SimilarCasesTable';
import { api } from '../api';

export default function AssessmentResult({ result, onStartWhatIf, onNewAssessment, onSaveToHistory }) {
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [notes, setNotes] = useState('');

  if (!result) {
    return (
      <div className="clean-box" style={{ padding: '32px', textAlign: 'center' }}>
        <p style={{ color: '#a1a1aa' }}>No assessment data available. Please evaluate a risk scenario first.</p>
        <button onClick={onNewAssessment} className="btn-primary" style={{ marginTop: '12px' }}>
          Go to Assessment Form
        </button>
      </div>
    );
  }

  const {
    case_title = 'Risk Assessment Case',
    case_inputs = {},
    predicted_risk = 'Medium',
    risk_score = 50,
    confidence = 0.85,
    probabilities = { Low: 0.1, Medium: 0.8, High: 0.1 },
    selected_model = {},
    all_model_predictions = {},
    contributing_factors = [],
    similar_cases = [],
    decision_tree_path = {},
  } = result;

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.saveHistory({
        case_title,
        category: case_inputs.Category || 'General',
        features: case_inputs,
        predicted_risk,
        risk_score,
        confidence,
        selected_model: selected_model.display_name || 'Optimal Model',
        probabilities,
        top_factors: contributing_factors,
        notes
      });
      setSavedSuccess(true);
      if (onSaveToHistory) onSaveToHistory();
    } catch (err) {
      alert(`Failed to save: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const getRiskColor = (level) => {
    if (level === 'Low') return '#10b981';
    if (level === 'Medium') return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f5' }}>
            {case_title}
          </h2>
          <p style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '2px' }}>
            Category: <strong style={{ color: '#f4f4f5' }}>{case_inputs.Category}</strong> &bull; Model: <strong style={{ color: '#f4f4f5' }}>{selected_model.display_name}</strong>
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            onClick={() => onStartWhatIf(case_inputs, result)}
            className="btn-primary"
          >
            <GitCompare size={14} />
            Simulate What-If
          </button>

          <button
            onClick={handleSave}
            disabled={saving || savedSuccess}
            className="btn-secondary"
          >
            {savedSuccess ? (
              <>
                <Check size={14} color="#10b981" />
                Saved to History
              </>
            ) : (
              <>
                <Bookmark size={14} />
                {saving ? 'Saving...' : 'Save to History'}
              </>
            )}
          </button>

          <button
            onClick={onNewAssessment}
            className="btn-secondary"
          >
            <RotateCcw size={14} />
            New Assessment
          </button>
        </div>
      </div>

      {/* Main Grid: Gauge + Calibrated Probabilities */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        {/* Left: Score Gauge */}
        <div className="clean-box" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <RiskGauge
            score={risk_score}
            level={predicted_risk}
            confidence={confidence}
            size={220}
          />
        </div>

        {/* Right: Probability Vectors & Formula */}
        <div className="clean-box" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5', marginBottom: '14px' }}>
              Calibrated Class Probability Distribution
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Low Risk', key: 'Low', color: '#10b981' },
                { label: 'Medium Risk', key: 'Medium', color: '#f59e0b' },
                { label: 'High Risk', key: 'High', color: '#ef4444' },
              ].map(({ label, key, color }) => {
                const probVal = probabilities[key] || 0.0;
                const probPct = Math.round(probVal * 100);

                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                      <span style={{ fontWeight: 500, color }}>{label}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>
                        {probPct}% ({probVal.toFixed(3)})
                      </span>
                    </div>
                    <div style={{ height: '4px', backgroundColor: '#18181b', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${probPct}%`,
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: '2px'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{
            marginTop: '16px',
            padding: '10px 12px',
            borderRadius: '5px',
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            fontSize: '11px',
            color: '#a1a1aa'
          }}>
            <strong style={{ color: '#f4f4f5' }}>Calibrated Score Calculation:</strong> Score = (P_Low × 15) + (P_Med × 55) + (P_High × 95) = <span style={{ fontFamily: 'var(--font-mono)', color: '#f4f4f5', fontWeight: 600 }}>{risk_score}</span>
          </div>
        </div>
      </div>

      {/* Multi-Model Comparison Table */}
      <div className="clean-box" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5', marginBottom: '12px' }}>
          Multi-Model Predictions Consensus
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {Object.entries(all_model_predictions).map(([modelKey, mPred]) => {
            const levelColor = getRiskColor(mPred.prediction);
            const isSelected = selected_model.key === modelKey;

            return (
              <div
                key={modelKey}
                className="clean-box-subtle"
                style={{
                  padding: '12px',
                  border: isSelected ? '1px solid #52525b' : '1px solid #27272a'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase' }}>
                    {modelKey.toUpperCase()}
                  </span>
                  {isSelected && (
                    <span style={{ fontSize: '9px', backgroundColor: '#27272a', color: '#f4f4f5', padding: '1px 5px', borderRadius: '3px' }}>
                      Primary
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '16px', fontWeight: 600, color: levelColor, marginTop: '4px' }}>
                  {mPred.prediction} Risk
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#71717a', marginTop: '6px' }}>
                  <span>Score: <strong style={{ fontFamily: 'var(--font-mono)', color: '#f4f4f5' }}>{mPred.risk_score}</strong></span>
                  <span>Confidence: <strong style={{ fontFamily: 'var(--font-mono)', color: '#f4f4f5' }}>{Math.round(mPred.confidence * 100)}%</strong></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Key Factors */}
      <div className="clean-box" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5', marginBottom: '12px' }}>
          Key Contributing Factors
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px' }}>
          {contributing_factors.map((factor, idx) => {
            const isEscalating = factor.impact_type === 'escalating';
            const isMitigating = factor.impact_type === 'mitigating';
            const badgeColor = isEscalating ? '#ef4444' : (isMitigating ? '#10b981' : '#a1a1aa');
            const badgeBg = isEscalating ? 'rgba(239, 68, 68, 0.08)' : (isMitigating ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.05)');

            return (
              <div key={idx} className="clean-box-subtle" style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#f4f4f5' }}>
                    {factor.factor}
                  </span>
                  <span style={{ fontSize: '9px', fontWeight: 600, padding: '1px 6px', borderRadius: '3px', background: badgeBg, color: badgeColor }}>
                    {factor.badge}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#a1a1aa', lineHeight: 1.4 }}>
                  {factor.explanation}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Decision Tree Path */}
      <TreeVisualizer pathData={decision_tree_path} />

      {/* Similar Historical Cases */}
      <SimilarCasesTable cases={similar_cases} />
    </div>
  );
}
