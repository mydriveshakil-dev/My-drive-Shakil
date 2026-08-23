import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  onSnapshot,
  query,
  where,
  deleteDoc,
  addDoc,
  disableNetwork,
  enableNetwork,
  setLogLevel,
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Group, Expense, UtilityBill, RentContribution, ChatMessage, UserAuthProfile, PayToTransaction, LaundryBill } from '../types';

// Silence verbose internal backoff logging on quota limits
try {
  setLogLevel('silent');
} catch (e) {}

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with specific databaseId if provided
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Auth & Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export { onAuthStateChanged, signOut };

const QUOTA_EXCEEDED_KEY = 'firestore_quota_limit_exceeded_until';

function checkStoredQuotaStatus(): boolean {
  try {
    const until = sessionStorage.getItem(QUOTA_EXCEEDED_KEY) || localStorage.getItem(QUOTA_EXCEEDED_KEY);
    if (until && Number(until) > Date.now()) {
      return true;
    }
  } catch (e) {}
  return false;
}

let isQuotaExceeded = checkStoredQuotaStatus();

export async function pauseFirestoreNetwork() {
  try {
    await disableNetwork(db);
  } catch (e) {}
}

export async function resumeFirestoreNetwork() {
  try {
    await enableNetwork(db);
  } catch (e) {}
}

if (isQuotaExceeded) {
  pauseFirestoreNetwork();
}

export function getIsQuotaExceeded(): boolean {
  if (isQuotaExceeded) {
    // Check if expired
    const until = sessionStorage.getItem(QUOTA_EXCEEDED_KEY) || localStorage.getItem(QUOTA_EXCEEDED_KEY);
    if (until && Number(until) <= Date.now()) {
      isQuotaExceeded = false;
      try {
        sessionStorage.removeItem(QUOTA_EXCEEDED_KEY);
        localStorage.removeItem(QUOTA_EXCEEDED_KEY);
      } catch (e) {}
      resumeFirestoreNetwork();
    }
  }
  return isQuotaExceeded;
}

export function markQuotaExceeded() {
  isQuotaExceeded = true;
  try {
    const until = Date.now() + 60 * 60 * 1000; // 1 hour pause before re-testing Firestore quotas
    sessionStorage.setItem(QUOTA_EXCEEDED_KEY, String(until));
    localStorage.setItem(QUOTA_EXCEEDED_KEY, String(until));
  } catch (e) {}
  pauseFirestoreNetwork();
}

export function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (
    msg.includes('resource-exhausted') ||
    msg.includes('Quota limit exceeded') ||
    msg.includes('Free daily write units') ||
    msg.includes('Free daily read units') ||
    (err as any)?.code === 'resource-exhausted'
  ) {
    if (!isQuotaExceeded) {
      markQuotaExceeded();
      console.warn('Firestore Quota Limit Exceeded: Application running in resilient Local Storage mode.');
    }
    return true;
  }
  return false;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Firestore Realtime listeners and persistence helpers

// 0. Sync All Groups Across Devices
export function subscribeToAllGroups(onUpdate: (groups: Group[]) => void) {
  if (isQuotaExceeded) return () => {};
  try {
    const groupsRef = collection(db, 'groups');
    return onSnapshot(
      groupsRef,
      (snapshot) => {
        const items: Group[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...docSnap.data(), id: docSnap.id } as Group);
        });
        if (items.length > 0) {
          onUpdate(items);
        }
      },
      (err) => {
        if (!isQuotaError(err)) {
          console.warn('Firestore all groups listener warning:', err);
        }
      }
    );
  } catch (e) {
    isQuotaError(e);
    return () => {};
  }
}

function removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
  const cleanObj: Record<string, any> = { ...obj };
  Object.keys(cleanObj).forEach((key) => {
    if (cleanObj[key] === undefined) {
      delete cleanObj[key];
    }
  });
  return cleanObj as T;
}

