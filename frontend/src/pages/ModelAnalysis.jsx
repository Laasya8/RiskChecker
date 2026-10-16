import React, { useState, useEffect } from 'react';
import { 
  RotateCcw
} from 'lucide-react';
import ConfusionMatrix from '../components/ConfusionMatrix';
import { api } from '../api';

export default function ModelAnalysis({ modelDetails, onRetrainSuccess }) {
  const [details, setDetails] = useState(modelDetails);
  const [activeModelTab, setActiveModelTab] = useState(
    modelDetails?.best_model_name || 'svm'
  );

  // Retraining state
  const [retrainParams, setRetrainParams] = useState({
    k_neighbors: 5,
    distance_metric: 'euclidean',
    svm_kernel: 'rbf',
    svm_c: 1.0,
    tree_criterion: 'gini',
    tree_max_depth: 5,
    imputation: 'median',
    outlier_strategy: 'cap',
    cv_folds: 5
  });
  const [retraining, setRetraining] = useState(false);
  const [retrainSuccessMsg, setRetrainSuccessMsg] = useState(null);

  useEffect(() => {
    if (modelDetails) {
      setDetails(modelDetails);
      setActiveModelTab(modelDetails.best_model_name || 'svm');
    }
  }, [modelDetails]);

  const handleRetrain = async (e) => {
    e.preventDefault();
    setRetraining(true);
    setRetrainSuccessMsg(null);
    try {
      const res = await api.retrainModels(retrainParams);
      setRetrainSuccessMsg('Models retrained and cross-validated successfully.');
      const updatedDetails = await api.getModelDetails();
      setDetails(updatedDetails);
      if (onRetrainSuccess) onRetrainSuccess(res.summary);
    } catch (err) {
      alert(`Retraining failed: ${err.message}`);
    } finally {
      setRetraining(false);
    }
  };

  const evals = details?.evaluations || {};
  const cvs = details?.cross_validations || {};
  const importances = details?.feature_importances || [];
  const bestModelKey = details?.best_model_name || 'svm';
  const testEvaluationCount = details?.dataset_info?.test_evaluation_records;
  const evaluationCaveat = details?.dataset_info?.evaluation_caveat;

  const currentEval = evals[activeModelTab] || {};
  const currentCV = cvs[activeModelTab] || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f5' }}>
          Model Evaluation & Cross-Validation
        </h2>
        <p style={{ fontSize: '12px', color: '#a1a1aa' }}>
          Performance metrics use unseen test feature vectors and grouped stratified cross-validation.
        </p>
      </div>

      {/* Model Selector Tabs */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid #27272a', paddingBottom: '8px' }}>
        {[
          { key: 'svm', label: 'Support Vector Machine (SVM)' },
          { key: 'knn', label: 'K-Nearest Neighbors (KNN)' },
          { key: 'decision_tree', label: 'Decision Tree Classifier' },
        ].map((tab) => {
          const isActive = activeModelTab === tab.key;
          const isBest = bestModelKey === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveModelTab(tab.key)}
              style={{
                padding: '6px 12px',
                borderRadius: '5px',
                backgroundColor: isActive ? '#18181b' : 'transparent',
                border: isActive ? '1px solid #27272a' : '1px solid transparent',
                color: isActive ? '#f4f4f5' : '#a1a1aa',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{tab.label}</span>
              {isBest && (
                <span style={{ fontSize: '9px', backgroundColor: '#27272a', color: '#10b981', border: '1px solid #27272a', padding: '1px 5px', borderRadius: '3px' }}>
                  Best
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Evaluation & Confusion Matrix */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Test Metrics */}
        <div className="clean-box" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5', marginBottom: '12px' }}>
            Holdout Test Metrics (N={testEvaluationCount?.toLocaleString() || '--'} unseen feature vectors)
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: '16px' }}>
            <div className="clean-box-subtle" style={{ padding: '10px', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase' }}>Accuracy</span>
              <div style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#f4f4f5', marginTop: '2px' }}>
                {currentEval.accuracy ? `${(currentEval.accuracy * 100).toFixed(1)}%` : '--'}
              </div>
            </div>

            <div className="clean-box-subtle" style={{ padding: '10px', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase' }}>F1-Score (Macro)</span>
              <div style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#f4f4f5', marginTop: '2px' }}>
                {currentEval.f1_macro ? (currentEval.f1_macro * 100).toFixed(1) + '%' : '--'}
              </div>
            </div>

            <div className="clean-box-subtle" style={{ padding: '10px', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase' }}>Precision</span>
              <div style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#a1a1aa', marginTop: '2px' }}>
                {currentEval.precision_macro ? (currentEval.precision_macro * 100).toFixed(1) + '%' : '--'}
              </div>
            </div>

            <div className="clean-box-subtle" style={{ padding: '10px', textAlign: 'center' }}>
              <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase' }}>Recall</span>
              <div style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#a1a1aa', marginTop: '2px' }}>
                {currentEval.recall_macro ? (currentEval.recall_macro * 100).toFixed(1) + '%' : '--'}
              </div>
            </div>
          </div>

          {currentEval.class_metrics && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(currentEval.class_metrics).map(([cls, cm]) => (
                <div key={cls} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  backgroundColor: '#18181b',
                  borderRadius: '4px',
                  fontSize: '11px',
                  border: '1px solid #27272a'
                }}>
                  <span style={{ fontWeight: 500, color: cls === 'Low' ? '#10b981' : (cls === 'Medium' ? '#f59e0b' : '#ef4444') }}>
                    {cls} Risk
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>
                    P: {(cm.precision * 100).toFixed(0)}% &bull; R: {(cm.recall * 100).toFixed(0)}% &bull; F1: {(cm.f1 * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {evaluationCaveat && (
            <p role="note" style={{
              marginTop: '12px',
              padding: '10px',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '6px',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              color: '#fcd34d',
              fontSize: '11px',
              lineHeight: 1.5
            }}>
              Evaluation caution: {evaluationCaveat}
            </p>
          )}
        </div>

        {/* Confusion Matrix */}
        <ConfusionMatrix
          matrix={currentEval.confusion_matrix || [[0, 0, 0], [0, 0, 0], [0, 0, 0]]}
          classes={currentEval.classes || ['Low', 'Medium', 'High']}
          modelName={currentEval.display_name}
        />
      </div>

      {/* Stratified K-Fold Cross-Validation Table */}
      <div className="clean-box" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5' }}>
            {currentCV.splitter || 'StratifiedKFold'} ({currentCV.n_splits || 5}-fold) Validation Telemetry
          </h4>
          <span style={{ fontSize: '11px', color: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '2px 8px', borderRadius: '4px' }}>
            {currentCV.stability_status || 'Stable'}
          </span>
        </div>

        <div style={{ overflowX: 'auto', marginBottom: '12px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a', color: '#71717a', textTransform: 'uppercase', fontSize: '10px' }}>
                <th style={{ padding: '6px 8px' }}>Fold</th>
                <th style={{ padding: '6px 8px' }}>Samples (Train / Val)</th>
                <th style={{ padding: '6px 8px' }}>Accuracy</th>
                <th style={{ padding: '6px 8px' }}>Precision</th>
                <th style={{ padding: '6px 8px' }}>Recall</th>
                <th style={{ padding: '6px 8px' }}>F1 (Macro)</th>
              </tr>
            </thead>
            <tbody>
              {currentCV.folds && currentCV.folds.map((f) => (
                <tr key={f.fold} style={{ borderBottom: '1px solid #1f1f23' }}>
                  <td style={{ padding: '8px', fontWeight: 500, color: '#f4f4f5', fontFamily: 'var(--font-mono)' }}>Fold {f.fold}</td>
                  <td style={{ padding: '8px', color: '#a1a1aa' }}>{f.train_samples} / {f.val_samples}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>{(f.accuracy * 100).toFixed(1)}%</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>{(f.precision_macro * 100).toFixed(1)}%</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>{(f.recall_macro * 100).toFixed(1)}%</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#f4f4f5' }}>{(f.f1_macro * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: '#71717a', paddingTop: '8px', borderTop: '1px solid #27272a' }}>
          <span>Mean Accuracy: <strong style={{ color: '#f4f4f5', fontFamily: 'var(--font-mono)' }}>{(currentCV.mean_accuracy * 100).toFixed(1)}% &plusmn; {(currentCV.std_accuracy * 100).toFixed(1)}%</strong></span>
          <span>Mean F1 (Macro): <strong style={{ color: '#f4f4f5', fontFamily: 'var(--font-mono)' }}>{(currentCV.mean_f1_macro * 100).toFixed(1)}% &plusmn; {(currentCV.std_f1_macro * 100).toFixed(1)}%</strong></span>
        </div>
      </div>

      {/* Feature Importances */}
      {importances.length > 0 && (
        <div className="clean-box" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5', marginBottom: '12px' }}>
            Decision Tree Feature Importances (Gini Impurity)
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {importances.map((fi, idx) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '3px' }}>
                  <span style={{ color: '#a1a1aa' }}>{fi.feature}</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: '#f4f4f5' }}>{fi.importance_pct}%</span>
                </div>
                <div style={{ height: '4px', backgroundColor: '#18181b', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${fi.importance_pct}%`, height: '100%', backgroundColor: '#ffffff' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tuning Workbench */}
      <div className="clean-box" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5', marginBottom: '12px' }}>
          Hyperparameter Configuration Workbench
        </h4>

        {retrainSuccessMsg && (
          <div style={{ padding: '8px 12px', backgroundColor: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '12px', borderRadius: '4px', marginBottom: '12px' }}>
            {retrainSuccessMsg}
          </div>
        )}

        <form onSubmit={handleRetrain} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <div className="clean-box-subtle" style={{ padding: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase' }}>KNN Parameters</span>
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#a1a1aa' }}>K Neighbors ({retrainParams.k_neighbors})</label>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="2"
                  value={retrainParams.k_neighbors}
                  onChange={(e) => setRetrainParams({ ...retrainParams, k_neighbors: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#a1a1aa' }}>Distance Metric</label>
                <select
                  value={retrainParams.distance_metric}
                  onChange={(e) => setRetrainParams({ ...retrainParams, distance_metric: e.target.value })}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', backgroundColor: '#09090b', color: '#f4f4f5', border: '1px solid #27272a', fontSize: '11px' }}
                >
                  <option value="euclidean">Euclidean</option>
                  <option value="manhattan">Manhattan</option>
                  <option value="cosine">Cosine</option>
                </select>
              </div>
            </div>
          </div>

          <div className="clean-box-subtle" style={{ padding: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase' }}>SVM Parameters</span>
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#a1a1aa' }}>Kernel</label>
                <select
                  value={retrainParams.svm_kernel}
                  onChange={(e) => setRetrainParams({ ...retrainParams, svm_kernel: e.target.value })}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', backgroundColor: '#09090b', color: '#f4f4f5', border: '1px solid #27272a', fontSize: '11px' }}
                >
                  <option value="rbf">RBF Kernel</option>
                  <option value="linear">Linear Kernel</option>
                  <option value="poly">Polynomial</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#a1a1aa' }}>Regularization C ({retrainParams.svm_c})</label>
                <input
                  type="range"
                  min="0.1"
                  max="10"
                  step="0.5"
                  value={retrainParams.svm_c}
                  onChange={(e) => setRetrainParams({ ...retrainParams, svm_c: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="clean-box-subtle" style={{ padding: '12px' }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#71717a', textTransform: 'uppercase' }}>Decision Tree</span>
            <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '11px', color: '#a1a1aa' }}>Criterion</label>
                <select
                  value={retrainParams.tree_criterion}
                  onChange={(e) => setRetrainParams({ ...retrainParams, tree_criterion: e.target.value })}
                  style={{ width: '100%', padding: '6px', borderRadius: '4px', backgroundColor: '#09090b', color: '#f4f4f5', border: '1px solid #27272a', fontSize: '11px' }}
                >
                  <option value="gini">Gini Impurity</option>
                  <option value="entropy">Entropy</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '11px', color: '#a1a1aa' }}>Max Depth ({retrainParams.tree_max_depth})</label>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="1"
                  value={retrainParams.tree_max_depth}
                  onChange={(e) => setRetrainParams({ ...retrainParams, tree_max_depth: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button
              type="submit"
              disabled={retraining}
              className="btn-primary"
              style={{ fontSize: '12px' }}
            >
              <RotateCcw size={13} />
              {retraining ? 'Retraining...' : 'Apply & Retrain'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
