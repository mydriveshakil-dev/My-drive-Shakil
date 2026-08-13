import React, { useState, useEffect } from 'react';
import { Group, GroupNotice, UserAuthProfile } from '../types';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
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
} from 'lucide-react';

interface GroupNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  currentUser?: UserAuthProfile | null;
  onSaveNotice: (notice: GroupNotice | null) => void;
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
  currentUser,
  onSaveNotice,
}) => {
  const [content, setContent] = useState('');
  const [selectedDuration, setSelectedDuration] = useState<number>(7);
  const [isEditing, setIsEditing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successToast, setSuccessToast] = useState(false);

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

  // Auto delete notice if expired
  useEffect(() => {
    if (isOpen && activeNotice && activeNotice.expiresAtMs && Date.now() >= activeNotice.expiresAtMs) {
      onSaveNotice(null);
    }
  }, [isOpen, activeNotice, onSaveNotice]);

  useEffect(() => {
    if (isOpen) {
      if (isNoticeActive && activeNotice) {
        setContent(activeNotice.content);
        setSelectedDuration(activeNotice.durationDays || 7);
        setIsEditing(false);
      } else {
        setContent('');
        setSelectedDuration(7);
        setIsEditing(true);
      }
      setErrorMessage('');
      setSuccessToast(false);
    }
  }, [isOpen, activeNotice, isNoticeActive]);

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

    const authorName = currentUser?.name || currentMember?.name || 'Group Member';
    const authorId = currentMember?.id || currentUser?.idNumber || 'member-notice';

    const newNotice: GroupNotice = {
      id: `notice-${now}`,
      groupId: group.id,
      authorId,
      authorName,
      content: content.trim(),
      durationDays: selectedDuration,
      publishedAt: new Date(now).toISOString(),
      publishedAtMs: now,
      expiresAtMs: expiresMs,
    };

    triggerHaptic(hapticPatterns.success);
    onSaveNotice(newNotice);
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
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
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
              </div>
              <p className="text-[11px] text-blue-200/90 font-medium">
                Broadcast announcement & popup notice for all room members
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
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-3 rounded-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Group notice published successfully! Members will see this popup once daily.</span>
            </div>
          )}

          {/* Active Notice Card if not in editing mode */}
          {isNoticeActive && activeNotice && !isEditing && (
            <div className="bg-blue-50/70 border-2 border-blue-200/80 rounded-2xl p-4 space-y-3 relative overflow-hidden shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-950 font-black text-xs">
                  <Bell className="w-4 h-4 text-blue-600 animate-bounce" />
                  <span>Current Active Notice</span>
                </div>
                <span className="bg-blue-100 text-blue-900 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-blue-300">
                  <Clock className="w-3 h-3 text-blue-700" />
                  {calculateRemainingDays(activeNotice.expiresAtMs)}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-blue-100 text-sm font-semibold text-slate-900 whitespace-pre-wrap leading-relaxed shadow-inner">
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

              {/* Permission based actions */}
              {canManageNotice ? (
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic(hapticPatterns.click);
                      setIsEditing(true);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer"
                  >
                    <StickyNote className="w-3.5 h-3.5" />
                    <span>Edit / Replace Notice</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Note</span>
                  </button>
                </div>
              ) : (
                <div className="bg-slate-100/90 border border-slate-200 p-2.5 rounded-xl flex items-center gap-2 text-[11px] text-slate-600 font-medium mt-2">
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-2xl p-3.5 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all resize-none shadow-xs"
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
                        className={`py-2.5 px-1 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-[#0F3DFF] text-white border-[#0F3DFF] shadow-sm shadow-blue-500/30 font-black'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 font-semibold'
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
                    className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3.5 rounded-2xl text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-[#071E55] via-[#0B2866] to-[#041029] hover:from-[#0a2973] hover:to-[#06183d] text-white font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-950/30 active:scale-95 transition-all cursor-pointer border border-blue-400/30"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                  <span>Publish Group Notice</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
