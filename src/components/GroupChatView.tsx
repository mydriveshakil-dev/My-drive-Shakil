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
  Mic,
  Trash2,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
  Loader2,
  Bell,
  BellRing,
  Check,
  Smartphone,
} from 'lucide-react';
import { MemberAvatar } from './MemberAvatar';
import { VoiceMessagePlayer } from './VoiceMessagePlayer';
import {
  getMessageTimestampMs,
  getStartOfCurrentMonthMs,
  isPhoneMatch,
  updateChatMessageReactionInFirestore,
  updateUserPresenceInFirestore,
  getIsQuotaExceeded,
} from '../lib/firebase';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import { compressChatImage } from '../utils/imageCompressor';
import {
  registerPushNotifications,
  getNotificationPermissionStatus,
  sendTestPushNotification,
  isPushNotificationSupported,
} from '../utils/pushNotifications';

interface GroupChatViewProps {
  group: Group;
  messages: ChatMessage[];
  onSendMessage: (msg: {
    text: string;
    senderId: string;
    senderName?: string;
    senderAvatar?: string;
    type?: 'text' | 'voice' | 'image' | 'file' | 'expense_added' | 'settlement_update' | 'bill_reminder';
    audioUrl?: string;
    audioDuration?: number;
    fileUrl?: string;
    fileName?: string;
    fileType?: 'image' | 'file' | 'pdf';
    fileSize?: string;
  }) => void;
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

