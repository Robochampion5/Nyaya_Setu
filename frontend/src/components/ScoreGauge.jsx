import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function ScoreGauge({ score = 0, recommendation = 'Trial', isStatutoryEligible = true }) {
  const isSuitable = isStatutoryEligible && score >= 50;

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-4">
      {/* Single-line ADR suitability status node */}
      <div
        className={`flex items-center gap-3 px-5 py-3 rounded-2xl border-2 shadow-lg transition-all duration-500 ${
          isSuitable
            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-emerald-900/30'
            : 'bg-rose-500/10 border-rose-500/50 shadow-rose-900/30'
        }`}
      >
        {isSuitable ? (
          <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
        ) : (
          <XCircle className="w-7 h-7 text-rose-400 shrink-0" />
        )}
        <div className="text-left">
          <div className={`text-base font-extrabold font-serif leading-tight ${isSuitable ? 'text-emerald-300' : 'text-rose-300'}`}>
            {isSuitable ? 'ADR Suitable' : 'Not ADR Suitable'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {isStatutoryEligible ? 'Statutory: Eligible' : 'Statutory: Barred'}
          </div>
        </div>
      </div>

      {/* Recommendation pill */}
      <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-700">
        <span className={`w-2 h-2 rounded-full shrink-0 ${isSuitable ? 'bg-emerald-400' : 'bg-rose-400'}`} />
        <span className={`text-sm font-bold font-serif ${isSuitable ? 'text-emerald-300' : 'text-rose-300'}`}>
          {recommendation}
        </span>
      </div>
    </div>
  );
}
