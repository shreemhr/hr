// Client-safe constants — no server imports, usable in 'use client' components

export const ROLE_LABELS: Record<string, string> = {
  owner:   'Owner',
  vp_ops:  'VP Operations',
  gm:      'General Manager',
  hr:      'HR',
};

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  full_time:  'Full-time',
  part_time:  'Part-time',
  seasonal:   'Seasonal',
  contract:   'Contract',
};

export const ONBOARDING_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  complete:    'Complete',
};

export const EMPLOYEE_STATUS_LABELS: Record<string, string> = {
  active:      'Active',
  terminated:  'Terminated',
  on_leave:    'On Leave',
};
