export function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Runs a set of field validators and returns the first error message, or null if all pass. */
export function firstError(checks: Array<[boolean, string]>): string | null {
  for (const [failed, message] of checks) {
    if (failed) return message;
  }
  return null;
}
