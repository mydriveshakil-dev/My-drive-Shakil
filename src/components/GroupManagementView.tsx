import React, { useState } from 'react';
import { Group, Member, GoogleSheetsConfig, UserAuthProfile } from '../types';
import { GlassContainer } from './GlassContainer';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import {
  Users,
  Plus,
  Trash2,
  Edit,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  FileSpreadsheet,
  Globe,
  Code,
  DollarSign,
  Coins,
  ArrowRightLeft,
  PauseCircle,
  PlayCircle,
  FolderPlus,
  Lock,
  AlertCircle,
} from 'lucide-react';

interface GroupManagementViewProps {
  group: Group;
  allGroups?: Group[];
  sheetsConfig: GoogleSheetsConfig;
  onAddMember: (member: Omit<Member, 'id'>) => void;
  onUpdateMemberDays: (id: string, days: number) => void;
  onRemoveMember: (id: string) => void;
  onSyncSheetsNow: () => void;
  onOpenArchGuide: () => void;
  isSyncing: boolean;
  preferredCurrency: string;
  onOpenCurrencySettings: () => void;
  currentUser?: UserAuthProfile | null;
  onOpenLoginModal?: () => void;
  onCreateNewGroup?: (name: string, currency: string) => void;
  onToggleHoldGroup?: (groupId: string) => void;
  onRemoveGroup?: (groupId: string) => void;
  onChangeBaseCurrency?: (newCurrency: string) => void;
  onUpdateSpreadsheetConfig?: (spreadsheetId: string, webAppUrl?: string) => void;
}

