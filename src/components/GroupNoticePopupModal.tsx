import React from 'react';
import { GroupNotice } from '../types';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import {
  X,
  Bell,
  Calendar,
  User,
  CheckCircle2,
  Sparkles,
  StickyNote,
} from 'lucide-react';

interface GroupNoticePopupModalProps {
  isOpen: boolean;
  notice: GroupNotice | null;
  groupName?: string;
  onClose: () => void;
}

export const GroupNoticePopupModal: React.FC<GroupNoticePopupModalProps> = ({
  isOpen,
  notice,
  groupName,
  onClose,
}) => {
  if (!isOpen || !notice) return null;

  const handleDismiss = () => {
    triggerHaptic(hapticPatterns.click);
    onClose();
  };

  const calculateRemainingDays = (expiresMs: number) => {
    const diffMs = expiresMs - Date.now();
    if (diffMs <= 0) return 'Expires today';
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (days > 0) return `Valid for ${days} more day${days > 1 ? 's' : ''}`;
    return 'Expires today';
  };

  return (
    <div
      id="group-notice-popup-overlay"
      onClick={handleDismiss}
      className="fixed inset-0 z-[160] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-300"
    >
      <div
        id="group-notice-popup-card"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden relative animate-in zoom-in-95 duration-300 flex flex-col"
      >
        {/* Top Header - Main App Navy Gradient Theme */}
        <div className="bg-gradient-to-r from-[#071E55] via-[#0B2866] to-[#041029] p-5 text-white flex items-center justify-between relative shadow-md border-b border-blue-400/20">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-blue-300 shadow-inner">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                  Important Notice
                </span>
                {groupName && (
                  <span className="text-[11px] font-bold text-blue-200/90 truncate max-w-[140px]">
                    {groupName}
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight mt-0.5">
                Group Announcement
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all cursor-pointer border border-white/20 active:scale-90"
            aria-label="Close Notice"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Message Content */}
        <div className="p-5 sm:p-6 space-y-4 bg-gradient-to-b from-slate-50 to-white">
          <div className="bg-white border-2 border-blue-100 rounded-2xl p-4 sm:p-5 shadow-xs relative">
            <div className="absolute -top-3 left-4 bg-blue-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
              <StickyNote className="w-3 h-3" />
              <span>Message</span>
            </div>
            <p className="text-slate-900 font-semibold text-sm sm:text-base whitespace-pre-wrap leading-relaxed pt-1">
              {notice.content}
            </p>
          </div>

          {/* Author and Date Meta Info */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80 font-medium">
            <div className="flex items-center gap-1.5 text-slate-800">
              <User className="w-4 h-4 text-blue-600" />
              <span>Posted by: <strong className="text-slate-900">{notice.authorName}</strong></span>
            </div>
            <div className="flex items-center gap-1 text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{new Date(notice.publishedAtMs).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Expiration Note */}
          <div className="flex items-center justify-between text-[11px] text-blue-950 bg-blue-50 border border-blue-200/80 px-3 py-2 rounded-xl font-bold">
            <span className="flex items-center gap-1.5 text-blue-700">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Daily Reminder</span>
            </span>
            <span className="text-blue-900">{calculateRemainingDays(notice.expiresAtMs)}</span>
          </div>

          {/* Close / Got it Button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="w-full bg-gradient-to-r from-[#071E55] via-[#0B2866] to-[#041029] hover:from-[#0a2973] hover:to-[#06183d] text-white font-black py-3.5 px-4 rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-950/30 active:scale-95 transition-all cursor-pointer border border-blue-400/30 tracking-wide"
          >
            <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            <span>Got it, Dismiss</span>
          </button>
        </div>
      </div>
    </div>
  );
};
