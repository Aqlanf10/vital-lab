import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  CaseMessage,
  CourierOrder,
  DentalCase,
  LabExpense,
  LabSettings,
} from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestoreInstance();
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

import { getFirestore } from 'firebase/firestore';
function getFirestoreInstance() {
  return getFirestore(app, firebaseConfig.firestoreDatabaseId);
}

// Mandatory FirestoreErrorInfo & handleFirestoreError per firebase-integration-rpc
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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on application boot
let connectionChecked = false;
export async function testFirestoreConnection(): Promise<void> {
  if (connectionChecked) return;
  connectionChecked = true;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testFirestoreConnection();

// Defensive truncation & ID sanitization synced with firebase-blueprint.json
function sanitizeId(raw: string): string {
  const cleaned = String(raw || '')
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 120);
  return cleaned || `ID-${Date.now()}`;
}

function clampStr(val: string | undefined, max: number, fallback = ''): string {
  const str = String(val ?? fallback).trim();
  return str.slice(0, max);
}

export async function signInCloudWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signOutCloud(): Promise<void> {
  await signOut(auth);
}

export function observeCloudAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function ensureCloudWorkspace(
  user: User,
  settings: LabSettings
): Promise<void> {
  if (!user.emailVerified) return;
  const path = `workspaces/${user.uid}`;
  const ref = doc(db, 'workspaces', user.uid);
  try {
    const snap = await getDoc(ref);
    const baseFields = {
      labName: clampStr(settings.labName, 120, 'Vital Dental Lab') || 'Vital Dental Lab',
      currency: clampStr(settings.currency, 16, 'ر.س') || 'ر.س',
      secondaryCurrency: clampStr(settings.secondaryCurrency, 16, '$') || '$',
      exchangeRate: Math.max(0, Math.min(1000000, Number(settings.exchangeRate) || 3.75)),
      taxNumber: clampStr(settings.taxNumber, 40),
      address: clampStr(settings.address, 200),
      whatsappPhone: clampStr(settings.whatsappPhone, 30),
      warrantyYears: Math.max(0, Math.min(25, Number(settings.warrantyYears ?? 5))),
    };

    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: user.uid,
        ...baseFields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        ...baseFields,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncCaseToCloud(
  user: User,
  branchId: string,
  dentalCase: DentalCase
): Promise<void> {
  if (!user.emailVerified) return;
  const safeCaseId = sanitizeId(`${branchId}_${dentalCase.id}`);
  const path = `workspaces/${user.uid}/cases/${safeCaseId}`;
  const ref = doc(db, 'workspaces', user.uid, 'cases', safeCaseId);

  const boundedTeeth = (dentalCase.selectedTeeth || [])
    .slice(0, 32)
    .map((n) => Math.round(Number(n)))
    .filter((n) => Number.isFinite(n));

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const createPayload: Record<string, unknown> = {
        ownerId: user.uid,
        branchId: sanitizeId(branchId).slice(0, 64),
        caseCode: sanitizeId(dentalCase.id).slice(0, 64),
        clinicId: clampStr(dentalCase.clinicId, 120, 'عيادة متعاقدة') || 'عيادة متعاقدة',
        patientName: clampStr(dentalCase.patientName, 120, 'مريض') || 'مريض',
        serviceType: clampStr(dentalCase.serviceType, 120, 'زيركون') || 'زيركون',
        units: Math.max(1, Math.min(32, Number(dentalCase.units) || 1)),
        shade: clampStr(dentalCase.shade, 20, 'A1') || 'A1',
        price: Math.max(0, Math.min(10000000, Number(dentalCase.price) || 0)),
        staffId: clampStr(dentalCase.staffId, 64),
        status: dentalCase.status,
        receivedDate: clampStr(dentalCase.receivedDate, 20, '2026-01-01'),
        dueDate: clampStr(dentalCase.dueDate, 20, '2026-01-04'),
        selectedTeeth: boundedTeeth,
        scanFileUrl: clampStr(dentalCase.scanFileUrl, 500),
        notes: clampStr(dentalCase.notes, 1000),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(ref, createPayload);
    } else {
      const existingData = snap.data();
      // Respect terminal state locking ('Delivered') for non-admins
      if (existingData?.status === 'Delivered' && user.email !== 'Aqlanf10@gmail.com') {
        return;
      }
      await updateDoc(ref, {
        clinicId: clampStr(dentalCase.clinicId, 120, 'عيادة متعاقدة') || 'عيادة متعاقدة',
        patientName: clampStr(dentalCase.patientName, 120, 'مريض') || 'مريض',
        serviceType: clampStr(dentalCase.serviceType, 120, 'زيركون') || 'زيركون',
        units: Math.max(1, Math.min(32, Number(dentalCase.units) || 1)),
        shade: clampStr(dentalCase.shade, 20, 'A1') || 'A1',
        price: Math.max(0, Math.min(10000000, Number(dentalCase.price) || 0)),
        staffId: clampStr(dentalCase.staffId, 64),
        status: dentalCase.status,
        dueDate: clampStr(dentalCase.dueDate, 20, '2026-01-04'),
        selectedTeeth: boundedTeeth,
        scanFileUrl: clampStr(dentalCase.scanFileUrl, 500),
        notes: clampStr(dentalCase.notes, 1000),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncCaseMessageToCloud(
  user: User,
  branchId: string,
  caseCode: string,
  message: CaseMessage
): Promise<void> {
  if (!user.emailVerified) return;
  const safeCaseId = sanitizeId(`${branchId}_${caseCode}`).slice(0, 64);
  const safeMsgId = sanitizeId(message.id).slice(0, 64);
  const path = `workspaces/${user.uid}/cases/${safeCaseId}/messages/${safeMsgId}`;
  const ref = doc(db, 'workspaces', user.uid, 'cases', safeCaseId, 'messages', safeMsgId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: user.uid,
        caseId: safeCaseId,
        senderRole: message.senderRole,
        senderName: clampStr(message.senderName, 100, 'مستخدم') || 'مستخدم',
        body: clampStr(message.body, 1000, '-') || '-',
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function syncExpenseToCloud(
  user: User,
  branchId: string,
  expense: LabExpense
): Promise<void> {
  if (!user.emailVerified) return;
  const safeId = sanitizeId(`${branchId}_${expense.id}`);
  const path = `workspaces/${user.uid}/expenses/${safeId}`;
  const ref = doc(db, 'workspaces', user.uid, 'expenses', safeId);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: user.uid,
        branchId: sanitizeId(branchId).slice(0, 64),
        category: expense.category,
        title: clampStr(expense.title, 160, 'مصروف تشغيلي') || 'مصروف تشغيلي',
        supplierName: clampStr(expense.supplierName, 120),
        amount: Math.max(0, Math.min(100000000, Number(expense.amount) || 0)),
        date: clampStr(expense.date, 20, '2026-01-01'),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        category: expense.category,
        title: clampStr(expense.title, 160, 'مصروف تشغيلي') || 'مصروف تشغيلي',
        supplierName: clampStr(expense.supplierName, 120),
        amount: Math.max(0, Math.min(100000000, Number(expense.amount) || 0)),
        date: clampStr(expense.date, 20, '2026-01-01'),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function syncCourierToCloud(
  user: User,
  branchId: string,
  order: CourierOrder
): Promise<void> {
  if (!user.emailVerified) return;
  const safeId = sanitizeId(`${branchId}_${order.id}`);
  const path = `workspaces/${user.uid}/couriers/${safeId}`;
  const ref = doc(db, 'workspaces', user.uid, 'couriers', safeId);
  const safeCaseIds = (order.caseIds || [])
    .slice(0, 20)
    .map((id) => clampStr(id, 64))
    .filter(Boolean);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        ownerId: user.uid,
        branchId: sanitizeId(branchId).slice(0, 64),
        clinicName: clampStr(order.clinicName, 120, 'عيادة') || 'عيادة',
        direction: order.direction,
        status: order.status,
        courierName: clampStr(order.courierName, 100),
        caseIds: safeCaseIds,
        notes: clampStr(order.notes, 500),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingData = snap.data();
      if (existingData?.status === 'delivered' && user.email !== 'Aqlanf10@gmail.com') {
        return;
      }
      await updateDoc(ref, {
        status: order.status,
        courierName: clampStr(order.courierName, 100),
        notes: clampStr(order.notes, 500),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToCloudCases(
  user: User,
  branchId: string,
  onRemoteUpdate: (cloudCases: Partial<DentalCase>[]) => void
): () => void {
  if (!user.emailVerified) return () => {};
  const path = `workspaces/${user.uid}/cases`;
  const q = query(
    collection(db, 'workspaces', user.uid, 'cases'),
    where('ownerId', '==', user.uid),
    where('branchId', '==', sanitizeId(branchId).slice(0, 64))
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: Partial<DentalCase>[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        items.push({
          id: d.caseCode,
          clinicId: d.clinicId,
          patientName: d.patientName,
          serviceType: d.serviceType,
          units: d.units,
          shade: d.shade,
          price: d.price,
          staffId: d.staffId,
          status: d.status,
          receivedDate: d.receivedDate,
          dueDate: d.dueDate,
          selectedTeeth: Array.isArray(d.selectedTeeth) ? d.selectedTeeth : undefined,
          scanFileUrl: d.scanFileUrl || undefined,
          notes: d.notes || undefined,
        });
      });
      onRemoteUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function pushBranchSnapshotToCloud(params: {
  user: User;
  branchId: string;
  labSettings: LabSettings;
  cases: DentalCase[];
  expenses: LabExpense[];
  courierOrders: CourierOrder[];
}): Promise<number> {
  const { user, branchId, labSettings, cases, expenses, courierOrders } = params;
  await ensureCloudWorkspace(user, labSettings);
  let syncedCount = 0;
  for (const c of cases) {
    await syncCaseToCloud(user, branchId, c);
    syncedCount++;
    if (c.messages && c.messages.length > 0) {
      for (const m of c.messages.slice(-10)) {
        await syncCaseMessageToCloud(user, branchId, c.id, m);
      }
    }
  }
  for (const ex of expenses) {
    await syncExpenseToCloud(user, branchId, ex);
    syncedCount++;
  }
  for (const cr of courierOrders) {
    await syncCourierToCloud(user, branchId, cr);
    syncedCount++;
  }
  return syncedCount;
}
