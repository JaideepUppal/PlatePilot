import { firebaseApp } from '../config/firebase';
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  unit?: string;
  expiryDate?: Timestamp | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type CreateInventoryItemInput = {
  name: string;
  quantity: number;
  unit?: string;
  expiryDate?: Date | null;
};

export type UpdateInventoryItemInput = {
  name?: string;
  quantity?: number;
  unit?: string | null;
  expiryDate?: Date | null;
};

const db = getFirestore(firebaseApp);

const inventoryCollection = (uid: string) => {
  return collection(db, 'users', uid, 'inventory');
};

const inventoryDocument = (uid: string, itemId: string) => {
  return doc(db, 'users', uid, 'inventory', itemId);
};

const toDate = (value: unknown): Date | null => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return null;
};

const toTimestamp = (value: unknown): Timestamp | null => {
  if (value instanceof Timestamp) {
    return value;
  }

  return null;
};

export const listInventory = async (uid: string): Promise<InventoryItem[]> => {
  const inventoryQuery = query(inventoryCollection(uid), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(inventoryQuery);

  return snapshot.docs.map((inventoryDoc) => {
    const data = inventoryDoc.data();

    return {
      id: inventoryDoc.id,
      name: typeof data.name === 'string' ? data.name : '',
      quantity: typeof data.quantity === 'number' ? data.quantity : 0,
      unit: typeof data.unit === 'string' ? data.unit : undefined,
      expiryDate: toTimestamp(data.expiryDate),
      createdAt: toDate(data.createdAt),
      updatedAt: toDate(data.updatedAt),
    };
  });
};

export const addInventory = async (uid: string, input: CreateInventoryItemInput): Promise<string> => {
  const trimmedName = input.name.trim();
  const trimmedUnit = input.unit?.trim();
  const validExpiryDate =
    input.expiryDate instanceof Date && !Number.isNaN(input.expiryDate.getTime())
      ? input.expiryDate
      : null;

  const createdDoc = await addDoc(inventoryCollection(uid), {
    name: trimmedName,
    quantity: input.quantity,
    ...(trimmedUnit ? { unit: trimmedUnit } : {}),
    ...(validExpiryDate ? { expiryDate: Timestamp.fromDate(validExpiryDate) } : {}),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return createdDoc.id;
};

export const updateInventory = async (
  uid: string,
  itemId: string,
  input: UpdateInventoryItemInput,
): Promise<void> => {
  const updates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (typeof input.name === 'string') {
    updates.name = input.name.trim();
  }

  if (typeof input.quantity === 'number') {
    updates.quantity = input.quantity;
  }

  if (input.unit !== undefined) {
    const trimmedUnit = input.unit?.trim();
    updates.unit = trimmedUnit || deleteField();
  }

  if (input.expiryDate !== undefined) {
    if (input.expiryDate instanceof Date && !Number.isNaN(input.expiryDate.getTime())) {
      updates.expiryDate = Timestamp.fromDate(input.expiryDate);
    } else {
      updates.expiryDate = deleteField();
    }
  }

  await updateDoc(inventoryDocument(uid, itemId), updates);
};

export const deleteInventory = async (uid: string, itemId: string): Promise<void> => {
  await deleteDoc(inventoryDocument(uid, itemId));
};
