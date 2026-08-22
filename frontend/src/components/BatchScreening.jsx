import React, { useState } from 'react';
import { Layers, Upload, Download, Filter, Search, CheckCircle2, ShieldAlert, Clock, ArrowUpDown, Sparkles } from 'lucide-react';
import { scoreBatchCases, uploadCauseListCSV } from '../services/api';

// Realistic sample cause list batch
const SAMPLE_CAUSE_LIST = [
  { case_id: 'CNR-KA01-001001-2024', state_code: 3, dist_code: 1, court_no: 1, type_name_val: 'ni act (cheque bounce)', purpose_name_val: 'appearance', case_age_days: 210, first_listing_delay: 20, statutory_eligible: 1, female_petitioner_clean: 0, female_defendant_clean: 0, has_female_adv_pet: 1, has_female_adv_def: 1 },
  { case_id: 'CNR-KA01-001002-2024', state_code: 3, dist_code: 1, court_no: 1, type_name_val: 's.c.c.', purpose_name_val: 'summons', case_age_days: 90, first_listing_delay: 15, statutory_eligible: 1, female_petitioner_clean: 1, female_defendant_clean: 0, has_female_adv_pet: 1, has_female_adv_def: 0 },
  { case_id: 'CNR-MH02-002003-2023', state_code: 1, dist_code: 2, court_no: 2, type_name_val: 'mcop', purpose_name_val: 'depositing amount', case_age_days: 410, first_listing_delay: 40, statutory_eligible: 1, female_petitioner_clean: 1, female_defendant_clean: 0, has_female_adv_pet: 1, has_female_adv_def: 1 },
  { case_id: 'CNR-DL01-003004-2024', state_code: 1, dist_code: 1, court_no: 3, type_name_val: 'bail appln cbi', purpose_name_val: 'hearing', case_age_days: 30, first_listing_delay: 5, statutory_eligible: 0, female_petitioner_clean: 0, female_defendant_clean: 0, has_female_adv_pet: 1, has_female_adv_def: 1 },
  { case_id: 'CNR-BR08-004005-2024', state_code: 8, dist_code: 4, court_no: 4, type_name_val: 'civil suit', purpose_name_val: 'appearance', case_age_days: 180, first_listing_delay: 30, statutory_eligible: 1, female_petitioner_clean: 0, female_defendant_clean: 1, has_female_adv_pet: 1, has_female_adv_def: 1 },
  { case_id: 'CNR-TS29-005006-2023', state_code: 29, dist_code: 1, court_no: 2, type_name_val: 'ni act (cheque bounce)', purpose_name_val: 'lok-nyayalaya', case_age_days: 340, first_listing_delay: 22, statutory_eligible: 1, female_petitioner_clean: 0, female_defendant_clean: 0, has_female_adv_pet: 1, has_female_adv_def: 1 },
  { case_id: 'CNR-GJ17-006007-2024', state_code: 17, dist_code: 1, court_no: 1, type_name_val: 'matrimonial maintenance', purpose_name_val: 'appearance', case_age_days: 120, first_listing_delay: 18, statutory_eligible: 1, female_petitioner_clean: 1, female_defendant_clean: 0, has_female_adv_pet: 1, has_female_adv_def: 1 },
  { case_id: 'CNR-MH01-007008-2024', state_code: 1, dist_code: 1, court_no: 4, type_name_val: 'murder u/s 302 ipc', purpose_name_val: 'evidence', case_age_days: 520, first_listing_delay: 60, statutory_eligible: 0, female_petitioner_clean: 0, female_defendant_clean: 0, has_female_adv_pet: 1, has_female_adv_def: 1 },
  { case_id: 'CNR-CH27-008009-2024', state_code: 27, dist_code: 1, court_no: 1, type_name_val: 's.c.c.', purpose_name_val: 'appearance', case_age_days: 145, first_listing_delay: 14, statutory_eligible: 1, female_petitioner_clean: 0, female_defendant_clean: 0, has_female_adv_pet: 1, has_female_adv_def: 1 },
  { case_id: 'CNR-CG18-009010-2023', state_code: 18, dist_code: 18, court_no: 2, type_name_val: 'mcop', purpose_name_val: 'depositing amount', case_age_days: 390, first_listing_delay: 35, statutory_eligible: 1, female_petitioner_clean: 1, female_defendant_clean: 1, has_female_adv_pet: 1, has_female_adv_def: 1 },
];