export function cleanPhoneDigits(p?: string): string {
  if (!p) return '';
  return p.replace(/\D/g, '');
}

export function isPhoneMatch(p1?: string, p2?: string): boolean {
  if (!p1 || !p2) return false;
  const s1 = p1.trim().toLowerCase();
  const s2 = p2.trim().toLowerCase();
  if (!s1 || !s2) return false;
  if (s1 === s2) return true;

  const c1 = cleanPhoneDigits(p1);
  const c2 = cleanPhoneDigits(p2);
  if (!c1 || !c2) return false;
  if (c1 === c2) return true;

  if (c1.includes(c2) || c2.includes(c1)) return true;

  const minLen = Math.min(c1.length, c2.length);
  if (minLen >= 3) {
    if (c1.endsWith(c2.slice(-minLen)) || c2.endsWith(c1.slice(-minLen))) {
      return true;
    }
  }
  return false;
}

// User Profiles Cloud Sync for Multi-Device Login
export async function saveUserProfileToFirestore(profile: UserAuthProfile) {
  if (isQuotaExceeded) return;
  try {
    const rawMob = profile.mobileNumber || profile.email || '';
    const cleanDigits = cleanPhoneDigits(rawMob);
    const cleanDocId = rawMob ? rawMob.replace(/[^a-zA-Z0-9_\-]/g, '_') : 'user';

    let localFormat = cleanDigits;
    if (cleanDigits.startsWith('9715') && cleanDigits.length >= 12) {
      localFormat = '0' + cleanDigits.slice(3);
    } else if (cleanDigits.startsWith('5') && cleanDigits.length === 9) {
      localFormat = '0' + cleanDigits;
    }

    const payload = removeUndefinedFields({
      ...profile,
      cleanMobile: cleanDigits,
      localMobile: localFormat,
      updatedAt: new Date().toISOString(),
    });

    const userRef = doc(db, 'users', cleanDocId);
    await setDoc(userRef, payload, { merge: true });

    // Also sync updated avatar/name into any group members in Firestore
    if (profile.avatar !== undefined || profile.name) {
      try {
        const groupsRef = collection(db, 'groups');
        const groupsSnap = await getDocs(groupsRef);
        if (!groupsSnap.empty) {
          for (const gDoc of groupsSnap.docs) {
            const gData = gDoc.data() as Group;
            if (gData.members && Array.isArray(gData.members)) {
              let hasChange = false;
              const updatedMembers = gData.members.map((m) => {
                const isMatch =
                  (profile.email && m.email && m.email.toLowerCase() === profile.email.toLowerCase()) ||
                  (profile.mobileNumber && (isPhoneMatch(m.mobileNumber, profile.mobileNumber) || isPhoneMatch(m.phone, profile.mobileNumber))) ||
                  (profile.name && m.name && m.name.toLowerCase().trim() === profile.name.toLowerCase().trim());

                if (isMatch) {
                  hasChange = true;
                  return {
                    ...m,
                    name: profile.name || m.name,
                    avatar: profile.avatar !== undefined ? profile.avatar : m.avatar,
                  };
                }
                return m;
              });

              if (hasChange) {
                await setDoc(doc(db, 'groups', gDoc.id), removeUndefinedFields({ ...gData, members: updatedMembers }), { merge: true });
              }
            }
          }
        }
      } catch (grpSyncErr) {
        // Non-blocking background sync
      }
    }
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning saving user profile to Firestore:', err);
    }
  }
}

