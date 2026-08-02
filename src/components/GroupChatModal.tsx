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
import { getMessageTimestampMs } from '../lib/firebase';

interface GroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  messages: ChatMessage[];
  onSendMessage: (msg: { text: string; senderId: string; senderName?: string }) => void;
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
      (currentUser?.mobileNumber && m.phone?.replace(/\D/g, '').includes(currentUser.mobileNumber.replace(/\D/g, '').slice(-7))) ||
      (currentUser?.name && m.name.toLowerCase().includes(currentUser.name.toLowerCase())) ||
      (currentUser?.name && currentUser.name.toLowerCase().includes(m.name.toLowerCase()))
  );

  const activeSenderName =
    currentUser?.name ||
    currentUser?.identity?.fullName ||
    loggedInMember?.name ||
    group?.members?.[0]?.name ||
    'Logged In User';

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
    });
    setInputText('');
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer"
    >
      <GlassContainer
        onClick={(e) => e.stopPropagation()}
        variant="modal"
        blur="3xl"
        className="w-full max-w-2xl h-[90vh] sm:h-[82vh] rounded-3xl border-2 border-black shadow-2xl flex flex-col overflow-hidden relative cursor-default bg-white text-slate-900"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b-2 border-black bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-black text-white font-black flex items-center justify-center shadow-md border border-black text-lg">
              <MessageCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-950">
                  {group.name} Chat
                </h2>
                <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-black flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {group.members.length} Members
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-slate-900" />
                Live Room Expenses & General Discussions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-900 flex items-center justify-center transition-colors border border-black cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room Active Members Bar */}
        <div className="px-4 py-2 bg-slate-100 border-b border-black flex items-center justify-between overflow-x-auto text-xs shrink-0">
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
                    className="flex items-center gap-1.5 bg-white text-slate-900 px-2.5 py-1 rounded-full border border-black text-[11px] font-bold whitespace-nowrap shadow-xs"
                  >
                    <span className="w-5 h-5 rounded-full bg-black text-white text-[9px] font-black flex items-center justify-center shrink-0">
                      {m.avatar}
                    </span>
                    <span>{m.name.split(' ')[0]}</span>
                    {isOnline ? (
                      <span
                        className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-300 animate-pulse shrink-0"
                        title="Active Online"
                      />
                    ) : (
                      <span
                        className="w-2 h-2 rounded-full bg-slate-300 shrink-0"
                        title="Offline"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <span className="text-[10px] font-extrabold text-slate-800 hidden sm:inline-block shrink-0 ml-2">
            Auto-Sync to Google Sheet
          </span>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50">
          {/* 3-Day Retention Notice Badge */}
          <div className="flex justify-center my-1">
            <span className="text-[10px] font-bold bg-amber-100 text-amber-950 border border-amber-300 px-3 py-1 rounded-full flex items-center gap-1 shadow-xs">
              <Clock className="w-3 h-3 text-amber-800 shrink-0" />
              <span>৩ দিনের আগের চ্যাট স্বয়ংক্রিয়ভাবে মুছে যায় (Auto-deleted after 3 days)</span>
            </span>
          </div>

          {messages
            .filter((msg) => {
              const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
              const msgTime = getMessageTimestampMs(msg);
              if (Date.now() - msgTime > THREE_DAYS_MS) return false;
              if (msg.type === 'expense_added' || msg.type === 'settlement_update') return false;
              if (msg.text && (msg.text.includes('Logged in') || msg.text.includes('Added new') || msg.text.includes('expense:'))) return false;
              return true;
            })
            .map((msg) => {
            const isMe =
              msg.senderId === activeSenderId ||
              (loggedInMember && msg.senderId === loggedInMember.id) ||
              (msg.senderName && activeSenderName && msg.senderName.trim().toLowerCase() === activeSenderName.trim().toLowerCase()) ||
              (currentUser?.name && msg.senderName && msg.senderName.trim().toLowerCase().includes(currentUser.name.trim().toLowerCase())) ||
              (currentUser?.email && msg.senderId === currentUser.email) ||
              msg.senderName.includes('(Me)');
            const isSystemOrExpense = msg.type === 'expense_added' || msg.type === 'settlement_update';

            if (isSystemOrExpense) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="bg-slate-200 border border-black text-slate-900 text-xs font-bold px-4 py-2 rounded-2xl shadow-sm flex items-center gap-2 max-w-md text-center">
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
                  <div className="w-8 h-8 rounded-2xl bg-white text-slate-900 font-black text-[10px] flex items-center justify-center shrink-0 border border-black shadow-sm mt-0.5">
                    {msg.senderAvatar || 'U'}
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`max-w-[78%] sm:max-w-[72%] rounded-2xl p-3 shadow-md text-xs space-y-1 ${
                    isMe
                      ? 'bg-slate-900 text-white border border-black rounded-tr-none ml-auto'
                      : 'bg-white text-slate-900 border border-black rounded-tl-none mr-auto'
                  }`}
                >
                  <div className={`flex items-center justify-between gap-3 text-[10px] font-bold border-b pb-1 ${isMe ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'}`}>
                    <span className={isMe ? 'text-emerald-400 font-extrabold' : 'text-slate-950 font-black'}>
                      {isMe ? 'You' : msg.senderName}
                    </span>
                    <span className="text-[9px] opacity-80">{msg.timestamp}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium leading-relaxed break-words pt-0.5">
                    {msg.text}
                  </p>
                </div>

                {isMe && (
                  <div className="w-8 h-8 rounded-2xl bg-emerald-950 text-white font-black text-[10px] flex items-center justify-center shrink-0 border border-emerald-900 shadow-sm mt-0.5">
                    {msg.senderAvatar || 'ME'}
                  </div>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer Input Controls */}
        <div className="p-3 sm:p-4 bg-white border-t-2 border-black shrink-0 space-y-2">
          {/* Logged in sender identity label */}
          <div className="flex items-center justify-between text-xs text-slate-800 px-1">
            <div className="flex items-center gap-1.5 font-bold text-[11px]">
              <span className="text-slate-600">Chatting as:</span>
              <span className="text-slate-950 font-black">{activeSenderName}</span>
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
              className="flex-1 bg-white border border-black rounded-2xl px-4 py-3 text-xs sm:text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-black"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-black hover:bg-slate-800 text-white font-black px-4 py-3 rounded-2xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 border border-black active:scale-95 shrink-0 text-xs sm:text-sm cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </div>
      </GlassContainer>
    </div>
  );
};
