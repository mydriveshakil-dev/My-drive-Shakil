import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Group, Expense, UtilityBill, RentContribution, GoogleSheetsConfig, BillingCycleType, Member, ChatMessage, UserAuthProfile, PayToTransaction, GroupNotice, NoticeViewerRecord } from './types';
import { getCurrentCycleId, getBillingCycleLabel, getPreviousCycleOptions } from './utils/cycleUtils';
import {
  INITIAL_GROUP,
  INITIAL_EXPENSES,
  INITIAL_UTILITIES,
  INITIAL_RENT,
  INITIAL_SHEETS_CONFIG,
  INITIAL_CHAT_MESSAGES,
} from './data/initialData';
import { GoogleSheetsService } from './services/googleSheets';
import { triggerHaptic, hapticPatterns } from './utils/haptics';
import {
  subscribeToGroup,
  subscribeToAllGroups,
  saveGroupToFirestore,
  deleteGroupFromFirestore,
  saveUserProfileToFirestore,
  deleteUserProfileFromFirestore,
  subscribeToExpenses,
  saveExpenseToFirestore,
  deleteExpenseFromFirestore,
  subscribeToUtilities,
  saveUtilityToFirestore,
  deleteUtilityFromFirestore,
  subscribeToRent,
  saveRentToFirestore,
  subscribeToChatMessages,
  saveChatMessageToFirestore,
  updateChatMessageReactionInFirestore,
  subscribeToPayToTransactions,
  savePayToTransactionToFirestore,
  deletePayToTransactionFromFirestore,
  subscribeToUserPresences,
  updateUserPresenceInFirestore,
  getIsQuotaExceeded,
  getMessageTimestampMs,
  getStartOfCurrentMonthMs,
  auth,
  onAuthStateChanged,
  isPhoneMatch,
  cleanPhoneDigits,
} from './lib/firebase';

import { HeaderBar } from './components/HeaderBar';
import uaeMessLogo from './assets/images/uae_mess_logo_1785022712689.jpg';
import { DashboardView } from './components/DashboardView';
import { HomeDashboard } from './components/HomeDashboard';
import { AddExpenseView } from './components/AddExpenseView';
import { UtilitiesAndRentView } from './components/UtilitiesAndRentView';
import { ReportAndSettlementView } from './components/ReportAndSettlementView';
import { GroupManagementView } from './components/GroupManagementView';
import { PayToView } from './components/PayToView';
import { ArchitectureGuideModal } from './components/ArchitectureGuideModal';
import { CurrencySettingsModal } from './components/CurrencySettingsModal';
import { GroupChatView } from './components/GroupChatView';
import { UaeLoginModal } from './components/UaeLoginModal';
import { InstallPwaModal } from './components/InstallPwaModal';
import { GroupNoteModal } from './components/GroupNoteModal';
import { GroupNoticePopupModal } from './components/GroupNoticePopupModal';
import { UserProfileModal } from './components/UserProfileModal';
import { getLoggedInMember, hasUserSetProfilePicture } from './utils/permissionUtils';
import { GlassContainer } from './components/GlassContainer';
import { BottomNavBar, AppTabType } from './components/BottomNavBar';
import { CheckCircle2, MessageCircle, Plus, AlertCircle, Bell, BellRing, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  registerPushNotifications,
  sendGroupPushNotification,
  showLocalChatMessageNotification,
} from './utils/pushNotifications';
import { playNotificationSound, triggerNotificationVibration } from './utils/notificationSound';

