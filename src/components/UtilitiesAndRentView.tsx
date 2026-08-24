import React, { useState, useEffect } from 'react';
import { Group, UtilityBill, RentContribution, UserAuthProfile, LaundryBill } from '../types';
import {
  Zap,
  Home as HomeIcon,
  Plus,
  CheckCircle2,
  Clock,
  Edit2,
  AlertCircle,
  DollarSign,
  Calculator,
  Trash2,
  Lock,
  Unlock,
  X,
  Users,
  CheckSquare,
  Square,
  Shirt,
  Sparkles,
  Filter,
  Calendar,
  Check,
} from 'lucide-react';
import { DualCurrencyDisplay } from './DualCurrencyDisplay';
import { GlassContainer } from './GlassContainer';
import { MemberAvatar } from './MemberAvatar';
import { evaluateMathExpression } from '../utils/mathEvaluator';
import { isCategoryPermittedForUser } from '../utils/permissionUtils';
import { isPhoneMatch, saveLaundryBillToFirestore, deleteLaundryBillFromFirestore, subscribeToLaundryBills, subscribeToGroupLaundryBills } from '../lib/firebase';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';
import { formatDateDisplay } from '../utils/dateUtils';
import { formatAmountNumber } from '../utils/currency';

interface UtilitiesAndRentViewProps {
  group: Group;
  utilities: UtilityBill[];
  rent: RentContribution;
  onUpdateUtilityStatus: (id: string, status: 'paid' | 'pending') => void;
  onUpdateRentStatus: (status: 'paid' | 'pending') => void;
  onUpdateRent?: (rent: RentContribution) => void;
  onAddUtility: (utility: Omit<UtilityBill, 'id'>) => void;
  onDeleteUtility?: (id: string) => void;
  preferredCurrency?: string;
  customRates?: Record<string, number>;
  currentUser?: UserAuthProfile | null;
}

const UTILITY_NAME_OPTIONS = [
  'LPG Gass',
  'Drinking Water',
  'WiFi',
  'Cigarettes',
  'AC Repair',
  'Room Maintenance',
  'Washroom Maintenance.',
  'Kitchen Maintenance',
  'Others',
];

