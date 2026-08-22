import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SingleCaseScrutiny from './components/SingleCaseScrutiny';
import BatchScreening from './components/BatchScreening';
import StatutoryGuide from './components/StatutoryGuide';
import AnalyticsOverview from './components/AnalyticsOverview';
import { checkBackendHealth, fetchReferenceData } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('scrutiny');
  const [backendStatus, setBackendStatus] = useState(null);
  const [referenceData, setReferenceData] = useState(null);

  // Poll backend health and fetch reference metadata
  useEffect(() => {
    const initApp = async () => {
      const status = await checkBackendHealth();
      setBackendStatus(status);

      const refData = await fetchReferenceData();
      if (refData) setReferenceData(refData);
    };

    initApp();
    const interval = setInterval(async () => {
      const status = await checkBackendHealth();
      setBackendStatus(status);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendStatus={backendStatus}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'scrutiny' && (
          <SingleCaseScrutiny referenceData={referenceData} />
        )}
        {activeTab === 'batch' && (
          <BatchScreening />
        )}
        {activeTab === 'statutory' && (
          <StatutoryGuide />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsOverview />
        )}
      </main>

      {/* GovTech Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Nyaya Setu • AI-Powered ADR Suitability Screening System (GovTech Track)
          </span>
          <span>
            Section 89 CPC & Mediation Act 2023 Compliant • DLSA Scrutiny Portal
          </span>
        </div>
      </footer>
    </div>
  );
}

