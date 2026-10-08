import React, { useState } from 'react';
import { 
  UploadCloud, Download, Search, CheckCircle2, 
  ShieldAlert, Sparkles, FileSpreadsheet, FileText,
  AlertTriangle, ChevronDown, ChevronUp
} from 'lucide-react';
import { scoreBatchCases, uploadCauseListCSV } from '../services/api';

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
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleScreenSampleList = async () => {
    setLoading(true);
    setError(null);
    setUploadedFileName('10-Case Benchmark Cause List');
    try {
      const response = await scoreBatchCases(SAMPLE_CAUSE_LIST);
      setBatchData(response);
    } catch (err) {
      setError(err.message || 'Batch screening failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploadedFileName(file.name);
    setLoading(true);
    setError(null);
    try {
      const response = await uploadCauseListCSV(file);
      setBatchData(response);
    } catch (err) {
      setError(err.message || 'File processing failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDownloadTemplate = () => {
    const headers = ['case_id', 'state_code', 'dist_code', 'court_no', 'type_name_val', 'purpose_name_val', 'case_age_days', 'first_listing_delay', 'statutory_eligible', 'has_female_adv_pet', 'has_female_adv_def'];
    const sampleRows = [
      'CNR-KA01-009988-2024,3,1,1,ni act (cheque bounce),appearance,180,20,1,1,1',
      'CNR-MH02-007766-2024,1,2,2,mcop,depositing amount,365,30,1,0,1',
      'CNR-DL01-005544-2024,1,1,3,bail appln cbi,hearing,45,10,0,1,1'
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...sampleRows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'cause_list_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    if (!batchData?.results) return;
    const headers = ['Case ID', 'Suitability %', 'Recommendation', 'Statutory Status', 'Confidence', 'Primary Driver'];
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
    link.setAttribute('download', `screened_cause_list_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredResults = (batchData?.results || []).filter((r) => {
    if (filterRec !== 'ALL' && r.recommendation !== filterRec) return false;
    if (searchQuery && !r.case_id.toLowerCase().includes(searchQuery.toLowerCase()) && !r.statutory_status.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      
      {/* Upload Dropzone Toolbar */}
      <div className="glass-card rounded-xl p-4 shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Cause List Batch Triage
            </h2>
            <span className="text-[11px] text-slate-400">Bulk screening for Section 89 CPC & Lok Adalat</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadTemplate}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>CSV Template</span>
            </button>
            <button
              onClick={handleScreenSampleList}
              disabled={loading}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{loading ? 'Processing...' : 'Load Sample List'}</span>
            </button>
          </div>
        </div>

        {/* Compact Drag-and-Drop Area */}
        <div className="pt-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`border border-dashed rounded-xl p-4 text-center transition ${
              isDragOver
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-3">
              <UploadCloud className="w-5 h-5 text-amber-400 shrink-0" />
              <div className="text-xs text-slate-300">
                <span>Drag & drop Cause List CSV here, or </span>
                <label className="cursor-pointer text-amber-400 hover:underline font-bold">
                  Browse file
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileUpload(e.target.files?.[0])}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {uploadedFileName && (
              <div className="mt-2 text-[11px] text-amber-300 font-mono">
                Loaded: <strong>{uploadedFileName}</strong>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900 text-rose-300 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary KPI Strip */}
      {batchData?.summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <div className="glass-card p-3 rounded-xl border border-slate-800 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-400">Total Scanned</div>
            <div className="text-xl font-bold font-serif text-white mt-0.5">{batchData.summary.total_cases}</div>
          </div>
          <div className="glass-card p-3 rounded-xl border border-emerald-900/40 text-center">
            <div className="text-[10px] uppercase font-bold text-emerald-400">Lok Adalat</div>
            <div className="text-xl font-bold font-serif text-emerald-400 mt-0.5">{batchData.summary.lok_adalat_count}</div>
          </div>
          <div className="glass-card p-3 rounded-xl border border-amber-900/40 text-center">
            <div className="text-[10px] uppercase font-bold text-amber-400">Mediation</div>
            <div className="text-xl font-bold font-serif text-amber-400 mt-0.5">{batchData.summary.mediation_count}</div>
          </div>
          <div className="glass-card p-3 rounded-xl border border-rose-900/40 text-center">
            <div className="text-[10px] uppercase font-bold text-rose-400">Excluded (Trial)</div>
            <div className="text-xl font-bold font-serif text-rose-400 mt-0.5">{batchData.summary.excluded_count}</div>
          </div>
          <div className="glass-card p-3 rounded-xl border border-amber-500/30 text-center">
            <div className="text-[10px] uppercase font-bold text-amber-300">Hours Saved</div>
            <div className="text-xl font-bold font-serif text-amber-400 mt-0.5">{batchData.summary.estimated_court_hours_saved}h</div>
          </div>
        </div>
      )}

      {/* Screened Cause List Table */}
      {batchData?.results && (
        <div className="glass-card rounded-xl p-4 shadow-md space-y-3">
          
          {/* Filter Pills & Search */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-1">
              {[
                { id: 'ALL', label: `All (${batchData.results.length})` },
                { id: 'Lok Adalat', label: `Lok Adalat (${batchData.summary.lok_adalat_count})` },
                { id: 'Mediation', label: `Mediation (${batchData.summary.mediation_count})` },
                { id: 'Trial', label: `Trial (${batchData.summary.excluded_count})` },
              ].map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setFilterRec(tier.id)}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition ${
                    filterRec === tier.id
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tier.label}
                </button>
              ))}
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search CNR..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono w-36 sm:w-48"
                />
              </div>

              <button
                onClick={handleExportCSV}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-200"
              >
                <Download className="w-3 h-3 text-amber-400" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto rounded-lg border border-slate-800/80">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="py-2 px-3">Case ID</th>
                  <th className="py-2 px-3">Suitability</th>
                  <th className="py-2 px-3">Recommendation</th>
                  <th className="py-2 px-3">Statutory Status</th>
                  <th className="py-2 px-3">Confidence</th>
                  <th className="py-2 px-3">Key Legal Driver (SHAP)</th>
                  <th className="py-2 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredResults.map((r, idx) => {
                  const isExpanded = expandedRow === r.case_id;
                  return (
                    <React.Fragment key={idx}>
                      <tr 
                        onClick={() => setExpandedRow(isExpanded ? null : r.case_id)}
                        className={`hover:bg-slate-900/60 transition cursor-pointer ${
                          isExpanded ? 'bg-slate-900/80' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-slate-200 font-medium">
                          {r.case_id}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold">
                          <span className={
                            r.suitability_score >= 65 ? 'text-emerald-400' : r.suitability_score >= 40 ? 'text-amber-400' : 'text-rose-400'
                          }>
                            {r.suitability_score.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                            r.recommendation === 'Lok Adalat'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : r.recommendation === 'Mediation'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                          }`}>
                            {r.recommendation}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center space-x-1 text-[11px] ${
                            r.is_statutory_eligible ? 'text-emerald-400' : 'text-rose-400 font-semibold'
                          }`}>
                            {r.is_statutory_eligible ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                            <span>{r.statutory_status}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">
                          {r.confidence_tier}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate" title={r.top_reasons?.[0]}>
                          {r.top_reasons?.[0] || 'Eligible civil matter'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-400">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-amber-400 inline" /> : <ChevronDown className="w-3.5 h-3.5 inline" />}
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-950/80">
                          <td colSpan={7} className="p-3 border-b border-slate-800">
                            <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 space-y-2 text-xs">
                              <div className="font-bold text-slate-200">SHAP Attributions for {r.case_id}:</div>
                              <ul className="space-y-0.5 text-slate-300 list-disc list-inside">
                                {(r.top_reasons || []).map((reason, i) => (
                                  <li key={i}>{reason}</li>
                                ))}
                              </ul>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
}



