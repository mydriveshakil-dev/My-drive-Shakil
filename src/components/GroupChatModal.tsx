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

interface GroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
  messages: ChatMessage[];
  onSendMessage: (msg: { text: string; senderId: string; senderName?: string; senderAvatar?: string }) => void;
  currentUser?: UserAuthProfile | null;
  activeMemberIds?: string[];
  onToggleReaction?: (messageId: string, emoji: string) => void;
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

export const GroupChatModal: React.FC<GroupChatModalProps> = ({
  isOpen,
  onClose,
  group,
  messages,
  onSendMessage,
  currentUser,
  activeMemberIds = [],
  onToggleReaction,
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
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Presence heartbeat when chat modal is open
  useEffect(() => {
    if (!isOpen || !group?.id) return;
    if (!getIsQuotaExceeded() && activeSenderId) {
      updateUserPresenceInFirestore(group.id, activeSenderId, activeSenderName);
    }
    const interval = setInterval(() => {
      if (!getIsQuotaExceeded() && activeSenderId) {
        updateUserPresenceInFirestore(group.id, activeSenderId, activeSenderName);
      }
    }, 45000);
    return () => clearInterval(interval);
  }, [isOpen, group?.id, activeSenderId, activeSenderName]);

  // Dynamic visualViewport handling for mobile keyboard lifting
  useEffect(() => {
    if (!isOpen) return;
    const updateViewport = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };
    updateViewport();
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport);
      window.visualViewport.addEventListener('scroll', updateViewport);
    }
    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateViewport);
        window.visualViewport.removeEventListener('scroll', updateViewport);
      }
    };
  }, [isOpen]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom('auto');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom('smooth');
    }
  }, [messages.length]);

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

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isScrolledUp = scrollHeight - scrollTop - clientHeight > 150;
    setShowScrollBottomBtn(isScrolledUp);
  };

  if (!isOpen) return null;

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
    // If user dragged finger more than 10px, cancel long-press so scroll proceeds smoothly
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

    if (isMe) return true; // Logged in user with active chat open is always active

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
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200 cursor-pointer overflow-hidden"
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          // Close reaction menu if clicked on background canvas
          if (activeReactionMsgId) setActiveReactionMsgId(null);
        }}
        style={{
          maxHeight: viewportHeight ? `${viewportHeight}px` : undefined,
          height: viewportHeight ? `${viewportHeight}px` : undefined,
        }}
        className="w-full max-w-2xl h-[100dvh] sm:h-[88vh] rounded-none sm:rounded-3xl shadow-2xl neu-upper border-0 sm:border border-slate-300/80 flex flex-col overflow-hidden relative cursor-default text-slate-900 bg-[#EFEAE2]"
      >
        {/* 1. WhatsApp / Messenger FIXED Top Header (Pinned at top of screen) */}
        <div className="sticky top-0 z-30 px-3.5 py-3 sm:px-4 sm:py-3.5 bg-gradient-to-r from-[#07193F] via-[#0B2556] to-[#041029] text-white flex items-center justify-between shrink-0 shadow-md border-b border-blue-950/40">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {/* Group Room Avatar with online beacon */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-gradient-to-tr from-[#0052FF] to-[#00A884] text-white font-black flex items-center justify-center shadow-md border-2 border-white/30 text-base">
                <Users className="w-5 h-5 stroke-[2.5]" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#07193F] shadow-xs animate-pulse" />
            </div>

            {/* Room Title & Online Subtitle */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-white truncate">
                  {group.name}
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-400/30 hidden sm:inline-block">
                  Room Chat
                </span>
              </div>
              <p className="text-[11px] text-blue-200/90 font-medium truncate flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse shrink-0" />
                <span className="truncate">
                  {activeMembersList.map((m) => m.name.split(' ')[0]).join(', ')} • {activeMembersList.length} Active Now
                </span>
              </p>
            </div>
          </div>

          {/* Right Header Action Icons & Close */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1 bg-white/10 px-2.5 py-1 rounded-full text-[11px] font-bold text-blue-100 border border-white/10">
              <span>Cycle: {group.billingCycle || 'Current'}</span>
            </div>

            <button
              onClick={() => {
                triggerHaptic(hapticPatterns.click);
                onClose();
              }}
              aria-label="Close Chat"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all border border-white/20 cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* 2. FIXED Active Members Bar (Directly pinned under top header; ONLY shows same-time active members) */}
        <div className="sticky top-[58px] sm:top-[64px] z-20 px-3 py-2 bg-[#E6DFD5] border-b border-slate-300/90 flex items-center justify-between text-xs shrink-0 overflow-x-auto shadow-2xs">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5 w-full">
            <span className="text-[10px] font-black text-emerald-900 bg-emerald-100/90 border border-emerald-300/80 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 flex items-center gap-1.5 shadow-2xs">
              <Radio className="w-3 h-3 text-emerald-600 animate-pulse shrink-0" />
              <span>Active Now ({activeMembersList.length}):</span>
            </span>

            <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto scrollbar-none">
              {activeMembersList.map((m) => {
                const isMe =
                  (loggedInMember && m.id === loggedInMember.id) ||
                  (currentUser?.email && m.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
                  (currentUser?.name && m.name.toLowerCase().includes(currentUser.name.toLowerCase()));

                const memberAvatar = isMe ? (activeSenderAvatar || m.avatar) : m.avatar;

                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-1.5 bg-white/95 hover:bg-white text-slate-900 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap shadow-2xs border border-emerald-300/80 transition-all shrink-0 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="relative shrink-0">
                      <MemberAvatar
                        name={m.name}
                        avatar={memberAvatar}
                        size="xs"
                        className="w-4.5 h-4.5 text-[8px] shrink-0 ring-1 ring-emerald-400"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-white" />
                    </div>
                    <span className="font-bold text-slate-800">{m.name.split(' ')[0]}</span>
                    {isMe && (
                      <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-1 rounded-md">
                        You
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 3. WhatsApp Messages Canvas (Scrollable messages area) */}
        <div
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 min-h-0 p-3.5 sm:p-4 overflow-y-auto space-y-3 relative overscroll-contain"
          style={{
            backgroundImage: `radial-gradient(#CBD5E1 0.75px, transparent 0.75px)`,
            backgroundSize: '16px 16px',
          }}
        >
          {/* Monthly Auto-Clear Notice Banner */}
          <div className="flex justify-center my-1">
            <span className="text-[10px] font-bold bg-[#FFF9E6] text-amber-900 border border-amber-300/80 px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
              <Clock className="w-3 h-3 text-amber-700 shrink-0" />
              <span>Messages auto-archive monthly • Fresh room chat starts on 1st</span>
            </span>
          </div>

          {/* Date Separator Pill */}
          <div className="flex justify-center my-2 sticky top-1 z-10">
            <span className="text-[10px] font-black uppercase tracking-wider bg-white/90 text-slate-600 px-3 py-0.5 rounded-full shadow-2xs border border-slate-200/80">
              Today
            </span>
          </div>

          {filteredMessages.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-slate-500">
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

              // Synchronized member avatar: always use latest profile image from senderMember / currentUser
              const resolvedAvatar = isMe
                ? activeSenderAvatar || msg.senderAvatar || senderMember?.avatar || ''
                : senderMember?.avatar || msg.senderAvatar || '';

              const rawDisplayName = isMe ? 'You' : msg.senderName || senderMember?.name || 'User';
              const memberColor = getMemberColor(rawDisplayName);

              // Reactions dictionary: emoji -> list of userIds
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
                    {/* Floating Reaction Bar (Triggered on Tap & Hold / Long Press or Hover or Active State) */}
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

                    {/* WhatsApp Message Bubble (Tap and hold to react) */}
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
                      {/* Sender Name in WhatsApp Color (for incoming group messages) */}
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
          <div className="p-2.5 bg-white border-t border-slate-200 shrink-0 z-20 shadow-md animate-in slide-in-from-bottom-2 duration-150">
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

        {/* 6. WhatsApp / Messenger Styled Bottom Input Bar (Fixed to bottom, lifts up with keyboard) */}
        <div className="sticky bottom-0 z-30 p-2.5 sm:p-3 bg-[#F0F2F5] border-t border-slate-300/80 shrink-0 pb-[max(env(safe-area-inset-bottom),0.65rem)]">
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
              <Smile className="w-5 h-5" />
            </button>

            {/* Input Field (WhatsApp Capsule Style) */}
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
                  setTimeout(() => scrollToBottom('smooth'), 150);
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

            {/* Send Button (WhatsApp Circular Green action) */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              aria-label="Send message"
              className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer shadow-md ${
                inputText.trim()
                  ? 'bg-[#00A884] hover:bg-[#008F6F] active:scale-95 text-white shadow-emerald-600/30'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-70'
              }`}
            >
              <Send className="w-4 h-4 sm:w-4.5 sm:h-4.5 ml-0.5 text-white" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
