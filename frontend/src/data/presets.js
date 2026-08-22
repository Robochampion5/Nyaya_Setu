/**
 * Real District Court Case Presets for Instant Case Scrutiny Testing
 * Sourced from National Judicial Data Grid / DDL classifications
 */

export const CASE_PRESETS = [
  {
    id: 'preset-1',
    title: 'NI Act §138 Cheque Bounce (Bangalore)',
    badge: 'High ADR Settlement',
    badgeColor: 'emerald',
    description: 'Commercial loan default with cheque dishonour. Statutory compoundable under Section 147 NI Act.',
    data: {
      case_id: 'CNR-KA01-002341-2024',
      state_code: 3,
      dist_code: 1,
      court_no: 2,
      type_name_val: 'ni act (cheque bounce)',
      purpose_name_val: 'appearance',
      case_age_days: 195.0,
      first_listing_delay: 25.0,
      statutory_eligible: 1,
      female_petitioner_clean: 0,
      female_defendant_clean: 0,
      has_female_adv_pet: 1,
      has_female_adv_def: 1,
    }
  },
  {
    id: 'preset-2',
    title: 'Motor Accident Claim MCOP (Pune)',
    badge: 'Lok Adalat Candidate',
    badgeColor: 'emerald',
    description: 'Compensation claim against insurer pending for over 1.2 years. Insurance panel ready for conciliation.',
    data: {
      case_id: 'CNR-MH02-008912-2023',
      state_code: 1,
      dist_code: 2,
      court_no: 1,
      type_name_val: 'mcop',
      purpose_name_val: 'depositing amount',
      case_age_days: 440.0,
      first_listing_delay: 45.0,
      statutory_eligible: 1,
      female_petitioner_clean: 1,
      female_defendant_clean: 0,
      has_female_adv_pet: 1,
      has_female_adv_def: 1,
    }
  },
  {
    id: 'preset-3',
    title: 'Small Causes Commercial Debt (Patna)',
    badge: 'Mediation Recommended',
    badgeColor: 'amber',
    description: 'Small debt recovery suit at early summons stage. Good candidate for court-annexed mediation.',
    data: {
      case_id: 'CNR-BR08-001290-2024',
      state_code: 8,
      dist_code: 4,
      court_no: 4,
      type_name_val: 's.c.c.',
      purpose_name_val: 'summons',
      case_age_days: 75.0,
      first_listing_delay: 15.0,
      statutory_eligible: 1,
      female_petitioner_clean: 0,
      female_defendant_clean: 1,
      has_female_adv_pet: 1,
      has_female_adv_def: 0,
    }
  },
  {
    id: 'preset-4',
    title: 'CBI Corruption & Regular Bail (Excluded)',
    badge: 'Statutory Bar (Mediation Act 2023)',
    badgeColor: 'rose',
    description: 'Non-compoundable criminal investigation and bail petition. Hard statutory exclusion under First Schedule.',
    data: {
      case_id: 'CNR-DL01-000412-2024',
      state_code: 1,
      dist_code: 1,
      court_no: 3,
      type_name_val: 'bail appln cbi',
      purpose_name_val: 'hearing',
      case_age_days: 45.0,
      first_listing_delay: 7.0,
      statutory_eligible: 0,
      female_petitioner_clean: 0,
      female_defendant_clean: 0,
      has_female_adv_pet: 1,
      has_female_adv_def: 1,
    }
  },
  {
    id: 'preset-5',
    title: 'Civil Partition / Land Boundary (Hyderabad)',
    badge: 'Family Mediation',
    badgeColor: 'amber',
    description: 'Family property partition dispute. Ideal for pre-trial mediation to preserve family relations.',
    data: {
      case_id: 'CNR-TS29-004419-2023',
      state_code: 29,
      dist_code: 1,
      court_no: 2,
      type_name_val: 'civil suit',
      purpose_name_val: 'lok-nyayalaya',
      case_age_days: 310.0,
      first_listing_delay: 35.0,
      statutory_eligible: 1,
      female_petitioner_clean: 1,
      female_defendant_clean: 1,
      has_female_adv_pet: 1,
      has_female_adv_def: 1,
    }
  },
];