export async function deleteUserProfileFromFirestore(identifier: string) {
  if (!identifier || !identifier.trim() || isQuotaExceeded) return;
  try {
    const trimmed = identifier.trim();
    const cleanInputDigits = cleanPhoneDigits(trimmed);
    const possibleDocIds = new Set<string>();
    possibleDocIds.add(trimmed.replace(/[^a-zA-Z0-9_\-]/g, '_'));
    if (cleanInputDigits) {
      possibleDocIds.add(cleanInputDigits);
      if (cleanInputDigits.startsWith('9715') && cleanInputDigits.length >= 12) {
        possibleDocIds.add('0' + cleanInputDigits.slice(3));
      } else if (cleanInputDigits.startsWith('05') && cleanInputDigits.length >= 10) {
        possibleDocIds.add('971' + cleanInputDigits.slice(1));
      } else if (cleanInputDigits.startsWith('5') && cleanInputDigits.length === 9) {
        possibleDocIds.add('0' + cleanInputDigits);
        possibleDocIds.add('971' + cleanInputDigits);
      }
    }

    for (const docId of possibleDocIds) {
      try {
        const userRef = doc(db, 'users', docId);
        await deleteDoc(userRef);
      } catch (e) {
        // Ignore single doc delete errors
      }
    }
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning deleting user profile from Firestore:', err);
    }
  }
}

export async function getUserProfileFromFirestore(identifier: string): Promise<UserAuthProfile | null> {
  if (!identifier || !identifier.trim()) return null;
  const trimmed = identifier.trim();
  const cleanInputDigits = cleanPhoneDigits(trimmed);

  try {
    // 1. Direct doc lookups by various clean IDs
    const possibleDocIds = new Set<string>();
    possibleDocIds.add(trimmed.replace(/[^a-zA-Z0-9_\-]/g, '_'));
    if (cleanInputDigits) {
      possibleDocIds.add(cleanInputDigits);
      if (cleanInputDigits.startsWith('9715') && cleanInputDigits.length >= 12) {
        possibleDocIds.add('0' + cleanInputDigits.slice(3));
      } else if (cleanInputDigits.startsWith('05') && cleanInputDigits.length >= 10) {
        possibleDocIds.add('971' + cleanInputDigits.slice(1));
      } else if (cleanInputDigits.startsWith('5') && cleanInputDigits.length === 9) {
        possibleDocIds.add('0' + cleanInputDigits);
        possibleDocIds.add('971' + cleanInputDigits);
      }
    }

    for (const docId of possibleDocIds) {
      const userRef = doc(db, 'users', docId);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        return snap.data() as UserAuthProfile;
      }
    }

    // 2. Query users collection by fields
    const usersRef = collection(db, 'users');

    if (cleanInputDigits) {
      const qClean = query(usersRef, where('cleanMobile', '==', cleanInputDigits));
      const snapClean = await getDocs(qClean);
      if (!snapClean.empty) {
        return snapClean.docs[0].data() as UserAuthProfile;
      }

      const qLocal = query(usersRef, where('localMobile', '==', cleanInputDigits));
      const snapLocal = await getDocs(qLocal);
      if (!snapLocal.empty) {
        return snapLocal.docs[0].data() as UserAuthProfile;
      }
    }

    const qMobile = query(usersRef, where('mobileNumber', '==', trimmed));
    const snapMobile = await getDocs(qMobile);
    if (!snapMobile.empty) {
      return snapMobile.docs[0].data() as UserAuthProfile;
    }

    const qEmail = query(usersRef, where('email', '==', trimmed));
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) {
      return snapEmail.docs[0].data() as UserAuthProfile;
    }

    // 3. Scan all docs in 'users' collection with phone match
    const allUsersSnap = await getDocs(usersRef);
    if (!allUsersSnap.empty) {
      for (const userDoc of allUsersSnap.docs) {
        const uData = userDoc.data() as UserAuthProfile;
        if (
          isPhoneMatch(uData.mobileNumber, trimmed) ||
          isPhoneMatch(uData.cleanMobile, trimmed) ||
          isPhoneMatch(uData.localMobile, trimmed) ||
          (uData.email && uData.email.toLowerCase() === trimmed.toLowerCase())
        ) {
          return uData;
        }
      }
    }

    // 4. CRITICAL FALLBACK: Scan all 'groups' in Firestore directly!
    // If Admin created a new group and added members, scan groups to ensure new members can ALWAYS log in!
    const groupsRef = collection(db, 'groups');
    const groupsSnap = await getDocs(groupsRef);
    if (!groupsSnap.empty) {
      for (const gDoc of groupsSnap.docs) {
        const gData = gDoc.data() as Group;
        if (gData.members && Array.isArray(gData.members)) {
          const matchedMember = gData.members.find(
            (m) =>
              isPhoneMatch(m.mobileNumber, trimmed) ||
              isPhoneMatch(m.phone, trimmed) ||
              isPhoneMatch(m.email, trimmed)
          );
          if (matchedMember) {
            const memberPhone = matchedMember.mobileNumber || matchedMember.phone || trimmed;
            const profile: UserAuthProfile = {
              name: matchedMember.name || 'Mess Member',
              email: matchedMember.email || `${cleanInputDigits || 'user'}@mess.com`,
              mobileNumber: memberPhone,
              password: matchedMember.password || '',
              idNumber: '',
              identity: null,
              isLoggedIn: true,
              role: 'user',
              linkedGroupId: gData.id,
            };

            // Auto-cache profile in 'users' collection for future instant logins
            saveUserProfileToFirestore(profile);
            return profile;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Firestore fetch user profile warning:', err);
  }
  return null;
}

export async function loginWithGoogleAuth(): Promise<{ email: string; displayName?: string; photoURL?: string } | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      return {
        email: result.user.email || '',
        displayName: result.user.displayName || undefined,
        photoURL: result.user.photoURL || undefined,
      };
    }
  } catch (err) {
    console.error('Google Sign-In Error:', err);
    throw err;
  }
  return null;
}

