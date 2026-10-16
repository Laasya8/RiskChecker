import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { api } from '../api';

export default function RiskAssessment({ config, bestModel, onAssessmentComplete }) {
  const categories = config?.categories || [
    'Financial', 'Operational', 'Cybersecurity', 'Environmental', 'Business', 'Safety', 'Project', 'Infrastructure'
  ];

  // Concrete Real-World Benchmarks & Option Tiers for Human-Friendly Decision-Making
  const dimensionGuides = {
    Impact: {
      title: 'Financial & Reputational Impact',
      question: 'Estimated financial damage, compliance penalty, or reputational cost',
      options: [
        { value: 1, label: '< $5K', sublabel: 'Negligible' },
        { value: 3, label: '$5K - $50K', sublabel: 'Minor' },
        { value: 5, label: '$50K - $250K', sublabel: 'Moderate' },
        { value: 8, label: '$250K - $1M', sublabel: 'Substantial' },
        { value: 10, label: '> $1M+', sublabel: 'Critical' }
      ]
    },
    Duration: {
      title: 'Downtime & Recovery Duration',
      question: 'Estimated outage duration required to restore normal operations',
      options: [
        { value: 1, label: '< 1 Hour', sublabel: 'Rapid Recovery' },
        { value: 3, label: 'Half-Day', sublabel: '2 to 4 hours' },
        { value: 6, label: '1 - 3 Days', sublabel: 'Engineering On-call' },
        { value: 8, label: '1 - 2 Weeks', sublabel: 'Major Rollback' },
        { value: 10, label: '> 1 Month', sublabel: 'Prolonged Outage' }
      ]
    },
    Exposure: {
      title: 'Scope & Blast Radius',
      question: 'Organizational extent of affected users, data, and infrastructure',
      options: [
        { value: 1, label: 'Isolated', sublabel: 'Single Subsystem' },
        { value: 3, label: 'Single Team', sublabel: 'Localized Department' },
        { value: 5, label: 'Multiple Units', sublabel: 'Cross-functional' },
        { value: 8, label: 'Core Systems', sublabel: 'Primary Platform / ERP' },
        { value: 10, label: 'Enterprise-Wide', sublabel: 'All Global Users' }
      ]
    },
    Severity: {
      title: 'Direct Damage Severity',
      question: 'Immediate technical, physical, or operational damage magnitude',
      options: [
        { value: 1, label: 'Negligible', sublabel: 'Transient Glitch' },
        { value: 3, label: 'Minor', sublabel: 'Fallback Active' },
        { value: 5, label: 'Moderate', sublabel: 'Partial Outage' },
        { value: 8, label: 'Major', sublabel: 'Direct Data Loss' },
        { value: 10, label: 'Catastrophic', sublabel: 'Total Destruction' }
      ]
    },
    Likelihood: {
      title: 'Probability of Occurrence',
      question: 'Frequency of risk manifestation under current operating conditions',
      options: [
        { value: 1, label: 'Rare', sublabel: '< 10% Probability' },
        { value: 3, label: 'Unlikely', sublabel: '~25% Probability' },
        { value: 5, label: 'Possible', sublabel: '~50% Probability' },
        { value: 7, label: 'Likely', sublabel: '~75% Probability' },
        { value: 10, label: 'Imminent', sublabel: '> 90% Probability' }
      ]
    },
    Frequency: {
      title: 'Triggering Event Rate',
      question: 'How often the activating conditions manifest in normal operations',
      options: [
        { value: 1, label: 'Annual', sublabel: 'Rare Yearly Event' },
        { value: 3, label: 'Quarterly', sublabel: 'Seasonal / Release' },
        { value: 5, label: 'Monthly', sublabel: 'Regular Cadence' },
        { value: 7, label: 'Weekly', sublabel: 'Routine Workflows' },
        { value: 10, label: 'Continuous', sublabel: '24/7 Live Operations' }
      ]
    },
    Historical_Occurrence: {
      title: 'Historical Track Record',
      question: 'Recorded number of similar incidents over the past 3 years',
      options: [
        { value: 0, label: '0 Incidents', sublabel: 'Novel Precedent' },
        { value: 2, label: '1 - 2 Incidents', sublabel: 'Isolated Past Case' },
        { value: 5, label: '3 - 5 Incidents', sublabel: 'Known Recurrence' },
        { value: 8, label: '6 - 8 Incidents', sublabel: 'Frequent Failures' },
        { value: 10, label: '10+ Incidents', sublabel: 'Chronic Defect' }
      ]
    },
    Control_Effectiveness: {
      title: 'Safeguards & Mitigation Strength',
      question: 'Strength of preventive safeguards, monitoring, and automated failovers',
      options: [
        { value: 1, label: 'No Controls', sublabel: 'Completely Unprotected' },
        { value: 3, label: 'Weak / Ad-Hoc', sublabel: 'Manual Runbooks' },
        { value: 6, label: 'Adequate', sublabel: 'Standard Monitoring' },
        { value: 8, label: 'Strong', sublabel: 'Automated Failovers' },
        { value: 10, label: 'Optimized', sublabel: '24/7 Continuous SOC' }
      ]
    }
  };

  const presets = config?.presets || [
    { title: 'Data Breach & Ransomware', Category: 'Cybersecurity', Severity: 8, Likelihood: 7, Exposure: 8, Frequency: 3, Duration: 6, Impact: 8, Historical_Occurrence: 3, Control_Effectiveness: 4 },
    { title: 'Supply Chain Component Delay', Category: 'Operational', Severity: 6, Likelihood: 5, Exposure: 6, Frequency: 4, Duration: 5, Impact: 6, Historical_Occurrence: 2, Control_Effectiveness: 6 },
    { title: 'Regulatory Compliance Finding', Category: 'Business', Severity: 7, Likelihood: 4, Exposure: 5, Frequency: 2, Duration: 4, Impact: 7, Historical_Occurrence: 1, Control_Effectiveness: 7 }
  ];

  const [formData, setFormData] = useState({
    case_title: 'Critical Database Outage',
    Category: 'Cybersecurity',
    Severity: 8,
    Likelihood: 7,
    Exposure: 8,
    Frequency: 3,
    Duration: 6,
    Impact: 8,
    Historical_Occurrence: 3,
    Control_Effectiveness: 4,
    chosen_model: 'auto'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === 'Category' || field === 'chosen_model' || field === 'case_title' 
        ? value 
        : parseInt(value, 10) || 0
    }));
  };

  const applyPreset = (p) => {
    setFormData({
      case_title: p.title,
      Category: p.Category,
      Severity: p.Severity,
      Likelihood: p.Likelihood,
      Exposure: p.Exposure,
      Frequency: p.Frequency,
      Duration: p.Duration,
      Impact: p.Impact,
      Historical_Occurrence: p.Historical_Occurrence,
      Control_Effectiveness: p.Control_Effectiveness,
      chosen_model: formData.chosen_model
    });
  };

  const handleReset = () => {
    setFormData({
      case_title: 'Operational Risk Scenario',
      Category: 'Operational',
      Severity: 5,
      Likelihood: 5,
      Exposure: 5,
      Frequency: 4,
      Duration: 4,
      Impact: 5,
      Historical_Occurrence: 2,
      Control_Effectiveness: 6,
      chosen_model: 'auto'
    });
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await api.assessRisk(formData);
      onAssessmentComplete(result, formData);
    } catch (err) {
      setError(err.message || 'Error processing risk assessment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#f8fafc' }}>
            Risk Assessment
          </h1>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '2px' }}>
            Select real-world situation benchmarks to evaluate risk level and calibrated score
          </p>
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="btn-secondary"
          style={{ fontSize: '12px', padding: '6px 14px' }}
        >
          <RotateCcw size={13} />
          Reset Defaults
        </button>
      </div>

      {/* Scenario Templates */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: '#64748b' }}>Quick Templates:</span>
        {presets.map((p, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => applyPreset(p)}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              backgroundColor: '#141417',
              border: '1px solid #232328',
              color: '#cbd5e1',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {p.title}
          </button>
        ))}
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {error && (
          <div style={{
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#f87171',
            fontSize: '13px'
          }}>
            {error}
          </div>
        )}

        {/* Case Meta Inputs */}
        <div className="clean-box" style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                Case Identifier
              </label>
              <input
                type="text"
                value={formData.case_title}
                onChange={(e) => handleInputChange('case_title', e.target.value)}
                placeholder="e.g. Critical Database Outage"
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#09090b',
                  border: '1px solid #27272a',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                Risk Category
              </label>
              <select
                value={formData.Category}
                onChange={(e) => handleInputChange('Category', e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#09090b',
                  border: '1px solid #27272a',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {categories.map((c) => (
                  <option key={c} value={c}>{c} Risk</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#94a3b8', marginBottom: '6px' }}>
                Model Selection
              </label>
              <select
                value={formData.chosen_model}
                onChange={(e) => handleInputChange('chosen_model', e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#09090b',
                  border: '1px solid #27272a',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="auto">
                  {bestModel?.display_name
                    ? `Auto (Best: ${bestModel.display_name})`
                    : 'Auto (Best available model)'}
                </option>
                <option value="svm">Support Vector Machine (SVM)</option>
                <option value="knn">K-Nearest Neighbors (KNN)</option>
                <option value="decision_tree">Decision Tree Classifier</option>
              </select>
            </div>
          </div>
        </div>

        {/* Clean Segmented Option Cards for Each Dimension */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {Object.entries(dimensionGuides).map(([featKey, guide]) => {
            const currentVal = formData[featKey] !== undefined ? formData[featKey] : 5;
            const isControl = featKey === 'Control_Effectiveness';

            return (
              <div
                key={featKey}
                className="clean-box"
                style={{ padding: '18px 22px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>
                    {guide.title}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    fontFamily: 'var(--font-mono)',
                    color: isControl ? '#10b981' : '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    border: '1px solid rgba(59, 130, 246, 0.2)'
                  }}>
                    Rating: {currentVal} / 10
                  </span>
                </div>

                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>
                  {guide.question}
                </p>

                {/* Segmented Option Buttons */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '8px'
                }}>
                  {guide.options.map((opt) => {
                    const isSelected = Math.abs(currentVal - opt.value) <= 1;

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleInputChange(featKey, opt.value)}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.12)' : '#16161a',
                          border: isSelected ? '1px solid #3b82f6' : '1px solid #232328',
                          color: isSelected ? '#ffffff' : '#94a3b8',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                      >
                        <div style={{ fontSize: '12px', fontWeight: isSelected ? 600 : 500, color: isSelected ? '#ffffff' : '#cbd5e1' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: '10px', color: isSelected ? '#93c5fd' : '#64748b' }}>
                          {opt.sublabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Action */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ padding: '10px 28px', fontSize: '13px', fontWeight: 600 }}
          >
            {loading ? 'Evaluating Scenario...' : 'Execute Risk Assessment'}
          </button>
        </div>
      </form>
    </div>
  );
}
