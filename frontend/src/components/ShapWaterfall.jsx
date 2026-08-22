import React from 'react';
import { TrendingUp, TrendingDown, Info, ShieldAlert } from 'lucide-react';

export default function ShapWaterfall({ shapFactors = [], topReasons = [], isStatutoryEligible = true }) {
  if (!isStatutoryEligible) {
    return (
      <div className="bg-rose-950/20 border border-rose-900/50 rounded-xl p-5">
        <div className="flex items-center space-x-2 text-rose-400 font-semibold mb-3">
          <ShieldAlert className="w-5 h-5" />
          <span>Statutory Override Active (First Schedule, Mediation Act 2023)</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed mb-4">
          Machine learning inference was bypassed. By statute, this matter cannot be referred for conciliation or court-annexed mediation.
        </p>
        <div className="space-y-2">
          {topReasons.map((reason, idx) => (
            <div key={idx} className="flex items-start space-x-2 text-xs text-rose-300 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/30">
              <span className="font-bold">•</span>
              <span>{reason}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Plain English Reasons */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
            <Info className="w-4 h-4 text-amber-400" />
            <span>Key Judicial Decision Drivers (Plain English)</span>
          </h4>
          <span className="text-[11px] text-slate-400 font-mono">TreeSHAP Attributions</span>
        </div>
        <div className="space-y-2.5">
          {topReasons.map((reason, idx) => (
            <div
              key={idx}
              className="flex items-start space-x-3 bg-slate-900/80 border border-slate-800/80 p-3 rounded-xl hover:border-slate-700 transition"
            >
              <div className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {reason}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Visual SHAP Feature Impact Waterfall */}
      {shapFactors && shapFactors.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Feature Attribution Breakdown
          </h4>
          <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            {shapFactors.slice(0, 5).map((factor, idx) => {
              const isPositive = factor.direction === 'positive';
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5 font-medium text-slate-300">
                      {isPositive ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span>{factor.display_name}</span>
                    </div>
                    <span className={`font-mono font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}{factor.impact_percent}% impact
                    </span>
                  </div>

                  {/* Visual Impact Bar */}
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPositive ? 'bg-gradient-to-r from-emerald-600 to-emerald-400' : 'bg-gradient-to-r from-rose-600 to-rose-400'
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
    </div>
  );
}

