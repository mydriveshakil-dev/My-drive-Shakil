/**
 * Date Formatting Utility for UAE Mess Management System
 * Converts standard YYYY-MM-DD or ISO dates into user-friendly DD-MM-YYYY format.
 */

export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();

  // Handle YYYY-MM-DD or YYYY-MM-DD HH:MM
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(.*)$/);
  if (ymdMatch) {
    const [, yyyy, mm, dd, rest] = ymdMatch;
    return `${dd}-${mm}-${yyyy}${rest}`;
  }

  // Handle ISO timestamp like 2026-08-24T14:30:00.000Z
  if (trimmed.includes('T')) {
    const datePart = trimmed.split('T')[0];
    const match = datePart.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
  }

  return dateStr;
}

export function formatCurrentDateDDMMYYYY(): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = now.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}