export default function BatchScreening() {
  const [batchData, setBatchData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterRec, setFilterRec] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  const handleScreenSampleList = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await scoreBatchCases(SAMPLE_CAUSE_LIST);
      setBatchData(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const response = await uploadCauseListCSV(file);
      setBatchData(response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!batchData?.results) return;
    const headers = ['Case ID', 'Suitability %', 'Recommendation', 'Statutory Status', 'Confidence', 'Top Driver'];
    const rows = batchData.results.map((r) => [
      r.case_id,
      r.suitability_score,
      r.recommendation,
      r.statutory_status,
      r.confidence_tier,
      `"${(r.top_reasons[0] || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nyaya_setu_dlsa_cause_list_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredResults = (batchData?.results || []).filter((r) => {
    if (filterRec !== 'ALL' && r.recommendation !== filterRec) return false;
    if (searchQuery && !r.case_id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner & Action Controls */}
      <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold font-serif text-white flex items-center space-x-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <span>District Cause List Batch Screening</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Bulk screen pending court filings against Mediation Act 2023 statutory filters and ML ADR rankings.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <label className="cursor-pointer inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition">
            <Upload className="w-4 h-4 text-amber-400" />
            <span>Upload Cause List CSV</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={handleScreenSampleList}
            disabled={loading}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition shadow-lg shadow-amber-500/10 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? 'Processing Batch...' : 'Load District Sample List'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900 text-rose-300 text-xs">
          {error}
        </div>
      )}

      {/* Summary KPI Cards */}
      {batchData?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
            <div className="text-xs text-slate-400 font-medium">Total Cases Scanned</div>
            <div className="text-2xl font-bold font-serif text-white mt-1">
              {batchData.summary.total_cases}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">District Registry Filings</div>
          </div>

          <div className="bg-slate-950/60 border border-emerald-900/40 p-4 rounded-xl">
            <div className="text-xs text-emerald-400 font-medium">Lok Adalat Candidates</div>
            <div className="text-2xl font-bold font-serif text-emerald-400 mt-1">
              {batchData.summary.lok_adalat_count}
            </div>
            <div className="text-[11px] text-emerald-500/80 mt-0.5">High ADR Settlement Potential</div>
          </div>

          <div className="bg-slate-950/60 border border-amber-900/40 p-4 rounded-xl">
            <div className="text-xs text-amber-400 font-medium">Mediation Eligible</div>
            <div className="text-2xl font-bold font-serif text-amber-400 mt-1">
              {batchData.summary.mediation_count}
            </div>
            <div className="text-[11px] text-amber-500/80 mt-0.5">Court-Annexed Conciliation</div>
          </div>

          <div className="bg-slate-950/60 border border-rose-900/40 p-4 rounded-xl">
            <div className="text-xs text-rose-400 font-medium">Statutory Excluded</div>
            <div className="text-2xl font-bold font-serif text-rose-400 mt-1">
              {batchData.summary.excluded_count}
            </div>
            <div className="text-[11px] text-rose-500/80 mt-0.5">Retained in Trial Court</div>
          </div>

          <div className="bg-slate-950/60 border border-amber-500/30 p-4 rounded-xl bg-gradient-to-br from-amber-500/5 to-transparent">
            <div className="text-xs text-amber-300 font-medium">Est. Court Hours Saved</div>
            <div className="text-2xl font-bold font-serif text-amber-400 mt-1">
              {batchData.summary.estimated_court_hours_saved} hrs
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Judicial Capacity Multiplier</div>
          </div>
        </div>
      )}

      {/* Screened Cause List Table */}
      {batchData?.results && (
        <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-6 shadow-xl space-y-4">
          
          {/* Table Filters & Search */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium">Filter Recommendation:</span>
              {['ALL', 'Lok Adalat', 'Mediation', 'Trial'].map((tier) => (
                <button
                  key={tier}
                  onClick={() => setFilterRec(tier)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    filterRec === tier
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search CNR / Case ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200 transition"
              >
                <Download className="w-3.5 h-3.5 text-amber-400" />
                <span>Export Cause List</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-3">Case ID</th>
                  <th className="py-3 px-3">Suitability</th>
                  <th className="py-3 px-3">Recommendation</th>
                  <th className="py-3 px-3">Statutory Status</th>
                  <th className="py-3 px-3">Confidence</th>
                  <th className="py-3 px-3">Key Legal Driver (SHAP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredResults.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/50 transition">
                    <td className="py-3 px-3 font-mono text-slate-200 font-medium">
                      {r.case_id}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`font-mono font-bold ${
                          r.suitability_score >= 65
                            ? 'text-emerald-400'
                            : r.suitability_score >= 40
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {r.suitability_score.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          r.recommendation === 'Lok Adalat'
                            ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                            : r.recommendation === 'Mediation'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {r.recommendation}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center space-x-1 text-[11px] ${
                          r.is_statutory_eligible ? 'text-emerald-400' : 'text-rose-400 font-semibold'
                        }`}
                      >
                        {r.is_statutory_eligible ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                        <span>{r.statutory_status}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-medium">
                      {r.confidence_tier}
                    </td>
                    <td className="py-3 px-3 text-slate-300 max-w-xs truncate" title={r.top_reasons[0]}>
                      {r.top_reasons[0] || 'Eligible civil matter'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
}

