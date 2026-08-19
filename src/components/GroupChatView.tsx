import React, { useState, useEffect, useRef } from 'react';
import { Group, Member, ChatMessage, UserAuthProfile } from '../types';
import {
  MessageCircle,
  X,
  Send,
  Users,
  CheckCheck,
  Smile,
  ChevronDown,
  Clock,
  Radio,
  ArrowLeft,
} from 'lucide-react';
import { MemberAvatar } from './MemberAvatar';
import {
  getMessageTimestampMs,
  getStartOfCurrentMonthMs,
  isPhoneMatch,
  updateChatMessageReactionInFirestore,
  updateUserPresenceInFirestore,
  getIsQuotaExceeded,
} from '../lib/firebase';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

interface GroupChatViewProps {
  group: Group;
  messages: ChatMessage[];
  onSendMessage: (msg: { text: string; senderId: string; senderName?: string; senderAvatar?: string }) => void;
  currentUser?: UserAuthProfile | null;
  activeMemberIds?: string[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
  onBack?: () => void;
}

const MEMBER_NAME_COLORS = [
  '#0084FF', // Blue
  '#059669', // Emerald
  '#D97706', // Amber
  '#7C3AED', // Purple
  '#DB2777', // Pink
  '#0284C7', // Sky
  '#DC2626', // Red
  '#0D9488', // Teal
];

// Top reaction emojis for tap-and-hold reaction popup (WhatsApp style)
const POPULAR_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🔥', '👏'];

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🙏', '🍛', '💵', '🛒', '🥛', '☕', '🏠', '✨', '👏', '👌', '🎉', '😊', '😍', '🤩', '🙌', '💯', '🤝', '🥳', '😎', '💡'];

export const GroupChatView: React.FC<GroupChatViewProps> = ({
  group,
  messages,
  onSendMessage,
  currentUser,
  activeMemberIds = [],
  onToggleReaction,
  onBack,
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Dynamic visualViewport height for seamless mobile keyboard support (iOS & Android)
  const [viewportHeight, setViewportHeight] = useState<string>('100%');

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Lock body scrolling while full-screen group chat is active
  useEffect(() => {
    const origOverflow = document.body.style.overflow;
    const origPosition = document.body.style.position;
    const origWidth = document.body.style.width;
    const origHeight = document.body.style.height;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';

    return () => {
      document.body.style.overflow = origOverflow;
      document.body.style.position = origPosition;
      document.body.style.width = origWidth;
      document.body.style.height = origHeight;
    };
  }, []);

  // Track visualViewport changes when mobile keyboard opens/closes
  useEffect(() => {
    const updateViewport = () => {
      if (window.visualViewport) {
        setViewportHeight(`${window.visualViewport.height}px`);
        window.scrollTo(0, 0);
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 60);
      } else {
        setViewportHeight('100%');
      }
    };

    updateViewport();

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    }
    window.addEventListener('resize', updateViewport);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
        window.visualViewport.removeEventListener('scroll', updateViewport);
      }
      window.removeEventListener('resize', updateViewport);
    };
  }, []);

  // Presence heartbeat when chat page is active
  useEffect(() => {
    if (!group?.id) return;
    if (!getIsQuotaExceeded() && activeSenderId) {
      updateUserPresenceInFirestore(group.id, activeSenderId, activeSenderName);
    }
    const interval = setInterval(() => {
      if (!getIsQuotaExceeded() && activeSenderId) {
        updateUserPresenceInFirestore(group.id, activeSenderId, activeSenderName);
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [group?.id, activeSenderId, activeSenderName]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('auto');
  }, []);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages.length]);

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottomBtn(isScrolledUp);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    triggerHaptic(hapticPatterns.success);

    onSendMessage({
      text: inputText.trim(),
      senderId: activeSenderId,
      senderName: activeSenderName,
      senderAvatar: activeSenderAvatar,
    });
    setInputText('');
    setShowEmojiPicker(false);
    setActiveReactionMsgId(null);
    setTimeout(() => scrollToBottom('smooth'), 50);
  };

  const handleAddEmoji = (emoji: string) => {
    triggerHaptic(hapticPatterns.click);
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  // Long-press detection on touch devices
  const handleTouchStart = (msgId: string, e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      triggerHaptic(hapticPatterns.click);
      setActiveReactionMsgId(msgId);
    }, 380);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Toggle emoji reaction on message
  const handleToggleReaction = (messageId: string, emoji: string) => {
    triggerHaptic(hapticPatterns.click);
    setActiveReactionMsgId(null);

    const targetMsg = messages.find((m) => m.id === messageId);
    const existingReactions: Record<string, string[]> = {
      ...(targetMsg?.reactions || {}),
    };

    const userList = existingReactions[emoji] || [];
    let updatedList: string[];
    if (userList.includes(activeSenderId)) {
      updatedList = userList.filter((id) => id !== activeSenderId);
    } else {
      updatedList = [...userList, activeSenderId];
    }

    if (updatedList.length === 0) {
      delete existingReactions[emoji];
    } else {
      existingReactions[emoji] = updatedList;
    }

    if (onToggleReaction) {
      onToggleReaction(messageId, emoji);
    } else {
      updateChatMessageReactionInFirestore(group.id, messageId, existingReactions);
    }
  };

  const getMemberColor = (memberIdOrName: string) => {
    let hash = 0;
    for (let i = 0; i < memberIdOrName.length; i++) {
      hash = memberIdOrName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % MEMBER_NAME_COLORS.length;
    return MEMBER_NAME_COLORS[index];
  };

  // Filter ONLY members who are currently active at the same time (Online presence)
  const activeMembersList = group.members.filter((m) => {
    const isMe =
      (loggedInMember && m.id === loggedInMember.id) ||
      (currentUser?.email && m.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.mobileNumber &&
        (isPhoneMatch(m.phone, currentUser.mobileNumber) ||
          isPhoneMatch(m.mobileNumber, currentUser.mobileNumber))) ||
      (currentUser?.name && m.name.toLowerCase().includes(currentUser.name.toLowerCase())) ||
      (currentUser?.name && currentUser.name.toLowerCase().includes(m.name.toLowerCase()));

    if (isMe) return true; // Current active user is always active

    const isOnline =
      activeMemberIds.includes(m.id) ||
      (m.mobileNumber && activeMemberIds.some((aid) => isPhoneMatch(aid, m.mobileNumber))) ||
      (m.phone && activeMemberIds.some((aid) => isPhoneMatch(aid, m.phone))) ||
      (m.email && activeMemberIds.some((aid) => aid.toLowerCase() === m.email?.toLowerCase())) ||
      activeMemberIds.some((aid) => m.name.toLowerCase().includes(aid.toLowerCase()));

    return isOnline;
  });

  const filteredMessages = messages.filter((msg) => {
    const startOfMonthMs = getStartOfCurrentMonthMs();
    const msgTime = getMessageTimestampMs(msg);
    if (msgTime < startOfMonthMs) return false;
    if (msg.type === 'expense_added' || msg.type === 'settlement_update') return false;
    if (
      msg.text &&
      (msg.text.includes('Logged in') ||
        msg.text.includes('Added new') ||
        msg.text.includes('expense:'))
    )
      return false;
    return true;
  });

  return (
    <div
      onClick={() => {
        if (activeReactionMsgId) setActiveReactionMsgId(null);
      }}
      style={{
        height: viewportHeight,
        maxHeight: viewportHeight,
      }}
      className="fixed inset-0 z-[120] w-full flex flex-col bg-[#EFEAE2] text-slate-900 overflow-hidden select-none"
    >
      {/* 1. FIXED Full-Width Top Header (Always rigidly locked at the top) */}
      <div className="shrink-0 w-full z-40 px-3.5 py-2.5 sm:px-4 sm:py-3 bg-[#07193F] text-white flex items-center justify-between shadow-md border-b border-blue-950/40">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          {/* Group Room Avatar with online beacon */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#0052FF] text-white font-black flex items-center justify-center shadow-md border-2 border-white/20 text-base">
              <Users className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#07193F] shadow-xs" />
          </div>

          {/* Room Title & Online Subtitle (matching attached image) */}
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black text-white truncate tracking-tight">
              {group.name}
            </h2>
            <p className="text-[11px] text-blue-200/90 font-medium truncate flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse shrink-0" />
              <span className="truncate">
                {activeMembersList.map((m) => m.name.split(' ')[0]).join(', ')} • {activeMembersList.length} Active Now
              </span>
            </p>
          </div>
        </div>

        {/* Right Header: Circular Close / Exit Button */}
        <div className="flex items-center shrink-0">
          {onBack && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(hapticPatterns.click);
                onBack();
              }}
              aria-label="Close Chat"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/20 cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>
      </div>

      {/* WhatsApp Messages Canvas (Scrollable messages area) */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 w-full p-3.5 sm:p-4 overflow-y-auto space-y-3 relative overscroll-contain"
        style={{
          backgroundImage: `radial-gradient(#CBD5E1 0.75px, transparent 0.75px)`,
          backgroundSize: '16px 16px',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
        }}
      >
        {/* Date Separator Pill */}
        <div className="flex justify-center my-1 sticky top-1 z-10">
          <span className="text-[10px] font-black uppercase tracking-wider bg-white/90 text-slate-600 px-3.5 py-0.5 rounded-full shadow-2xs border border-slate-200/80">
            Today
          </span>
        </div>

        {filteredMessages.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-2 text-slate-500">
            <div className="w-12 h-12 rounded-full bg-white/90 shadow-sm flex items-center justify-center text-slate-400">
              <MessageCircle className="w-6 h-6" />
            </div>
            <p className="text-xs font-bold text-slate-600">No messages yet in this cycle.</p>
            <p className="text-[11px] text-slate-500 max-w-xs">
              Say hello or coordinate grocery, mess food & room bills with your roommates!
            </p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const senderMember = group.members.find(
              (m) =>
                m.id === msg.senderId ||
                (msg.senderName && m.name.toLowerCase() === msg.senderName.toLowerCase()) ||
                (msg.senderName && m.name.toLowerCase().includes(msg.senderName.toLowerCase()))
            );

            const isMe =
              msg.senderId === activeSenderId ||
              (loggedInMember && msg.senderId === loggedInMember.id) ||
              (msg.senderName &&
                activeSenderName &&
                msg.senderName.trim().toLowerCase() === activeSenderName.trim().toLowerCase()) ||
              (currentUser?.name &&
                msg.senderName &&
                msg.senderName.trim().toLowerCase().includes(currentUser.name.trim().toLowerCase())) ||
              (currentUser?.email && msg.senderId === currentUser.email) ||
              msg.senderName?.includes('(Me)');

            const resolvedAvatar = isMe
              ? activeSenderAvatar || msg.senderAvatar || senderMember?.avatar || ''
              : senderMember?.avatar || msg.senderAvatar || '';

            const rawDisplayName = isMe ? 'You' : msg.senderName || senderMember?.name || 'User';
            const memberColor = getMemberColor(rawDisplayName);

            const reactionsMap: Record<string, string[]> = msg.reactions || {};
            const reactionEntries = Object.entries(reactionsMap).filter(
              ([_, users]) => Array.isArray(users) && users.length > 0
            );

            const isLongPressed = activeReactionMsgId === msg.id;

            return (
              <div
                key={msg.id}
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                className={`flex items-end gap-1.5 w-full relative group ${
                  isMe ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Incoming Sender Avatar */}
                {!isMe && (
                  <MemberAvatar
                    name={rawDisplayName}
                    avatar={resolvedAvatar}
                    size="xs"
                    className="w-7 h-7 rounded-full neu-upper-sm mb-1 shrink-0 ring-1 ring-slate-300"
                  />
                )}

                {/* Message Container + Floating Reaction Popup */}
                <div className="relative max-w-[84%] sm:max-w-[72%]">
                  {/* Floating Reaction Bar */}
                  {(isLongPressed || (hoveredMessageId === msg.id && !activeReactionMsgId)) && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className={`absolute -top-10 ${
                        isMe ? 'right-0' : 'left-0'
                      } bg-white/95 backdrop-blur-md rounded-full shadow-xl border border-slate-300/80 px-2.5 py-1 flex items-center gap-1.5 z-40 animate-in fade-in zoom-in-95 duration-150`}
                    >
                      {POPULAR_REACTIONS.map((emoji) => {
                        const hasReacted = reactionsMap[emoji]?.includes(activeSenderId);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className={`text-base sm:text-lg hover:scale-130 active:scale-95 transition-transform p-0.5 cursor-pointer rounded-full ${
                              hasReacted ? 'bg-blue-100 ring-2 ring-blue-400' : ''
                            }`}
                            title={`React with ${emoji}`}
                          >
                            {emoji}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* WhatsApp Message Bubble */}
                  <div
                    onTouchStart={(e) => handleTouchStart(msg.id, e)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      triggerHaptic(hapticPatterns.click);
                      setActiveReactionMsgId(msg.id);
                    }}
                    className={`relative px-3.5 py-2 shadow-2xs text-xs space-y-0.5 transition-all select-text ${
                      isMe
                        ? 'bg-[#D9FDD3] text-[#111B21] rounded-2xl rounded-tr-xs border border-[#C2EDB7]'
                        : 'bg-white text-[#111B21] rounded-2xl rounded-tl-xs border border-slate-200/90'
                    } ${isLongPressed ? 'ring-2 ring-blue-500 scale-[1.02]' : ''}`}
                  >
                    {/* Sender Name */}
                    {!isMe && (
                      <div
                        className="font-black text-[11px] tracking-tight pb-0.5"
                        style={{ color: memberColor }}
                      >
                        {rawDisplayName}
                      </div>
                    )}

                    {/* Message Content */}
                    <p className="text-xs sm:text-[13px] leading-relaxed break-words font-medium select-text">
                      {msg.text}
                    </p>

                    {/* Bottom Row: Timestamp + Checkmarks */}
                    <div className="flex items-center justify-end gap-1 text-[10px] text-slate-500 font-medium select-none pt-0.5">
                      <span>{msg.timestamp || 'Now'}</span>
                      {isMe && (
                        <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB] stroke-[2.5]" />
                      )}
                    </div>
                  </div>

                  {/* Message Reactions Badges */}
                  {reactionEntries.length > 0 && (
                    <div
                      className={`flex items-center gap-1 mt-1 flex-wrap ${
                        isMe ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div className="bg-white/95 border border-slate-200/90 rounded-full px-2 py-0.5 text-[11px] shadow-2xs flex items-center gap-1">
                        {reactionEntries.map(([emoji, users]) => {
                          const isMyReaction = users.includes(activeSenderId);
                          return (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, emoji)}
                              className={`flex items-center gap-0.5 hover:scale-110 active:scale-95 transition-transform cursor-pointer px-1 rounded-full ${
                                isMyReaction ? 'bg-blue-50 text-blue-600 font-bold' : ''
                              }`}
                              title={isMyReaction ? 'Tap to remove reaction' : 'Tap to react'}
                            >
                              <span>{emoji}</span>
                              {users.length > 1 && (
                                <span className="text-[9px] font-bold text-slate-600">
                                  {users.length}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Floating Scroll to Bottom Button */}
      {showScrollBottomBtn && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-20 right-4 w-9 h-9 rounded-full bg-white text-slate-700 shadow-lg border border-slate-200 flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-20 cursor-pointer"
          title="Scroll to bottom"
        >
          <ChevronDown className="w-5 h-5 stroke-[2.5]" />
        </button>
      )}

      {/* 5. Collapsible Emoji Drawer */}
      {showEmojiPicker && (
        <div className="p-2.5 bg-white border-t border-slate-200 shrink-0 z-30 shadow-md animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-1.5 px-1">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
              Quick Reactions & Emojis
            </span>
            <button
              type="button"
              onClick={() => setShowEmojiPicker(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-1 text-lg sm:text-xl max-h-36 overflow-y-auto">
            {QUICK_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleAddEmoji(emoji)}
                className="p-1.5 rounded-lg hover:bg-slate-100 active:scale-90 transition-transform text-center cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 6. WhatsApp / Messenger Styled Bottom Input Bar (Fixed immediately above virtual keyboard) */}
      <div className="shrink-0 w-full z-40 px-3 py-2.5 sm:px-4 sm:py-3 bg-[#F0F2F5] border-t border-slate-300/80 pb-[max(env(safe-area-inset-bottom),0.75rem)] shadow-lg">
        <form onSubmit={handleSend} className="flex items-center gap-1.5 sm:gap-2">
          {/* Emoji Button */}
          <button
            type="button"
            onClick={() => {
              triggerHaptic(hapticPatterns.click);
              setShowEmojiPicker(!showEmojiPicker);
              setActiveReactionMsgId(null);
            }}
            aria-label="Emoji picker"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              showEmojiPicker ? 'bg-slate-300 text-slate-900' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Smile className="w-5 h-5 stroke-[2]" />
          </button>

          {/* Input Field (WhatsApp Capsule Style matching attached image) */}
          <div className="flex-1 relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              placeholder={`Message as ${activeSenderName.split(' ')[0]}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onFocus={() => {
                setShowEmojiPicker(false);
                setActiveReactionMsgId(null);
                setTimeout(() => scrollToBottom('smooth'), 120);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="w-full bg-white rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none shadow-2xs border border-slate-200"
            />
          </div>

          {/* Send Button (matching attached image) */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            aria-label="Send message"
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer ${
              inputText.trim()
                ? 'bg-[#0052FF] active:scale-95 text-white shadow-md'
                : 'bg-[#E1E8F5] text-slate-400'
            }`}
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
