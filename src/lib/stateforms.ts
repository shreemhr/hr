// ──────────────────────────────────────────────────────────
// STATE FORMS CONFIG
// Determines which forms are required per state.
// Add new states here as the customer base expands.
// ──────────────────────────────────────────────────────────

export type FormStatus = 'pending' | 'collected' | 'na';

export interface FormDef {
  id:          string;
  name:        string;
  shortName:   string;
  description: string;
  link?:       string;   // IRS / state dept link
  federal?:    boolean;
}

// Always required for every new hire
export const FEDERAL_FORMS: FormDef[] = [
  {
    id:          'w4',
    name:        "Federal W-4 — Employee's Withholding Certificate",
    shortName:   'Federal W-4',
    description: "Employee's federal income tax withholding elections.",
    link:        'https://www.irs.gov/pub/irs-pdf/fw4.pdf',
    federal:     true,
  },
  {
    id:          'i9',
    name:        'Form I-9 — Employment Eligibility Verification',
    shortName:   'Form I-9',
    description: 'Verify identity and authorization to work in the U.S.',
    link:        'https://www.uscis.gov/i-9',
    federal:     true,
  },
];

// State-specific forms keyed by 2-letter state code
export const STATE_FORMS: Record<string, FormDef[]> = {
  TX: [], // No state income tax — no withholding form needed
  OK: [{
    id:          'ok_w4',
    name:        "Oklahoma W-4 — Employee's Withholding Allowance Certificate",
    shortName:   'Oklahoma W-4',
    description: 'Oklahoma state income tax withholding.',
    link:        'https://oklahoma.gov/content/dam/ok/en/tax/documents/forms/employees/current/OW-9.pdf',
  }],
  IL: [{
    id:          'il_w4',
    name:        "Illinois IL-W-4 — Employee's Illinois Withholding Allowance Certificate",
    shortName:   'Illinois IL-W-4',
    description: 'Illinois state income tax withholding.',
    link:        'https://tax.illinois.gov/content/dam/soi/en/web/tax/docs/currentforms/withholding/il-w-4.pdf',
  }],
  MO: [{
    id:          'mo_w4',
    name:        "Missouri MO W-4 — Employee's Withholding Certificate",
    shortName:   'Missouri MO W-4',
    description: 'Missouri state income tax withholding.',
    link:        'https://dor.mo.gov/forms/MO%20W-4_2023.pdf',
  }],
  AR: [{
    id:          'ar_w4',
    name:        "Arkansas AR4EC — Employee's Withholding Exemption Certificate",
    shortName:   'Arkansas AR4EC',
    description: 'Arkansas state income tax withholding.',
    link:        'https://www.dfa.arkansas.gov/images/uploads/incomeTaxOffice/ar4ec.pdf',
  }],
  TN: [], // No state income tax on wages
  FL: [], // No state income tax
  GA: [{
    id:          'ga_g4',
    name:        "Georgia G-4 — Employee's Withholding Allowance Certificate",
    shortName:   'Georgia G-4',
    description: 'Georgia state income tax withholding.',
  }],
  NC: [{
    id:          'nc_nc4',
    name:        "North Carolina NC-4 — Employee's Withholding Allowance Certificate",
    shortName:   'North Carolina NC-4',
    description: 'North Carolina state income tax withholding.',
  }],
};

export const STATE_NOTES: Record<string, string> = {
  TX: 'Texas has no state income tax — no state withholding form required.',
  TN: 'Tennessee has no state income tax on wages — no state withholding form required.',
  FL: 'Florida has no state income tax — no state withholding form required.',
  OK: 'Oklahoma requires the OK W-4 for state withholding.',
  IL: 'Illinois requires the IL-W-4 for state withholding.',
  MO: 'Missouri requires the MO W-4 for state withholding.',
  AR: 'Arkansas requires the AR4EC for state withholding.',
  GA: 'Georgia requires the G-4 for state withholding.',
  NC: 'North Carolina requires the NC-4 for state withholding.',
};

export function getFormsForState(stateCode: string): FormDef[] {
  const stateForms = STATE_FORMS[stateCode] ?? [];
  return [...FEDERAL_FORMS, ...stateForms];
}

export const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];
