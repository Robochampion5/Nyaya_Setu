import React, { useState, useEffect } from 'react';
import { 
  Scale, AlertTriangle, CheckCircle2, ShieldAlert, Clock, 
  RefreshCw, FileText, Printer, X, Activity, Copy, Check, Sparkles
} from 'lucide-react';
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
  const [copiedOrder, setCopiedOrder] = useState(false);

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
      setError(err.message || 'Scoring failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyOrderText = () => {
    if (!result) return;
    const text = `DLSA SECTION 89 CPC REFERRAL ORDER\nCNR: ${result.case_id}\nMatter: ${formData.type_name_val}\nRecommendation: ${result.recommendation} (${result.suitability_percentage}%)\nStatutory Status: ${result.statutory_status}\nFindings:\n${result.top_reasons.map((r, i) => `${i + 1}. ${r}`).join('\n')}\nDate: ${new Date().toLocaleDateString('en-IN')}`;
    navigator.clipboard.writeText(text);
    setCopiedOrder(true);
    setTimeout(() => setCopiedOrder(false), 2000);
  };

  return (
    <div className="space-y-4">
      
      {/* Benchmark Presets Toolbar */}
      <div className="glass-card rounded-xl p-3 shadow-md flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5 overflow-x-auto py-0.5">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            Presets:
          </span>
          {CASE_PRESETS.map((preset) => {
            const isSelected = activePreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => handlePresetSelect(preset)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition whitespace-nowrap flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-800'
                }`}
              >
                <span>{preset.title.split('(')[0]}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                  isSelected 
                    ? 'bg-slate-950/30 text-slate-950' 
                    : preset.badgeColor === 'emerald' ? 'text-emerald-400' : preset.badgeColor === 'rose' ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  {preset.badgeColor === 'rose' ? 'Barred' : 'ADR'}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => handleScoreCase(formData)}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Evaluating...' : 'Re-Evaluate'}</span>
        </button>
      </div>

      {/* Main Form & Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Column: Form Parameters (5 Cols) */}
        <div className="lg:col-span-5 glass-card rounded-xl p-4 shadow-md space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span>Filing Parameters</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Sec 89 CPC</span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Case CNR & Court Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-4">
                <label className="block text-slate-400 text-[11px] mb-0.5">Case Number / CNR</label>
                <input
                  type="text"
                  value={formData.case_id || ''}
                  onChange={(e) => handleInputChange('case_id', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-slate-400 text-[10px] mb-0.5">State</label>
                <input
                  type="number"
                  value={formData.state_code}
                  onChange={(e) => handleInputChange('state_code', parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-slate-400 text-[10px] mb-0.5">District</label>
                <input
                  type="number"
                  value={formData.dist_code}
                  onChange={(e) => handleInputChange('dist_code', parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <label className="block text-slate-400 text-[10px] mb-0.5">Court No</label>
                <input
                  type="number"
                  value={formData.court_no}
                  onChange={(e) => handleInputChange('court_no', parseInt(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>

            {/* Matter Category & Hearing Stage */}
            <div>
              <label className="block text-slate-400 text-[11px] mb-0.5">Case Category</label>
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
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500 text-xs"
              >
                <option value="ni act (cheque bounce)">NI Act §138 (Cheque Bounce)</option>
                <option value="s.c.c.">Small Causes Court (S.C.C.)</option>
                <option value="mcop">Motor Accident Claim (MCOP / MACT)</option>
                <option value="civil suit">Civil Suit (Property / Money)</option>
                <option value="matrimonial maintenance">Matrimonial Maintenance</option>
                <option value="cri. case">Criminal Case (Compoundable)</option>
                <option value="bail appln cbi">Bail Application [EXCLUDED]</option>
                <option value="murder u/s 302 ipc">IPC §302 Murder [EXCLUDED]</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-0.5">Hearing Stage / Purpose</label>
              <select
                value={formData.purpose_name_val || ''}
                onChange={(e) => handleInputChange('purpose_name_val', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500 text-xs"
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
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-400 text-[10px] mb-0.5">Age (Days)</label>
                <input
                  type="number"
                  value={formData.case_age_days}
                  onChange={(e) => handleInputChange('case_age_days', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[10px] mb-0.5">Listing Delay (Days)</label>
                <input
                  type="number"
                  value={formData.first_listing_delay}
                  onChange={(e) => handleInputChange('first_listing_delay', parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>
            </div>

            {/* Statutory & Advocates */}
            <div className="pt-2 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">Statutory Status:</span>
                <button
                  type="button"
                  onClick={() => handleInputChange('statutory_eligible', formData.statutory_eligible === 1 ? 0 : 1)}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition ${
                    formData.statutory_eligible === 1
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {formData.statutory_eligible === 1 ? 'Eligible' : 'Barred by Statute'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <label className="flex items-center space-x-1.5 bg-slate-950 p-2 rounded-lg border border-slate-800 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={formData.has_female_adv_pet === 1}
                    onChange={(e) => handleInputChange('has_female_adv_pet', e.target.checked ? 1 : 0)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-slate-300">Petitioner Counsel</span>
                </label>
                <label className="flex items-center space-x-1.5 bg-slate-950 p-2 rounded-lg border border-slate-800 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={formData.has_female_adv_def === 1}
                    onChange={(e) => handleInputChange('has_female_adv_def', e.target.checked ? 1 : 0)}
                    className="rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-slate-300">Defendant Counsel</span>
                </label>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Scrutiny Verdict & SHAP (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="glass-card rounded-xl p-5 shadow-md space-y-4">
              
              {/* Top Verdict Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-bold text-white">{result.case_id}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    result.is_statutory_eligible
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                  }`}>
                    {result.statutory_status}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-400 font-mono">Tier: <strong className="text-amber-400">{result.confidence_tier}</strong></span>
                  <button
                    onClick={() => setShowOrderModal(true)}
                    className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>DLSA Order</span>
                  </button>
                </div>
              </div>

              {/* Lifecycle Pills */}
              <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">1. Filing</div>
                  <div className="text-emerald-400 font-medium mt-0.5">Registered</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">2. 1st Listing</div>
                  <div className="text-slate-300 font-medium mt-0.5">+{formData.first_listing_delay}d</div>
                </div>
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <div className="text-slate-500 text-[10px]">3. Stage</div>
                  <div className="text-amber-300 font-medium capitalize mt-0.5">{formData.purpose_name_val || 'Hearing'}</div>
                </div>
                <div className={`p-2 rounded-lg border font-bold ${
                  result.recommendation === 'Trial'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}>
                  <div className="text-slate-500 text-[10px]">4. Route</div>
                  <div className="mt-0.5">{result.recommendation}</div>
                </div>
              </div>

              {/* ADR Status Node & Verdict */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800/80">
                <div className="shrink-0">
                  <ScoreGauge
                    score={result.suitability_score}
                    recommendation={result.recommendation}
                    isStatutoryEligible={result.is_statutory_eligible}
                  />
                </div>

                <div className="space-y-2 text-xs flex-1">
                  <div className="text-slate-200 font-semibold text-sm">
                    {result.recommendation === 'Lok Adalat' && 'Refer to National Lok Adalat Bench'}
                    {result.recommendation === 'Mediation' && 'Refer to Court-Annexed Mediation Centre'}
                    {result.recommendation === 'Trial' && 'Retain on Regular Trial Court Board'}
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {result.recommendation === 'Lok Adalat' && 'High probability of settlement. Issue notice to counsel for pre-conciliation sittings.'}
                    {result.recommendation === 'Mediation' && 'Commercial/relational dispute suitable for mediator intervention under Mediation Act 2023.'}
                    {result.recommendation === 'Trial' && 'Inadmissible or contested claim. Proceed with issues & trial.'}
                  </p>
                  <div className="text-[10px] font-mono text-slate-500 pt-1">
                    Latency: {result.execution_time_ms} ms • Algorithm: TreeSHAP
                  </div>
                </div>
              </div>

              {/* SHAP Decision Drivers */}
              <div className="pt-2">
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

      {/* Referral Order Sheet Modal */}
      {showOrderModal && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center space-x-2 text-amber-400 font-serif font-bold text-sm">
                <Scale className="w-4 h-4" />
                <span>DLSA Section 89 Referral Order</span>
              </div>
              <button
                onClick={() => setShowOrderModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-white text-slate-900 p-5 rounded-xl space-y-3 font-serif text-xs border border-slate-300">
              <div className="text-center space-y-0.5 border-b pb-2 border-slate-300">
                <div className="font-bold text-sm uppercase">In the Court of DLSA / Principal District Judge</div>
                <div className="text-[11px] font-mono font-bold text-slate-800">CNR: {result.case_id}</div>
              </div>

              <div className="space-y-1 text-slate-800">
                <div><strong>Matter:</strong> <span className="capitalize">{formData.type_name_val}</span> | <strong>Age:</strong> {formData.case_age_days} Days</div>
                <div><strong>Classification:</strong> {result.statutory_status} | <strong>Rating:</strong> {result.suitability_percentage}% ({result.recommendation})</div>
              </div>

              <div className="p-2.5 bg-slate-100 rounded border border-slate-200 text-slate-700 space-y-0.5">
                <div className="font-bold text-[11px]">Findings:</div>
                <ul className="list-disc list-inside space-y-0.5">
                  {result.top_reasons.slice(0, 3).map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>

              <div className="pt-1">
                <div className="font-bold underline mb-1">ORDER:</div>
                <p className="text-slate-800">
                  {result.recommendation === 'Lok Adalat' && 'Referred to upcoming NATIONAL LOK ADALAT BENCH. Issue notice to counsel for pre-conciliation.'}
                  {result.recommendation === 'Mediation' && 'Referred to DISTRICT MEDIATION CENTRE for appointment of a mediator under Mediation Act 2023.'}
                  {result.recommendation === 'Trial' && 'Retained on regular court board for judicial trial on merits.'}
                </p>
              </div>

              <div className="pt-4 flex justify-between items-end text-slate-700 text-[11px]">
                <div>Date: {new Date().toLocaleDateString('en-IN')}</div>
                <div className="text-right border-t border-slate-500 pt-1 font-bold">Secretary, DLSA / Scrutiny Bench</div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <button
                onClick={handleCopyOrderText}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                {copiedOrder ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedOrder ? 'Copied' : 'Copy Text'}</span>
              </button>

              <div className="flex space-x-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF</span>
                </button>
                <button
                  onClick={() => setShowOrderModal(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}