export const UtilitiesAndRentView: React.FC<UtilitiesAndRentViewProps> = ({
  group,
  utilities,
  rent,
  onUpdateUtilityStatus,
  onUpdateRentStatus,
  onUpdateRent,
  onAddUtility,
  onDeleteUtility,
  preferredCurrency = 'USD',
  customRates,
  currentUser,
}) => {
  const [deleteConfirmUtilId, setDeleteConfirmUtilId] = useState<string | null>(null);
  const loggedInMember = group.members.find(
    (m) =>
      (currentUser?.email && m.email?.toLowerCase() === currentUser.email.toLowerCase()) ||
      (currentUser?.mobileNumber &&
        (isPhoneMatch(m.phone, currentUser.mobileNumber) ||
          isPhoneMatch(m.mobileNumber, currentUser.mobileNumber))) ||
      (currentUser?.name && m.name.toLowerCase() === currentUser.name.toLowerCase())
  ) || group.members[0];

  const hasRentPermission = isCategoryPermittedForUser('rent', group, currentUser);
  const hasUtilityPermission =
    isCategoryPermittedForUser('electricity', group, currentUser) ||
    isCategoryPermittedForUser('internet', group, currentUser) ||
    isCategoryPermittedForUser('water', group, currentUser) ||
    isCategoryPermittedForUser('gas', group, currentUser) ||
    isCategoryPermittedForUser('cleaner', group, currentUser);

  const visibleUtilities = utilities.filter((u) => isCategoryPermittedForUser(u.category, group, currentUser));

  // Toggles for sections and forms
  const [showAddForm, setShowAddForm] = useState(false);
  const [showLaundryForm, setShowLaundryForm] = useState(false);
  const [showUtilityBills, setShowUtilityBills] = useState(false);
  const [showRoomRent, setShowRoomRent] = useState(false);
  const [newUtilNameOption, setNewUtilNameOption] = useState(UTILITY_NAME_OPTIONS[0]);
  const [customUtilName, setCustomUtilName] = useState('');
  const [newUtilAmount, setNewUtilAmount] = useState('');
  const [newUtilPayer, setNewUtilPayer] = useState(loggedInMember?.id || 'm1');
  const [newUtilCategory, setNewUtilCategory] = useState<'electricity' | 'internet' | 'water' | 'gas' | 'cleaner' | 'other'>('gas');
  const [newUtilSharedWith, setNewUtilSharedWith] = useState<string[]>([]);

  // Initialize sharedWith default to all group members
  useEffect(() => {
    if (group.members) {
      setNewUtilSharedWith(group.members.map((m) => m.id));
    }
  }, [group.members]);

  useEffect(() => {
    if (loggedInMember) {
      setNewUtilPayer(loggedInMember.id);
    }
  }, [loggedInMember?.id]);

  const now = new Date();
  const currentMonthCycle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [totalRentInput, setTotalRentInput] = useState((rent?.totalRent || 0).toString());
  const [paidRentMembers, setPaidRentMembers] = useState<string[]>(rent?.paidMemberIds || []);

  const paidMemberIdsJoined = (rent?.paidMemberIds || []).join(',');

  useEffect(() => {
    if (rent) {
      // Auto-reset on the 1st of next month if cycle has passed or month changed
      const rentCycleToCheck = rent.paidCycle || rent.cycle;
      if (rentCycleToCheck && rentCycleToCheck < currentMonthCycle) {
        const resetRent: RentContribution = {
          ...rent,
          totalRent: 0,
          paidMemberIds: [],
          cycle: currentMonthCycle,
          paidCycle: undefined,
          paidAt: undefined,
          perMemberAmount: 0,
          status: 'pending',
          isLocked: false,
        };
        setTotalRentInput('0');
        setPaidRentMembers([]);
        if (onUpdateRent) {
          onUpdateRent(resetRent);
        }
      } else {
        setTotalRentInput((rent.totalRent || 0).toString());
        setPaidRentMembers(rent.paidMemberIds || []);
      }
    }
  }, [rent?.totalRent, paidMemberIdsJoined, rent?.cycle, rent?.paidCycle, currentMonthCycle]);

  const isAdmin = currentUser?.role === 'admin';
  const isRentAmountSet = (rent?.totalRent || 0) > 0;
  const isRentInputLocked = rent?.isLocked ?? false;

  const isRentPaidToLandlord = rent?.status === 'paid';
  const isRentPaidLocked =
    isRentPaidToLandlord &&
    (rent?.paidCycle === currentMonthCycle || (!rent?.paidCycle && rent?.cycle === currentMonthCycle));

  const handleToggleRentToLandlord = () => {
    if (isRentPaidLocked) {
      if (!isAdmin) {
        alert(
          `Rent payment to landlord is locked for the current month (${currentMonthCycle}). It will automatically unlock on the 1st of next month.`
        );
        return;
      }
      const confirmReset = window.confirm(
        `You are Admin. Do you want to unlock & reset Rent to Landlord status for ${currentMonthCycle} back to Pending?`
      );
      if (confirmReset) {
        const updatedRent: RentContribution = {
          ...rent,
          status: 'pending',
          paidCycle: undefined,
          paidAt: undefined,
        };
        if (onUpdateRent) {
          onUpdateRent(updatedRent);
        } else {
          onUpdateRentStatus('pending');
        }
      }
      return;
    }

    // Mark as paid and lock for current month
    const updatedRent: RentContribution = {
      ...rent,
      status: 'paid',
      paidCycle: currentMonthCycle,
      paidAt: new Date().toISOString(),
      cycle: rent.cycle || currentMonthCycle,
    };
    if (onUpdateRent) {
      onUpdateRent(updatedRent);
    } else {
      onUpdateRentStatus('paid');
    }
  };

  const handleLockRent = () => {
    const parsed = parseFloat(totalRentInput) || 0;
    if (parsed <= 0) {
      alert('Please enter a valid rent amount before locking.');
      return;
    }
    const updatedRent: RentContribution = {
      ...rent,
      totalRent: parsed,
      perMemberAmount: parsed / totalRentSplitCount,
      cycle: rent.cycle || currentMonthCycle,
      isLocked: true,
    };
    if (onUpdateRent) {
      onUpdateRent(updatedRent);
    }
  };

  const handleUnlockRent = () => {
    if (!isAdmin && rent?.isLocked) {
      alert('Only Admin can unlock the rent amount.');
      return;
    }
    const updatedRent: RentContribution = {
      ...rent,
      isLocked: false,
    };
    if (onUpdateRent) {
      onUpdateRent(updatedRent);
    }
  };

  const rentParticipatingMembers = group.members.filter(
    (m) => !m.includedCategories || m.includedCategories.length === 0 || m.includedCategories.includes('rent')
  );
  const rentParticipatingCount = rentParticipatingMembers.length || 1;

  const tempMembers = rent?.temporaryMembers || [];
  const tempMembersCount = tempMembers.length;
  const totalRentSplitCount = rentParticipatingCount + tempMembersCount;

  const totalUtilities = utilities.reduce((sum, u) => sum + u.amount, 0);
  const activeMembersCount = group.members.filter((m) => m.active !== false).length || 1;
  const perMemberUtil = totalUtilities / activeMembersCount;
  const perMemberRent = (rent?.totalRent || 0) / totalRentSplitCount;

  const parsedTotalRent = parseFloat(totalRentInput) || rent?.totalRent || 0;
  const currentMemberRentShare = parsedTotalRent / totalRentSplitCount;

  const [newTempName, setNewTempName] = useState('');
  const [showAddTempInput, setShowAddTempInput] = useState(false);

  const handleAddTempMember = () => {
    if (!newTempName.trim()) return;
    const updatedTemp = [...tempMembers, newTempName.trim()];
    const updatedRent: RentContribution = {
      ...rent,
      temporaryMembers: updatedTemp,
      perMemberAmount: (rent?.totalRent || 0) / (rentParticipatingCount + updatedTemp.length),
    };
    if (onUpdateRent) {
      onUpdateRent(updatedRent);
    }
    setNewTempName('');
    setShowAddTempInput(false);
  };

  const handleRemoveTempMember = (indexToRemove: number) => {
    const updatedTemp = tempMembers.filter((_, idx) => idx !== indexToRemove);
    const updatedRent: RentContribution = {
      ...rent,
      temporaryMembers: updatedTemp,
      perMemberAmount: (rent?.totalRent || 0) / (rentParticipatingCount + updatedTemp.length),
    };
    if (onUpdateRent) {
      onUpdateRent(updatedRent);
    }
  };

  const handleRentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isRentInputLocked) return;
    const val = e.target.value;
    setTotalRentInput(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed >= 0) {
      const updatedRent: RentContribution = {
        ...rent,
        totalRent: parsed,
        perMemberAmount: parsed / totalRentSplitCount,
        cycle: rent.cycle || currentMonthCycle,
      };
      if (onUpdateRent) {
        onUpdateRent(updatedRent);
      }
    } else if (val === '') {
      const updatedRent: RentContribution = {
        ...rent,
        totalRent: 0,
        perMemberAmount: 0,
        cycle: rent.cycle || currentMonthCycle,
      };
      if (onUpdateRent) {
        onUpdateRent(updatedRent);
      }
    }
  };

  const toggleMemberRentPaid = (memberId: string) => {
    const isCurrentlyPaid = paidRentMembers.includes(memberId);
    
    // Member cannot untick once marked as paid for the month unless Admin
    if (isCurrentlyPaid && !isAdmin) {
      alert('This rent payment status is locked for the current month once marked as paid. It will automatically unlock & reset on the 1st day of next month (or contact Admin).');
      return;
    }

    let updated: string[];
    if (isCurrentlyPaid) {
      updated = paidRentMembers.filter((id) => id !== memberId);
    } else {
      updated = [...paidRentMembers, memberId];
    }
    setPaidRentMembers(updated);
    if (onUpdateRent) {
      onUpdateRent({
        ...rent,
        paidMemberIds: updated,
        cycle: rent.cycle || currentMonthCycle,
      });
    }
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = newUtilNameOption === 'Others' ? (customUtilName.trim() || 'Others') : newUtilNameOption;
    if (!finalName || !newUtilAmount) return;

    const res = evaluateMathExpression(newUtilAmount);
    const parsed = res.calculatedValue ?? parseFloat(newUtilAmount);
    if (!parsed || parsed <= 0) return;

    onAddUtility({
      groupId: group.id,
      name: finalName,
      category: newUtilCategory,
      amount: parsed,
      dueDate: new Date().toISOString().split('T')[0],
      paidById: newUtilPayer,
      status: 'paid',
      cycle: group.cycleId,
      sharedWithIds: newUtilSharedWith.length > 0 ? newUtilSharedWith : group.members.map((m) => m.id),
    });

    setNewUtilNameOption(UTILITY_NAME_OPTIONS[0]);
    setCustomUtilName('');
    setNewUtilAmount('');
    setNewUtilSharedWith(group.members.map((m) => m.id));
    setShowAddForm(false);
  };

  // ==========================================
  // GROUP & PERSONAL LAUNDRY BILL STATE & SYNC
  // ==========================================
  const userKey =
    currentUser?.email ||
    currentUser?.mobileNumber ||
    currentUser?.name ||
    loggedInMember?.id ||
    'default_user';
  const sanitizedUserKey = userKey.replace(/[^a-zA-Z0-9_]/g, '_');
  const personalLaundryStorageKey = `personal_laundry_${sanitizedUserKey}`;
  const groupLaundryStorageKey = `group_laundry_${group.id}`;

  const [laundryBills, setLaundryBills] = useState<LaundryBill[]>(() => {
    const billsMap = new Map<string, LaundryBill>();

    // 1. Group saved in localStorage
    const groupSaved = localStorage.getItem(groupLaundryStorageKey);
    if (groupSaved) {
      try {
        const parsed = JSON.parse(groupSaved);
        if (Array.isArray(parsed)) {
          parsed.forEach((b: LaundryBill) => {
            if (b && b.id) billsMap.set(b.id, b);
          });
        }
      } catch (e) {}
    }

    // 2. Personal saved in localStorage
    const personalSaved = localStorage.getItem(personalLaundryStorageKey);
    if (personalSaved) {
      try {
        const parsed = JSON.parse(personalSaved);
        if (Array.isArray(parsed)) {
          parsed.forEach((b: LaundryBill) => {
            if (b && b.id) billsMap.set(b.id, b);
          });
        }
      } catch (e) {}
    }

    // 3. Scan all localStorage keys for any personal_laundry_* or group_laundry_* to retrieve all members' records
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('personal_laundry_') || key.startsWith('group_laundry_') || key.startsWith('laundry_'))) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                parsed.forEach((b: LaundryBill) => {
                  if (b && b.id) {
                    const matchesGroup = !b.groupId || b.groupId === group.id;
                    const matchesMember = group.members.some(
                      (m) =>
                        m.id === b.memberId ||
                        m.id === b.userId ||
                        (b.memberName && m.name.toLowerCase() === b.memberName.toLowerCase())
                    );
                    if (matchesGroup || matchesMember) {
                      billsMap.set(b.id, {
                        ...b,
                        groupId: b.groupId || group.id,
                      });
                    }
                  }
                });
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) {}

    const items = Array.from(billsMap.values());
    items.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    return items;
  });

  // Sync with Firestore
  useEffect(() => {
    // 1. Group-wide laundry bills listener with all members (so Admin & members see all notices for current room)
    const unsubGroup = subscribeToGroupLaundryBills(
      group.id,
      (bills) => {
        if (bills && Array.isArray(bills)) {
          setLaundryBills((prev) => {
            const map = new Map<string, LaundryBill>();
            prev.forEach((b) => map.set(b.id, b));
            bills.forEach((b) => map.set(b.id, b));
            const list = Array.from(map.values());
            list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
            return list;
          });
          localStorage.setItem(groupLaundryStorageKey, JSON.stringify(bills));
        }
      },
      group.members
    );

    // 2. Personal laundry bills listener as backup/individual sync
    const unsubPersonal = subscribeToLaundryBills(sanitizedUserKey, (personalBills) => {
      if (personalBills && Array.isArray(personalBills)) {
        localStorage.setItem(personalLaundryStorageKey, JSON.stringify(personalBills));
        setLaundryBills((prev) => {
          const map = new Map<string, LaundryBill>();
          prev.forEach((b) => map.set(b.id, b));
          personalBills.forEach((b) => map.set(b.id, b));
          const merged = Array.from(map.values());
          merged.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
          return merged;
        });
      }
    });

    return () => {
      if (unsubGroup) unsubGroup();
      if (unsubPersonal) unsubPersonal();
    };
  }, [group.id, group.members, sanitizedUserKey, groupLaundryStorageKey, personalLaundryStorageKey]);

  const persistLaundryBills = (updated: LaundryBill[]) => {
    setLaundryBills(updated);
    localStorage.setItem(groupLaundryStorageKey, JSON.stringify(updated));
    localStorage.setItem(personalLaundryStorageKey, JSON.stringify(updated));
  };

  // Laundry Member Filter State (Admin Only)
  const [laundryMemberFilter, setLaundryMemberFilter] = useState<string>('all');

  // Laundry Add Form State
  const [laundryMemberId, setLaundryMemberId] = useState<string>(loggedInMember?.id || group.members[0]?.id || '');
  const [laundryDate, setLaundryDate] = useState(() => {
    const d = new Date();
    const YYYY = d.getFullYear();
    const MM = String(d.getMonth() + 1).padStart(2, '0');
    const DD = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD} ${hh}:${mm}`;
  });
  const [laundryGiveTo, setLaundryGiveTo] = useState('');
  const [laundryTotalItems, setLaundryTotalItems] = useState('');
  const [laundryPrice, setLaundryPrice] = useState('');

  // Laundry Edit State (Admin Only)
  const [editingLaundryBill, setEditingLaundryBill] = useState<LaundryBill | null>(null);
  const [editLaundryMemberId, setEditLaundryMemberId] = useState<string>('');
  const [editLaundryDate, setEditLaundryDate] = useState('');
  const [editLaundryGiveTo, setEditLaundryGiveTo] = useState('');
  const [editLaundryTotalItems, setEditLaundryTotalItems] = useState('');
  const [editLaundryPrice, setEditLaundryPrice] = useState('');
  const [editLaundryStatus, setEditLaundryStatus] = useState<'pending' | 'received'>('pending');

  const handleStartEditLaundry = (bill: LaundryBill) => {
    if (!isAdmin) return;
    setEditingLaundryBill(bill);
    const mId = bill.memberId || group.members.find((m) => m.name.toLowerCase() === bill.memberName?.toLowerCase())?.id || loggedInMember?.id || group.members[0]?.id || '';
    setEditLaundryMemberId(mId);
    setEditLaundryDate(bill.date);
    setEditLaundryGiveTo(bill.giveTo);
    setEditLaundryTotalItems(bill.totalItems.toString());
    setEditLaundryPrice(bill.pricePerItem.toString());
    setEditLaundryStatus(bill.status);
    triggerHaptic(hapticPatterns.click);
  };

  const handleSaveEditLaundry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLaundryBill || !isAdmin) return;
    const items = parseInt(editLaundryTotalItems, 10) || 0;
    const price = parseFloat(editLaundryPrice) || 0;
    if (!editLaundryGiveTo.trim()) {
      alert('Please enter who the laundry was given to.');
      return;
    }
    if (items <= 0 || price <= 0) {
      alert('Please enter valid items count and price per item.');
      return;
    }

    const assignedMember = group.members.find((m) => m.id === editLaundryMemberId);

    const updatedBill: LaundryBill = {
      ...editingLaundryBill,
      memberId: assignedMember?.id || editingLaundryBill.memberId,
      memberName: assignedMember?.name || editingLaundryBill.memberName,
      date: editLaundryDate.trim() || editingLaundryBill.date,
      giveTo: editLaundryGiveTo.trim(),
      totalItems: items,
      pricePerItem: price,
      totalAmount: items * price,
      status: editLaundryStatus,
      receivedAt:
        editLaundryStatus === 'received' && !editingLaundryBill.receivedAt
          ? new Date().toISOString()
          : editLaundryStatus === 'pending'
          ? undefined
          : editingLaundryBill.receivedAt,
    };

    const updated = laundryBills.map((b) => (b.id === editingLaundryBill.id ? updatedBill : b));
    persistLaundryBills(updated);
    saveLaundryBillToFirestore(updatedBill.userId || sanitizedUserKey, updatedBill, group.id);
    triggerHaptic(hapticPatterns.success);
    setEditingLaundryBill(null);
  };

  // Auto calculate: (Total Item) * (Price)
  const numItems = parseInt(laundryTotalItems, 10) || 0;
  const numPrice = parseFloat(laundryPrice) || 0;
  const calculatedLaundryTotal = numItems * numPrice;

  const handleSaveLaundry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!laundryGiveTo.trim()) {
      alert('Please enter who the laundry was given to.');
      return;
    }
    if (numItems <= 0) {
      alert('Please enter a valid Total Item count (at least 1).');
      return;
    }
    if (numPrice <= 0) {
      alert('Please enter a valid Price per item.');
      return;
    }

    const dateVal = laundryDate.trim() || new Date().toISOString().substring(0, 16).replace('T', ' ');
    const billMonth = dateVal.substring(0, 7) || currentMonthCycle;
    const assignedMember = group.members.find((m) => m.id === laundryMemberId) || loggedInMember;
    const assignedUserKey =
      assignedMember?.email ||
      assignedMember?.mobileNumber ||
      assignedMember?.name ||
      assignedMember?.id ||
      userKey;

    const newBill: LaundryBill = {
      id: `laundry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: assignedUserKey,
      groupId: group.id,
      memberId: assignedMember?.id,
      memberName: assignedMember?.name,
      date: dateVal,
      giveTo: laundryGiveTo.trim(),
      totalItems: numItems,
      pricePerItem: numPrice,
      totalAmount: calculatedLaundryTotal,
      status: 'pending',
      createdAtMs: Date.now(),
      monthCycle: billMonth,
    };

    const updated = [newBill, ...laundryBills];
    persistLaundryBills(updated);
    saveLaundryBillToFirestore(assignedUserKey, newBill, group.id);
    triggerHaptic(hapticPatterns.success);

    // Reset Form
    setLaundryGiveTo('');
    setLaundryTotalItems('');
    setLaundryPrice('');
    setShowLaundryForm(false);
    alert('Laundry bill notice added successfully!');
  };

  const handleMarkLaundryReceived = (billId: string) => {
    triggerHaptic(hapticPatterns.success);
    const targetBill = laundryBills.find((b) => b.id === billId);
    if (!targetBill) return;
    const receivedBill: LaundryBill = {
      ...targetBill,
      status: 'received',
      receivedAt: new Date().toISOString(),
    };
    const updated = laundryBills.map((b) => (b.id === billId ? receivedBill : b));
    persistLaundryBills(updated);
    saveLaundryBillToFirestore(receivedBill.userId || sanitizedUserKey, receivedBill, group.id);
  };

  const handleDeleteLaundry = (billId: string) => {
    if (!isAdmin) {
      alert('Only admin can delete laundry records.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this laundry record?')) {
      return;
    }
    triggerHaptic(hapticPatterns.click);
    const targetBill = laundryBills.find((b) => b.id === billId);
    const updated = laundryBills.filter((b) => b.id !== billId);
    persistLaundryBills(updated);
    if (targetBill) {
      deleteLaundryBillFromFirestore(targetBill.userId || sanitizedUserKey, billId, group.id);
    }
  };

  // Filtered Laundry Bills
  const filteredLaundryBills = laundryBills.filter((b) => {
    if (!isAdmin || laundryMemberFilter === 'all') return true;
    return (
      b.memberId === laundryMemberFilter ||
      b.userId === laundryMemberFilter ||
      b.memberName?.toLowerCase() ===
        group.members.find((m) => m.id === laundryMemberFilter)?.name.toLowerCase()
    );
  });

  const pendingLaundryBills = filteredLaundryBills.filter((b) => b.status === 'pending');
  const receivedLaundryBills = filteredLaundryBills.filter((b) => b.status === 'received');

  const handleToggleLaundryPayment = (bill: LaundryBill) => {
    if (bill.paymentStatus === 'paid' && !isAdmin) {
      triggerHaptic(hapticPatterns.error);
      alert('This laundry bill is marked as PAID and locked. Only an Admin user can change it back to Due.');
      return;
    }
    triggerHaptic(hapticPatterns.success);
    const nextPaymentStatus: 'due' | 'paid' = bill.paymentStatus === 'paid' ? 'due' : 'paid';
    const updatedBill: LaundryBill = {
      ...bill,
      paymentStatus: nextPaymentStatus,
      updatedAtMs: Date.now(),
    };
    const updated = laundryBills.map((b) => (b.id === bill.id ? updatedBill : b));
    persistLaundryBills(updated);
    saveLaundryBillToFirestore(bill.userId || sanitizedUserKey, updatedBill, group.id);
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Header Banner - Dark Navy Luxury Theme matching Dashboard */}
      <div
        className="rounded-3xl neu-upper text-slate-900 overflow-hidden"
      >
        {/* Top Dark Navy Header Band with centered Title & Description */}
        <div className="bg-[#07193F] text-white px-5 py-5 sm:py-6 text-center space-y-1">
          <h2 className="text-xl sm:text-2xl font-black text-white">Utilities & Rent Overview</h2>
          <p className="text-xs text-blue-200 font-medium mt-1">
            Track DEWA Electricity, WiFi Internet, LPG Gas & Landlord Rent per member
          </p>
        </div>

        {/* 4 Clean Action Buttons, Summary Stat Cards & Export PDF */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full max-w-2xl mx-auto">
            {/* 1. Add Utility */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(hapticPatterns.click);
                setShowAddForm(!showAddForm);
                if (!showAddForm) setShowLaundryForm(false);
              }}
              className={`w-full py-3 px-3 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center transition-all cursor-pointer uppercase tracking-wider shadow-md active:scale-95 text-center ${
                showAddForm
                  ? 'bg-[#07193F] hover:bg-[#051330] text-white ring-2 ring-white/40 shadow-inner'
                  : 'bg-[#0052FF] hover:bg-[#0047E0] text-white'
              }`}
            >
              <span>Add Utility</span>
            </button>

            {/* 2. Add Laundry */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(hapticPatterns.click);
                setShowLaundryForm(!showLaundryForm);
                if (!showLaundryForm) setShowAddForm(false);
              }}
              className={`w-full py-3 px-3 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center transition-all cursor-pointer uppercase tracking-wider shadow-md active:scale-95 text-center ${
                showLaundryForm
                  ? 'bg-[#07193F] hover:bg-[#051330] text-white ring-2 ring-white/40 shadow-inner'
                  : 'bg-[#0052FF] hover:bg-[#0047E0] text-white'
              }`}
            >
              <span>Add Laundry</span>
            </button>

            {/* 3. Utility Bills */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(hapticPatterns.click);
                setShowUtilityBills(!showUtilityBills);
              }}
              className={`w-full py-3 px-3 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center transition-all cursor-pointer uppercase tracking-wider shadow-md active:scale-95 text-center ${
                showUtilityBills
                  ? 'bg-[#07193F] hover:bg-[#051330] text-white ring-2 ring-white/40 shadow-inner'
                  : 'bg-[#0052FF] hover:bg-[#0047E0] text-white'
              }`}
            >
              <span>Utility Bills</span>
            </button>

            {/* 4. Room Rent */}
            <button
              type="button"
              onClick={() => {
                triggerHaptic(hapticPatterns.click);
                setShowRoomRent(!showRoomRent);
              }}
              className={`w-full py-3 px-3 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center transition-all cursor-pointer uppercase tracking-wider shadow-md active:scale-95 text-center ${
                showRoomRent
                  ? 'bg-[#07193F] hover:bg-[#051330] text-white ring-2 ring-white/40 shadow-inner'
                  : 'bg-[#0052FF] hover:bg-[#0047E0] text-white'
              }`}
            >
              <span>Room Rent</span>
            </button>
          </div>

          {/* Summary Stat Cards - Total Utility Bills & Total Room Rent (Nested inside header card) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3.5 sm:p-4 neu-lower-sm text-slate-900 rounded-2xl bg-white/70">
              <div className="flex items-center justify-between text-slate-800 mb-1">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                  Utilities
                </span>
              </div>
              <span className="text-[11px] text-slate-600 font-semibold block truncate">Total Utility Bills</span>
              <div className="mt-1">
                <DualCurrencyDisplay
                  amount={totalUtilities}
                  baseCurrency={group.currency}
                  preferredCurrency={preferredCurrency}
                  customRates={customRates}
                  layout="pill"
                  baseClassName="text-lg sm:text-xl font-black text-slate-950"
                />
              </div>
              <p className="text-[10px] text-slate-600 font-bold mt-1 flex items-baseline gap-1 truncate">
                <span>Per member:</span>
                <DualCurrencyDisplay
                  amount={perMemberUtil}
                  baseCurrency={group.currency}
                  preferredCurrency={preferredCurrency}
                  customRates={customRates}
                  layout="inline"
                  baseClassName="font-black text-slate-950"
                />
              </p>
            </div>

            <div className="p-3.5 sm:p-4 neu-lower-sm text-slate-900 rounded-2xl bg-white/70">
              <div className="flex items-center justify-between text-slate-800 mb-1">
                <HomeIcon className="w-4 h-4 text-blue-600" />
                <span className="text-[10px] font-extrabold uppercase bg-blue-100 text-blue-900 px-2 py-0.5 rounded-full">
                  Rent
                </span>
              </div>
              <span className="text-[11px] text-slate-600 font-semibold block truncate">Total Room Rent</span>
              <div className="mt-1">
                <DualCurrencyDisplay
                  amount={rent.totalRent}
                  baseCurrency={group.currency}
                  preferredCurrency={preferredCurrency}
                  customRates={customRates}
                  layout="pill"
                  baseClassName="text-lg sm:text-xl font-black text-slate-950"
                />
              </div>
              <p className="text-[10px] text-slate-600 font-bold mt-1 flex items-baseline gap-1 truncate">
                <span>Per member:</span>
                <DualCurrencyDisplay
                  amount={perMemberRent}
                  baseCurrency={group.currency}
                  preferredCurrency={preferredCurrency}
                  customRates={customRates}
                  layout="inline"
                  baseClassName="font-black text-slate-950"
                />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* INLINE ADD UTILITY BILL FORM SECTION (Renders directly on main page) */}
      {showAddForm && (
        <div className="p-5 sm:p-6 rounded-3xl neu-upper text-slate-900 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between border-b border-slate-300/60 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500 stroke-[2.5]" />
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide">
                Add Utility Bill Entry
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-900 cursor-pointer transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            {/* Bill Name Selection Box */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Bill Name / Category
              </label>
              <select
                value={newUtilNameOption}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewUtilNameOption(val);
                  if (val === 'WiFi') setNewUtilCategory('internet');
                  else if (val === 'LPG Gass') setNewUtilCategory('gas');
                  else if (val === 'Drinking Water') setNewUtilCategory('water');
                  else setNewUtilCategory('other');
                }}
                className="w-full px-4 py-2.5 neu-lower-sm rounded-xl text-sm font-bold text-slate-900 focus:outline-none cursor-pointer"
              >
                {UTILITY_NAME_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              {/* Custom name input if "Others" selected */}
              {newUtilNameOption === 'Others' && (
                <input
                  type="text"
                  required
                  placeholder="Enter custom bill name..."
                  value={customUtilName}
                  onChange={(e) => setCustomUtilName(e.target.value)}
                  className="mt-2 w-full px-4 py-2.5 neu-lower-sm rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              )}
            </div>

            {/* Bill Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-900 uppercase mb-1">
                Amount ({group.currency})
              </label>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                required
                placeholder="0.00 (e.g. 10+20+30)"
                value={newUtilAmount}
                onChange={(e) => setNewUtilAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const res = evaluateMathExpression(newUtilAmount);
                    if (res.isValid && res.calculatedValue !== null && res.hasOperator) {
                      e.preventDefault();
                      setNewUtilAmount(res.displayValue);
                    }
                  }
                }}
                onBlur={() => {
                  const res = evaluateMathExpression(newUtilAmount);
                  if (res.isValid && res.calculatedValue !== null && res.hasOperator) {
                    setNewUtilAmount(res.displayValue);
                  }
                }}
                className="w-full px-4 py-2.5 neu-lower-sm rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-none"
              />

              {/* Quick Math Symbols Strip */}
              <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-[10px] font-bold text-slate-700 uppercase shrink-0 mr-0.5 flex items-center gap-1">
                  <Calculator className="w-3 h-3 text-slate-900" />
                  Math:
                </span>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  onClick={() => setNewUtilAmount((prev) => prev + '+')}
                  className="px-2.5 py-1 neu-upper-btn active:scale-95 text-slate-900 font-black text-xs rounded-lg cursor-pointer"
                >
                  +
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  onClick={() => setNewUtilAmount((prev) => prev + '-')}
                  className="px-2.5 py-1 neu-upper-btn active:scale-95 text-slate-900 font-black text-xs rounded-lg cursor-pointer"
                >
                  -
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  onClick={() => setNewUtilAmount((prev) => prev + '*')}
                  className="px-2.5 py-1 neu-upper-btn active:scale-95 text-slate-900 font-black text-xs rounded-lg cursor-pointer"
                >
                  ×
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  onClick={() => setNewUtilAmount((prev) => prev + '/')}
                  className="px-2.5 py-1 neu-upper-btn active:scale-95 text-slate-900 font-black text-xs rounded-lg cursor-pointer"
                >
                  ÷
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onTouchStart={(e) => e.preventDefault()}
                  onClick={() => {
                    const res = evaluateMathExpression(newUtilAmount);
                    if (res.isValid && res.calculatedValue !== null) {
                      setNewUtilAmount(res.displayValue);
                    }
                  }}
                  className="px-2.5 py-1 bg-black hover:bg-slate-800 active:scale-95 text-white font-black text-xs rounded-lg shadow-sm cursor-pointer ml-auto"
                >
                  =
                </button>
              </div>
            </div>

            {/* Paid By Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-900 uppercase">
                  Paid By
                </label>
                {isAdmin ? (
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Admin Unlocked
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                    Locked
                  </span>
                )}
              </div>
              <select
                value={newUtilPayer}
                onChange={(e) => setNewUtilPayer(e.target.value)}
                disabled={!isAdmin}
                className="w-full px-4 py-2.5 neu-lower-sm rounded-xl text-sm font-semibold text-slate-900 focus:outline-none cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isAdmin ? (
                  group.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.phone || m.mobileNumber || m.email || 'Member'})
                    </option>
                  ))
                ) : loggedInMember ? (
                  <option value={loggedInMember.id}>
                    {loggedInMember.name} (Your Account)
                  </option>
                ) : (
                  group.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Shared With Option (Multi-Select Member Checkboxes) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-900 uppercase">
                  Shared With ({newUtilSharedWith.length} of {group.members.length} members)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (newUtilSharedWith.length === group.members.length) {
                      setNewUtilSharedWith([]);
                    } else {
                      setNewUtilSharedWith(group.members.map((m) => m.id));
                    }
                  }}
                  className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                >
                  {newUtilSharedWith.length === group.members.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 neu-lower-sm p-3 rounded-2xl max-h-48 overflow-y-auto">
                {group.members.map((m) => {
                  const isSelected = newUtilSharedWith.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                        isSelected
                          ? 'neu-upper-sm text-emerald-950 font-bold'
                          : 'bg-transparent text-slate-400 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setNewUtilSharedWith(newUtilSharedWith.filter((id) => id !== m.id));
                          } else {
                            setNewUtilSharedWith([...newUtilSharedWith, m.id]);
                          }
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                      />
                      <MemberAvatar
                        name={m.name}
                        avatar={m.avatar}
                        size="xs"
                        className="w-5 h-5 text-[9px] shrink-0"
                      />
                      <span className="truncate">{m.name}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-medium">
                * Selected members will share this bill amount equally. Unselected members are excluded.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="w-1/2 py-3 rounded-xl neu-upper-btn text-xs font-bold text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-3 rounded-[24px] bg-black hover:bg-slate-800 text-white text-xs font-black shadow-md cursor-pointer uppercase tracking-wider"
              >
                Save Utility Bill
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LAUNDRY BILL ENTRY FORM */}
      {showLaundryForm && (
        <div className="p-5 sm:p-6 neu-upper rounded-3xl text-slate-900 border-2 border-rose-200 bg-rose-50/40">
          <div className="flex items-center justify-between border-b border-rose-200 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-rose-500 text-white rounded-xl">
                <Shirt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950 uppercase tracking-wide">
                  Add Laundry Bill Notice
                </h3>
                <p className="text-[11px] text-slate-600 font-medium">
                  {isAdmin
                    ? 'Admin entry • Record laundry notice for any member'
                    : `Personal record • Logged for ${loggedInMember?.name || 'You'}`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowLaundryForm(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveLaundry} className="space-y-4">
            {/* If Admin, allow selecting member */}
            {isAdmin && group.members.length > 0 && (
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-rose-600" />
                  Select Member (Room Resident)
                </label>
                <select
                  value={laundryMemberId}
                  onChange={(e) => setLaundryMemberId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl neu-lower-sm text-slate-900 text-xs font-bold focus:outline-none bg-white cursor-pointer"
                >
                  {group.members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.phone ? `(${m.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Date */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-rose-600" />
                  Date
                </label>
                <input
                  type="text"
                  value={laundryDate}
                  onChange={(e) => setLaundryDate(e.target.value)}
                  placeholder="YYYY-MM-DD HH:mm"
                  className="w-full px-3.5 py-2.5 rounded-2xl neu-lower-sm text-slate-900 text-xs font-bold focus:outline-none"
                  required
                />
              </div>

              {/* Give To */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  Give To
                </label>
                <input
                  type="text"
                  value={laundryGiveTo}
                  onChange={(e) => setLaundryGiveTo(e.target.value)}
                  placeholder="e.g. Al Madina Laundry / Kazi Mahadi"
                  className="w-full px-3.5 py-2.5 rounded-2xl neu-lower-sm text-slate-900 text-xs font-bold focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Total Item, Price, Total Amount in ONE row / line with same alignment */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3.5 items-end">
              {/* Total Item */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  Total Item
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={laundryTotalItems}
                  onChange={(e) => setLaundryTotalItems(e.target.value)}
                  placeholder="e.g. 4"
                  className="w-full px-3.5 py-2.5 rounded-2xl neu-lower-sm text-slate-900 text-xs font-bold focus:outline-none font-mono"
                  required
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  Price
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={laundryPrice}
                  onChange={(e) => setLaundryPrice(e.target.value)}
                  placeholder="e.g. 2.00"
                  className="w-full px-3.5 py-2.5 rounded-2xl neu-lower-sm text-slate-900 text-xs font-bold focus:outline-none font-mono"
                  required
                />
              </div>

              {/* Total Amount */}
              <div>
                <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5">
                  Total Amount
                </label>
                <div className="w-full px-3.5 py-2.5 rounded-2xl neu-lower-sm bg-white/70 text-slate-950 text-xs sm:text-sm font-black flex items-center justify-between h-[38px] border border-slate-200">
                  <span className="font-mono">{formatAmountNumber(calculatedLaundryTotal)}</span>
                  <span className="text-[10px] text-slate-500 font-bold ml-1">{group.currency || 'AED'}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLaundryForm(false)}
                className="w-1/2 py-3 rounded-xl neu-upper-btn text-xs font-bold text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-1/2 py-3 rounded-[24px] bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-xs font-black shadow-md cursor-pointer uppercase tracking-wider active:scale-98"
              >
                SAVE
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PENDING LAUNDRY NOTICE CARDS (Based on attached IMG_8304.jpeg) */}
      {pendingLaundryBills.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <h3 className="text-sm font-black text-rose-600 uppercase tracking-wide">
              Laundry Pending ({pendingLaundryBills.length})
            </h3>
          </div>

          <div className="space-y-3">
            {pendingLaundryBills.map((bill) => {
              const memberName =
                bill.memberName ||
                group.members.find((m) => m.id === bill.memberId || m.id === bill.userId)?.name ||
                'Member';
              const memberObj = group.members.find(
                (m) => m.id === bill.memberId || m.id === bill.userId || m.name.toLowerCase() === memberName.toLowerCase()
              );

              return (
                <div
                  key={bill.id}
                  className="border-2 border-rose-300 rounded-3xl p-4 sm:p-5 neu-upper bg-white/70 space-y-3 text-slate-900 shadow-sm"
                >
                  {/* Top Row: Badge + Member + Given To */}
                  <div className="flex items-center justify-between gap-2 border-b border-rose-100 pb-2.5 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-rose-600 text-white font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider shadow-xs">
                        PENDING LAUNDRY NOTICE
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold shadow-xs">
                        <MemberAvatar name={memberName} avatar={memberObj?.avatar} size="xs" className="w-3.5 h-3.5 text-[8px]" />
                        <span>{memberName}</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Give To: </span>
                      <span className="font-black text-slate-950 underline decoration-1 text-xs sm:text-sm">
                        {bill.giveTo}
                      </span>
                    </div>
                  </div>

                  {/* Middle Row: Total Cost + Items breakdown */}
                  <div className="flex items-baseline justify-between py-1">
                    <div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                        Total Cost
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-slate-950 underline decoration-2">
                        {formatAmountNumber(bill.totalAmount)} {group.currency || 'AED'}
                      </span>
                    </div>
                    <div className="text-right space-y-0.5 text-xs font-bold text-slate-700">
                      <div>
                        <span className="text-slate-500 text-[11px]">Items: </span>
                        <span className="font-black text-slate-900">{bill.totalItems} pcs</span>
                        <span className="text-slate-500 text-[10px]"> (@ {formatAmountNumber(bill.pricePerItem)} {group.currency || 'AED'})</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        <span>Date: </span>
                        <span className="font-semibold text-slate-800">{formatDateDisplay(bill.date)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Row */}
                  <div className="pt-2 border-t border-slate-200/80 flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={() => handleMarkLaundryReceived(bill.id)}
                      className="flex-1 py-2.5 rounded-2xl neu-upper-sm hover:neu-lower-sm font-black text-xs text-slate-900 flex items-center justify-center gap-2 border border-slate-300 transition-all cursor-pointer active:scale-98"
                    >
                      <Clock className="w-4 h-4 text-slate-800" />
                      <span>Received Item</span>
                    </button>

                    {/* Admin Only: Edit & Delete for Pending Laundry Notice */}
                    {isAdmin && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStartEditLaundry(bill)}
                          className="py-2.5 px-3 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer transition-all active:scale-95 flex items-center gap-1 text-xs font-bold shadow-xs"
                          title="Edit Laundry Notice (Admin Only)"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLaundry(bill.id)}
                          className="py-2.5 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 cursor-pointer transition-all active:scale-95 flex items-center gap-1 text-xs font-bold shadow-xs"
                          title="Delete Laundry Notice (Admin Only)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* LAUNDRY PREVIOUS RECORDS SECTION (Shows all received laundry history & summary table) */}
      {(receivedLaundryBills.length > 0 || isAdmin) && (
        <div className="p-3.5 sm:p-6 neu-upper rounded-3xl text-slate-900 space-y-3.5 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-300/60 pb-3 gap-1.5">
            <div className="flex items-center gap-2">
              <Shirt className="w-5 h-5 text-slate-900" />
              <h3 className="text-xs sm:text-base font-black text-slate-900 uppercase tracking-wide">
                Laundry Previous Records ({receivedLaundryBills.length})
              </h3>
            </div>
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Completed & received laundry delivery logs
            </span>
          </div>

          {/* Admin Member Filter Pills (flex-wrap so no swiping needed) */}
          {isAdmin && group.members.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="text-[10px] sm:text-[11px] font-black uppercase text-slate-500 mr-0.5 shrink-0">
                Filter:
              </span>
              <button
                type="button"
                onClick={() => setLaundryMemberFilter('all')}
                className={`px-2.5 py-1 rounded-xl text-[11px] sm:text-xs font-black transition-all cursor-pointer ${
                  laundryMemberFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All ({laundryBills.filter((b) => b.status === 'received').length})
              </button>
              {group.members.map((m) => {
                const count = laundryBills.filter(
                  (b) =>
                    b.status === 'received' &&
                    (b.memberId === m.id ||
                      b.userId === m.id ||
                      b.memberName?.toLowerCase() === m.name.toLowerCase())
                ).length;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setLaundryMemberFilter(m.id)}
                    className={`px-2 py-1 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      laundryMemberFilter === m.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <MemberAvatar name={m.name} avatar={m.avatar} size="xs" className="w-3.5 h-3.5 text-[8px]" />
                    <span>{m.name}</span>
                    <span className="text-[9px] opacity-80">({count})</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Summary Stat Strip */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2.5 neu-lower-sm p-2.5 sm:p-4 rounded-2xl text-center">
            <div className="p-1">
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5 sm:mb-1">
                Deliveries
              </span>
              <span className="text-sm sm:text-xl font-black text-slate-950">
                {receivedLaundryBills.length}
              </span>
            </div>
            <div className="p-1">
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5 sm:mb-1">
                Items Washed
              </span>
              <span className="text-sm sm:text-xl font-black text-slate-950">
                {receivedLaundryBills.reduce((sum, b) => sum + b.totalItems, 0)} <span className="text-[10px] font-bold">pcs</span>
              </span>
            </div>
            <div className="p-1">
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-0.5 sm:mb-1">
                Total Spent
              </span>
              <span className="text-sm sm:text-xl font-black text-slate-950">
                {formatAmountNumber(receivedLaundryBills.reduce((sum, b) => sum + b.totalAmount, 0))} <span className="text-[10px] font-bold">{group.currency || 'AED'}</span>
              </span>
            </div>
          </div>

          {/* Laundry Records Table - 100% Screen Fitted, No Horizontal Swiping */}
          {receivedLaundryBills.length > 0 ? (
            <div className="w-full neu-lower-sm rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs text-slate-900 border-collapse">
                <thead>
                  <tr className="border-b border-slate-300 text-[9px] sm:text-[11px] font-black uppercase text-slate-700 bg-slate-100/70">
                    <th className="py-2.5 px-1.5 sm:px-3 text-left">Date</th>
                    <th className="py-2.5 px-1.5 sm:px-3 text-left">Given To</th>
                    <th className="py-2.5 px-1 sm:px-2 text-center">Items</th>
                    <th className="py-2.5 px-1 sm:px-2 text-center">Price</th>
                    <th className="py-2.5 px-1.5 sm:px-3 text-center sm:text-right">Total</th>
                    <th className="py-2.5 px-1 sm:px-2 text-center">Status</th>
                    {isAdmin && <th className="py-2.5 px-1 sm:px-2 text-center">Act</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/80">
                  {receivedLaundryBills.map((bill) => {
                    const memberName =
                      bill.memberName ||
                      group.members.find((m) => m.id === bill.memberId || m.id === bill.userId)?.name ||
                      'Member';
                    const memberObj = group.members.find(
                      (m) =>
                        m.id === bill.memberId ||
                        m.id === bill.userId ||
                        m.name.toLowerCase() === memberName.toLowerCase()
                    );

                    const isPaid = bill.paymentStatus === 'paid';

                    return (
                      <tr key={bill.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Date column with compact Recv subtext */}
                        <td className="py-2 sm:py-3 px-1.5 sm:px-3 align-middle">
                          <div className="font-black text-slate-950 text-[10px] sm:text-xs leading-tight">
                            {formatDateDisplay(bill.date.split(' ')[0])}
                          </div>
                          {bill.receivedAt ? (
                            <div className="text-[8px] sm:text-[10px] text-emerald-700 font-bold leading-tight mt-0.5">
                              Recv: {formatDateDisplay(new Date(bill.receivedAt).toISOString().split('T')[0])}
                            </div>
                          ) : (
                            <div className="text-[8px] sm:text-[10px] text-slate-500 font-medium leading-tight mt-0.5">
                              Recv: Yes
                            </div>
                          )}
                        </td>

                        {/* Given To with Member tag for Admin */}
                        <td className="py-2 sm:py-3 px-1.5 sm:px-3 align-middle">
                          <div className="font-black text-slate-950 text-[10px] sm:text-xs leading-tight break-words max-w-[85px] sm:max-w-none">
                            {bill.giveTo}
                          </div>
                          {isAdmin && (
                            <div className="mt-0.5 inline-flex items-center gap-1 px-1 py-0.5 rounded bg-slate-100 border border-slate-200 text-[8px] sm:text-[10px] text-slate-700 font-bold max-w-full">
                              <MemberAvatar name={memberName} avatar={memberObj?.avatar} size="xs" className="w-3 h-3 text-[7px] shrink-0" />
                              <span className="truncate max-w-[55px] sm:max-w-none">{memberName}</span>
                            </div>
                          )}
                        </td>

                        {/* Items */}
                        <td className="py-2 sm:py-3 px-1 sm:px-2 text-center align-middle">
                          <div className="font-black text-slate-950 text-[10px] sm:text-xs">{bill.totalItems}</div>
                          <div className="text-[8px] sm:text-[10px] font-bold text-slate-500">pcs</div>
                        </td>

                        {/* Price */}
                        <td className="py-2 sm:py-3 px-1 sm:px-2 text-center align-middle font-mono">
                          <div className="font-black text-slate-950 text-[10px] sm:text-xs">{formatAmountNumber(bill.pricePerItem)}</div>
                          <div className="text-[8px] sm:text-[10px] font-bold text-slate-500">{group.currency || 'AED'}</div>
                        </td>

                        {/* Total */}
                        <td className="py-2 sm:py-3 px-1.5 sm:px-3 text-center sm:text-right align-middle font-mono">
                          <div className="font-black text-slate-950 text-[10px] sm:text-xs">{formatAmountNumber(bill.totalAmount)}</div>
                          <div className="text-[8px] sm:text-[10px] font-bold text-slate-500">{group.currency || 'AED'}</div>
                        </td>

                        {/* Due/Paid Interactive Toggle Button (Red for Due, Green for Paid - Locked for members when Paid) */}
                        <td className="py-2 sm:py-3 px-1 sm:px-2 text-center align-middle">
                          <button
                            type="button"
                            disabled={isPaid && !isAdmin}
                            onClick={() => handleToggleLaundryPayment(bill)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider shadow-xs transition-all inline-flex items-center justify-center gap-1 ${
                              isPaid
                                ? isAdmin
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95'
                                  : 'bg-emerald-700/90 text-white cursor-not-allowed opacity-90'
                                : 'bg-rose-500 hover:bg-rose-600 text-white cursor-pointer active:scale-95'
                            }`}
                            title={
                              isPaid
                                ? isAdmin
                                  ? 'Paid (Admin: Click to unlock & change to Due)'
                                  : 'Paid (Locked - Only Admin can change back to Due)'
                                : 'Due (Click to mark as Paid)'
                            }
                          >
                            {isPaid ? (
                              <>
                                {isAdmin ? (
                                  <Check className="w-3 h-3 stroke-[3]" />
                                ) : (
                                  <Lock className="w-3 h-3 stroke-[2.5]" />
                                )}
                                <span>Paid</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 stroke-[3]" />
                                <span>Due</span>
                              </>
                            )}
                          </button>
                        </td>

                        {/* Action column (Admin Only: Edit & Delete) */}
                        {isAdmin && (
                          <td className="py-2 sm:py-3 px-0.5 sm:px-1.5 text-center align-middle">
                            <div className="flex items-center justify-center gap-0.5 sm:gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditLaundry(bill)}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md cursor-pointer transition-colors"
                                title="Edit laundry record"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteLaundry(bill.id)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md cursor-pointer transition-colors"
                                title="Delete laundry record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="neu-lower-sm p-6 rounded-2xl text-center text-slate-500 text-xs font-bold">
              No completed laundry records found for the selected view.
            </div>
          )}
        </div>
      )}

      {/* SECTION 1: Utility Bills List (Toggled by Utility Bills button) */}
      {showUtilityBills && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-slate-900" />
              Active Utility Bills ({utilities.length})
            </h3>
            <span className="text-xs text-slate-600">Tracked & split per member inclusion</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {utilities.map((util) => {
              const payer = group.members.find((m) => m.id === util.paidById);
              const isPaid = util.status === 'paid';
              const isAdmin = currentUser?.role === 'admin';
              const isPayer = loggedInMember?.id === util.paidById;
              const canToggle = isAdmin || isPayer;
              const canDelete = isAdmin || isPayer;

              const sharedWithIds = util.sharedWithIds && util.sharedWithIds.length > 0
                ? util.sharedWithIds
                : group.members.map((m) => m.id);
              const sharedMembers = group.members.filter((m) => sharedWithIds.includes(m.id));
              const perMemberUtilCost = util.amount / (sharedWithIds.length || 1);

              return (
                <div
                  key={util.id}
                  className="neu-upper rounded-3xl p-4 transition-all flex flex-col justify-between text-slate-900"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{util.name}</h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Due: {formatDateDisplay(util.dueDate)} • Paid by{' '}
                          <strong className="text-slate-950">{payer?.name || util.paidById}</strong>
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          if (canToggle) {
                            onUpdateUtilityStatus(util.id, isPaid ? 'pending' : 'paid');
                          }
                        }}
                        disabled={!canToggle}
                        title={!canToggle ? 'Only bill creator or App Admin can toggle bill status' : ''}
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full transition-all ${
                          isPaid
                            ? 'bg-black text-white'
                            : 'neu-upper-sm text-slate-900'
                        } ${!canToggle ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {isPaid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        <span>{isPaid ? 'Paid' : 'Pending'}</span>
                      </button>
                    </div>

                    <div className="neu-lower-sm rounded-2xl p-3 flex items-center justify-between mt-3">
                      <span className="text-xs font-semibold text-slate-700">Total Bill Amount</span>
                      <span className="text-lg font-black text-slate-950">{formatAmountNumber(util.amount)} AED</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-300/60 space-y-1.5 text-xs text-slate-700">
                    <div className="flex items-center justify-between">
                      <span>Shared cost per member ({sharedWithIds.length}):</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-950">
                          {formatAmountNumber(perMemberUtilCost)} AED
                        </span>
                        {onDeleteUtility && canDelete && (
                          <div>
                            {deleteConfirmUtilId === util.id ? (
                              <div className="flex items-center gap-1 p-1 rounded-xl neu-upper-sm shadow-md">
                                <span className="text-[10px] text-slate-900 font-bold px-1">Delete?</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onDeleteUtility(util.id);
                                    setDeleteConfirmUtilId(null);
                                  }}
                                  className="px-2 py-0.5 bg-black text-white font-black text-[10px] rounded-lg cursor-pointer"
                                >
                                  Yes
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirmUtilId(null)}
                                  className="px-1.5 py-0.5 neu-upper-sm text-slate-900 font-bold text-[10px] rounded-lg cursor-pointer"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmUtilId(util.id)}
                                className="p-1 text-slate-900 neu-upper-sm rounded-lg transition-all flex items-center gap-1 cursor-pointer font-bold text-[10px]"
                                title="Delete utility bill"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-slate-900" />
                                <span>Delete</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Shared With Badge Pills */}
                    <div className="text-[11px] font-medium text-slate-600 flex items-center gap-1 flex-wrap">
                      <span className="font-bold text-slate-800">Shared with:</span>
                      {sharedMembers.length === group.members.length ? (
                        <span className="neu-upper-sm text-slate-800 font-bold px-2 py-0.5 rounded">
                          All Members
                        </span>
                      ) : (
                        sharedMembers.map((m) => (
                          <span key={m.id} className="bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded">
                            {m.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 2: Room Rent Contribution Card (Toggled by Room Rent button) */}
      {showRoomRent && (
        <div className="p-5 neu-upper text-slate-900 rounded-3xl space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-300/60 pb-3 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center font-bold shrink-0">
                <HomeIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Landlord Monthly Rent</h3>
                <p className="text-xs text-slate-600">
                  Main Landlord Payment by:{' '}
                  <strong className="text-slate-950">
                    {group.members.find((m) => m.id === rent.paidById)?.name || rent.paidById}
                  </strong>
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-1.5">
              <button
                type="button"
                onClick={handleToggleRentToLandlord}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-1.5 active:scale-95 ${
                  isRentPaidLocked
                    ? 'bg-emerald-700 text-white hover:bg-emerald-800'
                    : isRentPaidToLandlord
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-rose-600 text-white hover:bg-rose-700'
                }`}
                title={
                  isRentPaidLocked
                    ? `Rent paid & locked for ${currentMonthCycle}. Automatically unlocks on 1st of next month.`
                    : 'Click to mark Rent as Paid to Landlord and lock for this month'
                }
              >
                {isRentPaidLocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Rent Paid to Landlord</span>
                  </>
                ) : isRentPaidToLandlord ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Rent Paid to Landlord</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Rent Pending (Click to Pay)</span>
                  </>
                )}
              </button>

              {isRentPaidLocked ? (
                <span className="text-[10px] font-black text-emerald-900 bg-emerald-100/90 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 self-start sm:self-auto shadow-2xs">
                  <Lock className="w-2.5 h-2.5" /> Locked for this month • Unlocks 1st next month
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-500 self-start sm:self-auto">
                  Click once to pay & lock for current month
                </span>
              )}
            </div>
          </div>

          {/* Total Rent Input Field & Per-Member Share Calculation */}
          <div className="neu-lower-sm p-4 rounded-2xl space-y-3">
            {/* Top Row: Label, Lock/Unlock Button on right side of text & Status Badge */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
                  Total Rent Amount ({group.currency || 'AED'})
                </label>

                {/* Lock / Unlock Toggle Button placed on the right side of Total Rent Amount text */}
                {isRentInputLocked ? (
                  <button
                    type="button"
                    onClick={handleUnlockRent}
                    disabled={!isAdmin}
                    className={`px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1 shrink-0 ${
                      isAdmin
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-500 cursor-pointer shadow-2xs active:scale-95'
                        : 'neu-lower-sm text-slate-500 cursor-not-allowed'
                    }`}
                    title={isAdmin ? 'Click to Unlock Rent' : 'Only Admin can unlock'}
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>{isAdmin ? 'Unlock' : 'Locked'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLockRent}
                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-lg flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs active:scale-95 transition-all"
                    title="Lock Rent Amount for this Month"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>LOCK</span>
                  </button>
                )}

                {isRentInputLocked ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full shadow-2xs">
                    Locked for {rent.cycle || currentMonthCycle}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-white/80 px-2 py-0.5 rounded-full">
                    Type amount and click LOCK
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Row: Room rent amount box and Each member share box side-by-side in 1 line */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {/* Box 1: Room rent amount box */}
              <div className="p-3 neu-upper-sm rounded-xl flex flex-col justify-between">
                <span className="text-[10px] text-slate-600 font-extrabold uppercase block mb-1">
                  Room Rent Amount
                </span>
                <div className="flex items-center">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={totalRentInput}
                    onChange={handleRentInputChange}
                    disabled={isRentInputLocked}
                    placeholder="e.g. 3500"
                    className={`w-full neu-lower-sm rounded-lg px-2.5 py-1.5 text-sm sm:text-base font-black text-slate-900 focus:outline-none ${
                      isRentInputLocked ? 'text-slate-700 cursor-not-allowed opacity-90' : ''
                    }`}
                  />
                  <span className="ml-2 text-xs font-black text-slate-700 shrink-0">AED</span>
                </div>
              </div>

              {/* Box 2: Each member share box */}
              <div className="p-3 neu-upper-sm rounded-xl flex flex-col justify-between text-right">
                <span className="text-[10px] text-slate-600 font-extrabold uppercase block mb-1">
                  Each Member Share
                </span>
                <span className="text-sm sm:text-base font-black text-slate-950 block">
                  {currentMemberRentShare.toFixed(2)} AED
                </span>
                <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                  ({rentParticipatingCount} members {tempMembersCount > 0 ? `+ ${tempMembersCount} temp` : ''})
                </span>
              </div>
            </div>
          </div>

          {/* Temporary Member Box */}
          <div className="p-3 neu-lower-sm rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Temporary Member ({tempMembers.length})
              </span>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowAddTempInput(!showAddTempInput)}
                  className="px-2.5 py-1 bg-black text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Temp. Member</span>
                </button>
              )}
            </div>

            {/* Inline Add Temporary Member Input Form */}
            {isAdmin && showAddTempInput && (
              <div className="p-2.5 neu-upper-sm rounded-xl flex items-center gap-2 animate-in fade-in">
                <input
                  type="text"
                  placeholder="e.g. Guest Roommate (Rahat)"
                  value={newTempName}
                  onChange={(e) => setNewTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTempMember();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 neu-lower-sm rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTempMember}
                  className="px-3 py-1.5 bg-black text-white text-xs font-black rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewTempName('');
                    setShowAddTempInput(false);
                  }}
                  className="px-2.5 py-1.5 neu-upper-btn text-slate-800 text-xs font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* List of active temporary members */}
            {tempMembers.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {tempMembers.map((name, idx) => (
                  <div
                    key={`temp-${idx}`}
                    className="neu-upper-sm px-3 py-1 rounded-xl text-xs font-black text-slate-900 flex items-center gap-2"
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                    <span>{name} (Temp)</span>
                    <span className="text-[10px] text-slate-500 font-normal">({formatAmountNumber(currentMemberRentShare)} AED)</span>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTempMember(idx)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 ml-1 cursor-pointer"
                        title="Remove temporary member"
                      >
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">No temporary members added for this cycle.</p>
            )}
          </div>

          {/* Member rent status list with checkboxes */}
          <div>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Member Rent Payment Status ({formatAmountNumber(currentMemberRentShare)} AED / person)
              </h4>
              <span className="text-[10px] text-slate-600 font-bold neu-upper-sm px-2.5 py-0.5 rounded-full">
                1-Time Lock per month • Auto-resets on 1st of next month
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {group.members.map((member) => {
                const isPaid = paidRentMembers.includes(member.id);
                const isUntickDisabled = isPaid && !isAdmin;

                return (
                  <div
                    key={member.id}
                    className={`p-3 rounded-2xl flex items-center justify-between text-xs font-semibold transition-all ${
                      isPaid
                        ? 'bg-emerald-100 text-emerald-950 neu-upper-sm'
                        : 'neu-upper-sm text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isPaid}
                        disabled={isUntickDisabled}
                        onChange={() => toggleMemberRentPaid(member.id)}
                        className={`w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 accent-emerald-600 ${
                          isUntickDisabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'
                        }`}
                        title={
                          isUntickDisabled
                            ? 'Payment status locked for current month. Resets on 1st of next month.'
                            : 'Click to mark rent paid'
                        }
                      />
                      <MemberAvatar
                        name={member.name}
                        avatar={member.avatar}
                        size="xs"
                        className="w-6 h-6 text-[10px] shrink-0"
                      />
                      <span className="truncate max-w-[90px]">{member.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-mono">
                        {formatAmountNumber(currentMemberRentShare)} AED
                      </span>
                      <span className="text-xs font-extrabold flex items-center gap-1">
                        {isPaid ? (
                          <>
                            <span className="text-emerald-700">Paid</span>
                            {isUntickDisabled ? (
                              <span title="Locked for current month">🔒</span>
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            )}
                          </>
                        ) : (
                          'Pending'
                        )}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN LAUNDRY EDIT MODAL */}
      {isAdmin && editingLaundryBill && (
        <div className="fixed inset-0 z-[160] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white text-slate-900 rounded-3xl p-6 w-full max-w-md border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900">
                    Edit Laundry Record
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Admin override for laundry notice & billing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingLaundryBill(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditLaundry} className="space-y-4">
              {/* Member Selector */}
              {group.members.length > 0 && (
                <div>
                  <label className="text-xs font-black uppercase text-slate-700 block mb-1">
                    Member (Room Resident)
                  </label>
                  <select
                    value={editLaundryMemberId}
                    onChange={(e) => setEditLaundryMemberId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm font-bold bg-white cursor-pointer"
                  >
                    {group.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.phone ? `(${m.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-black uppercase text-slate-700 block mb-1">
                  Given To (Laundry Name / Person)
                </label>
                <input
                  type="text"
                  value={editLaundryGiveTo}
                  onChange={(e) => setEditLaundryGiveTo(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                  placeholder="e.g. Al Madina Laundry"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black uppercase text-slate-700 block mb-1">
                    Total Items (pcs)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editLaundryTotalItems}
                    onChange={(e) => setEditLaundryTotalItems(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-700 block mb-1">
                    Price / Item ({group.currency || 'AED'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={editLaundryPrice}
                    onChange={(e) => setEditLaundryPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                    required
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Calculated Total:</span>
                <span className="text-base font-black text-blue-900 font-mono">
                  {((parseInt(editLaundryTotalItems, 10) || 0) * (parseFloat(editLaundryPrice) || 0)).toFixed(2)}{' '}
                  {group.currency || 'AED'}
                </span>
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-700 block mb-1">
                  Date / Time
                </label>
                <input
                  type="text"
                  value={editLaundryDate}
                  onChange={(e) => setEditLaundryDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 text-xs font-bold font-mono"
                  placeholder="YYYY-MM-DD HH:mm"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-700 block mb-1">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditLaundryStatus('pending')}
                    className={`py-2 rounded-xl text-xs font-black uppercase transition-all border cursor-pointer ${
                      editLaundryStatus === 'pending'
                        ? 'bg-rose-100 text-rose-800 border-rose-300 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    Pending
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditLaundryStatus('received')}
                    className={`py-2 rounded-xl text-xs font-black uppercase transition-all border cursor-pointer ${
                      editLaundryStatus === 'received'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    Received
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingLaundryBill(null)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-xs cursor-pointer transition-all shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
