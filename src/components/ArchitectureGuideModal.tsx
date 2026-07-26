import React, { useState } from 'react';
import { X, Code, Copy, Check, FileSpreadsheet, Server, Layers, ArrowRight, ShieldCheck } from 'lucide-react';
import { GlassContainer } from './GlassContainer';

interface ArchitectureGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureGuideModal: React.FC<ArchitectureGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'architecture' | 'sheetsApi' | 'flutterCode' | 'settlementAlgo'>('architecture');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  const copyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const flutterHomeScreenCode = `// FLUTTER HOME DASHBOARD UI (Dark Green & Gold Theme)
// lib/screens/home_dashboard.dart
import 'package:flutter/material.dart';

class HomeDashboardScreen extends StatelessWidget {
  const HomeDashboardScreen({Key? key}) : super(key: key);

  static const Color primaryDarkGreen = Color(0xFF0B4A3F);
  static const Color accentGold = Color(0xFFF9A826);
  static const Color bgOffWhite = Color(0xFFF8FAF9);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: bgOffWhite,
      appBar: AppBar(
        backgroundColor: primaryDarkGreen,
        elevation: 0,
        title: const Text('Room No 3 (Al Rashidiya)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync, color: accentGold),
            onPressed: () {
              // Trigger Google Sheets Sync
            },
          )
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Total Expense Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: primaryDarkGreen,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(color: primaryDarkGreen.withOpacity(0.3), blurRadius: 12, offset: const Offset(0, 6))
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Total Group Expenses', style: TextStyle(color: Colors.emerald, fontSize: 12)),
                  const SizedBox(height: 8),
                  const Text('1,382.50 AED', style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.black)),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: const [
                      Text('Cycle: 01 Jul - 31 Jul 2026', style: TextStyle(color: Colors.white70, fontSize: 12)),
                      Text('Master Google Sheet Synced', style: TextStyle(color: accentGold, fontWeight: FontWeight.bold, fontSize: 12)),
                    ],
                  )
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Quick Action Buttons
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildQuickAction(Icons.receipt_long, 'Expenses', () {}),
                _buildQuickAction(Icons.bolt, 'Utilities', () {}),
                _buildQuickAction(Icons.home, 'Rent', () {}),
                _buildQuickAction(Icons.pie_chart, 'Report', () {}),
              ],
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: accentGold,
        child: const Icon(Icons.add, color: primaryDarkGreen, size: 32),
        onPressed: () {},
      ),
    );
  }

  Widget _buildQuickAction(IconData icon, String label, VoidCallback onTap) {
    return Column(
      children: [
        CircleAvatar(
          radius: 24,
          backgroundColor: Colors.white,
          child: Icon(icon, color: primaryDarkGreen),
        ),
        const SizedBox(height: 6),
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
      ],
    );
  }
}`;

  const flutterAddExpenseCode = `// FLUTTER ADD EXPENSE SCREEN
// lib/screens/add_expense_screen.dart
import 'package:flutter/material.dart';

class AddExpenseScreen extends StatefulWidget {
  const AddExpenseScreen({Key? key}) : super(key: key);

  @override
  _AddExpenseScreenState createState() => _AddExpenseScreenState();
}

class _AddExpenseScreenState extends State<AddExpenseScreen> {
  String _category = 'mess'; // mess or general
  final TextEditingController _amountController = TextEditingController();
  final TextEditingController _titleController = TextEditingController();
  String _paidBy = 'm1'; // Kazi Mahadi

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Room Expense'),
        backgroundColor: const Color(0xFF0B4A3F),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: ListView(
          children: [
            // Category Segmented Control
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'mess', label: Text('Mess Bill'), icon: Icon(Icons.restaurant)),
                ButtonSegment(value: 'general', label: Text('General Expense'), icon: Icon(Icons.shopping_bag)),
              ],
              selected: {_category},
              onSelectionChanged: (Set<String> newSelection) {
                setState(() {
                  _category = newSelection.first;
                });
              },
            ),
            const SizedBox(height: 20),

            // Amount Input
            TextField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                labelText: 'Amount (AED)',
                prefixText: 'AED ',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 16),

            // Title
            TextField(
              controller: _titleController,
              decoration: const InputDecoration(
                labelText: 'Description / Item Title',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 24),

            // Save & Sync Button
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0B4A3F),
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              icon: const Icon(Icons.cloud_upload, color: Color(0xFFF9A826)),
              label: const Text('Save & Sync to Google Sheet', style: TextStyle(fontSize: 16, color: Colors.white)),
              onPressed: () async {
                // Call GoogleSheetsService.insertExpenseRow(...)
              },
            ),
          ],
        ),
      ),
    );
  }
}`;

  const flutterGoogleSheetsApiCode = `// FLUTTER GOOGLE SHEETS API SERVICE
// lib/services/google_sheets_service.dart
import 'package:gsheets/gsheets.dart';

class GoogleSheetsApiManager {
  // Shared Master Google Sheet Credentials
  static const _credentials = r'''
  {
    "type": "service_account",
    "project_id": "room-expense-tracker",
    "private_key_id": "abcdef123456",
    "private_key": "-----BEGIN PRIVATE KEY-----\\nYOUR_SHARED_GMAIL_PRIVATE_KEY\\n-----END PRIVATE KEY-----\\n",
    "client_email": "room-expense-sync@room-expense-tracker.iam.gserviceaccount.com",
    "client_id": "109876543210"
  }
  ''';

  static const _spreadsheetId = '1a2b3c4d5e6f7g8h9_room3_master_sheet';

  late GSheets _gsheets;
  Spreadsheet? _spreadsheet;
  Worksheet? _expensesSheet;

  Future<void> init() async {
    _gsheets = GSheets(_credentials);
    _spreadsheet = await _gsheets.spreadsheet(_spreadsheetId);
    _expensesSheet = _spreadsheet?.worksheetByTitle('Expenses');
  }

  // Insert Expense row directly into Google Sheet
  Future<bool> insertExpense({
    required String id,
    required String type,
    required String title,
    required double amount,
    required String paidBy,
    required String date,
  }) async {
    if (_expensesSheet == null) await init();
    return await _expensesSheet!.values.appendRow([
      id,
      type,
      title,
      amount.toString(),
      paidBy,
      date,
      DateTime.now().toIso8601String(),
    ]);
  }

  // Fetch all expenses from Google Sheet in real-time
  Future<List<Map<String, String>>> fetchExpenses() async {
    if (_expensesSheet == null) await init();
    return await _expensesSheet!.values.map.allRows() ?? [];
  }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-2 sm:p-4 animate-in fade-in">
      <GlassContainer
        variant="modal"
        blur="3xl"
        className="w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-white/40"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B4A3F] to-[#145C4E] text-white p-5 flex items-center justify-between border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F9A826] text-[#0B4A3F] flex items-center justify-center font-black">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black text-emerald-200 uppercase tracking-wider">
                Mobile & Web Architecture Guide
              </span>
              <h2 className="text-lg md:text-xl font-black tracking-tight">
                Single Shared Google Account & Sheets Integration
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all border border-white/20 active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/20 bg-white/10 px-4 overflow-x-auto backdrop-blur-md">
          {[
            { id: 'architecture', label: '1. Single Account Architecture' },
            { id: 'sheetsApi', label: '2. Google Sheets API Integration' },
            { id: 'flutterCode', label: '3. Flutter UI Code (Home & Add)' },
            { id: 'settlementAlgo', label: '4. Debt Settlement Algorithm' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-[#F9A826] text-[#F9A826] bg-white/15'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-white text-xs sm:text-sm">
          {/* TAB 1: Architecture Overview */}
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="bg-emerald-500/20 border border-emerald-400/40 backdrop-blur-xl rounded-2xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-[#F9A826] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-emerald-200 text-base">
                    Single Shared Account Architecture Strategy
                  </h3>
                  <p className="text-xs text-emerald-100/80 mt-1">
                    All group members (up to 10 room members) log in on their respective mobile devices using <strong>one single shared Master Gmail account</strong> (e.g. <code>mydriveshakil@gmail.com</code>). The app directly reads and writes to a central Master Google Sheet created inside this account's Google Drive.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border border-white/25 rounded-2xl p-4 bg-white/10 backdrop-blur-xl space-y-2">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <Server className="w-4 h-4 text-[#F9A826]" />
                    Client-Side Flutter / Web Direct Sync
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-emerald-100/80">
                    <li>Uses standard Google Sign-In with <code>https://www.googleapis.com/auth/spreadsheets</code> scope.</li>
                    <li>Or uses a shared Service Account JSON key associated with the Google Cloud Project.</li>
                    <li>Reads <code>Expenses</code>, <code>Members</code>, <code>Utilities</code>, and <code>Settlements</code> tabs in real-time.</li>
                  </ul>
                </div>

                <div className="border border-white/25 rounded-2xl p-4 bg-white/10 backdrop-blur-xl space-y-2">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-[#F9A826]" />
                    Google Sheets Master Data Schema
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-emerald-100/80">
                    <li><strong>Expenses Tab:</strong> ID, Type, Title, Amount, PaidBy, Date, Note.</li>
                    <li><strong>Members Tab:</strong> ID, Name, Email, DaysPresent.</li>
                    <li><strong>Utilities Tab:</strong> ID, BillName, Amount, DueDate, Status.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Google Sheets API Code */}
          {activeTab === 'sheetsApi' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-base">
                  Google Sheets API Integration Functions (Dart / gsheets)
                </h3>
                <button
                  onClick={() => copyCode(flutterGoogleSheetsApiCode, 1)}
                  className="bg-[#F9A826] text-[#0B4A3F] px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 hover:bg-[#e59819] border border-white/30"
                >
                  {copiedIndex === 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedIndex === 1 ? 'Copied!' : 'Copy Dart API Code'}</span>
                </button>
              </div>

              <pre className="bg-black/50 border border-white/25 text-emerald-300 p-4 rounded-2xl overflow-x-auto text-xs font-mono leading-relaxed backdrop-blur-xl">
                {flutterGoogleSheetsApiCode}
              </pre>
            </div>
          )}

          {/* TAB 3: Flutter UI Code */}
          {activeTab === 'flutterCode' && (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">Flutter Home Dashboard Screen UI</h3>
                  <button
                    onClick={() => copyCode(flutterHomeScreenCode, 2)}
                    className="bg-[#F9A826] text-[#0B4A3F] px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 hover:bg-[#e59819] border border-white/30"
                  >
                    {copiedIndex === 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedIndex === 2 ? 'Copied!' : 'Copy Flutter Home UI'}</span>
                  </button>
                </div>
                <pre className="bg-black/50 border border-white/25 text-amber-300 p-4 rounded-2xl overflow-x-auto text-xs font-mono leading-relaxed backdrop-blur-xl">
                  {flutterHomeScreenCode}
                </pre>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">Flutter Add Expense Screen UI</h3>
                  <button
                    onClick={() => copyCode(flutterAddExpenseCode, 3)}
                    className="bg-[#F9A826] text-[#0B4A3F] px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 hover:bg-[#e59819] border border-white/30"
                  >
                    {copiedIndex === 3 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedIndex === 3 ? 'Copied!' : 'Copy Add Expense UI'}</span>
                  </button>
                </div>
                <pre className="bg-black/50 border border-white/25 text-blue-300 p-4 rounded-2xl overflow-x-auto text-xs font-mono leading-relaxed backdrop-blur-xl">
                  {flutterAddExpenseCode}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: Settlement Algorithm */}
          {activeTab === 'settlementAlgo' && (
            <div className="space-y-4">
              <h3 className="font-bold text-white text-base">
                Exact Mess Meal Rate & Debt Minimization Math
              </h3>
              <div className="bg-white/10 border border-white/25 backdrop-blur-xl p-4 rounded-2xl space-y-3 text-xs text-emerald-100">
                <p><strong>1. Daily Meal Rate Formula:</strong></p>
                <code className="block bg-slate-900/80 border border-white/20 p-2 rounded text-amber-300 font-mono">
                  Daily Meal Rate = Total Mess Expenses / Sum of (All Members' Days Present)
                </code>

                <p><strong>2. Individual Member Actual Expense:</strong></p>
                <code className="block bg-slate-900/80 border border-white/20 p-2 rounded text-amber-300 font-mono">
                  Member Share = (Member Days Present * Daily Meal Rate) + (General Expenses / 5) + (Utilities / 5) + (Rent / 5)
                </code>

                <p><strong>3. Member Balance:</strong></p>
                <code className="block bg-slate-900/80 border border-white/20 p-2 rounded text-amber-300 font-mono">
                  Balance = Total Paid Out of Pocket - Member Actual Expense Share
                </code>
                <p className="text-emerald-200/70">
                  Positive balance = Overpaid (Gets money back). Negative balance = Underpaid (Owes money).
                </p>
              </div>
            </div>
          )}
        </div>
      </GlassContainer>
    </div>
  );
};
