import { Group, Expense, UtilityBill, RentContribution, GoogleSheetsConfig, ChatMessage } from '../types';

export const INITIAL_GROUP: Group = {
  id: 'group-room-1',
  name: 'Main Mess Room',
  currency: 'AED',
  billingCycle: '01 Jul - 31 Jul 2026',
  cycleId: '2026-07',
  status: 'pending',
  createdAt: new Date().toISOString().split('T')[0],
  members: [],
};

// No demo expenses - clean sheet state
export const INITIAL_EXPENSES: Expense[] = [];

// No demo utilities - clean sheet state
export const INITIAL_UTILITIES: UtilityBill[] = [];

export const INITIAL_RENT: RentContribution = {
  id: 'rent-1',
  groupId: 'group-room-3',
  totalRent: 0,
  cycle: '2026-07',
  paidById: 'm1',
  dueDate: '2026-07-01',
  status: 'pending',
  perMemberAmount: 0,
  paidMemberIds: [],
};

export const INITIAL_SHEETS_CONFIG: GoogleSheetsConfig = {
  spreadsheetId: '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM',
  sheetName: 'Expenses_Utilities_Master_2026',
  autoSync: true,
  lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  status: 'connected',
};

// No demo chat messages
export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [];
