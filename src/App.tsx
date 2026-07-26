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
import { BottomNavBar, AppTabType } from './components/BottomNavBar';
import { CheckCircle2, MessageCircle, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import wallpaperImg from './assets/images/dark_blue_wallpaper_1784929378477.jpg';

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

  // Fetch live Google Sheet data on initial mount
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

  const triggerSheetsSync = async (silent = false) => {
    if (!silent) setIsSyncing(true);

    const result = await GoogleSheetsService.syncToGoogleSheet(group.spreadsheetId || '1-VBgqW-RrEXQrTXTxCjSvMPX5w_RlXiw1kM020mNPwM', {
      group,
      expenses,
      utilities,
      rent,
    });

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

    triggerSheetsSync();
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
    setUserAuth(authData);
    localStorage.setItem('uae_user_auth', JSON.stringify(authData));
    setIsLoginModalOpen(false);
    triggerHaptic(hapticPatterns.success);

    // Welcome message in chat if valid identity verified
    if (authData.identity) {
      const isAppAdmin = authData.role === 'admin';
      const welcomeMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        senderId: 'm3',
        senderName: `${authData.identity.fullName} (${isAppAdmin ? 'App Admin' : 'Member'})`,
        senderAvatar: isAppAdmin ? 'AD' : 'MB',
        text: isAppAdmin
          ? `👑 Logged in as App Administrator with full group control privileges.`
          : `🇦🇪 Joined room group! UAE Residence Visa verified active (Expires ${authData.identity.visaExpiryDate}). Email: ${authData.email}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: 'text',
      };
      setChatMessages((prev) => [...prev, welcomeMsg]);
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
    triggerSheetsSync();
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
    triggerSheetsSync();
  };

  const handleAddUtility = (newUtil: Omit<UtilityBill, 'id'>) => {
    const util: UtilityBill = {
      ...newUtil,
      id: `util-${Date.now()}`,
    };
    const updated = [...utilities, util];
    setUtilities(updated);
    saveUtilityToFirestore(util);
    triggerSheetsSync();
  };

  const handleUpdateRentStatus = (status: 'paid' | 'pending') => {
    const updatedRent = { ...rent, status };
    setRent(updatedRent);
    saveRentToFirestore(group.id, updatedRent);
    triggerSheetsSync();
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
    triggerSheetsSync();
  };

  const handleUpdateMemberDays = (id: string, daysPresent: number) => {
    const updatedGroup = {
      ...group,
      members: group.members.map((m) => (m.id === id ? { ...m, daysPresent } : m)),
    };
    setGroup(updatedGroup);
    saveGroupToFirestore(updatedGroup);
    triggerSheetsSync();
  };

  const handleRemoveMember = (id: string) => {
    const updatedGroup = {
      ...group,
      members: group.members.filter((m) => m.id !== id),
    };
    setGroup(updatedGroup);
    saveGroupToFirestore(updatedGroup);
    triggerSheetsSync();
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
              />
            )}
          </motion.div>
        </AnimatePresence>
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

      {/* Floating Action Button (FAB) for Room Group Chat (Fixed in bottom right corner alongside navigation bar) */}
      {!isLoginModalOpen && userAuth.isLoggedIn && (
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

      {/* Mobile Bottom Navigation Bar (Visible only after successful login) */}
      {!isLoginModalOpen && userAuth.isLoggedIn && (
        <BottomNavBar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenAddExpense={() => setIsAddExpenseOpen(true)}
        />
      )}
    </div>
  );
}
