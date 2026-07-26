export type BillingCycleType = 'current' | 'previous';

export type ExpenseCategory = 'mess' | 'general';

export interface Member {
  id: string;
  name: string;
  email?: string;
  avatar: string;
  daysPresent: number; // For mess calculation
  active: boolean;
}

export interface Expense {
  id: string;
  groupId: string;
  type: ExpenseCategory;
  title: string;
  amount: number;
  paidById: string;
  sharedWithIds: string[];
  date: string; // YYYY-MM-DD
  receiptUrl?: string;
  note?: string;
  cycle: string; // e.g., "2026-07"
  createdAt: string;
}

export interface UtilityBill {
  id: string;
  groupId: string;
  name: string;
  category: 'electricity' | 'internet' | 'water' | 'gas' | 'cleaner' | 'other';
  amount: number;
  dueDate: string;
  paidById: string;
  status: 'paid' | 'pending';
  cycle: string;
  note?: string;
}

export interface RentContribution {
  id: string;
  groupId: string;
  totalRent: number;
  cycle: string;
  paidById: string;
  dueDate: string;
  status: 'paid' | 'pending';
  perMemberAmount: number;
  paidMemberIds: string[];
}

export interface Group {
  id: string;
  name: string;
  currency: string;
  billingCycle: string; // e.g. "01 Jul - 31 Jul 2026"
  cycleId: string; // "2026-07"
  status: 'pending' | 'completed';
  isHeld?: boolean; // Admin can hold/pause group
  spreadsheetId?: string;
  createdAt: string;
  members: Member[];
}

export interface MemberSummary {
  memberId: string;
  memberName: string;
  daysPresent: number;
  messExpenseShare: number;
  generalExpenseShare: number;
  utilitiesShare: number;
  rentShare: number;
  totalActualExpense: number; // Total they SHOULD pay
  totalAmountSpent: number; // Total they ALREADY paid
  balance: number; // Positive = Overpaid (Will Receive), Negative = Underpaid (Owes Money)
}

export interface SettlementFlow {
  id: string;
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  amount: number;
  status: 'pending' | 'settled';
}

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  sheetName: string;
  autoSync: boolean;
  lastSyncedAt: string | null;
  status: 'connected' | 'disconnected' | 'syncing' | 'error';
  errorMessage?: string;
}

export interface UaeVisaIdentity {
  idNumber: string;
  fullName: string;
  photoUrl?: string;
  visaIssueDate: string;
  visaExpiryDate: string;
  isExpired: boolean;
  occupation: string;
  nationality: string;
  passportNumber: string;
  sponsorName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'NOT_FOUND';
}

export interface UserAuthProfile {
  email: string;
  mobileNumber: string;
  idNumber: string;
  identity: UaeVisaIdentity | null;
  isLoggedIn: boolean;
  role: 'admin' | 'user';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  type?: 'text' | 'expense_added' | 'settlement_update' | 'bill_reminder';
  amount?: number;
}
