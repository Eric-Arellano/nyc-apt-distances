export function isValidAddress(v: string): boolean {
  return /^\d+\s+\S+.*$/.test(v.trim());
}
