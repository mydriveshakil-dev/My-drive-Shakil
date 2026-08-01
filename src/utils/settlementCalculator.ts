import { Expense, Member, UtilityBill, RentContribution, MemberSummary, SettlementFlow } from '../types';

export interface SettlementCalculationResult {
  totalMessExpenses: number;
  totalGeneralExpenses: number;
  totalUtilities: number;
  totalRent: number;
  grandTotalExpenses: number;
  totalMessDays: number;
  dailyMealRate: number;
  memberSummaries: MemberSummary[];
  settlementFlows: SettlementFlow[];
}

export function calculateSettlement(
  members: Member[],
  expenses: Expense[],
  utilities: UtilityBill[],
  rent: RentContribution | null,
  includeCategories: { mess: boolean; general: boolean; utilities: boolean; rent: boolean } = {
    mess: true,
    general: true,
    utilities: true,
    rent: true,
  }
): SettlementCalculationResult {
  const activeMembers = members.filter((m) => m.active);
  const activeMemberCount = activeMembers.length || 1;

  // Helper to check if a category is included for a member
  const isCategoryIncluded = (member: Member, category: string): boolean => {
    if (!member.includedCategories || member.includedCategories.length === 0) {
      return true; // Default: include all categories
    }
    return member.includedCategories.includes(category);
  };

  // 1. Filter expenses based on selected categories
  const messExpenses = includeCategories.mess ? expenses.filter((e) => e.type === 'mess') : [];
  const generalExpenses = includeCategories.general ? expenses.filter((e) => e.type === 'general') : [];
  const filteredUtilities = includeCategories.utilities ? utilities : [];

  // 2. Totals
  const totalMessExpenses = messExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalGeneralExpenses = generalExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalUtilities = filteredUtilities.reduce((sum, u) => sum + u.amount, 0);
  const totalRent = includeCategories.rent && rent ? rent.totalRent : 0;
  const grandTotalExpenses = totalMessExpenses + totalGeneralExpenses + totalUtilities + totalRent;

  // 3. Mess calculation (split equally among members who have 'mess' category enabled)
  const messMembers = activeMembers.filter((m) => isCategoryIncluded(m, 'mess'));
  const messMemberCount = messMembers.length || 1;
  const messExpensePerMember = totalMessExpenses / messMemberCount;
  const totalMessDays = 0;
  const dailyMealRate = messExpensePerMember;

  // Rent participating members count
  const rentMembers = activeMembers.filter((m) => isCategoryIncluded(m, 'rent'));
  const rentMemberCount = rentMembers.length || activeMemberCount;

  // 4. Per member summaries
  const memberSummaries: MemberSummary[] = activeMembers.map((member) => {
    // Mess Share split equally (0 if member is excluded from mess)
    const isMessIncluded = isCategoryIncluded(member, 'mess');
    const messExpenseShare = includeCategories.mess && isMessIncluded ? messExpensePerMember : 0;

    // General Expense Share
    let generalExpenseShare = 0;
    if (includeCategories.general && isCategoryIncluded(member, 'general')) {
      generalExpenses.forEach((exp) => {
        const sharedWith = exp.sharedWithIds.length > 0 ? exp.sharedWithIds : activeMembers.map((m) => m.id);
        const validSharedWith = sharedWith.filter((id) => {
          const targetM = activeMembers.find((m) => m.id === id);
          return targetM ? isCategoryIncluded(targetM, 'general') : true;
        });
        const count = validSharedWith.length || 1;
        if (validSharedWith.includes(member.id)) {
          generalExpenseShare += exp.amount / count;
        }
      });
    }

    // Utilities Share (calculated per utility bill category matching member's inclusions)
    let utilitiesShare = 0;
    if (includeCategories.utilities) {
      filteredUtilities.forEach((u) => {
        const uCat = u.category;
        const participatingForUtil = activeMembers.filter((m) => isCategoryIncluded(m, uCat));
        const pCount = participatingForUtil.length || activeMemberCount;
        if (participatingForUtil.some((m) => m.id === member.id) || pCount === 0) {
          utilitiesShare += u.amount / pCount;
        }
      });
    }

    // Rent Share (split only among members included in rent)
    const isRentIncluded = isCategoryIncluded(member, 'rent');
    const rentShare = includeCategories.rent && rent && isRentIncluded ? rent.totalRent / rentMemberCount : 0;

    // Total actual expense member SHOULD pay
    const totalActualExpense = messExpenseShare + generalExpenseShare + utilitiesShare + rentShare;

    // Calculate total amount spent/paid by this member out of pocket
    let totalAmountSpent = 0;

    // Paid in Mess Expenses
    if (includeCategories.mess) {
      totalAmountSpent += messExpenses
        .filter((e) => e.paidById === member.id)
        .reduce((sum, e) => sum + e.amount, 0);
    }

    // Paid in General Expenses
    if (includeCategories.general) {
      totalAmountSpent += generalExpenses
        .filter((e) => e.paidById === member.id)
        .reduce((sum, e) => sum + e.amount, 0);
    }

    // Paid in Utilities
    if (includeCategories.utilities) {
      totalAmountSpent += filteredUtilities
        .filter((u) => u.paidById === member.id && u.status === 'paid')
        .reduce((sum, u) => sum + u.amount, 0);
    }

    // Paid in Rent (if member paid total rent or contribution)
    if (includeCategories.rent && rent) {
      if (rent.paidById === member.id) {
        totalAmountSpent += rent.totalRent;
      }
    }

    const balance = totalAmountSpent - totalActualExpense;

    return {
      memberId: member.id,
      memberName: member.name,
      messExpenseShare,
      generalExpenseShare,
      utilitiesShare,
      rentShare,
      totalActualExpense,
      totalAmountSpent,
      balance,
    };
  });

  // 5. Calculate Debt Minimization Settlement Flows ("Who pays whom")
  const settlementFlows: SettlementFlow[] = [];

  // Clone balances
  const balances = memberSummaries.map((m) => ({
    memberId: m.memberId,
    memberName: m.memberName,
    amount: m.balance,
  }));

  let debtors = balances.filter((b) => b.amount < -0.01).sort((a, b) => a.amount - b.amount); // Most negative first
  let creditors = balances.filter((b) => b.amount > 0.01).sort((a, b) => b.amount - a.amount); // Most positive first

  let flowIndex = 1;
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const oweAmount = Math.abs(debtor.amount);
    const receiveAmount = creditor.amount;

    const transferAmount = Math.min(oweAmount, receiveAmount);

    if (transferAmount > 0.01) {
      settlementFlows.push({
        id: `flow-${flowIndex++}`,
        fromMemberId: debtor.memberId,
        fromMemberName: debtor.memberName,
        toMemberId: creditor.memberId,
        toMemberName: creditor.memberName,
        amount: Math.round(transferAmount * 100) / 100,
        status: 'pending',
      });
    }

    debtor.amount += transferAmount;
    creditor.amount -= transferAmount;

    if (Math.abs(debtor.amount) < 0.01) i++;
    if (Math.abs(creditor.amount) < 0.01) j++;
  }

  return {
    totalMessExpenses,
    totalGeneralExpenses,
    totalUtilities,
    totalRent,
    grandTotalExpenses,
    totalMessDays,
    dailyMealRate,
    memberSummaries,
    settlementFlows,
  };
}
