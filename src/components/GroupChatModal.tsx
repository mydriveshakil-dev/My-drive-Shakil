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
} from 'lucide-react';
import { GlassContainer } from './GlassContainer';

interface GroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  messages: ChatMessage[];
  onSendMessage: (msg: { text: string; senderId: string; senderName?: string }) => void;
  currentUser?: UserAuthProfile | null;
}

export const GroupChatModal: React.FC<GroupChatModalProps> = ({
  isOpen,
  onClose,
  group,
  messages,
  onSendMessage,
  currentUser,
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

  const activeSenderId = loggedInMember?.id || 'm3';

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

  const handleQuickChipClick = (chipText: string) => {
    onSendMessage({
      text: chipText,
      senderId: activeSenderId,
      senderName: activeSenderName,
    });
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
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">
              Room Mates:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {group.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-1 bg-white text-slate-900 px-2 py-0.5 rounded-full border border-black text-[11px] font-bold whitespace-nowrap shadow-xs"
                >
                  <span className="w-5 h-5 rounded-full bg-black text-white text-[9px] font-black flex items-center justify-center">
                    {m.avatar}
                  </span>
                  <span>{m.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
          <span className="text-[10px] font-extrabold text-slate-800 hidden sm:inline-block">
            Auto-Sync to Google Sheet
          </span>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50">
          {messages.map((msg) => {
            const isMe = msg.senderId === 'm3' || msg.senderName.includes('(Me)');
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
                className={`flex items-start gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-2xl font-black text-xs flex items-center justify-center shrink-0 border shadow-sm ${
                    isMe
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-slate-900 border-black'
                  }`}
                >
                  {msg.senderAvatar}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[78%] sm:max-w-[70%] rounded-2xl p-3 shadow-md text-xs space-y-1 ${
                    isMe
                      ? 'bg-slate-900 text-white border border-black rounded-tr-none'
                      : 'bg-white text-slate-900 border border-black rounded-tl-none'
                  }`}
                >
                  <div className={`flex items-center justify-between gap-3 text-[10px] font-bold border-b pb-1 ${isMe ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'}`}>
                    <span className={isMe ? 'text-white' : 'text-slate-950'}>{msg.senderName}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-medium leading-relaxed break-words pt-0.5">
                    {msg.text}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Response Chips */}
        <div className="px-4 py-2 bg-slate-100 border-t border-black flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="text-[10px] font-black text-slate-900 whitespace-nowrap uppercase">Quick Reply:</span>
          {[
            '👍 Paid my share!',
            '🛒 Added new grocery receipt',
            '💡 DEWA bill due soon',
            '💳 Bank transfer sent to Mahadi',
            '📊 Please check Google Sheet',
          ].map((chip) => (
            <button
              key={chip}
              onClick={() => handleQuickChipClick(chip)}
              className="bg-white hover:bg-slate-200 text-slate-900 text-[11px] font-bold px-2.5 py-1 rounded-xl border border-black whitespace-nowrap transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              {chip}
            </button>
          ))}
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
