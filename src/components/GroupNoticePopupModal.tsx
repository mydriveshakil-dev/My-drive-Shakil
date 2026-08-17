import React from 'react';
import { GroupNotice } from '../types';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import {
  X,
  Bell,
  User,
  CheckCircle2,
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
            <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-blue-300 shadow-inner">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-blue-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                  Notice
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

        {/* Notice Message Content - Clean: Only Message & Publisher Name */}
        <div className="p-5 sm:p-6 space-y-4 bg-gradient-to-b from-slate-50 to-white">
          <div className="bg-white border-2 border-blue-100 rounded-2xl p-4 sm:p-5 shadow-xs">
            <p className="text-slate-900 font-semibold text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
              {notice.content}
            </p>
          </div>

          {/* Author info only */}
          <div className="flex items-center gap-2 text-xs text-slate-800 bg-slate-50 px-3.5 py-2.5 rounded-xl border border-slate-200/80 font-medium">
            <User className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Posted by: <strong className="text-slate-900 font-bold">{notice.authorName}</strong>
            </span>
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
