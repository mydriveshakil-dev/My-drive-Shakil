import React from 'react';
import { GroupNotice } from '../types';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import { X, CheckCircle2 } from 'lucide-react';

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
      className="fixed inset-0 z-[160] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div
        id="group-notice-popup-card"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md neu-upper rounded-3xl overflow-hidden relative animate-in zoom-in-95 duration-200 flex flex-col p-5 sm:p-6 space-y-4 text-slate-900"
      >
        {/* Header - Simple and clean */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-wider text-slate-900">
            Notice {groupName ? `• ${groupName}` : ''}
          </span>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full neu-upper-btn text-slate-800 flex items-center justify-center transition-all cursor-pointer"
            aria-label="Close Notice"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notice Message Content - ONLY Notice Message */}
        <div className="neu-lower-sm rounded-2xl p-4 sm:p-5">
          <p className="text-slate-950 font-bold text-sm sm:text-base whitespace-pre-wrap leading-relaxed">
            {notice.content}
          </p>
        </div>

        {/* ONLY Publisher Name */}
        <div className="text-xs text-slate-800 font-semibold px-1">
          <span>
            Published by: <strong className="text-slate-950 font-black">{notice.authorName}</strong>
          </span>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full bg-black hover:bg-slate-800 text-white font-black py-3.5 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
        >
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
          <span>OK</span>
        </button>
      </div>
    </div>
  );
};