// 1. Sync Group Data
export function subscribeToGroup(
  groupId: string,
  onUpdate: (group: Group | null) => void,
  onError?: (err: any) => void
) {
  if (!groupId || isQuotaExceeded) return () => {};
  try {
    const groupRef = doc(db, 'groups', groupId);
    return onSnapshot(
      groupRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as Group);
        } else {
          onUpdate(null);
        }
      },
      (err) => {
        if (!isQuotaError(err)) {
          console.warn('Firestore group subscription warning:', err);
        }
        if (onError) onError(err);
      }
    );
  } catch (e) {
    isQuotaError(e);
    return () => {};
  }
}

export async function saveGroupToFirestore(group: Group) {
  if (!group || !group.id || isQuotaExceeded) return;
  try {
    const groupRef = doc(db, 'groups', group.id);
    const payload = removeUndefinedFields(group);
    await setDoc(groupRef, payload, { merge: true });
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning saving group to Firestore:', err);
    }
  }
}

export async function deleteGroupFromFirestore(groupId: string) {
  if (isQuotaExceeded) return;
  try {
    const groupRef = doc(db, 'groups', groupId);
    await deleteDoc(groupRef);
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning deleting group from Firestore:', err);
    }
  }
}

// 1.1 Update Member Password Across Firestore Groups & Users
export async function updateMemberPasswordAcrossFirestore(
  mobileOrPhone: string,
  newPassword: string
): Promise<{
  success: boolean;
  memberName?: string;
  groupName?: string;
  groupId?: string;
  error?: string;
}> {
  if (!mobileOrPhone || !mobileOrPhone.trim()) {
    return { success: false, error: 'Please provide a valid mobile number.' };
  }
  if (!newPassword || !newPassword.trim()) {
    return { success: false, error: 'Please enter a valid new password.' };
  }

  const trimmedMobile = mobileOrPhone.trim();
  const trimmedPass = newPassword.trim();
  let foundMemberName = '';
  let foundGroupName = '';
  let foundGroupId = '';

  try {
    // 1. Update in Firestore 'groups' collection
    const groupsRef = collection(db, 'groups');
    const groupsSnap = await getDocs(groupsRef);

    if (!groupsSnap.empty) {
      for (const gDoc of groupsSnap.docs) {
        const gData = gDoc.data() as Group;
        if (gData.members && Array.isArray(gData.members)) {
          let groupModified = false;
          const updatedMembers = gData.members.map((m) => {
            if (
              isPhoneMatch(m.mobileNumber, trimmedMobile) ||
              isPhoneMatch(m.phone, trimmedMobile) ||
              isPhoneMatch(m.email, trimmedMobile)
            ) {
              groupModified = true;
              foundMemberName = m.name;
              foundGroupName = gData.name;
              foundGroupId = gData.id;
              return { ...m, password: trimmedPass };
            }
            return m;
          });

          if (groupModified) {
            const updatedGroup: Group = {
              ...gData,
              members: updatedMembers,
            };
            await setDoc(doc(db, 'groups', gDoc.id), removeUndefinedFields(updatedGroup), { merge: true });
          }
        }
      }
    }

    // 2. Update / Save in Firestore 'users' collection
    const cleanDigits = cleanPhoneDigits(trimmedMobile);
    const cleanDocId = trimmedMobile.replace(/[^a-zA-Z0-9_\-]/g, '_');

    const existingProfile = await getUserProfileFromFirestore(trimmedMobile);
    const updatedProfile: UserAuthProfile = {
      name: foundMemberName || existingProfile?.name || 'Mess Member',
      email: existingProfile?.email || `${cleanDigits || 'user'}@mess.com`,
      mobileNumber: trimmedMobile,
      password: trimmedPass,
      idNumber: existingProfile?.idNumber || '',
      identity: null,
      isLoggedIn: true,
      role: existingProfile?.role || 'user',
      linkedGroupId: foundGroupId || existingProfile?.linkedGroupId,
    };

    await saveUserProfileToFirestore(updatedProfile);

    // Also update any other possible doc ID variations
    if (cleanDigits && cleanDigits !== cleanDocId) {
      try {
        const altRef = doc(db, 'users', cleanDigits);
        await setDoc(altRef, removeUndefinedFields(updatedProfile), { merge: true });
      } catch (e) {}
    }

    return {
      success: true,
      memberName: foundMemberName || existingProfile?.name || 'Member',
      groupName: foundGroupName,
      groupId: foundGroupId,
    };
  } catch (err: any) {
    console.error('Error updating member password in Firestore:', err);
    return {
      success: false,
      error: err.message || 'Failed to update password in cloud database.',
    };
  }
}

