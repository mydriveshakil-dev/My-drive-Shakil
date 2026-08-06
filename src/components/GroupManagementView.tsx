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
  onUpdateMemberDays?: (id: string, days: number) => void;
  onRemoveMember: (id: string) => void;
  onUpdateMember?: (member: Member) => void;
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

export const ALL_EXPENSE_OPTIONS = [
  { id: 'mess', label: 'Mess Food Expense (মেস মিল খরচ)', desc: 'Daily meals & food grocery' },
  { id: 'general', label: 'General Room Expense (সাধারণ রুম খরচ)', desc: 'Common room items & shopping' },
  { id: 'electricity', label: 'Electricity Bill (বিদ্যুৎ বিল)', desc: 'DEWA / Power supply' },
  { id: 'internet', label: 'Internet / Wifi Bill (ওয়াইফাই বিল)', desc: 'Broadband wifi connection' },
  { id: 'water', label: 'Water Bill (পানি বিল)', desc: 'Water usage & DEWA water' },
  { id: 'gas', label: 'Gas Bill (গ্যাস বিল)', desc: 'LPG / Central gas supply' },
  { id: 'cleaner', label: 'House Cleaner (ক্লিনার বিল)', desc: 'Maid & housekeeping fee' },
  { id: 'rent', label: 'Room Rent / Landlord (রুম ভাড়া)', desc: 'Monthly landlord flat rent' },
];

