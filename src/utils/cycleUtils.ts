export function getCurrentCycleId(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function getBillingCycleLabel(cycleId: string): string {
  if (!cycleId) return 'Current Cycle';
  const parts = cycleId.split('-');
  if (parts.length < 2) return cycleId;

  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1; // 0-indexed
  if (isNaN(year) || isNaN(monthIdx)) return cycleId;

  const startDate = new Date(year, monthIdx, 1);
  const endDate = new Date(year, monthIdx + 1, 0); // last day of month

  const monthShort = startDate.toLocaleString('en-US', { month: 'short' });
  const endDay = String(endDate.getDate()).padStart(2, '0');

  return `01 ${monthShort} - ${endDay} ${monthShort} ${year}`;
}

export function getMonthYearDisplay(cycleId: string): string {
  if (!cycleId) return 'Current';
  const parts = cycleId.split('-');
  if (parts.length < 2) return cycleId;

  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  if (isNaN(year) || isNaN(monthIdx)) return cycleId;

  const startDate = new Date(year, monthIdx, 1);
  return startDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export function getPreviousCycleOptions(
  count: number = 24,
  groupCreatedAt?: string
): { cycleId: string; label: string; fullLabel: string }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0 to 11

  let minCycleId = '';
  if (groupCreatedAt) {
    // If ISO date like 2026-06-15 or 2026-06
    const clean = groupCreatedAt.slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(clean)) {
      minCycleId = clean;
    }
  }

  const options = [];
  for (let i = 1; i <= count; i++) {
    const d = new Date(currentYear, currentMonthIdx - i, 1);
    const year = d.getFullYear();
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const cycleId = `${year}-${monthStr}`;

    if (minCycleId && cycleId < minCycleId) {
      // Exclude cycles earlier than group creation month
      continue;
    }

    const monthShortStr = d.toLocaleString('en-US', { month: 'short' });
    const fullLabel = getBillingCycleLabel(cycleId);

    options.push({
      cycleId,
      label: `${monthShortStr} ${year}${i === 1 ? ' (Previous Cycle)' : ''}`,
      fullLabel,
    });
  }
  return options;
}

