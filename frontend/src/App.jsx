import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RiskAssessment from './pages/RiskAssessment';
import AssessmentResult from './pages/AssessmentResult';
import WhatIfAnalysis from './pages/WhatIfAnalysis';
import ModelAnalysis from './pages/ModelAnalysis';
import DatasetExplorer from './pages/DatasetExplorer';
import History from './pages/History';
import { api } from './api';
import { Shield } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('risk_dss_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [config, setConfig] = useState(null);
  const [summary, setSummary] = useState(null);
  const [modelDetails, setModelDetails] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Assessment Result state
  const [currentResult, setCurrentResult] = useState(null);
  const [whatIfCase, setWhatIfCase] = useState(null);
  const [prefilledFormCase, setPrefilledFormCase] = useState(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [cfg, summ, mDetails] = await Promise.all([
        api.getConfig(),
        api.getSummary(),
        api.getModelDetails(),
      ]);
      setConfig(cfg);
      setSummary(summ);
      setModelDetails(mDetails);
      setIsConnected(true);
    } catch (err) {
      console.warn('Backend connecting...', err);
      setIsConnected(false);
      setTimeout(loadInitialData, 3000);
    }
  };

  const handleAssessmentComplete = (result, inputData) => {
    setCurrentResult(result);
    setWhatIfCase(inputData);
    setActiveTab('result');
  };

  const handleStartWhatIf = (caseInputs) => {
    setWhatIfCase(caseInputs);
    setActiveTab('what-if');
  };

  const handleSelectCaseForAssessment = (caseInputs) => {
    setPrefilledFormCase(caseInputs);
    setActiveTab('assess');
  };

  const handleRetrainSuccess = (newSummary) => {
    if (newSummary) setSummary(newSummary);
  };

  const handleLogout = () => {
    localStorage.removeItem('risk_dss_user');
    setCurrentUser(null);
  };

  // Show Login screen if not signed in
  if (!currentUser) {
    return <Login onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#09090b', color: '#f4f4f5' }}>
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab === 'result' ? 'assess' : activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
        }}
        systemSummary={summary}
        isConnected={isConnected}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Content Viewport */}
      <main style={{ flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '24px 20px' }}>
        {activeTab === 'dashboard' && (
          <Dashboard
            systemSummary={summary}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'assess' && (
          <RiskAssessment
            config={config}
            bestModel={summary?.best_model}
            onAssessmentComplete={handleAssessmentComplete}
          />
        )}

        {activeTab === 'result' && (
          <AssessmentResult
            result={currentResult}
            onStartWhatIf={handleStartWhatIf}
            onNewAssessment={() => setActiveTab('assess')}
            onSaveToHistory={() => {}}
          />
        )}

        {activeTab === 'what-if' && (
          <WhatIfAnalysis
            initialCase={whatIfCase}
            config={config}
          />
        )}

        {activeTab === 'models' && (
          <ModelAnalysis
            modelDetails={modelDetails}
            onRetrainSuccess={handleRetrainSuccess}
          />
        )}

        {activeTab === 'dataset' && (
          <DatasetExplorer />
        )}

        {activeTab === 'history' && (
          <History
            onSelectCaseForWhatIf={handleStartWhatIf}
            onSelectCaseForAssessment={handleSelectCaseForAssessment}
          />
        )}
      </main>

      {/* Clean Footer */}
      <footer style={{
        backgroundColor: '#09090b',
        borderTop: '1px solid #1f1f23',
        padding: '14px 24px',
        marginTop: 'auto'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          fontSize: '11px',
          color: '#71717a'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={13} color="#71717a" />
            <span style={{ color: '#a1a1aa' }}>Risk Decision Support System</span>
            <span>&bull;</span>
            <span>Enterprise Risk Intelligence</span>
          </div>
          <div>
            Support Vector Machine &bull; K-Nearest Neighbors &bull; Decision Tree
          </div>
        </div>
      </footer>
    </div>
  );
}
