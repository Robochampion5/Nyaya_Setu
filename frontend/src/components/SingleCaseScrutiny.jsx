import React, { useState, useEffect } from 'react';
import { Scale, Sparkles, AlertTriangle, CheckCircle2, ShieldAlert, Clock, RefreshCw, Send } from 'lucide-react';
import ScoreGauge from './ScoreGauge';
import ShapWaterfall from './ShapWaterfall';
import { scoreSingleCase } from '../services/api';
import { CASE_PRESETS } from '../data/presets';

export default function SingleCaseScrutiny({ referenceData }) {
  const [formData, setFormData] = useState(CASE_PRESETS[0].data);
  const [activePreset, setActivePreset] = useState(CASE_PRESETS[0].id);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-run scoring on initial load or preset change
  useEffect(() => {
    handleScoreCase(formData);
  }, []);

  const handlePresetSelect = (preset) => {
    setActivePreset(preset.id);
    setFormData(preset.data);
    handleScoreCase(preset.data);
  };

  const handleInputChange = (field, value) => {
    setActivePreset(null);
    const updated = { ...formData, [field]: value };
    setFormData(updated);
  };

  const handleScoreCase = async (dataToScore = formData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await scoreSingleCase(dataToScore);
      setResult(response);
    } catch (err) {
      console.error('Case scoring error:', err);
      setError(err.message || 'Failed to score case. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Preset Quick-Selector Pills */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>District Court Filing Presets (Instant Benchmark Cases)</span>
          </label>
          <span className="text-xs text-slate-400">Click to evaluate benchmark cases</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {CASE_PRESETS.map((preset) => {
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={`text-left p-3 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/5'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-200 mb-1 leading-tight">
                    {preset.title}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>
                <div className="mt-2.5">
                  <span
                    className={`inline-block text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      preset.badgeColor === 'emerald'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : preset.badgeColor === 'amber'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {preset.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Scrutiny Form & Analysis Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Case Parameters Form (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="text-base font-bold font-serif text-slate-100 flex items-center space-x-2">
              <Scale className="w-5 h-5 text-amber-400" />
              <span>Case Scrutiny Parameters</span>
            </h3>
            <button
              onClick={() => handleScoreCase(formData)}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Evaluating...' : 'Re-Evaluate'}</span>
            </button>
          </div>

          <div className="space-y-4 text-xs">
            {/* Case Identifier */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Case Number / CNR</label>
              <input
                type="text"
                value={formData.case_id || ''}
                onChange={(e) => handleInputChange('case_id', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500 font-mono text-xs"
              />
            </div>

            {/* Jurisdiction Row */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">State Code</label>
                <input
                  type="number"
                  value={formData.state_code}
                  onChange={(e) => handleInputChange('state_code', parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Dist Code</label>
                <input
                  type="number"
                  value={formData.dist_code}
                  onChange={(e) => handleInputChange('dist_code', parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Court No</label>
                <input
                  type="number"
                  value={formData.court_no}
                  onChange={(e) => handleInputChange('court_no', parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Case Type & Hearing Purpose */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">Case Category / Type</label>
              <select
                value={formData.type_name_val || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const isExcluded = val.includes('bail') || val.includes('cbi') || val.includes('murder');
                  setFormData({
                    ...formData,
                    type_name_val: val,
                    statutory_eligible: isExcluded ? 0 : 1,
                  });
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="ni act (cheque bounce)">NI Act §138 (Cheque Bounce)</option>
                <option value="s.c.c.">Small Causes Court Suit (S.C.C.)</option>
                <option value="mcop">Motor Accident Claim (MCOP)</option>
                <option value="civil suit">Civil Suit (Property / Money)</option>
                <option value="matrimonial maintenance">Matrimonial Maintenance</option>
                <option value="cri. case">Criminal Case (Compoundable)</option>
                <option value="bail appln cbi">Bail Application (CBI / Serious) [EXCLUDED]</option>
                <option value="murder u/s 302 ipc">IPC §302 Murder (Non-Compoundable) [EXCLUDED]</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Current Hearing Stage / Purpose</label>
              <select
                value={formData.purpose_name_val || ''}
                onChange={(e) => handleInputChange('purpose_name_val', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="appearance">Appearance of Parties</option>
                <option value="summons">Summons / Notice Service</option>
                <option value="depositing amount">Depositing Amount / Settlement</option>
                <option value="lok-nyayalaya">Lok Nyayalaya / Pre-Conciliation</option>
                <option value="hearing">Preliminary Hearing</option>
                <option value="evidence">Evidence Stage</option>
                <option value="arguments">Final Arguments</option>
              </select>
            </div>

            {/* Pendency Timeline */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Case Age (Days)</label>
                <input
                  type="number"
                  value={formData.case_age_days}
                  onChange={(e) => handleInputChange('case_age_days', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">First Listing Delay (Days)</label>
                <input
                  type="number"
                  value={formData.first_listing_delay}
                  onChange={(e) => handleInputChange('first_listing_delay', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Statutory Flag & Legal Representation */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-medium">Statutory Eligibility Override</span>
                <button
                  type="button"
                  onClick={() => handleInputChange('statutory_eligible', formData.statutory_eligible === 1 ? 0 : 1)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    formData.statutory_eligible === 1
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {formData.statutory_eligible === 1 ? 'Eligible (Sec 89 CPC)' : 'Excluded (Mediation Act)'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center space-x-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_female_adv_pet === 1}
                    onChange={(e) => handleInputChange('has_female_adv_pet', e.target.checked ? 1 : 0)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-slate-300">Petitioner Counsel</span>
                </label>
                <label className="flex items-center space-x-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.has_female_adv_def === 1}
                    onChange={(e) => handleInputChange('has_female_adv_def', e.target.checked ? 1 : 0)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-[11px] text-slate-300">Defendant Counsel</span>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Real-Time ADR Scrutiny & Explainability (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-6">
              
              {/* Header Status Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs font-mono text-slate-400 block mb-0.5">Scrutiny File:</span>
                  <h3 className="text-lg font-bold font-serif text-white">{result.case_id}</h3>
                </div>

                <div className="flex items-center space-x-3">
                  {/* Statutory Badge */}
                  <span
                    className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                      result.is_statutory_eligible
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {result.is_statutory_eligible ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    )}
                    <span>{result.statutory_status}</span>
                  </span>

                  {/* Confidence Tier */}
                  <span className="text-xs px-2.5 py-1 rounded-md bg-slate-900 text-slate-300 border border-slate-800">
                    Tier: <strong className="text-amber-400">{result.confidence_tier}</strong>
                  </span>
                </div>
              </div>

              {/* Gauge & Main Verdict Card */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                <div className="md:col-span-5">
                  <ScoreGauge
                    score={result.suitability_score}
                    recommendation={result.recommendation}
                    isStatutoryEligible={result.is_statutory_eligible}
                  />
                </div>

                <div className="md:col-span-7 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Scrutiny Committee Action
                  </h4>
                  <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="text-sm font-serif font-bold text-slate-100">
                      {result.recommendation === 'Lok Adalat' && 'Forward to National Lok Adalat Bench'}
                      {result.recommendation === 'Mediation' && 'Refer to Court-Annexed Mediation Centre'}
                      {result.recommendation === 'Trial' && 'Retain in Regular Trial Court Registry'}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {result.recommendation === 'Lok Adalat' && 'High probability of amicable settlement on record. Issue notice to both parties for pre-Lok Adalat sittings.'}
                      {result.recommendation === 'Mediation' && 'Dispute involves commercial/relational elements suitable for trained mediator intervention under Section 89 CPC.'}
                      {result.recommendation === 'Trial' && 'Not recommended for ADR. Proceed with framing of issues and judicial trial on merits.'}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                    <span>Latency: {result.execution_time_ms} ms</span>
                    <span>Evaluation Rule: Section 89 CPC + TreeSHAP</span>
                  </div>
                </div>
              </div>

              {/* TreeSHAP Plain English Explanations */}
              <div className="border-t border-slate-800/80 pt-6">
                <ShapWaterfall
                  shapFactors={result.shap_factors}
                  topReasons={result.top_reasons}
                  isStatutoryEligible={result.is_statutory_eligible}
                />
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}