export const GroupManagementView: React.FC<GroupManagementViewProps> = ({
  group,
  allGroups = [],
  sheetsConfig,
  onAddMember,
  onUpdateMemberDays,
  onRemoveMember,
  onSyncSheetsNow,
  onOpenArchGuide,
  isSyncing,
  preferredCurrency,
  onOpenCurrencySettings,
  currentUser,
  onOpenLoginModal,
  onCreateNewGroup,
  onToggleHoldGroup,
  onRemoveGroup,
  onChangeBaseCurrency,
  onUpdateSpreadsheetConfig,
}) => {
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');

  // Admin New Group Modal State
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCurrency, setNewGroupCurrency] = useState('AED');

  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<Group | null>(null);
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<Member | null>(null);

  // Google Sheet Config States
  const [isEditingSheetConfig, setIsEditingSheetConfig] = useState(false);
  const [sheetIdInput, setSheetIdInput] = useState(group.spreadsheetId || '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM');
  const [webAppUrlInput, setWebAppUrlInput] = useState(sheetsConfig.webAppUrl || localStorage.getItem('uae_sheets_webapp_url') || '');
  const [showAppsScriptModal, setShowAppsScriptModal] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  const isAdmin = currentUser?.role === 'admin';

  const handleSaveSheetConfigSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateSpreadsheetConfig) {
      onUpdateSpreadsheetConfig(sheetIdInput.trim(), webAppUrlInput.trim());
    }
    setIsEditingSheetConfig(false);
    triggerHaptic(hapticPatterns.success);
  };

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberPhone.trim()) return;

    const initials =
      newMemberName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2) || 'MB';

    onAddMember({
      name: newMemberName.trim(),
      email: newMemberPhone.trim(),
      phone: newMemberPhone.trim(),
      mobileNumber: newMemberPhone.trim(),
      avatar: initials,
      daysPresent: 30,
      active: true,
    });

    setNewMemberName('');
    setNewMemberPhone('');
    setShowAddMember(false);
  };

  const handleCreateGroupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      if (onOpenLoginModal) onOpenLoginModal();
      return;
    }
    if (!newGroupName.trim()) return;

    if (onCreateNewGroup) {
      onCreateNewGroup(newGroupName.trim(), newGroupCurrency);
      triggerHaptic(hapticPatterns.success);
    }

    setNewGroupName('');
    setShowCreateGroup(false);
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Top Banner */}
      <GlassContainer
        variant="emerald"
        blur="3xl"
        className="p-6 md:p-8 rounded-3xl border border-white/30 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-black text-emerald-200 uppercase tracking-wider bg-white/15 px-3.5 py-1 rounded-full border border-white/20 backdrop-blur-md">
              Single Master Gmail Account Setup
            </span>
            {isAdmin ? (
              <span className="bg-amber-400 text-emerald-950 text-xs font-black px-3 py-1 rounded-full border border-white/40 flex items-center gap-1 shadow-md">
                <ShieldCheck className="w-4 h-4" />
                APP ADMIN UNLOCKED
              </span>
            ) : (
              <span
                onClick={onOpenLoginModal}
                className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/30 flex items-center gap-1 cursor-pointer transition-all"
              >
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                General Member Mode
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black text-white">Group & Member Settings</h2>
          <p className="text-xs text-emerald-100 font-medium mt-1">
            Manage room members, mess days present, and administrative controls
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={onOpenArchGuide}
            className="bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 border border-white/30 self-start md:self-auto cursor-pointer"
          >
            <Code className="w-4 h-4" />
            <span>Flutter & API Architecture Guide</span>
          </button>
        )}
      </GlassContainer>

      {/* ADMIN PERMISSION CONTROL SECTION (Visible ONLY to App Admin) */}
      {isAdmin && (
        <GlassContainer variant="card" className="p-5 border border-amber-400/40 shadow-2xl space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/15 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-300 flex items-center justify-center font-bold border border-amber-400/40">
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white">App Admin Management Controls</h3>
                  <span className="bg-amber-400 text-emerald-950 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    FULL ACCESS
                  </span>
                </div>
                <p className="text-xs text-emerald-100/80">
                  Create new room groups, hold/pause groups, delete groups & modify base currency.
                </p>
              </div>
            </div>
          </div>

          {/* Group Held Status Warning Banner */}
          {group.isHeld && (
            <div className="bg-amber-500/20 border-2 border-amber-400 p-3.5 rounded-2xl flex items-center justify-between text-xs text-amber-200">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-amber-300 shrink-0" />
                <span>This room group is currently on <strong>HOLD / PAUSED</strong> by the App Admin.</span>
              </div>
              {onToggleHoldGroup && (
                <button
                  onClick={() => onToggleHoldGroup(group.id)}
                  className="bg-amber-400 text-emerald-950 font-black px-3 py-1 rounded-xl text-xs hover:bg-amber-300 transition-all cursor-pointer"
                >
                  Resume Group
                </button>
              )}
            </div>
          )}

          {/* Admin Action Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Action 1: Create New Group */}
            <div className="bg-white/10 p-3.5 rounded-2xl border border-white/20 flex flex-col justify-between space-y-2 backdrop-blur-xl">
              <div>
                <span className="text-amber-300 font-extrabold uppercase text-[10px]">Group Creation</span>
                <div className="text-white font-bold text-xs mt-0.5">Create New Room Group</div>
              </div>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="w-full py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] shadow-md"
              >
                <FolderPlus className="w-4 h-4" />
                <span>+ Create Group</span>
              </button>
            </div>

            {/* Action 2: Hold / Pause Group */}
            <div className="bg-white/10 p-3.5 rounded-2xl border border-white/20 flex flex-col justify-between space-y-2 backdrop-blur-xl">
              <div>
                <span className="text-amber-300 font-extrabold uppercase text-[10px]">Group Status</span>
                <div className="text-white font-bold text-xs mt-0.5">
                  {group.isHeld ? 'Group is Paused' : 'Active Room State'}
                </div>
              </div>
              <button
                onClick={() => {
                  if (onToggleHoldGroup) onToggleHoldGroup(group.id);
                }}
                className={`w-full py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  group.isHeld
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-md'
                    : 'bg-amber-400 hover:bg-amber-500 text-emerald-950 shadow-md'
                }`}
              >
                {group.isHeld ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                <span>{group.isHeld ? 'Resume Group' : 'Hold / Pause Group'}</span>
              </button>
            </div>

            {/* Action 3: Change Base Currency */}
            <div className="bg-white/10 p-3.5 rounded-2xl border border-white/20 flex flex-col justify-between space-y-2 backdrop-blur-xl">
              <div>
                <span className="text-amber-300 font-extrabold uppercase text-[10px]">Base Currency</span>
                <div className="text-white font-bold text-xs mt-0.5">
                  Primary: <strong>{group.currency}</strong>
                </div>
              </div>
              <select
                value={group.currency}
                onChange={(e) => {
                  if (onChangeBaseCurrency) onChangeBaseCurrency(e.target.value);
                  triggerHaptic(hapticPatterns.click);
                }}
                className="w-full py-2 px-3 rounded-xl font-extrabold text-xs bg-[#F9A826] text-[#0B4A3F] border border-white/40 focus:outline-none cursor-pointer"
              >
                <option value="AED">AED (Dirham)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="INR">INR (Indian Rupee)</option>
                <option value="BDT">BDT (Bangladeshi Taka)</option>
                <option value="SAR">SAR (Saudi Riyal)</option>
              </select>
            </div>

            {/* Action 4: Delete / Remove Group */}
            <div className="bg-white/10 p-3.5 rounded-2xl border border-white/20 flex flex-col justify-between space-y-2 backdrop-blur-xl">
              <div>
                <span className="text-rose-300 font-extrabold uppercase text-[10px]">Delete Group</span>
                <div className="text-white font-bold text-xs mt-0.5">Remove Room Group</div>
              </div>
              <button
                onClick={() => setDeleteConfirmGroup(group)}
                className="w-full py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-rose-600 hover:bg-rose-700 text-white shadow-md"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Group</span>
              </button>
            </div>
          </div>
        </GlassContainer>
      )}

      {/* CREATE NEW GROUP MODAL FORM */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 overflow-x-hidden overflow-y-auto">
          <GlassContainer
            variant="emerald"
            blur="3xl"
            className="w-full max-w-md p-5 sm:p-6 rounded-3xl border border-white/30 shadow-2xl space-y-4 my-auto relative box-border max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-[#F9A826]" />
                <span>Create New Room Group</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateGroup(false)}
                className="text-white/60 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-emerald-200 mb-1">Group / Room Name *</label>
                <input
                  type="text"
                  placeholder="e.g. DSO Villa 402 / Silicon Oasis Room 3"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/25 rounded-2xl font-bold text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-emerald-200 mb-1">Base Room Currency *</label>
                <select
                  value={newGroupCurrency}
                  onChange={(e) => setNewGroupCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900 border border-white/25 rounded-2xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
                >
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="INR">INR - Indian Rupee</option>
                  <option value="BDT">BDT - Bangladeshi Taka</option>
                  <option value="SAR">SAR - Saudi Riyal</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black py-3.5 rounded-2xl text-sm shadow-xl transition-all cursor-pointer"
              >
                Confirm & Create Group
              </button>
            </form>
          </GlassContainer>
        </div>
      )}

      {/* DELETE GROUP CONFIRMATION MODAL */}
      {deleteConfirmGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 overflow-x-hidden overflow-y-auto">
          <GlassContainer
            variant="card"
            blur="3xl"
            className="w-full max-w-md p-5 sm:p-6 rounded-3xl border border-rose-500/50 shadow-2xl space-y-4 text-white my-auto relative box-border max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center gap-3 text-rose-400 border-b border-white/15 pb-3">
              <Trash2 className="w-6 h-6 shrink-0 text-rose-400" />
              <h3 className="text-lg font-black text-white">Delete Room Group</h3>
            </div>
            <p className="text-xs text-emerald-100 font-medium leading-relaxed">
              Are you sure you want to delete room group <strong className="text-amber-300">{deleteConfirmGroup.name}</strong>? All associated room data and member configurations for this group will be removed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteConfirmGroup(null)}
                className="px-4 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onRemoveGroup) onRemoveGroup(deleteConfirmGroup.id);
                  setDeleteConfirmGroup(null);
                  triggerHaptic(hapticPatterns.error);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer"
              >
                Confirm & Delete
              </button>
            </div>
          </GlassContainer>
        </div>
      )}

      {/* DELETE MEMBER CONFIRMATION MODAL */}
      {deleteConfirmMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 overflow-x-hidden overflow-y-auto">
          <GlassContainer
            variant="card"
            blur="3xl"
            className="w-full max-w-md p-5 sm:p-6 rounded-3xl border border-rose-500/50 shadow-2xl space-y-4 text-white my-auto relative box-border max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center gap-3 text-rose-400 border-b border-white/15 pb-3">
              <Trash2 className="w-6 h-6 shrink-0 text-rose-400" />
              <h3 className="text-lg font-black text-white">Delete Room Member</h3>
            </div>
            <p className="text-xs text-emerald-100 font-medium leading-relaxed">
              Are you sure you want to delete member <strong className="text-amber-300">{deleteConfirmMember.name}</strong> ({deleteConfirmMember.phone || deleteConfirmMember.email || 'No contact info'}) from <strong className="text-emerald-200">{group.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteConfirmMember(null)}
                className="px-4 py-2 bg-white/15 hover:bg-white/25 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onRemoveMember(deleteConfirmMember.id);
                  setDeleteConfirmMember(null);
                  triggerHaptic(hapticPatterns.error);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-lg transition-all cursor-pointer"
              >
                Confirm & Delete Member
              </button>
            </div>
          </GlassContainer>
        </div>
      )}

      {/* SECTION 1: Google Sheets Direct Integration Panel (Admin Only) */}
      {isAdmin && (
        <GlassContainer variant="card" className="p-5 border border-white/30 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/15 pb-3 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold border border-emerald-400/30 shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Master Google Sheet Storage</h3>
                  <span className="bg-emerald-950/80 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/40">
                    Connected Live
                  </span>
                </div>
                <p className="text-xs text-emerald-100/80">
                  Shared Account: <strong className="text-white">Master Cloud Account (Connected)</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(hapticPatterns.sync);
                  onSyncSheetsNow();
                }}
                disabled={isSyncing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic(hapticPatterns.click);
                  setIsEditingSheetConfig(!isEditingSheetConfig);
                }}
                className="bg-white/15 hover:bg-white/25 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all border border-white/20 active:scale-95 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>{isEditingSheetConfig ? 'Close Settings' : 'Edit Sheet ID'}</span>
              </button>
            </div>
          </div>

          {/* Edit Sheet Config Form */}
          {isEditingSheetConfig && (
            <form onSubmit={handleSaveSheetConfigSubmit} className="bg-emerald-950/80 p-4 rounded-2xl border border-emerald-400/40 space-y-3">
              <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Configure Google Sheet & Web App Script</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-emerald-200 font-semibold mb-1">Google Spreadsheet ID:</label>
                  <input
                    type="text"
                    value={sheetIdInput}
                    onChange={(e) => setSheetIdInput(e.target.value)}
                    placeholder="e.g. 1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM"
                    className="w-full bg-black/40 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                  />
                  <p className="text-[10px] text-emerald-200/60 mt-0.5">Found in your Google Sheet URL between /d/ and /edit</p>
                </div>

                <div>
                  <label className="block text-[11px] text-emerald-200 font-semibold mb-1">Google Apps Script Web App URL (Optional for Direct Live Auto-Push):</label>
                  <input
                    type="text"
                    value={webAppUrlInput}
                    onChange={(e) => setWebAppUrlInput(e.target.value)}
                    placeholder="e.g. https://script.google.com/macros/s/AKfycb.../exec"
                    className="w-full bg-black/40 border border-emerald-500/40 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                  />
                  <p className="text-[10px] text-emerald-200/60 mt-0.5">Optional Apps Script URL to push data live directly into your sheet on every edit.</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowAppsScriptModal(true)}
                  className="text-xs text-[#F9A826] underline font-bold flex items-center gap-1 hover:text-amber-300"
                >
                  <Code className="w-3.5 h-3.5" />
                  Get 1-Click Apps Script Code
                </button>

                <button
                  type="submit"
                  className="bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black px-4 py-1.5 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Save & Sync Sheet
                </button>
              </div>
            </form>
          )}

          {/* Config details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/10 p-3 rounded-2xl border border-white/20 backdrop-blur-xl">
              <span className="text-emerald-200/80 block text-[10px] uppercase font-bold">Central Spreadsheet ID</span>
              <span className="font-mono font-bold text-white truncate block mt-0.5 text-xs" title={group.spreadsheetId || '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM'}>
                {group.spreadsheetId || '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM'}
              </span>
            </div>

            <div className="bg-white/10 p-3 rounded-2xl border border-white/20 backdrop-blur-xl">
              <span className="text-emerald-200/80 block text-[10px] uppercase font-bold">Last Synced At</span>
              <span className="font-bold text-emerald-300 block mt-0.5">
                {sheetsConfig.lastSyncedAt || 'Just Now'}
              </span>
            </div>

            <div className="bg-white/10 p-3 rounded-2xl border border-white/20 backdrop-blur-xl">
              <span className="text-emerald-200/80 block text-[10px] uppercase font-bold">Group Currency</span>
              <span className="font-bold text-[#F9A826] block mt-0.5">
                {group.currency} (United Arab Emirates Dirham)
              </span>
            </div>
          </div>

          <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-100/80">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              Central DB Linked: Expenses, Members, and Utilities auto-sync to this Google Sheet.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAppsScriptModal(true)}
                className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-emerald-200 font-bold px-3 py-1.5 rounded-xl border border-white/20 transition-all text-xs cursor-pointer"
              >
                <Code className="w-3.5 h-3.5 text-emerald-400" />
                <span>Apps Script Code</span>
              </button>

              <a
                href={`https://docs.google.com/spreadsheets/d/${group.spreadsheetId || '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM'}/edit`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black px-3.5 py-1.5 rounded-xl transition-all shadow-md active:scale-95 text-xs self-start sm:self-auto cursor-pointer"
              >
                <span>Open Linked Google Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </GlassContainer>
      )}

      {/* Apps Script Guide Modal */}
      {showAppsScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <GlassContainer variant="card" className="max-w-2xl w-full p-6 space-y-4 border border-emerald-400/40 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <div className="flex items-center gap-2 text-emerald-300 font-bold text-base">
                <Code className="w-5 h-5 text-[#F9A826]" />
                <span>Google Apps Script Auto-Save Setup</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAppsScriptModal(false)}
                className="text-white/60 hover:text-white font-extrabold text-sm px-2 py-1 bg-white/10 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-emerald-100 leading-relaxed">
              To connect your own Google Sheet for live auto-save without setup limits:
            </p>

            <ol className="list-decimal list-inside text-xs text-emerald-200 space-y-1.5 font-medium">
              <li>Open your Google Sheet and click <strong>Extensions &gt; Apps Script</strong>.</li>
              <li>Delete any existing code, paste the script below, and click <strong>Save</strong>.</li>
              <li>Click <strong>Deploy &gt; New deployment &gt; Select type: Web App</strong>.</li>
              <li>Set <i>Execute as: Me</i> and <i>Who has access: Anyone</i>.</li>
              <li>Click <strong>Deploy</strong> and copy the generated Web App URL into the <strong>Google Sheet Settings</strong> input above.</li>
            </ol>

            <div className="relative bg-black/80 p-3 rounded-xl border border-emerald-500/30">
              <pre className="text-[11px] font-mono text-emerald-300 whitespace-pre-wrap overflow-x-auto leading-tight">
{`function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Expenses") || ss.insertSheet("Expenses");

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["ID", "Type", "Title", "Amount (AED)", "Paid By ID", "Shared With", "Date", "Note", "Cycle"]);
    }

    if (data.expenses && data.expenses.length > 0) {
      // Clear existing rows except header and append latest
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 9).clearContent();
      }
      data.expenses.forEach(function(exp) {
        sheet.appendRow([
          exp.id, exp.type, exp.title, exp.amount, exp.paidById,
          (exp.sharedWithIds || []).join(","), exp.date, exp.note || "", exp.cycle
        ]);
      });
    }
    return ContentService.createTextOutput(JSON.stringify({result: "success"})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({result: "error", message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}`}
              </pre>

              <button
                type="button"
                onClick={() => {
                  const code = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Expenses") || ss.insertSheet("Expenses");

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["ID", "Type", "Title", "Amount (AED)", "Paid By ID", "Shared With", "Date", "Note", "Cycle"]);
    }

    if (data.expenses && data.expenses.length > 0) {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, 9).clearContent();
      }
      data.expenses.forEach(function(exp) {
        sheet.appendRow([
          exp.id, exp.type, exp.title, exp.amount, exp.paidById,
          (exp.sharedWithIds || []).join(","), exp.date, exp.note || "", exp.cycle
        ]);
      });
    }
    return ContentService.createTextOutput(JSON.stringify({result: "success"})).setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({result: "error", message: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}`;
                  navigator.clipboard.writeText(code);
                  setCopiedScript(true);
                  setTimeout(() => setCopiedScript(false), 2500);
                }}
                className="absolute top-3 right-3 bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-extrabold px-3 py-1 rounded-lg text-xs cursor-pointer shadow-md active:scale-95"
              >
                {copiedScript ? 'Copied Code!' : 'Copy Apps Script'}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAppsScriptModal(false)}
                className="bg-emerald-600 text-white font-bold px-4 py-1.5 rounded-xl text-xs hover:bg-emerald-500 cursor-pointer"
              >
                Done
              </button>
            </div>
          </GlassContainer>
        </div>
      )}

      {/* SECTION 2: Global Display Currency & Conversion Rates (Admin Only) */}
      {isAdmin && (
        <GlassContainer variant="card" className="p-5 border border-white/30 shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#F9A826]" />
              <div>
                <h3 className="text-base font-bold text-white">
                  Preferred Display Currency & Conversion
                </h3>
                <p className="text-xs text-emerald-100/80">
                  Display expense totals in both {group.currency} (base) and your local currency
                </p>
              </div>
            </div>

            <button
              onClick={onOpenCurrencySettings}
              className="bg-white/15 hover:bg-white/25 text-white font-bold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 border border-white/30 backdrop-blur-md transition-all"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-[#F9A826]" />
              <span>Configure Currency</span>
            </button>
          </div>

          <div className="bg-white/10 p-3.5 rounded-2xl border border-white/20 flex items-center justify-between text-xs backdrop-blur-xl">
            <div>
              <span className="text-emerald-200/80 block text-[10px] uppercase font-bold">Currently Active Preferred Currency</span>
              <span className="font-extrabold text-[#F9A826] text-sm block mt-0.5">
                {preferredCurrency} (Base Currency: {group.currency})
              </span>
            </div>
            <span className="bg-emerald-950/80 text-emerald-300 font-bold px-2.5 py-1 rounded-full text-[11px] border border-emerald-400/40">
              Dual Currency Mode Active
            </span>
          </div>
        </GlassContainer>
      )}

      {/* SECTION 2: Members Management List */}
      <GlassContainer variant="card" className="p-5 border border-white/30 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-white/15 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#F9A826]" />
            <h3 className="text-base font-bold text-white">
              Room Members ({group.members.length})
            </h3>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAddMember(true)}
              className="bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-md border border-white/30 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add Member</span>
            </button>
          )}
        </div>

        {/* Member cards */}
        <div className="space-y-3">
          {group.members.map((member) => (
            <div
              key={member.id}
              className="bg-white/10 border border-white/25 rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white backdrop-blur-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#F9A826] text-[#0B4A3F] font-black flex items-center justify-center text-sm shadow-md">
                  {member.avatar}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{member.name}</h4>
                  <p className="text-xs text-emerald-100/70 font-mono">{member.phone || member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 pt-2 sm:pt-0 border-white/15">
                {/* Days present input vs read-only */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-100/80 font-semibold">Mess Days Present:</span>
                  {isAdmin ? (
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={member.daysPresent}
                      onChange={(e) => onUpdateMemberDays(member.id, parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 bg-white/10 border border-white/30 rounded-xl text-xs font-bold text-white text-center focus:ring-1 focus:ring-amber-400 focus:outline-none"
                    />
                  ) : (
                    <span className="text-xs font-black text-amber-300 bg-black/30 px-3 py-1 rounded-xl border border-white/10">
                      {member.daysPresent} Days
                    </span>
                  )}
                </div>

                {isAdmin && (
                  <button
                    onClick={() => setDeleteConfirmMember(member)}
                    className="p-1.5 px-2.5 text-rose-300 hover:text-white hover:bg-rose-600/30 rounded-xl transition-all border border-rose-400/40 cursor-pointer flex items-center gap-1 text-xs font-bold shadow-sm"
                    title="Delete member"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </GlassContainer>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200 overflow-x-hidden overflow-y-auto">
          <GlassContainer
            variant="modal"
            className="w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-white/40 space-y-4 my-auto relative box-border max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/20 pb-3">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#F9A826]" />
                <span>Add New Room Member</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="text-white/60 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-emerald-200 uppercase mb-1">
                  Member Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahfuzur Rahman"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/25 rounded-2xl text-xs font-bold text-white placeholder-white/40 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-emerald-200 uppercase mb-1">
                  Mobile Number (Login Credential) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +971 50 123 4567"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/25 rounded-2xl text-xs font-bold text-white placeholder-white/40 focus:ring-2 focus:ring-amber-400 focus:outline-none"
                />
                <p className="text-[10px] text-emerald-200/80 mt-1">
                  This mobile number will serve as their login credential to access their database & group history.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="w-1/2 py-3 rounded-2xl border border-white/20 text-xs font-bold text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-2xl bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] text-xs font-black shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  Add Member
                </button>
              </div>
            </form>
          </GlassContainer>
        </div>
      )}
    </div>
  );
};
