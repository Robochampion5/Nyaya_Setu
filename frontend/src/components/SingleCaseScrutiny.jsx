import React, { useState, useEffect } from 'react';
import { Scale, Sparkles, AlertTriangle, CheckCircle2, ShieldAlert, Clock, RefreshCw, Send, FileText, Printer, X, Compass, Activity } from 'lucide-react';
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
  const [showOrderModal, setShowOrderModal] = useState(false);

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

              {/* Dispute Lifecycle & Procedural Timeline Tracking */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center space-x-1.5 font-semibold text-slate-200">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dispute Procedural Lifecycle & Tracking</span>
                  </span>
                  <span className="font-mono text-[11px] text-amber-400">Total Age: {formData.case_age_days} days</span>
                </div>
                <div className="grid grid-cols-4 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                    <div className="text-slate-400">1. Case Filing</div>
                    <div className="font-medium text-emerald-400 mt-0.5">NJDG Registered</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px]">
                    <div className="text-slate-400">2. First Listing</div>
                    <div className="font-medium text-slate-200 mt-0.5">+{formData.first_listing_delay}d delay</div>
                  </div>
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/40 text-[11px]">
                    <div className="text-amber-300 font-bold">3. Current Stage</div>
                    <div className="font-medium text-amber-200 capitalize mt-0.5">{formData.purpose_name_val || 'Hearing'}</div>
                  </div>
                  <div className={`p-2 rounded-lg border text-[11px] ${
                    result.recommendation === 'Trial'
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  }`}>
                    <div className="text-slate-400">4. Target Route</div>
                    <div className="font-bold mt-0.5">{result.recommendation}</div>
                  </div>
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
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Scrutiny Committee Action
                    </h4>
                    <button
                      onClick={() => setShowOrderModal(true)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold transition"
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span>Draft DLSA Order Sheet</span>
                    </button>
                  </div>
                  
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

      {/* DLSA Section 89 Referral Order Sheet Modal */}
      {showOrderModal && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-amber-400 font-serif font-bold">
                <Scale className="w-5 h-5" />
                <span>DLSA Statutory Referral Order Sheet (Sec 89 CPC)</span>
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Order Sheet Style Container */}
            <div className="bg-white text-slate-900 p-6 rounded-xl space-y-4 font-serif text-xs border border-slate-300 shadow-inner">
              <div className="text-center space-y-1 border-b pb-3 border-slate-300">
                <div className="font-bold text-sm uppercase tracking-wider">In the Court of the Principal District Judge / DLSA</div>
                <div className="text-[11px] text-slate-600">Case Scrutiny & ADR Screening Committee</div>
                <div className="text-[11px] font-mono font-bold text-slate-800">CNR: {result.case_id}</div>
              </div>

              <div className="space-y-1">
                <div><strong>Matter:</strong> <span className="capitalize">{formData.type_name_val || 'Civil Proceeding'}</span></div>
                <div><strong>Pendency Duration:</strong> {formData.case_age_days} Days (Current Stage: {formData.purpose_name_val || 'Appearance'})</div>
                <div><strong>Statutory Classification:</strong> {result.statutory_status} (Mediation Act 2023 / Sec 89 CPC)</div>
                <div><strong>Nyaya Setu Suitability Rating:</strong> {result.suitability_percentage}% ({result.recommendation})</div>
              </div>

              <div className="p-3 bg-slate-100 rounded border border-slate-200 space-y-1">
                <div className="font-bold text-[11px]">Primary Judicial & Empirical Findings:</div>
                <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                  {result.top_reasons.slice(0, 3).map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 pt-2">
                <div className="font-bold underline">ORDER OF THE COMMITTEE:</div>
                <p className="leading-relaxed text-slate-800">
                  {result.recommendation === 'Lok Adalat' && 'Having considered the nature of claim and amicable settlement precedent under Section 89 CPC, this matter is hereby referred to the upcoming NATIONAL LOK ADALAT BENCH. Registry is directed to issue notice to petitioner and defendant advocates for pre-conciliation sittings.'}
                  {result.recommendation === 'Mediation' && 'The dispute exhibits commercial/relational elements amenable to consensual resolution. Matter referred to the DISTRICT MEDIATION CENTRE for appointment of a trained mediator under the Mediation Act 2023. Parties to appear on the scheduled date.'}
                  {result.recommendation === 'Trial' && 'Matter is not suited for summary conciliation. It is directed that the suit be retained on regular court board for trial and framing of issues.'}
                </p>
              </div>

              <div className="pt-6 flex justify-between items-end text-slate-700 text-[11px]">
                <div>Date: {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div className="text-right">
                  <div className="border-t border-slate-500 w-44 pt-1 font-bold">Secretary, DLSA / Judicial Officer</div>
                  <div className="text-[10px] text-slate-500">Case Scrutiny Committee</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => window.print()}
                className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save Order PDF</span>
              </button>
              <button
                onClick={() => setShowOrderModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