// 2. Sync Expenses
export function subscribeToExpenses(
  groupId: string,
  onUpdate: (expenses: Expense[]) => void
) {
  if (!groupId || isQuotaExceeded) return () => {};
  try {
    const expensesRef = collection(db, 'expenses');
    const q = query(expensesRef, where('groupId', '==', groupId));
    
    return onSnapshot(
      q,
      (snapshot) => {
        const items: Expense[] = [];
        snapshot.forEach((doc) => {
          items.push({ ...doc.data(), id: doc.id } as Expense);
        });
        onUpdate(items);
      },
      (err) => {
        if (!isQuotaError(err)) {
          console.warn('Firestore expenses listener warning:', err);
        }
      }
    );
  } catch (e) {
    isQuotaError(e);
    return () => {};
  }
}

export async function saveExpenseToFirestore(expense: Expense, activeGroupId?: string) {
  if (isQuotaExceeded) return;
  try {
    const targetGroupId = expense.groupId || activeGroupId;
    if (!targetGroupId) return;
    const expenseRef = doc(db, 'expenses', expense.id);
    const payload = removeUndefinedFields({ ...expense, groupId: targetGroupId });
    await setDoc(expenseRef, payload, { merge: true });
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning saving expense to Firestore:', err);
    }
  }
}

export async function deleteExpenseFromFirestore(expenseId: string) {
  if (isQuotaExceeded) return;
  try {
    const expenseRef = doc(db, 'expenses', expenseId);
    await deleteDoc(expenseRef);
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning deleting expense from Firestore:', err);
    }
  }
}

