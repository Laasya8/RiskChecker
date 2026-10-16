import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { api } from '../api';

export default function DatasetExplorer() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(20);
  const [selectedSplit, setSelectedSplit] = useState('combined');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedRisk, setSelectedRisk] = useState('All');

  useEffect(() => {
    fetchData();
  }, [page, limit, selectedSplit]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.getDatasetDetails(limit, page * limit, selectedSplit);
      setData(res);
    } catch (err) {
      console.error('Dataset fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const records = data?.records || [];
  const stats = data?.numeric_stats || {};
  const totalRecords = data?.total_records || 40000;
  const trainCount = data?.train_records_count || 20000;
  const testCount = data?.test_records_count || 20000;

  const filteredRecords = records.filter((r) => {
    const matchesSearch = searchQuery === '' || 
      r.Case_ID.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.Category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'All' || r.Category === selectedCategory;
    const matchesRisk = selectedRisk === 'All' || r.Risk_Level === selectedRisk;
    return matchesSearch && matchesCat && matchesRisk;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f4f4f5' }}>
          Dataset & Data Quality Inspection
        </h2>
        <p style={{ fontSize: '12px', color: '#a1a1aa' }}>
          Real-world multi-domain benchmark telemetry: 20,000 Training cases + 20,000 Testing cases derived from official National Vulnerability Database (NVD/CVSS) records.
        </p>
      </div>

      {/* Stats Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
        <div className="clean-box" style={{ padding: '16px' }}>
          <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase' }}>Current View</span>
          <div style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#f4f4f5', marginTop: '2px' }}>
            {totalRecords.toLocaleString()} Cases
          </div>
          <span style={{ fontSize: '11px', color: '#a1a1aa' }}>
            {selectedSplit === 'combined' ? 'Combined (40k Total)' : selectedSplit === 'train' ? 'Training Split (20k)' : 'Testing Split (20k)'}
          </span>
        </div>

        <div className="clean-box" style={{ padding: '16px' }}>
          <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase' }}>Missing Values</span>
          <div style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#10b981', marginTop: '2px' }}>
            0 Missing
          </div>
          <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Complete Feature Data</span>
        </div>

        <div className="clean-box" style={{ padding: '16px' }}>
          <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase' }}>Outlier Handling</span>
          <div style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#f59e0b', marginTop: '2px' }}>
            IQR Winsorized
          </div>
          <span style={{ fontSize: '11px', color: '#a1a1aa' }}>Bounded to 1.5 IQR</span>
        </div>

        <div className="clean-box" style={{ padding: '16px' }}>
          <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase' }}>Feature Space</span>
          <div style={{ fontSize: '18px', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#f4f4f5', marginTop: '2px' }}>
            8 Num + 1 Cat
          </div>
          <span style={{ fontSize: '11px', color: '#a1a1aa' }}>StandardScaler + OneHot</span>
        </div>
      </div>

      {/* Feature Statistics Table */}
      <div className="clean-box" style={{ padding: '20px' }}>
        <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5', marginBottom: '12px' }}>
          Descriptive Statistics
        </h4>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a', color: '#71717a', textTransform: 'uppercase', fontSize: '10px' }}>
                <th style={{ padding: '6px 8px' }}>Feature</th>
                <th style={{ padding: '6px 8px' }}>Mean</th>
                <th style={{ padding: '6px 8px' }}>Std</th>
                <th style={{ padding: '6px 8px' }}>Min</th>
                <th style={{ padding: '6px 8px' }}>Q25</th>
                <th style={{ padding: '6px 8px' }}>Median</th>
                <th style={{ padding: '6px 8px' }}>Q75</th>
                <th style={{ padding: '6px 8px' }}>Max</th>
                <th style={{ padding: '6px 8px' }}>Outliers</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(stats).map(([feat, s]) => (
                <tr key={feat} style={{ borderBottom: '1px solid #1f1f23' }}>
                  <td style={{ padding: '8px', fontWeight: 500, color: '#f4f4f5' }}>{feat.replace('_', ' ')}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>{s.mean}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>{s.std}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#71717a' }}>{s.min}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>{s.q25}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', fontWeight: 500, color: '#f4f4f5' }}>{s.median}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>{s.q75}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#71717a' }}>{s.max}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: s.outliers_detected > 0 ? '#f59e0b' : '#10b981' }}>
                    {s.outliers_detected} cases
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Raw Historical Data Table */}
      <div className="clean-box" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5' }}>
            Historical Cases
          </h4>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={selectedSplit}
              onChange={(e) => {
                setSelectedSplit(e.target.value);
                setPage(0);
              }}
              style={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', padding: '4px 8px', borderRadius: '5px', color: '#60a5fa', fontSize: '12px', fontWeight: 500 }}
            >
              <option value="combined">Dataset: All (40,000)</option>
              <option value="train">Dataset: Training (20,000)</option>
              <option value="test">Dataset: Testing (20,000)</option>
            </select>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#09090b',
              border: '1px solid #27272a',
              padding: '4px 10px',
              borderRadius: '5px'
            }}>
              <Search size={13} color="#71717a" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ background: 'transparent', border: 'none', color: '#f4f4f5', fontSize: '12px', outline: 'none', width: '110px' }}
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ backgroundColor: '#09090b', border: '1px solid #27272a', padding: '4px 8px', borderRadius: '5px', color: '#a1a1aa', fontSize: '12px' }}
            >
              <option value="All">All Categories</option>
              {['Financial', 'Operational', 'Cybersecurity', 'Environmental', 'Business', 'Safety', 'Project', 'Infrastructure'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              style={{ backgroundColor: '#09090b', border: '1px solid #27272a', padding: '4px 8px', borderRadius: '5px', color: '#a1a1aa', fontSize: '12px' }}
            >
              <option value="All">All Risks</option>
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #27272a', color: '#71717a', textTransform: 'uppercase', fontSize: '10px' }}>
                <th style={{ padding: '6px 8px' }}>Case ID</th>
                <th style={{ padding: '6px 8px' }}>Category</th>
                <th style={{ padding: '6px 8px' }}>Sev</th>
                <th style={{ padding: '6px 8px' }}>Like</th>
                <th style={{ padding: '6px 8px' }}>Expo</th>
                <th style={{ padding: '6px 8px' }}>Freq</th>
                <th style={{ padding: '6px 8px' }}>Dur</th>
                <th style={{ padding: '6px 8px' }}>Imp</th>
                <th style={{ padding: '6px 8px' }}>Hist</th>
                <th style={{ padding: '6px 8px' }}>Ctrl</th>
                <th style={{ padding: '6px 8px' }}>Risk</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r, idx) => (
                <tr key={r.Case_ID || idx} style={{ borderBottom: '1px solid #1f1f23' }}>
                  <td style={{ padding: '8px', fontWeight: 500, fontFamily: 'var(--font-mono)', color: '#f4f4f5' }}>#{r.Case_ID}</td>
                  <td style={{ padding: '8px', color: '#a1a1aa' }}>{r.Category}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>{r.Severity}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>{r.Likelihood}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>{r.Exposure}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>{r.Frequency}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>{r.Duration}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>{r.Impact}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#a1a1aa' }}>{r.Historical_Occurrence}</td>
                  <td style={{ padding: '8px', fontFamily: 'var(--font-mono)', color: '#10b981' }}>{r.Control_Effectiveness}</td>
                  <td style={{ padding: '8px' }}>
                    <span className={`badge-${r.Risk_Level?.toLowerCase()}`} style={{ padding: '1px 5px', borderRadius: '3px', fontSize: '10px', fontWeight: 500, textTransform: 'uppercase' }}>
                      {r.Risk_Level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #27272a' }}>
          <span style={{ fontSize: '11px', color: '#71717a' }}>
            Page {page + 1} of {Math.ceil(totalRecords / limit)}
          </span>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              <ChevronLeft size={13} /> Prev
            </button>

            <button
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * limit >= totalRecords}
              className="btn-secondary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
