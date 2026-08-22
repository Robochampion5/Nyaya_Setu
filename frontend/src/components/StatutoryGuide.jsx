import React from 'react';
import { BookOpen, ShieldAlert, CheckCircle2, Scale, FileText, Landmark } from 'lucide-react';

export default function StatutoryGuide() {
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

      {/* Two Column Grid: Eligible vs Excluded */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left: First Schedule Excluded Matters */}
        <div className="bg-slate-950/70 border border-rose-900/60 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-rose-400 pb-3 border-b border-rose-900/40">
            <ShieldAlert className="w-5 h-5" />
            <h4 className="text-base font-bold font-serif text-white">
              Statutory Exclusions (Mediation Act 2023 First Schedule)
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            The following categories are non-negotiable and strictly excluded from pre-trial mediation or Lok Adalat referrals:
          </p>

          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl">
              <strong className="text-rose-400 block mb-0.5">1. Non-Compoundable Criminal Offenses:</strong>
              IPC/BNS offenses involving grave bodily harm, murder (§302), rape (§376), POCSO, NDPS, or corruption.
            </li>
            <li className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl">
              <strong className="text-rose-400 block mb-0.5">2. Bail Applications:</strong>
              Regular, anticipatory, and interim bail petitions must be adjudicated solely on judicial merits.
            </li>
            <li className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl">
              <strong className="text-rose-400 block mb-0.5">3. Specialized Agencies (CBI, NIA, ED):</strong>
              Cases investigated under special statutory mandates involving national security or serious economic fraud.
            </li>
            <li className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl">
              <strong className="text-rose-400 block mb-0.5">4. Public Interest & Constitutional Writs:</strong>
              Matters challenging statutory provisions, elections, or disputes impacting non-party public rights.
            </li>
          </ul>
        </div>

        {/* Right: Prime ADR Candidates */}
        <div className="bg-slate-950/70 border border-emerald-900/60 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center space-x-2 text-emerald-400 pb-3 border-b border-emerald-900/40">
            <CheckCircle2 className="w-5 h-5" />
            <h4 className="text-base font-bold font-serif text-white">
              Prime ADR Suitable Disputes (Section 89 CPC)
            </h4>
          </div>
          <p className="text-xs text-slate-400">
            Disputes with high statutory settlement suitability earmarked for priority National Lok Adalat screening:
          </p>

          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl">
              <strong className="text-emerald-400 block mb-0.5">1. Cheque Bounce (§138 NI Act):</strong>
              Statutorily compoundable under §147 NI Act. Represents over 35% of district court case pendency.
            </li>
            <li className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl">
              <strong className="text-emerald-400 block mb-0.5">2. Motor Accident Claims (MCOP):</strong>
              Compensation disputes against insurance companies, prioritized for Lok Adalat award settlements.
            </li>
            <li className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl">
              <strong className="text-emerald-400 block mb-0.5">3. Small Causes & Commercial Money Recovery:</strong>
              Summary civil suits regarding contractual dues, loans, and partnership accounts.
            </li>
            <li className="p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl">
              <strong className="text-emerald-400 block mb-0.5">4. Matrimonial & Family Property Disputes:</strong>
              Maintenance under §125 CrPC / §144 BNSS and partition suits where conciliation restores harmony.
            </li>
          </ul>
        </div>

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

