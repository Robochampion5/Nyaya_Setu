import React, { useState } from 'react';
import { 
  BookOpen, ShieldAlert, CheckCircle2, Scale, Search
} from 'lucide-react';

const STATUTORY_ITEMS = [
  {
    id: 1,
    title: 'Cheque Bounce (§138 NI Act)',
    category: 'Eligible',
    act: '§147 Negotiable Instruments Act 1881',
    summary: 'Statutorily compoundable dispute. Primary target for National Lok Adalat special benches.',
    badgeColor: 'emerald',
    precedent: 'M/S Meters and Instruments v. Kanchan Mehta (2018)',
  },
  {
    id: 2,
    title: 'Motor Accident Claims (MCOP / MACT)',
    category: 'Eligible',
    act: 'Motor Vehicles Act 1988 / §89 CPC',
    summary: 'Third-party injury and death compensation claims against insurance panels.',
    badgeColor: 'emerald',
    precedent: 'National Insurance v. Pranay Sethi (2017)',
  },
  {
    id: 3,
    title: 'Small Causes & Summary Commercial Debt (S.C.C.)',
    category: 'Eligible',
    act: 'Provincial Small Cause Courts Act / CPC',
    summary: 'Liquidated debt recovery, loan default, vendor dues, and commercial settlement.',
    badgeColor: 'emerald',
    precedent: 'Afcons Infrastructure v. Cherian Varkey (2010)',
  },
  {
    id: 4,
    title: 'Matrimonial Maintenance & Family Partition',
    category: 'Eligible',
    act: 'Mediation Act 2023 / §125 CrPC / BNSS',
    summary: 'Pre-litigation and court-annexed mediation mandated to achieve amicable settlement.',
    badgeColor: 'emerald',
    precedent: 'K. Srinivas Rao v. D.A. Deepa (2013)',
  },
  {
    id: 5,
    title: 'Consumer & Commercial Contractual Disputes',
    category: 'Eligible',
    act: 'Consumer Protection Act 2019 / Commercial Courts Act',
    summary: 'Business claims suited for trained mediator intervention under Mediation Act 2023.',
    badgeColor: 'emerald',
    precedent: 'Patil Automation v. Rakheja Engineers (2022)',
  },
  {
    id: 6,
    title: 'Non-Compoundable Criminal Offences (IPC / BNS)',
    category: 'Excluded',
    act: 'First Schedule, Mediation Act 2023 (Entry 1)',
    summary: 'Serious bodily harm, murder (§302), rape (§376), POCSO, NDPS, offences against State.',
    badgeColor: 'rose',
    precedent: 'Gian Singh v. State of Punjab (2012)',
  },
  {
    id: 7,
    title: 'Bail & Anticipatory Bail Petitions',
    category: 'Excluded',
    act: 'First Schedule, Mediation Act 2023 (Entry 3)',
    summary: 'Bail is a judicial prerogative concerning personal liberty. Excluded from ADR.',
    badgeColor: 'rose',
    precedent: 'Arnesh Kumar v. State of Bihar (2014)',
  },
  {
    id: 8,
    title: 'Special Statutory Prosecution (CBI, NIA, ED)',
    category: 'Excluded',
    act: 'Prevention of Corruption Act / NIA Act',
    summary: 'Offences investigated by central agencies regarding corruption or national security.',
    badgeColor: 'rose',
    precedent: 'State of Maharashtra v. Vikram Doshi (2014)',
  },
  {
    id: 9,
    title: 'Constitutional Writs & Public Interest Disputes',
    category: 'Excluded',
    act: 'First Schedule, Mediation Act 2023 (Entry 5)',
    summary: 'Challenges to statutory vires, administrative rules, or non-party public rights.',
    badgeColor: 'rose',
    precedent: 'Afcons Infrastructure (Para 27 Exclusions)',
  },
];