// 3. Sync Utilities
export function subscribeToUtilities(
  groupId: string,
  onUpdate: (utilities: UtilityBill[]) => void
) {
  if (!groupId || isQuotaExceeded) return () => {};
  try {
    const utilsRef = collection(db, 'utilities');
    const q = query(utilsRef, where('groupId', '==', groupId));

    return onSnapshot(
      q,
      (snapshot) => {
        const items: UtilityBill[] = [];
        snapshot.forEach((doc) => {
          items.push({ ...doc.data(), id: doc.id } as UtilityBill);
        });
        onUpdate(items);
      },
      (err) => {
        if (!isQuotaError(err)) {
          console.warn('Firestore utilities listener warning:', err);
        }
      }
    );
  } catch (e) {
    isQuotaError(e);
    return () => {};
  }
}

export async function saveUtilityToFirestore(utility: UtilityBill, activeGroupId?: string) {
  if (isQuotaExceeded) return;
  try {
    const targetGroupId = utility.groupId || activeGroupId;
    if (!targetGroupId) return;
    const utilRef = doc(db, 'utilities', utility.id);
    const payload = removeUndefinedFields({ ...utility, groupId: targetGroupId });
    await setDoc(utilRef, payload, { merge: true });
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning saving utility to Firestore:', err);
    }
  }
}

export async function deleteUtilityFromFirestore(utilityId: string) {
  if (isQuotaExceeded) return;
  try {
    const utilRef = doc(db, 'utilities', utilityId);
    await deleteDoc(utilRef);
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning deleting utility from Firestore:', err);
    }
  }
}

// 4. Sync Rent Contributions
export function subscribeToRent(
  groupId: string,
  onUpdate: (rent: RentContribution | null) => void
) {
  if (!groupId || isQuotaExceeded) return () => {};
  try {
    const rentRef = doc(db, 'rent', groupId);
    return onSnapshot(
      rentRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as RentContribution);
        } else {
          onUpdate(null);
        }
      },
      (err) => {
        if (!isQuotaError(err)) {
          console.warn('Firestore rent listener warning:', err);
        }
      }
    );
  } catch (e) {
    isQuotaError(e);
    return () => {};
  }
}

export async function saveRentToFirestore(groupId: string, rent: RentContribution) {
  if (isQuotaExceeded) return;
  try {
    const rentRef = doc(db, 'rent', groupId);
    const payload = removeUndefinedFields(rent);
    await setDoc(rentRef, payload, { merge: true });
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning saving rent to Firestore:', err);
    }
  }
}

// Helper to extract timestamp in ms from ChatMessage
export function getMessageTimestampMs(msg: ChatMessage): number {
  if (msg.createdMs && typeof msg.createdMs === 'number' && !isNaN(msg.createdMs)) {
    return msg.createdMs;
  }
  if (msg.createdAt) {
    const parsed = new Date(msg.createdAt).getTime();
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (msg.id) {
    if (msg.id.startsWith('msg-')) {
      const rawNum = parseInt(msg.id.replace('msg-', ''), 10);
      if (!isNaN(rawNum) && rawNum > 1000000000000) return rawNum;
    }
  }
  if (msg.timestamp) {
    const parsed = new Date(msg.timestamp).getTime();
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return Date.now();
}

// Helper to get start timestamp (ms) of the current month (1st day 00:00:00)
export function getStartOfCurrentMonthMs(): number {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0).getTime();
}

// 5. Sync Chat Messages (Auto-clears previous months; starts fresh on the 1st of every month)
export function subscribeToChatMessages(
  groupId: string,
  onUpdate: (messages: ChatMessage[]) => void
) {
  if (!groupId || isQuotaExceeded) return () => {};
  try {
    const chatRef = collection(db, 'chatMessages');
    const q = query(chatRef, where('groupId', '==', groupId));

    return onSnapshot(
      q,
      (snapshot) => {
        const items: ChatMessage[] = [];
        const startOfMonthMs = getStartOfCurrentMonthMs();
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const msg = { ...data, id: docSnap.id } as ChatMessage;
          const msgTime = getMessageTimestampMs(msg);

          // Keep only messages created in the current month (1st of the month onwards)
          if (msgTime >= startOfMonthMs) {
            items.push(msg);
          }
        });
        // sort by timestamp ascending
        items.sort((a, b) => getMessageTimestampMs(a) - getMessageTimestampMs(b));
        onUpdate(items);
      },
      (err) => {
        if (!isQuotaError(err)) {
          console.warn('Firestore chat listener warning:', err);
        }
      }
    );
  } catch (e) {
    isQuotaError(e);
    return () => {};
  }
}