export const GroupManagementView: React.FC<GroupManagementViewProps> = ({
  group,
  allGroups = [],
  sheetsConfig,
  onAddMember,
  onUpdateMemberDays,
  onRemoveMember,
  onUpdateMember,
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
  const [newMemberPassword, setNewMemberPassword] = useState('');
  const [newMemberCategories, setNewMemberCategories] = useState<string[]>(ALL_EXPENSE_OPTIONS.map((o) => o.id));

  // Edit Member Scope State
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberPhone, setEditMemberPhone] = useState('');
  const [editMemberPassword, setEditMemberPassword] = useState('');
  const [editMemberDays, setEditMemberDays] = useState(30);
  const [editMemberCategories, setEditMemberCategories] = useState<string[]>([]);

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

  const toggleCategoryForNewMember = (catId: string) => {
    if (newMemberCategories.includes(catId)) {
      setNewMemberCategories(newMemberCategories.filter((c) => c !== catId));
    } else {
      setNewMemberCategories([...newMemberCategories, catId]);
    }
  };

  const toggleCategoryForEditMember = (catId: string) => {
    if (editMemberCategories.includes(catId)) {
      setEditMemberCategories(editMemberCategories.filter((c) => c !== catId));
    } else {
      setEditMemberCategories([...editMemberCategories, catId]);
    }
  };

  const openEditMemberModal = (member: Member) => {
    setEditingMember(member);
    setEditMemberName(member.name);
    setEditMemberPhone(member.phone || member.mobileNumber || member.email || '');
    setEditMemberPassword(member.password || '');
    setEditMemberDays(member.daysPresent || 30);
    setEditMemberCategories(member.includedCategories || ALL_EXPENSE_OPTIONS.map((o) => o.id));
  };

  const handleSaveEditMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    const updated: Member = {
      ...editingMember,
      name: editMemberName.trim() || editingMember.name,
      phone: editMemberPhone.trim() || editingMember.phone,
      email: editMemberPhone.trim() || editingMember.email,
      mobileNumber: editMemberPhone.trim() || editingMember.mobileNumber,
      password: editMemberPassword.trim() || editingMember.password || '',
      daysPresent: editMemberDays,
      includedCategories: editMemberCategories,
    };
    if (onUpdateMember) {
      onUpdateMember(updated);
    } else if (onUpdateMemberDays) {
      onUpdateMemberDays(updated.id, editMemberDays);
    }
    setEditingMember(null);
    triggerHaptic(hapticPatterns.success);
  };

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
      password: newMemberPassword.trim(),
      avatar: initials,
      daysPresent: 30,
      active: true,
      includedCategories: newMemberCategories,
    });

    setNewMemberName('');
    setNewMemberPhone('');
    setNewMemberPassword('');
    setNewMemberCategories(ALL_EXPENSE_OPTIONS.map((o) => o.id));
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
      {/* Top Banner - Navy Theme */}
      <GlassContainer
        variant="card"
        blur="3xl"
        className="p-6 md:p-8 rounded-3xl border border-blue-900/40 shadow-xl bg-gradient-to-r from-[#07193F] to-[#041029] text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-black text-blue-200 uppercase tracking-wider bg-blue-500/20 px-3.5 py-1 rounded-full border border-blue-400/30">
              Single Master Gmail Account Setup
            </span>
            {isAdmin ? (
              <span className="bg-emerald-500/20 text-emerald-300 text-xs font-black px-3 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1 shadow-md">
                <ShieldCheck className="w-4 h-4" />
                APP ADMIN UNLOCKED
              </span>
            ) : (
              <span
                onClick={onOpenLoginModal}
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full border border-white/20 flex items-center gap-1 cursor-pointer transition-all"
              >
                <Lock className="w-3.5 h-3.5 text-blue-300" />
                General Member Mode
              </span>
            )}
          </div>
          <h2 className="text-2xl font-black text-white">Group & Member Settings</h2>
          <p className="text-xs text-blue-100/80 font-medium mt-1">
            Manage room members and administrative controls
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={onOpenArchGuide}
            className="bg-[#0052FF] hover:bg-[#0047E0] text-white font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 active:scale-95 border border-blue-400/30 self-start md:self-auto cursor-pointer"
          >
            <Code className="w-4 h-4" />
            <span>Flutter & API Architecture Guide</span>
          </button>
        )}
      </GlassContainer>

      {/* ADMIN PERMISSION CONTROL SECTION (Visible ONLY to App Admin) */}
      {isAdmin && (
        <GlassContainer variant="card" className="p-5 border border-black bg-white text-slate-900 shadow-md space-y-4 relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/20 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold border border-black">
                <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-slate-900">App Admin Management Controls</h3>
                  <span className="bg-black text-white text-[10px] font-black px-2.5 py-0.5 rounded-full border border-black">
                    FULL ACCESS
                  </span>
                </div>
                <p className="text-xs text-slate-700">
                  Create new room groups, hold/pause groups, delete groups & modify base currency.
                </p>
              </div>
            </div>
          </div>

          {/* Group Held Status Warning Banner */}
          {group.isHeld && (
            <div className="bg-black text-white p-3.5 rounded-2xl flex items-center justify-between text-xs border border-black">
              <div className="flex items-center gap-2">
                <PauseCircle className="w-5 h-5 text-white shrink-0" />
                <span>This room group is currently on <strong>HOLD / PAUSED</strong> by the App Admin.</span>
              </div>
              {onToggleHoldGroup && (
                <button
                  onClick={() => onToggleHoldGroup(group.id)}
                  className="bg-white text-black font-black px-3 py-1 rounded-xl text-xs hover:bg-slate-100 transition-all cursor-pointer border border-black"
                >
                  Resume Group
                </button>
              )}
            </div>
          )}

          {/* Admin Action Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Action 1: Create New Group */}
            <div className="bg-white p-3.5 rounded-2xl border border-black flex flex-col justify-between space-y-2">
              <div>
                <span className="text-slate-900 font-extrabold uppercase text-[10px]">Group Creation</span>
                <div className="text-slate-900 font-bold text-xs mt-0.5">Create New Room Group</div>
              </div>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="w-full py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-black hover:bg-slate-800 text-white shadow-md border border-black"
              >
                <FolderPlus className="w-4 h-4" />
                <span>+ Create Group</span>
              </button>
            </div>

            {/* Action 2: Hold / Pause Group */}
            <div className="bg-white p-3.5 rounded-2xl border border-black flex flex-col justify-between space-y-2">
              <div>
                <span className="text-slate-900 font-extrabold uppercase text-[10px]">Group Status</span>
                <div className="text-slate-900 font-bold text-xs mt-0.5">
                  {group.isHeld ? 'Group is Paused' : 'Active Room State'}
                </div>
              </div>
              <button
                onClick={() => {
                  if (onToggleHoldGroup) onToggleHoldGroup(group.id);
                }}
                className={`w-full py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  group.isHeld
                    ? 'bg-black text-white shadow-md border border-black'
                    : 'bg-white text-slate-900 border border-black hover:bg-slate-100 shadow-md'
                }`}
              >
                {group.isHeld ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
                <span>{group.isHeld ? 'Resume Group' : 'Hold / Pause Group'}</span>
              </button>
            </div>

            {/* Action 3: Change Base Currency */}
            <div className="bg-white p-3.5 rounded-2xl border border-black flex flex-col justify-between space-y-2">
              <div>
                <span className="text-slate-900 font-extrabold uppercase text-[10px]">Base Currency</span>
                <div className="text-slate-900 font-bold text-xs mt-0.5">
                  Primary: <strong>{group.currency}</strong>
                </div>
              </div>
              <select
                value={group.currency}
                onChange={(e) => {
                  if (onChangeBaseCurrency) onChangeBaseCurrency(e.target.value);
                  triggerHaptic(hapticPatterns.click);
                }}
                className="w-full py-2 px-3 rounded-xl font-extrabold text-xs bg-white text-slate-900 border border-black focus:outline-none cursor-pointer"
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
            <div className="bg-white p-3.5 rounded-2xl border border-black flex flex-col justify-between space-y-2">
              <div>
                <span className="text-slate-900 font-extrabold uppercase text-[10px]">Delete Group</span>
                <div className="text-slate-900 font-bold text-xs mt-0.5">Remove Room Group</div>
              </div>
              <button
                onClick={() => setDeleteConfirmGroup(group)}
                className="w-full py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-white text-slate-900 hover:bg-slate-100 border border-black shadow-md"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-x-hidden overflow-y-auto">
          <GlassContainer
            variant="modal"
            blur="3xl"
            className="w-full max-w-md p-5 sm:p-6 rounded-3xl border-2 border-black shadow-2xl space-y-4 my-auto relative box-border max-h-[90vh] overflow-y-auto bg-white text-slate-900"
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-3">
              <h3 className="text-lg font-black text-slate-950 flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-slate-900" />
                <span>Create New Room Group</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateGroup(false)}
                className="text-slate-700 hover:text-black text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer border border-black"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateGroupSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-900 uppercase tracking-wider mb-1">Group / Room Name *</label>
                <input
                  type="text"
                  placeholder="e.g. DSO Villa 402 / Silicon Oasis Room 3"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-black rounded-2xl font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-black"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-900 uppercase tracking-wider mb-1">Base Room Currency *</label>
                <select
                  value={newGroupCurrency}
                  onChange={(e) => setNewGroupCurrency(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-black rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-black cursor-pointer"
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
                className="w-full bg-black hover:bg-slate-800 text-white font-black py-3.5 rounded-2xl text-sm shadow-md transition-all cursor-pointer border border-black uppercase tracking-wider"
              >
                Confirm & Create Group
              </button>
            </form>
          </GlassContainer>
        </div>
      )}

      {/* DELETE GROUP CONFIRMATION MODAL */}
      {deleteConfirmGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-x-hidden overflow-y-auto">
          <GlassContainer
            variant="modal"
            blur="3xl"
            className="w-full max-w-md p-5 sm:p-6 rounded-3xl border-2 border-black shadow-2xl space-y-4 text-slate-900 my-auto relative box-border max-h-[90vh] overflow-y-auto bg-white"
          >
            <div className="flex items-center gap-3 border-b-2 border-black pb-3">
              <Trash2 className="w-6 h-6 shrink-0 text-slate-900" />
              <h3 className="text-lg font-black text-slate-950">Delete Room Group</h3>
            </div>
            <p className="text-xs text-slate-800 font-medium leading-relaxed">
              Are you sure you want to delete room group <strong className="text-slate-950 font-black">{deleteConfirmGroup.name}</strong>? All associated room data and member configurations for this group will be removed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black">
              <button
                type="button"
                onClick={() => setDeleteConfirmGroup(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-black rounded-xl text-xs font-bold text-slate-900 transition-all cursor-pointer"
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
                className="px-4 py-2 bg-black hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-md transition-all cursor-pointer border border-black uppercase tracking-wider"
              >
                Confirm & Delete
              </button>
            </div>
          </GlassContainer>
        </div>
      )}

      {/* DELETE MEMBER CONFIRMATION MODAL */}
      {deleteConfirmMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-x-hidden overflow-y-auto">
          <GlassContainer
            variant="modal"
            blur="3xl"
            className="w-full max-w-md p-5 sm:p-6 rounded-3xl border-2 border-black shadow-2xl space-y-4 text-slate-900 my-auto relative box-border max-h-[90vh] overflow-y-auto bg-white"
          >
            <div className="flex items-center gap-3 border-b-2 border-black pb-3">
              <Trash2 className="w-6 h-6 shrink-0 text-slate-900" />
              <h3 className="text-lg font-black text-slate-950">Delete Room Member</h3>
            </div>
            <p className="text-xs text-slate-800 font-medium leading-relaxed">
              Are you sure you want to delete member <strong className="text-slate-950 font-black">{deleteConfirmMember.name}</strong> ({deleteConfirmMember.phone || deleteConfirmMember.email || 'No contact info'}) from <strong className="text-slate-950 font-black">{group.name}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black">
              <button
                type="button"
                onClick={() => setDeleteConfirmMember(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-black rounded-xl text-xs font-bold text-slate-900 transition-all cursor-pointer"
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
        <GlassContainer variant="card" className="p-5 border border-black bg-white text-slate-900 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/20 pb-3 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold border border-black shrink-0">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900">Master Google Sheet Storage</h3>
                  <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-black">
                    Connected Live
                  </span>
                </div>
                <p className="text-xs text-slate-700">
                  Shared Account: <strong className="text-slate-950">Master Cloud Account (Connected)</strong>
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
                className="bg-black hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer disabled:opacity-50"
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
                className="bg-white hover:bg-slate-100 text-slate-900 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 transition-all border border-black active:scale-95 cursor-pointer"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>{isEditingSheetConfig ? 'Close Settings' : 'Edit Sheet ID'}</span>
              </button>
            </div>
          </div>

          {/* Edit Sheet Config Form */}
          {isEditingSheetConfig && (
            <form onSubmit={handleSaveSheetConfigSubmit} className="bg-slate-50 p-4 rounded-2xl border border-black space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Configure Google Sheet & Web App Script</h4>
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] text-slate-900 font-semibold mb-1">Google Spreadsheet ID:</label>
                  <input
                    type="text"
                    value={sheetIdInput}
                    onChange={(e) => setSheetIdInput(e.target.value)}
                    placeholder="e.g. 1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM"
                    className="w-full bg-white border border-black rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <p className="text-[10px] text-slate-600 mt-0.5">Found in your Google Sheet URL between /d/ and /edit</p>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-900 font-semibold mb-1">Google Apps Script Web App URL (Optional for Direct Live Auto-Push):</label>
                  <input
                    type="text"
                    value={webAppUrlInput}
                    onChange={(e) => setWebAppUrlInput(e.target.value)}
                    placeholder="e.g. https://script.google.com/macros/s/AKfycb.../exec"
                    className="w-full bg-white border border-black rounded-xl px-3 py-2 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  <p className="text-[10px] text-slate-600 mt-0.5">Optional Apps Script URL to push data live directly into your sheet on every edit.</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setShowAppsScriptModal(true)}
                  className="text-xs text-slate-900 underline font-bold flex items-center gap-1 hover:text-black cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5" />
                  Get 1-Click Apps Script Code
                </button>

                <button
                  type="submit"
                  className="bg-black hover:bg-slate-800 text-white font-black px-4 py-1.5 rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Save & Sync Sheet
                </button>
              </div>
            </form>
          )}

          {/* Config details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-2xl border border-black">
              <span className="text-slate-700 block text-[10px] uppercase font-bold">Central Spreadsheet ID</span>
              <span className="font-mono font-bold text-slate-950 truncate block mt-0.5 text-xs" title={group.spreadsheetId || '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM'}>
                {group.spreadsheetId || '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM'}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-black">
              <span className="text-slate-700 block text-[10px] uppercase font-bold">Last Synced At</span>
              <span className="font-bold text-slate-950 block mt-0.5">
                {sheetsConfig.lastSyncedAt || 'Just Now'}
              </span>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-black">
              <span className="text-slate-700 block text-[10px] uppercase font-bold">Group Currency</span>
              <span className="font-bold text-slate-950 block mt-0.5">
                {group.currency} (United Arab Emirates Dirham)
              </span>
            </div>
          </div>

          <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-700">
            <span className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="w-4 h-4 text-slate-900 shrink-0" />
              Central DB Linked: Expenses, Members, and Utilities auto-sync to this Google Sheet.
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAppsScriptModal(true)}
                className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-900 font-bold px-3 py-1.5 rounded-xl border border-black transition-all text-xs cursor-pointer"
              >
                <Code className="w-3.5 h-3.5 text-slate-900" />
                <span>Apps Script Code</span>
              </button>

              <a
                href={`https://docs.google.com/spreadsheets/d/${group.spreadsheetId || '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM'}/edit`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 bg-black hover:bg-slate-800 text-white font-black px-3.5 py-1.5 rounded-xl transition-all shadow-md active:scale-95 text-xs self-start sm:self-auto cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <GlassContainer variant="card" className="max-w-2xl w-full p-6 space-y-4 border-2 border-black bg-white text-slate-900 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-black/20 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Code className="w-5 h-5 text-slate-900" />
                <span>Google Apps Script Auto-Save Setup</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAppsScriptModal(false)}
                className="text-slate-600 hover:text-black font-extrabold text-sm px-2 py-1 bg-slate-100 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed font-medium">
              To connect your own Google Sheet for live auto-save without setup limits:
            </p>

            <ol className="list-decimal list-inside text-xs text-slate-800 space-y-1.5 font-medium">
              <li>Open your Google Sheet and click <strong>Extensions &gt; Apps Script</strong>.</li>
              <li>Delete any existing code, paste the script below, and click <strong>Save</strong>.</li>
              <li>Click <strong>Deploy &gt; New deployment &gt; Select type: Web App</strong>.</li>
              <li>Set <i>Execute as: Me</i> and <i>Who has access: Anyone</i>.</li>
              <li>Click <strong>Deploy</strong> and copy the generated Web App URL into the <strong>Google Sheet Settings</strong> input above.</li>
            </ol>

            <div className="relative bg-slate-900 p-3 rounded-xl border border-black text-white">
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
                className="absolute top-3 right-3 bg-white text-black font-extrabold px-3 py-1 rounded-lg text-xs cursor-pointer shadow-md active:scale-95 border border-black"
              >
                {copiedScript ? 'Copied Code!' : 'Copy Apps Script'}
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowAppsScriptModal(false)}
                className="bg-black text-white font-bold px-4 py-1.5 rounded-xl text-xs hover:bg-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>
          </GlassContainer>
        </div>
      )}

      {/* SECTION 2: Global Display Currency & Conversion Rates (Admin Only) */}
      {isAdmin && (
        <GlassContainer variant="card" className="p-5 border border-black bg-white text-slate-900 shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-slate-900" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Preferred Display Currency & Conversion
                </h3>
                <p className="text-xs text-slate-700">
                  Display expense totals in both {group.currency} (base) and your local currency
                </p>
              </div>
            </div>

            <button
              onClick={onOpenCurrencySettings}
              className="bg-white hover:bg-slate-100 text-slate-900 font-bold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 border border-black transition-all cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-900" />
              <span>Configure Currency</span>
            </button>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-black flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-700 block text-[10px] uppercase font-bold">Currently Active Preferred Currency</span>
              <span className="font-extrabold text-slate-950 text-sm block mt-0.5">
                {preferredCurrency} (Base Currency: {group.currency})
              </span>
            </div>
            <span className="bg-black text-white font-bold px-2.5 py-1 rounded-full text-[11px] border border-black">
              Dual Currency Mode Active
            </span>
          </div>
        </GlassContainer>
      )}

      {/* SECTION 2: Members Management List */}
      <GlassContainer variant="card" className="p-5 border border-black bg-white text-slate-900 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-black/20 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-900" />
            <h3 className="text-base font-black text-slate-900 tracking-wide uppercase">
              ACTIVE ROOM MEMBERS ({group.members.length})
            </h3>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAddMember(true)}
              className="bg-black hover:bg-slate-800 text-white font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 shadow-md border border-black active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add Member</span>
            </button>
          )}
        </div>

        {/* Member cards */}
        <div className="space-y-3">
          {group.members.map((member) => {
            const activeCount = (member.includedCategories || ALL_EXPENSE_OPTIONS.map((o) => o.id)).length;
            return (
              <div
                key={member.id}
                className="bg-white border border-black rounded-3xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-slate-900 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-black text-white font-black flex items-center justify-center text-sm shadow-md shrink-0">
                    {member.avatar}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{member.name}</h4>
                    <p className="text-xs text-slate-600 font-mono">{member.phone || member.email}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className="text-[10px] text-slate-900 font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-black">
                        Scope: {activeCount}/{ALL_EXPENSE_OPTIONS.length} Expenses
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => openEditMemberModal(member)}
                          className="text-[10px] text-slate-900 bg-white hover:bg-slate-100 px-2 py-0.5 rounded-md border border-black font-bold cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3 text-slate-900" />
                          <span>Edit Scope</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-end border-t sm:border-0 pt-2 sm:pt-0 border-black/20">
                  {isAdmin && (
                    <button
                      onClick={() => setDeleteConfirmMember(member)}
                      className="p-1.5 px-2.5 text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-all border border-black cursor-pointer flex items-center gap-1 text-xs font-bold shadow-xs"
                      title="Delete member"
                    >
                      <Trash2 className="w-4 h-4 text-slate-900" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlassContainer>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-x-hidden overflow-y-auto">
          <GlassContainer
            variant="card"
            className="w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-black bg-white text-slate-900 space-y-4 my-auto relative box-border max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-black/20 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-slate-900" />
                <span>Add New Room Member</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="text-slate-600 hover:text-black text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Member Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mahfuzur Rahman"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-black rounded-2xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Mobile Number (Login Credential) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +971 50 123 4567"
                  value={newMemberPhone}
                  onChange={(e) => setNewMemberPhone(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-black rounded-2xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-black focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                  Login Password *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 123456 or uae2024"
                  value={newMemberPassword}
                  onChange={(e) => setNewMemberPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-black rounded-2xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-black focus:outline-none"
                />
                <p className="text-[10px] text-slate-600 mt-1">
                  This mobile number and password will be used by this user to log in.
                </p>
              </div>

              {/* Expense Inclusions Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1 flex items-center justify-between">
                  <span>Expense Scope & Inclusions (কোন কোন খরচের আওতায় থাকবে) *</span>
                  <span className="text-[10px] text-white font-bold bg-black px-2 py-0.5 rounded-full border border-black">
                    {newMemberCategories.length}/{ALL_EXPENSE_OPTIONS.length} Selected
                  </span>
                </label>
                <p className="text-[11px] text-slate-600 mb-2">
                  Tick the checkboxes for expenses this member will participate in. Unchecked expenses will NOT be charged to this member.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto p-2.5 bg-slate-50 border border-black rounded-2xl shadow-inner">
                  {ALL_EXPENSE_OPTIONS.map((opt) => {
                    const isChecked = newMemberCategories.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-black text-white border-black shadow-xs'
                            : 'bg-white text-slate-700 border-black hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategoryForNewMember(opt.id)}
                          className="mt-0.5 w-4 h-4 rounded text-black focus:ring-black cursor-pointer accent-black shrink-0"
                        />
                        <div className="leading-tight">
                          <span className={`text-xs font-bold block ${isChecked ? 'text-white' : 'text-slate-900'}`}>
                            {opt.label}
                          </span>
                          <span className={`text-[10px] opacity-75 block ${isChecked ? 'text-slate-200' : 'text-slate-600'}`}>{opt.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-black/20">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="w-1/2 py-3 rounded-2xl border border-black text-xs font-bold text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-2xl bg-black hover:bg-slate-800 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  Add Member
                </button>
              </div>
            </form>
          </GlassContainer>
        </div>
      )}

      {/* Edit Member Scope Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-x-hidden overflow-y-auto">
          <GlassContainer
            variant="card"
            className="w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl border-2 border-black bg-white text-slate-900 space-y-4 my-auto relative box-border max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-black/20 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-slate-900" />
                <span>Edit Scope: {editingMember.name}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="text-slate-600 hover:text-black text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveEditMemberSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Member Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editMemberName}
                    onChange={(e) => setEditMemberName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-black rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Mobile / Phone
                  </label>
                  <input
                    type="tel"
                    required
                    value={editMemberPhone}
                    onChange={(e) => setEditMemberPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-black rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                    Password
                  </label>
                  <input
                    type="text"
                    placeholder="Member Password"
                    value={editMemberPassword}
                    onChange={(e) => setEditMemberPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-black rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-black focus:outline-none"
                  />
                </div>
              </div>

              {/* Expense Inclusions Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-900 uppercase mb-1 flex items-center justify-between">
                  <span>Expense Inclusions & Scope (খরচের টিক বক্স) *</span>
                  <span className="text-[10px] text-white font-bold bg-black px-2 py-0.5 rounded-full border border-black">
                    {editMemberCategories.length}/{ALL_EXPENSE_OPTIONS.length} Ticked
                  </span>
                </label>
                <p className="text-[11px] text-slate-600 mb-2">
                  Checkboxes that are checked will charge this user for that expense. Unchecked expenses will NOT apply to this user.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2.5 bg-slate-50 border border-black rounded-2xl shadow-inner">
                  {ALL_EXPENSE_OPTIONS.map((opt) => {
                    const isChecked = editMemberCategories.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-black text-white border-black shadow-xs'
                            : 'bg-white text-slate-700 border-black hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleCategoryForEditMember(opt.id)}
                          className="mt-0.5 w-4 h-4 rounded text-black focus:ring-black cursor-pointer accent-black shrink-0"
                        />
                        <div className="leading-tight">
                          <span className={`text-xs font-bold block ${isChecked ? 'text-white' : 'text-slate-900'}`}>
                            {opt.label}
                          </span>
                          <span className={`text-[10px] opacity-75 block ${isChecked ? 'text-slate-200' : 'text-slate-600'}`}>{opt.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-black/20">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="w-1/2 py-3 rounded-2xl border border-black text-xs font-bold text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-3 rounded-2xl bg-black hover:bg-slate-800 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                >
                  Save Member Scope
                </button>
              </div>
            </form>
          </GlassContainer>
        </div>
      )}
    </div>
  );
};
