import React from 'react';
import { Scale, ShieldCheck, Activity, AlertCircle, BookOpen, Layers, BarChart3 } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, backendStatus }) {
  const isOnline = backendStatus?.status === 'healthy';

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/20 border border-amber-400/30">
              <Scale className="w-7 h-7 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold font-serif tracking-wide text-white">
                  Nyaya Setu <span className="text-amber-500 font-sans text-lg font-normal">| न्याय सेतु</span>
                </h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                  GovTech DLSA
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans">
                District Court ADR Suitability Screening System • Section 89 CPC & Mediation Act 2023
              </p>
            </div>
          </div>

          {/* Backend Status & Model Info */}
          <div className="hidden md:flex items-center space-x-3 bg-slate-900/90 px-3.5 py-1.5 rounded-lg border border-slate-800 text-xs">
            <div className="flex items-center space-x-2">
              <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              <span className="font-medium text-slate-300">
                {isOnline ? 'ML Service Connected' : 'Connecting to Backend...'}
              </span>
            </div>
            {isOnline && backendStatus?.model_name && (
              <span className="text-slate-400 border-l border-slate-800 pl-2">
                Model: <span className="text-amber-400 font-semibold">{backendStatus.model_name}</span>
              </span>
            )}
          </div>

        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-t border-slate-800/80 -mb-px">
          <button
            onClick={() => setActiveTab('scrutiny')}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-medium border-b-2 transition-all duration-200 ${
              activeTab === 'scrutiny'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Single Case Scrutiny</span>
          </button>

          <button
            onClick={() => setActiveTab('batch')}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-medium border-b-2 transition-all duration-200 ${
              activeTab === 'batch'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Batch Cause List Screening</span>
          </button>

          <button
            onClick={() => setActiveTab('statutory')}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-medium border-b-2 transition-all duration-200 ${
              activeTab === 'statutory'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Mediation Act 2023 Rules</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 py-3 px-4 text-sm font-medium border-b-2 transition-all duration-200 ${
              activeTab === 'analytics'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>DLSA Performance Analytics</span>
          </button>
        </div>

      </div>
    </header>
  );
}

