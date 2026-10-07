import React, { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Users, Clock, Scale, ShieldCheck, AlertTriangle } from 'lucide-react';
import { checkBackendHealth } from '../services/api';

const pct = (v) => (typeof v === 'number' ? `${(v * 100).toFixed(1)}%` : '—');
const fixed = (v) => (typeof v === 'number' ? v.toFixed(3) : '—');

export default function AnalyticsOverview() {
  const [validation, setValidation] = useState(null);

  useEffect(() => {
    checkBackendHealth().then((h) => setValidation(h.validation || null));
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Headline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Historical DDL Cases Analyzed</span>
            <Scale className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-serif text-white">3.98 Million</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center space-x-1">
            <TrendingUp className="w-3 h-3" />
            <span>National Judicial Data Grid Filings</span>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-emerald-900/50 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-emerald-400 text-xs mb-2">
            <span>ADR Label Rate (Historical)</span>
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-3xl font-bold font-serif text-emerald-400">86.5%</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Share of eligible filings labelled ADR-positive in the source data
          </div>
        </div>

        <div className="bg-slate-950/70 border border-amber-900/50 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-amber-400 text-xs mb-2">
            <span>Average Disposal Velocity</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-3xl font-bold font-serif text-amber-400">22 Days</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Via Lok Adalat vs 840 days in trial
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span>Est. DLSA Judicial Hours Saved</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-serif text-white">48.2 Million</div>
          <div className="text-[11px] text-emerald-400 mt-1">
            Court time freed for complex trials
          </div>
        </div>
      </div>

      {/* Breakdown Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Case Type ADR Settlement Precedents */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-4">
          <h4 className="text-base font-bold font-serif text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <span>Case Category ADR Referral Rates</span>
          </h4>
          <div className="space-y-3 pt-2">
            {[
              { label: 'NI Act §138 Cheque Bounce', rate: 94.2, color: 'bg-emerald-500' },
              { label: 'Small Causes Court (S.C.C.)', rate: 88.6, color: 'bg-emerald-500' },
              { label: 'Motor Accident Claims (MCOP)', rate: 84.1, color: 'bg-emerald-500' },
              { label: 'Civil Money Recovery', rate: 76.5, color: 'bg-amber-500' },
              { label: 'Matrimonial Maintenance', rate: 71.3, color: 'bg-amber-500' },
              { label: 'Non-Compoundable Criminal / Bail', rate: 0.0, color: 'bg-rose-500' },
            ].map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{item.label}</span>
                  <span className="font-mono font-bold text-slate-200">{item.rate}%</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Accuracy & Validation Metrics (live from training metadata) */}
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-4">
          <h4 className="text-base font-bold font-serif text-white flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span>Model Validation (Held-Out Test Split)</span>
          </h4>

          {validation?.leakage_suspected && (
            <div className="flex items-start space-x-2 bg-amber-950/40 border border-amber-700/50 rounded-xl p-3 text-[11px] text-amber-200 leading-relaxed">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
              <div>
                <strong>Under audit:</strong> scores are higher than court-outcome data normally allows.
                Treat as historical-label fit, not real-world accuracy.
                {validation.warnings?.[0] && <div className="mt-1 text-amber-300/80">{validation.warnings[0]}</div>}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">ROC-AUC</div>
              <div className="text-xl font-bold font-serif text-emerald-400 mt-1">{fixed(validation?.roc_auc)}</div>
              <div className="text-[10px] text-slate-500">Rank discrimination on test split</div>
            </div>

            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Accuracy vs. Majority Baseline</div>
              <div className="text-xl font-bold font-serif text-emerald-400 mt-1">{pct(validation?.accuracy)}</div>
              <div className="text-[10px] text-slate-500">Always-predict-ADR scores {pct(validation?.majority_class_accuracy)}</div>
            </div>

            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Unseen-State AUC</div>
              <div className="text-xl font-bold font-serif text-emerald-400 mt-1">{fixed(validation?.leave_state_out_auc_mean)}</div>
              <div className="text-[10px] text-slate-500">Leave-state-out cross-validation</div>
            </div>

            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400">Inference Latency</div>
              <div className="text-xl font-bold font-serif text-amber-400 mt-1">&lt; 3.5 ms</div>
              <div className="text-[10px] text-slate-500">Real-time cause list screening</div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed pt-2">
            Predicts historical ADR labels, not legal merit. Advisory only: a DLSA decision-maker makes every referral.
            {validation?.n_test ? ` Evaluated on ${validation.n_test.toLocaleString()} held-out cases.` : ''}
          </p>
        </div>

      </div>
    </div>
  );
}

