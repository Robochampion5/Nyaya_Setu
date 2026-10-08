import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function ShapWaterfall({ shapFactors = [], topReasons = [], isStatutoryEligible = true }) {
  if (!isStatutoryEligible) {
    return (
      <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-3 text-xs space-y-2">
        <div className="flex items-center space-x-2 text-rose-400 font-bold">
          <ShieldAlert className="w-4 h-4" />
          <span>Statutory Bar Active (First Schedule, Mediation Act 2023)</span>
        </div>
        <div className="space-y-1 text-rose-300">
          {topReasons.map((reason, idx) => (
            <div key={idx} className="bg-rose-950/40 p-2 rounded border border-rose-900/30">
              • {reason}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 1. Attribution Impact (SHAP) — always on top */}
      {shapFactors && shapFactors.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Attribution Impact (SHAP)
          </div>
          <div className="space-y-2 bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            {shapFactors.slice(0, 4).map((factor, idx) => {
              const isPositive = factor.direction === 'positive';
              return (
                <div key={idx} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300">{factor.display_name}</span>
                    <span className={`font-mono font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}{factor.impact_percent}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPositive ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, factor.impact_percent))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Judicial Decision Drivers — below SHAP */}
      {topReasons && topReasons.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Judicial Decision Drivers
          </div>
          <div className="space-y-1.5">
            {topReasons.map((reason, idx) => (
              <div
                key={idx}
                className="flex items-start space-x-2 bg-slate-900/80 border border-slate-800 p-2 rounded-lg text-xs text-slate-300"
              >
                <span className="text-amber-400 font-bold shrink-0">{idx + 1}.</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
