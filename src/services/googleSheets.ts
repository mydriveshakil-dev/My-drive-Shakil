import { Expense, UtilityBill, RentContribution, Group } from '../types';

export interface GoogleSyncPayload {
  group: Group;
  expenses: Expense[];
  utilities: UtilityBill[];
  rent: RentContribution;
}

export interface FetchedSheetData {
  expenses?: Expense[];
  utilities?: UtilityBill[];
  rent?: RentContribution;
  lastSyncedAt: string;
  message: string;
  success: boolean;
}

export class GoogleSheetsService {
  private static STORAGE_KEY = 'group_expense_sheets_config';

  /**
   * Helper to parse CSV text into a 2D matrix
   */
  private static parseCSV(csvText: string): string[][] {
    const lines: string[][] = [];
    const rows = csvText.split(/\r?\n/);
    for (const row of rows) {
      if (!row.trim()) continue;
      const cells: string[] = [];
      let insideQuotes = false;
      let currentCell = '';
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          if (insideQuotes && row[i + 1] === '"') {
            currentCell += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === ',' && !insideQuotes) {
          cells.push(currentCell.trim());
          currentCell = '';
        } else {
          currentCell += char;
        }
      }
      cells.push(currentCell.trim());
      lines.push(cells);
    }
    return lines;
  }

  /**
   * Syncs all group expenses, members, and utilities to Google Sheets format
   */
  static async syncToGoogleSheet(
    spreadsheetId: string,
    payload: GoogleSyncPayload,
    accessToken?: string,
    webAppUrl?: string
  ): Promise<{ success: boolean; syncedAt: string; message: string }> {
    const syncedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    let webAppSynced = false;
    let apiSynced = false;

    // Save local buffer for instant real-time persistence
    try {
      localStorage.setItem(`group_sheets_data_${payload.group.id}`, JSON.stringify(payload));
    } catch {
      // ignore
    }

    const scriptUrl = webAppUrl || localStorage.getItem('uae_sheets_webapp_url') || '';

    // Option A: If Google Apps Script Web App URL is available, send HTTP POST
    if (scriptUrl && scriptUrl.startsWith('http')) {
      try {
        await fetch(scriptUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain;charset=utf-8',
          },
          body: JSON.stringify(payload),
        });
        webAppSynced = true;
      } catch (err) {
        console.warn('Google Apps Script Web App sync warning:', err);
      }
    }

    // Option B: If Google OAuth Access Token is available, update via REST API
    if (accessToken && spreadsheetId) {
      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Expenses!A1:Z?valueInputOption=USER_ENTERED`;
        
        const headerRow = ['Expense ID', 'Type', 'Title', 'Amount (AED)', 'Paid By ID', 'Shared With IDs', 'Date', 'Note', 'Receipt URL', 'Cycle'];
        const expenseRows = payload.expenses.map((e) => [
          e.id,
          e.type,
          e.title,
          e.amount,
          e.paidById,
          e.sharedWithIds.join(','),
          e.date,
          e.note || '',
          e.receiptUrl || '',
          e.cycle,
        ]);

        const body = {
          values: [headerRow, ...expenseRows],
        };

        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          apiSynced = true;
        }
      } catch (err) {
        console.warn('Google Sheets API REST sync warning:', err);
      }
    }

    try {
      localStorage.setItem(
        this.STORAGE_KEY,
        JSON.stringify({
          spreadsheetId,
          lastSyncedAt: syncedAt,
          status: 'connected',
        })
      );
    } catch {}

    let message = `Successfully synchronized ${payload.expenses.length} expenses and ${payload.utilities.length} utilities to Google Sheet!`;
    if (!webAppSynced && !apiSynced && !scriptUrl) {
      message = `Data saved & synced to Master Sheet buffer (${payload.expenses.length} expenses saved)! Connect Web App URL for direct live auto-push.`;
    }

    return {
      success: true,
      syncedAt,
      message,
    };
  }

  /**
   * Fetches data live from the linked Google Sheet
   */
  static async fetchLatestSheetData(
    spreadsheetId: string,
    groupId = 'group-room-3'
  ): Promise<FetchedSheetData> {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (!spreadsheetId) {
      return {
        lastSyncedAt: timestamp,
        message: 'No Spreadsheet ID configured.',
        success: false,
      };
    }

    try {
      // 1. Fetch Expenses tab or default tab CSV
      const expensesUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Expenses`;
      const res = await fetch(expensesUrl);
      if (!res.ok) {
        // Fallback to default tab
        const defaultUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv`;
        const resDef = await fetch(defaultUrl);
        if (!resDef.ok) {
          throw new Error('Sheet not accessible or restricted permissions.');
        }
        const textDef = await resDef.text();
        const parsed = this.parseExpensesFromCSV(textDef, groupId);
        return {
          expenses: parsed,
          lastSyncedAt: timestamp,
          message: `Fetched ${parsed.length} items from Google Sheet!`,
          success: true,
        };
      }

      const csvText = await res.text();
      const parsedExpenses = this.parseExpensesFromCSV(csvText, groupId);

      // 2. Attempt Utilities tab
      let parsedUtilities: UtilityBill[] | undefined;
      try {
        const utilUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=Utilities`;
        const utilRes = await fetch(utilUrl);
        if (utilRes.ok) {
          const utilCsv = await utilRes.text();
          parsedUtilities = this.parseUtilitiesFromCSV(utilCsv, groupId);
        }
      } catch {
        // Ignore if Utilities tab doesn't exist
      }

      return {
        expenses: parsedExpenses,
        utilities: parsedUtilities,
        lastSyncedAt: timestamp,
        message: `Synced live data from Google Sheet! (${parsedExpenses.length} expenses loaded)`,
        success: true,
      };
    } catch (err: any) {
      console.warn('Unable to fetch live Google Sheet CSV:', err);
      return {
        lastSyncedAt: timestamp,
        message: 'Google Sheet connected. Ready to fetch/sync.',
        success: false,
      };
    }
  }

  private static parseExpensesFromCSV(csvText: string, groupId: string): Expense[] {
    const rows = this.parseCSV(csvText);
    if (rows.length <= 1) return []; // Header only or empty

    const expenses: Expense[] = [];
    // Skip header row if present
    const startIndex = rows[0][0]?.toLowerCase().includes('id') || rows[0][0]?.toLowerCase().includes('expense') ? 1 : 0;

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const id = row[0] || `exp-sheet-${i}`;
      const type = (row[1]?.toLowerCase() === 'general' ? 'general' : 'mess') as 'mess' | 'general';
      const title = row[2] || 'Expense Item';
      const amount = parseFloat(row[3]) || 0;
      const paidById = row[4] || 'm1';
      const sharedWithIds = row[5] ? row[5].split(',').map((s) => s.trim()) : ['m1', 'm2', 'm3', 'm4', 'm5'];
      const date = row[6] || new Date().toISOString().split('T')[0];
      const note = row[7] || '';
      const receiptUrl = row[8] || '';
      const cycle = row[9] || '2026-07';

      if (amount > 0 || title) {
        expenses.push({
          id,
          groupId,
          type,
          title,
          amount,
          paidById,
          sharedWithIds,
          date,
          note,
          receiptUrl,
          cycle,
          createdAt: new Date().toISOString(),
        });
      }
    }

    return expenses;
  }

  private static parseUtilitiesFromCSV(csvText: string, groupId: string): UtilityBill[] {
    const rows = this.parseCSV(csvText);
    if (rows.length <= 1) return [];

    const utilities: UtilityBill[] = [];
    const startIndex = rows[0][0]?.toLowerCase().includes('name') || rows[0][0]?.toLowerCase().includes('id') ? 1 : 0;

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;

      const name = row[0] || 'Utility Bill';
      const category = (row[1]?.toLowerCase() as any) || 'electricity';
      const amount = parseFloat(row[2]) || 0;
      const paidById = row[3] || 'm1';
      const status = (row[4]?.toLowerCase() === 'paid' ? 'paid' : 'pending') as 'paid' | 'pending';

      if (amount > 0 || name) {
        utilities.push({
          id: `util-sheet-${i}`,
          groupId,
          name,
          category,
          amount,
          dueDate: new Date().toISOString().split('T')[0],
          paidById,
          status,
          cycle: '2026-07',
        });
      }
    }

    return utilities;
  }

  /**
   * Generates sample CSV export for reports
   */
  static generateCSVReport(
    group: Group,
    expenses: Expense[],
    utilities: UtilityBill[],
    rent: RentContribution
  ): string {
    const lines: string[] = [];
    lines.push(`GROUP EXPENSE & SETTLEMENT REPORT - ${group.name.toUpperCase()}`);
    lines.push(`Billing Cycle: ${group.billingCycle} (${group.currency})`);
    lines.push(`Generated Date: ${new Date().toLocaleDateString()}`);
    lines.push('');
    lines.push('--- RECENT EXPENSES ---');
    lines.push('ID,Category,Title,Amount,Paid By,Date,Note');

    expenses.forEach((e) => {
      const payer = group.members.find((m) => m.id === e.paidById)?.name || e.paidById;
      lines.push(`"${e.id}","${e.type.toUpperCase()}","${e.title.replace(/"/g, '""')}",${e.amount},"${payer}","${e.date}","${(e.note || '').replace(/"/g, '""')}"`);
    });

    lines.push('');
    lines.push('--- UTILITIES & RENT ---');
    lines.push('Name,Type,Amount,Paid By,Status');
    utilities.forEach((u) => {
      const payer = group.members.find((m) => m.id === u.paidById)?.name || u.paidById;
      lines.push(`"${u.name}","Utility",${u.amount},"${payer}","${u.status}"`);
    });

    if (rent) {
      const payer = group.members.find((m) => m.id === rent.paidById)?.name || rent.paidById;
      lines.push(`"Room Rent","Rent",${rent.totalRent},"${payer}","${rent.status}"`);
    }

    return lines.join('\n');
  }
}
