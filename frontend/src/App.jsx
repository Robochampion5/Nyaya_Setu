import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SingleCaseScrutiny from './components/SingleCaseScrutiny';
import BatchScreening from './components/BatchScreening';
import StatutoryGuide from './components/StatutoryGuide';
import AnalyticsOverview from './components/AnalyticsOverview';
import { checkBackendHealth, fetchReferenceData } from './services/api';
import { Scale, ShieldCheck, Landmark } from 'lucide-react';

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
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col font-sans subtle-grid relative selection:bg-amber-500 selection:text-slate-950">
      
      {/* Subtle Ambient Radial Glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-10 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Header & Workflow Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendStatus={backendStatus}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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

      {/* GovTech Official DLSA Portal Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/90 py-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 text-slate-400">
            <Scale className="w-4 h-4 text-amber-500" />
            <span className="font-serif font-semibold text-slate-300">Nyaya Setu • न्याय सेतु</span>
            <span>—</span>
            <span>District Legal Services Authority (DLSA) ADR Screening Portal</span>
          </div>

          <div className="flex items-center space-x-4 text-[11px] text-slate-400">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Section 89 CPC & Mediation Act 2023 Compliant</span>
            </span>
            <span>•</span>
            <span>Explainable TreeSHAP ML</span>
          </div>
        </div>
      </footer>
    </div>
  );
}


