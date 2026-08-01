export function cleanExpenseTitle(title: string): string {
  if (!title) return '';
  let cleaned = title.trim();

  // Remove short names, initials, or prefix abbreviations (such as AA, KM, W, J, etc.)
  // e.g. "AA - Grocery" -> "Grocery", "KM Rice" -> "Rice", "[AA] Fish" -> "Fish"
  cleaned = cleaned.replace(/^([A-Za-z]{1,3}\s*[-–—:]\s*)/i, '');
  cleaned = cleaned.replace(/^(\[[A-Za-z]{1,3}\]|\([A-Za-z]{1,3}\))\s*/i, '');
  cleaned = cleaned.replace(/^([A-Z]{1,3})\s+(?=[A-Za-z0-9])/i, '');
  cleaned = cleaned.replace(/^([A-Z]{1,3})\s*\/\s*/i, '');

  return cleaned.trim() || title;
}