export async function saveChatMessageToFirestore(groupId: string, message: ChatMessage) {
  if (isQuotaExceeded) return;
  try {
    const msgRef = doc(db, 'chatMessages', message.id);
    const createdMs = message.createdMs || getMessageTimestampMs(message);
    const createdAt = message.createdAt || new Date(createdMs).toISOString();
    const payload = removeUndefinedFields({
      ...message,
      groupId,
      createdMs,
      createdAt,
    });
    await setDoc(msgRef, payload, { merge: true });
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning saving chat message to Firestore:', err);
    }
  }
}

export async function updateChatMessageReactionInFirestore(
  groupId: string,
  messageId: string,
  reactions: Record<string, string[]>
) {
  if (isQuotaExceeded || !messageId) return;
  try {
    const msgRef = doc(db, 'chatMessages', messageId);
    await setDoc(msgRef, { reactions, groupId }, { merge: true });
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning updating message reactions in Firestore:', err);
    }
  }
}

// 6. PayTo Personal Ledger Firestore Cloud Sync
export async function savePayToTransactionToFirestore(groupId: string, tx: PayToTransaction) {
  if (isQuotaExceeded) return;
  try {
    const docRef = doc(db, `payto_${groupId}`, tx.id);
    const payload = removeUndefinedFields({ ...tx, updatedAtMs: Date.now() });
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning saving payto transaction to Firestore:', err);
    }
  }
}

export async function deletePayToTransactionFromFirestore(groupId: string, txId: string) {
  if (isQuotaExceeded) return;
  try {
    const docRef = doc(db, `payto_${groupId}`, txId);
    await deleteDoc(docRef);
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning deleting payto transaction from Firestore:', err);
    }
  }
}

export function subscribeToPayToTransactions(groupId: string, onUpdate: (txs: PayToTransaction[]) => void) {
  if (!groupId || isQuotaExceeded) return () => {};
  try {
    const colRef = collection(db, `payto_${groupId}`);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: PayToTransaction[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...docSnap.data(), id: docSnap.id } as PayToTransaction);
        });
        onUpdate(items);
      },
      (err) => {
        if (!isQuotaError(err)) {
          console.warn('Firestore payto listener warning:', err);
        }
      }
    );
  } catch (e) {
    isQuotaError(e);
    return () => {};
  }
}

// 7. Real-Time Online Presence Tracking
export interface UserPresence {
  groupId: string;
  memberId: string;
  memberName: string;
  lastActiveMs: number;
}

export async function updateUserPresenceInFirestore(groupId: string, memberId: string, memberName: string) {
  if (!groupId || !memberId || isQuotaExceeded) return;
  try {
    const docId = `${groupId}_${memberId.replace(/[^a-zA-Z0-9_\-]/g, '_')}`;
    const docRef = doc(db, 'room_presence', docId);
    await setDoc(
      docRef,
      {
        groupId,
        memberId,
        memberName,
        lastActiveMs: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Error updating presence in Firestore:', err);
    }
  }
}

export function subscribeToUserPresences(groupId: string, onUpdate: (activeMemberIds: string[]) => void) {
  if (!groupId || isQuotaExceeded) return () => {};
  try {
    const colRef = collection(db, 'room_presence');
    const q = query(colRef, where('groupId', '==', groupId));
    return onSnapshot(
      q,
      (snapshot) => {
        const now = Date.now();
        const activeIds: string[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as UserPresence;
          // Active if pinged in last 2 minutes (same time presence)
          if (data.lastActiveMs && now - data.lastActiveMs < 120000) {
            activeIds.push(data.memberId);
          }
        });
        onUpdate(activeIds);
      },
      (err) => {
        if (!isQuotaError(err)) {
          console.warn('Presence listener warning:', err);
        }
      }
    );
  } catch (e) {
    isQuotaError(e);
    return () => {};
  }
}

