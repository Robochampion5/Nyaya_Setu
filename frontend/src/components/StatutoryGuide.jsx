import React, { useState } from 'react';
import { BookOpen, ShieldAlert, CheckCircle2, Scale, FileText, Landmark, Search, Filter } from 'lucide-react';

const STATUTORY_ITEMS = [
  {
    id: 1,
    title: 'Cheque Bounce (§138 Negotiable Instruments Act)',
    category: 'Eligible',
    act: 'NI Act 1881 / §147',
    summary: 'Statutorily compoundable dispute under §147 NI Act. Primary target for National Lok Adalat special benches; represents ~35% of district court pendency.',
    badgeColor: 'emerald',
  },
  {
    id: 2,
    title: 'Motor Accident Claims (MCOP / MACT)',
    category: 'Eligible',
    act: 'Motor Vehicles Act 1988',
    summary: 'Third-party injury and death compensation claims against insurance companies. High success rate in pre-Lok Adalat conciliation with insurer panels.',
    badgeColor: 'emerald',
  },
  {
    id: 3,
    title: 'Small Causes & Summary Commercial Debt (S.C.C.)',
    category: 'Eligible',
    act: 'Provincial Small Cause Courts Act / CPC',
    summary: 'Liquidated debt recovery, loan default, vendor dues, and partnership settlement disputes fit for early mediation under Section 89 CPC.',
    badgeColor: 'emerald',
  },
  {
    id: 4,
    title: 'Matrimonial Maintenance & Family Property Partition',
    category: 'Eligible',
    act: 'Mediation Act 2023 / §125 CrPC / BNSS',
    summary: 'Pre-litigation and court-annexed mediation explicitly mandated to preserve familial relationships and achieve amicable financial maintenance.',
    badgeColor: 'emerald',
  },
  {
    id: 5,
    title: 'Consumer & Commercial Contractual Disputes',
    category: 'Eligible',
    act: 'Consumer Protection Act 2019 / Commercial Courts Act',
    summary: 'Business-to-consumer and pre-institution mediation claims suited for trained mediator intervention.',
    badgeColor: 'emerald',
  },
  {
    id: 6,
    title: 'Non-Compoundable Criminal Offences (IPC/BNS)',
    category: 'Excluded',
    act: 'First Schedule, Mediation Act 2023 (Entry 1)',
    summary: 'Matters involving serious bodily harm, murder (§302), rape (§376), POCSO Act, NDPS, or offences against the State are strictly non-compoundable.',
    badgeColor: 'rose',
  },
  {
    id: 7,
    title: 'Bail & Anticipatory Bail Petitions',
    category: 'Excluded',
    act: 'First Schedule, Mediation Act 2023 (Entry 3)',
    summary: 'Bail is a judicial prerogative concerning personal liberty and cannot be substituted or compromised through mediation proceedings.',
    badgeColor: 'rose',
  },
  {
    id: 8,
    title: 'Special Statutory Prosecution (CBI, NIA, ED)',
    category: 'Excluded',
    act: 'Prevention of Corruption Act / NIA Act',
    summary: 'Offences investigated by central agencies regarding corruption or national security cannot be mediated or compounded.',
    badgeColor: 'rose',
  },
  {
    id: 9,
    title: 'Constitutional Writs & Public Interest Disputes',
    category: 'Excluded',
    act: 'First Schedule, Mediation Act 2023 (Entry 5)',
    summary: 'Challenges to statutory vires, administrative rules, or disputes impacting non-party public rights require judicial determination.',
    badgeColor: 'rose',
  },
];

export default function StatutoryGuide() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const filteredItems = STATUTORY_ITEMS.filter((item) => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.act.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Intro Banner */}
      <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center space-x-3 text-amber-400 mb-2">
          <Landmark className="w-6 h-6" />
          <h3 className="text-xl font-bold font-serif text-white">
            Statutory Legal Framework & Judicial Compliance
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
          Nyaya Setu strictly operationalizes the statutory mandates of <strong>Section 89 of the Code of Civil Procedure (CPC) 1908</strong>, 
          the <strong>Mediation Act 2023</strong>, and the Supreme Court landmark ruling in <em>Afcons Infrastructure Ltd. v. Cherian Varkey Construction Co. (2010)</em>.
          Before invoking Machine Learning algorithms, every case undergoes rigorous deterministic statutory compliance checks.
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search statutes, IPC sections, Mediation Act entries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          {['ALL', 'Eligible', 'Excluded'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                categoryFilter === cat
                  ? cat === 'Eligible'
                    ? 'bg-emerald-500 text-slate-950'
                    : cat === 'Excluded'
                    ? 'bg-rose-500 text-white'
                    : 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All Provisions' : cat === 'Eligible' ? '✓ Eligible (Sec 89 CPC)' : '✕ Excluded (1st Schedule)'}
            </button>
          ))}
        </div>
      </div>

      {/* Two Column Grid: Search / Filter Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`bg-slate-950/70 border rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-3 ${
              item.category === 'Eligible'
                ? 'border-emerald-900/50 hover:border-emerald-700/60'
                : 'border-rose-900/50 hover:border-rose-700/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">{item.act}</span>
                <span
                  className={`inline-flex items-center space-x-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.category === 'Eligible'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {item.category === 'Eligible' ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                  <span>{item.category === 'Eligible' ? 'ADR Suitable' : 'Statutory Bar'}</span>
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-100 font-serif leading-snug">{item.title}</h4>
              <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{item.summary}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Statutory Benchmark Reference Card */}
      <div className="bg-slate-950/70 border border-slate-800/90 rounded-2xl p-6 shadow-xl">
        <h4 className="text-sm font-bold font-serif text-amber-400 mb-2 flex items-center space-x-2">
          <FileText className="w-4 h-4" />
          <span>Case Scrutiny Committee (DLSA) Standard Operating Procedure</span>
        </h4>
        <p className="text-xs text-slate-300 leading-relaxed">
          1. <strong>Stage of Intervention:</strong> Scrutiny should ideally occur at the <em>Appearance of Parties / Post-Summons</em> stage before framing of issues.<br />
          2. <strong>Voluntary Consent:</strong> While statutory screening identifies suitability, final referral to mediation requires voluntary submission or judicial order under §89(1) CPC.<br />
          3. <strong>Binding Settlement:</strong> Lok Adalat awards have the status of a Civil Court Decree under §21 of the Legal Services Authorities Act 1987 (no appeal lies).
        </p>
      </div>
    </div>
  );
}


