import React, { useState, useEffect } from 'react';
import { Group, Expense, UtilityBill, RentContribution, GoogleSheetsConfig, BillingCycleType, Member, ChatMessage, UserAuthProfile } from './types';
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
  saveGroupToFirestore,
  subscribeToExpenses,
  saveExpenseToFirestore,
  deleteExpenseFromFirestore,
  subscribeToUtilities,
  saveUtilityToFirestore,
  deleteUtilityFromFirestore,
  subscribeToRent,
  saveRentToFirestore,
  subscribeToChatMessages,
  saveChatMessageToFirestore
} from './lib/firebase';

import { HeaderBar } from './components/HeaderBar';
import { DashboardView } from './components/DashboardView';
import { HomeDashboard } from './components/HomeDashboard';
import { AddExpenseModal } from './components/AddExpenseModal';
import { UtilitiesAndRentView } from './components/UtilitiesAndRentView';
import { ReportAndSettlementView } from './components/ReportAndSettlementView';
import { GroupManagementView } from './components/GroupManagementView';
import { ArchitectureGuideModal } from './components/ArchitectureGuideModal';
import { CurrencySettingsModal } from './components/CurrencySettingsModal';
import { GroupChatModal } from './components/GroupChatModal';
import { UaeLoginModal } from './components/UaeLoginModal';
import { GlassContainer } from './components/GlassContainer';
import { BottomNavBar, AppTabType } from './components/BottomNavBar';
import { CheckCircle2, MessageCircle, Plus, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import wallpaperImg from './assets/images/dark_blue_wallpaper_1784929378477.jpg';

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

  const [group, setGroup] = useState<Group>(() => allGroups[0] || INITIAL_GROUP);

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

  // Realtime Firestore synchronization for Group, Expenses, Utilities, Rent, Chat
  useEffect(() => {
    // 1. Group subscription
    const unsubGroup = subscribeToGroup(group.id, (remoteGroup) => {
      if (remoteGroup) {
        setGroup(remoteGroup);
      } else {
        // Initial sync to Firestore if group doesn't exist remotely yet
        saveGroupToFirestore(group);
      }
    });

    // 2. Expenses subscription
    const unsubExp = subscribeToExpenses(group.id, (remoteExpenses) => {
      if (remoteExpenses && remoteExpenses.length > 0) {
        setExpenses(remoteExpenses);
      }
    });

    // 3. Utilities subscription
    const unsubUtil = subscribeToUtilities(group.id, (remoteUtilities) => {
      if (remoteUtilities && remoteUtilities.length > 0) {
        setUtilities(remoteUtilities);
      }
    });

    // 4. Rent subscription
    const unsubRent = subscribeToRent(group.id, (remoteRent) => {
      if (remoteRent) {
        setRent(remoteRent);
      } else {
        saveRentToFirestore(group.id, rent);
      }
    });

    // 5. Chat messages subscription
    const unsubChat = subscribeToChatMessages(group.id, (remoteMsgs) => {
      if (remoteMsgs && remoteMsgs.length > 0) {
        setChatMessages(remoteMsgs);
      }
    });

    return () => {
      unsubGroup();
      unsubExp();
      unsubUtil();
      unsubRent();
      unsubChat();
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

  const [activeTab, setActiveTab] = useState<AppTabType>('home');
  const [billingCycleType, setBillingCycleType] = useState<BillingCycleType>('current');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isArchGuideOpen, setIsArchGuideOpen] = useState(false);
  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
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
  }, [allGroups, userAuth.isLoggedIn, userAuth.role, userAuth.mobileNumber]);
  useEffect(() => {
    fetchFromSheet(true);
  }, [group.spreadsheetId]);

  // Auto real-time background sync simulation every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      fetchFromSheet(true);
    }, 30000);
    return () => clearInterval(interval);
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
      }
      if (fetched.utilities && fetched.utilities.length > 0) {
        setUtilities(fetched.utilities);
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

    const activeExpenses = customExpenses || expenses;
    const activeUtilities = customUtilities || utilities;
    const activeRent = customRent || rent;
    const activeGroup = customGroup || group;

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
  const handleSaveExpense = (newExpData: {
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
      cycle: group.cycleId,
      createdAt: new Date().toISOString(),
    };

    const updatedExpenses = [newExpense, ...expenses];
    setExpenses(updatedExpenses);
    saveExpenseToFirestore(newExpense);
    triggerHaptic(hapticPatterns.success);

    // Automatically post room chat notification for new expense
    const chatNotification: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: payer?.id || 'm3',
      senderName: payer?.name || 'Member',
      senderAvatar: payer?.avatar || 'MB',
      text: `🛒 Added new ${newExpData.type} expense: "${newExpData.title}" (${newExpData.amount.toFixed(2)} ${group.currency})`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'expense_added',
      amount: newExpData.amount,
    };
    setChatMessages((prev) => [...prev, chatNotification]);
    saveChatMessageToFirestore(group.id, chatNotification);

    triggerSheetsSync(false, updatedExpenses);
  };

  const handleSendMessage = (data: { text: string; senderId: string }) => {
    const sender = group.members.find((m) => m.id === data.senderId) || group.members[0];
    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: sender?.id || 'm1',
      senderName: sender?.name || 'User',
      senderAvatar: sender?.avatar || 'US',
      text: data.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
    };
    setChatMessages((prev) => [...prev, newMsg]);
    saveChatMessageToFirestore(group.id, newMsg);
    triggerHaptic(hapticPatterns.click);
  };

  const handleLoginSuccess = (authData: UserAuthProfile) => {
    triggerHaptic(hapticPatterns.success);

    if (authData.role === 'admin') {
      const updatedAuth: UserAuthProfile = {
        ...authData,
        linkedGroupId: group.id || allGroups[0]?.id || 'group-room-1',
      };
      setUserAuth(updatedAuth);
      localStorage.setItem('uae_user_auth', JSON.stringify(updatedAuth));
      setActiveTab('group'); // Redirect directly to Admin Panel
      setIsLoginModalOpen(false);

      const welcomeMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: 'm3',
        senderName: authData.name || 'App Admin',
        senderAvatar: 'AD',
        text: `👑 Logged in as App Administrator with full group control privileges.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'text',
      };
      setChatMessages((prev) => [...prev, welcomeMsg]);
      return;
    }

    // General User login logic
    const userMobile = authData.mobileNumber;
    const matchedGroup = allGroups.find((g) =>
      (g.members || []).some(
        (m) =>
          isPhoneMatch(m.mobileNumber, userMobile) ||
          isPhoneMatch(m.phone, userMobile) ||
          isPhoneMatch(m.email, userMobile)
      )
    );

    if (matchedGroup) {
      const updatedAuth: UserAuthProfile = {
        ...authData,
        linkedGroupId: matchedGroup.id,
      };
      setUserAuth(updatedAuth);
      localStorage.setItem('uae_user_auth', JSON.stringify(updatedAuth));
      setGroup(matchedGroup);
      setActiveTab('home'); // Automatically redirect to that group's page
      setIsLoginModalOpen(false);

      const welcomeMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: 'm3',
        senderName: authData.name || 'Member',
        senderAvatar: 'MB',
        text: `📱 Member logged in with mobile ${authData.mobileNumber} and redirected to ${matchedGroup.name}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'text',
      };
      setChatMessages((prev) => [...prev, welcomeMsg]);
    } else {
      // Mobile number is not associated with any group
      const updatedAuth: UserAuthProfile = {
        ...authData,
        linkedGroupId: null,
      };
      setUserAuth(updatedAuth);
      localStorage.setItem('uae_user_auth', JSON.stringify(updatedAuth));
      setIsLoginModalOpen(false);
    }
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

  const handleRemoveGroup = (groupId: string) => {
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
        members: [],
      };
      filtered.push(defaultNewGroup);
      nextGroup = defaultNewGroup;
    }
    setAllGroups(filtered);
    if (group.id === groupId) {
      setGroup(nextGroup);
      saveGroupToFirestore(nextGroup);
    }
    localStorage.setItem('all_room_groups', JSON.stringify(filtered));
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
    deleteExpenseFromFirestore(id);
    triggerSheetsSync(false, filtered);
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
    <div className="min-h-screen relative flex flex-col font-sans text-slate-900 selection:bg-emerald-500 selection:text-white antialiased max-w-full overflow-x-hidden">
      {/* Global Background Wallpaper & Glowing Liquid Orbs */}
      <div
        className="ios26-wallpaper-bg"
        style={{ backgroundImage: `url(${wallpaperImg})` }}
      />
      <div className="ios26-ambient-orbs">
        <div className="orb-1" />
        <div className="orb-2" />
        <div className="orb-3" />
      </div>

      {/* Toast Sync Notification */}
      {syncNotification && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-950/90 text-emerald-200 border border-emerald-400/40 backdrop-blur-2xl px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-extrabold flex items-center gap-2 animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{syncNotification}</span>
        </div>
      )}

      {/* Header Bar (Visible ONLY when logged in on Dashboard View) */}
      {activeTab === 'dashboard' && !isLoginModalOpen && userAuth.isLoggedIn && (
        <HeaderBar
          group={group}
          allGroups={allGroups}
          onSelectGroup={(g) => {
            setGroup(g);
            triggerHaptic(hapticPatterns.click);
          }}
          billingCycleType={billingCycleType}
          onToggleCycle={setBillingCycleType}
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
        />
      )}

      {/* Main Container with Screen Transitions */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 pt-4 pb-12">
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
                  group={group}
                  expenses={expenses}
                  utilities={utilities}
                  rent={rent}
                  sheetsConfig={sheetsConfig}
                  onSyncNow={() => fetchFromSheet(false)}
                  isSyncing={isSyncing}
                  preferredCurrency={preferredCurrency}
                  customRates={customRates}
                  currentUser={userAuth}
                  onNavigateTab={(tab) => setActiveTab(tab as AppTabType)}
                />
              )}

              {activeTab === 'home' && (
                <HomeDashboard
                  group={group}
                  expenses={expenses}
                  utilities={utilities}
                  rent={rent}
                  onOpenAddExpense={() => setIsAddExpenseOpen(true)}
                  onNavigateTab={(tab) => setActiveTab(tab as AppTabType)}
                  onDeleteExpense={handleDeleteExpense}
                  preferredCurrency={preferredCurrency}
                  customRates={customRates}
                  onOpenGroupChat={() => setIsChatOpen(true)}
                />
              )}

              {activeTab === 'utilities' && (
                <UtilitiesAndRentView
                  group={group}
                  utilities={utilities}
                  rent={rent}
                  onUpdateUtilityStatus={handleUpdateUtilityStatus}
                  onUpdateRentStatus={handleUpdateRentStatus}
                  onAddUtility={handleAddUtility}
                  preferredCurrency={preferredCurrency}
                  customRates={customRates}
                />
              )}

              {activeTab === 'report' && (
                <ReportAndSettlementView
                  group={group}
                  expenses={expenses}
                  utilities={utilities}
                  rent={rent}
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
        group={group}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
      />

      {/* UAE Residence Visa Login Modal */}
      <UaeLoginModal
        isOpen={isLoginModalOpen}
        defaultEmail={userAuth.email || 'mydriveshakil@gmail.com'}
        onLoginSuccess={handleLoginSuccess}
      />

      {/* Floating Action Button (FAB) for Room Group Chat */}
      {!isLoginModalOpen && userAuth.isLoggedIn && (userAuth.role === 'admin' || userAuth.linkedGroupId) && (
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-[76px] sm:bottom-[82px] right-3 sm:right-6 z-50 w-13 h-13 sm:w-14 sm:h-14 bg-gradient-to-tr from-[#F9A826] to-amber-300 hover:from-amber-400 hover:to-amber-200 text-[#0B4A3F] rounded-full shadow-2xl shadow-amber-500/60 border-2 border-white/90 flex items-center justify-center cursor-pointer backdrop-blur-xl transition-all ring-4 ring-emerald-950/40"
          title="Open Room Group Chat"
        >
          <div className="relative flex items-center justify-center">
            <MessageCircle className="w-6 h-6 stroke-[2.5]" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-600 border border-white animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-white" />
          </div>

          {/* Unread Message Notification Badge */}
          {chatMessages.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-[#0B4A3F] text-amber-300 text-[10px] font-black min-w-5 h-5 px-1 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
              {chatMessages.length}
            </span>
          )}
        </motion.button>
      )}

      {/* Mobile Bottom Navigation Bar */}
      {!isLoginModalOpen && userAuth.isLoggedIn && (userAuth.role === 'admin' || userAuth.linkedGroupId) && (
        <BottomNavBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenAddExpense={() => setIsAddExpenseOpen(true)}
        />
      )}
    </div>
  );
}
