import React, { useState, useEffect, useRef } from 'react';
import { Group, Member, ChatMessage } from '../types';
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
  onSendMessage: (msg: { text: string; senderId: string }) => void;
}

export const GroupChatModal: React.FC<GroupChatModalProps> = ({
  isOpen,
  onClose,
  group,
  messages,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedSenderId, setSelectedSenderId] = useState<string>(
    group.members.find((m) => m.name.includes('Shakil') || m.id === 'm3')?.id || group.members[0]?.id || 'm3'
  );

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

  const currentMember = group.members.find((m) => m.id === selectedSenderId) || group.members[0];

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage({
      text: inputText.trim(),
      senderId: selectedSenderId,
    });
    setInputText('');
  };

  const handleQuickChipClick = (chipText: string) => {
    onSendMessage({
      text: chipText,
      senderId: selectedSenderId,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <GlassContainer
        variant="emerald"
        blur="3xl"
        className="w-full max-w-2xl h-[90vh] sm:h-[82vh] rounded-3xl border border-white/30 shadow-2xl flex flex-col overflow-hidden relative"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/20 bg-emerald-950/40 flex items-center justify-between backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#F9A826] text-[#0B4A3F] font-black flex items-center justify-center shadow-lg shadow-amber-500/20 border border-white/40 text-lg">
              <MessageCircle className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {group.name} Chat
                </h2>
                <span className="bg-emerald-500/30 text-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {group.members.length} Members
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 font-medium flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#F9A826]" />
                Live Room Expenses & General Discussions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors border border-white/20"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Room Active Members Bar */}
        <div className="px-4 py-2 bg-black/20 border-b border-white/10 flex items-center justify-between overflow-x-auto text-xs shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wider">
              Room Mates:
            </span>
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {group.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-1 bg-white/10 text-white px-2 py-0.5 rounded-full border border-white/15 text-[11px] font-bold whitespace-nowrap"
                >
                  <span className="w-5 h-5 rounded-full bg-[#F9A826] text-[#0B4A3F] text-[9px] font-black flex items-center justify-center">
                    {m.avatar}
                  </span>
                  <span>{m.name.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
          <span className="text-[10px] font-semibold text-amber-300 hidden sm:inline-block">
            Auto-Sync to Google Sheet
          </span>
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-950/30">
          {messages.map((msg) => {
            const isMe = msg.senderId === 'm3' || msg.senderName.includes('(Me)');
            const isSystemOrExpense = msg.type === 'expense_added' || msg.type === 'settlement_update';

            if (isSystemOrExpense) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="bg-amber-500/20 border border-amber-400/40 backdrop-blur-xl text-amber-200 text-xs font-bold px-4 py-2 rounded-2xl shadow-lg flex items-center gap-2 max-w-md text-center">
                    <Receipt className="w-4 h-4 text-[#F9A826] shrink-0" />
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
                  className={`w-9 h-9 rounded-2xl font-black text-xs flex items-center justify-center shrink-0 border shadow-md ${
                    isMe
                      ? 'bg-[#F9A826] text-[#0B4A3F] border-white/40'
                      : 'bg-white/20 text-white border-white/30'
                  }`}
                >
                  {msg.senderAvatar}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[78%] sm:max-w-[70%] rounded-2xl p-3 shadow-xl backdrop-blur-xl text-xs space-y-1 ${
                    isMe
                      ? 'bg-[#0B4A3F]/90 text-white border border-emerald-400/30 rounded-tr-none'
                      : 'bg-white/15 text-white border border-white/20 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[10px] opacity-80 border-b border-white/10 pb-1">
                    <span className="font-extrabold text-amber-300">{msg.senderName}</span>
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
        <div className="px-4 py-2 bg-black/30 border-t border-white/10 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
          <span className="text-[10px] font-bold text-amber-300 whitespace-nowrap">Quick Reply:</span>
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
              className="bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold px-2.5 py-1 rounded-xl border border-white/20 whitespace-nowrap transition-all active:scale-95"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Footer Input Controls */}
        <div className="p-3 sm:p-4 bg-emerald-950/80 border-t border-white/20 backdrop-blur-2xl shrink-0 space-y-2">
          {/* Sender Switcher */}
          <div className="flex items-center justify-between text-xs text-emerald-200/90 px-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[11px]">Chatting as:</span>
              <select
                value={selectedSenderId}
                onChange={(e) => setSelectedSenderId(e.target.value)}
                className="bg-slate-900 border border-white/30 text-white text-xs font-bold rounded-xl px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-amber-400 cursor-pointer"
              >
                {group.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.avatar})
                  </option>
                ))}
              </select>
            </div>
            <span className="text-[10px] text-emerald-300 font-semibold hidden sm:inline">
              Active Sender: {currentMember.name}
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSend} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`Send message as ${currentMember.name.split(' ')[0]}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-white/10 border border-white/25 rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-amber-400 backdrop-blur-xl"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black px-4 py-3 rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 border border-white/30 active:scale-95 shrink-0 text-xs sm:text-sm"
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
