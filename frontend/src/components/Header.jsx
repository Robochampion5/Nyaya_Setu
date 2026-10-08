import React from 'react';
import { Scale, UploadCloud, BookOpen, BarChart3, Sparkles } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, backendStatus }) {
  const isOnline = backendStatus?.status === 'healthy';

  const NAV_ITEMS = [
    { id: 'scrutiny', label: 'Single Case Scrutiny', icon: Scale },
    { id: 'batch', label: 'Cause List Batch Upload', icon: UploadCloud },
    { id: 'statutory', label: 'Statutory Schedule & Rules', icon: BookOpen },
    { id: 'analytics', label: 'Performance Analytics', icon: BarChart3 },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Brand & Actions Bar */}
        <div className="flex items-center justify-between py-3.5 border-b border-slate-800/60">
          
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 border border-amber-300/40 shrink-0">
              <Scale className="w-5 h-5 text-slate-950 stroke-[2.4]" />
            </div>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-bold font-serif text-white tracking-tight">
                Nyaya Setu <span className="text-amber-400 font-sans text-sm font-normal">| न्याय सेतु</span>
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                DLSA Screening
              </span>
            </div>
          </div>

          {/* Quick Actions & Status */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px]">
              <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-500'}`} />
              <span className="text-slate-300 font-medium">{isOnline ? 'ML Engine Online' : 'Offline'}</span>
            </div>

            <button
              onClick={() => setActiveTab('batch')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                activeTab === 'batch'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
              <span>Upload CSV</span>
            </button>
          </div>

        </div>

        {/* Minimalist Tabs Bar */}
        <div className="flex space-x-1 py-2 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

      </div>
    </header>
  );
}



