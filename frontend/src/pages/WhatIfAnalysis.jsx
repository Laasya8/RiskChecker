import React, { useState, useEffect } from 'react';
import { 
  GitCompare, 
  RotateCcw, 
  ArrowRight,
  ShieldCheck,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api';

export default function WhatIfAnalysis({ initialCase, config }) {
  // Concrete Real-World Benchmarks for Sensitivity Evaluation
  const dimensionGuides = {
    Impact: {
      title: 'Financial & Reputational Impact',
      tiers: [
        { value: 1, label: '< $5K (Negligible)' },
        { value: 3, label: '$5K - $50K (Low)' },
        { value: 5, label: '$50K - $250K (Moderate)' },
        { value: 7, label: '$250K - $1M (Substantial)' },
        { value: 10, label: '> $1M+ (Severe / Critical)' }
      ]
    },
    Duration: {
      title: 'Recovery Duration',
      tiers: [
        { value: 1, label: '< 1 hr' },
        { value: 3, label: 'Half-day' },
        { value: 5, label: '1 - 3 days' },
        { value: 7, label: '1 - 2 wks' },
        { value: 10, label: '> 1 mo' }
      ]
    },
    Exposure: {
      title: 'Blast Radius Scope',
      tiers: [
        { value: 1, label: 'Isolated' },
        { value: 3, label: 'Single Team' },
        { value: 5, label: 'Multiple Units' },
        { value: 8, label: 'Core Infrastructure' },
        { value: 10, label: 'Enterprise-wide' }
      ]
    },
    Severity: {
      title: 'Damage Severity',
      tiers: [
        { value: 1, label: 'Negligible' },
        { value: 3, label: 'Minor' },
        { value: 5, label: 'Moderate' },
        { value: 8, label: 'Major' },
        { value: 10, label: 'Catastrophic' }
      ]
    },
    Likelihood: {
      title: 'Probability of Occurrence',
      tiers: [
        { value: 1, label: 'Rare (<5%)' },
        { value: 3, label: 'Unlikely (~20%)' },
        { value: 5, label: 'Possible (~50%)' },
        { value: 7, label: 'Likely (~75%)' },
        { value: 10, label: 'Imminent (>95%)' }
      ]
    },
    Frequency: {
      title: 'Trigger Frequency',
      tiers: [
        { value: 1, label: 'Annual' },
        { value: 3, label: 'Quarterly' },
        { value: 5, label: 'Monthly' },
        { value: 7, label: 'Weekly' },
        { value: 10, label: 'Continuous 24/7' }
      ]
    },
    Historical_Occurrence: {
      title: 'Past Incidents (3 yrs)',
      tiers: [
        { value: 0, label: '0 Incidents' },
        { value: 2, label: '1 - 2 Incidents' },
        { value: 5, label: '3 - 5 Incidents' },
        { value: 8, label: '6 - 8 Incidents' },
        { value: 10, label: '10+ Chronic' }
      ]
    },
    Control_Effectiveness: {
      title: 'Mitigation Safeguards',
      tiers: [
        { value: 1, label: 'No Controls' },
        { value: 3, label: 'Ad-Hoc Manual' },
        { value: 5, label: 'Adequate Standard' },
        { value: 8, label: 'Strong Automation' },
        { value: 10, label: 'Optimized Zero-Trust' }
      ]
    }
  };

  const defaultBase = initialCase || {
    Category: 'Cybersecurity',
    Severity: 8,
    Likelihood: 7,
    Exposure: 8,
    Frequency: 3,
    Duration: 6,
    Impact: 8,
    Historical_Occurrence: 3,
    Control_Effectiveness: 4
  };

  const [baseInputs, setBaseInputs] = useState(defaultBase);
  const [modInputs, setModInputs] = useState(defaultBase);
  const [simResult, setSimResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialCase) {
      setBaseInputs(initialCase);
      setModInputs(initialCase);
      runSimulation(initialCase, initialCase);
    } else {
      runSimulation(baseInputs, modInputs);
    }
  }, [initialCase]);

  const runSimulation = async (orig, mod) => {
    setLoading(true);
    try {
      const res = await api.runWhatIf(orig, mod, 'auto');
      setSimResult(res);
    } catch (err) {
      console.error('What-if error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleModChange = (field, val) => {
    const updated = {
      ...modInputs,
      [field]: field === 'Category' ? val : parseInt(val, 10) || 0
    };
    setModInputs(updated);
    runSimulation(baseInputs, updated);
  };

  const handleResetToBaseline = () => {
    setModInputs(baseInputs);
    runSimulation(baseInputs, baseInputs);
  };

  const applyPresetShift = (type) => {
    let updated = { ...modInputs };
    if (type === 'boost_controls') {
      updated.Control_Effectiveness = Math.min(10, (updated.Control_Effectiveness || 5) + 3);
    } else if (type === 'mitigate_likelihood') {
      updated.Likelihood = Math.max(1, (updated.Likelihood || 5) - 3);
    } else if (type === 'escalation') {
      updated.Severity = 9;
      updated.Impact = 9;
      updated.Likelihood = 8;
      updated.Control_Effectiveness = 2;
    }
    setModInputs(updated);
    runSimulation(baseInputs, updated);
  };

  const getClosestTierLabel = (featKey, val) => {
    const guide = dimensionGuides[featKey];
    if (!guide) return '';
    let closest = guide.tiers[0];
    let minDiff = Math.abs(val - closest.value);
    for (const t of guide.tiers) {
      const diff = Math.abs(val - t.value);
      if (diff < minDiff) {
        minDiff = diff;
        closest = t;
      }
    }
    return closest.label;
  };

  const comp = simResult?.comparison || {};
  const scoreDelta = comp.score_delta || 0.0;
  const isMitigated = scoreDelta < 0;
  const isEscalated = scoreDelta > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f5' }}>
            What-If Sensitivity Simulation
          </h2>
          <p style={{ fontSize: '12px', color: '#a1a1aa', marginTop: '2px' }}>
            Simulate parameter perturbations and observe marginal impact on quantitative score and risk category
          </p>
        </div>

        <button
          onClick={handleResetToBaseline}
          className="btn-secondary"
          style={{ fontSize: '12px', padding: '5px 12px' }}
        >
          <RotateCcw size={13} />
          Reset to Baseline
        </button>
      </div>

      {/* Quick Perturbation Actions */}
      <div style={{
        backgroundColor: '#121215',
        border: '1px solid #27272a',
        borderRadius: '8px',
        padding: '12px 16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
            Simulate Business Scenario Changes:
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <button
              onClick={() => applyPresetShift('boost_controls')}
              style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ShieldCheck size={12} />
              + Implement Multi-Layer Safeguards (+3)
            </button>
            <button
              onClick={() => applyPresetShift('mitigate_likelihood')}
              style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid #27272a', color: '#f4f4f5', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <TrendingDown size={12} />
              - Reduce Exposure / Likelihood (-3)
            </button>
            <button
              onClick={() => applyPresetShift('escalation')}
              style={{ padding: '4px 10px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <AlertTriangle size={12} />
              Threat Escalation (Major Breach)
            </button>
          </div>
        </div>
      </div>

      {/* Main Comparative Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
        {/* Parameters Workbench */}
        <div style={{
          backgroundColor: '#121215',
          border: '1px solid #27272a',
          borderRadius: '8px',
          padding: '20px'
        }}>
          <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5', marginBottom: '14px' }}>
            Simulated Parameters
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {Object.entries(dimensionGuides).map(([featKey, guide]) => {
              const origVal = baseInputs[featKey] !== undefined ? baseInputs[featKey] : 5;
              const modVal = modInputs[featKey] !== undefined ? modInputs[featKey] : 5;
              const delta = modVal - origVal;
              const isChanged = origVal !== modVal;
              const tierLabel = getClosestTierLabel(featKey, modVal);

              return (
                <div
                  key={featKey}
                  style={{
                    backgroundColor: '#18181b',
                    border: isChanged ? '1px solid #52525b' : '1px solid #27272a',
                    borderRadius: '6px',
                    padding: '10px 12px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#f4f4f5' }}>
                      {guide.title}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#71717a' }}>Base: {origVal}</span>
                      <span style={{ fontSize: '11px', color: '#a1a1aa' }}>{tierLabel}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#f4f4f5', backgroundColor: '#09090b', padding: '1px 5px', borderRadius: '3px', border: '1px solid #27272a' }}>
                        {modVal}
                      </span>
                      {isChanged && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          color: delta > 0 ? (featKey === 'Control_Effectiveness' ? '#10b981' : '#ef4444') : (featKey === 'Control_Effectiveness' ? '#ef4444' : '#10b981')
                        }}>
                          ({delta > 0 ? `+${delta}` : delta})
                        </span>
                      )}
                    </div>
                  </div>

                  <input
                    type="range"
                    min={featKey === 'Historical_Occurrence' ? 0 : 1}
                    max={10}
                    step={1}
                    value={modVal}
                    onChange={(e) => handleModChange(featKey, e.target.value)}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Comparative Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Comparison Outcome */}
          <div style={{
            backgroundColor: '#121215',
            border: '1px solid #27272a',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5', marginBottom: '14px' }}>
              Simulation Outcome & Delta
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto 1fr',
              alignItems: 'center',
              gap: '10px',
              padding: '16px',
              borderRadius: '6px',
              backgroundColor: '#18181b',
              border: '1px solid #27272a',
              textAlign: 'center'
            }}>
              <div>
                <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase' }}>Baseline</span>
                <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>
                  {comp.original_risk_score ?? '--'}
                </div>
                <span className={`badge-${comp.original_risk_level?.toLowerCase()}`} style={{ fontSize: '9px', fontWeight: 600, padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>
                  {comp.original_risk_level}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ArrowRight size={16} color="#71717a" />
                <span style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  color: isMitigated ? '#10b981' : (isEscalated ? '#ef4444' : '#71717a'),
                  marginTop: '2px'
                }}>
                  {scoreDelta > 0 ? `+${scoreDelta}` : scoreDelta}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase' }}>Simulated</span>
                <div style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f4f4f5' }}>
                  {comp.modified_risk_score ?? '--'}
                </div>
                <span className={`badge-${comp.modified_risk_level?.toLowerCase()}`} style={{ fontSize: '9px', fontWeight: 600, padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>
                  {comp.modified_risk_level}
                </span>
              </div>
            </div>

            <p style={{
              marginTop: '12px',
              fontSize: '12px',
              color: '#a1a1aa',
              backgroundColor: '#18181b',
              padding: '10px 12px',
              borderRadius: '5px',
              border: '1px solid #27272a',
              lineHeight: 1.4
            }}>
              {comp.summary || 'Adjust simulated parameters to observe model consensus response.'}
            </p>
          </div>

          {/* Probability Vectors */}
          {comp.probability_shifts && (
            <div style={{
              backgroundColor: '#121215',
              border: '1px solid #27272a',
              borderRadius: '8px',
              padding: '20px'
            }}>
              <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5', marginBottom: '12px' }}>
                Probability Distribution Shifts
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(comp.probability_shifts).map(([cls, data]) => {
                  const shift = data.shift || 0;
                  const color = cls === 'Low' ? '#10b981' : (cls === 'Medium' ? '#f59e0b' : '#ef4444');

                  return (
                    <div key={cls}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                        <span style={{ fontWeight: 500, color }}>{cls} Risk</span>
                        <div style={{ display: 'flex', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                          <span style={{ color: '#71717a' }}>Base: {Math.round(data.original * 100)}%</span>
                          <span style={{ color: '#f4f4f5', fontWeight: 500 }}>Sim: {Math.round(data.modified * 100)}%</span>
                          <span style={{ color: shift > 0 ? '#10b981' : (shift < 0 ? '#ef4444' : '#71717a') }}>
                            ({shift > 0 ? `+${(shift * 100).toFixed(0)}%` : `${(shift * 100).toFixed(0)}%`})
                          </span>
                        </div>
                      </div>

                      <div style={{ height: '4px', backgroundColor: '#18181b', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.round(data.modified * 100)}%`, height: '100%', backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
