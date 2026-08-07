import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Group, Expense, UtilityBill, RentContribution, GoogleSheetsConfig, BillingCycleType, Member, ChatMessage, UserAuthProfile, PayToTransaction } from './types';
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
  subscribeToPayToTransactions,
  savePayToTransactionToFirestore,
  deletePayToTransactionFromFirestore,
  subscribeToUserPresences,
  updateUserPresenceInFirestore,
  getMessageTimestampMs,
  auth,
  onAuthStateChanged,
} from './lib/firebase';

import { HeaderBar } from './components/HeaderBar';
import uaeMessLogo from './assets/images/uae_mess_logo_1785022712689.jpg';
import { DashboardView } from './components/DashboardView';
import { HomeDashboard } from './components/HomeDashboard';
import { AddExpenseModal } from './components/AddExpenseModal';
import { UtilitiesAndRentView } from './components/UtilitiesAndRentView';
import { ReportAndSettlementView } from './components/ReportAndSettlementView';
import { GroupManagementView } from './components/GroupManagementView';
import { PayToView } from './components/PayToView';
import { ArchitectureGuideModal } from './components/ArchitectureGuideModal';
import { CurrencySettingsModal } from './components/CurrencySettingsModal';
import { GroupChatModal } from './components/GroupChatModal';
import { UaeLoginModal } from './components/UaeLoginModal';
import { InstallPwaModal } from './components/InstallPwaModal';
import { GlassContainer } from './components/GlassContainer';
import { BottomNavBar, AppTabType } from './components/BottomNavBar';
import { CheckCircle2, MessageCircle, Plus, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function cleanPhone(p?: string): string {
  if (!p) return '';
  return p.replace(/\D/g, '');
}

function isPhoneMatch(p1?: string, p2?: string): boolean {
  if (!p1 || !p2) return false;
  const c1 = cleanPhone(p1);
  const c2 = cleanPhone(p2);
  if (!c1 || !c2) return false;
  return c1 === c2 || (c1.length >= 7 && c2.length >= 7 && (c1.endsWith(c2) || c2.endsWith(c1)));
}

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
    return INITIAL_EXPENSES;
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
    return INITIAL_UTILITIES;
  });

  const [rent, setRent] = useState<RentContribution>(INITIAL_RENT);
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(INITIAL_SHEETS_CONFIG);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const key = `room_chat_messages_${group.id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return INITIAL_CHAT_MESSAGES;
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

  const [activeMemberIds, setActiveMemberIds] = useState<string[]>([]);

  // Keep state refs updated for global async handlers
  const expensesRef = useRef(expenses);
  const utilitiesRef = useRef(utilities);
  const rentRef = useRef(rent);
  const groupRef = useRef(group);

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

        if (authObj && authObj.isLoggedIn) {
          const userMobile = authObj.mobileNumber;
          const userEmail = authObj.email;
          const userName = authObj.name;
          const matched = remoteGroups.find((g) =>
            (g.members || []).some(
              (m) =>
                isPhoneMatch(m.mobileNumber, userMobile) ||
                isPhoneMatch(m.phone, userMobile) ||
                isPhoneMatch(m.email, userMobile) ||
                (userEmail && m.email && m.email.toLowerCase() === userEmail.toLowerCase()) ||
                (userName && m.name && m.name.toLowerCase().includes(userName.toLowerCase())) ||
                (userName && m.name && userName.toLowerCase().includes(m.name.toLowerCase()))
            )
          ) || (authObj.linkedGroupId ? remoteGroups.find((g) => g.id === authObj.linkedGroupId) : null);

          if (matched) {
            setGroup(matched);
            return;
          }
        }

        const matchingCurrent = remoteGroups.find((g) => g.id === group.id);
        if (matchingCurrent) {
          setGroup(matchingCurrent);
        } else if (remoteGroups.length > 0) {
          setGroup(remoteGroups[0]);
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
        saveUserProfileToFirestore(userProf);
        setIsLoginModalOpen(false);
        setActiveTab('dashboard');
      }
    });

    // 1. Group subscription
    const unsubGroup = subscribeToGroup(group.id, (remoteGroup) => {
      if (remoteGroup) {
        setGroup(remoteGroup);
      } else {
        // Initial sync to Firestore if group doesn't exist remotely yet
        saveGroupToFirestore(group);
      }
    });

    // 2. Expenses subscription - Instant multi-device sync
    const unsubExp = subscribeToExpenses(group.id, (remoteExpenses) => {
      if (remoteExpenses && remoteExpenses.length > 0) {
        setExpenses(remoteExpenses);
        localStorage.setItem(`room_expenses_${group.id}`, JSON.stringify(remoteExpenses));
      } else if (remoteExpenses && remoteExpenses.length === 0) {
        const saved = localStorage.getItem(`room_expenses_${group.id}`);
        let localExpenses: Expense[] = [];
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) localExpenses = parsed;
          } catch (e) {}
        }
        if (localExpenses.length > 0) {
          localExpenses.forEach((exp) => saveExpenseToFirestore({ ...exp, groupId: group.id }, group.id));
          setExpenses(localExpenses);
        } else {
          setExpenses([]);
        }
      }
    });

    // 3. Utilities subscription - Instant multi-device sync
    const unsubUtil = subscribeToUtilities(group.id, (remoteUtilities) => {
      if (remoteUtilities && remoteUtilities.length > 0) {
        setUtilities(remoteUtilities);
        localStorage.setItem(`room_utilities_${group.id}`, JSON.stringify(remoteUtilities));
      } else if (remoteUtilities && remoteUtilities.length === 0) {
        const saved = localStorage.getItem(`room_utilities_${group.id}`);
        let localUtils: UtilityBill[] = [];
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) localUtils = parsed;
          } catch (e) {}
        }
        if (localUtils.length > 0) {
          localUtils.forEach((util) => saveUtilityToFirestore({ ...util, groupId: group.id }, group.id));
          setUtilities(localUtils);
        } else {
          setUtilities([]);
        }
      }
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
      } else if (remoteMsgs && remoteMsgs.length === 0) {
        const saved = localStorage.getItem(`room_chat_messages_${group.id}`);
        let localMsgs: ChatMessage[] = [];
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) localMsgs = parsed;
          } catch (e) {}
        }
        if (localMsgs.length > 0) {
          localMsgs.forEach((msg) => saveChatMessageToFirestore(group.id, { ...msg, groupId: group.id }));
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

  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(() => {
    return !userAuth.isLoggedIn;
  });
  const [isLoginSuccessAnimActive, setIsLoginSuccessAnimActive] = useState<boolean>(false);

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
  const [billingCycleType, setBillingCycleType] = useState<BillingCycleType>('current');
  const [selectedPreviousCycle, setSelectedPreviousCycle] = useState<string>(() => {
    const prevs = getPreviousCycleOptions(1);
    return prevs[0]?.cycleId || '2026-06';
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

    updateUserPresenceInFirestore(group.id, memberId, memberName);
    const interval = setInterval(() => {
      updateUserPresenceInFirestore(group.id, memberId, memberName);
    }, 10000);

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
    : (selectedPreviousCycle || getPreviousCycleOptions(1)[0]?.cycleId || '2026-06');

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
      const expCycle = e.cycle || (e.date ? e.date.slice(0, 7) : '');
      if (expCycle) {
        return expCycle === activeCycleId;
      }
      return activeCycleId === currentCycleId;
    });
  }, [expenses, activeCycleId, currentCycleId]);

  const displayedUtilities = useMemo(() => {
    return utilities.filter((u) => {
      const utilCycle = u.cycle || (u.date ? u.date.slice(0, 7) : '');
      if (utilCycle) {
        return utilCycle === activeCycleId;
      }
      return activeCycleId === currentCycleId;
    });
  }, [utilities, activeCycleId, currentCycleId]);

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
  const [isArchGuideOpen, setIsArchGuideOpen] = useState(false);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isInstallPwaOpen, setIsInstallPwaOpen] = useState(false);

  // Swipe Gesture Handler for Navigation Bar Tabs
  const touchStartXRef = useRef<number | null>(null);
  const touchStartYRef = useRef<number | null>(null);

  const handleNavigateNextTab = () => {
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
    if (isChatOpen) {
      const now = Date.now();
      setLastReadTimestamp(now);
      if (group?.id) {
        localStorage.setItem(`chat_last_read_time_${group.id}`, String(now));
      }
    }
  }, [isChatOpen, group?.id]);

  // Calculate unread messages count (only messages sent by others after lastReadTimestamp)
  const unreadCount = useMemo(() => {
    if (!chatMessages || chatMessages.length === 0 || isChatOpen) return 0;

    return chatMessages.filter((msg) => {
      const isMe =
        msg.senderId === userAuth.id ||
        msg.senderId === userAuth.linkedGroupId ||
        (userAuth.name && msg.senderName === userAuth.name);

      if (isMe) return false;

      const msgTime = getMessageTimestampMs(msg);
      return msgTime > lastReadTimestamp;
    }).length;
  }, [chatMessages, isChatOpen, lastReadTimestamp, userAuth.id, userAuth.linkedGroupId, userAuth.name]);
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

  // Automatic backend data synchronization whenever ANY button in the app is clicked
  useEffect(() => {
    let syncTimer: NodeJS.Timeout;
    const handleGlobalButtonClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const button = target.closest('button, [role="button"], input[type="submit"], select, a');
      if (button) {
        setIsSyncing(true);
        clearTimeout(syncTimer);
        syncTimer = setTimeout(() => {
          triggerSheetsSync(true);
        }, 400);
      }
    };

    window.addEventListener('click', handleGlobalButtonClick);
    return () => {
      window.removeEventListener('click', handleGlobalButtonClick);
      clearTimeout(syncTimer);
    };
  }, [group, expenses, utilities, rent]);

  const fetchFromSheet = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    const sheetId = group.spreadsheetId || '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM';
    const fetched = await GoogleSheetsService.fetchLatestSheetData(sheetId, group.id);

    if (fetched.success) {
      if (fetched.expenses && fetched.expenses.length > 0) {
        setExpenses(fetched.expenses);
        fetched.expenses.forEach((e) => saveExpenseToFirestore({ ...e, groupId: group.id }, group.id));
      }
      if (fetched.utilities && fetched.utilities.length > 0) {
        setUtilities(fetched.utilities);
        fetched.utilities.forEach((u) => saveUtilityToFirestore({ ...u, groupId: group.id }, group.id));
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
    if (!silent) setIsSyncing(true);

    const activeExpenses = customExpenses || expensesRef.current;
    const activeUtilities = customUtilities || utilitiesRef.current;
    const activeRent = customRent || rentRef.current;
    const activeGroup = customGroup || groupRef.current;

    const result = await GoogleSheetsService.syncToGoogleSheet(
      activeGroup.spreadsheetId || '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM',
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

  const handleSendMessage = (data: { text: string; senderId: string; senderName?: string }) => {
    const sender = group.members.find((m) => m.id === data.senderId) || group.members[0];
    const nameToUse = data.senderName || sender?.name || userAuth?.name || 'User';
    const avatarToUse = sender?.avatar || nameToUse.slice(0, 2).toUpperCase();

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
      type: 'text',
    };
    setChatMessages((prev) => [...prev, newMsg]);
    saveChatMessageToFirestore(group.id, newMsg);
    triggerHaptic(hapticPatterns.click);
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
    const matchedGroup = allGroups.find((g) =>
      (g.members || []).some(
        (m) =>
          isPhoneMatch(m.mobileNumber, userMobile) ||
          isPhoneMatch(m.phone, userMobile) ||
          isPhoneMatch(m.email, userMobile) ||
          (userEmail && m.email && m.email.toLowerCase() === userEmail.toLowerCase()) ||
          (userName && m.name && m.name.toLowerCase().includes(userName.toLowerCase())) ||
          (userName && m.name && userName.toLowerCase().includes(m.name.toLowerCase()))
      )
    ) || group || allGroups[0];

    const updatedAuth: UserAuthProfile = {
      ...authData,
      linkedGroupId: matchedGroup ? matchedGroup.id : null,
    };
    setUserAuth(updatedAuth);
    localStorage.setItem('uae_user_auth', JSON.stringify(updatedAuth));

    if (matchedGroup) {
      setGroup(matchedGroup);
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
    const filtered = expenses.filter((e) => e.id !== id);
    setExpenses(filtered);
    localStorage.setItem('room_expenses_' + group.id, JSON.stringify(filtered));
    deleteExpenseFromFirestore(id);
    triggerSheetsSync(false, filtered);
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
        const item = { ...u, status };
        saveUtilityToFirestore(item);
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
      id: `util-${Date.now()}`,
    };
    const updated = [...utilities, util];
    setUtilities(updated);
    saveUtilityToFirestore(util);
    triggerSheetsSync(false, expenses, updated);
  };

  const handleUpdateRentStatus = (status: 'paid' | 'pending') => {
    const updatedRent = { ...rent, status };
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
      });
    }

    triggerSheetsSync(true, expenses, utilities, rent, updatedGroup);
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
    const updatedGroup = {
      ...group,
      members: group.members.filter((m) => m.id !== id),
    };
    setGroup(updatedGroup);
    saveGroupToFirestore(updatedGroup);

    const updatedAll = allGroups.map((g) => (g.id === group.id ? updatedGroup : g));
    setAllGroups(updatedAll);
    localStorage.setItem('all_room_groups', JSON.stringify(updatedAll));

    triggerSheetsSync(true, expenses, utilities, rent, updatedGroup);
  };

  return (
    <div
      className="min-h-screen relative flex flex-col font-sans text-slate-900 selection:bg-[#0F3DFF] selection:text-white antialiased max-w-full overflow-x-hidden bg-[#F6F8FC]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Global Background Theme */}
      <div className="ios26-wallpaper-bg bg-[#F6F8FC]" />

      {/* Toast Sync Notification */}
      {syncNotification && (
        <div className="fixed top-4 right-4 z-50 bg-[#071E55]/95 text-blue-100 border border-[#0F3DFF]/40 backdrop-blur-2xl px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-extrabold flex items-center gap-2 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-blue-400" />
          <span>{syncNotification}</span>
        </div>
      )}

      {/* Main Container with Screen Transitions */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 md:px-8 pt-4 pb-12">
        {/* Header Bar (Visible ONLY when logged in on Dashboard View) */}
        {activeTab === 'dashboard' && !isLoginModalOpen && userAuth.isLoggedIn && (
          <HeaderBar
            group={displayedGroup}
            allGroups={allGroups}
            onSelectGroup={(g) => {
              setGroup(g);
              triggerHaptic(hapticPatterns.click);
            }}
            billingCycleType={billingCycleType}
            onToggleCycle={setBillingCycleType}
            selectedPreviousCycle={selectedPreviousCycle}
            onSelectPreviousCycle={setSelectedPreviousCycle}
            expenses={expenses}
            sheetsConfig={sheetsConfig}
            onSyncNow={() => fetchFromSheet(false)}
            onOpenAddGroup={() => setActiveTab('group')}
            onOpenArchGuide={() => setIsArchGuideOpen(true)}
            isSyncing={isSyncing}
            preferredCurrency={preferredCurrency}
            onOpenCurrencySettings={() => setIsCurrencyModalOpen(true)}
            currentUser={userAuth}
            onOpenLoginModal={() => setIsLoginModalOpen(true)}
            onLogout={handleLogout}
            onOpenInstallPwa={() => setIsInstallPwaOpen(true)}
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
                  expenses={displayedExpenses}
                  utilities={displayedUtilities}
                  rent={displayedRent}
                  sheetsConfig={sheetsConfig}
                  onSyncNow={() => fetchFromSheet(false)}
                  isSyncing={isSyncing}
                  preferredCurrency={preferredCurrency}
                  customRates={customRates}
                  currentUser={userAuth}
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
                    } else if (['dashboard', 'home', 'utilities', 'report', 'group'].includes(tab)) {
                      setActiveTab(tab as AppTabType);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  onDeleteExpense={handleDeleteExpense}
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
                    } else if (['dashboard', 'home', 'utilities', 'report', 'group'].includes(tab)) {
                      setActiveTab(tab as AppTabType);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  onDeleteExpense={handleDeleteExpense}
                  preferredCurrency={preferredCurrency}
                  customRates={customRates}
                  onOpenGroupChat={() => setIsChatOpen(true)}
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
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* Add Expense Modal */}
      <AddExpenseModal
        group={group}
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        currentUser={userAuth}
        onSaveExpense={handleSaveExpense}
      />

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

      {/* Room Group Chat Modal */}
      <GroupChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        group={displayedGroup}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        currentUser={userAuth}
        activeMemberIds={activeMemberIds}
      />

      {/* UAE Residence Visa Login Full Screen Page */}
      {(!userAuth.isLoggedIn || isLoginModalOpen) && (
        <div className="fixed inset-0 z-[100] bg-slate-100 overflow-y-auto flex flex-col justify-center items-center">
          <UaeLoginModal
            isOpen={true}
            defaultEmail={userAuth.email || 'mydriveshakil@gmail.com'}
            allGroups={allGroups}
            onLoginSuccess={handleLoginSuccess}
            onOpenInstallPwa={() => setIsInstallPwaOpen(true)}
            isLoggedIn={userAuth.isLoggedIn}
            onClose={() => setIsLoginModalOpen(false)}
          />
        </div>
      )}

      {/* Mobile PWA Install & Home Screen Setup Modal */}
      <InstallPwaModal
        isOpen={isInstallPwaOpen}
        onClose={() => setIsInstallPwaOpen(false)}
      />

      {/* Floating Action Button (FAB) for Room Group Chat */}
      {!isChatOpen && !isLoginModalOpen && userAuth.isLoggedIn && (userAuth.role === 'admin' || userAuth.linkedGroupId) && activeTab === 'dashboard' && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-[88px] sm:bottom-[94px] right-4 sm:right-6 z-50 w-12 h-12 sm:w-13 sm:h-13 bg-[#07193F] hover:bg-[#0B2556] text-white rounded-full shadow-xl border border-slate-700/80 flex items-center justify-center cursor-pointer transition-all ring-2 ring-white/50"
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
            setIsAddExpenseOpen(false);
            setActiveTab(tab);
          }}
          onOpenAddExpense={() => setIsAddExpenseOpen(true)}
          isAddExpenseOpen={isAddExpenseOpen}
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
                    Portal Access Granted
                  </span>
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-950 tracking-tight leading-tight">
                  Login Successful!
                </h2>
                <p className="text-base sm:text-lg md:text-xl font-extrabold text-slate-800 max-w-sm mx-auto">
                  Welcome back, <span className="text-emerald-600 font-black underline decoration-emerald-500/40">{userAuth.name}</span>
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
