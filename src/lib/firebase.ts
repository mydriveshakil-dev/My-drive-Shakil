import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  onSnapshot,
  query,
  where,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Group, Expense, UtilityBill, RentContribution, ChatMessage } from '../types';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with specific databaseId if provided
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Firestore Realtime listeners and persistence helpers

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

export async function saveExpenseToFirestore(expense: Expense) {
  try {
    const expenseRef = doc(db, 'expenses', expense.id);
    await setDoc(expenseRef, expense, { merge: true });
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

export async function saveUtilityToFirestore(utility: UtilityBill) {
  try {
    const utilRef = doc(db, 'utilities', utility.id);
    await setDoc(utilRef, utility, { merge: true });
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
