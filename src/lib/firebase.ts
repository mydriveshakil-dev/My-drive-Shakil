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
  addDoc
} from 'firebase/firestore';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Group, Expense, UtilityBill, RentContribution, ChatMessage, UserAuthProfile } from '../types';

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

// Firestore Realtime listeners and persistence helpers

// 0. Sync All Groups Across Devices
export function subscribeToAllGroups(onUpdate: (groups: Group[]) => void) {
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
      console.warn('Firestore all groups listener warning:', err);
    }
  );
}

// User Profiles Cloud Sync for Multi-Device Login
export async function saveUserProfileToFirestore(profile: UserAuthProfile) {
  try {
    const rawId = profile.mobileNumber || profile.email || 'user';
    const cleanDocId = rawId.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const userRef = doc(db, 'users', cleanDocId);
    await setDoc(userRef, { ...profile, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('Error saving user profile to Firestore:', err);
  }
}

export async function getUserProfileFromFirestore(identifier: string): Promise<UserAuthProfile | null> {
  try {
    const cleanDocId = identifier.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const userRef = doc(db, 'users', cleanDocId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserAuthProfile;
    }

    const usersRef = collection(db, 'users');
    const qEmail = query(usersRef, where('email', '==', identifier));
    const snapEmail = await getDocs(qEmail);
    if (!snapEmail.empty) {
      return snapEmail.docs[0].data() as UserAuthProfile;
    }

    const qMobile = query(usersRef, where('mobileNumber', '==', identifier));
    const snapMobile = await getDocs(qMobile);
    if (!snapMobile.empty) {
      return snapMobile.docs[0].data() as UserAuthProfile;
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
      console.warn('Firestore group subscription warning:', err);
      if (onError) onError(err);
    }
  );
}

export async function saveGroupToFirestore(group: Group) {
  try {
    const groupRef = doc(db, 'groups', group.id);
    await setDoc(groupRef, group, { merge: true });
  } catch (err) {
    console.error('Error saving group to Firestore:', err);
  }
}

export async function deleteGroupFromFirestore(groupId: string) {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await deleteDoc(groupRef);
  } catch (err) {
    console.error('Error deleting group from Firestore:', err);
  }
}

// 2. Sync Expenses
export function subscribeToExpenses(
  groupId: string,
  onUpdate: (expenses: Expense[]) => void
) {
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
      console.warn('Firestore expenses listener warning:', err);
    }
  );
}

export async function saveExpenseToFirestore(expense: Expense, activeGroupId?: string) {
  try {
    const expenseRef = doc(db, 'expenses', expense.id);
    const targetGroupId = expense.groupId || activeGroupId || 'group-room-3';
    await setDoc(expenseRef, { ...expense, groupId: targetGroupId }, { merge: true });
  } catch (err) {
    console.error('Error saving expense to Firestore:', err);
  }
}

export async function deleteExpenseFromFirestore(expenseId: string) {
  try {
    const expenseRef = doc(db, 'expenses', expenseId);
    await deleteDoc(expenseRef);
  } catch (err) {
    console.error('Error deleting expense from Firestore:', err);
  }
}

// 3. Sync Utilities
export function subscribeToUtilities(
  groupId: string,
  onUpdate: (utilities: UtilityBill[]) => void
) {
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
      console.warn('Firestore utilities listener warning:', err);
    }
  );
}

export async function saveUtilityToFirestore(utility: UtilityBill, activeGroupId?: string) {
  try {
    const utilRef = doc(db, 'utilities', utility.id);
    const targetGroupId = utility.groupId || activeGroupId || 'group-room-3';
    await setDoc(utilRef, { ...utility, groupId: targetGroupId }, { merge: true });
  } catch (err) {
    console.error('Error saving utility to Firestore:', err);
  }
}

export async function deleteUtilityFromFirestore(utilityId: string) {
  try {
    const utilRef = doc(db, 'utilities', utilityId);
    await deleteDoc(utilRef);
  } catch (err) {
    console.error('Error deleting utility from Firestore:', err);
  }
}

// 4. Sync Rent Contributions
export function subscribeToRent(
  groupId: string,
  onUpdate: (rent: RentContribution | null) => void
) {
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
      console.warn('Firestore rent listener warning:', err);
    }
  );
}

export async function saveRentToFirestore(groupId: string, rent: RentContribution) {
  try {
    const rentRef = doc(db, 'rent', groupId);
    await setDoc(rentRef, rent, { merge: true });
  } catch (err) {
    console.error('Error saving rent to Firestore:', err);
  }
}

// 5. Sync Chat Messages
export function subscribeToChatMessages(
  groupId: string,
  onUpdate: (messages: ChatMessage[]) => void
) {
  const chatRef = collection(db, 'chatMessages');
  const q = query(chatRef, where('groupId', '==', groupId));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({ ...data, id: doc.id } as ChatMessage);
      });
      // sort by timestamp
      items.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      onUpdate(items);
    },
    (err) => {
      console.warn('Firestore chat listener warning:', err);
    }
  );
}

export async function saveChatMessageToFirestore(groupId: string, message: ChatMessage) {
  try {
    const msgRef = doc(db, 'chatMessages', message.id);
    await setDoc(msgRef, { ...message, groupId }, { merge: true });
  } catch (err) {
    console.error('Error saving chat message to Firestore:', err);
  }
}