export default function StatutoryGuide() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedDisputeCheck, setSelectedDisputeCheck] = useState('ni_act');

  const CHECKER_OPTIONS = {
    ni_act: {
      name: 'Cheque Dishonour (§138 NI Act)',
      status: 'Eligible',
      statute: '§147 NI Act 1881',
      details: 'Compoundable dispute. Suitable for Lok Adalat or court mediation.',
      color: 'emerald',
    },
    motor_accident: {
      name: 'Motor Accident Claim (MACT/MCOP)',
      status: 'Eligible',
      statute: 'Motor Vehicles Act 1988',
      details: 'Suitable for pre-Lok Adalat sittings with insurer panels.',
      color: 'emerald',
    },
    matrimonial: {
      name: 'Family Partition & Maintenance',
      status: 'Eligible',
      statute: 'Mediation Act 2023 / §125 CrPC',
      details: 'Mandatory mediation referral favored to preserve relations.',
      color: 'emerald',
    },
    murder_302: {
      name: 'IPC §302 Murder (Heinous Offence)',
      status: 'Statutory Bar',
      statute: 'First Schedule, Entry 1',
      details: 'Strictly excluded. Non-compoundable offence against the State.',
      color: 'rose',
    },
    bail_plea: {
      name: 'Bail Application (CBI / Police)',
      status: 'Statutory Bar',
      statute: 'First Schedule, Entry 3',
      details: 'Judicial prerogative concerning liberty. Inadmissible for ADR.',
      color: 'rose',
    },
  };

  const filteredItems = STATUTORY_ITEMS.filter((item) => {
    if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.act.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.precedent.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCheck = CHECKER_OPTIONS[selectedDisputeCheck];

  return (
    <div className="space-y-4">
      
      {/* Quick Lookup Toolbar */}
      <div className="glass-card rounded-xl p-4 shadow-md space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200 flex items-center space-x-2">
            <Scale className="w-4 h-4 text-amber-400" />
            <span>Statutory Compliance Schedule</span>
          </h2>
          <span className="text-[11px] font-mono text-slate-400">Mediation Act 2023 & Sec 89 CPC</span>
        </div>

        {/* Quick Check Widget */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div className="md:col-span-5">
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Check Offence / Dispute:</label>
            <select
              value={selectedDisputeCheck}
              onChange={(e) => setSelectedDisputeCheck(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="ni_act">NI Act §138 Cheque Dishonour</option>
              <option value="motor_accident">Motor Accident Claim (MACT/MCOP)</option>
              <option value="matrimonial">Family Partition / Maintenance</option>
              <option value="murder_302">IPC §302 Murder (Heinous Crime)</option>
              <option value="bail_plea">Bail Application (CBI / Special Acts)</option>
            </select>
          </div>

          <div className="md:col-span-7">
            <div className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
              activeCheck.color === 'emerald'
                ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
            }`}>
              <div className="flex items-center space-x-2">
                {activeCheck.color === 'emerald' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <div>
                  <span className="font-bold">{activeCheck.status}</span>
                  <span className="text-[11px] opacity-80 block">{activeCheck.details}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">{activeCheck.statute}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Strip */}
      <div className="glass-card rounded-xl p-3 shadow-md flex flex-wrap items-center justify-between gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search statute, section, or precedent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center space-x-1">
          {['ALL', 'Eligible', 'Excluded'].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                categoryFilter === cat
                  ? cat === 'Eligible'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : cat === 'Excluded'
                    ? 'bg-rose-500 text-white font-bold'
                    : 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat === 'ALL' ? 'All Provisions' : cat === 'Eligible' ? 'Eligible' : 'Excluded (1st Schedule)'}
            </button>
          ))}
        </div>
      </div>

      {/* Statutory Entries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className="glass-card rounded-xl p-4 shadow-md border border-slate-800/80 flex flex-col justify-between space-y-2"
          >
            <div>
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <span className="text-[10px] font-mono text-slate-400 truncate">{item.act}</span>
                <span
                  className={`text-[9px] font-bold px-2 py-0.2 rounded-full ${
                    item.category === 'Eligible'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {item.category === 'Eligible' ? 'ADR' : 'Excluded'}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-100 leading-snug">{item.title}</h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{item.summary}</p>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 truncate">
              Precedent: <span className="text-amber-400/90 font-serif italic">{item.precedent}</span>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
