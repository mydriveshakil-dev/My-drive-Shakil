import React, { useState, useEffect, useMemo } from 'react';
import { Group, GroupNotice, UserAuthProfile, NoticeViewerRecord } from '../types';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import { MemberAvatar } from './MemberAvatar';
import {
  X,
  StickyNote,
  Clock,
  Send,
  Trash2,
  AlertCircle,
  Calendar,
  User,
  CheckCircle2,
  Bell,
  ShieldAlert,
  Eye,
  Globe,
  Building2,
  Megaphone,
} from 'lucide-react';

interface GroupNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  allGroups?: Group[];
  currentUser?: UserAuthProfile | null;
  onSaveNotice: (notice: GroupNotice | null, targetGroupIds?: string[]) => void;
}

const DURATION_OPTIONS = [
  { days: 1, label: '1 Day' },
  { days: 3, label: '3 Days' },
  { days: 7, label: '7 Days' },
  { days: 15, label: '15 Days' },
  { days: 30, label: '30 Days' },
];

export const GroupNoteModal: React.FC<GroupNoteModalProps> = ({
  isOpen,
  onClose,
  group,
  allGroups = [],
  currentUser,
  onSaveNotice,
}) => {
  const [content, setContent] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<number>(7);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Admin Scope Selector
  const [publishScope, setPublishScope] = useState<'selected' | 'all'>('selected');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(group.id);

  const activeNotice = group.notice;
  const isNoticeActive = Boolean(activeNotice && activeNotice.expiresAtMs && Date.now() < activeNotice.expiresAtMs);

  // Determine if current user is the author or admin
  const isAdmin = Boolean(currentUser?.role === 'admin' || currentUser?.name === 'ADMIN');
  const isAuthor = Boolean(
    activeNotice &&
      ((activeNotice.authorId &&
        (activeNotice.authorId === currentUser?.idNumber ||
          group.members.some(
            (m) =>
              m.id === activeNotice.authorId &&
              ((currentUser?.mobileNumber && m.phone === currentUser.mobileNumber) ||
                (currentUser?.name && m.name === currentUser.name))
          ))) ||
        (activeNotice.authorName &&
          currentUser?.name &&
          activeNotice.authorName.trim().toLowerCase() === currentUser.name.trim().toLowerCase()))
  );

  const canManageNotice = isAdmin || isAuthor;

  // Extract viewers list from activeNotice.seenBy
  const viewersList: NoticeViewerRecord[] = useMemo(() => {
    if (!activeNotice?.seenBy) return [];
    if (Array.isArray(activeNotice.seenBy)) return activeNotice.seenBy;
    if (typeof activeNotice.seenBy === 'object') {
      return Object.values(activeNotice.seenBy);
    }
    return [];
  }, [activeNotice]);

  const totalViews = viewersList.reduce((acc, v) => acc + (v.viewCount || 1), 0);

  // Auto delete notice if expired
  useEffect(() => {
    if (isOpen && activeNotice && activeNotice.expiresAtMs && Date.now() >= activeNotice.expiresAtMs) {
      onSaveNotice(null);
    }
  }, [isOpen, activeNotice, onSaveNotice]);

  useEffect(() => {
    if (isOpen) {
      setSelectedGroupId(group.id);
      if (isNoticeActive && activeNotice) {
        setContent(activeNotice.content);
        setSelectedDuration(activeNotice.durationDays || 7);
        setPublishScope(activeNotice.targetScope || 'selected');
        setIsEditing(false);
      } else {
        setContent('');
        setSelectedDuration(7);
        setPublishScope('selected');
        setIsEditing(true);
      }
      setErrorMessage('');
      setSuccessToast(false);
    }
  }, [isOpen, activeNotice, isNoticeActive, group.id]);

  if (!isOpen) return null;

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMessage('Please enter notice text before publishing.');
      triggerHaptic(hapticPatterns.error);
      return;
    }

    const now = Date.now();
    const expiresMs = now + selectedDuration * 24 * 60 * 60 * 1000;

    const currentMember = group.members.find(
      (m) =>
        (currentUser?.idNumber && m.id === currentUser.idNumber) ||
        (currentUser?.name && m.name === currentUser.name) ||
        (currentUser?.mobileNumber && m.phone === currentUser.mobileNumber)
    );

    const authorName = currentUser?.name || currentUser?.identity?.fullName || currentMember?.name || 'Group Member';
    const authorId = currentMember?.id || currentUser?.idNumber || 'member-notice';

    // Preserve existing seenBy if editing same notice, else start fresh
    const initialSeenBy = isEditing && activeNotice?.seenBy ? activeNotice.seenBy : {};

    const targetScope: 'selected' | 'all' = isAdmin ? publishScope : 'selected';
    let targetGroupIds: string[] = [group.id];

    if (isAdmin) {
      if (targetScope === 'all') {
        targetGroupIds = (allGroups && allGroups.length > 0) ? allGroups.map((g) => g.id) : [group.id];
      } else {
        targetGroupIds = [selectedGroupId || group.id];
      }
    }

    const newNotice: GroupNotice = {
      id: isEditing && activeNotice?.id ? activeNotice.id : `notice-${now}`,
      groupId: targetScope === 'all' ? 'all' : (targetGroupIds[0] || group.id),
      authorId,
      authorName,
      content: content.trim(),
      durationDays: selectedDuration,
      publishedAt: new Date(now).toISOString(),
      publishedAtMs: now,
      expiresAtMs: expiresMs,
      targetScope,
      targetGroupIds,
      seenBy: initialSeenBy,
    };

    triggerHaptic(hapticPatterns.success);
    onSaveNotice(newNotice, targetGroupIds);

    const msg = targetScope === 'all'
      ? `Notice broadcasted to all ${targetGroupIds.length} groups!`
      : 'Group notice published successfully!';
    setSuccessMessage(msg);
    setSuccessToast(true);
    setIsEditing(false);

    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleDelete = () => {
    if (!canManageNotice) {
      triggerHaptic(hapticPatterns.error);
      setErrorMessage('Only the author or group admin has permission to delete this note.');
      return;
    }
    triggerHaptic(hapticPatterns.click);
    onSaveNotice(null);
    setContent('');
    setIsEditing(true);
    setSuccessToast(false);
  };

  const calculateRemainingDays = (expiresMs: number) => {
    const diffMs = expiresMs - Date.now();
    if (diffMs <= 0) return 'Expired';
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  return (
    <div
      id="group-note-modal-overlay"
      onClick={onClose}
      className="fixed inset-0 z-[150] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="group-note-modal-card"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl shadow-2xl neu-upper border-none overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header - Main App Navy Gradient Theme */}
        <div className="bg-gradient-to-r from-[#071E55] via-[#0B2866] to-[#041029] p-4 sm:p-5 text-white flex items-center justify-between relative shadow-sm border-b border-blue-400/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-blue-300 shadow-inner">
              <StickyNote className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white">Group Notes</h2>
                <span className="bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  {group.name}
                </span>
                {isAdmin && (
                  <span className="bg-amber-400/20 border border-amber-300/40 text-amber-200 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-[11px] text-blue-200/90 font-medium">
                Broadcast announcement & popup notice for room members
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic(hapticPatterns.click);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/20 active:scale-90"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-slate-800 flex-1">
          {successToast && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in neu-upper-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage || 'Group notice published successfully!'}</span>
            </div>
          )}

          {/* Active Notice Card if not in editing mode */}
          {isNoticeActive && activeNotice && !isEditing && (
            <div className="bg-blue-50/70 rounded-2xl p-4 space-y-3 relative overflow-hidden neu-upper-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-950 font-black text-xs">
                  <Bell className="w-4 h-4 text-blue-600 animate-bounce" />
                  <span>Current Active Notice</span>
                  {activeNotice.targetScope === 'all' && (
                    <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Megaphone className="w-2.5 h-2.5" /> All Groups
                    </span>
                  )}
                </div>
                <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-blue-300">
                  <Clock className="w-3 h-3 text-blue-700" />
                  {calculateRemainingDays(activeNotice.expiresAtMs)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl text-sm font-semibold text-slate-900 whitespace-pre-wrap leading-relaxed neu-lower-sm">
                {activeNotice.content}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-blue-200/60 font-medium">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Published by: <strong className="text-slate-900">{activeNotice.authorName}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  {new Date(activeNotice.publishedAtMs).toLocaleDateString([], {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>

              {/* Notice View Tracking / Seen by Members section */}
              <div className="neu-upper-sm rounded-xl p-3 space-y-2.5 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-slate-900">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span>Seen by Group Members</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="bg-blue-100 text-blue-950 text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-300">
                      {viewersList.length} {viewersList.length === 1 ? 'User' : 'Users'}
                    </span>
                    <span className="bg-emerald-100 text-emerald-950 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-300">
                      {totalViews} {totalViews === 1 ? 'View' : 'Total Views'}
                    </span>
                  </div>
                </div>

                {viewersList.length > 0 ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {viewersList.map((viewer, idx) => {
                      const memberInfo = group.members.find(
                        (m) =>
                          m.id === viewer.userId ||
                          (m.name && viewer.userName && m.name.toLowerCase() === viewer.userName.toLowerCase())
                      );
                      const resolvedAvatar = viewer.userAvatar || memberInfo?.avatar || '';
                      const isCurrent =
                        (currentUser?.name && viewer.userName && viewer.userName.toLowerCase().includes(currentUser.name.toLowerCase())) ||
                        (currentUser?.idNumber && viewer.userId === currentUser.idNumber);

                      return (
                        <div
                          key={viewer.userId || idx}
                          className="flex items-center justify-between p-2 rounded-xl neu-upper-sm hover:border-blue-300 transition-all"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MemberAvatar
                              name={viewer.userName}
                              avatar={resolvedAvatar}
                              size="xs"
                              className="w-6 h-6 text-[9px] shrink-0 border border-slate-300"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                                <span>{viewer.userName}</span>
                                {isCurrent && (
                                  <span className="text-[9px] text-blue-600 font-extrabold">(You)</span>
                                )}
                              </p>
                              {viewer.lastViewedAtMs && (
                                <p className="text-[10px] text-slate-500 font-medium">
                                  Last seen:{' '}
                                  {new Date(viewer.lastViewedAtMs).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}{' '}
                                  •{' '}
                                  {new Date(viewer.lastViewedAtMs).toLocaleDateString([], {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* View Count Badge */}
                          <div className="inline-flex items-center gap-1 bg-blue-100 border border-blue-300 text-blue-950 px-2.5 py-1 rounded-full text-xs font-black shrink-0 shadow-2xs">
                            <Eye className="w-3.5 h-3.5 text-blue-700" />
                            <span>
                              {viewer.viewCount || 1} {viewer.viewCount === 1 ? 'time' : 'times'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="neu-lower-sm rounded-xl p-3 text-center">
                    <p className="text-xs font-bold text-slate-600">
                      No member views recorded yet
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      When room members open and view this notice, their names and show count will appear here.
                    </p>
                  </div>
                )}
              </div>

              {/* Permission based actions */}
              {canManageNotice ? (
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(hapticPatterns.click);
                      setIsEditing(true);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer neu-upper-sm"
                  >
                    <StickyNote className="w-3.5 h-3.5" />
                    <span>Edit / Replace Notice</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="bg-red-50 hover:bg-red-100 text-red-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer neu-upper-sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Note</span>
                  </button>
                </div>
              ) : (
                <div className="neu-lower-sm p-2.5 rounded-xl flex items-center gap-2 text-[11px] text-slate-600 font-medium mt-2">
                  <ShieldAlert className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>
                    Only the author (<strong className="text-slate-900">{activeNotice.authorName}</strong>) or Group Admin can edit or delete this note.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Form Composer */}
          {(isEditing || !isNoticeActive) && (
            <form onSubmit={handlePublish} className="space-y-4">
              {/* Admin Broadcast Scope Selector - Only shown for Admin users */}
              {isAdmin && (
                <div className="space-y-2 neu-upper-sm p-3.5 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-blue-700" />
                      <span>Publish Scope (Admin Control)</span>
                    </label>
                    <span className="bg-blue-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Admin
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {/* Option 1: Selected Group */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(hapticPatterns.click);
                        setPublishScope('selected');
                      }}
                      className={`p-3 rounded-xl text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        publishScope === 'selected'
                          ? 'neu-lower-sm text-slate-900 font-bold'
                          : 'neu-upper-btn text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-black text-xs text-slate-900">
                          <Building2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Selected Group</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            publishScope === 'selected' ? 'border-blue-600 bg-blue-600' : 'border-slate-300'
                          }`}
                        >
                          {publishScope === 'selected' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium leading-snug">
                        Publish only to <strong className="text-slate-800">{group.name}</strong>
                      </p>
                    </button>

                    {/* Option 2: All Groups */}
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(hapticPatterns.click);
                        setPublishScope('all');
                      }}
                      className={`p-3 rounded-xl text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        publishScope === 'all'
                          ? 'bg-gradient-to-r from-blue-900 to-indigo-950 text-white neu-upper-sm'
                          : 'neu-upper-btn text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div
                          className={`flex items-center gap-1.5 font-black text-xs ${
                            publishScope === 'all' ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          <Megaphone
                            className={`w-3.5 h-3.5 ${
                              publishScope === 'all' ? 'text-blue-300 animate-pulse' : 'text-blue-600'
                            }`}
                          />
                          <span>All Groups (Broadcast)</span>
                        </div>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            publishScope === 'all' ? 'border-white bg-blue-500' : 'border-slate-300'
                          }`}
                        >
                          {publishScope === 'all' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <p
                        className={`text-[11px] font-medium leading-snug ${
                          publishScope === 'all' ? 'text-blue-200' : 'text-slate-500'
                        }`}
                      >
                        Publish to all {allGroups.length || 1} room groups in the app
                      </p>
                    </button>
                  </div>

                  {/* If Selected Group scope and multiple groups exist, allow selecting specific group */}
                  {publishScope === 'selected' && allGroups.length > 1 && (
                    <div className="pt-2">
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                        Target Room Group:
                      </label>
                      <select
                        value={selectedGroupId}
                        onChange={(e) => setSelectedGroupId(e.target.value)}
                        className="w-full neu-lower-sm rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                      >
                        {allGroups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name} ({g.members?.length || 0} members)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <StickyNote className="w-4 h-4 text-blue-600" />
                    Notice Content
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Required</span>
                </label>
                <textarea
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  rows={4}
                  placeholder="Type group notice or announcement here (e.g., market schedule, room rules, important notice)..."
                  className="w-full neu-lower rounded-2xl p-3.5 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-500 focus:outline-none transition-all resize-none"
                />
              </div>

              {/* Duration Selection: 1 compact line with 5 items */}
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Select Notice Duration
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">Auto-deleted after expiry</span>
                </label>
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {DURATION_OPTIONS.map((opt) => {
                    const isSelected = selectedDuration === opt.days;
                    return (
                      <button
                        key={opt.days}
                        type="button"
                        onClick={() => {
                          triggerHaptic(hapticPatterns.click);
                          setSelectedDuration(opt.days);
                        }}
                        className={`py-2.5 px-1 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-[#071E55] text-white neu-upper-sm font-black'
                            : 'neu-upper-btn text-slate-700 font-semibold'
                        }`}
                      >
                        <span className="text-xs sm:text-sm tracking-tight">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {errorMessage && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-2.5 rounded-xl flex items-center gap-1.5 text-xs font-bold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {isNoticeActive && (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(hapticPatterns.click);
                      setIsEditing(false);
                    }}
                    className="w-1/3 neu-upper-btn text-slate-700 font-bold py-3.5 rounded-2xl text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#071E55] via-[#0B2866] to-[#041029] hover:from-[#0a2973] hover:to-[#06183d] text-white font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 neu-upper-sm active:scale-95 transition-all cursor-pointer"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                  <span>
                    {isAdmin && publishScope === 'all'
                      ? 'Broadcast to All Groups'
                      : 'Publish Group Notice'}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

