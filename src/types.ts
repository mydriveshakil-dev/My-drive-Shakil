export type BillingCycleType = 'current' | 'previous';

export type ExpenseCategory = 'mess' | 'general';

export interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  mobileNumber?: string;
  password?: string;
  avatar: string;
  daysPresent?: number; // Optional
  active: boolean;
  includedCategories?: string[]; // Expense types/categories this member is included in
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
  temporaryMembers?: string[];
  isLocked?: boolean;
}

export interface NoticeViewerRecord {
  userId?: string;
  userName: string;
  userAvatar?: string;
  viewCount: number;
  lastViewedAtMs: number;
  lastViewedAt?: string;
}

export interface GroupNotice {
  id: string;
  groupId: string;
  authorId: string;
  authorName: string;
  title?: string;
  content: string;
  durationDays: 1 | 3 | 7 | 15 | 30 | number;
  publishedAt: string; // ISO string
  publishedAtMs: number;
  expiresAtMs: number;
  targetScope?: 'selected' | 'all'; // 'selected' (specific group) or 'all' (all groups)
  targetGroupIds?: string[];
  seenBy?: Record<string, NoticeViewerRecord> | NoticeViewerRecord[];
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
  notice?: GroupNotice | null;
}

export interface MemberSummary {
  memberId: string;
  memberName: string;
  daysPresent?: number;
  messExpenseShare: number;
  generalExpenseShare: number;
  utilitiesShare: number;
  rentShare: number;
  totalActualExpense: number; // Total they SHOULD pay
  totalAmountSpent: number; // Total they ALREADY paid
  balance: number; // Positive = Overpaid (Will Receive), Negative = Underpaid (DUE)
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
  webAppUrl?: string;
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
  name?: string;
  email: string;
  mobileNumber: string;
  cleanMobile?: string;
  localMobile?: string;
  password?: string;
  idNumber?: string;
  identity?: UaeVisaIdentity | null;
  isLoggedIn: boolean;
  role: 'admin' | 'user';
  linkedGroupId?: string | null;
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  groupId?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: string;
  createdMs?: number;
  createdAt?: string;
  type?: 'text' | 'expense_added' | 'settlement_update' | 'bill_reminder';
  amount?: number;
}

export interface PayToTransaction {
  id: string;
  groupId: string;
  payById: string;       // Paid By (Lender) member ID
  payByName: string;     // Paid By (Lender) member Name
  payToId: string;       // Paid To (Borrower) member ID
  payToName: string;     // Paid To (Borrower) member Name
  purpose: string;       // Purpose of transaction
  amount: number;        // Loaned amount
  date: string;          // YYYY-MM-DD HH:mm or formatted short date
  returnDate?: string;   // Optional promised return date (YYYY-MM-DD)
  status: 'pending' | 'paid'; // 'pending' (Active summary / Red notice) vs 'paid' (Moved to Previous Record)
  createdAtMs: number;   // Timestamp for sorting (oldest first)
  updatedAtMs?: number;
}