// 8. Personal Laundry Ledger Firestore Cloud Sync (Strictly private per user)
export async function saveLaundryBillToFirestore(userId: string, bill: LaundryBill) {
  if (isQuotaExceeded || !userId) return;
  try {
    const sanitizedUser = userId.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const docRef = doc(db, `laundry_${sanitizedUser}`, bill.id);
    const payload = removeUndefinedFields({ ...bill, updatedAtMs: Date.now() });
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning saving laundry bill to Firestore:', err);
    }
  }
}

export async function deleteLaundryBillFromFirestore(userId: string, billId: string) {
  if (isQuotaExceeded || !userId || !billId) return;
  try {
    const sanitizedUser = userId.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const docRef = doc(db, `laundry_${sanitizedUser}`, billId);
    await deleteDoc(docRef);
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning deleting laundry bill from Firestore:', err);
    }
  }
}

export function subscribeToLaundryBills(userId: string, onUpdate: (bills: LaundryBill[]) => void) {
  if (!userId || isQuotaExceeded) return () => {};
  try {
    const sanitizedUser = userId.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const colRef = collection(db, `laundry_${sanitizedUser}`);
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: LaundryBill[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ ...docSnap.data(), id: docSnap.id } as LaundryBill);
        });
        // Sort newest first
        items.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        onUpdate(items);
      },
      (err) => {
        if (!isQuotaError(err)) {
          console.warn('Firestore laundry listener warning:', err);
        }
      }
    );
  } catch (e) {
    isQuotaError(e);
    return () => {};
  }
}

// 9. Multi-Device Push Notification Token & Subscription Cloud Sync
export async function savePushSubscriptionToFirestore(
  groupId: string,
  userId: string,
  userName: string,
  subscription: any
) {
  if (isQuotaExceeded || !groupId || !subscription || !subscription.endpoint) return;
  try {
    const endpointHash = btoa(subscription.endpoint).replace(/[^a-zA-Z0-9]/g, '_').slice(-80);
    const docRef = doc(db, 'push_subscriptions', `sub_${endpointHash}`);
    await setDoc(
      docRef,
      {
        endpoint: subscription.endpoint,
        subscription,
        groupId,
        userId,
        userName,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning saving push subscription to Firestore:', err);
    }
  }
}

export async function fetchGroupPushSubscriptionsFromFirestore(groupId: string): Promise<any[]> {
  if (isQuotaExceeded || !groupId) return [];
  try {
    const colRef = collection(db, 'push_subscriptions');
    const q = query(colRef, where('groupId', '==', groupId));
    const snapshot = await getDocs(q);
    const results: any[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      if (data && data.endpoint && data.subscription) {
        results.push(data);
      }
    });
    return results;
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning fetching push subscriptions from Firestore:', err);
    }
    return [];
  }
}

export async function deletePushSubscriptionFromFirestore(endpoint: string) {
  if (isQuotaExceeded || !endpoint) return;
  try {
    const endpointHash = btoa(endpoint).replace(/[^a-zA-Z0-9]/g, '_').slice(-80);
    const docRef = doc(db, 'push_subscriptions', `sub_${endpointHash}`);
    await deleteDoc(docRef);
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn('Warning deleting push subscription from Firestore:', err);
    }
  }
}



