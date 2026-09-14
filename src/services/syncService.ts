import { collection, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../db';
import { getFirestoreInstance, initializeFirebase } from './firebase';
import { Engine, Customer, Supplier, SalesInvoice, Transaction, ClearanceDoc } from '../types';

export interface SyncStatus {
  state: 'offline' | 'idle' | 'syncing' | 'synced' | 'error';
  message: string;
  lastSyncedAt?: string;
  pendingCount?: number;
}

export class CloudSyncService {
  private static instance: CloudSyncService;
  private listeners: ((status: SyncStatus) => void)[] = [];
  private currentStatus: SyncStatus = {
    state: 'offline',
    message: 'النظام يعمل محلياً بالكامل (Offline-First)',
  };

  private constructor() {
    this.checkConfigAndInit();
  }

  static getInstance(): CloudSyncService {
    if (!CloudSyncService.instance) {
      CloudSyncService.instance = new CloudSyncService();
    }
    return CloudSyncService.instance;
  }

  subscribe(listener: (status: SyncStatus) => void) {
    this.listeners.push(listener);
    listener(this.currentStatus);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private updateStatus(status: Partial<SyncStatus>) {
    this.currentStatus = { ...this.currentStatus, ...status };
    this.listeners.forEach((l) => l(this.currentStatus));
  }

  async checkConfigAndInit() {
    try {
      // 1. Check if server-side Firebase bridge is available
      try {
        const res = await fetch('/api/firebase/status');
        if (res.ok) {
          const data = await res.json();
          if (data.available) {
            this.updateStatus({
              state: 'idle',
              message: `جاهز للمزامنة مع مشروع (${data.projectId}) عبر مفتاح الإدارة`,
            });
            return true;
          }
        }
      } catch {
        // server endpoint not active
      }

      // 2. Check IndexedDB settings for client Firebase config
      const appSettings = await db.appSettings.get('main_settings');
      if (appSettings?.firebaseConfig && appSettings.cloudSyncEnabled) {
        const initialized = initializeFirebase(appSettings.firebaseConfig);
        if (initialized) {
          this.updateStatus({
            state: 'idle',
            message: 'الربط السحابي جاهز (متصل بـ Firebase)',
            lastSyncedAt: appSettings.lastSyncedAt,
          });
          return true;
        }
      }

      this.updateStatus({
        state: 'offline',
        message: 'النظام يعمل محلياً بالكامل (IndexedDB)',
      });
      return false;
    } catch {
      this.updateStatus({ state: 'error', message: 'خطأ في قراءة إعدادات المزامنة' });
      return false;
    }
  }

  // Two-way synchronization
  async syncNow(): Promise<{ success: boolean; message: string }> {
    this.updateStatus({ state: 'syncing', message: 'جارٍ المزامنة السحابية (IndexedDB ⮂ Firestore)...' });

    // 1. Try local server bridge first (uses service account JSON directly)
    try {
      const payload = {
        engines: await db.engines.toArray(),
        customers: await db.customers.toArray(),
        suppliers: await db.suppliers.toArray(),
        salesInvoices: await db.salesInvoices.toArray(),
        transactions: await db.transactions.toArray(),
      };

      const res = await fetch('/api/firebase/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const resData = await res.json();
        if (resData.success) {
          // Merge incoming remote records into local IndexedDB
          if (resData.data.engines?.length > 0) await db.engines.bulkPut(resData.data.engines);
          if (resData.data.customers?.length > 0) await db.customers.bulkPut(resData.data.customers);
          if (resData.data.suppliers?.length > 0) await db.suppliers.bulkPut(resData.data.suppliers);
          if (resData.data.salesInvoices?.length > 0) await db.salesInvoices.bulkPut(resData.data.salesInvoices);
          if (resData.data.transactions?.length > 0) await db.transactions.bulkPut(resData.data.transactions);

          const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          await db.appSettings.update('main_settings', { lastSyncedAt: now });

          this.updateStatus({
            state: 'synced',
            message: `تمت المزامنة بنجاح في ${now}`,
            lastSyncedAt: now,
          });

          return { success: true, message: `تمت المزامنة الثنائية بنجاح مع مشروع alasel-954c7 في تمام ${now}` };
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'فشل الاتصال' }));
        if (errorData.error && errorData.error.includes('Cloud Firestore API has not been used')) {
          const friendly = 'تم التحقق من مفتاح Firebase بنجاح. يرجى تفعيل Cloud Firestore من لوحة تحكم Firebase لمشروع alasel-954c7 (الضغط على Create Database) ثم إعادة المحاولة.';
          this.updateStatus({ state: 'error', message: friendly });
          return { success: false, message: friendly };
        }
      }
    } catch {
      // server bridge failed, proceed to client-side Firestore
    }

    // 2. Client-side Firestore fallback
    const firestore = getFirestoreInstance();
    if (!firestore) {
      const ready = await this.checkConfigAndInit();
      if (!ready || !getFirestoreInstance()) {
        return {
          success: false,
          message: 'يرجى تفعيل Cloud Firestore في مشروع alasel-954c7 لتفعيل المزامنة السحابية الفورية.',
        };
      }
    }

    const fs = getFirestoreInstance()!;

    try {
      // PUSH ENGINES
      const localEngines = await db.engines.toArray();
      const enginesBatch = writeBatch(fs);
      for (const engine of localEngines) {
        const ref = doc(fs, 'alasel_engines', engine.id);
        enginesBatch.set(ref, engine, { merge: true });
      }
      await enginesBatch.commit();

      // PULL ENGINES
      const enginesSnap = await getDocs(collection(fs, 'alasel_engines'));
      const remoteEngines: Engine[] = [];
      enginesSnap.forEach((d) => remoteEngines.push(d.data() as Engine));
      if (remoteEngines.length > 0) await db.engines.bulkPut(remoteEngines);

      // PUSH CUSTOMERS
      const localCustomers = await db.customers.toArray();
      const customersBatch = writeBatch(fs);
      for (const cust of localCustomers) {
        const ref = doc(fs, 'alasel_customers', cust.id);
        customersBatch.set(ref, cust, { merge: true });
      }
      await customersBatch.commit();

      // PULL CUSTOMERS
      const custSnap = await getDocs(collection(fs, 'alasel_customers'));
      const remoteCust: Customer[] = [];
      custSnap.forEach((d) => remoteCust.push(d.data() as Customer));
      if (remoteCust.length > 0) await db.customers.bulkPut(remoteCust);

      // PUSH SUPPLIERS
      const localSuppliers = await db.suppliers.toArray();
      const suppBatch = writeBatch(fs);
      for (const sup of localSuppliers) {
        const ref = doc(fs, 'alasel_suppliers', sup.id);
        suppBatch.set(ref, sup, { merge: true });
      }
      await suppBatch.commit();

      // PULL SUPPLIERS
      const suppSnap = await getDocs(collection(fs, 'alasel_suppliers'));
      const remoteSupp: Supplier[] = [];
      suppSnap.forEach((d) => remoteSupp.push(d.data() as Supplier));
      if (remoteSupp.length > 0) await db.suppliers.bulkPut(remoteSupp);

      // PUSH SALES INVOICES
      const localSales = await db.salesInvoices.toArray();
      const salesBatch = writeBatch(fs);
      for (const inv of localSales) {
        const ref = doc(fs, 'alasel_sales_invoices', inv.id);
        salesBatch.set(ref, inv, { merge: true });
      }
      await salesBatch.commit();

      // PULL SALES INVOICES
      const salesSnap = await getDocs(collection(fs, 'alasel_sales_invoices'));
      const remoteSales: SalesInvoice[] = [];
      salesSnap.forEach((d) => remoteSales.push(d.data() as SalesInvoice));
      if (remoteSales.length > 0) await db.salesInvoices.bulkPut(remoteSales);

      // PUSH TRANSACTIONS
      const localTx = await db.transactions.toArray();
      const txBatch = writeBatch(fs);
      for (const tx of localTx) {
        const ref = doc(fs, 'alasel_transactions', tx.id);
        txBatch.set(ref, tx, { merge: true });
      }
      await txBatch.commit();

      // PULL TRANSACTIONS
      const txSnap = await getDocs(collection(fs, 'alasel_transactions'));
      const remoteTx: Transaction[] = [];
      txSnap.forEach((d) => remoteTx.push(d.data() as Transaction));
      if (remoteTx.length > 0) await db.transactions.bulkPut(remoteTx);

      const now = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      await db.appSettings.update('main_settings', { lastSyncedAt: now });

      this.updateStatus({
        state: 'synced',
        message: `تمت المزامنة بنجاح في ${now}`,
        lastSyncedAt: now,
      });

      return { success: true, message: `تمت المزامنة بنجاح في تمام ${now}` };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'خطأ في المزامنة';
      this.updateStatus({ state: 'error', message: errorMsg });
      return { success: false, message: errorMsg };
    }
  }

  // Export full backup as JSON
  async exportFullBackupJson(): Promise<string> {
    const data = {
      engines: await db.engines.toArray(),
      clearanceDocs: await db.clearanceDocs.toArray(),
      customers: await db.customers.toArray(),
      suppliers: await db.suppliers.toArray(),
      salesInvoices: await db.salesInvoices.toArray(),
      transactions: await db.transactions.toArray(),
      accounts: await db.accounts.toArray(),
      exportedAt: new Date().toISOString(),
      shopName: 'الأصيل موتورز',
    };
    return JSON.stringify(data, null, 2);
  }

  // Import backup JSON
  async importBackupJson(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      if (data.engines) await db.engines.bulkPut(data.engines);
      if (data.clearanceDocs) await db.clearanceDocs.bulkPut(data.clearanceDocs);
      if (data.customers) await db.customers.bulkPut(data.customers);
      if (data.suppliers) await db.suppliers.bulkPut(data.suppliers);
      if (data.salesInvoices) await db.salesInvoices.bulkPut(data.salesInvoices);
      if (data.transactions) await db.transactions.bulkPut(data.transactions);
      return true;
    } catch (err) {
      console.error('Import backup failed:', err);
      return false;
    }
  }
}

export const syncService = CloudSyncService.getInstance();