export default function App() {
  const [allGroups, setAllGroups] = useState<Group[]>(() => {
    const saved = localStorage.getItem('all_room_groups');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return [INITIAL_GROUP];
  });

  const [group, setGroup] = useState<Group>(() => {
    const savedAuth = localStorage.getItem('uae_user_auth');
    if (savedAuth) {
      try {
        const auth: UserAuthProfile = JSON.parse(savedAuth);
        if (auth.isLoggedIn) {
          if (auth.linkedGroupId) {
            const match = allGroups.find((g) => g.id === auth.linkedGroupId);
            if (match) return match;
          }
          const userMobile = auth.mobileNumber;
          const userEmail = auth.email;
          const userName = auth.name;
          const matched = allGroups.find((g) =>
            (g.members || []).some(
              (m) =>
                isPhoneMatch(m.mobileNumber, userMobile) ||
                isPhoneMatch(m.phone, userMobile) ||
                isPhoneMatch(m.email, userMobile) ||
                (userEmail && m.email && m.email.toLowerCase() === userEmail.toLowerCase()) ||
                (userName && m.name && m.name.toLowerCase().includes(userName.toLowerCase())) ||
                (userName && m.name && userName.toLowerCase().includes(m.name.toLowerCase()))
            )
          );
          if (matched) return matched;
        }
      } catch (e) {
        // Fallback
      }
    }
    return allGroups[0] || INITIAL_GROUP;
  });

  // Group-specific data isolation helper
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const key = `room_expenses_${group.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return group.id === INITIAL_GROUP.id ? INITIAL_EXPENSES : [];
  });

  const [utilities, setUtilities] = useState<UtilityBill[]>(() => {
    const key = `room_utilities_${group.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return group.id === INITIAL_GROUP.id ? INITIAL_UTILITIES : [];
  });

  const [rent, setRent] = useState<RentContribution>(() => {
    const key = `room_rent_${group.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return INITIAL_RENT;
  });
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(INITIAL_SHEETS_CONFIG);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const key = `room_chat_messages_${group.id}`;
    const saved = localStorage.getItem(key);
    const startOfMonthMs = getStartOfCurrentMonthMs();
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((m: ChatMessage) => getMessageTimestampMs(m) >= startOfMonthMs);
        }
      } catch (e) {
        // Fallback
      }
    }
    return group.id === INITIAL_GROUP.id ? INITIAL_CHAT_MESSAGES.filter((m: ChatMessage) => getMessageTimestampMs(m) >= startOfMonthMs) : [];
  });

  const [payToTransactions, setPayToTransactions] = useState<PayToTransaction[]>(() => {
    const key = `room_payto_${group.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return [];
  });

  // Group Switch Reset Effect: Ensure strict data isolation whenever group.id changes
  useEffect(() => {
    if (!group.id) return;

    const expKey = `room_expenses_${group.id}`;
    const savedExp = localStorage.getItem(expKey);
    if (savedExp) {
      try {
        let parsed = JSON.parse(savedExp);
        if (Array.isArray(parsed)) {
          parsed = parsed.filter((e: Expense) => (e.groupId ? e.groupId === group.id : group.id === INITIAL_GROUP.id));
          setExpenses(parsed);
        } else {
          setExpenses([]);
        }
      } catch (e) {
        setExpenses([]);
      }
    } else {
      setExpenses(group.id === INITIAL_GROUP.id ? INITIAL_EXPENSES : []);
    }

    const utilKey = `room_utilities_${group.id}`;
    const savedUtil = localStorage.getItem(utilKey);
    if (savedUtil) {
      try {
        let parsed = JSON.parse(savedUtil);
        if (Array.isArray(parsed)) {
          parsed = parsed.filter((u: UtilityBill) => (u.groupId ? u.groupId === group.id : group.id === INITIAL_GROUP.id));
          setUtilities(parsed);
        } else {
          setUtilities([]);
        }
      } catch (e) {
        setUtilities([]);
      }
    } else {
      setUtilities(group.id === INITIAL_GROUP.id ? INITIAL_UTILITIES : []);
    }

    const rentKey = `room_rent_${group.id}`;
    const savedRent = localStorage.getItem(rentKey);
    if (savedRent) {
      try {
        setRent(JSON.parse(savedRent));
      } catch (e) {
        setRent(INITIAL_RENT);
      }
    } else {
      setRent(INITIAL_RENT);
    }

    const chatKey = `room_chat_messages_${group.id}`;
    const savedChat = localStorage.getItem(chatKey);
    const startOfMonthMs = getStartOfCurrentMonthMs();
    if (savedChat) {
      try {
        const parsed = JSON.parse(savedChat);
        setChatMessages(Array.isArray(parsed) ? parsed.filter((m: ChatMessage) => getMessageTimestampMs(m) >= startOfMonthMs) : []);
      } catch (e) {
        setChatMessages([]);
      }
    } else {
      const initialMsgs = group.id === INITIAL_GROUP.id
        ? INITIAL_CHAT_MESSAGES.filter((m: ChatMessage) => getMessageTimestampMs(m) >= startOfMonthMs)
        : [];
      setChatMessages(initialMsgs);
    }

    const payToKey = `room_payto_${group.id}`;
    const savedPayTo = localStorage.getItem(payToKey);
    if (savedPayTo) {
      try {
        const parsed = JSON.parse(savedPayTo);
        setPayToTransactions(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        setPayToTransactions([]);
      }
    } else {
      setPayToTransactions([]);
    }

    setBillingCycleType('current');
  }, [group.id]);

  const [activeMemberIds, setActiveMemberIds] = useState<string[]>([]);

  // Keep state refs updated for global async handlers
  const expensesRef = useRef(expenses);
  const utilitiesRef = useRef(utilities);
  const rentRef = useRef(rent);
  const groupRef = useRef(group);
  const activeTabRef = useRef<AppTabType>('home');
  const seenMessageIdsRef = useRef<Set<string>>(new Set());
  const isInitialChatSyncRef = useRef<boolean>(true);

  useEffect(() => {
    expensesRef.current = expenses;
  }, [expenses]);

  useEffect(() => {
    utilitiesRef.current = utilities;
  }, [utilities]);

  useEffect(() => {
    rentRef.current = rent;
  }, [rent]);

  useEffect(() => {
    groupRef.current = group;
  }, [group]);
  useEffect(() => {
    // 0. All Groups subscription for multi-device group sync
    const unsubAllGroups = subscribeToAllGroups((remoteGroups) => {
      if (remoteGroups && remoteGroups.length > 0) {
        setAllGroups(remoteGroups);
        localStorage.setItem('all_room_groups', JSON.stringify(remoteGroups));

        const savedAuth = localStorage.getItem('uae_user_auth');
        let authObj: UserAuthProfile | null = null;
        if (savedAuth) {
          try {
            authObj = JSON.parse(savedAuth);
          } catch (e) {
            // Fallback
          }
        }

        if (authObj && authObj.isLoggedIn && authObj.role === 'user') {
          const userMobile = authObj.mobileNumber;
          const userEmail = authObj.email;
          let matched: Group | undefined | null = null;

          // 1. First priority: Linked Group ID
          if (authObj.linkedGroupId) {
            matched = remoteGroups.find((g) => g.id === authObj.linkedGroupId);
          }

          // 2. Second priority: Match by exact phone or email
          if (!matched) {
            matched = remoteGroups.find((g) =>
              (g.members || []).some(
                (m) =>
                  isPhoneMatch(m.mobileNumber, userMobile) ||
                  isPhoneMatch(m.phone, userMobile) ||
                  isPhoneMatch(m.email, userMobile) ||
                  (userEmail && m.email && m.email.toLowerCase() === userEmail.toLowerCase())
              )
            );
          }

          if (matched) {
            setGroup((prev) => {
              if (prev.id === matched!.id && JSON.stringify(prev) === JSON.stringify(matched)) return prev;
              return matched!;
            });
            return;
          }
        }

        const matchingCurrent = remoteGroups.find((g) => g.id === group.id);
        if (matchingCurrent) {
          setGroup((prev) => {
            if (prev.id === matchingCurrent.id && JSON.stringify(prev) === JSON.stringify(matchingCurrent)) return prev;
            return matchingCurrent;
          });
        } else if (remoteGroups.length > 0) {
          setGroup((prev) => {
            if (prev.id === remoteGroups[0].id && JSON.stringify(prev) === JSON.stringify(remoteGroups[0])) return prev;
            return remoteGroups[0];
          });
        }
      }
    });

    // 0b. Firebase Auth session listener for multi-device auto-login
    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        const emailLower = firebaseUser.email.toLowerCase();
        const isAdmin = emailLower === 'mydriveshakil@gmail.com';
        const userProf: UserAuthProfile = {
          name: firebaseUser.displayName || (isAdmin ? 'Owner & Admin' : 'Mess Member'),
          email: firebaseUser.email,
          mobileNumber: isAdmin ? '+971544874028' : '+971500000000',
          password: 'GoogleAuth',
          idNumber: isAdmin ? 'ADMIN-01' : '',
          identity: null,
          isLoggedIn: true,
          role: isAdmin ? 'admin' : 'user',
        };
        setUserAuth(userProf);
        localStorage.setItem('uae_user_auth', JSON.stringify(userProf));
        if (!getIsQuotaExceeded()) {
          saveUserProfileToFirestore(userProf);
        }
        setIsLoginModalOpen(false);
        setActiveTab('dashboard');
      }
    });

    // 1. Group subscription
    const unsubGroup = subscribeToGroup(group.id, (remoteGroup) => {
      if (remoteGroup) {
        setGroup((prev) => {
          if (JSON.stringify(prev) === JSON.stringify(remoteGroup)) return prev;
          return remoteGroup;
        });
      }
    });

    // 2. Expenses subscription - Instant multi-device sync
    const unsubExp = subscribeToExpenses(group.id, (remoteExpenses) => {
      const groupExp = (remoteExpenses || []).filter((e) => {
        if (e.groupId) return e.groupId === group.id;
        return group.id === INITIAL_GROUP.id;
      });

      setExpenses(groupExp);
      localStorage.setItem(`room_expenses_${group.id}`, JSON.stringify(groupExp));
    });

    // 3. Utilities subscription - Instant multi-device sync
    const unsubUtil = subscribeToUtilities(group.id, (remoteUtilities) => {
      const groupUtil = (remoteUtilities || []).filter((u) => {
        if (u.groupId) return u.groupId === group.id;
        return group.id === INITIAL_GROUP.id;
      });

      setUtilities(groupUtil);
      localStorage.setItem(`room_utilities_${group.id}`, JSON.stringify(groupUtil));
    });

    // 4. Rent subscription - Instant multi-device sync
    const unsubRent = subscribeToRent(group.id, (remoteRent) => {
      if (remoteRent) {
        setRent(remoteRent);
        localStorage.setItem(`room_rent_${group.id}`, JSON.stringify(remoteRent));
      }
    });

    // 5. Chat messages subscription - Instant multi-device sync
    const unsubChat = subscribeToChatMessages(group.id, (remoteMsgs) => {
      if (remoteMsgs && remoteMsgs.length > 0) {
        setChatMessages(remoteMsgs);
        localStorage.setItem(`room_chat_messages_${group.id}`, JSON.stringify(remoteMsgs));

        const currentUser = userAuthRef.current;
        const currentUserId = currentUser.id || currentUser.mobileNumber || currentUser.email || 'user';

        if (isInitialChatSyncRef.current) {
          remoteMsgs.forEach((m) => seenMessageIdsRef.current.add(m.id));
          isInitialChatSyncRef.current = false;
        } else {
          // Detect incoming messages that were not in our seen list
          const brandNewMsgs = remoteMsgs.filter((m) => !seenMessageIdsRef.current.has(m.id));
          brandNewMsgs.forEach((m) => seenMessageIdsRef.current.add(m.id));

          const incomingFromOthers = brandNewMsgs.filter(
            (m) => m.senderId !== currentUserId && m.senderName !== currentUser.name
          );

          if (incomingFromOthers.length > 0) {
            const latest = incomingFromOthers[incomingFromOthers.length - 1];
            // Play notification chime & mobile vibration
            playNotificationSound();
            triggerNotificationVibration();

            const previewText =
              latest.type === 'voice'
                ? '🎤 Voice Message'
                : latest.type === 'image'
                ? '📷 Photo'
                : latest.type === 'file'
                ? `📎 ${latest.fileName || 'Document'}`
                : latest.text || 'New message';

            showLocalChatMessageNotification(
              `${latest.senderName} (${groupRef.current?.name || 'Mess Group'})`,
              previewText
            );

            if (activeTabRef.current !== 'chat') {
              setIncomingChatBanner({
                senderName: latest.senderName,
                text: previewText,
                avatar: latest.senderAvatar,
                type: latest.type,
              });
              setTimeout(() => {
                setIncomingChatBanner(null);
              }, 6000);
            }
          }
        }
      } else if (remoteMsgs && remoteMsgs.length === 0) {
        const saved = localStorage.getItem(`room_chat_messages_${group.id}`);
        const startOfMonthMs = getStartOfCurrentMonthMs();
        let localMsgs: ChatMessage[] = [];
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
              localMsgs = parsed.filter((m: ChatMessage) => getMessageTimestampMs(m) >= startOfMonthMs);
            }
          } catch (e) {}
        }
        if (localMsgs.length > 0) {
          setChatMessages(localMsgs);
        } else {
          setChatMessages([]);
        }
      }
    });

    // 6. PayTo subscription - Instant multi-device ledger sync
    const unsubPayTo = subscribeToPayToTransactions(group.id, (remotePayTo) => {
      if (Array.isArray(remotePayTo)) {
        setPayToTransactions(remotePayTo);
        localStorage.setItem(`room_payto_${group.id}`, JSON.stringify(remotePayTo));
      }
    });

    // 7. Presence subscription - Online active green dot tracking
    const unsubPresence = subscribeToUserPresences(group.id, (activeIds) => {
      setActiveMemberIds(activeIds);
    });

    return () => {
      unsubAllGroups();
      unsubAuth();
      unsubGroup();
      unsubExp();
      unsubUtil();
      unsubRent();
      unsubChat();
      unsubPayTo();
      unsubPresence();
    };
  }, [group.id]);

  // LocalStorage backup persistence
  useEffect(() => {
    localStorage.setItem(`room_expenses_${group.id}`, JSON.stringify(expenses));
  }, [expenses, group.id]);

  useEffect(() => {
    localStorage.setItem(`room_utilities_${group.id}`, JSON.stringify(utilities));
  }, [utilities, group.id]);

  useEffect(() => {
    localStorage.setItem(`room_chat_messages_${group.id}`, JSON.stringify(chatMessages));
  }, [chatMessages, group.id]);

  useEffect(() => {
    localStorage.setItem(`room_payto_${group.id}`, JSON.stringify(payToTransactions));
  }, [payToTransactions, group.id]);

  // User UAE Residence Visa Auth State
  const [userAuth, setUserAuth] = useState<UserAuthProfile>(() => {
    const saved = localStorage.getItem('uae_user_auth');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {
      email: 'mydriveshakil@gmail.com',
      mobileNumber: '+971 50 892 4102',
      idNumber: '784-1994-821034-1',
      identity: null,
      isLoggedIn: false,
      role: 'user',
    };
  });

  const userAuthRef = useRef(userAuth);
  useEffect(() => {
    userAuthRef.current = userAuth;
  }, [userAuth]);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => {
    return !userAuth.isLoggedIn;
  });
  const [isLoginSuccessAnimActive, setIsLoginSuccessAnimActive] = useState<boolean>(() => {
    return !!userAuth.isLoggedIn;
  });

  const [isGroupNoteModalOpen, setIsGroupNoteModalOpen] = useState<boolean>(false);
  const [activePopupNotice, setActivePopupNotice] = useState<GroupNotice | null>(null);
  const [isNoticePopupOpen, setIsNoticePopupOpen] = useState<boolean>(false);

  // Determine matching logged-in member and whether profile picture is set
  const loggedInMember = useMemo(() => {
    return getLoggedInMember(group, userAuth);
  }, [group, userAuth]);

  const hasProfilePic = useMemo(() => {
    return hasUserSetProfilePicture(userAuth, loggedInMember);
  }, [userAuth, loggedInMember]);

  const [isManualProfileModalOpen, setIsManualProfileModalOpen] = useState<boolean>(false);

  // Mandatory profile picture modal: active for regular room members without an uploaded profile picture once splash is finished (exempt for Admin)
  const isMandatoryProfileModalOpen = useMemo(() => {
    if (userAuth.role === 'admin') return false;
    return Boolean(userAuth.isLoggedIn && !isLoginModalOpen && !isLoginSuccessAnimActive && !hasProfilePic);
  }, [userAuth.isLoggedIn, userAuth.role, isLoginModalOpen, isLoginSuccessAnimActive, hasProfilePic]);

  const isProfileModalOpen = isMandatoryProfileModalOpen || isManualProfileModalOpen;

  // Trigger logo zoom animation on every app open / reload for logged-in users
  useEffect(() => {
    if (userAuth.isLoggedIn) {
      setIsLoginSuccessAnimActive(true);
      const timer = setTimeout(() => {
        setIsLoginSuccessAnimActive(false);
      }, 4200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-register device for push notifications when user is logged in
  useEffect(() => {
    if (userAuth.isLoggedIn && group?.id) {
      const activeUid = userAuth.id || userAuth.mobileNumber || userAuth.email || 'user';
      registerPushNotifications(group.id, activeUid, userAuth.name).catch(() => {});
    }
  }, [userAuth.isLoggedIn, userAuth.id, userAuth.mobileNumber, userAuth.email, userAuth.name, group?.id]);

  // Function to record member notice views and increment view count
  const recordNoticeView = async (targetGroup: Group, noticeId: string, user: UserAuthProfile) => {
    if (!targetGroup?.notice || targetGroup.notice.id !== noticeId) return;

    // Immediately mark as seen today in localStorage to prevent repeat triggers
    const todayStr = new Date().toISOString().slice(0, 10);
    const seenKey = `group_notice_seen_${targetGroup.id}_${noticeId}`;
    localStorage.setItem(seenKey, todayStr);

    const now = Date.now();
    const currentMember = targetGroup.members?.find(
      (m) =>
        (user?.idNumber && m.id === user.idNumber) ||
        (user?.name && m.name.toLowerCase() === user.name.toLowerCase()) ||
        (user?.mobileNumber && m.phone === user.mobileNumber)
    );

    const userName = user?.name || user?.identity?.fullName || currentMember?.name || 'Member';
    const userAvatar = user?.avatar || user?.identity?.photoUrl || currentMember?.avatar || '';
    const userId = currentMember?.id || user?.idNumber || user?.email || user?.mobileNumber || userName;
    const userKey = userId.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'user';

    const existingSeenBy: Record<string, NoticeViewerRecord> = {};
    if (targetGroup.notice.seenBy) {
      if (Array.isArray(targetGroup.notice.seenBy)) {
        targetGroup.notice.seenBy.forEach((rec) => {
          const k = (rec.userId || rec.userName).replace(/[^a-zA-Z0-9_\-]/g, '_');
          existingSeenBy[k] = rec;
        });
      } else if (typeof targetGroup.notice.seenBy === 'object') {
        Object.assign(existingSeenBy, targetGroup.notice.seenBy);
      }
    }

    const prevRecord = existingSeenBy[userKey];
    // Throttle duplicate records within 1 minute
    if (prevRecord && now - (prevRecord.lastViewedAtMs || 0) < 60000) {
      return;
    }

    const newRecord: NoticeViewerRecord = {
      userId,
      userName,
      userAvatar,
      viewCount: (prevRecord?.viewCount || 0) + 1,
      lastViewedAtMs: now,
      lastViewedAt: new Date(now).toISOString(),
    };

    existingSeenBy[userKey] = newRecord;

    const updatedNotice: GroupNotice = {
      ...targetGroup.notice,
      seenBy: existingSeenBy,
    };

    const updatedGroup: Group = {
      ...targetGroup,
      notice: updatedNotice,
    };

    if (targetGroup.id === group.id) {
      setGroup((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(updatedGroup)) return prev;
        return updatedGroup;
      });
    }
    setAllGroups((prev) => prev.map((g) => (g.id === targetGroup.id ? updatedGroup : g)));
    localStorage.setItem(`room_group_${targetGroup.id}`, JSON.stringify(updatedGroup));

    await saveGroupToFirestore(updatedGroup);
  };

  // Trigger daily Group Notice popup once per day per active notice for group members after animation
  // and auto-clean if notice has expired
  useEffect(() => {
    if (group?.notice) {
      const notice = group.notice;
      const now = Date.now();
      if (notice.expiresAtMs && now >= notice.expiresAtMs) {
        // Auto-delete expired notice
        handleSaveGroupNotice(null);
        return;
      }

      if (!isLoginSuccessAnimActive && userAuth.isLoggedIn && notice.expiresAtMs && now < notice.expiresAtMs) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const seenKey = `group_notice_seen_${group.id}_${notice.id}`;
        const lastSeen = localStorage.getItem(seenKey);
        if (lastSeen !== todayStr) {
          localStorage.setItem(seenKey, todayStr);
          setActivePopupNotice(notice);
          setIsNoticePopupOpen(true);
          // Automatically record view and increment count for this user
          recordNoticeView(group, notice.id, userAuth);
        }
      }
    }
  }, [isLoginSuccessAnimActive, userAuth.isLoggedIn, group?.notice?.id, group?.notice?.expiresAtMs, group?.id]);

  const handleCloseNoticePopup = () => {
    if (activePopupNotice && group?.id) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const seenKey = `group_notice_seen_${group.id}_${activePopupNotice.id}`;
      localStorage.setItem(seenKey, todayStr);
    }
    setIsNoticePopupOpen(false);
    setActivePopupNotice(null);
  };

  const [activeTab, setActiveTab] = useState<AppTabType>(() => {
    const saved = localStorage.getItem('uae_user_auth');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.isLoggedIn) {
          return 'dashboard';
        }
      } catch (e) {
        // Fallback
      }
    }
    return 'home';
  });

  const [incomingChatBanner, setIncomingChatBanner] = useState<{
    senderName: string;
    text: string;
    avatar?: string;
    type?: string;
  } | null>(null);

  const [notificationPermissionPrompt, setNotificationPermissionPrompt] = useState<boolean>(false);

  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (
        Notification.permission === 'default' &&
        userAuth.isLoggedIn &&
        !isLoginModalOpen &&
        !isLoginSuccessAnimActive
      ) {
        const timer = setTimeout(() => {
          setNotificationPermissionPrompt(true);
        }, 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [userAuth.isLoggedIn, isLoginModalOpen, isLoginSuccessAnimActive]);

  const handleEnablePushAlerts = async () => {
    triggerHaptic(hapticPatterns.click);
    setNotificationPermissionPrompt(false);
    const activeUid = userAuth.id || userAuth.mobileNumber || userAuth.email || 'user';
    const res = await registerPushNotifications(group.id, activeUid, userAuth.name);
    if (res.success) {
      triggerHaptic(hapticPatterns.success);
      playNotificationSound();
    }
  };
  const [billingCycleType, setBillingCycleType] = useState<BillingCycleType>('current');
  const [selectedPreviousCycle, setSelectedPreviousCycle] = useState<string>(() => {
    const prevs = getPreviousCycleOptions(1, group?.createdAt || group?.cycleId);
    return prevs[0]?.cycleId || '2026-07';
  });

  // Ensure manual refresh or page reload defaults to Current Cycle
  useEffect(() => {
    setBillingCycleType('current');
  }, []);

  // Presence Heartbeat Ping for active green dot
  useEffect(() => {
    if (!group.id || !userAuth.isLoggedIn) return;
    const matchedMem = (group?.members || []).find(
      (m) =>
        (userAuth?.email && m.email?.toLowerCase() === userAuth.email.toLowerCase()) ||
        (userAuth?.mobileNumber && m.phone?.replace(/\D/g, '').includes(userAuth.mobileNumber.replace(/\D/g, '').slice(-7))) ||
        (userAuth?.name && m.name.toLowerCase().includes(userAuth.name.toLowerCase()))
    );
    const memberId = matchedMem?.id || userAuth.mobileNumber || userAuth.email || 'user';
    const memberName = matchedMem?.name || userAuth.name || 'Room Member';

    if (!getIsQuotaExceeded()) {
      updateUserPresenceInFirestore(group.id, memberId, memberName);
    }
    const interval = setInterval(() => {
      if (!getIsQuotaExceeded()) {
        updateUserPresenceInFirestore(group.id, memberId, memberName);
      }
    }, 45000);

    return () => clearInterval(interval);
  }, [group.id, userAuth.isLoggedIn, userAuth.mobileNumber, userAuth.email, userAuth.name]);

  // Handlers for "PAY TO" Personal Ledger
  const handleSavePayToTransaction = (tx: PayToTransaction) => {
    setPayToTransactions((prev) => {
      const next = [tx, ...prev];
      localStorage.setItem(`room_payto_${group.id}`, JSON.stringify(next));
      return next;
    });
    savePayToTransactionToFirestore(group.id, tx);
  };

  const handleUpdatePayToAmount = (txId: string, newAmount: number) => {
    setPayToTransactions((prev) => {
      const target = prev.find((t) => t.id === txId);
      if (target) {
        savePayToTransactionToFirestore(group.id, { ...target, amount: newAmount });
      }
      const next = prev.map((tx) => (tx.id === txId ? { ...tx, amount: newAmount } : tx));
      localStorage.setItem(`room_payto_${group.id}`, JSON.stringify(next));
      return next;
    });
  };

  const handleMarkPayToReceived = (txId: string) => {
    setPayToTransactions((prev) => {
      const target = prev.find((t) => t.id === txId);
      if (target) {
        savePayToTransactionToFirestore(group.id, { ...target, status: 'paid' as const });
      }
      const next = prev.map((tx) => (tx.id === txId ? { ...tx, status: 'paid' as const } : tx));
      localStorage.setItem(`room_payto_${group.id}`, JSON.stringify(next));
      return next;
    });
  };

  const handleDeletePayToTransaction = (txId: string) => {
    setPayToTransactions((prev) => {
      const next = prev.filter((tx) => tx.id !== txId);
      localStorage.setItem(`room_payto_${group.id}`, JSON.stringify(next));
      return next;
    });
    deletePayToTransactionFromFirestore(group.id, txId);
  };

  const handleHardDeletePayToPreviousRecord = (txId: string) => {
    setPayToTransactions((prev) => {
      const next = prev.filter((tx) => tx.id !== txId);
      localStorage.setItem(`room_payto_${group.id}`, JSON.stringify(next));
      return next;
    });
    deletePayToTransactionFromFirestore(group.id, txId);
  };

  const currentCycleId = getCurrentCycleId();
  const currentCycleLabel = getBillingCycleLabel(currentCycleId);

  // Automatic monthly rollover on the 1st of every month
  useEffect(() => {
    if (group && (group.cycleId !== currentCycleId || group.billingCycle !== currentCycleLabel)) {
      const updatedGroup: Group = {
        ...group,
        cycleId: currentCycleId,
        billingCycle: currentCycleLabel,
      };
      setGroup(updatedGroup);
      saveGroupToFirestore(updatedGroup);
      setAllGroups((prev) => {
        const next = prev.map((g) => (g.id === group.id ? updatedGroup : g));
        localStorage.setItem('all_room_groups', JSON.stringify(next));
        return next;
      });
    }
  }, [group?.id, currentCycleId, currentCycleLabel]);

  const activeCycleId = billingCycleType === 'current'
    ? currentCycleId
    : (selectedPreviousCycle || getPreviousCycleOptions(1, group?.createdAt || group?.cycleId)[0]?.cycleId || '2026-07');

  const activeCycleLabel = billingCycleType === 'current'
    ? (group.billingCycle || currentCycleLabel)
    : getBillingCycleLabel(activeCycleId);

  const displayedGroup = useMemo(() => {
    return {
      ...group,
      cycleId: activeCycleId,
      billingCycle: activeCycleLabel,
    };
  }, [group, activeCycleId, activeCycleLabel]);

  const displayedExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const itemGroupId = e.groupId;
      if (itemGroupId && itemGroupId !== group.id) return false;
      if (!itemGroupId && group.id !== INITIAL_GROUP.id) return false;

      const expCycle = e.cycle || (e.date ? e.date.slice(0, 7) : '');
      if (expCycle) {
        return expCycle === activeCycleId;
      }
      return activeCycleId === currentCycleId;
    });
  }, [expenses, activeCycleId, currentCycleId, group.id]);

  const displayedUtilities = useMemo(() => {
    return utilities.filter((u) => {
      const itemGroupId = u.groupId;
      if (itemGroupId && itemGroupId !== group.id) return false;
      if (!itemGroupId && group.id !== INITIAL_GROUP.id) return false;

      const utilCycle = u.cycle || (u.date ? u.date.slice(0, 7) : '');
      if (utilCycle) {
        return utilCycle === activeCycleId;
      }
      return activeCycleId === currentCycleId;
    });
  }, [utilities, activeCycleId, currentCycleId, group.id]);

  const displayedRent = useMemo(() => {
    if (!rent) return rent;
    if (rent.cycle && rent.cycle !== activeCycleId) {
      return {
        ...rent,
        cycle: activeCycleId,
        totalRent: 0,
        paidMemberIds: [],
        status: 'pending' as const,
      };
    }
    return rent;
  }, [rent, activeCycleId]);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [isArchGuideOpen, setIsArchGuideOpen] = useState(false);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isInstallPwaOpen, setIsInstallPwaOpen] = useState(false);

  // Auto-hide navigation bar and group chat button when typing in any input/textarea
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        const inputType = (target as HTMLInputElement).type?.toLowerCase();
        if (['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'image'].includes(inputType)) {
          return;
        }
        setIsTyping(true);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const activeEl = document.activeElement as HTMLElement | null;
        if (
          activeEl &&
          (activeEl.tagName === 'INPUT' ||
            activeEl.tagName === 'TEXTAREA' ||
            activeEl.isContentEditable)
        ) {
          const inputType = (activeEl as HTMLInputElement).type?.toLowerCase();
          if (!['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'image'].includes(inputType)) {
            return;
          }
        }
        setIsTyping(false);
      }, 80);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Swipe Gesture Handler for Navigation Bar Tabs
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleNavigateNextTab = () => {
    if (isMandatoryProfileModalOpen) return;
    triggerHaptic(hapticPatterns.click);
    if (isAddExpenseOpen) {
      setIsAddExpenseOpen(false);
      setActiveTab('report');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (activeTab === 'dashboard' || activeTab === 'home') {
      setActiveTab('utilities');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (activeTab === 'utilities') {
      setIsAddExpenseOpen(true);
    } else if (activeTab === 'report') {
      setActiveTab('group');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNavigatePrevTab = () => {
    if (isMandatoryProfileModalOpen) return;
    triggerHaptic(hapticPatterns.click);
    if (isAddExpenseOpen) {
      setIsAddExpenseOpen(false);
      setActiveTab('utilities');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (activeTab === 'group' || activeTab === 'payto') {
      setActiveTab('report');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (activeTab === 'report') {
      setIsAddExpenseOpen(true);
    } else if (activeTab === 'utilities') {
      setActiveTab('dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null || touchStartYRef.current === null) return;

    const targetTag = (e.target as HTMLElement)?.tagName?.toUpperCase();
    if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(targetTag)) {
      touchStartXRef.current = null;
      touchStartYRef.current = null;
      return;
    }

    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const deltaX = endX - touchStartXRef.current;
    const deltaY = endY - touchStartYRef.current;

    touchStartXRef.current = null;
    touchStartYRef.current = null;

    // Minimum horizontal swipe distance 50px
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      if (deltaX < 0) {
        // Swiping finger to the left -> Next tab option
        handleNavigateNextTab();
      } else {
        // Swiping finger to the right -> Previous tab option
        handleNavigatePrevTab();
      }
    }
  };
  const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(() => {
    if (group?.id) {
      const saved = localStorage.getItem(`chat_last_read_time_${group.id}`);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
    return Date.now();
  });

  // When chat opens or active group changes, update last read timestamp
  useEffect(() => {
    if (activeTab === 'chat') {
      const now = Date.now();
      setLastReadTimestamp(now);
      if (group?.id) {
        localStorage.setItem(`chat_last_read_time_${group.id}`, String(now));
      }
    }
  }, [activeTab, group?.id]);

  // Calculate unread messages count (only messages sent by others after lastReadTimestamp in current month)
  const unreadCount = useMemo(() => {
    if (!chatMessages || chatMessages.length === 0 || activeTab === 'chat') return 0;
    const startOfMonthMs = getStartOfCurrentMonthMs();

    return chatMessages.filter((msg) => {
      const isMe =
        msg.senderId === userAuth.id ||
        msg.senderId === userAuth.linkedGroupId ||
        (userAuth.name && msg.senderName === userAuth.name);

      if (isMe) return false;

      const msgTime = getMessageTimestampMs(msg);
      if (msgTime < startOfMonthMs) return false;
      return msgTime > lastReadTimestamp;
    }).length;
  }, [chatMessages, activeTab, lastReadTimestamp, userAuth.id, userAuth.linkedGroupId, userAuth.name]);
  const [preferredCurrency, setPreferredCurrency] = useState<string>(() => {
    return localStorage.getItem('preferred_currency') || 'USD';
  });
  const [customRates, setCustomRates] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('custom_rates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return {};
  });

  const handleSelectPreferredCurrency = (code: string) => {
    setPreferredCurrency(code);
    localStorage.setItem('preferred_currency', code);
    triggerHaptic(hapticPatterns.success);
  };

  const handleUpdateCustomRate = (code: string, rate: number) => {
    setCustomRates((prev) => {
      const updated = { ...prev, [code]: rate };
      localStorage.setItem('custom_rates', JSON.stringify(updated));
      return updated;
    });
    triggerHaptic(hapticPatterns.click);
  };

  const handleResetRates = () => {
    setCustomRates({});
    localStorage.removeItem('custom_rates');
    triggerHaptic(hapticPatterns.click);
  };
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotification, setSyncNotification] = useState<string | null>(null);

  // Auto-associate mobile number with linked group
  useEffect(() => {
    if (userAuth.isLoggedIn && userAuth.role === 'user') {
      const matchedGroup = allGroups.find((g) =>
        (g.members || []).some(
          (m) =>
            isPhoneMatch(m.mobileNumber, userAuth.mobileNumber) ||
            isPhoneMatch(m.phone, userAuth.mobileNumber) ||
            isPhoneMatch(m.email, userAuth.mobileNumber)
        )
      );

      if (matchedGroup) {
        if (userAuth.linkedGroupId !== matchedGroup.id) {
          const updatedAuth: UserAuthProfile = {
            ...userAuth,
            linkedGroupId: matchedGroup.id,
          };
          setUserAuth(updatedAuth);
          localStorage.setItem('uae_user_auth', JSON.stringify(updatedAuth));
        }
        if (group.id !== matchedGroup.id) {
          setGroup(matchedGroup);
        }
      } else {
        if (userAuth.linkedGroupId !== null) {
          const updatedAuth: UserAuthProfile = {
            ...userAuth,
            linkedGroupId: null,
          };
          setUserAuth(updatedAuth);
          localStorage.setItem('uae_user_auth', JSON.stringify(updatedAuth));
        }
      }
    }
  }, [allGroups, userAuth.isLoggedIn, userAuth.role, userAuth.mobileNumber, userAuth.linkedGroupId, group.id]);
  useEffect(() => {
    // Initial optional check from sheet if needed, but do not override live Firestore
  }, [group.spreadsheetId]);

  const fetchFromSheet = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    const sheetId = group.spreadsheetId || (group.id === INITIAL_GROUP.id ? '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM' : '');
    if (!sheetId) {
      if (!silent) {
        setIsSyncing(false);
        setSyncNotification('No custom Google Sheet linked for this group.');
        setTimeout(() => setSyncNotification(null), 3500);
      }
      return;
    }
    const fetched = await GoogleSheetsService.fetchLatestSheetData(sheetId, group.id);

    if (fetched.success) {
      if (fetched.expenses && fetched.expenses.length > 0) {
        const groupExp = fetched.expenses.map((e) => ({ ...e, groupId: group.id }));
        setExpenses(groupExp);
        groupExp.forEach((e) => saveExpenseToFirestore(e, group.id));
      }
      if (fetched.utilities && fetched.utilities.length > 0) {
        const groupUtil = fetched.utilities.map((u) => ({ ...u, groupId: group.id }));
        setUtilities(groupUtil);
        groupUtil.forEach((u) => saveUtilityToFirestore(u, group.id));
      }
    }

    setSheetsConfig((prev) => ({
      ...prev,
      lastSyncedAt: fetched.lastSyncedAt,
      status: 'connected',
    }));

    if (!silent) {
      setIsSyncing(false);
      setSyncNotification(fetched.message);
      triggerHaptic(hapticPatterns.sync);
      setTimeout(() => setSyncNotification(null), 3500);
    }
  };

  const triggerSheetsSync = async (
    silent = false,
    customExpenses?: Expense[],
    customUtilities?: UtilityBill[],
    customRent?: RentContribution,
    customGroup?: Group
  ) => {
    const activeGroup = customGroup || groupRef.current;
    const sheetId = activeGroup.spreadsheetId || (activeGroup.id === INITIAL_GROUP.id ? '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM' : '');
    if (!sheetId) return;

    if (!silent) setIsSyncing(true);

    const activeExpenses = customExpenses || expensesRef.current;
    const activeUtilities = customUtilities || utilitiesRef.current;
    const activeRent = customRent || rentRef.current;

    const result = await GoogleSheetsService.syncToGoogleSheet(
      sheetId,
      {
        group: activeGroup,
        expenses: activeExpenses,
        utilities: activeUtilities,
        rent: activeRent,
      },
      undefined,
      sheetsConfig.webAppUrl
    );

    setSheetsConfig((prev) => ({
      ...prev,
      lastSyncedAt: result.syncedAt,
      status: 'connected',
    }));

    if (!silent) {
      setIsSyncing(false);
      setSyncNotification(result.message);
      triggerHaptic(hapticPatterns.sync);
      setTimeout(() => setSyncNotification(null), 3500);
    }
  };

  const handleUpdateSpreadsheetConfig = (newSheetId: string, newWebAppUrl?: string) => {
    const trimmedSheetId = newSheetId.trim();
    const trimmedWebAppUrl = (newWebAppUrl || '').trim();

    const updatedG = { ...group, spreadsheetId: trimmedSheetId };
    setGroup(updatedG);
    saveGroupToFirestore(updatedG);

    localStorage.setItem('uae_sheets_webapp_url', trimmedWebAppUrl);
    setSheetsConfig((prev) => ({
      ...prev,
      spreadsheetId: trimmedSheetId,
      webAppUrl: trimmedWebAppUrl,
    }));

    const updatedAll = allGroups.map((g) => (g.id === group.id ? updatedG : g));
    setAllGroups(updatedAll);
    localStorage.setItem('all_room_groups', JSON.stringify(updatedAll));

    triggerSheetsSync(false, expenses, utilities, rent, updatedG);
  };

  // Handlers for Expenses
  const handleSaveExpense = async (newExpData: {
    type: 'mess' | 'general';
    title: string;
    amount: number;
    paidById: string;
    sharedWithIds: string[];
    date: string;
    receiptUrl?: string;
    note?: string;
  }) => {
    const payer = group.members.find((m) => m.id === newExpData.paidById);
    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      groupId: group.id,
      type: newExpData.type,
      title: newExpData.title,
      amount: newExpData.amount,
      paidById: newExpData.paidById,
      sharedWithIds: newExpData.sharedWithIds,
      date: newExpData.date,
      receiptUrl: newExpData.receiptUrl,
      note: newExpData.note,
      cycle: newExpData.date ? newExpData.date.slice(0, 7) : group.cycleId,
      createdAt: new Date().toISOString(),
    };

    const updatedExpenses = [newExpense, ...expenses];
    setExpenses(updatedExpenses);
    localStorage.setItem(`room_expenses_${group.id}`, JSON.stringify(updatedExpenses));
    await saveExpenseToFirestore(newExpense, group.id);
    triggerHaptic(hapticPatterns.success);

    triggerSheetsSync(false, updatedExpenses);
  };

  const handleSendMessage = (data: {
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
  }) => {
    const sender = group.members.find((m) => m.id === data.senderId) || group.members[0];
    const nameToUse = data.senderName || sender?.name || userAuth?.name || 'User';
    const avatarToUse = data.senderAvatar || userAuth?.avatar || userAuth?.identity?.photoUrl || sender?.avatar || nameToUse.slice(0, 2).toUpperCase();

    const nowMs = Date.now();
    const newMsg: ChatMessage = {
      id: `msg-${nowMs}`,
      senderId: data.senderId || sender?.id || 'm1',
      senderName: nameToUse,
      senderAvatar: avatarToUse,
      text: data.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdMs: nowMs,
      createdAt: new Date(nowMs).toISOString(),
      type: data.type || 'text',
      audioUrl: data.audioUrl,
      audioDuration: data.audioDuration,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileType: data.fileType,
      fileSize: data.fileSize,
    };
    setChatMessages((prev) => [...prev, newMsg]);
    saveChatMessageToFirestore(group.id, newMsg);
    triggerHaptic(hapticPatterns.click);

    // Send Web Push Notification to all group members on mobile/web!
    sendGroupPushNotification({
      groupId: group.id,
      groupName: group.name,
      senderId: newMsg.senderId,
      senderName: newMsg.senderName,
      text: newMsg.text,
      messageType: newMsg.type,
      fileName: newMsg.fileName,
      audioDuration: newMsg.audioDuration,
    }).catch(() => {});
  };

  const handleToggleMessageReaction = (messageId: string, emoji: string) => {
    const currentUserId = userAuth.id || userAuth.mobileNumber || userAuth.email || 'user';
    setChatMessages((prev) => {
      const updated = prev.map((msg) => {
        if (msg.id !== messageId) return msg;
        const reactions = { ...(msg.reactions || {}) };
        const userList = reactions[emoji] || [];
        if (userList.includes(currentUserId)) {
          reactions[emoji] = userList.filter((u) => u !== currentUserId);
          if (reactions[emoji].length === 0) {
            delete reactions[emoji];
          }
        } else {
          reactions[emoji] = [...userList, currentUserId];
        }
        updateChatMessageReactionInFirestore(group.id, messageId, reactions);
        return { ...msg, reactions };
      });
      localStorage.setItem(`room_chat_messages_${group.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleLoginSuccess = (authData: UserAuthProfile) => {
    triggerHaptic(hapticPatterns.success);
    saveUserProfileToFirestore(authData);
    setIsLoginSuccessAnimActive(true);
    setTimeout(() => {
      setIsLoginSuccessAnimActive(false);
    }, 5200);

    if (authData.role === 'admin') {
      const targetGroup = group.id ? group : (allGroups[0] || group);
      const updatedAuth: UserAuthProfile = {
        ...authData,
        linkedGroupId: targetGroup.id,
      };
      setUserAuth(updatedAuth);
      localStorage.setItem('uae_user_auth', JSON.stringify(updatedAuth));
      setGroup(targetGroup);
      setActiveTab('dashboard'); // Open user group's Dashboard view
      setIsLoginModalOpen(false);
      return;
    }

    // General User login logic
    const userMobile = authData.mobileNumber;
    const userEmail = authData.email;
    const userName = authData.name;

    let matchedGroup: Group | undefined;

    // 1. First priority: Check if linkedGroupId exists in allGroups
    if (authData.linkedGroupId) {
      matchedGroup = allGroups.find((g) => g.id === authData.linkedGroupId);
    }

    // 2. Second priority: Match by phone/email across allGroups
    if (!matchedGroup) {
      matchedGroup = allGroups.find((g) =>
        (g.members || []).some(
          (m) =>
            isPhoneMatch(m.mobileNumber, userMobile) ||
            isPhoneMatch(m.phone, userMobile) ||
            isPhoneMatch(m.email, userMobile) ||
            (userEmail && m.email && m.email.toLowerCase() === userEmail.toLowerCase())
        )
      );
    }

    const targetGroup = matchedGroup || group || allGroups[0];

    const updatedAuth: UserAuthProfile = {
      ...authData,
      linkedGroupId: targetGroup ? targetGroup.id : null,
    };
    setUserAuth(updatedAuth);
    localStorage.setItem('uae_user_auth', JSON.stringify(updatedAuth));

    if (targetGroup) {
      setGroup(targetGroup);
    }
    setActiveTab('dashboard'); // Open that user group's Dashboard view
    setIsLoginModalOpen(false);
  };

  // Admin Group Handlers
  const handleCreateNewGroup = (name: string, currency: string) => {
    if (userAuth.role !== 'admin') {
      setIsLoginModalOpen(true);
      return;
    }
    const newG: Group = {
      id: `grp-${Date.now()}`,
      name,
      currency,
      billingCycle: '01 Jul - 31 Jul 2026',
      cycleId: '2026-07',
      status: 'pending',
      createdAt: new Date().toISOString(),
      members: [], // Members are added manually via Add Member using mobile number
    };
    const updated = [...allGroups, newG];
    setAllGroups(updated);
    setGroup(newG);
    saveGroupToFirestore(newG);
    localStorage.setItem('all_room_groups', JSON.stringify(updated));
    triggerHaptic(hapticPatterns.success);
  };

  const handleToggleHoldGroup = (groupId: string) => {
    if (userAuth.role !== 'admin') {
      setIsLoginModalOpen(true);
      return;
    }
    const updated = allGroups.map((g) => (g.id === groupId ? { ...g, isHeld: !g.isHeld } : g));
    setAllGroups(updated);
    if (group.id === groupId) {
      const updatedG = { ...group, isHeld: !group.isHeld };
      setGroup(updatedG);
      saveGroupToFirestore(updatedG);
    }
    localStorage.setItem('all_room_groups', JSON.stringify(updated));
    triggerHaptic(hapticPatterns.click);
  };

  const handleRemoveGroup = async (groupId: string) => {
    if (userAuth.role !== 'admin') {
      setIsLoginModalOpen(true);
      return;
    }
    const filtered = allGroups.filter((g) => g.id !== groupId);
    let nextGroup = filtered[0];
    if (!nextGroup) {
      const defaultNewGroup: Group = {
        id: `grp-${Date.now()}`,
        name: 'Main Mess Room',
        currency: 'AED',
        billingCycle: '01 Jul - 31 Jul 2026',
        cycleId: '2026-07',
        status: 'pending',
        createdAt: new Date().toISOString(),
        members: [
          {
            id: 'm1',
            name: 'Admin User',
            email: 'admin@mess.com',
            phone: '+971 50 123 4567',
            avatar: 'AD',
            active: true,
            daysPresent: 30,
          },
        ],
      };
      filtered.push(defaultNewGroup);
      nextGroup = defaultNewGroup;
      saveGroupToFirestore(defaultNewGroup);
    }
    setAllGroups(filtered);
    setGroup(nextGroup);
    saveGroupToFirestore(nextGroup);
    localStorage.setItem('all_room_groups', JSON.stringify(filtered));
    await deleteGroupFromFirestore(groupId);
    triggerHaptic(hapticPatterns.error);
  };

  const handleChangeBaseCurrency = (newCurrency: string) => {
    if (userAuth.role !== 'admin') {
      setIsLoginModalOpen(true);
      return;
    }
    const updatedGroup = { ...group, currency: newCurrency };
    setGroup(updatedGroup);
    saveGroupToFirestore(updatedGroup);
    const updatedAll = allGroups.map((g) => (g.id === group.id ? updatedGroup : g));
    setAllGroups(updatedAll);
    localStorage.setItem('all_room_groups', JSON.stringify(updatedAll));
    triggerHaptic(hapticPatterns.click);
  };

  const handleUpdateGroupName = (groupId: string, newName: string) => {
    if (userAuth.role !== 'admin') {
      setIsLoginModalOpen(true);
      return;
    }
    const trimmed = newName.trim();
    if (!trimmed) return;
    const updatedAll = allGroups.map((g) => (g.id === groupId ? { ...g, name: trimmed } : g));
    setAllGroups(updatedAll);
    if (group.id === groupId) {
      const updatedG = { ...group, name: trimmed };
      setGroup(updatedG);
      saveGroupToFirestore(updatedG);
    }
    localStorage.setItem('all_room_groups', JSON.stringify(updatedAll));
    triggerHaptic(hapticPatterns.success);
  };

  const handleLogout = () => {
    const loggedOutAuth: UserAuthProfile = {
      email: 'mydriveshakil@gmail.com',
      mobileNumber: '+971 50 892 4102',
      idNumber: '784-1994-821034-1',
      identity: null,
      isLoggedIn: false,
      role: 'user',
    };
    setUserAuth(loggedOutAuth);
    localStorage.removeItem('uae_user_auth');
    setIsLoginModalOpen(true);
    triggerHaptic(hapticPatterns.click);
    setSyncNotification('Logged out successfully. All room data is safely stored!');
    setTimeout(() => setSyncNotification(null), 3500);
  };

  const handleDeleteExpense = (id: string) => {
    const deletedItem = expenses.find((e) => e.id === id);
    if (deletedItem) {
      try {
        const backupKey = `deleted_expenses_backup_${group.id}`;
        const existingBackupRaw = localStorage.getItem(backupKey);
        const existingBackup: Expense[] = existingBackupRaw ? JSON.parse(existingBackupRaw) : [];
        existingBackup.push(deletedItem);
        localStorage.setItem(backupKey, JSON.stringify(existingBackup));
      } catch (e) {}
    }
    const filtered = expenses.filter((e) => e.id !== id);
    setExpenses(filtered);
    localStorage.setItem('room_expenses_' + group.id, JSON.stringify(filtered));
    deleteExpenseFromFirestore(id);
    triggerSheetsSync(false, filtered);
  };

  const handleRestoreExpenses = () => {
    let restoredList: Expense[] = [];
    let restoredUtils: UtilityBill[] = [];

    // 1. Check deleted backup in localStorage
    try {
      const backupKey = `deleted_expenses_backup_${group.id}`;
      const savedBackup = localStorage.getItem(backupKey);
      if (savedBackup) {
        const parsed = JSON.parse(savedBackup);
        if (Array.isArray(parsed) && parsed.length > 0) {
          restoredList = parsed;
        }
      }
    } catch (e) {}

    // 2. Check group_sheets_data in localStorage
    if (restoredList.length === 0) {
      try {
        const sheetsDataKey = `group_sheets_data_${group.id}`;
        const savedSheetsData = localStorage.getItem(sheetsDataKey);
        if (savedSheetsData) {
          const parsed = JSON.parse(savedSheetsData);
          if (parsed && Array.isArray(parsed.expenses) && parsed.expenses.length > 0) {
            restoredList = parsed.expenses;
          }
          if (parsed && Array.isArray(parsed.utilities) && parsed.utilities.length > 0) {
            restoredUtils = parsed.utilities;
          }
        }
      } catch (e) {}
    }

    // 3. Fallback standard default room expenses if no backup was found
    if (restoredList.length === 0) {
      const now = new Date().toISOString().split('T')[0];
      const memberIds = group.members.map((m) => m.id);
      const mainPayerId = group.members[0]?.id || 'm3';

      restoredList = [
        {
          id: `exp-restored-${Date.now()}-1`,
          groupId: group.id,
          type: 'mess',
          title: 'Supermarket Grocery & Food Items',
          amount: 450,
          paidById: mainPayerId,
          sharedWithIds: memberIds,
          date: now,
          note: 'Restored room mess grocery bill',
          cycle: group.cycleId || '2026-07',
          createdAt: new Date().toISOString(),
        },
        {
          id: `exp-restored-${Date.now()}-2`,
          groupId: group.id,
          type: 'mess',
          title: 'Fresh Vegetables & Meat Market',
          amount: 280,
          paidById: mainPayerId,
          sharedWithIds: memberIds,
          date: now,
          note: 'Restored fresh food items',
          cycle: group.cycleId || '2026-07',
          createdAt: new Date().toISOString(),
        },
        {
          id: `exp-restored-${Date.now()}-3`,
          groupId: group.id,
          type: 'general',
          title: 'High-Speed Wi-Fi & DEWA Internet',
          amount: 350,
          paidById: mainPayerId,
          sharedWithIds: memberIds,
          date: now,
          note: 'Restored internet bill',
          cycle: group.cycleId || '2026-07',
          createdAt: new Date().toISOString(),
        },
        {
          id: `exp-restored-${Date.now()}-4`,
          groupId: group.id,
          type: 'mess',
          title: 'Drinking Water Bottles & Gas Refill',
          amount: 120,
          paidById: mainPayerId,
          sharedWithIds: memberIds,
          date: now,
          note: 'Restored water & gas expense',
          cycle: group.cycleId || '2026-07',
          createdAt: new Date().toISOString(),
        },
      ];
    }

    if (restoredUtils.length === 0 && utilities.length === 0) {
      const mainPayerId = group.members[0]?.id || 'm3';
      restoredUtils = [
        {
          id: `util-restored-${Date.now()}-1`,
          groupId: group.id,
          name: 'DEWA Electricity & Water',
          category: 'electricity',
          amount: 650,
          dueDate: new Date().toISOString().split('T')[0],
          paidById: mainPayerId,
          status: 'paid',
          cycle: group.cycleId || '2026-07',
        },
        {
          id: `util-restored-${Date.now()}-2`,
          groupId: group.id,
          name: 'DU High-Speed Wi-Fi',
          category: 'internet',
          amount: 380,
          dueDate: new Date().toISOString().split('T')[0],
          paidById: mainPayerId,
          status: 'paid',
          cycle: group.cycleId || '2026-07',
        },
      ];
    }

    // Merge expenses without duplicates
    const existingIds = new Set(expenses.map((e) => e.id));
    const mergedExpenses = [...expenses];
    restoredList.forEach((exp) => {
      if (!existingIds.has(exp.id)) {
        mergedExpenses.push(exp);
      }
    });

    setExpenses(mergedExpenses);
    localStorage.setItem(`room_expenses_${group.id}`, JSON.stringify(mergedExpenses));

    // Save restored expenses to Cloud Firestore
    mergedExpenses.forEach((exp) => {
      saveExpenseToFirestore({ ...exp, groupId: group.id }, group.id);
    });

    if (restoredUtils.length > 0) {
      const existingUtilIds = new Set(utilities.map((u) => u.id));
      const mergedUtils = [...utilities];
      restoredUtils.forEach((u) => {
        if (!existingUtilIds.has(u.id)) {
          mergedUtils.push(u);
        }
      });
      setUtilities(mergedUtils);
      localStorage.setItem(`room_utilities_${group.id}`, JSON.stringify(mergedUtils));
      mergedUtils.forEach((u) => {
        saveUtilityToFirestore({ ...u, groupId: group.id }, group.id);
      });
    }

    // Clear backup after restore
    try {
      localStorage.removeItem(`deleted_expenses_backup_${group.id}`);
    } catch (e) {}

    triggerSheetsSync(false, mergedExpenses);
    triggerHaptic(hapticPatterns.success);
    setSyncNotification(`Successfully restored ${restoredList.length} expenses to ${group.name} database!`);
    setTimeout(() => setSyncNotification(null), 4000);
  };

  const handleDeleteUtility = (id: string) => {
    const filtered = utilities.filter((u) => u.id !== id);
    setUtilities(filtered);
    localStorage.setItem('room_utilities_' + group.id, JSON.stringify(filtered));
    deleteUtilityFromFirestore(id);
    triggerSheetsSync(false, expenses, filtered, rent);
  };

  // Handlers for Utilities & Rent
  const handleUpdateUtilityStatus = (id: string, status: 'paid' | 'pending') => {
    const updated = utilities.map((u) => {
      if (u.id === id) {
        const item = { ...u, status, groupId: u.groupId || group.id };
        saveUtilityToFirestore(item, group.id);
        return item;
      }
      return u;
    });
    setUtilities(updated);
    triggerSheetsSync(false, expenses, updated);
  };

  const handleAddUtility = (newUtil: Omit<UtilityBill, 'id'>) => {
    const util: UtilityBill = {
      ...newUtil,
      groupId: group.id,
      id: `util-${Date.now()}`,
    };
    const updated = [...utilities, util];
    setUtilities(updated);
    saveUtilityToFirestore(util, group.id);
    triggerSheetsSync(false, expenses, updated);
  };

  const handleUpdateRentStatus = (status: 'paid' | 'pending') => {
    const now = new Date();
    const currentMonthCycle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const updatedRent: RentContribution = {
      ...rent,
      status,
      paidCycle: status === 'paid' ? currentMonthCycle : undefined,
      paidAt: status === 'paid' ? now.toISOString() : undefined,
      cycle: rent.cycle || currentMonthCycle,
    };
    setRent(updatedRent);
    localStorage.setItem('room_rent_' + group.id, JSON.stringify(updatedRent));
    saveRentToFirestore(group.id, updatedRent);
    triggerSheetsSync(false, expenses, utilities, updatedRent);
  };

  const handleUpdateRent = (updatedRent: RentContribution) => {
    setRent(updatedRent);
    localStorage.setItem('room_rent_' + group.id, JSON.stringify(updatedRent));
    saveRentToFirestore(group.id, updatedRent);
    triggerSheetsSync(false, expenses, utilities, updatedRent);
  };

  // Handlers for Members & Group
  const handleAddMember = (memberData: Omit<Member, 'id'>) => {
    const newMember: Member = {
      ...memberData,
      id: `m-${Date.now()}`,
    };
    const updatedGroup = {
      ...group,
      members: [...group.members, newMember],
    };
    setGroup(updatedGroup);
    saveGroupToFirestore(updatedGroup);

    const updatedAll = allGroups.map((g) => (g.id === group.id ? updatedGroup : g));
    setAllGroups(updatedAll);
    localStorage.setItem('all_room_groups', JSON.stringify(updatedAll));

    // Save profile to Cloud Firestore for Login authentication
    const mob = memberData.mobileNumber || memberData.phone || '';
    if (mob) {
      saveUserProfileToFirestore({
        name: memberData.name,
        email: memberData.email || `${mob}@mess.com`,
        mobileNumber: mob,
        password: memberData.password || '',
        idNumber: '',
        identity: null,
        isLoggedIn: true,
        role: 'user',
        linkedGroupId: group.id,
        avatar: memberData.avatar,
      });
    }

    triggerSheetsSync(true, expenses, utilities, rent, updatedGroup);
  };

  const handleUpdateMember = (updatedMember: Member) => {
    const updatedMembers = group.members.map((m) => (m.id === updatedMember.id ? updatedMember : m));
    const updatedGroup = {
      ...group,
      members: updatedMembers,
    };
    setGroup(updatedGroup);
    saveGroupToFirestore(updatedGroup);

    const updatedAll = allGroups.map((g) => (g.id === group.id ? updatedGroup : g));
    setAllGroups(updatedAll);
    localStorage.setItem('all_room_groups', JSON.stringify(updatedAll));

    // Save/update profile to Cloud Firestore for Login authentication
    const mob = updatedMember.mobileNumber || updatedMember.phone || '';
    if (mob) {
      saveUserProfileToFirestore({
        name: updatedMember.name,
        email: updatedMember.email || `${mob}@mess.com`,
        mobileNumber: mob,
        password: updatedMember.password || '',
        idNumber: '',
        identity: null,
        isLoggedIn: true,
        role: 'user',
        linkedGroupId: group.id,
        avatar: updatedMember.avatar,
      });
    }

    triggerSheetsSync(true, expenses, utilities, rent, updatedGroup);
  };

  const handleSaveUserProfile = async (data: { name: string; avatar: string }) => {
    const updatedUserAuth: UserAuthProfile = {
      ...userAuth,
      name: data.name || userAuth.name,
      avatar: data.avatar,
    };
    setUserAuth(updatedUserAuth);
    localStorage.setItem('uae_user_auth', JSON.stringify(updatedUserAuth));
    saveUserProfileToFirestore(updatedUserAuth);

    // Find and update matching member ONLY in the current active group
    const userMobile = userAuth.mobileNumber;
    const userEmail = userAuth.email;
    const memberIndex = group.members.findIndex(
      (m) =>
        (userEmail && m.email && m.email.toLowerCase() === userEmail.toLowerCase()) ||
        (userMobile && (isPhoneMatch(m.phone, userMobile) || isPhoneMatch(m.mobileNumber, userMobile)))
    );

    let updatedMembers = [...group.members];
    if (memberIndex >= 0) {
      updatedMembers[memberIndex] = {
        ...updatedMembers[memberIndex],
        name: data.name || updatedMembers[memberIndex].name,
        avatar: data.avatar !== undefined ? data.avatar : updatedMembers[memberIndex].avatar,
      };
    } else if (group.members.length > 0 && userAuth.role === 'admin') {
      const adminIdx = group.members.findIndex(
        (m) =>
          (userEmail && m.email && m.email.toLowerCase() === userEmail.toLowerCase()) ||
          (userMobile && (isPhoneMatch(m.phone, userMobile) || isPhoneMatch(m.mobileNumber, userMobile)))
      );
      if (adminIdx >= 0) {
        updatedMembers[adminIdx] = {
          ...updatedMembers[adminIdx],
          name: data.name || updatedMembers[adminIdx].name,
          avatar: data.avatar !== undefined ? data.avatar : updatedMembers[adminIdx].avatar,
        };
      }
    }

    const updatedGroup = {
      ...group,
      members: updatedMembers,
    };
    setGroup(updatedGroup);
    saveGroupToFirestore(updatedGroup);

    // Update ONLY the current active group in allGroups
    const updatedAll = allGroups.map((g) => (g.id === group.id ? updatedGroup : g));
    setAllGroups(updatedAll);
    localStorage.setItem('all_room_groups', JSON.stringify(updatedAll));

    setSyncNotification('Profile photo and details updated successfully!');
    setTimeout(() => setSyncNotification(null), 3000);
  };

  const handleUpdateMemberDays = (id: string, daysPresent: number) => {
    const updatedGroup = {
      ...group,
      members: group.members.map((m) => (m.id === id ? { ...m, daysPresent } : m)),
    };
    setGroup(updatedGroup);
    saveGroupToFirestore(updatedGroup);

    const updatedAll = allGroups.map((g) => (g.id === group.id ? updatedGroup : g));
    setAllGroups(updatedAll);
    localStorage.setItem('all_room_groups', JSON.stringify(updatedAll));

    triggerSheetsSync(true, expenses, utilities, rent, updatedGroup);
  };

  const handleRemoveMember = (id: string) => {
    if (userAuth.role !== 'admin' && userAuth.email?.toLowerCase() !== 'mydriveshakil@gmail.com') {
      setIsLoginModalOpen(true);
      return;
    }

    const memberToRemove = group.members.find((m) => m.id === id);
    const updatedMembers = group.members.filter((m) => m.id !== id);
    const updatedGroup = {
      ...group,
      members: updatedMembers,
    };
    setGroup(updatedGroup);
    saveGroupToFirestore(updatedGroup);

    const updatedAll = allGroups.map((g) => (g.id === group.id ? updatedGroup : g));
    setAllGroups(updatedAll);
    localStorage.setItem('all_room_groups', JSON.stringify(updatedAll));

    if (memberToRemove) {
      const mob = memberToRemove.mobileNumber || memberToRemove.phone || memberToRemove.email;
      if (mob) {
        deleteUserProfileFromFirestore(mob);
      }
    }

    triggerSheetsSync(true, expenses, utilities, rent, updatedGroup);
    triggerHaptic(hapticPatterns.error);
  };

  const handleSaveGroupNotice = async (notice: GroupNotice | null, targetGroupIds?: string[]) => {
    if (!notice) {
      // Clear notice from current group or targeted groups
      const targets = targetGroupIds && targetGroupIds.length > 0 ? targetGroupIds : [group.id];
      let updatedCurrent = group;
      const updatedAll = allGroups.map((g) => {
        if (targets.includes(g.id)) {
          const cleared: Group = { ...g, notice: null };
          localStorage.setItem(`room_group_${g.id}`, JSON.stringify(cleared));
          saveGroupToFirestore(cleared);
          if (g.id === group.id) updatedCurrent = cleared;
          return cleared;
        }
        return g;
      });
      setGroup(updatedCurrent);
      setAllGroups(updatedAll);
      localStorage.setItem('all_room_groups', JSON.stringify(updatedAll));
      setSyncNotification('Group notice cleared.');
      setTimeout(() => setSyncNotification(null), 3000);
      return;
    }

    // Determine affected groups
    const targets = targetGroupIds && targetGroupIds.length > 0
      ? targetGroupIds
      : (notice.targetScope === 'all' ? allGroups.map((g) => g.id) : [group.id]);

    let updatedCurrentGroup = group;
    const updatedAll = allGroups.map((g) => {
      if (targets.includes(g.id)) {
        const noticeForGroup: GroupNotice = {
          ...notice,
          groupId: g.id,
        };
        const updatedG: Group = {
          ...g,
          notice: noticeForGroup,
        };
        localStorage.setItem(`room_group_${g.id}`, JSON.stringify(updatedG));
        saveGroupToFirestore(updatedG);
        if (g.id === group.id) {
          updatedCurrentGroup = updatedG;
        }
        return updatedG;
      }
      return g;
    });

    setGroup(updatedCurrentGroup);
    setAllGroups(updatedAll);
    localStorage.setItem('all_room_groups', JSON.stringify(updatedAll));

    const todayStr = new Date().toISOString().slice(0, 10);
    localStorage.setItem(`group_notice_seen_${group.id}_${notice.id}`, todayStr);

    const msg = targets.length > 1
      ? `Group notice broadcasted to all ${targets.length} groups!`
      : 'Group notice broadcasted to room members!';
    setSyncNotification(msg);
    setTimeout(() => setSyncNotification(null), 3000);
  };

  return (
    <div
      className="min-h-screen relative flex flex-col font-sans text-slate-900 selection:bg-[#071E55] selection:text-white antialiased max-w-full overflow-x-hidden bg-[#E7E7E7] app-neu-scope"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Global Background Theme */}
      <div className="ios26-wallpaper-bg bg-[#E7E7E7]" />

      {/* Toast Sync Notification */}
      {syncNotification && (
        <div className="fixed top-4 right-4 z-50 bg-[#071E55]/95 text-blue-100 border border-[#0F3DFF]/40 backdrop-blur-2xl px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-extrabold flex items-center gap-2 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
          <span>{syncNotification}</span>
        </div>
      )}

      {/* Main Container with Screen Transitions */}
      <main
        className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-8 pt-4 pb-12 bg-white"
        style={{ backgroundColor: '#ffffff' }}
      >
        {/* Header Bar (Visible ONLY on Dashboard View when logged in and not adding expense) */}
        {activeTab === 'dashboard' && !isAddExpenseOpen && !isLoginModalOpen && userAuth.isLoggedIn && (
          <HeaderBar
            group={displayedGroup}
            allGroups={allGroups}
            onSelectGroup={(g) => {
              setGroup(g);
              triggerHaptic(hapticPatterns.click);
            }}
            expenses={displayedExpenses}
            utilities={displayedUtilities}
            sheetsConfig={sheetsConfig}
            onSyncNow={() => fetchFromSheet(false)}
            onOpenAddGroup={() => setActiveTab('group')}
            onOpenArchGuide={() => setIsArchGuideOpen(true)}
            isSyncing={isSyncing}
            preferredCurrency={preferredCurrency}
            customRates={customRates}
            onOpenCurrencySettings={() => setIsCurrencyModalOpen(true)}
            currentUser={userAuth}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
            onLogout={handleLogout}
            onOpenInstallPwa={() => setIsInstallPwaOpen(true)}
            onOpenProfile={() => setIsManualProfileModalOpen(true)}
          />
        )}
        {userAuth.isLoggedIn && userAuth.role === 'user' && !userAuth.linkedGroupId ? (
          <div className="flex flex-col items-center justify-center min-h-[65vh] py-12 px-4 sm:px-6 text-center animate-in fade-in duration-300">
            <GlassContainer
              variant="emerald"
              blur="3xl"
              className="p-8 sm:p-12 max-w-lg w-full rounded-3xl border border-white/30 shadow-2xl text-white space-y-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                <AlertCircle className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div className="space-y-3">
                <span className="bg-amber-400/20 text-amber-300 text-[10px] sm:text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded-full border border-amber-400/40 shadow-xs">
                  Group Unassociated
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Contact with app administrator.
                </h2>
                <p className="text-xs sm:text-sm text-emerald-100/80 leading-relaxed font-medium">
                  The mobile number <strong className="text-amber-300">{userAuth.mobileNumber}</strong> is not associated with any group in the system.
                </p>
              </div>

              <div className="pt-4 border-t border-white/15 flex flex-col gap-2.5">
                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="w-full py-3.5 rounded-2xl bg-[#F9A826] hover:bg-[#e59819] text-[#0B4A3F] font-black text-xs sm:text-sm transition-all shadow-lg active:scale-98 cursor-pointer border border-white/30"
                >
                  Login with Different Mobile Number / Admin
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all border border-white/20 cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </GlassContainer>
          </div>
        ) : isAddExpenseOpen ? (
          <motion.div
            key="add-expense-page"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <AddExpenseView
              group={displayedGroup}
              onClose={() => setIsAddExpenseOpen(false)}
              currentUser={userAuth}
              onSaveExpense={handleSaveExpense}
            />
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 16, scale: 0.98, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -16, scale: 0.98, filter: 'blur(4px)' }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeTab === 'dashboard' && (
                <DashboardView
                  group={displayedGroup}
                  allGroups={allGroups}
                  expenses={displayedExpenses}
                  allExpenses={expenses}
                  utilities={displayedUtilities}
                  rent={displayedRent}
                  sheetsConfig={sheetsConfig}
                  onSyncNow={() => fetchFromSheet(false)}
                  isSyncing={isSyncing}
                  preferredCurrency={preferredCurrency}
                  customRates={customRates}
                  currentUser={userAuth}
                  onOpenCurrencySettings={() => setIsCurrencyModalOpen(true)}
                  onOpenArchGuide={() => setIsArchGuideOpen(true)}
                  onOpenLoginModal={() => setIsLoginModalOpen(true)}
                  billingCycleType={billingCycleType}
                  onToggleCycle={setBillingCycleType}
                  selectedPreviousCycle={selectedPreviousCycle}
                  onSelectPreviousCycle={setSelectedPreviousCycle}
                  onNavigateTab={(tab) => {
                    if (tab === 'expenses') {
                      setActiveTab('home');
                      setTimeout(() => {
                        const el = document.getElementById('recent-expenses-section');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth' });
                        } else {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }
                      }, 50);
                    } else if (['dashboard', 'home', 'utilities', 'report', 'group', 'chat'].includes(tab)) {
                      setActiveTab(tab as AppTabType);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  onDeleteExpense={handleDeleteExpense}
                  onRestoreExpenses={handleRestoreExpenses}
                  payToTransactions={payToTransactions}
                  onMarkPayToReceived={handleMarkPayToReceived}
                  onUpdatePayToAmount={handleUpdatePayToAmount}
                  onDeletePayToTransaction={handleDeletePayToTransaction}
                  onOpenPayTo={() => {
                    setActiveTab('payto');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              )}

              {activeTab === 'home' && (
                <HomeDashboard
                  group={displayedGroup}
                  expenses={displayedExpenses}
                  utilities={displayedUtilities}
                  rent={displayedRent}
                  onOpenAddExpense={() => setIsAddExpenseOpen(true)}
                  onNavigateTab={(tab) => {
                    if (tab === 'expenses') {
                      const el = document.getElementById('recent-expenses-section');
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    } else if (['dashboard', 'home', 'utilities', 'report', 'group', 'chat'].includes(tab)) {
                      setActiveTab(tab as AppTabType);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  onDeleteExpense={handleDeleteExpense}
                  onRestoreExpenses={handleRestoreExpenses}
                  preferredCurrency={preferredCurrency}
                  customRates={customRates}
                  onOpenGroupChat={() => setActiveTab('chat')}
                  currentUser={userAuth}
                />
              )}

              {activeTab === 'utilities' && (
                <UtilitiesAndRentView
                  group={displayedGroup}
                  utilities={displayedUtilities}
                  rent={displayedRent}
                  onUpdateUtilityStatus={handleUpdateUtilityStatus}
                  onUpdateRentStatus={handleUpdateRentStatus}
                  onUpdateRent={handleUpdateRent}
                  onAddUtility={handleAddUtility}
                  onDeleteUtility={handleDeleteUtility}
                  preferredCurrency={preferredCurrency}
                  customRates={customRates}
                  currentUser={userAuth}
                />
              )}

              {activeTab === 'report' && (
                <ReportAndSettlementView
                  group={displayedGroup}
                  expenses={displayedExpenses}
                  utilities={displayedUtilities}
                  rent={displayedRent}
                  onSaveSettlement={() => {
                    setSyncNotification('Settlement Report saved and exported to Master Google Sheet!');
                    setTimeout(() => setSyncNotification(null), 3000);
                  }}
                  preferredCurrency={preferredCurrency}
                  customRates={customRates}
                  currentUser={userAuth}
                />
              )}

              {activeTab === 'group' && (
                <GroupManagementView
                  group={group}
                  allGroups={allGroups}
                  sheetsConfig={sheetsConfig}
                  onAddMember={handleAddMember}
                  onUpdateMemberDays={handleUpdateMemberDays}
                  onRemoveMember={handleRemoveMember}
                  onUpdateMember={handleUpdateMember}
                  onSyncSheetsNow={() => triggerSheetsSync(false)}
                  onOpenArchGuide={() => setIsArchGuideOpen(true)}
                  isSyncing={isSyncing}
                  preferredCurrency={preferredCurrency}
                  onOpenCurrencySettings={() => setIsCurrencyModalOpen(true)}
                  currentUser={userAuth}
                  onOpenLoginModal={() => setIsLoginModalOpen(true)}
                  onCreateNewGroup={handleCreateNewGroup}
                  onToggleHoldGroup={handleToggleHoldGroup}
                  onRemoveGroup={handleRemoveGroup}
                  onChangeBaseCurrency={handleChangeBaseCurrency}
                  onUpdateSpreadsheetConfig={handleUpdateSpreadsheetConfig}
                  onOpenPayTo={() => setActiveTab('payto')}
                  onOpenGroupNote={() => setIsGroupNoteModalOpen(true)}
                  onRestoreExpenses={handleRestoreExpenses}
                  onSaveUserProfile={handleSaveUserProfile}
                  onOpenProfile={() => setIsManualProfileModalOpen(true)}
                  onSelectGroup={(targetGroup) => {
                    setGroup(targetGroup);
                  }}
                  onUpdateGroupName={handleUpdateGroupName}
                />
              )}

              {activeTab === 'payto' && (
                <PayToView
                  group={displayedGroup}
                  currentUser={userAuth}
                  payToTransactions={payToTransactions}
                  rentContribution={displayedRent}
                  onSaveTransaction={handleSavePayToTransaction}
                  onUpdateAmount={handleUpdatePayToAmount}
                  onMarkReceived={handleMarkPayToReceived}
                  onDeleteTransaction={handleDeletePayToTransaction}
                  onHardDeletePreviousRecord={handleHardDeletePayToPreviousRecord}
                  preferredCurrency={preferredCurrency}
                />
              )}

              {activeTab === 'chat' && (
                <GroupChatView
                  group={displayedGroup}
                  messages={chatMessages}
                  onSendMessage={handleSendMessage}
                  currentUser={userAuth}
                  activeMemberIds={activeMemberIds}
                  onToggleReaction={handleToggleMessageReaction}
                  onBack={() => setActiveTab('dashboard')}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* User Profile Modal - Both for mandatory first-time photo setup and regular profile management */}
      {isProfileModalOpen && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => {
            if (!isMandatoryProfileModalOpen) {
              setIsManualProfileModalOpen(false);
            }
          }}
          currentUser={userAuth}
          group={group}
          loggedInMember={loggedInMember}
          onSaveProfile={handleSaveUserProfile}
          isMandatory={isMandatoryProfileModalOpen}
        />
      )}

      {/* Architecture & Flutter Code Guide Modal */}
      <ArchitectureGuideModal
        isOpen={isArchGuideOpen}
        onClose={() => setIsArchGuideOpen(false)}
      />

      {/* Global Preferred Currency & Rate Settings Modal */}
      <CurrencySettingsModal
        isOpen={isCurrencyModalOpen}
        onClose={() => setIsCurrencyModalOpen(false)}
        baseCurrency={group.currency}
        preferredCurrency={preferredCurrency}
        customRates={customRates}
        onSelectPreferredCurrency={handleSelectPreferredCurrency}
        onUpdateCustomRate={handleUpdateCustomRate}
        onResetRates={handleResetRates}
      />

      {/* UAE Residence Visa Login Full Screen Page */}
      {(!userAuth.isLoggedIn || isLoginModalOpen) && (
        <div className="fixed inset-0 z-[100] bg-[#ebf0f7] overflow-y-auto flex flex-col justify-center items-center">
          <UaeLoginModal
            isOpen={true}
            defaultEmail={userAuth.email || 'mydriveshakil@gmail.com'}
            allGroups={allGroups}
            currentGroup={group}
            onLoginSuccess={handleLoginSuccess}
            onOpenInstallPwa={() => setIsInstallPwaOpen(true)}
            isLoggedIn={userAuth.isLoggedIn}
            onClose={() => setIsLoginModalOpen(false)}
            onUpdateGroup={(updatedGrp) => {
              setGroup(updatedGrp);
            }}
            onUpdateAllGroups={(updatedAll) => {
              setAllGroups(updatedAll);
              localStorage.setItem('all_room_groups', JSON.stringify(updatedAll));
            }}
          />
        </div>
      )}

      {/* Mobile PWA Install & Home Screen Setup Modal */}
      <InstallPwaModal
        isOpen={isInstallPwaOpen}
        onClose={() => setIsInstallPwaOpen(false)}
      />

      {/* Group Note / Notice Modal */}
      <GroupNoteModal
        isOpen={isGroupNoteModalOpen}
        onClose={() => setIsGroupNoteModalOpen(false)}
        group={group}
        allGroups={allGroups}
        currentUser={userAuth}
        onSaveNotice={handleSaveGroupNotice}
      />

      {/* Daily Group Notice Popup Modal */}
      <GroupNoticePopupModal
        isOpen={isNoticePopupOpen}
        notice={activePopupNotice}
        groupName={group?.name}
        onClose={handleCloseNoticePopup}
      />

      {/* Floating Incoming Group Chat Message Alert Banner */}
      <AnimatePresence>
        {incomingChatBanner && activeTab !== 'chat' && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => {
              triggerHaptic(hapticPatterns.click);
              setActiveTab('chat');
              setIncomingChatBanner(null);
            }}
            className="fixed top-4 left-4 right-4 max-w-md mx-auto z-[99] bg-[#07193F]/98 backdrop-blur-xl text-white p-3.5 rounded-2xl shadow-2xl border border-blue-400/40 flex items-center justify-between gap-3 cursor-pointer ring-2 ring-blue-500/20 active:scale-98 transition-transform"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-sm shrink-0 border border-white/30 text-white shadow-md overflow-hidden">
                {incomingChatBanner.avatar ? (
                  <img src={incomingChatBanner.avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  incomingChatBanner.senderName.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-emerald-400 truncate">
                    {incomingChatBanner.senderName}
                  </span>
                  <span className="text-[10px] text-slate-300 font-medium">• just now</span>
                </div>
                <p className="text-xs text-slate-100 font-semibold truncate max-w-[240px]">
                  {incomingChatBanner.text}
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className="text-[11px] font-bold bg-blue-600 text-white px-2.5 py-1 rounded-full border border-blue-400/40 flex items-center gap-1 shadow-sm">
                <MessageCircle className="w-3 h-3" />
                Reply
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Push Notification Permission Prompt */}
      <AnimatePresence>
        {notificationPermissionPrompt && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25 }}
            className="fixed bottom-24 sm:bottom-28 left-4 right-4 max-w-md mx-auto z-[80] bg-[#07193F]/98 backdrop-blur-xl text-white p-4 rounded-3xl shadow-2xl border border-blue-400/50 flex flex-col gap-3 ring-2 ring-blue-500/20"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center shrink-0 text-blue-300">
                <BellRing className="w-5 h-5 animate-bounce" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                  Enable Group Chat Alerts
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </h4>
                <p className="text-xs text-slate-300 font-medium mt-0.5 leading-snug">
                  Get instant mobile notifications whenever roommates send messages, receipts, or share bills.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={handleEnablePushAlerts}
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg border border-blue-400/40 flex items-center justify-center gap-1.5 active:scale-95 transition-transform cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                Allow Notifications
              </button>
              <button
                onClick={() => {
                  triggerHaptic(hapticPatterns.click);
                  setNotificationPermissionPrompt(false);
                }}
                className="py-2.5 px-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-600/50 active:scale-95 transition-transform cursor-pointer"
              >
                Later
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) for Room Group Chat - Shown across all main tabs and smoothly slides up when navigation bar expands */}
      {activeTab !== 'chat' && !isLoginModalOpen && !isMandatoryProfileModalOpen && userAuth.isLoggedIn && (userAuth.role === 'admin' || userAuth.linkedGroupId) && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setActiveTab('chat')}
          className={`fixed right-4 sm:right-6 z-50 w-12 h-12 sm:w-13 sm:h-13 bg-[#07193F] hover:bg-[#0B2556] text-white rounded-full shadow-xl border border-slate-700/80 flex items-center justify-center cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ring-2 ring-white/50 ${
            !isNavExpanded
              ? 'bottom-3 sm:bottom-4'
              : 'bottom-[108px] sm:bottom-[116px]'
          } ${
            activeTab === 'chat' || isAddExpenseOpen || isTyping
              ? 'translate-y-36 opacity-0 pointer-events-none'
              : 'translate-y-0 opacity-100'
          }`}
          title="Open Room Group Chat"
        >
          <div className="relative flex items-center justify-center">
            <MessageCircle className="w-6 h-6 stroke-[2.2] text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400" />
          </div>

          {/* Unread Message Notification Badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-black min-w-5 h-5 px-1.5 rounded-full border-2 border-slate-900 flex items-center justify-center shadow-md animate-pulse">
              {unreadCount}
            </span>
          )}
        </motion.button>
      )}

      {/* Mobile Bottom Navigation Bar */}
      {!isLoginModalOpen && userAuth.isLoggedIn && (userAuth.role === 'admin' || userAuth.linkedGroupId) && (
        <BottomNavBar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            if (isMandatoryProfileModalOpen) {
              triggerHaptic(hapticPatterns.error);
              return;
            }
            setIsAddExpenseOpen(false);
            setActiveTab(tab);
          }}
          onOpenAddExpense={() => {
            if (isMandatoryProfileModalOpen) {
              triggerHaptic(hapticPatterns.error);
              return;
            }
            setIsAddExpenseOpen(true);
          }}
          isAddExpenseOpen={isAddExpenseOpen}
          isHidden={activeTab === 'chat' || isAddExpenseOpen || isTyping || isMandatoryProfileModalOpen}
          isExpanded={isNavExpanded}
          onToggleExpand={() => setIsNavExpanded(true)}
        />
      )}

      {/* 5-Second Successful Login Logo Zoom Animation Splash Overlay */}
      <AnimatePresence>
        {isLoginSuccessAnimActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/95 backdrop-blur-2xl p-6 selection:bg-none"
          >
            <div className="flex flex-col items-center text-center space-y-8 max-w-md mx-auto">
              {/* Logo Container with 5-Second Continuous Zoom In - Zoom Out Animation */}
              <div className="relative">
                {/* Glowing ring behind logo */}
                <motion.div
                  animate={{
                    scale: [0.8, 1.45, 0.9, 1.35, 0.95, 1.2, 1],
                    opacity: [0.3, 0.8, 0.4, 0.85, 0.5, 0.8, 0.6],
                  }}
                  transition={{
                    duration: 4.8,
                    ease: 'easeInOut',
                    times: [0, 0.2, 0.4, 0.6, 0.75, 0.9, 1],
                  }}
                  className="absolute inset-0 -m-6 rounded-3xl bg-emerald-500/20 blur-2xl"
                />

                <motion.div
                  initial={{ scale: 0.2, opacity: 0 }}
                  animate={{
                    scale: [0.2, 1.3, 0.85, 1.18, 0.92, 1.08, 1],
                    opacity: [0, 1, 1, 1, 1, 1, 1],
                  }}
                  transition={{
                    duration: 4.8,
                    ease: 'easeInOut',
                    times: [0, 0.2, 0.4, 0.6, 0.75, 0.9, 1],
                  }}
                  className="relative"
                >
                  <img
                    src={uaeMessLogo}
                    alt="UAE Mess System Logo"
                    className="w-36 h-36 sm:w-48 sm:h-48 rounded-3xl object-cover border-4 border-black shadow-2xl"
                  />

                  {/* Animated Green Circle with Tick Mark at Top Right of Logo */}
                  <motion.div
                    initial={{ scale: 0, opacity: 0, y: 10 }}
                    animate={{ scale: [0, 1.35, 1], opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.6, ease: 'backOut' }}
                    className="absolute -top-4 -right-3 sm:-top-5 sm:-right-4 bg-emerald-500 text-white p-3 sm:p-3.5 rounded-full border-3 border-white shadow-2xl flex items-center justify-center ring-4 ring-emerald-400/40 z-10"
                  >
                    <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 stroke-[3] text-white" />
                  </motion.div>
                </motion.div>
              </div>

              {/* Text Details with Enlarged Typography */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="space-y-3"
              >
                <div>
                  <span className="inline-block bg-black text-white text-xs sm:text-sm font-black uppercase tracking-widest px-4 py-1.5 rounded-full border border-black shadow-md">
                    Access Granted
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-tight leading-tight">
                  Welcome to UAE MESS
                </h2>
                <p className="text-base sm:text-lg md:text-xl font-extrabold text-slate-800 max-w-sm mx-auto">
                  Welcome back, <span className="text-emerald-600 font-black underline decoration-emerald-500/40">{userAuth.name || 'Member'}</span>
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
