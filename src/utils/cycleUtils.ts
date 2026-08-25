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

export function parseYearAndMonth(dateOrCycle?: string): { year: number; monthIdx: number } | null {
  if (!dateOrCycle || typeof dateOrCycle !== 'string') return null;
  const trimmed = dateOrCycle.trim();
  if (!trimmed) return null;

  // Handle YYYY-MM or YYYY-MM-DD
  const match = trimmed.match(/^(\d{4})-(\d{1,2})/);
  if (match) {
    const y = parseInt(match[1], 10);
    const m = parseInt(match[2], 10) - 1; // 0-indexed
    if (!isNaN(y) && !isNaN(m) && m >= 0 && m <= 11) {
      return { year: y, monthIdx: m };
    }
  }

  // Handle ISO string / standard Date parse
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return { year: d.getFullYear(), monthIdx: d.getMonth() };
  }

  return null;
}

export function getPreviousCycleOptions(
  count?: number,
  groupCreatedAt?: string,
  earliestCycleId?: string
): { cycleId: string; label: string; fullLabel: string }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthIdx = now.getMonth(); // 0 to 11

  // Determine group start year and month (when admin created group)
  let startYear = currentYear;
  let startMonthIdx = currentMonthIdx; // Default to current month

  const parsedCreated = parseYearAndMonth(groupCreatedAt);
  if (parsedCreated) {
    startYear = parsedCreated.year;
    startMonthIdx = parsedCreated.monthIdx;
  }

  // If earliest existing expense/bill cycle is earlier than group created date, respect it
  if (earliestCycleId) {
    const parsedEarliest = parseYearAndMonth(earliestCycleId);
    if (parsedEarliest) {
      const earliestMonths = parsedEarliest.year * 12 + parsedEarliest.monthIdx;
      const startMonths = startYear * 12 + startMonthIdx;
      if (earliestMonths < startMonths) {
        startYear = parsedEarliest.year;
        startMonthIdx = parsedEarliest.monthIdx;
      }
    }
  }

  // Calculate total months difference from creation month to current month
  const totalMonthsDiff = (currentYear - startYear) * 12 + (currentMonthIdx - startMonthIdx);

  // Exact number of previous cycles: from the creation month up to the current month
  let cycleCount: number;
  if (totalMonthsDiff > 0) {
    if (count !== undefined && count > 0) {
      cycleCount = Math.min(totalMonthsDiff, count);
    } else {
      cycleCount = Math.min(totalMonthsDiff, 60);
    }
  } else {
    // If created in current month, provide at least 1 previous cycle so dropdown remains functional
    cycleCount = 1;
  }

  const options: { cycleId: string; label: string; fullLabel: string }[] = [];
  for (let i = 1; i <= cycleCount; i++) {
    const d = new Date(currentYear, currentMonthIdx - i, 1);
    const year = d.getFullYear();
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const cycleId = `${year}-${monthStr}`;

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

