import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  type Firestore,
} from 'firebase/firestore';
import {
  Engine,
  Customer,
  Supplier,
  SupplierLedgerEntry,
  SalesInvoice,
  Transaction,
  ClearanceDoc,
} from '../types';

export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyBGW3IJUU2WPjU5XlOcYX-WoBlNWecorlQ',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'alasel-954c7.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'alasel-954c7',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'alasel-954c7.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '932643000647',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:932643000647:web:6c3ff934e7d8e94740bc62',
};

export const COLLECTION_PREFIX = import.meta.env.VITE_FIREBASE_COLLECTION_PREFIX || 'el_wikalla_';

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

export function getFirebaseDb(): Firestore {
  if (!db) {
    if (getApps().length === 0) {
      app = initializeApp(FIREBASE_CONFIG);
    } else {
      app = getApps()[0];
    }
    db = getFirestore(app);
  }
  return db;
}

// ─── Fetch Methods with offline-tolerant cached fallbacks ────────────────────

export async function fetchEngines(): Promise<Engine[]> {
  try {
    const firestore = getFirebaseDb();
    const snap = await getDocs(collection(firestore, `${COLLECTION_PREFIX}engines`));
    const items: Engine[] = [];
    snap.forEach((d) => items.push(d.data() as Engine));
    localStorage.setItem('cached_engines', JSON.stringify(items));
    return items;
  } catch (err) {
    console.warn('Fallback to cached engines:', err);
    const cached = localStorage.getItem('cached_engines');
    return cached ? JSON.parse(cached) : [];
  }
}

export async function fetchInvoices(): Promise<SalesInvoice[]> {
  try {
    const firestore = getFirebaseDb();
    const snap = await getDocs(collection(firestore, `${COLLECTION_PREFIX}salesInvoices`));
    const items: SalesInvoice[] = [];
    snap.forEach((d) => items.push(d.data() as SalesInvoice));
    localStorage.setItem('cached_invoices', JSON.stringify(items));
    return items;
  } catch (err) {
    console.warn('Fallback to cached invoices:', err);
    const cached = localStorage.getItem('cached_invoices');
    return cached ? JSON.parse(cached) : [];
  }
}

export async function fetchCustomers(): Promise<Customer[]> {
  try {
    const firestore = getFirebaseDb();
    const snap = await getDocs(collection(firestore, `${COLLECTION_PREFIX}customers`));
    const items: Customer[] = [];
    snap.forEach((d) => items.push(d.data() as Customer));
    localStorage.setItem('cached_customers', JSON.stringify(items));
    return items;
  } catch (err) {
    console.warn('Fallback to cached customers:', err);
    const cached = localStorage.getItem('cached_customers');
    return cached ? JSON.parse(cached) : [];
  }
}

export async function fetchSuppliers(): Promise<Supplier[]> {
  try {
    const firestore = getFirebaseDb();
    const snap = await getDocs(collection(firestore, `${COLLECTION_PREFIX}suppliers`));
    const items: Supplier[] = [];
    snap.forEach((d) => items.push(d.data() as Supplier));
    localStorage.setItem('cached_suppliers', JSON.stringify(items));
    return items;
  } catch (err) {
    console.warn('Fallback to cached suppliers:', err);
    const cached = localStorage.getItem('cached_suppliers');
    return cached ? JSON.parse(cached) : [];
  }
}

export async function fetchSupplierLedger(): Promise<SupplierLedgerEntry[]> {
  try {
    const firestore = getFirebaseDb();
    const snap = await getDocs(collection(firestore, `${COLLECTION_PREFIX}supplierLedger`));
    const items: SupplierLedgerEntry[] = [];
    snap.forEach((d) => items.push(d.data() as SupplierLedgerEntry));
    localStorage.setItem('cached_supplier_ledger', JSON.stringify(items));
    return items;
  } catch (err) {
    console.warn('Fallback to cached supplier ledger:', err);
    const cached = localStorage.getItem('cached_supplier_ledger');
    return cached ? JSON.parse(cached) : [];
  }
}

export async function fetchTransactions(): Promise<Transaction[]> {
  try {
    const firestore = getFirebaseDb();
    const snap = await getDocs(collection(firestore, `${COLLECTION_PREFIX}transactions`));
    const items: Transaction[] = [];
    snap.forEach((d) => items.push(d.data() as Transaction));
    localStorage.setItem('cached_transactions', JSON.stringify(items));
    return items;
  } catch (err) {
    console.warn('Fallback to cached transactions:', err);
    const cached = localStorage.getItem('cached_transactions');
    return cached ? JSON.parse(cached) : [];
  }
}

export async function fetchClearanceDocs(): Promise<ClearanceDoc[]> {
  try {
    const firestore = getFirebaseDb();
    const snap = await getDocs(collection(firestore, `${COLLECTION_PREFIX}clearanceDocs`));
    const items: ClearanceDoc[] = [];
    snap.forEach((d) => items.push(d.data() as ClearanceDoc));
    localStorage.setItem('cached_clearance_docs', JSON.stringify(items));
    return items;
  } catch (err) {
    console.warn('Fallback to cached clearance docs:', err);
    const cached = localStorage.getItem('cached_clearance_docs');
    return cached ? JSON.parse(cached) : [];
  }
}

// ─── Mutation Methods (Direct Real-time Sync to Firestore) ────────────────────

export async function saveEngineRemote(engine: Engine): Promise<void> {
  const firestore = getFirebaseDb();
  await setDoc(doc(firestore, `${COLLECTION_PREFIX}engines`, engine.id), {
    ...engine,
    _syncedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function saveInvoiceRemote(invoice: SalesInvoice): Promise<void> {
  const firestore = getFirebaseDb();
  await setDoc(doc(firestore, `${COLLECTION_PREFIX}salesInvoices`, invoice.id), {
    ...invoice,
    _syncedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function saveSupplierLedgerEntryRemote(entry: SupplierLedgerEntry): Promise<void> {
  const firestore = getFirebaseDb();
  await setDoc(doc(firestore, `${COLLECTION_PREFIX}supplierLedger`, entry.id), {
    ...entry,
    _syncedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function saveCustomerRemote(customer: Customer): Promise<void> {
  const firestore = getFirebaseDb();
  await setDoc(doc(firestore, `${COLLECTION_PREFIX}customers`, customer.id), {
    ...customer,
    _syncedAt: new Date().toISOString(),
  }, { merge: true });
}

export async function saveSupplierRemote(supplier: Supplier): Promise<void> {
  const firestore = getFirebaseDb();
  await setDoc(doc(firestore, `${COLLECTION_PREFIX}suppliers`, supplier.id), {
    ...supplier,
    _syncedAt: new Date().toISOString(),
  }, { merge: true });
}