  // File Attachment State
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    type: 'image' | 'file' | 'pdf';
    dataUrl: string;
    size: string;
  } | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording state (WhatsApp Style)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isDiscardingRef = useRef(false);
  const recordingSecondsRef = useRef(0);

  // Dynamic visualViewport height for seamless mobile keyboard support (iOS & Android)
  const [viewportHeight, setViewportHeight] = useState<string>('100%');

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Swipe right-to-left gesture detection to close Group Chat
  const pageTouchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handlePageTouchStart = (e: React.TouchEvent) => {
    if (isRecording || lightboxImage || showPushInfoModal) return;
    const touch = e.touches[0];
    pageTouchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
  };

  const handlePageTouchEnd = (e: React.TouchEvent) => {
    if (!pageTouchStartRef.current || isRecording || lightboxImage || showPushInfoModal) {
      pageTouchStartRef.current = null;
      return;
    }

    const touch = e.changedTouches[0];
    const deltaX = pageTouchStartRef.current.x - touch.clientX; // positive when swiping right to left
    const deltaY = Math.abs(pageTouchStartRef.current.y - touch.clientY);
    const duration = Date.now() - pageTouchStartRef.current.time;

    // Right-to-left swipe condition:
    // 1. Swiped at least 55px towards left
    // 2. Horizontal movement is dominant compared to vertical scroll (deltaX > deltaY * 1.1)
    // 3. Deliberate gesture completed within 750ms
    if (deltaX > 55 && deltaX > deltaY * 1.1 && duration < 750) {
      if (onBack) {
        triggerHaptic(hapticPatterns.click);
        onBack();
      }
    }

    pageTouchStartRef.current = null;
  };

  // Clean up audio recording on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Web Push Notifications state & handlers
  const [pushStatus, setPushStatus] = useState<NotificationPermission | 'unsupported'>(() => getNotificationPermissionStatus());
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [pushToast, setPushToast] = useState<string | null>(null);
  const [showPushInfoModal, setShowPushInfoModal] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  useEffect(() => {
    setPushStatus(getNotificationPermissionStatus());
  }, []);

  const handleTogglePushNotifications = async () => {
    triggerHaptic(hapticPatterns.click);
    if (!isPushNotificationSupported()) {
      setPushToast('Push notifications are not supported on this browser.');
      setTimeout(() => setPushToast(null), 3500);
      return;
    }

    if (pushStatus === 'granted') {
      setShowPushInfoModal(true);
      return;
    }

    setIsEnablingPush(true);
    const res = await registerPushNotifications(group.id, activeSenderId, activeSenderName);
    setIsEnablingPush(false);

    if (res.success) {
      setPushStatus('granted');
      triggerHaptic(hapticPatterns.success);
      setPushToast('🔔 Push notifications active! You will receive alerts when messages arrive.');
      setTimeout(() => setPushToast(null), 4000);
    } else {
      triggerHaptic(hapticPatterns.error);
      setPushToast(res.error || 'Failed to enable notifications. Please check browser settings.');
      setTimeout(() => setPushToast(null), 4000);
    }
  };

  const handleSendTestPush = async (delaySeconds = 0) => {
    triggerHaptic(hapticPatterns.click);
    const res = await sendTestPushNotification(activeSenderName, delaySeconds);
    if (res.success) {
      triggerHaptic(hapticPatterns.success);
      setPushToast(res.message);
    } else {
      setPushToast(res.message);
    }
    setTimeout(() => setPushToast(null), 5000);
  };

  const handleReSyncDeviceToken = async () => {
    triggerHaptic(hapticPatterns.click);
    setIsEnablingPush(true);
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await sub.unsubscribe();
        }
      }
    } catch {}
    const res = await registerPushNotifications(group.id, activeSenderId, activeSenderName);
    setIsEnablingPush(false);
    if (res.success) {
      triggerHaptic(hapticPatterns.success);
      setPushToast('✅ Device push token refreshed & connected to lock screen delivery!');
    } else {
      setPushToast(res.error || 'Failed to refresh token.');
    }
    setTimeout(() => setPushToast(null), 4000);
  };

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

  const processFileAttachment = async (file: File) => {
    try {
      setIsProcessingFile(true);
      const isImg = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|bmp|heic)$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (isImg) {
        // High quality client-side compression for instant upload & guaranteed Firestore sync (<200KB)
        const { dataUrl, sizeKB } = await compressChatImage(file, 1200, 1200, 0.78);
        const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
        setAttachedFile({
          name: file.name || 'photo.jpg',
          type: 'image',
          dataUrl,
          size: sizeStr,
        });
        triggerHaptic(hapticPatterns.click);
      } else {
        // PDF or Document Attachment (keep under 750KB for reliable Firestore persistence)
        if (file.size > 750 * 1024) {
          alert('Please attach files under 750 KB for instant real-time chat delivery.');
          setIsProcessingFile(false);
          return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          const sizeKB = Math.round(file.size / 1024);
          const sizeStr = sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`;
          setAttachedFile({
            name: file.name,
            type: isPdf ? 'pdf' : 'file',
            dataUrl,
            size: sizeStr,
          });
          triggerHaptic(hapticPatterns.click);
          setIsProcessingFile(false);
        };
        reader.readAsDataURL(file);
        return;
      }
    } catch (err) {
      console.error('Error processing attachment:', err);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFileAttachment(file);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processFileAttachment(file);
          break;
        }
      }
    }
  };

  const handleRemoveAttachment = () => {
    setAttachedFile(null);
    triggerHaptic(hapticPatterns.click);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedFile) return;

    triggerHaptic(hapticPatterns.success);

    if (attachedFile) {
      const isImg = attachedFile.type === 'image';
      onSendMessage({
        text: inputText.trim() || (isImg ? '📷 Photo' : `📎 ${attachedFile.name}`),
        type: isImg ? 'image' : 'file',
        fileUrl: attachedFile.dataUrl,
        fileName: attachedFile.name,
        fileType: attachedFile.type,
        fileSize: attachedFile.size,
        senderId: activeSenderId,
        senderName: activeSenderName,
        senderAvatar: activeSenderAvatar,
      });
      setAttachedFile(null);
    } else {
      onSendMessage({
        text: inputText.trim(),
        type: 'text',
        senderId: activeSenderId,
        senderName: activeSenderName,
        senderAvatar: activeSenderAvatar,
      });
    }

    setInputText('');
    setShowEmojiPicker(false);
    setActiveReactionMsgId(null);
    setTimeout(() => scrollToBottom('smooth'), 50);
  };

  // WhatsApp-style voice recording handlers
  const startVoiceRecording = async () => {
    try {
      setMicError(null);
      triggerHaptic(hapticPatterns.click);

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicError('Microphone not supported on this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];
      isDiscardingRef.current = false;
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);

      // Determine supported mimeType
      let mimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Stop all audio tracks
        stream.getTracks().forEach((track) => track.stop());
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

        if (isDiscardingRef.current) {
          setIsRecording(false);
          setRecordingSeconds(0);
          return;
        }

        const duration = recordingSecondsRef.current;
        if (duration < 1 && audioChunksRef.current.length === 0) {
          setIsRecording(false);
          setRecordingSeconds(0);
          return;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          triggerHaptic(hapticPatterns.success);

          onSendMessage({
            text: '🎤 Voice message',
            type: 'voice',
            audioUrl: base64Audio,
            audioDuration: Math.max(1, duration),
            senderId: activeSenderId,
            senderName: activeSenderName,
            senderAvatar: activeSenderAvatar,
          });

          setIsRecording(false);
          setRecordingSeconds(0);
          setTimeout(() => scrollToBottom('smooth'), 60);
        };
      };

      recorder.start(100);
      setIsRecording(true);

      recordingTimerRef.current = setInterval(() => {
        recordingSecondsRef.current += 1;
        setRecordingSeconds(recordingSecondsRef.current);
      }, 1000);
    } catch (err: any) {
      console.error('Microphone error:', err);
      setIsRecording(false);
      setMicError('Microphone permission required for voice notes.');
      setTimeout(() => setMicError(null), 4000);
    }
  };

  const cancelVoiceRecording = () => {
    triggerHaptic(hapticPatterns.click);
    isDiscardingRef.current = true;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    setIsRecording(false);
    setRecordingSeconds(0);
  };

  const sendVoiceRecording = () => {
    triggerHaptic(hapticPatterns.click);
    isDiscardingRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const formatRecordingTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
      onTouchStart={handlePageTouchStart}
      onTouchEnd={handlePageTouchEnd}
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
        <div className="flex items-center gap-2 shrink-0">
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

      {/* Push Notification Banner (Visible if permissions not yet granted and not dismissed) */}
      {pushStatus !== 'granted' && !isBannerDismissed && (
        <div className="shrink-0 bg-gradient-to-r from-[#07193F] to-[#0A2E6E] text-white px-3.5 py-2 flex items-center justify-between border-b border-blue-400/20 text-xs shadow-inner">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <Smartphone className="w-4 h-4 text-blue-300 shrink-0" />
            <span className="truncate text-blue-100 text-[11px] sm:text-xs">
              Receive mobile notifications even when the app is closed.
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleTogglePushNotifications}
              disabled={isEnablingPush}
              className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[11px] font-bold rounded-lg shadow-xs transition-all cursor-pointer flex items-center gap-1"
            >
              {isEnablingPush ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
              <span>Enable</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBannerDismissed(true)}
              className="p-1 hover:bg-white/10 text-white/70 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Push Notification Toast Notification */}
      {pushToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-slate-900/95 backdrop-blur-md text-white rounded-full text-xs font-semibold shadow-2xl border border-white/20 flex items-center gap-2 max-w-[92vw] text-center animate-in fade-in slide-in-from-top-2 duration-200">
          <span>{pushToast}</span>
        </div>
      )}

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

                    {/* Message Content (Voice Player, Image Attachment, File Attachment, or Text) */}
                    {msg.type === 'voice' && msg.audioUrl ? (
                      <VoiceMessagePlayer
                        audioUrl={msg.audioUrl}
                        duration={msg.audioDuration}
                        isMe={isMe}
                      />
                    ) : (msg.type === 'image' || msg.fileType === 'image' || (msg.fileUrl && (msg.fileUrl.startsWith('data:image/') || /\.(jpeg|jpg|gif|png|webp|bmp|heic)/i.test(msg.fileUrl)))) ? (
                      <div className="space-y-1.5 py-0.5 max-w-[260px] sm:max-w-[300px]">
                        <div
                          onClick={() =>
                            setLightboxImage({
                              url: msg.fileUrl!,
                              title: msg.fileName || msg.text || 'Attached Photo',
                            })
                          }
                          className="relative group/img overflow-hidden rounded-xl bg-slate-900/10 cursor-pointer border border-black/10 shadow-xs"
                        >
                          <img
                            src={msg.fileUrl}
                            alt={msg.fileName || 'Attached Photo'}
                            className="w-full max-h-56 object-cover hover:scale-102 transition-transform duration-200"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <span className="bg-white/90 text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md">
                              Tap to zoom
                            </span>
                          </div>
                        </div>
                        {msg.text && msg.text !== '📷 Photo' && (
                          <p className="text-xs sm:text-[13px] leading-relaxed break-words font-medium select-text pt-0.5">
                            {msg.text}
                          </p>
                        )}
                      </div>
                    ) : (msg.type === 'file' || msg.fileType === 'file' || msg.fileType === 'pdf') && msg.fileUrl ? (
                      <div className="space-y-1.5 py-0.5 max-w-[240px] sm:max-w-[280px]">
                        <a
                          href={msg.fileUrl}
                          download={msg.fileName || 'document'}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-white/80 hover:bg-white border border-slate-300/80 shadow-2xs transition-all group/doc"
                        >
                          <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5 stroke-[2]" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-xs font-bold text-slate-900 truncate group-hover/doc:text-blue-600">
                              {msg.fileName || 'Attached Document'}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-500">
                              {msg.fileSize || 'Document'} • Tap to download
                            </p>
                          </div>
                          <Download className="w-4 h-4 text-slate-400 group-hover/doc:text-blue-600 shrink-0" />
                        </a>
                        {msg.text && !msg.text.startsWith('📎') && (
                          <p className="text-xs sm:text-[13px] leading-relaxed break-words font-medium select-text pt-0.5">
                            {msg.text}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs sm:text-[13px] leading-relaxed break-words font-medium select-text">
                        {msg.text}
                      </p>
                    )}

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

      {/* 6. WhatsApp Styled Bottom Input Bar with 3 Side-by-Side Action Buttons */}
      <div
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px) + 36px, 48px)',
        }}
        className="shrink-0 w-full z-40 px-2.5 pt-2.5 sm:px-4 sm:pt-3.5 bg-[#F0F2F5] border-t border-slate-300/80 shadow-[0_-6px_24px_rgba(0,0,0,0.1)]"
      >
        {micError && (
          <div className="mb-2.5 p-2 bg-red-100 text-red-800 text-xs font-bold rounded-xl border border-red-200 text-center animate-in fade-in duration-150">
            {micError}
          </div>
        )}

        {/* Selected Attachment Preview Pill */}
        {attachedFile && !isRecording && (
          <div className="mb-2 p-2 bg-white rounded-2xl border border-blue-200 shadow-sm flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150">
            <div className="flex items-center gap-2.5 min-w-0">
              {attachedFile.type === 'image' ? (
                <img
                  src={attachedFile.dataUrl}
                  alt={attachedFile.name}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0">
                  <FileText className="w-5 h-5 stroke-[2]" />
                </div>
              )}
              <div className="min-w-0 text-left">
                <p className="text-xs font-bold text-slate-800 truncate">{attachedFile.name}</p>
                <p className="text-[10px] font-semibold text-slate-500">{attachedFile.size} • Ready to send</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemoveAttachment}
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-500 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              title="Remove attached file"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Image / File Compressing Loading State */}
        {isProcessingFile && (
          <div className="mb-2 p-2 bg-blue-50 text-blue-800 text-xs font-bold rounded-xl border border-blue-200 flex items-center justify-center gap-2 animate-in fade-in duration-150">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <span>Optimizing image for fast delivery...</span>
          </div>
        )}

        {isRecording ? (
          /* WhatsApp Voice Recording Active Tray */
          <div className="flex items-center justify-between gap-2 w-full animate-in fade-in duration-200">
            {/* Trash / Cancel Button */}
            <button
              type="button"
              onClick={cancelVoiceRecording}
              aria-label="Discard recording"
              className="w-10 h-10 rounded-full flex items-center justify-center text-red-500 hover:bg-red-100/80 active:scale-90 transition-all cursor-pointer shrink-0 bg-white border border-red-200 shadow-2xs"
              title="Cancel and discard voice recording"
            >
              <Trash2 className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* Waveform & Timer Capsule */}
            <div className="flex-1 bg-white rounded-full px-4 py-2.5 flex items-center justify-between shadow-2xs border border-red-200">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-red-600">
                  {formatRecordingTime(recordingSeconds)}
                </span>
              </div>

              {/* Animated Waveform Visualizer */}
              <div className="flex items-center gap-1">
                {[10, 18, 14, 24, 16, 20, 12, 18, 22, 14, 18].map((height, i) => (
                  <span
                    key={i}
                    style={{
                      height: `${height}px`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                    className="w-1 bg-red-500 rounded-full animate-pulse inline-block"
                  />
                ))}
              </div>

              <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                Recording...
              </span>
            </div>

            {/* Send Voice Recording Button */}
            <button
              type="button"
              onClick={sendVoiceRecording}
              aria-label="Send voice message"
              className="w-10 h-10 rounded-full bg-[#00A884] hover:bg-[#008f6f] active:scale-95 text-white flex items-center justify-center shadow-md transition-all cursor-pointer shrink-0"
              title="Send voice message"
            >
              <Send className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        ) : (
          /* Standard Input Bar: Emoji + Scaled Input + 3 Side-by-Side Action Buttons (Send, Attach, Voice) */
          <form onSubmit={handleSend} className="flex items-center gap-1 sm:gap-1.5">
            {/* Emoji Picker Toggle Button */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(hapticPatterns.click);
                setShowEmojiPicker(!showEmojiPicker);
                setActiveReactionMsgId(null);
              }}
              aria-label="Emoji picker"
              className={`w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                showEmojiPicker ? 'bg-slate-300 text-slate-900' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Smile className="w-4.5 h-4.5 sm:w-5 sm:h-5 stroke-[2]" />
            </button>

            {/* Message Typing Input Field (horizontally optimized for the 3 action buttons) */}
            <div className="flex-1 min-w-0 relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                placeholder={attachedFile ? 'Add a caption...' : `Message as ${activeSenderName.split(' ')[0]}...`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onPaste={handlePaste}
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
                className="w-full bg-white rounded-full px-3.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none shadow-2xs border border-slate-200"
              />
            </div>

            {/* Hidden Native File Input for Attachment */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            />

            {/* 3 Action Buttons Side-by-Side in Exact Same Alignment */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Button 1: Message Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() && !attachedFile}
                aria-label="Send message"
                className={`w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  inputText.trim() || attachedFile
                    ? 'bg-[#0052FF] hover:bg-[#0043D1] active:scale-95 text-white shadow-md cursor-pointer'
                    : 'bg-slate-200/90 text-slate-400 cursor-not-allowed opacity-60'
                }`}
                title="Send message"
              >
                <Send className="w-4 h-4 ml-0.5 stroke-[2.2]" />
              </button>

              {/* Button 2: File Attachment Button */}
              <button
                type="button"
                onClick={() => {
                  triggerHaptic(hapticPatterns.click);
                  fileInputRef.current?.click();
                }}
                aria-label="Attach file or photo"
                className={`w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                  attachedFile
                    ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500 border border-blue-400'
                    : 'bg-white hover:bg-slate-100 active:scale-95 text-slate-700 border border-slate-300/80 shadow-2xs'
                }`}
                title="Attach photo, bill receipt or document"
              >
                <Paperclip className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2] text-slate-700" />
              </button>

              {/* Button 3: Voice Note Recording Button */}
              <button
                type="button"
                onClick={startVoiceRecording}
                aria-label="Record voice message"
                className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-full bg-[#00A884] hover:bg-[#008f6f] active:scale-95 text-white flex items-center justify-center shadow-md shrink-0 transition-all cursor-pointer"
                title="Record voice note (WhatsApp style)"
              >
                <Mic className="w-4 h-4 sm:w-4.5 sm:h-4.5 stroke-[2.2]" />
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Full-Screen Lightbox Modal for Attached Image Previews */}
      {lightboxImage && (
        <div
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
        >
          {/* Header Controls */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl flex items-center justify-between text-white pb-3"
          >
            <span className="text-sm font-bold truncate max-w-[200px] sm:max-w-md">
              {lightboxImage.title || 'Photo View'}
            </span>
            <div className="flex items-center gap-2">
              <a
                href={lightboxImage.url}
                download="photo.jpg"
                className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold transition-all flex items-center gap-1.5"
                title="Download original image"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Full Resolution Image */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl max-h-[80vh] flex items-center justify-center overflow-hidden rounded-2xl shadow-2xl border border-white/10"
          >
            <img
              src={lightboxImage.url}
              alt="Full view"
              className="max-h-[78vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
      {/* Push Notification Diagnostics & Testing Modal */}
      {showPushInfoModal && (
        <div
          onClick={() => setShowPushInfoModal(false)}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 text-slate-900 border border-slate-200 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <BellRing className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Push Notifications</h3>
                  <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    Active on this device
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPushInfoModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 space-y-2 border border-slate-200/80 mb-3.5 max-h-[42vh] overflow-y-auto">
              <p className="font-semibold text-slate-800">
                ✅ When other members post in <span className="font-bold text-blue-900">{group.name}</span>, your device receives background push alerts with sound and vibration even if the screen is locked or the browser is closed.
              </p>
              
              <div className="p-2.5 bg-amber-50/80 border border-amber-200/70 rounded-lg text-[11px] text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1 text-amber-800">
                  📱 Mobile Lock-Screen Delivery Tips:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-950/90 text-[10.5px]">
                  <li><strong>Android:</strong> In Chrome App Info → Battery, set to <em>"Unrestricted"</em> so Android doesn't sleep background push. Ensure Lock Screen notifications are set to <em>"Show all content"</em>.</li>
                  <li><strong>iPhone (iOS):</strong> Tap Safari Share → <em>"Add to Home Screen"</em> (PWA) to receive background lock-screen pushes.</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleSendTestPush(5)}
                className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 active:scale-98 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <BellRing className="w-4 h-4 text-emerald-200 animate-pulse" />
                <span>Test Lock-Screen Alert (5s Delay)</span>
              </button>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSendTestPush(0)}
                  className="flex-1 py-2 px-3 bg-[#07193F] hover:bg-[#0A2E6E] active:scale-98 text-white rounded-xl font-bold text-[11px] shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Bell className="w-3.5 h-3.5 text-blue-300" />
                  <span>Instant Test</span>
                </button>
                <button
                  type="button"
                  onClick={handleReSyncDeviceToken}
                  disabled={isEnablingPush}
                  className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-xl border border-slate-200 active:scale-98 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  {isEnablingPush ? 'Refreshing...' : '🔄 Re-Sync'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowPushInfoModal(false)}
                className="w-full py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
