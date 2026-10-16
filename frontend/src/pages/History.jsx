import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  Download, 
  GitCompare, 
  Search, 
  Sliders
} from 'lucide-react';
import { api } from '../api';

export default function History({ onSelectCaseForWhatIf, onSelectCaseForAssessment }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await api.getHistory(100);
      setHistory(res);
    } catch (err) {
      console.error('History load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assessment log?')) return;
    try {
      await api.deleteHistory(id);
      setHistory(history.filter(h => h.id !== id));
    } catch (err) {
      alert(`Delete error: ${err.message}`);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all prediction history?')) return;
    try {
      await api.clearHistory();
      setHistory([]);
    } catch (err) {
      alert(`Clear error: ${err.message}`);
    }
  };

  const exportCSV = () => {
    if (history.length === 0) return;
    const headers = ['ID', 'Timestamp', 'Title', 'Category', 'Predicted_Risk', 'Risk_Score', 'Confidence', 'Model', 'Features'];
    const rows = history.map(h => [
      h.id,
      h.timestamp,
      `"${h.case_title || ''}"`,
      h.category,
      h.predicted_risk,
      h.risk_score,
      h.confidence,
      `"${h.selected_model}"`,
      `"${JSON.stringify(h.features).replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `risk_history_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredHistory = history.filter(h => {
    const matchesSearch = search === '' || 
      (h.case_title && h.case_title.toLowerCase().includes(search.toLowerCase())) ||
      (h.category && h.category.toLowerCase().includes(search.toLowerCase()));
    const matchesRisk = riskFilter === 'All' || h.predicted_risk === riskFilter;
    return matchesSearch && matchesRisk;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f5' }}>
            Assessment History & Audit Trail
          </h2>
          <p style={{ fontSize: '12px', color: '#a1a1aa' }}>
            Persisted historical risk assessments in SQLite database
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={exportCSV}
            disabled={history.length === 0}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <Download size={13} />
            Export CSV
          </button>

          <button
            onClick={handleClearAll}
            disabled={history.length === 0}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px', color: '#ef4444' }}
          >
            <Trash2 size={13} />
            Clear
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="clean-box" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#09090b',
          border: '1px solid #27272a',
          padding: '4px 10px',
          borderRadius: '5px',
          flex: 1,
          maxWidth: '280px'
        }}>
          <Search size={13} color="#71717a" />
          <input
            type="text"
            placeholder="Search title, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: '#f4f4f5', fontSize: '12px', outline: 'none', width: '100%' }}
          />
        </div>

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          style={{ backgroundColor: '#09090b', border: '1px solid #27272a', padding: '4px 8px', borderRadius: '5px', color: '#a1a1aa', fontSize: '12px' }}
        >
          <option value="All">All Risk Levels</option>
          <option value="Low">Low Risk</option>
          <option value="Medium">Medium Risk</option>
          <option value="High">High Risk</option>
        </select>
      </div>

      {/* History Items */}
      {filteredHistory.length === 0 ? (
        <div className="clean-box" style={{ padding: '36px', textAlign: 'center' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5' }}>No Assessment Logs</h4>
          <p style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>
            Assessments that you save will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filteredHistory.map((item) => {
            const risk = item.predicted_risk || 'Medium';
            const riskColor = risk === 'Low' ? '#10b981' : (risk === 'Medium' ? '#f59e0b' : '#ef4444');

            return (
              <div
                key={item.id}
                className="clean-box"
                style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '6px',
                    backgroundColor: '#18181b',
                    border: `1px solid ${riskColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: riskColor }}>
                      {Math.round(item.risk_score)}
                    </span>
                    <span style={{ fontSize: '8px', fontWeight: 600, color: riskColor, textTransform: 'uppercase' }}>
                      {risk}
                    </span>
                  </div>

                  <div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5' }}>
                      {item.case_title || 'Risk Case'}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', fontSize: '11px', color: '#71717a' }}>
                      <span style={{ color: '#a1a1aa' }}>{item.category} Domain</span>
                      <span>&bull;</span>
                      <span>{item.timestamp}</span>
                      <span>&bull;</span>
                      <span>Model: <strong style={{ color: '#f4f4f5' }}>{item.selected_model}</strong></span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => onSelectCaseForWhatIf(item.features)}
                    className="btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    <GitCompare size={12} />
                    What-If
                  </button>

                  <button
                    onClick={() => onSelectCaseForAssessment(item.features)}
                    className="btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    <Sliders size={12} />
                    Re-evaluate
                  </button>

                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      border: '1px solid #27272a',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer'
                    }}
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
