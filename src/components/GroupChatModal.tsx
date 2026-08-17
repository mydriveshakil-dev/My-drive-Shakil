import React, { useState, useEffect, useRef } from 'react';
import { Group, Member, ChatMessage, UserAuthProfile } from '../types';
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Users,
  CheckCircle2,
  DollarSign,
  Receipt,
  Bot,
  Zap,
  Clock,
} from 'lucide-react';
import { GlassContainer } from './GlassContainer';
import { MemberAvatar } from './MemberAvatar';
import { getMessageTimestampMs, getStartOfCurrentMonthMs, isPhoneMatch } from '../lib/firebase';

interface GroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  messages: ChatMessage[];
  onSendMessage: (msg: { text: string; senderId: string; senderName?: string; senderAvatar?: string }) => void;
  currentUser?: UserAuthProfile | null;
  activeMemberIds?: string[];
}

export const GroupChatModal: React.FC<GroupChatModalProps> = ({
  isOpen,
  onClose,
  group,
  messages,
  onSendMessage,
  currentUser,
  activeMemberIds = [],
}) => {
  const loggedInMember = (group?.members || []).find(
    (m) =>
      (currentUser?.email && m.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.mobileNumber &&
        (isPhoneMatch(m.phone, currentUser.mobileNumber) ||
          isPhoneMatch(m.mobileNumber, currentUser.mobileNumber))) ||
      (currentUser?.name && m.name.toLowerCase().includes(currentUser.name.toLowerCase())) ||
      (currentUser?.name && currentUser.name.toLowerCase().includes(m.name.toLowerCase()))
  );

  const activeSenderName =
    currentUser?.name ||
    currentUser?.identity?.fullName ||
    loggedInMember?.name ||
    group?.members?.[0]?.name ||
    'Logged In User';

  const activeSenderAvatar =
    currentUser?.avatar ||
    currentUser?.identity?.photoUrl ||
    loggedInMember?.avatar ||
    '';

  const activeSenderId = loggedInMember?.id || currentUser?.id || currentUser?.email || 'm_current';

  const [inputText, setInputText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages]);

  useEffect(() => {
    if (!isOpen) return;
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage({
      text: inputText.trim(),
      senderId: activeSenderId,
      senderName: activeSenderName,
      senderAvatar: activeSenderAvatar,
    });
    setInputText('');
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl h-[90vh] sm:h-[82vh] rounded-3xl shadow-2xl neu-upper border-none flex flex-col overflow-hidden relative cursor-default text-slate-900"
      >
        {/* Modal Header - Navy Theme */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-[#07193F] to-[#041029] text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0052FF] text-white font-black flex items-center justify-center shadow-md border border-blue-400/30 text-lg">
              <MessageCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {group.name} Chat
                </h2>
                <span className="bg-blue-500/20 text-blue-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-400/30 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {group.members.length} Members
                </span>
              </div>
              <p className="text-xs text-blue-100/80 font-medium flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-300" />
                Live Room Expenses & General Discussions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/20 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room Active Members Bar */}
        <div className="px-4 py-2 neu-upper-sm flex items-center justify-between overflow-x-auto text-xs shrink-0 border-b border-slate-300/60">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider shrink-0">
              Room Mates:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {group.members.map((m) => {
                const isMe =
                  (loggedInMember && m.id === loggedInMember.id) ||
                  (currentUser?.email && m.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
                  (currentUser?.name && m.name.toLowerCase().includes(currentUser.name.toLowerCase()));

                const memberAvatar = isMe ? (activeSenderAvatar || m.avatar) : m.avatar;

                const isOnline =
                  isMe ||
                  activeMemberIds.includes(m.id) ||
                  activeMemberIds.some(
                    (aid) =>
                      m.name.toLowerCase().includes(aid.toLowerCase()) ||
                      (m.mobileNumber && aid.includes(m.mobileNumber))
                  );

                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-1.5 neu-upper-sm text-slate-900 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
                  >
                    <MemberAvatar
                      name={m.name}
                      avatar={memberAvatar}
                      size="xs"
                      className="w-5 h-5 text-[9px] shrink-0"
                    />
                    <span>{m.name.split(' ')[0]}</span>
                    {isOnline ? (
                      <span
                        className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-300 animate-pulse shrink-0"
                        title="Active Online"
                      />
                    ) : (
                      <span
                        className="w-2 h-2 rounded-full bg-slate-400 shrink-0"
                        title="Offline"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <span className="text-[10px] font-extrabold text-slate-700 hidden sm:inline-block shrink-0 ml-2">
            Auto-Sync to Google Sheet
          </span>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 neu-lower-sm">
          {/* Monthly Auto-Reset Notice Badge */}
          <div className="flex justify-center my-1">
            <span className="text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300 px-3 py-1 rounded-full flex items-center gap-1 shadow-xs">
              <Clock className="w-3 h-3 text-amber-800 shrink-0" />
              <span>Previous chats auto-cleared • Fresh chat starts on 1st of each month</span>
            </span>
          </div>

          {messages
            .filter((msg) => {
              const startOfMonthMs = getStartOfCurrentMonthMs();
              const msgTime = getMessageTimestampMs(msg);
              if (msgTime < startOfMonthMs) return false;
              if (msg.type === 'expense_added' || msg.type === 'settlement_update') return false;
              if (msg.text && (msg.text.includes('Logged in') || msg.text.includes('Added new') || msg.text.includes('expense:'))) return false;
              return true;
            })
            .map((msg) => {
            const senderMember = group.members.find(
              (m) =>
                m.id === msg.senderId ||
                (msg.senderName && m.name.toLowerCase() === msg.senderName.toLowerCase()) ||
                (msg.senderName && m.name.toLowerCase().includes(msg.senderName.toLowerCase()))
            );

            const isMe =
              msg.senderId === activeSenderId ||
              (loggedInMember && msg.senderId === loggedInMember.id) ||
              (msg.senderName && activeSenderName && msg.senderName.trim().toLowerCase() === activeSenderName.trim().toLowerCase()) ||
              (currentUser?.name && msg.senderName && msg.senderName.trim().toLowerCase().includes(currentUser.name.trim().toLowerCase())) ||
              (currentUser?.email && msg.senderId === currentUser.email) ||
              msg.senderName?.includes('(Me)');

            const resolvedAvatar = isMe
              ? (activeSenderAvatar || msg.senderAvatar || senderMember?.avatar || '')
              : (msg.senderAvatar || senderMember?.avatar || '');

            const displayName = isMe ? 'You' : (msg.senderName || senderMember?.name || 'User');
            const isSystemOrExpense = msg.type === 'expense_added' || msg.type === 'settlement_update';

            if (isSystemOrExpense) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="neu-upper-sm text-slate-900 text-xs font-bold px-4 py-2 rounded-2xl shadow-sm flex items-center gap-2 max-w-md text-center">
                    <Receipt className="w-4 h-4 text-slate-900 shrink-0" />
                    <span>{msg.text}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 w-full ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isMe && (
                  <MemberAvatar
                    name={displayName}
                    avatar={resolvedAvatar}
                    size="sm"
                    className="w-8 h-8 rounded-2xl neu-upper-sm mt-0.5 shrink-0"
                  />
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[78%] sm:max-w-[72%] rounded-2xl p-3 shadow-md text-xs space-y-1 ${
                    isMe
                      ? 'bg-slate-900 text-white rounded-tr-none ml-auto'
                      : 'neu-upper-sm text-slate-900 rounded-tl-none mr-auto'
                  }`}
                >
                  <div className={`flex items-center justify-between gap-3 text-[10px] font-bold border-b pb-1 ${isMe ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-600'}`}>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <MemberAvatar
                        name={displayName}
                        avatar={resolvedAvatar}
                        size="xs"
                        className="w-4 h-4 text-[8px] shrink-0 border border-current/20 shadow-xs"
                      />
                      <span className={`truncate ${isMe ? 'text-emerald-400 font-extrabold' : 'text-slate-950 font-black'}`}>
                        {displayName}
                      </span>
                    </div>
                    <span className="text-[9px] opacity-80 shrink-0">{msg.timestamp}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium leading-relaxed break-words pt-0.5">
                    {msg.text}
                  </p>
                </div>

                {isMe && (
                  <MemberAvatar
                    name={activeSenderName}
                    avatar={resolvedAvatar}
                    size="sm"
                    className="w-8 h-8 rounded-2xl neu-upper-sm mt-0.5 shrink-0"
                  />
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer Input Controls */}
        <div className="p-3 sm:p-4 neu-upper shrink-0 space-y-2 border-t border-slate-300/60">
          {/* Logged in sender identity label with Profile Image */}
          <div className="flex items-center justify-between text-xs text-slate-800 px-1">
            <div className="flex items-center gap-2 font-bold text-[11px]">
              <span className="text-slate-600">Chatting as:</span>
              <span className="inline-flex items-center gap-1.5 neu-upper-sm text-slate-950 font-black px-2.5 py-0.5 rounded-full">
                <MemberAvatar
                  name={activeSenderName}
                  avatar={activeSenderAvatar}
                  size="xs"
                  className="w-4.5 h-4.5 text-[8px] shrink-0 shadow-xs"
                />
                <span>{activeSenderName}</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-700 font-extrabold uppercase">
              Logged In User
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Send message as ${activeSenderName.split(' ')[0]}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 neu-lower rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-500 focus:outline-none"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-[#07193F] hover:bg-[#0B2556] text-white font-black px-4 py-3 rounded-2xl neu-upper-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 active:scale-95 shrink-0 text-xs sm:text-sm cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
